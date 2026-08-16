# Deployment — api

Verified against the DigitalOcean dashboard, 16 Aug 2026. No inferred fields remain except the two
marked **OPEN**.

## Where it runs

| | |
|---|---|
| Host | **DigitalOcean App Platform** — *not* a Droplet |
| App | `api-crix` · project `carles` · region **FRA1** · https://www.api-crix.com |
| Component | `api` — Web Service, 1 instance, $5/mo (512 MB RAM, 1 shared vCPU) |
| Repo | `github.com/Carles11/api`, source directory `/` |
| **Deploys from** | **`master`** |
| **Autodeploy** | **On** — every push to `master` deploys immediately. There is no separate deploy step. |
| Buildpack stack | Ubuntu 22.04 · Custom Build Command · Procfile · Node.js |
| Public HTTP port | 8080 (App Platform injects `PORT`) |
| Node version | Buildpack default is **22.x**; controlled by `engines` in `package.json` |

### ⚠️ App Platform redeploys on its own

The activity log shows entries reading *"Performed routine maintenance and redeployed app"* with
the actor logged as **App Platform**, not a user (18 Mar 2026, 7 Jan 2026). DigitalOcean rebuilds
this app on its own schedule.

**Consequence:** a broken build is not a risk you control by not deploying. It fires whenever DO
does maintenance — including mid-registration-season. This is why task A-17 (the unpinned
`yarn add` in the build script) was urgent rather than merely blocking.

A failed deployment does **not** take the site down: App Platform keeps the last good deployment
serving traffic. The "Failed Deployment" email alert is the signal that this has happened.

## Commands (set in the dashboard, not in the repo)

Settings → Components → `api` → Commands:

```
Build Command:  yarn prod:build
Run Command:    yarn start
```

### ⚠️ Production runs in development mode

`yarn start` → `yarn dev:start` → `nodemon --ignore lib --exec babel-node src`

So production **transpiles on the fly with `babel-node` under `nodemon`**, and the `lib/` output
that `prod:build` produces is built and then never used. This also explains ~58% RAM at idle on a
512 MB instance.

It works, and it is not being changed during the current season — but two things follow:

1. `nodemon` and `@babel/node` are in `devDependencies`, so the runtime image **must** include dev
   dependencies. Do not add `--production` to the install step.
2. ✅ **RESOLVED 16 Aug 2026 — `NODE_ENV` IS `production`.** Verified in Runtime Logs:
   `[  PORT  ]: 8080 in (production)`. App Platform sets it even though it is absent from the
   dashboard env vars. So `server/index.js` resolves the CORS allowlist to
   `https://www.leo-leo-hessen.com`, not localhost. **A-4 is safe from this particular landmine** —
   but still extend the allowlist to cover the apex domain and any staging origin before merging it.

3. ⚠️ **However — `config/production.js` never actually loads.** See task A-19. It begins with
   `require('babel-core/register')` and `require('babel-polyfill')`, neither of which is declared in
   `package.json` (Babel 6 leftovers). The require throws, `config/index.js` swallows it in a
   `catch`, and `envConfig` falls back to `{}`. So `config.db`, `config.mail` and `config.logging`
   are `undefined` in production. **This — not DigitalOcean — is why `mongoose.js` had to read
   `process.env.MONGODB_URI` directly.**

> **Why are `@babel/core`, `@babel/preset-env` and `@babel/preset-flow` in `dependencies` rather
> than `devDependencies`?** Deliberate, task A-17. The build script previously papered over a
> missing toolchain with an unpinned `yarn add @babel/preset-env`, which installs the newest major
> — and broke when Babel 8 shipped (Babel 8's `compat-data` requires Node ≥ 22.18). Keeping these
> three in `dependencies` means the build works regardless of install mode. Do not "tidy" them back.

## Environment variables

Set in the App Platform dashboard (Settings → Components → `api` → Environment Variables).
Only two are configured:

| Variable | Set in DO? | Purpose |
|---|---|---|
| `MONGODB_URI` | ✅ | Atlas connection string — production |
| `JWT` | ✅ | Secret for signing and verifying tokens |
| `PORT` | ❌ | Injected by App Platform (8080) |
| `NODE_ENV` | ❌ | **See the OPEN item above** — defaults to `development` in code |
| `MONGODB_DEV` | ❌ | Local development only |
| `USER_MAIL` / `PASS_MAIL` | ❌ | Referenced in `config/production.js`; unused since `setMail()` was removed (A-0c) |

⚠️ `config/mongoose.js` reads `process.env.MONGODB_URI` **directly**, bypassing the config object,
with a comment noting that `config.db.url` "is not working in DigitalOcean". Now explained: with
`NODE_ENV` unset, `config/production.js` never loads, so `config.db.url` is undefined. The direct
read is a workaround for the same root cause as the OPEN item above.

## Alerts

Configured 16 Aug 2026 (App-level → Alert Policies):

| Policy | Delivery | Enabled |
|---|---|---|
| Failed Deployment | Email | ✅ |
| Failed Domain Configuration | Email | ✅ |
| CPU above 80% for 5 min | Email | ✅ |
| RAM above 85% for 5 min | Email | ✅ |

RAM is the one that matters — `babel-node` sits around 58% at idle, so headroom is limited.

## CORS

The allowlist in `src/server/index.js` permits:

- `http://localhost:3000` when `NODE_ENV === 'development'`
- `https://www.leo-leo-hessen.com` otherwise

**Currently inert** — see `docs/SECURITY.md` A-4. Before fixing A-4, resolve the NODE_ENV OPEN item
above and extend the list to cover every origin actually in use (apex domain without `www`, Render
preview URLs, the staging frontend). Getting this wrong takes the live site down.

## Release procedure

1. Work on `development`.
2. `yarn lint && yarn prod:build` locally. Confirm `git status` shows `package.json` **unmodified**
   afterwards — if the build mutated it, A-17 has regressed.
3. Push `development`. Nothing deploys.
4. **Merge `development` → `master` and push. This is the deploy** — autodeploy fires immediately.
5. Watch the build in the DO dashboard (Activity tab). A failure leaves the previous version live
   and emails you.
6. Smoke test:
   - `curl https://www.api-crix.com/api/leo/documents` — returns the current edition **with its
     `year` field**
   - `curl https://www.api-crix.com/api/leo/schools` — returns the school list
   - Sign in at `/admin` on https://www.leo-leo-hessen.com
   - Register a test school, confirm it appears on `/colegios-inscritos`, then delete it in Atlas

**Do not deploy on a Friday, and not during October–April/May** unless it is a security fix. That
window is registration season and there is no margin.

## Rollback

App Platform keeps previous deployments. Dashboard → app → **Activity**, find the last good
deployment, and use its **Rollback / Redeploy** action. No git operation required.

**OPEN:** do a dry run of this once, outside season, and note the exact click path here. Nobody
should be discovering it during an outage.

## Related

- Frontend deployment: `leo-react` repo, `docs/DEPLOYMENT.md` (Render.com)
- Database: MongoDB Atlas, org `CriX`, project `api_production`, cluster `api`, db `api`.
  Backups: **OPEN** — confirm enabled and test a restore (task A-12).
