# LEO Documents — Year Rollover

Runbook for duplicating the reading-texts document pack into a new year.

## Prerequisites

- `yarn backup` completed successfully
- `MONGODB_DEV` (staging) and/or `MONGODB_URI` (production) available in `.env`
- `mongosh` available

## Steps

### 1. Backup first

```bash
yarn backup
```

### 2. Inspect current distribution

```bash
mongosh "$MONGODB_DEV" --quiet --eval '
  db.leo_documents.aggregate([{$group:{_id:"$year",n:{$sum:1}}},{$sort:{_id:-1}}])
'
```

Confirm: SOURCE_YEAR (e.g. 2025) has ≥1 doc, TARGET_YEAR (e.g. 2026) has 0.
If TARGET_YEAR already has entries, stop and ask the operator whether stacking duplicates is intended.

### 3. Duplicate with title update

```bash
mongosh "$MONGODB_DEV" --quiet --eval '
  db.leo_documents.aggregate([
    { $match: { year: SOURCE_YEAR } },
    { $set: {
        _id: ObjectId(),
        year: TARGET_YEAR,
        title: { $replaceAll: { input: "$title", find: "SOURCE_YEAR", replacement: "TARGET_YEAR" } }
      }
    },
    { $merge: { into: "leo_documents" } }
  ]);
'
```

Replace `SOURCE_YEAR` and `TARGET_YEAR` with actual values (e.g. 2025, 2026).

**Warning:** The `$replaceAll` assumes the source year appears literally in the title string.
If the title format changes in a future year, this step may need adjustment.

### 4. Verify

```bash
mongosh "$MONGODB_DEV" --quiet --eval '
  db.leo_documents.aggregate([{$group:{_id:"$year",n:{$sum:1}}},{$sort:{_id:-1}}])
  db.leo_documents.findOne({year: TARGET_YEAR}, {title:1, _id:0})
'
```

Confirm TARGET_YEAR has the expected count and the title references the new year.

### 5. Repeat on production (with operator approval)

Once staging is verified, repeat steps 1–4 against `MONGODB_URI`.

If the connection is refused (IP allowlist), run the commands on Windows against `%MONGODB_URI%`.

## What this does NOT cover

This runbook only duplicates the MongoDB document. The full annual content update
also requires frontend changes in `leo-react` — see
`leo-react/docs/ANNUAL-CONTENT-UPDATE.md` for the complete checklist.

## Schema note

`year` is not declared in `DocumentSchema` (schema drift documented in `DATA-MODEL.md`).
This works because Mongoose strict mode applies to writes, not reads. Do NOT "clean up"
the schema without confirming the frontend still receives `year` and `projects[].items[].audio`.
