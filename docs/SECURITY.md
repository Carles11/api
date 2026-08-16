# Security — known issues

Found in a read-only audit, August 2026. Ordered by urgency. Each maps to a task in `docs/TASKS.md`.

**These are exceptions to the seasonal freeze — they ship in any window.**

---

## 🔴 A-0 · Leaked Google OAuth credentials — do this today

`src/server/api/leo/school/schoolController.js`, in `setMail()`:

```js
clientId:     '1067546246706-…apps.googleusercontent.com',
clientSecret: '3Stb9mRd1vtrI0CcVarPAfGq',
refreshToken: '1/cI5CXoe7cReWK3yUoZDbCX7otnqy2rPRPhkIB4rF1Po',
accessToken:  'ya29.Glsd…',
```

For `leoleoconcurso@gmail.com`. These are **committed to git and present in HEAD** — a later
"removed sensitive data" commit did not remove these. If this repo is public (the sibling frontend
repo is), assume they are compromised.

**Do, in this order:**

1. **Revoke** the OAuth client in Google Cloud Console, and revoke the refresh token from the
   Google account's *Third-party access* page. Do this before anything else — it is the only step
   that actually stops the bleeding.
2. Move any remaining mail config to env vars (`USER_MAIL` / `PASS_MAIL` already exist in `.env`).
3. Decide about history: `git filter-repo` can scrub it, but it rewrites every commit hash and the
   credentials may already be in forks, caches and clones. **Revoking is what matters**; scrubbing
   is cosmetic. Usually the pragmatic call is revoke, replace, move on.

**Also note:** `setMail()` is **never called from anywhere.** Confirmed with
`grep -rn "setMail" src/`. So schools registering today receive **no confirmation email** and the
organisers get **no notification** — a silent product bug, not just a security one. Decide with the
client whether to wire it up properly (Resend / Postmark / SES) or delete the function.

---

## 🔴 A-1 · Teachers' personal data on a public endpoint

`src/server/api/leo/school/schoolRoutes.js`:

```js
router.route('/').get(ctrl.list).post(ctrl.create)   // ← no auth on GET
```

`ctrl.list` does `School.find({})` and returns **entire documents**: contact person's name, email
address, phone number, postal address, consent flags. Anyone can `curl` it.

The public `/colegios-inscritos` page only renders `name` and `address` — so the frontend never
needed the rest. This is a **DSGVO/GDPR exposure** and the data subjects are teachers at German
schools.

**Fix:** split the route.

- Public `GET /schools` → `.select('name address year')`
- Authenticated `GET /schools/all` (behind `checkUser`) → full documents, for the admin panel

**Frontend impact:** `views/Colegios.jsx` (public, needs only name/address/year) and
`components/AdminList.jsx` (admin, needs everything — including `email` for the "send mail to all"
feature and the Excel export). Both must be checked before deploying.

---

## 🔴 A-2 · Authentication bypass — `express-jwt` 5.3.3

`src/server/auth/index.js`:

```js
const checkToken = expressJwt({ secret: config.secrets.jwt })   // no `algorithms`
```

This is exactly the vulnerable pattern in
[CVE-2020-15084](https://github.com/advisories/GHSA-6g6m-m6h5-w9gf) — in `express-jwt` ≤ 5.3.3,
omitting `algorithms` lets a token signed with an unexpected algorithm be accepted. That means
forged admin access: create users, edit and **delete** schools.

**Fix:** upgrade to `express-jwt` v8 and pass `algorithms: ['HS256']` explicitly.

The v5 → v8 API changed — the decoded payload lands on `req.auth`, not `req.user`, so
`getFreshUser()` needs updating, and the import becomes `{ expressjwt }`. Small change, but it is
on the login path: **test admin sign-in end to end before deploying.**

---

## 🟠 A-3 · Unauthenticated writes on the image endpoints

`src/server/api/leo/image/imageRoutes.js` — `POST /` and `PUT /:imageId` have **no auth
middleware at all**. Anyone can insert or rewrite rows in `leo_images`, which render directly in
the public photo gallery. Straightforward defacement vector.

**Fix:** add the `checkUser` array, as `schoolRoutes.js` does for its write routes.
`GET` stays public.

---

## 🟠 A-4 · The CORS allowlist does nothing

`src/server/index.js` builds a careful origin allowlist — but `middleware(app)` runs *first* and
registers `app.use(cors())` with no options, which allows every origin. First handler wins.

**Fix:** delete the `cors()` line from `src/server/middleware/index.js` and its now-unused import.
Keep the allowlist in `server/index.js`.

**Check first:** confirm no other live consumer depends on the permissive behaviour. The allowlist
currently names only `https://www.leo-leo-hessen.com` — if the site is also reachable at the
apex domain without `www`, or on a Render preview URL, add those or you will break staging.

---

## 🟠 A-5 · Bearer tokens written to the logs

`src/server/auth/index.js`:

```js
console.log('DECODING-TOKEN', req.headers)
```

Every authenticated request dumps its `access-token` header into PM2's logs. Anyone with log
access has admin credentials. **Delete the line.**

---

## 🟠 A-6 · No rate limiting

- `POST /auth/signin-leo` is brute-forceable. There is no lockout, no delay, no captcha.
- `POST /api/leo/schools` is open and unauthenticated by design (it *is* the registration form),
  so it is spam bait — and each junk row pollutes the admin's list and Excel export.

**Fix:** `express-rate-limit`. Strict on the auth route (e.g. 5 attempts / 15 min / IP), looser on
registration (e.g. 5 / hour / IP). Consider a honeypot field on the form as well — cheaper and
less annoying than a captcha for the small volumes involved.

---

## 🟡 Lower priority

- **No `helmet`.** Add it; it is one line and sets sensible security headers.
- **Token lifetime.** `config.expireTime = 24 * 60 * 10` = 14,400 seconds = **4 hours**, which is
  probably not what the arithmetic was reaching for. Decide deliberately and add a comment.
- **JWT in `localStorage`** on the frontend — XSS-readable. Moving to an httpOnly cookie is the
  textbook fix but changes both sides; low value for a two-admin panel. Note and defer.
- **Broken error middleware.** `src/server/middleware/errorHandler.js` has the signature
  `(err, res)`; Express error handlers need four arguments. It is imported in `auth/index.js` and
  never used. Dead *and* wrong — fix or delete.
- **Junk dependencies.** `add@2.0.6`, `fs@0.0.1-security`, `logger@0.0.1` are unused
  placeholder/typosquat-adjacent packages. Remove them.
- **`.env` is correctly gitignored** in both repos — verified. Keep it that way.

---

## Verifying a fix

There is no CI and no staging (tasks A-9, A-10). Until there is, every security fix needs a manual
pass:

1. Admin login at `/admin` on the live site still works
2. The admin list still loads, filters by year, exports to Excel, and prints
3. A test school can still register from the homepage form
4. `/colegios-inscritos` still lists schools
5. `curl https://<api-host>/api/leo/schools` returns **only** name, address and year
