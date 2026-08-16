# Architecture — api

## What it serves

One Express app, historically five products, **one of them live**.

```
src/index.js
  └─ src/server/index.js
       ├─ mongoose()                     config/mongoose.js → Atlas via process.env.MONGODB_URI
       ├─ middleware(app)                config/../middleware/index.js
       │     morgan (dev) | compression (prod)
       │     cors()                      ← permissive, no options. Registered FIRST, so it wins.
       │     method-override
       │     bodyParser json + urlencoded, 10mb limit
       │     express.static('/static'), serve-favicon
       ├─ cors({ origin: allowlist })    ← inert, shadowed by the above. See docs/SECURITY.md A-4
       ├─ res.setHeader('Cache-Control', 'no-store')   on every response
       ├─ /api   → api/index.js
       │            ├─ /leo         ✅ LIVE
       │            ├─ /abluelemon  💤 dormant
       │            ├─ /devPunk     💤 dormant
       │            ├─ /blog        💤 already commented out
       │            └─ /terapias    💤 already commented out
       ├─ /auth  → auth/routes.js
       │            ├─ POST /signin       💤 dormant (blog user model)
       │            └─ POST /signin-leo   ✅ LIVE — admin login
       └─ /      → root/index.js         404 "This is a private API"
```

The `Cache-Control: no-store` on every response was added in commits `b95296e` and `33b0d80`.
It is almost certainly a workaround for the frontend's Create React App v1 service worker, not a
genuine caching requirement. If that service worker is retired (frontend task S-9), this can
probably be relaxed to something less blunt.

## The `leo` product

Consistent three-file pattern per resource:

```
api/leo/
  index.js                    mounts the four routers
  user/     userRoutes → userController → userModel        (leo_users)   🔒 all routes auth'd
  school/   schoolRoutes → schoolController → schoolModel  (leo_schools) ⚠️ GET and POST public
  image/    imageRoutes → imageController → imageModel     (leo_images)  ⚠️ all routes public
  document/ documentRoutes → documentController → documentModel (leo_documents) GET only, public
```

### Endpoint map, and who consumes it

| Endpoint | Auth | Frontend consumer |
|---|---|---|
| `POST /auth/signin-leo` | — | `views/Admin.jsx` |
| `GET /api/leo/schools` | ❌ **none** | `views/Colegios.jsx` (public) **and** `components/AdminList.jsx` (admin) |
| `POST /api/leo/schools` | ❌ none (by design) | `components/Register.jsx` — the registration form |
| `PUT /api/leo/schools/:id` | ✅ | *nothing* — `AdminList.handleEdit` is a stub, the call is commented out |
| `DELETE /api/leo/schools/:id` | ✅ | `components/AdminList.jsx` |
| `GET /api/leo/documents` | ❌ none | `views/Lectura.jsx` |
| `GET /api/leo/images` | ❌ none | `components/ImageGallery.jsx` |
| `POST`/`PUT /api/leo/images` | ❌ **none** | *nothing* — see `docs/SECURITY.md` A-3 |
| `GET`/`POST`/`PUT /api/leo/users` | ✅ | *nothing* — admin accounts are managed in Atlas |

Several endpoints exist that no frontend calls. Do not assume an endpoint is exercised just
because it is defined.

## Auth

`src/server/auth/index.js` is shared across all products.

- `verifyUser(type)` — username/password check on sign-in. `getModel(type)` maps `'leo'` to
  `leo_User` and **everything else to the blog's `User` model**, which is why the dormant blog
  code cannot simply be deleted.
- `decodeToken()` — copies the `access-token` header into `Authorization: Bearer …`, then runs
  `express-jwt`. **This is where the auth bypass lives** (`docs/SECURITY.md` A-2).
- `getFreshUser(type)` — reloads the user from Mongo on every request and puts it on `req.user`.
  A DB round-trip per request; fine at this volume.
- `signToken(id)` — HS256, `expiresIn: config.expireTime` (currently 4 hours).

Routes compose these as `const checkUser = [auth.decodeToken(), auth.getFreshUser('leo')]`.

There is **no role check anywhere.** The `admin` boolean on `leo_User` is declared and never read —
any valid account has full access. With a handful of organiser accounts that is an acceptable
simplification, but know that it is one.

## Conventions worth keeping

- Controllers return `{ success: boolean, data: … }` consistently. The frontend's `utils/API.js`
  depends on this shape — **do not change it** without changing both repos together.
- Mutating controllers return the **whole refreshed collection**, not just the changed record
  (e.g. `create` returns every school). Wasteful, but the frontend relies on it to refresh its
  list. Changing it is a coordinated two-repo change.
- Status codes are inconsistent — `create` returns 201, but so does `list` in `userController`.
  Harmless; the frontend only reads `success`.

## Known structural problems

- Five products in one deployable: a bad deploy for any of them takes the live contest site down.
- Partial Flow typing that earns nothing (task A-15).
- `middleware/errorHandler.js` has the wrong arity for Express and is never actually used.
- Schema drift on `leo_documents` — see `docs/DATA-MODEL.md`.
- No tests for `leo`. The Jest suite covers the dormant blog product only.
