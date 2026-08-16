# Data model

MongoDB Atlas · org `CriX` · project `api_production` · cluster `api` · db `api`

Only the four `leo_*` collections are live. `posts`, `projects`, `users`,
`abluelemon_*`, `devpunk_members` belong to dormant products — leave them alone.

---

## `leo_schools` — registrations

Model: `src/server/api/leo/school/schoolModel.js` (mongoose model name `leo_schools`)

| Field | Type | Notes |
|---|---|---|
| `name` | String, required | School name |
| `contact` | String, required | **Contact person's name — PII** |
| `email` | String, required | **PII.** `unique` is *not* enforced (see the `@todo` in the controller: it was added after the collection already had duplicate data) |
| `phone` | String, required | **PII** |
| `address` / `cp` / `city` | String | Postal address |
| `category` | Array | Subset of `['A1','A2','B1','B2']` |
| `bases_consent` | Boolean | Accepted the contest rules |
| `image_consent` | Boolean | Photo permission |
| `interestCheckbox` | Boolean | |
| `year` | Number | Edition. Defaults to `new Date().getFullYear() + 1` — evaluated **once at module load**, so a long-running PM2 process started before New Year keeps stamping the old value. Worth pinning explicitly from the client instead. |

⚠️ **This collection is personal data under GDPR/DSGVO.** Never expose it on an unauthenticated
route without a `.select()` projection — see `docs/SECURITY.md` A-1. Never paste rows into an
issue, a log, a Sentry event, or a chat.

Retention: nobody has defined one. Rows go back years. Worth asking the client how long
registrations should be kept.

---

## `leo_documents` — reading texts and audio

Model: `src/server/api/leo/document/documentModel.js` (model name `leo_Document`)

Roughly one document per edition (7 rows as of Aug 2026: 2018–2025).

```jsonc
{
  "title": "Descargue aquí los textos y los audios de la edición de 2025.",
  "year": 2025,                       // ⚠️ NOT IN THE SCHEMA
  "projects": [                       // one per category
    {
      "title": "A1",
      "items": [
        {
          "title": "Nombre del texto",
          "url":   "https://…/texto.pdf",
          "audio": "https://…/audio.mp3"   // ⚠️ NOT IN THE SCHEMA, optional
        }
      ]
    }
  ]
}
```

**Schema drift:** `year` and `items[].audio` exist in the data and are consumed by the frontend,
but are not declared in `DocumentSchema`. This works because Mongoose's strict mode filters
*writes*, not *reads* — so `find()` still returns them. It means:

- Writing through Mongoose would **silently drop** both fields. Insert new editions via Atlas
  directly, or fix the schema first (task A-8).
- The frontend `views/Lectura.jsx` filters on `d.year`, so if the schema is ever "tidied up"
  incorrectly, the reading-texts page goes blank with no error.

Only `GET /api/leo/documents` exists — no create/update endpoint. Editions are added by hand in
Atlas. See the frontend's `docs/ANNUAL-CONTENT-UPDATE.md`.

---

## `leo_images` — photo gallery

Model: `src/server/api/leo/image/imageModel.js` (model name `leo_Image`)

| Field | Type | Notes |
|---|---|---|
| `src` | String, required, **unique** | Image URL (Cloudinary) |
| `width` / `height` | Number, required | Needed by `react-photo-gallery` for layout |
| `year` | Number, required | The frontend shows one year at a time |
| `caption` | String | |

The frontend filters to `year >= 2019` and defaults to a hardcoded year in `ImageGallery.jsx`.

⚠️ `POST` and `PUT` on this collection are currently **unauthenticated** — task A-3.

---

## `leo_users` — admin accounts

Model: `src/server/api/leo/user/userModel.js` (model name `leo_User`)

| Field | Type | Notes |
|---|---|---|
| `firstname` / `lastname` | String, required | |
| `username` | String, required, unique | Login |
| `password` | String, required | bcrypt hash; hashed in a `pre('save')` hook |
| `admin` | Boolean | Declared but **never checked anywhere** — any valid `leo_User` has full access |
| `created` | Date | |

A handful of accounts for the contest organisers. There is no self-service registration, no
password reset, and no email on the model — a forgotten password means editing Atlas by hand.
Worth knowing before an organiser asks.

`UserSchema.methods.authenticate` generates an unused `salt` variable before calling
`bcrypt.compareSync` — harmless, but confusing; clean it up when you next touch the file.

---

## Relationships

There are none. No refs, no populate, no joins. Each collection stands alone and the frontend
stitches nothing together. For this data volume that is the right call — do not add references.
