# Import Gallery Images from Google Drive

Runbook for importing a PUBLIC Google Drive folder of photos into the `leo_images`
collection (the photo gallery served by the leo frontend).

## Prerequisites

`.env` must already contain (never print or commit these):

| Variable | Purpose |
|---|---|
| `GOOGLE_DRIVE_API_KEY` | Drive API key — public-folder access only, no service account |
| `MONGODB_DEV` | Staging cluster (`api-staging`, project `api_development`) — default target |
| `MONGODB_URI` | Production cluster (`api` — DigitalOcean) — only used with `--env prod` |

The Drive folder must be **public** (anyone with the link can view). The Gallery page also
expects the image to be reachable via the public `lh3.googleusercontent.com` CDN URL that this
script constructs (`https://lh3.googleusercontent.com/d/{FILE_ID}`), which is only true for a
public folder.

## Command

Run via babel-node (matches the other scripts):

```bash
node scripts/import-drive-images.js \
  --folder "<DRIVE_FOLDER_URL_OR_ID>" \
  --year <N> \
  [--env dev|prod] [--dry-run] [--limit N]
```

Arguments:

| Flag | Meaning |
|---|---|
| `--folder` | The Drive folder URL (`https://drive.google.com/drive/folders/<ID>`) or the bare folder id. |
| `--year` | The gallery year stamped on every inserted image (required). |
| `--env` | `dev` (default, writes to `MONGODB_DEV`) or `prod` (writes to `MONGODB_URI`). |
| `--dry-run` | Lists files, detects dimensions and reports what *would* be inserted, without writing. |
| `--limit N` | Process at most N images (recommended for a first safe run). |

### 1. Staging first (default)

Back up staging, then dry-run, then a limited write, then the full write:

```bash
# back up staging before any write (backup.js targets production; for staging pass the
# staging connection string inline, or back up production separately — see AGENTS.md)
mongosh "$MONGODB_DEV" --quiet --eval 'db.leo_images.find().count()'

# safe preview — no writes
node scripts/import-drive-images.js --folder "<URL>" --year 2026 --dry-run

# first real write, capped
node scripts/import-drive-images.js --folder "<URL>" --year 2026 --limit 10

# full staging import
node scripts/import-drive-images.js --folder "<URL>" --year 2026
```

Verify on staging before touching production — the frontend filters the gallery by year, so a
new year only shows once those records exist.

### 2. Production (explicit, with operator go-ahead)

Production is reached **only** with `--env prod`:

```bash
node scripts/import-drive-images.js --folder "<URL>" --year 2026 --env prod --dry-run
node scripts/import-drive-images.js --folder "<URL>" --year 2026 --env prod
```

Selecting `--env prod` prints which host you are about to write to and asks you to type
`confirm` before writing anything. Run `yarn backup` before this step.

## What the script does

1. Extracts the folder id from the `--folder` URL or id.
2. Uses the Drive API v3 (API key only — no OAuth/service account) to `files.list` the folder,
   paginating with `pageToken` until done.
3. Keeps only image MIME types (`image/jpeg|png|webp|gif|heic|bmp`); skips subfolders and
   non-images.
4. Builds each `src` as `https://lh3.googleusercontent.com/d/{FILE_ID}`.
5. Detects `width`/`height` with a **pure-JS header parser** (no native decoding libraries):
   PNG IHDR, JPEG SOF markers, GIF logical screen, WebP VP8/VP8L/VP8X, BMP BITMAPINFOHEADER.
   Bytes come from the Drive API `files.get(alt:'media')`, falling back to the public
   `lh3.googleusercontent.com` URL if that fails.
6. Validates the final `src` returns HTTP 200 before inserting; skips failures with a reason.
   HEIC files are recognised but have no pure-JS parser, so they always skip — convert them to
   JPEG/PNG/WebP if you must import them.
7. Inserts each as `{ src, width, height, year, caption: '' }`, guarded against duplicates via
   `findOneAndUpdate(..., { $setOnInsert, upsert: true })` — reruns are idempotent.
8. Logs per-file results and a final count summary, and keeps going on individual errors.

## Serving the images — why dev blanks but prod works

The script stores `src` URLs of the form `https://lh3.googleusercontent.com/d/{FILE_ID}`.
Those are correct for production and must not change.

**Confirmed root cause:** Google throttles `lh3.googleusercontent.com` with **HTTP 429
(text/html)** when the request carries a non-production `Referer` such as `http://localhost:3000`.
Production works because it sends the live-domain `Referer`
(`https://www.leo-leo-hessen.com`).

**Effect:** the gallery images render in production but are blank in local/dev — for **all**
years, and throttling is intermittent, so *which* images go blank changes on every refresh.

**Fix (lives in `leo-react`):** the gallery `<img>` elements must set
`referrerpolicy="no-referrer"` so the browser sends no `Referer`; Google then serves the images
(verified: the same IDs that returned 429 return 200 `image/jpeg` with no `Referer`). No
migration and no URL-scheme change are required — the existing `lh3` URLs remain correct.

> Reminder: production is unaffected by the dev-only throttling; this is a client-side,
> leo-react change only.

## No new dependencies

This is a standalone script using only dependencies already in `package.json`
(`dotenv`, `mongoose`, `googleapis`) and Node's built-in `fetch`. Do **not** run
`yarn install` / `yarn add` for it, and do not introduce `axios` or `sharp` (the health needs
this to keep working on Windows, where OpenCode must never run package installs).

## Safety notes

- Default connection is **staging** (`MONGODB_DEV`). Production requires `--env prod`.
- The production branch pauses and asks the operator to type `confirm`.
- Never print or commit `GOOGLE_DRIVE_API_KEY`, connection strings, or secrets.
- Public `leo_images` records are not personal data, but keep PII out of the `caption` field.

## Related

The full annual content update (texts, bases, dates, documents) — including pointing the
gallery data at the new year — is in `leo-react/docs/ANNUAL-CONTENT-UPDATE.md`.
