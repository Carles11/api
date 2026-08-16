# Deployment — api

> ⚠️ Parts of this are **unverified** — reconstructed from code and package scripts, not from the
> DigitalOcean dashboard. Fields marked **`VERIFY`** need one pass by a human with access.
> Correct them and delete the marker.

## Where it runs

| | |
|---|---|
| Host | **DigitalOcean** — **`VERIFY`**: App Platform or a Droplet? The `pm2` scripts suggest a Droplet |
| Process manager | PM2, started from the compiled `lib/` directory |
| Deploys from | **`VERIFY`** — which branch, and is it automatic or a manual pull + build? |
| Node version | package.json declares `>=18` |
| Public URL | **`VERIFY`** — the value of `REACT_APP_API_URL` in the frontend's Render config |

Build and start, per `package.json`:

```bash
yarn prod:build    # rimraf lib && babel src -d lib --ignore .test.js
yarn prod:start    # cross-env NODE_ENV=production pm2 start lib && pm2 logs
yarn prod:stop     # pm2 delete lib
```

Note `prod:build` begins with `yarn add @babel/preset-env`, which mutates `package.json` on every
build. That is a workaround someone added under pressure; clean it up in the off-season.

## Environment variables

Loaded by `dotenv` from `.env` on the server (gitignored — verified). Referenced in
`src/server/config/`:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Atlas connection string — **production** |
| `MONGODB_DEV` | Atlas/local connection string for development |
| `JWT` | Secret for signing and verifying tokens |
| `PORT` | Listen port |
| `USER_MAIL` / `PASS_MAIL` | Mail credentials (referenced in `config/production.js`, currently unused — `setMail()` is never called) |
| `NODE_ENV` | Selects `config/{development,production,testing}.js` |

⚠️ `config/mongoose.js` reads `process.env.MONGODB_URI` **directly**, bypassing the config object,
with a comment explaining that `config.db.url` "is not working in DigitalOcean". So `MONGODB_URI`
must be set in the actual process environment, not only in a config file. Worth revisiting once
there is a staging environment to test against.

## CORS

The allowlist in `src/server/index.js` currently permits:

- `http://localhost:3000` when `NODE_ENV === 'development'`
- `https://www.leo-leo-hessen.com` otherwise

**It is currently inert** — see `docs/SECURITY.md` A-4. Once A-4 is fixed the allowlist becomes
real, so it must first be extended to cover every origin actually in use (apex domain without
`www`, Render preview URLs, the staging frontend). Getting this wrong takes the live site down.

## Release procedure

1. Work on `development`.
2. `yarn eslint && yarn prod:build` locally.
3. PR → review → merge.
4. Deploy: **`VERIFY`** the exact steps — pull + `yarn prod:build` + `pm2 reload`?
5. Check `pm2 logs` for the `[ DB connected. ]` line.
6. Smoke test against the live frontend:
   - `curl <api>/api/leo/documents` returns the current edition **with its `year` field**
   - `curl <api>/api/leo/schools` returns the school list
   - Sign in at `/admin` on the live site
   - Register a test school, confirm it appears, then delete it from Atlas

**Do not deploy on a Friday, and not during October–April/May** unless it is a security fix. That
window is the registration season and there is no margin.

## Rollback

**`VERIFY` and write this down.** With PM2 the usual path is checking out the previous commit,
rebuilding, and `pm2 reload`. Nobody should be figuring this out during an outage.

## Related

- Frontend deployment: `leo-react` repo, `docs/DEPLOYMENT.md` (Render.com)
- Database: MongoDB Atlas, org `CriX`, project `api_production`, cluster `api`, db `api`.
  Backups: **`VERIFY`** they are enabled, and test a restore — task A-12.
