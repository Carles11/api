# Execution plan — ready-to-paste prompts

Work order for the ~6 weeks of off-season remaining before registration opens in October.
Each task below is one branch, one PR, one agent session.

> **A note on the split.** OpenCode's capability depends on which model you have behind it, not on
> OpenCode itself. The allocation here assumes a weaker model, so it is deliberately conservative:
> OpenCode gets tasks where I have already made every judgement call inside the prompt, and where a
> mistake fails **loudly** (build breaks, lint fails). Claude keeps tasks where a mistake is
> **silent** — auth that still appears to work, a projection that quietly drops a column, a CORS
> list that locks out a domain nobody tests.

## Allocation at a glance

| Agent | Tasks | Why |
|---|---|---|
| 🔵 **Claude** | A-1, A-2, A-4, A-6, Q-2, S-9, + the content update | Auth, cross-repo contracts, silent-failure modes |
| 🟢 **OpenCode** | A-0c, A-3, A-5, A-10, A-11, A-13, Q-1, Q-3, Q-4, S-6, S-10, S-11 | Mechanical, spec'd in full, fails loudly |
| 👤 **You** | Branch protection, staging, backup restore, one client question | Dashboards and decisions |

**Rule for every OpenCode session:** when it finishes, run `/preflight` **in OpenCode** (not Claude)
before you merge. Only escalate to Claude if preflight reports something it can't resolve.

---

# WEEK 1 — Security

## ✅ H-1 · Revoke the Google credentials — DONE, nothing to do

**Resolved 16 Aug 2026.** The leaked refresh token was tested against Google's token endpoint and
returned `invalid_grant`. It is dead, as is the 2017-vintage access token beside it. There is no
Cloud project to track down and nothing to revoke.

The credentials belonged to `leoleoconcurso@gmail.com`, not to the `c-delriofrances-org` Cloud
organisation — which is why they were never visible in this project's console.

Go straight to A-0c. The code cleanup still matters in a public repo, but it is routine hygiene,
not an incident.

---

## 🟢 A-0c · Strip the hardcoded credentials from the code
**Repo:** `api` · **Agent:** OpenCode · **Mode:** Edit

```
Read AGENTS.md and docs/SECURITY.md section A-0.

In src/server/api/leo/school/schoolController.js there is a function `setMail` containing
hardcoded Google OAuth credentials (clientId, clientSecret, refreshToken, accessToken).

Confirm first with grep that `setMail` is never called anywhere in src/. Report what you find.

If it is never called: delete the entire `setMail` function and the now-unused `nodemailer`
import. Do not replace it with anything. Do not touch any other function in the file.

Then grep the whole repo for any other hardcoded secret-looking string (long base64-ish
literals, 'ya29.', 'GOCSPX', 'client_secret') and list what you find without changing it.

Branch: security/A-0c-remove-hardcoded-credentials
Run `yarn eslint` and `yarn prod:build` before reporting.
```

**Changes:** `schoolController.js` only — about 45 lines removed.
**Works if:** build passes, no secret literal remains, school registration still returns 201.

---

## 🔵 A-17 + A-18 · Unbreak the build and lint toolchain
**Repo:** `api` · **Agent:** Claude · **Mode:** Plan first · **Do before deploying anything**

Discovered during A-0c: `yarn prod:build` and `yarn eslint` both fail on untouched code. Until A-17
is fixed the API cannot be reliably deployed — which blocks shipping A-2 and A-1.

```
Read AGENTS.md, then docs/TASKS.md tasks A-17 and A-18.

Both are toolchain breaks, not code defects. A-17 blocks all deploys, so do it first.

For A-17 I need you to work out WHY `yarn add @babel/preset-env` is in the build script before
removing it — my working theory is that the DigitalOcean deploy runs `yarn install --production`,
which strips the Babel toolchain out of devDependencies. If that is right, deleting the line
breaks the deploy in a different way. Tell me what you need to know about the deploy setup, and
give me the options with trade-offs before editing anything.

For A-18, removing eslint-plugin-flowtype is straightforward — but check first whether
.eslintrc.json references any flowtype/* rules that would then be unknown-rule errors.

Branch: chore/A-17-A-18-toolchain
```

