# STATUS — where we are, where to pick up

**Last updated:** 17 August 2026
**This file is identical in both repos** (`api` and `leo-react`) — the work is cross-repo.
**Read this first**, then `AGENTS.md`, then `docs/TASKS.md`.

---

## 1. Headline

**Every security finding from the August 2026 audit is closed and deployed.**
Plus two problems that were not in the audit at all: a production build that would have failed on
DigitalOcean's next unattended redeploy, and a service worker that had been permanently pinning
returning visitors to old builds for years.

---

## 2. Current state

Both repos: all work merged to `master` and deployed. No open branches, no uncommitted work.

| | api | leo-react |
|---|---|---|
| Host | DigitalOcean App Platform (`api-crix`) | Render (static site `leo-react`) |
| Deploys from | `master`, autodeploy **on** | `master`, autodeploy **on** |
| Live URL | https://www.api-crix.com | https://www.leo-leo-hessen.com |
| Other domains | — | `leo-leo-hessen.com`, `leo-react.onrender.com` |

⚠️ **Pushing `master` in either repo deploys immediately.** No staging exists (task A-9).
Work on `development`; merge to `master` only when you intend to deploy.

---

## 3. Completed and verified in production

### Security — all closed

| Task | What it fixed |
|---|---|
| **A-1** | **Teachers' PII on a public endpoint.** `GET /schools` now `.select('name address year')`; new `GET /schools/all` behind auth serves the admin panel. The public `POST /schools` response was leaking the full list too — also fixed. |
| **A-2** | **Authentication bypass** (CVE-2020-15084). `express-jwt` 5.3.3 → 8, explicit `algorithms: ['HS256']`, `req.user` → `req.auth`. |
| **A-3** | `POST`/`PUT` on `/api/leo/images` now require auth. `GET` stays public. |
| **A-4** | **CORS allowlist activated.** The permissive `cors()` in `middleware/index.js` was shadowing it. Origins extended to all three real domains, and `access-token` added to `allowedHeaders` — without that the admin panel would have broken completely on every domain. |
| **A-5** | Removed four `console.log` calls printing school records and `req.body` into server logs. |
| **A-6** | Rate limiting. Auth: 10 failures / 15 min (successes skipped). Registration: 20 / hour. Keyed on `cf-connecting-ip` because Cloudflare fronts App Platform. |
| **A-0c** | Removed hardcoded Google OAuth credentials and the dead `setMail` function. Credentials independently confirmed **already revoked** (`invalid_grant`). |

### Infrastructure and robustness

| Task | What it fixed |
|---|---|
| **A-17** | **Production build was a time bomb.** `prod:build` ran an unpinned `yarn add @babel/preset-env`, which now pulls Babel 8 (needs Node ≥22.18) and mutates `package.json`. Babel packages moved to `dependencies`, `yarn add` removed. |
| **A-18** | `yarn eslint` crashed on untouched code (`eslint-plugin-flowtype` requiring an eslint subpath v8 does not export). Plugin removed, script split into `lint` and `flow`. |
| **S-9** | **The service worker. See below — this was the big one.** |
| **Q-9** | `Colegios.jsx` empty state: the length check tested the unfiltered array, so with past-year schools and none for the upcoming edition the page rendered an empty list with no message. Now filters first and shows a loader. |
| — | `Item.jsx` defensive guard: `(item.category \|\| []).join(', ')`. A missing field no longer white-screens the whole admin panel. |

**Also done:** DigitalOcean alert policies (Failed Deployment, Failed Domain, CPU >80%, RAM >85%,
all email); GitHub↔DigitalOcean connection repaired; `api/docs/DEPLOYMENT.md` rewritten from
verified dashboard facts.

### S-9 — the years-old mystery, solved

`public/service-worker.js` cached `index.html` under a cache name that never changed, served it
**cache-first**, and — because the file itself was static — the browser's update check never found
a difference, so the worker never updated. Returning visitors were **permanently frozen on the
build they first loaded**.

This is why deploys were historically invisible to the organisers until they manually cleared
their cache, and why the API grew a `Cache-Control: no-store` middleware (commits `b95296e`,
`33b0d80`) trying to fight the symptom from the backend.

It also caused a live white-screen: after A-1, a stale bundle called the old `/schools` endpoint,
got records without `category`, and `Item.jsx` threw on `undefined.join`.

**Fixed** with a self-destructing worker that clears all caches and unregisters itself. Because the
file contents differ, browsers install it on their next update check. Verified on a pinned browser
(Edge, worker gone, caches empty) and a clean one (Chrome, worker "deleted / redundant").

