# STATUS — where we are, where to pick up

**Last updated:** 17 August 2026
**This file is identical in both repos** (`api` and `leo-react`) — the work is cross-repo.
**Read this first**, then `AGENTS.md`, then `docs/TASKS.md`.

---

## 1. Headline

**Every security finding from the August 2026 audit is closed and deployed.** So is the safety-net
work that was scheduled for "Week 2": backups, a tested restore, a staging database, and CI.

Three problems found along the way were never in the audit at all — a production build that would
have failed on DigitalOcean's next unattended redeploy, a service worker that had been pinning
returning visitors to old builds for years, and local development silently writing to the
production database.

---

## 2. Current state

Both repos: all work merged and deployed. No open branches.

| | api | leo-react |
|---|---|---|
| Host | DigitalOcean App Platform (`api-crix`) | Render (static site `leo-react`) |
| Deploys from | `master`, autodeploy **on** | `master`, autodeploy **on** |
| Live URL | https://www.api-crix.com | https://www.leo-leo-hessen.com |
| Other domains | — | `leo-leo-hessen.com`, `leo-react.onrender.com` |
| Node | pinned `22.x` (`.nvmrc` + `engines`) | **not yet pinned** (task S-6) |
| CI | ✅ build on push to development/master | **none yet** (task S-6) |

**Databases (MongoDB Atlas, org `CriX`):**

| | Project | Cluster | Used by |
|---|---|---|---|
| Production | `api_production` | `api` (M0 free) | DigitalOcean, via `MONGODB_URI` |
| Staging | `api_development` | `api-staging` (M0 free, Frankfurt) | local dev, via `MONGODB_DEV` |

⚠️ **Pushing `master` in either repo deploys immediately.** Workflow: work on a branch → merge to
`development` → push → **wait for the green CI tick** → merge to `master` → push (this deploys).

---

## 3. Completed and verified in production

### Security — all closed

| Task | What it fixed |
|---|---|
| **A-1** | **Teachers' PII on a public endpoint.** `GET /schools` now `.select('name address year')`; new `GET /schools/all` behind auth serves the admin panel. The public `POST /schools` response was leaking the full list too — also fixed. |
| **A-2** | **Authentication bypass** (CVE-2020-15084). `express-jwt` 5.3.3 → 8, explicit `algorithms: ['HS256']`, `req.user` → `req.auth`. |
| **A-3** | `POST`/`PUT` on `/api/leo/images` now require auth. |
| **A-4** | **CORS allowlist activated** — the permissive `cors()` was shadowing it. All three domains listed, and `access-token` added to `allowedHeaders` (without it the admin panel would have broken everywhere). |
| **A-5** | Removed four `console.log` calls printing school records and `req.body` into logs. |
| **A-6** | Rate limiting: auth 10 failures/15 min (successes skipped), registration 20/hour, keyed on `cf-connecting-ip`. |
| **A-0c** | Removed hardcoded Google OAuth credentials and the dead `setMail`. Credentials independently confirmed already revoked. |

### Infrastructure

| Task | What it fixed |
|---|---|
| **A-17** | **Build was a time bomb** — unpinned `yarn add @babel/preset-env` pulled Babel 8 (needs Node ≥22.18) and mutated `package.json`. Babel moved to `dependencies`, `yarn add` removed. |
| **A-18** | `yarn eslint` crashed on untouched code (`eslint-plugin-flowtype` vs eslint 8 exports). Plugin removed, script split. |
| **A-20** | **Local dev connected to production.** `mongoose.js` read `MONGODB_URI` unconditionally and nothing read `MONGODB_DEV`. Now environment-aware, and logs which variable it used. |
| **A-12** | **Backups.** M0 free tier has none. `yarn backup` dumps all four leo collections to JSON; `yarn restore <folder> --confirm` restores them, with four safety guards including a hard refusal to target production. Verified end to end: 337/7/169/3 restored with `year` and `items[].audio` intact. |
| **A-9** | **Staging exists.** `api-staging` cluster in `api_development`, populated from a real backup. Local dev points at it. |
| **A-10** | **CI.** Build on every push to `development`/`master`. Node pinned to `22.x` via `.nvmrc` + `engines`. Travis config deleted. |
| **S-9** | **The service worker. See below.** |
| **Q-9** | `Colegios.jsx` empty state — the length check tested the unfiltered array, so past-year schools with none upcoming rendered an empty list with no message. Now filters first, shows a loader. |
| — | `Item.jsx` guard: `(item.category \|\| []).join(', ')`. A missing field no longer white-screens the admin panel. |

**Also:** DigitalOcean alert policies (Failed Deployment, Failed Domain, CPU >80%, RAM >85%, all
email); GitHub↔DigitalOcean connection repaired; `api/docs/DEPLOYMENT.md` rewritten from verified
dashboard facts.

### S-9 — the years-old mystery, solved

`public/service-worker.js` cached `index.html` under a cache name that never changed, served it
**cache-first**, and — being a static file — never triggered a worker update. Returning visitors
were **permanently frozen on the build they first loaded**.

