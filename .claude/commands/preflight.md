---
description: Pre-deploy check before this reaches the live API
---

Pre-deploy check. This API serves a live contest site with no staging environment.

Run:

```bash
yarn eslint
yarn prod:build
git diff master...HEAD
```

Then report:

1. **Seasonal check.** Today's date vs. the freeze table in `AGENTS.md`. October–April/May is
   security-fixes-only. If this is not a security fix, say so and recommend deferring.
2. **Secrets and PII.** Anything in the diff resembling a credential, a connection string, a
   token, or a route that could return `leo_schools` fields to an unauthenticated caller.
3. **Endpoint contract.** Any change to a route path, an auth requirement, or the
   `{ success, data }` response shape. For each, name the frontend files in `leo-react` that
   consume it (see `docs/ARCHITECTURE.md`).
4. **Deploy order.** Whether `leo-react` must ship before or after this.
5. **Smoke test.** The specific checks from `docs/DEPLOYMENT.md` that apply to this change.
6. **What you could not verify.**

Do not deploy. Just report.
