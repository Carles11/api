# Task queue — api

One task = one branch = one PR. Work top to bottom.
Security tasks (A-0 … A-6) ship in **any** season. Everything else respects the freeze in `AGENTS.md`.

Full context for A-0 … A-6 is in `docs/SECURITY.md` — read it before starting.

---

## Phase 0 — Security · do first

### A-0 · Remove the dead Google credentials from source 🟢 ~30 min
**The credentials are confirmed dead** — `invalid_grant`, verified 16 Aug 2026. Nothing to revoke.
See `docs/SECURITY.md` A-0.

Delete the `setMail` function and its now-unused `nodemailer` import from
`src/server/api/leo/school/schoolController.js`. Confirm first with `grep -rn "setMail" src/` that it
is genuinely never called.

Then ask the client whether registration confirmation emails are wanted at all — they have never
been sent and nobody appears to have noticed.

**Done when:** no credential literal remains in `src/`, the build passes, and school registration
still returns 201.

---

### A-1 · Close the public PII endpoint 🔴 ~1 hour
`schoolRoutes.js` — split into a projected public route and an authenticated full route.

```js
// public
router.route('/').get(ctrl.listPublic).post(ctrl.create)
// admin
router.route('/all').get(checkUser, ctrl.list)
```

`listPublic` → `School.find({}).select('name address year')`.

**Frontend impact — coordinate both repos:**
- `views/Colegios.jsx` needs only name/address/year → works unchanged against the public route
- `components/AdminList.jsx` needs the full record (`email` for "send mail to all", everything for
  the Excel export) → must be pointed at `/schools/all`, and it already sends the auth token

**Done when:** `curl` on the public route returns only three fields, and the admin panel still
exports a complete Excel file.

---

### A-2 · Fix the express-jwt auth bypass 🔴 ~half a day
`express-jwt` 5.3.3 → v8, with `algorithms: ['HS256']` explicit. CVE-2020-15084.

Note the v5→v8 API change: import becomes `{ expressjwt }`, and the decoded payload lands on
`req.auth` rather than `req.user`, so `getFreshUser()` in `src/server/auth/index.js` needs a
matching edit.

**Done when:** admin login works end to end, a request with no token gets 401, and a request with a
token signed by a different algorithm gets 401.
**Do not deploy this without manually signing in on the real site.**

---

### A-3 · Auth on image writes 🟠 ~30 min
Add `checkUser` to `POST /` and `PUT /:imageId` in `imageRoutes.js`. Leave `GET` public.

**Check first:** whether anything other than a logged-in admin currently POSTs images. If the
gallery is populated by hand in Atlas, nothing breaks.

---

### A-4 · Fix the CORS ordering 🟠 ~30 min
Remove `app.use(cors())` and its import from `src/server/middleware/index.js`; keep the allowlist
in `src/server/index.js`.

**Before merging**, extend the allowlist to cover every origin actually in use: `www` and apex
domains, and the staging/preview URL once A-9 exists. Getting this wrong takes the live site down
with opaque browser errors.

---

### A-5 · Stop logging tokens 🟠 ~10 min
Delete `console.log('DECODING-TOKEN', req.headers)` from `src/server/auth/index.js`.
While you are there, sweep `grep -rn "console.log" src/server/api/leo/` — `schoolController.js`
logs request bodies on remove/update, which is also PII in the logs.

---

### A-6 · Rate limiting 🟠 ~2 hours
`express-rate-limit`. Strict on `/auth/signin-leo`, looser on `POST /api/leo/schools`.

Note DigitalOcean may put a proxy in front — set `app.set('trust proxy', 1)` or every request will
share one IP and the limiter will lock everyone out at once. Verify before deploying.

---

## Phase 1 — Safety net

### A-9 · Staging environment 🔵 half a day
A second DigitalOcean app tracking `development`, pointed at a **copy** of the Atlas database.
Never at production Mongo. Add its URL to the CORS allowlist (A-4) and to
`docs/DEPLOYMENT.md`.

### A-10 · CI on GitHub Actions 🔵 half a day
Install → `yarn eslint` → `yarn prod:build` on every PR. Do **not** gate on `yarn test` yet — the
existing Jest tests cover the dormant blog product and may not pass. Delete `.travis.yml`.

### A-11 · Sentry 🔵 2 hours
`@sentry/node`, DSN from an env var, `environment` set per deploy. Add a `beforeSend` that strips
request bodies — registration payloads contain teachers' emails and phone numbers.

### A-12 · Verify the Atlas backup 🔵 1 hour
Confirm backups are enabled on the `api` cluster, then **actually restore one** into a scratch
database. An untested backup is not a backup. Write the restore steps into `docs/DEPLOYMENT.md`.

### A-13 · Replace the README 🔵 1 hour
Current one is a Bitbucket template with every section left blank. Replace with: what this serves,
which mounts are live, how to run it, how to deploy, env var names, and links into `docs/`.

---

## Phase 2 — Cleanup · 🟢 off-season only (May–September)

### A-7 · Comment out the dormant products
`src/server/api/index.js` — comment out the `abluelemon` and `devPunk` `router.use()` lines and
their imports, matching how `blog` and `terapias` are already handled. **Keep all the files.**

Careful: `src/server/auth/index.js` imports the **blog** user model as its default. Confirm
nothing on the `leo` path depends on it before assuming the blog code is unreachable.

**Done when:** only `/api/leo` is mounted, the files still exist, and admin login still works.

### A-6b · Fix the broken error middleware
`src/server/middleware/errorHandler.js` has the signature `(err, res)`; Express needs four
arguments. It is imported in `auth/index.js` and never used. Either wire it up correctly as the
last `app.use()` in `server/index.js`, or delete it. Do not leave it as-is.

### A-8 · Sync the Mongoose schemas with reality
`DocumentSchema` declares no `year` and no `projects[].items[].audio`, yet both exist in the data
and the frontend filters on `year`. Reads work only because Mongoose strict mode applies to writes.

Add the missing fields. **Verify after deploying** that `GET /api/leo/documents` still returns
`year` and `audio` — if they vanish, `/textos-de-lectura` goes blank on the live site.

### A-14 · Prune junk dependencies
Remove `add`, `fs@0.0.1-security`, `logger@0.0.1`. Remove the Babel 6 leftovers
(`babel-core`, `babel-preset-env`, `babel-preset-flow`, `babel-eslint`) that sit alongside the
`@babel/*` v7 packages. Add `helmet`.

### A-15 · Retire Flow
Flow covers maybe a third of the files and earns nothing. Strip the `// @flow` pragmas and type
annotations, drop `@babel/preset-flow` and `flow-bin`, delete `.flowconfig`.

Optional follow-on: with Node 22 you can drop `babel-node` and the whole Babel build in favour of
native ESM — a meaningful simplification of the deploy.

### A-16 · Consider splitting `leo` out
Five unrelated products in one Express app means a bad deploy for any of them takes down a live
client. Extracting `leo` into its own small service shrinks the blast radius.

Discuss before doing — it changes the deploy topology and the owner may prefer one thing to
maintain over two.