**Works if:** `yarn prod:build` completes without mutating `package.json`, and `yarn lint` reports
findings instead of crashing.

---

## 🔵 A-2 · Fix the auth bypass
**Repo:** `api` · **Agent:** Claude · **Mode:** Plan first, then Edit

```
/security-fix A-2
```

**Changes:** `package.json` (express-jwt 5→8), `src/server/auth/index.js` (`{ expressjwt }` import,
explicit `algorithms: ['HS256']`, `req.user` → `req.auth` in `getFreshUser`).
**Works if:** admin login at /admin works; no-token request → 401; token signed with a different
algorithm → 401.
**Do not merge without signing in on the real site yourself.**

---

## 🔵 A-1 · Close the public PII endpoint
**Repo:** `api` (+ coordinated change in `leo-react`) · **Agent:** Claude · **Mode:** Plan first

```
/security-fix A-1

Additional context: this is a two-repo change. Plan both sides before editing either.
The admin panel's Excel export and its "send mail to all" feature both need the full school
records, so they must move to the new authenticated route. The public /colegios-inscritos page
needs only name, address and year. Tell me the deploy order before you start editing.
```

**Changes:** `api`: `schoolRoutes.js`, `schoolController.js` (new `listPublic`).
`leo-react`: `components/AdminList.jsx` points at the authenticated route.
**Works if:** `curl <api>/api/leo/schools` returns three fields only, **and** the admin Excel export
still contains email, phone, contact, cp, city, categories.

---

## 🟢 A-3 · Auth on the image write endpoints
**Repo:** `api` · **Agent:** OpenCode · **Mode:** Edit

```
Read AGENTS.md and docs/SECURITY.md section A-3.

In src/server/api/leo/image/imageRoutes.js, POST / and PUT /:imageId currently have no auth.
Add the same protection schoolRoutes.js already uses for its write routes:

  import * as auth from '../../../auth'
  const checkUser = [auth.decodeToken(), auth.getFreshUser('leo')]

Apply checkUser to POST / and PUT /:imageId ONLY. GET routes stay public — the photo gallery
is public and must keep working.

Copy the exact pattern from src/server/api/leo/school/schoolRoutes.js. Change nothing else.

Branch: security/A-3-image-write-auth
Run `yarn eslint` and `yarn prod:build` before reporting.
```

**Changes:** `imageRoutes.js`, ~3 lines.
**Works if:** the gallery still loads on the live site; an unauthenticated POST returns 401.

---

## 🟢 A-5 · Stop logging tokens and PII
**Repo:** `api` · **Agent:** OpenCode · **Mode:** Edit

```
Read AGENTS.md and docs/SECURITY.md section A-5.

Delete these log statements:
1. src/server/auth/index.js — console.log('DECODING-TOKEN', req.headers)
2. src/server/api/leo/school/schoolController.js — every console.log that prints req.body,
   the school object, or an error object (in remove, schoolById, and the catch blocks)

In the catch blocks, if removing the log leaves the error completely unreported, replace it with
console.error(err.message) — the message only, never the full object and never req.body.

Do not remove or change any other line. Do not add a logging library.

Branch: security/A-5-remove-sensitive-logging
Run `yarn eslint` and `yarn prod:build` before reporting.
```

**Changes:** two files, log lines only.
**Works if:** build passes; `grep -rn "req.headers\|req.body" src/ | grep console` returns nothing.

---

## 🔵 A-4 · Fix the CORS ordering
**Repo:** `api` · **Agent:** Claude · **Mode:** Plan first

```
/security-fix A-4

Before editing: list every origin the live site is actually reachable from. I need you to check
whether leo-leo-hessen.com works without the www prefix, and to account for any Render preview
URL. Getting this list wrong takes the live site down with opaque browser errors, so give me the
list to confirm before you change anything.
```