That is why deploys were historically invisible to the organisers until they cleared their cache,
and why the API grew a `Cache-Control: no-store` middleware trying to fight the symptom from the
backend. It also caused a live white-screen: after A-1, a stale bundle called the old `/schools`
endpoint, got records without `category`, and `Item.jsx` threw on `undefined.join`.

Fixed with a self-destructing worker that clears all caches and unregisters itself. Verified on a
pinned browser (Edge: worker gone, caches empty) and a clean one.

**Deploys now reach returning users automatically.** Without this, next month's content update
would not have reached returning teachers at all.

---

## 4. Pick up here

| Task | Agent | Note |
|---|---|---|
| **S-6** CI for `leo-react` | OpenCode | Same as A-10, plus: split the `test` script — it has `--watch`, so it can never terminate in CI. Pin Node `22.x` + `.nvmrc` there too. |
| **A-11 / S-10** Sentry | OpenCode | Still zero visibility into runtime errors. Exact `beforeSend` PII scrubber is in the task. |
| **A-19** `config/production.js` | OpenCode | Has never loaded — two undeclared Babel 6 requires throw and a `catch` swallows it. |
| **A-13 / S-11** READMEs | OpenCode | Both still boilerplate. |
| **Access review** | you | `txiverke` (the original developer) still has an Atlas database user on `api_development`. Check whether he also has one on `api_production`, and whether he should. |
| **Check prod IP list** | you | `api_development` allows `0.0.0.0/0`. Look at `api_production` too — but **read only**: App Platform has no stable egress IP, so it may be a genuine constraint rather than an oversight. Document it either way. |

Then if time allows before October: **Q-2** (`Lectura.jsx` data-driven year — the biggest reduction
in annual manual work), **Q-1** (AdminList hardcoded year), **Q-3** (production console.logs),
**Q-4** (registration toggle out of source).

---

## 5. Next: the content update

New texts, bases and dates arrive shortly. **Follow `leo-react/docs/ANNUAL-CONTENT-UPDATE.md`
exactly** — it is ordered by dependency, and the MongoDB entry must exist before the frontend change.

**Agent: Claude** (`/content-update <year>`). Six files plus MongoDB, and the main failure mode is
silent: `Lectura.jsx` filters on a hardcoded year, so new texts simply do not appear.

Run `yarn backup` before starting.

---

## 6. Hard-won lessons — details in `AGENTS.md`

1. **OpenCode runs in Linux; these repos are developed on Windows.** Never let it run
   `yarn install` / `yarn add` — POSIX symlinks with no `.cmd` shims, and Linux binaries for native
   modules (`bcrypt` → *"not a valid Win32 application"*). Recovery:
   `rmdir /s /q node_modules && yarn install` from Windows. If a dependency is needed, install it
   **yourself first**, then let the agent write the code.
2. **OpenCode's environment runs Node 20**, and `engines` is now pinned to `22.x`, so yarn refuses
   its commands without `YARN_IGNORE_ENGINES=1`. That is the pin working, not a fault.
3. **Agents do not reliably commit.** Check `git status --short` (empty) and `git log --oneline -1`
   (your commit) before switching branches.
4. **Say "apply immediately, do not stop at a plan"** unless you want a plan.
5. **Verify the diff, then test.** In that order. On 16 Aug a write test ran before the fix that
   would have blocked it, and put a junk record into live data.
6. **CORS and service-worker failures are browser-side only.** curl will not see them — use a real
   browser with the console open, and for cache issues one that already has the old state.
7. **We do not use pull requests.** CI triggers on `push`. The green tick on `development` is the
   gate before merging to `master`.

---

## 7. Known pre-existing bugs — logged, not fixed

- **Q-1** — `AdminList.jsx` has `year: 2026 || 2025`; the `||` does nothing.
- **Q-6** — Excel export "Categorías" column always empty. `ExcelExport.jsx` uses
  `value="categories"`; the schema field is `category`.
- **Q-7** — `utils/API.js` detects 401 via `promise.statusText === 'Unauthorized'`, often an empty
  string behind Cloudflare/HTTP2.
- **Q-8** — "Enviar correo a todos" puts every school's address in `To:`, so every recipient sees
  all the others. `mailto:?bcc=...` would fix it. **Ask Celia first** — she may want it that way.
- 87 eslint errors on untouched code, mostly Flow parse failures (no Flow-aware parser configured).
  This is why CI does not lint. Resolved by A-15 (retire Flow) or by configuring a parser.
- `created` timestamps on old MongoDB documents show today's date — Mongoose applies the schema
  default at read time for documents that never stored the field. Cosmetic.

---

## 8. Season calendar — the rule that governs everything

| Window | Status |
|---|---|
| **Now → end September** | 🟢 off-season — breaking changes allowed |
| **October → April/May** | 🔴 **FROZEN** — security fixes and content only |
| **May → September 2027** | 🟢 off-season — Phase 2 (Vite, React 19) |

Registration opens in October.
