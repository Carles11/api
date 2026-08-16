# Roadmap — api

**Goal:** keep the live contest running. Nothing should break because an obsolete part gave out.
Not a rewrite.

See the frontend repo's `docs/ROADMAP.md` for the whole-system view — the two move together.

## The calendar

| Window | Status | Work |
|---|---|---|
| **Now → end of September** | 🟢 last of the off-season | Phase 0 + Phase 1 |
| **October → April/May** | 🔴 frozen | Security hotfixes only |
| **May → September (next year)** | 🟢 off-season | Phase 2 |

The correction worth stating plainly: **the off-season is now.** Registration runs October to
April/May, so the safe window is May–September — and it is August. Roughly **six weeks** remain
before the door closes for nine months.

That is enough time for Phase 0 and Phase 1, which is the right scope. Phase 2 is deliberately
held back to May rather than half-finished when registration opens.

---

## Phase 0 — Security · 1–2 days · **now**

Most of the system's real risk lives in this repo. All of it is server-side, none of it touches
the UI, and every item is a small independent change.

`A-0` revoke leaked Google credentials · `A-1` close the public PII endpoint ·
`A-2` fix the express-jwt auth bypass · `A-3` auth on image writes · `A-4` fix the CORS ordering ·
`A-5` stop logging tokens · `A-6` rate limiting

Details in `docs/SECURITY.md`, acceptance criteria in `docs/TASKS.md`.

Order matters slightly: do **A-0 first** (it is the only irreversible leak), then **A-1** (it is
the ongoing GDPR exposure), then **A-2** (the highest-severity code defect).

## Phase 1 — Safety net · 2–3 days · before October

`A-9` staging · `A-10` CI · `A-11` Sentry · `A-12` verified Atlas backup · `A-13` real README

This is what makes the frozen season survivable. Right now, if something breaks during
registration, you would find out from an email from a teacher — and you would fix it by editing
production directly. Each of these five removes one part of that.

`A-12` matters more than it looks. There is no tested restore path for a database holding several
years of registrations.

## 🔴 October → April/May — FREEZE

Security fixes only. Everything else waits.

If a fix must ship during the freeze: through staging first, on a Tuesday morning, not in the week
of a deadline, and with the smoke-test list from `docs/DEPLOYMENT.md` run manually afterwards.

## Phase 2 — Cleanup · 🟢 next off-season (May+)

`A-7` comment out dormant products · `A-6b` fix the broken error middleware ·
`A-8` sync the Mongoose schemas · `A-14` prune junk dependencies, add helmet ·
`A-15` retire Flow (and possibly Babel, in favour of native ESM on Node 22) ·
`A-16` consider splitting `leo` into its own service

`A-8` pairs with the frontend's Q-2. Together they are what stops the reading-texts page needing a
code change every single year.

## Deliberately not doing

- **Not deleting the dormant products.** The owner wants them retained; commenting out the route
  registrations achieves the isolation without losing the code.
- **Not rewriting in NestJS/Fastify/TypeScript.** Four collections and about a dozen endpoints. The
  current structure is clear and consistent. Effort belongs in security and reliability, not in
  a framework change.
- **Not moving off Mongo.** It fits the data and it works.
- **Not touching auth flow design** (localStorage → httpOnly cookies) beyond fixing the actual
  vulnerability. It is a two-admin panel; the redesign is not worth the coordinated two-repo risk.
