# STATUS — where we are, where to pick up

**Last updated:** 16 August 2026, end of session
**This file is identical in both repos** (`api` and `leo-react`) — the work is cross-repo.
**Read this first**, then `AGENTS.md`, then `docs/TASKS.md`.

---

## 1. Current state

Both repos: **all work merged to `master` and deployed to production.** No open branches, no
uncommitted work. Production is healthy and verified.

| | api | leo-react |
|---|---|---|
| Host | DigitalOcean App Platform (`api-crix`) | Render (static site `leo-react`) |
| Deploys from | `master`, autodeploy **on** | `master`, autodeploy **on** |
| Live URL | https://www.api-crix.com | https://www.leo-leo-hessen.com |

⚠️ **Pushing `master` in either repo deploys immediately.** There is no staging (task A-9).
Work on `development`, merge to `master` only when you intend to deploy.

---

## 2. Completed and verified in production — 16 Aug 2026

| Task | What it fixed |
|---|---|
| **A-2** | **Authentication bypass** (CVE-2020-15084). `express-jwt` 5.3.3 → 8, explicit `algorithms: ['HS256']`, `req.user` → `req.auth`. Forged admin tokens no longer work. |
| **A-1** | **Teachers' PII on a public endpoint.** `GET /schools` now `.select('name address year')`; new `GET /schools/all` behind `checkUser` serves the admin panel. The public `POST /schools` response was leaking the full list too — also fixed. |
| **A-3** | `POST`/`PUT` on `/api/leo/images` now require auth. `GET` stays public. |
| **A-5** | Removed four `console.log` calls printing school records and `req.body` (names, emails, phones) into server logs. |
| **A-0c** | Removed hardcoded Google OAuth credentials and the dead `setMail` function. Credentials independently confirmed **already revoked** (`invalid_grant`). |
| **A-17** | **Production build was a time bomb.** `prod:build` ran an unpinned `yarn add @babel/preset-env`, which now pulls Babel 8 (needs Node ≥22.18) and mutates `package.json`. Babel packages moved to `dependencies`, `yarn add` deleted. |
| **A-18** | `yarn eslint` crashed on untouched code (`eslint-plugin-flowtype` requiring an eslint subpath that v8 does not export). Plugin removed, script split into `lint` and `flow`. |

**Also done:** DigitalOcean alert policies enabled (Failed Deployment, Failed Domain, CPU >80%,
RAM >85% — all email); GitHub↔DigitalOcean connection repaired; `api/docs/DEPLOYMENT.md` rewritten
from verified dashboard facts.

### Why A-17 mattered more than it looked
DigitalOcean App Platform performs **unattended maintenance redeploys** — the activity log shows
them with actor "App Platform", not a user. A broken build was therefore not gated on us
deploying; it would have fired on DO's schedule, potentially mid-registration-season.

---

## 3. Pick up here — in this order

### 🟠 A-4 · Fix the CORS ordering — **BLOCKED, needs one answer first**

`app.use(cors())` (allow-all) in `src/server/middleware/index.js` is registered **before** the
carefully-written allowlist in `src/server/index.js`, so the allowlist is inert. Confirmed
empirically: production responses carry `access-control-allow-origin: *`.

**Blocker:** the allowlist currently names only `https://www.leo-leo-hessen.com`. Fixing A-4
activates it — so any origin missing from the list breaks for real users.

Evidence suggests `https://leo-leo-hessen.com` (no `www`) **also serves the site**: fetching the
apex returned page content rather than a redirect. Not confirmed.

**First action tomorrow:** in Render → service `leo-react`, click the **⌄ next to
`www.leo-leo-hessen.com`** to list every configured domain. Note the apex, the `*.onrender.com`
URL, and anything else. Then fill the list into the prompt below.

**Agent:** OpenCode (edit mode) once the origin list is known — otherwise Claude.

```
Read AGENTS.md and docs/SECURITY.md section A-4.
APPLY THE CHANGES IMMEDIATELY. Do not stop at a plan. Commit when done.
Do not run any install command.
Branch: security/A-4-cors-ordering

1. In src/server/middleware/index.js: delete `app.use(cors())` and its now-unused cors import.
   Leave every other middleware exactly as it is.

2. In src/server/index.js, replace the production allowlist with exactly these origins:
     <PASTE THE CONFIRMED LIST HERE — e.g.
       https://www.leo-leo-hessen.com
       https://leo-leo-hessen.com
       https://<render-subdomain>.onrender.com >
   Keep http://localhost:3000 for development.

Note: NODE_ENV IS 'production' in the deployed app (verified in Runtime Logs:
"[  PORT  ]: 8080 in (production)"), so the production branch of that conditional is the one
that runs. Do not change the NODE_ENV logic.

Run `yarn lint` and `yarn prod:build`, show the full diff, confirm the commit hash.
```

**Verify after deploy:** load the site from **every** domain in the list and confirm data loads
with no CORS errors in the browser console. Response headers should show the specific origin, not `*`.
**This is the highest-risk remaining change** — a missing origin breaks the live site.

---

### 🟠 A-6 · Rate limiting — **ready to run, no blockers**

`POST /auth/signin-leo` is brute-forceable; `POST /api/leo/schools` is open to spam.

**Agent:** OpenCode (edit mode).

