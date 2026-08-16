# CLAUDE.md

@AGENTS.md

---

## Claude Code specific notes

- The canonical guide is `AGENTS.md` (imported above). Keep instructions there, not here, so
  other agent tools stay in sync.
- Start by reading `docs/SECURITY.md`, then pick **one** task from `docs/TASKS.md`.
- **Check today's date against the seasonal freeze table in `AGENTS.md`.** October–April is a
  hard freeze on everything except security fixes.
- This API has no tests worth running for the `leo` product (existing Jest tests cover the dormant
  blog). Compensate with explicit manual verification steps in every PR description.
- There is no staging environment yet (task A-9). Until there is, every deploy is a production
  deploy — say so.
- When a change touches an endpoint, name the frontend files that consume it. The frontend is in
  the sibling repo `leo-react`; its `docs/ARCHITECTURE.md` maps views to endpoints.