**Changes:** `src/server/middleware/index.js` (remove `cors()` + import), allowlist extended in
`src/server/index.js`.
**Works if:** the live frontend still loads school and document data with no console CORS errors.

---

## 🔵 A-6 · Rate limiting
**Repo:** `api` · **Agent:** Claude · **Mode:** Plan first

```
/security-fix A-6

Important: DigitalOcean puts a proxy in front of this app, so without `app.set('trust proxy', ...)`
every request appears to come from one IP and the limiter will lock out all schools at once during
registration. Work out the correct trust proxy setting and tell me how to verify it BEFORE the
limiter goes live. A wrong setting here is worse than no rate limiting.
```

**Changes:** `package.json` (+express-rate-limit), `src/server/index.js`, `src/server/auth/routes.js`.
**Works if:** 6 rapid failed logins → 429; a normal registration still succeeds; two different
devices are limited independently.

---

## 👤 H-2 · Protect both master branches — 10 minutes, GitHub UI
Settings → Rules → New ruleset, target `master`, on both repos: require a PR, block force pushes
and deletion. Add the status check once CI exists (A-10 / S-6).

---

# WEEK 2 — Safety net

## 🟢 S-6 · Split the test script and add CI
**Repo:** `leo-react` · **Agent:** OpenCode · **Mode:** Edit

```
Read AGENTS.md and docs/TASKS.md task S-6.

1. In package.json replace the "test" script. It currently is:
     "test": "eslint src && react-app-rewired test --watch --env=jsdom --coverage"
   The --watch flag never exits, so it can never run in CI. Replace with three scripts:
     "lint":       "eslint src"
     "test":       "react-app-rewired test --env=jsdom --watchAll=false"
     "test:watch": "react-app-rewired test --env=jsdom --watch"

2. Create .github/workflows/ci.yml that runs on pull_request to development and master:
   checkout, setup-node with node 18, `yarn install --frozen-lockfile`, `yarn lint`, `yarn build`.
   Do NOT add a test step — the existing Enzyme tests may not pass and would block every PR.
   Add a comment in the YAML saying tests are intentionally excluded until Phase 2 (task M-2).

Change nothing else. Branch: chore/S-6-ci
Verify `yarn lint` and `yarn build` both pass locally before reporting.
```

**Changes:** `package.json`, new `.github/workflows/ci.yml`.
**Works if:** a PR shows a green check; a PR with a deliberate lint error shows red.

---

## 🟢 A-10 · Same for the API
**Repo:** `api` · **Agent:** OpenCode · **Mode:** Edit

```
Read AGENTS.md and docs/TASKS.md task A-10.

Create .github/workflows/ci.yml running on pull_request to development and master:
checkout, setup-node node 18, `yarn install --frozen-lockfile`, `yarn eslint`, `yarn prod:build`.

Do NOT add `yarn test` — the existing Jest tests cover the dormant blog product and may not pass.
Add a YAML comment saying so.

Note: `yarn eslint` also runs `flow`. If flow fails in CI, split the script so CI runs only
`eslint src` and tell me what flow reported.

Also delete the contents of .travis.yml and replace with a single comment line saying Travis is
retired and CI now lives in .github/workflows/ci.yml. (You cannot delete files — leave it empty
with that comment and I will remove it.)

Branch: chore/A-10-ci
```

---

## 🟢 S-10 + A-11 · Sentry, both repos
**Agent:** OpenCode · **Mode:** Edit · Run as two sessions, one per repo.

**`leo-react`:**
```
Read AGENTS.md and docs/TASKS.md task S-10.

Add @sentry/react. Initialise it in src/index.js BEFORE ReactDOM.render, with:

  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    enabled: Boolean(process.env.REACT_APP_SENTRY_DSN),
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      if (event.request) { delete event.request.data; delete event.request.cookies }
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.filter((b) => b.category !== 'ui.input')
      }
      return event
    },
  })

The PII scrubbing is mandatory and must be exactly as written — this app handles German teachers'
names, emails and phone numbers, and they must never reach Sentry.

Do not wrap anything in an ErrorBoundary yet. Do not add tracing or session replay.
Document REACT_APP_SENTRY_DSN in docs/DEPLOYMENT.md's env var table.

Branch: chore/S-10-sentry
```