```
Read AGENTS.md and docs/SECURITY.md section A-6.
APPLY THE CHANGES IMMEDIATELY. Do not stop at a plan. Commit when done.
DO NOT run any install command — add express-rate-limit to package.json dependencies by editing
the file, and tell me; I will install on Windows.
Branch: security/A-6-rate-limiting

1. Add "express-rate-limit": "^7.4.0" to dependencies in package.json.

2. In src/server/index.js, immediately after the app is created, add:
     app.set('trust proxy', 1)
   This is REQUIRED. The app runs on DigitalOcean App Platform behind a proxy (Cloudflare);
   without it every request appears to come from one IP and the limiter locks out all users at
   once. Trust exactly one hop — do not use `true`.

3. Apply a strict limiter to the auth routes: 5 requests per 15 minutes per IP.
4. Apply a looser limiter to POST /api/leo/schools only: 5 per hour per IP.
   GET routes must NOT be rate limited — the public site polls them.

Run `yarn lint` and `yarn prod:build`, show the full diff, confirm the commit hash.
```

**Verify:** six rapid failed logins → the sixth returns 429. A normal registration still succeeds.
Two different networks (e.g. laptop and phone hotspot) are limited independently — that proves
`trust proxy` is right.

---

### 🟡 A-19 · `config/production.js` has never loaded

Discovered while verifying A-2. The file starts with `require('babel-core/register')` and
`require('babel-polyfill')` — Babel 6 leftovers, neither declared in `package.json`. The require
throws and `config/index.js` swallows it in a `catch`, so `config.db`, `config.mail` and
`config.logging` are `undefined` in production.

**This is the real reason** `mongoose.js` reads `process.env.MONGODB_URI` directly with a comment
blaming DigitalOcean. The blame was misplaced.

No live impact today. Full detail in `api/docs/TASKS.md` A-19. **Agent:** OpenCode.

---

## 4. Then: Week 2 — the safety net

None of it blocks the content update, but it is what makes the October–April freeze survivable.

| Task | Agent | Note |
|---|---|---|
| **A-9** staging | you | An unused **`api_development`** project already exists in Atlas — start there. Also fixes the "local dev writes to production" trap. |
| **A-10 / S-6** CI | OpenCode | Now unblocked — A-18 fixed `yarn lint`. |
| **A-11 / S-10** Sentry | OpenCode | Exact `beforeSend` PII scrubber is specified in the task. |
| **A-12** backups | you | Confirm Atlas backups exist **and restore one**. Untested backup ≠ backup. |
| **A-13 / S-11** READMEs | OpenCode | Both are still boilerplate. |
| Pin Node to `22.x` | OpenCode | `engines` currently allows 18 and 20, both EOL. App Platform and Render both honour `engines`. Local Node is 22.17.0. |

---

## 5. Next week: the content update

New texts, bases and dates arrive. **Follow `leo-react/docs/ANNUAL-CONTENT-UPDATE.md` exactly** —
it is ordered by dependency and the DB entry must exist before the frontend change.

**Agent: Claude** (`/content-update <year>`). Six files plus MongoDB, and the main failure mode is
silent: `Lectura.jsx` filters on a hardcoded year, so new texts simply do not appear rather than
erroring.

---

## 6. Hard-won lessons — details in `AGENTS.md`

1. **OpenCode runs in Linux; these repos are developed on Windows.** Never let it run
   `yarn install` / `yarn add` — it writes POSIX symlinks with no `.cmd` shims and installs Linux
   binaries for native modules (`bcrypt` → *"not a valid Win32 application"*). Recovery is
   `rmdir /s /q node_modules && yarn install` from Windows.
2. **Agents do not reliably commit.** Always check `git status --short` (empty) and
   `git log --oneline -1` (your commit) before switching branches.
3. **Tell agents to apply, not plan** — unless you want a plan.
4. **Local dev connects to the PRODUCTION database.** `mongoose.js` reads `MONGODB_URI`
   unconditionally; `MONGODB_DEV` is defined but never read. Never run a write test locally until
   the code blocking that write is confirmed applied. On 16 Aug a `POST /images` test ran before
   the fix landed and wrote a junk record into live `leo_images`.
5. **Verify the diff, then test.** In that order.

---

## 7. Known pre-existing bugs — not regressions

- **Q-6** — Excel export "Categorías" column is always empty. `ExcelExport.jsx` uses
  `value="categories"`; the schema field is `category` (singular). Logged in
  `leo-react/docs/TASKS.md`.
- **Q-7** — `utils/API.js` detects 401 via `promise.statusText === 'Unauthorized'`, which is often
  an empty string behind Cloudflare/HTTP2. Expired tokens may fail confusingly.
- **Q-1** — `AdminList.jsx` has `year: 2026 || 2025`; the `||` does nothing.
- `created` timestamps on old MongoDB documents show today's date — Mongoose applies the schema
  default at read time for documents that never stored the field. Cosmetic, not corruption.

---

## 8. Season calendar — the rule that governs everything

| Window | Status |
|---|---|
| **Now → end September** | 🟢 off-season — breaking changes allowed |
| **October → April/May** | 🔴 **FROZEN** — security fixes and content only |
| **May → September 2027** | 🟢 off-season — Phase 2 (Vite, React 19) |

Registration opens in October. Everything in sections 3 and 4 should land before then.
