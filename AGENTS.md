# api — agent guide


> 📍 **Starting a session? Read `docs/STATUS.md` first.** It records what is deployed, what is
> next, which agent to use for each task, and the traps discovered along the way.

Read this before touching anything. Then read `docs/` for the task at hand.

## What this is

Express + Mongoose REST API on DigitalOcean, behind PM2. It historically served five products.
**Only `leo` is live.** Everything else is dormant.

| Mount | Status |
|---|---|
| `/api/leo/{users,schools,images,documents}` | ✅ **LIVE** — powers https://www.leo-leo-hessen.com |
| `/api/abluelemon` | 💤 dormant |
| `/api/devPunk` | 💤 dormant |
| `/api/blog` | 💤 already commented out in `src/server/api/index.js` |
| `/api/terapias` | 💤 already commented out |
| `/auth/signin-leo` | ✅ **LIVE** — admin login |
| `/auth/signin` | 💤 dormant (uses the blog user model) |

**Do not delete dormant code.** Comment out the route registrations, keep the files. The owner
wants them retained.

- **Database:** MongoDB Atlas, org `CriX`, project `api_production`, cluster `api`, db `api`.
  Live collections: `leo_schools`, `leo_documents`, `leo_images`, `leo_users`.
  Everything else in that db belongs to the dormant products.
- **Check whether this GitHub repo is public.** The sibling frontend repo is. If this one is too,
  the leaked credentials in `schoolController.js` are urgent — see `docs/SECURITY.md`.

## The one rule that matters: the seasonal calendar

The frontend this API serves has a hard annual rhythm. **Check the date before proposing changes.**

| Window | Status | What is allowed |
|---|---|---|
| **May – September** | 🟢 **OFF-SEASON** | Dependency upgrades, refactors, breaking changes |
| **October – April/May** | 🔴 **FROZEN** | Security hotfixes only |

Registration opens in October, the final is late May. During the frozen window an API outage means
German schools cannot register, and there is currently no staging environment.

Security fixes ship in **any** window — they are the exception, not the rule.

## Stack

| | |
|---|---|
| Runtime | Node ≥18 (local 22), PM2 in production |
| Framework | Express 4.21 |
| DB | Mongoose 7.8 → MongoDB Atlas |
| Auth | JWT via `jsonwebtoken` + `express-jwt` **v5.3.3 (vulnerable — see docs/SECURITY.md)** |
| Types | **Flow**, applied to maybe a third of files. Being retired |
| Build | Babel (`@babel/preset-env` + `preset-react` + `preset-flow`) → `lib/` |
| Lint | ESLint 8 + Prettier + airbnb |

## Commands

```bash
yarn dev:start     # nodemon + babel-node src
yarn prod:build    # rimraf lib && babel src -d lib
yarn prod:start    # cross-env NODE_ENV=production pm2 start lib && pm2 logs
yarn prod:stop     # pm2 delete lib
yarn eslint        # eslint src && flow
yarn test          # jest --coverage (existing tests cover the dormant blog only)
```

`.travis.yml` is dead — Travis CI is long gone and there is **no CI at all** right now.

## Request pipeline

```
src/index.js
  └─ src/server/index.js
       ├─ mongoose()                    config/mongoose.js — connects via process.env.MONGODB_URI
       ├─ middleware(app)               morgan|compression, cors(), override, bodyParser 10mb, static, favicon
       ├─ cors({ origin: allowlist })   ← registered AFTER the permissive cors() above, so it does nothing
       ├─ Cache-Control: no-store       on every response
       ├─ /api  → api/index.js          → leo | abluelemon | devPunk
       ├─ /auth → auth/routes.js        → verifyUser() → signToken()
       └─ /     → root/index.js         404 "This is a private API"
```

Per-resource layout is consistent: `xRoutes.js` → `xController.js` → `xModel.js`.
Auth middleware is the pair `[auth.decodeToken(), auth.getFreshUser('leo')]`, aliased `checkUser`.

## Hard rules

1. **Never commit** `.env`, connection strings, JWT secrets, OAuth credentials, or mail passwords.
   This repo already has leaked Google credentials in its history — do not add more.
2. **Never log request headers or tokens.** `auth/index.js` currently does
   `console.log('DECODING-TOKEN', req.headers)` — that writes bearer tokens into PM2 logs. It is
   task A-5 to remove; do not reintroduce the pattern.
3. **Never return full school documents on a public route.** `leo_schools` holds teachers' names,
   emails and phone numbers — GDPR/DSGVO applies and the affected people are teachers at German
   schools. Public endpoints get an explicit `.select()` projection.