**`api`:** same prompt, but `@sentry/node`, initialised at the very top of `src/index.js`, env var
`SENTRY_DSN`, and the `beforeSend` must delete `event.request.data` (registration payloads contain
PII). Document it in `docs/DEPLOYMENT.md`.

---

## 👤 H-3 · Staging + backups — dashboards, ~half a day
- Render: a second service tracking `development`, pointed at the staging API.
- DigitalOcean: a second app tracking `development`, pointed at a **copy** of the Atlas database.
- Atlas: confirm backups are on, then **restore one into a scratch db and confirm the data is
  there.** An untested backup is not a backup.
- Add all URLs to both `docs/DEPLOYMENT.md` files and fill in the `VERIFY` markers while you're in
  the dashboards.
- Give the staging origins to Claude for A-4's allowlist.

---

## 🟢 S-11 + A-13 · Real READMEs
**Agent:** OpenCode · **Mode:** Edit · One session per repo.

```
Replace README.md entirely.

The current one is boilerplate (Create React App template / a blank Bitbucket template).

Write a new one, at most 80 lines, covering: what this project is and who the client is, the live
URL, the stack in one short table, how to run it locally, the environment variables by name (names
only, never values), the seasonal freeze calendar, and a links section pointing to each file in
docs/ with a one-line description.

Draw every fact from AGENTS.md and docs/ — do not invent anything. If you are unsure of a fact,
write VERIFY next to it rather than guessing.

Branch: docs/readme
```

---

# WEEK 3 — Content update

## 🔵 Content update for the new edition
**Repo:** `leo-react` · **Agent:** Claude · **Mode:** Plan first, then Edit

Do this **after** you have added the new edition to MongoDB, and **after** CI exists.

```
/content-update 2027
```

*(substitute the actual edition year)*

**Changes:** `views/Lectura.jsx`, `views/Bases.jsx`, `utils/dictionary.js`,
`components/Register.jsx`, `components/AdminList.jsx`, `components/ImageGallery.jsx`,
plus files in `assets/docus/`.
**Works if:** you personally click through the step-8 checklist in the runbook, including audio
downloads on an iPhone.

This one stays with Claude. It is the deliverable the client actually sees, it touches six files
plus the database, and the main failure mode is silent — the page renders empty rather than erroring.

---

# WEEKS 4–5 — Off-season-only work

Everything below is 🟢 **off-season only**. It must be merged and verified **before October**, or
it waits until May. If week 5 arrives and something here is half-done, stop and revert it.

## 🔵 Q-2 · Make the reading-texts page data-driven
**Repo:** `leo-react` · **Agent:** Claude · **Mode:** Plan first

```
Read AGENTS.md, docs/TASKS.md task Q-2, and docs/ANNUAL-CONTENT-UPDATE.md step 3.

Make views/Lectura.jsx render the most recent year present in the API response instead of the
hardcoded `d.year === 2025`. Handle the empty-response case with a visible message rather than
rendering nothing.

Also decide what to do with the hardcoded `d.year === 2024` narrator-credits block and tell me
your recommendation before implementing it.

This is the change that stops the content update needing a code edit every year, so get the
edge cases right: no documents at all, documents with no year, a year with no projects.
```

**Works if:** adding a new year to `leo_documents` makes it appear with **no code change**.

---

## 🟢 Q-1 · Fix the AdminList year default
**Repo:** `leo-react` · **Agent:** OpenCode · **Mode:** Edit

```
Read AGENTS.md and docs/TASKS.md task Q-1.

In src/components/AdminList.jsx the initial state has:  year: 2026 || 2025
The `||` does nothing — this always evaluates to 2026.

Replace it with a call to getNextEditionYear() from src/utils/helpers.js (import it).
Do not change any other logic in the file, including handleFilter and the unite() function.

Branch: fix/Q-1-adminlist-year
Run `npx eslint src` and `yarn build` before reporting.

Then tell me: what value does getNextEditionYear() return today, and is that the edition the
admins should see when they open the panel?
```

