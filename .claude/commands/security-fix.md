---
description: Work one security task from docs/SECURITY.md end to end
---

Work security task **$ARGUMENTS** from `docs/SECURITY.md`.

1. Read `AGENTS.md`, then `docs/SECURITY.md`, then the task's entry in `docs/TASKS.md`.
2. Read every file the task touches **before** editing, and the endpoint map in
   `docs/ARCHITECTURE.md` to see which frontend files consume what you are changing.
3. Make the smallest change that actually fixes the issue. No adjacent cleanups, no reformatting,
   no "while I'm here" refactors — these ship to a live site with no staging and no tests.
4. Create a branch off `development` named `security/$ARGUMENTS-<short-slug>`.

Then report:

- What changed, file by file, and why
- **Which frontend views break if this is wrong** (name the files in the `leo-react` repo)
- The exact manual verification steps I need to run against the live site before deploying —
  concrete clicks and curl commands, not "test the app"
- Whether the sibling `leo-react` repo needs a matching change, and which repo deploys first
- Anything you were unsure about

Do not deploy. Do not merge. Do not touch anything outside the scope of this one task.