4. **Do not delete the dormant products.** Comment out route registrations only.
5. **Do not touch the shared `auth/` module without checking all mount points.** `getModel()` maps
   a string to a user model; changing it affects both live and dormant products.
6. **Any change to an endpoint's response shape breaks the frontend.** The frontend is a separate
   repo with no contract tests. If you change a controller's output, say explicitly which frontend
   files consume it.
7. **Mongoose schemas are out of sync with the data** — `leo_documents` has `year` and
   `projects[].items[].audio` in the database but not in `DocumentSchema`; `leo_images` is fine.
   This works only because Mongoose strict mode applies to writes, not reads. Do not "clean up"
   the schemas without confirming the frontend still receives those fields.

## Working with coding agents

Learned the hard way, 16 Aug 2026. These are not optional.

1. **Never run `yarn install`, `yarn add`, or any package install command.** OpenCode runs in
   Linux; this repo is developed on Windows. A Linux install rewrites `node_modules/.bin` with
   POSIX symlinks (no `.cmd` shims) and installs Linux binaries for native modules like `bcrypt`,
   which then fail with *"is not a valid Win32 application"*. If a dependency must change, edit
   `package.json` only and say so — the human runs the install on Windows.

2. **Commit your work.** Create the branch, make the edits, `git add`, `git commit`. Reporting a
   task as done while leaving changes uncommitted in the working tree has caused three separate
   tangles. A task is not finished until `git status --short` is empty and `git log -1` shows
   your commit.

3. **Apply the change — do not stop at a plan** unless explicitly asked to plan. If asked to plan
   first, say so clearly and wait.

4. **Report the branch name you are actually on**, verified with `git branch --show-current`, not
   the one you intended to create.

### For the human, before switching branches

Run `git status --short`. Empty means safe to check out. Anything listed means the agent left work
uncommitted — commit it on the current branch first.

### ✅ Local development now uses STAGING, not production

Fixed 17 Aug 2026 (task A-20). `src/server/config/mongoose.js` is now environment-aware:

- `NODE_ENV === 'production'` → `MONGODB_URI` (DigitalOcean)
- otherwise → `MONGODB_DEV`, falling back to `MONGODB_URI`

On startup it logs which variable it used, e.g. `[  DB  ]: connected via MONGODB_DEV`. **Check that
line before running anything that writes.**

`MONGODB_DEV` points at the `api-staging` cluster (Atlas project `api_development`), populated from
a real backup — 337 schools, 7 documents, 169 images, 3 users.

Before this fix, local dev talked to the live database, and on 16 Aug a `POST /images` test that
ran before its auth fix was applied wrote a junk record into production. That specific trap is now
closed, but the discipline still stands: **verify the diff, then test** — never the other way round.

### Backup and restore

- `yarn backup` — dumps all four leo collections to `backups/<timestamp>/`. Run it before any risky
  operation, when registration opens, when the season closes, and monthly in between.
- `yarn restore <folder> --confirm` — restores into `RESTORE_TARGET_URI`. Refuses to run if that
  matches `MONGODB_URI`, and refuses any collection that already has documents.
- `backups/` is gitignored. **Those files contain teachers' names, emails and phone numbers — never
  commit them and keep them off shared drives.**

The Atlas cluster is on the **M0 free tier, which has no backups of any kind**. These scripts are
the backup strategy, not a stopgap.

### Node and CI

`engines` is pinned to `22.x` and `.nvmrc` contains `22`. Both DigitalOcean and CI honour it.

⚠️ **OpenCode's environment runs Node 20**, so yarn refuses its commands without
`YARN_IGNORE_ENGINES=1`. That is the pin working as intended, not a fault.

CI (`.github/workflows/ci.yml`) runs `yarn prod:build` on every push to `development` and `master`.
It deliberately does **not** run lint (87 pre-existing Flow parse errors — see A-15) or tests (they
cover the dormant blog product only). **We do not use pull requests**: the green tick on
`development` is the gate before merging to `master`.

## Definition of done

- [ ] `yarn eslint` passes
- [ ] `yarn prod:build` completes
- [ ] You said what you changed, what you did **not** test, and which frontend views are affected
- [ ] No secrets, no PII in logs, no `console.log` of request data in the diff
- [ ] For auth or endpoint changes: state plainly that admin login and school registration need a
      manual end-to-end check before deploy

## Related docs

- `docs/SECURITY.md` — the known holes, in priority order ← **start here**
- `docs/TASKS.md` — the work queue
- `docs/DATA-MODEL.md` — collections, schemas, and where they disagree with reality
- `docs/DEPLOYMENT.md` — DigitalOcean, PM2, env vars
- `docs/ROADMAP.md` — phasing and reasoning