**Deploys now reach returning users automatically.** The API's `no-store` middleware can eventually
be relaxed, but it is harmless — leave it for now.

---

## 4. Pick up here — the safety net (Week 2)

None of this blocks the content update. It is what makes the October–April freeze survivable:
right now, if something breaks during registration, you find out from an email from a teacher.

| Task | Agent | Note |
|---|---|---|
| **A-12** verify backups | you | Confirm Atlas backups exist **and restore one into a scratch DB**. Untested backup ≠ backup. Highest value per minute here. |
| **A-9** staging | you | An unused **`api_development`** project already exists in Atlas. Also fixes the "local dev writes to production" trap. |
| **A-10 / S-6** CI | OpenCode | Unblocked — A-18 fixed `yarn lint`. Lint + build on PR. Do **not** gate on tests yet. |
| **A-11 / S-10** Sentry | OpenCode | Exact `beforeSend` PII scrubber specified in the task. Currently zero visibility into runtime errors. |
| Pin Node to `22.x` | OpenCode | `engines` allows 18 and 20, both EOL. Both hosts honour `engines`. Local Node is 22.17.0. |
| **A-13 / S-11** READMEs | OpenCode | Both still boilerplate. |
| **A-19** `config/production.js` | OpenCode | Has never loaded — two undeclared Babel 6 requires throw and are swallowed by a `catch`. Detail in `api/docs/TASKS.md`. |

Then, if time allows before October: **Q-1** (AdminList hardcoded year), **Q-2** (`Lectura.jsx`
data-driven year — the biggest reduction in annual manual work), **Q-3** (production console.logs),
**Q-4** (registration toggle out of source).

---

## 5. Next week: the content update

New texts, bases and dates arrive. **Follow `leo-react/docs/ANNUAL-CONTENT-UPDATE.md` exactly** —
it is ordered by dependency, and the MongoDB entry must exist before the frontend change.

**Agent: Claude** (`/content-update <year>`). Six files plus MongoDB, and the main failure mode is
silent: `Lectura.jsx` filters on a hardcoded year, so new texts simply do not appear.

Good news: with S-9 fixed, the update will actually reach returning teachers. Before this week it
would not have.

---

## 6. Hard-won lessons — details in `AGENTS.md`

1. **OpenCode runs in Linux; these repos are developed on Windows.** Never let it run
   `yarn install` / `yarn add` — POSIX symlinks with no `.cmd` shims, and Linux binaries for
   native modules (`bcrypt` → *"not a valid Win32 application"*). Recovery:
   `rmdir /s /q node_modules && yarn install` from Windows. If a dependency is needed, install it
   **yourself first**, then let the agent write the code.
2. **Agents do not reliably commit.** Check `git status --short` (empty) and `git log --oneline -1`
   (your commit) before switching branches.
3. **Say "apply immediately, do not stop at a plan"** unless you want a plan.
4. **Local dev connects to the PRODUCTION database.** Never run a write test locally until the code
   blocking that write is confirmed applied. On 16 Aug a `POST /images` test ran before the fix
   landed and wrote a junk record into live `leo_images`.
5. **Verify the diff, then test.** In that order.
6. **CORS and service-worker failures are browser-side only.** curl will not see them — test in a
   real browser with the console open, and for cache issues test in a browser that already has the
   old state.

---

## 7. Known pre-existing bugs — logged, not fixed

- **Q-1** — `AdminList.jsx` has `year: 2026 || 2025`; the `||` does nothing. Admin list defaults to
  2026 regardless.
- **Q-6** — Excel export "Categorías" column always empty. `ExcelExport.jsx` uses
  `value="categories"`; the schema field is `category`.
- **Q-7** — `utils/API.js` detects 401 via `promise.statusText === 'Unauthorized'`, often an empty
  string behind Cloudflare/HTTP2.
- **Q-8** — "Enviar correo a todos" puts every school's address in `To:`, so every recipient sees
  all the others. `mailto:?bcc=...` would fix it. **Ask Celia first** — she may want it that way.
- `created` timestamps on old MongoDB documents show today's date. Mongoose applies the schema
  default at read time for documents that never stored the field. Cosmetic.

---

## 8. Season calendar — the rule that governs everything

| Window | Status |
|---|---|
| **Now → end September** | 🟢 off-season — breaking changes allowed |
| **October → April/May** | 🔴 **FROZEN** — security fixes and content only |
| **May → September 2027** | 🟢 off-season — Phase 2 (Vite, React 19) |

Registration opens in October. Section 4 should land before then.