**Works if:** the admin panel opens on the current edition and the list is not empty.

---

## 🟢 Q-3 · Remove production console.logs
**Repo:** `leo-react` · **Agent:** OpenCode · **Mode:** Edit

```
Read AGENTS.md.

Run `grep -rn "console.log" src/` and remove every one, EXCEPT do not touch
src/utils/dictionary.js (it is eslint-ignored and must not be modified at all).

Keep console.error calls that report a real failure. Remove console.error calls that are
just debugging noise — in src/utils/errorHandler.js, showFormErrors logs
'Please check this checkbox' twice, which is not an error, only a validation state.

Change nothing else. Do not refactor surrounding code.

Branch: chore/Q-3-remove-console-logs
Run `npx eslint src` and `yarn build` before reporting.
```

---

## 🟢 Q-4 · Registration toggle out of source
**Repo:** `leo-react` · **Agent:** OpenCode · **Mode:** Edit · **then Claude `/preflight`**

```
Read AGENTS.md and docs/TASKS.md task Q-4.

In src/components/Register.jsx, `const FORM_INPUTS_DISABLED = true` currently means opening
registration each October requires a code change.

Replace it with:
  const FORM_INPUTS_DISABLED = process.env.REACT_APP_REGISTRATION_OPEN !== 'true'

so registration is CLOSED unless the env var is explicitly 'true'. Failing closed is deliberate —
a missing variable must never silently open registration out of season.

Also remove the `console.log({ FORM_INPUTS_DISABLED })` in render().

Do not change the form fields, the validation, handleData, or handlePost. This is the single most
important component in the app.

Add REACT_APP_REGISTRATION_OPEN to docs/DEPLOYMENT.md's env var table, noting that changing it
requires a redeploy because CRA inlines env vars at build time.

Branch: feat/Q-4-registration-env-toggle
Run `npx eslint src` and `yarn build` before reporting.
```

Then, in **Claude**: `/preflight` — this one touches the registration form, so it gets a second pair
of eyes before merge.

---

## 🔵 S-9 · Retire the service worker
**Repo:** `leo-react` · **Agent:** Claude · **Mode:** Plan first

```
Read AGENTS.md and docs/TASKS.md task S-9.

Remove the Create React App v1 service worker, but plan carefully: teachers already have the old
worker installed and it is cache-first, so simply deleting the registration call leaves them
served a stale bundle forever. An unregister shim is needed.

Plan it first and tell me how I can verify the fix works for someone who ALREADY has the old
worker installed — that verification method is the part I actually need from you.
```

**Do this one last** in the off-season window, and give it a week of live soak before October.

---

## 👤 H-4 · One question for the client
Ask Celia whether the school-edit feature in the admin panel is wanted. Today the button opens a
modal containing the literal text `MODAL CONTENT UPDATE SCHOOL` (task Q-5).

- If **no** → OpenCode removes the button and the modal, 20 minutes.
- If **yes** → it is a Phase 4 feature and needs a spec of which fields are editable.

Do not guess. Ask.

---

# Token budget notes

Claude sessions in this plan: **7** (A-1, A-2, A-4, A-6, Q-2, S-9, content update), plus one
`/preflight` on Q-4. Everything else is OpenCode or you.

If you need to cut further, in order of what is safest to hand down:

1. **A-6** (rate limiting) → OpenCode, *only* if you first confirm the trust-proxy setting
   yourself and paste it into the prompt.
2. **S-9** (service worker) → defer entirely to May. It is a nuisance, not a risk.

Do **not** hand down A-1, A-2, or the content update. A-2 is the actual vulnerability, A-1 is the
GDPR exposure, and the content update is the one the client sees.

If you run out of Claude budget mid-week: stop after Week 1. Phase 0 alone leaves the project in a
meaningfully better state than it is today, and everything after it is improvement rather than
repair.
