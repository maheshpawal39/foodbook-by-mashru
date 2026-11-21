# FoodieBook by Marshru

A complete, premium, bilingual (English / हिन्दी) recipe management and food discovery platform.

FoodieBook is not a UI demo. It includes a real Flask + PostgreSQL API, database migrations, seed data, authentication with roles, recipe CRUD with image uploads, reviews, favourites, shopping lists, a cooking timer, SQL-based ingredient matching, notifications, PDF export, and a separate admin dashboard.

---

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite 6, React Router 6, Axios, Lucide React, plain CSS with theme variables |
| Backend | Python Flask 3, Flask-SQLAlchemy, Flask-Migrate (Alembic), Flask-Login, Flask-CORS |
| Database | PostgreSQL (production + development), psycopg 3 |
| PDF | ReportLab |
| Images | Pillow validation and processing, files in `backend/uploads/`, paths only in PostgreSQL |

---

## Quick start (Windows, from this folder)

```powershell
# from the project root (the folder containing backend/ and frontend/)
.\scripts\setup.ps1
.\scripts\dev.ps1
```

Then open **http://127.0.0.1:5189**.

`setup.ps1` will:

1. create the backend virtual environment and install Python dependencies,
2. install frontend npm dependencies,
3. create a project-local PostgreSQL cluster in `backend/.pgdata` on port `5434` (if PostgreSQL is installed and no cluster exists),
4. run migrations and seed data,
5. leave the database running.

`dev.ps1` starts the Flask API and Vite dev server in separate windows.

> If PostgreSQL is already available elsewhere, set `DATABASE_URL` in `backend/.env` and skip the local cluster step.

### Default accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@foodiebook.com` | `Admin@12345` |
| Demo user | `demo@foodiebook.com` | `Demo@12345` |
| Chef Kunal | `chef.kunal@foodiebook.com` | `Chef@12345` |
| Chef Ananya | `chef.ananya@foodiebook.com` | `Chef@12345` |
| Chef Rohan | `chef.rohan@foodiebook.com` | `Chef@12345` |
| Chef Sana | `chef.sana@foodiebook.com` | `Chef@12345` |

Change these passwords immediately in any real deployment.

---

## Manual setup

### 1. Environment files

```powershell
Copy-Item .env.example .env
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

Set a strong `SECRET_KEY` in `backend/.env` (never commit it). The `.env.example` files document every setting.

### 2. PostgreSQL

Create a database and point `DATABASE_URL` at it:

```sql
CREATE DATABASE foodiebook;
```

```env
DATABASE_URL=postgresql+psycopg://postgres:password@localhost:5432/foodiebook
```

The helper scripts create a **local development cluster** on port `5434` instead:

```powershell
.\scripts\start-db.ps1     # initdb (first run), start, create database
.\scripts\stop-db.ps1      # stop the local cluster
```

The local cluster uses trust authentication for `localhost` only. Never use that setup for a public deployment.

### 3. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:FLASK_APP = "run.py"
flask db upgrade
flask seed
python run.py
```

### 4. Frontend

```powershell
cd frontend
npm install
npm run dev
```

The frontend and backend are separate processes and communicate only through the REST API.

---

## Ports in this build

The checked-in local `.env` uses:

| Service | URL |
| --- | --- |
| Frontend | `http://127.0.0.1:5189` |
| API | `http://127.0.0.1:5399/api` |
| PostgreSQL | `localhost:5434` database `foodiebook` |

These ports were chosen to avoid collisions on the current machine. To use conventional ports (`5173` / `5000`), update all of:

- `backend/.env`: `FLASK_PORT`, `CORS_ORIGINS`, `FRONTEND_URL`
- `frontend/.env`: `VITE_API_URL`, `VITE_API_ORIGIN`
- `frontend/vite.config.js`: `server.port`

The API URL is baked into production builds through Vite environment variables.

---

## Features

### Recipes
- Create, read, update, delete recipes; save as draft or publish.
- Fields: bilingual title/short/full description, image, category, cuisine, veg/non-veg, prep/cook/total time, difficulty, servings, calories, ingredients with quantities/units, numbered steps, tips, video URL, and nutrition.
- Image upload validation (JPG/JPEG/PNG/WEBP, 5 MB limit, MIME + real-image verification, re-encoding, safe UUID filenames).
- Recipe PDF download, print layout, native share/clipboard fallback, and cooking timer launch.

### Discovery
- Search across titles, descriptions, cuisines, categories, and ingredients.
- Filters: category, cuisine, food type, maximum cook time, difficulty, minimum rating, ingredient.
- Sorting: newest, most popular, highest rated, quickest, longest, title.
- Pagination on every listing.
- Dashboard: featured banner, trending, popular, recently added, personalised recommendations, categories, popular chefs, and live database stats.
- SQL-based ingredient matching for **What’s in Your Kitchen?** — no fake AI. Shows match percentage, matched count, and missing ingredients.

### Social & personal
- Favourites with duplicate protection.
- 1–5 star ratings and reviews; create, edit, delete your own review; average rating/count updated transactionally.
- Report recipes or reviews; admins resolve, dismiss, or delete reported content.
- Notifications on reviews, favourites, reports, and welcome.
- Profile photo upload, name/email/bio updates, password change, and lists of your recipes, favourites, and reviews.
- Shopping list with add/remove/mark purchased, progress, clear purchased, and generate from a recipe.
- Cooking timer with presets, custom minutes/seconds, start/pause/resume/reset, sound alert, and browser notification.

### Admin
- Separate admin-only area and APIs.
- Stats: users, active users, recipes, drafts, reviews, favourites, categories, reports, average rating, category breakdown.
- Manage users (role, activate/deactivate, delete).
- Manage recipes (publish/unpublish, feature, delete, edit).
- Manage categories (create/edit/activate/delete with in-use protection).
- Manage reviews and reports.
- Featured recipe curation.
- Website settings: site name, tagline, contact email, banner title/subtitle/image, about text, maintenance flag.

### Auth & security
- Registration, login, logout, remember me.
- Forgot/reset password with hashed, single-use, expiring tokens.
- Passwords hashed with Werkzeug (PBKDF2).
- Session cookies HTTP-only, SameSite=Lax, optional Secure.
- CSRF double-protection for every mutating API call (`X-CSRF-Token`).
- Role-based authorization (Admin/User) enforced on the API, not just the UI.
- Protected React routes with admin guard.
- ORM queries throughout (SQL injection protection).
- Input validation on both frontend and backend.
- Upload size limit, MIME/extension allow-list, Pillow verification, re-encoding, UUID filenames.
- Configurable CORS with credentials only for trusted origins.
- Security headers on every response.

### Bilingual UI
- English and Hindi, switchable in the header and auth pages.
- Saved in `localStorage`; instantly updates the entire interface.
- All labels, navigation, forms, validation, errors, empty states, toasts, and admin screens are translated.
- Recipe titles and descriptions have optional Hindi fields; recipe steps display the saved Hindi version when present and available.
- User-authored recipe instructions are never machine translated.

### Themes
- Warm light theme: cream backgrounds, white cards, maroon sidebar/buttons, gold accents.
- Dark theme: `#171416` background, `#262025` cards, deep maroon sidebar, gold buttons, warm cream text.
- Saved in `localStorage`.
- Fully responsive: collapsible mobile sidebar, adaptive cards, forms, tables, filters, and timer.

---

## Project structure

```
foodiebook/
  backend/
    app/
      models/         SQLAlchemy models
      routes/         REST API blueprints
      services/       PDF, notifications, ingredient helpers
      utils/          validation, uploads, CSRF, responses
      __init__.py     app factory
    migrations/       Alembic migrations
    uploads/          recipe/avatar/default/seed images (paths in DB only)
    config.py
    seed.py
    run.py
    requirements.txt
  frontend/
    src/
      assets/         design system (styles.css)
      components/     reusable UI components
      context/        Auth, Theme, Language, Toast
      hooks/          async/localStorage/debounce helpers
      layouts/        AppLayout, AuthLayout
      pages/          all user + admin pages
      services/       all HTTP calls (axios)
      translations/   en.js, hi.js
      utils/          formatting, media URLs, error mapping
    App.jsx
    main.jsx
    vite.config.js
  scripts/
    start-db.ps1
    stop-db.ps1
    setup.ps1
    dev.ps1
  .env.example
  .gitignore
  README.md
```

---

## Database

Tables:

`roles`, `users`, `password_reset_tokens`, `categories`, `recipes`, `ingredients`,
`recipe_ingredients`, `recipe_steps`, `favorites`, `reviews`, `reports`,
`shopping_lists`, `shopping_list_items`, `notifications`, `site_settings`.

The schema includes primary/foreign keys, unique constraints (one favourite/review per user per recipe, one ingredient per recipe, one step number per recipe), indexes for filtering/sorting, and `created_at`/`updated_at` timestamps.

Migrations:

```powershell
cd backend
$env:FLASK_APP = "run.py"
flask db upgrade
flask db migrate -m "describe change"   # after model changes
flask db upgrade
```

Seed data is idempotent:

```powershell
flask seed
```

It creates 13 categories, 6 users, 20 published recipes, 2 drafts, ingredients, steps, reviews, favourites, notifications, a shopping list, a report, and website settings. Sample imagery is generated locally with Pillow into `backend/uploads/seed/` — no external image services required.

---

## API overview

Base URL: `http://127.0.0.1:5399/api`

| Area | Endpoints |
| --- | --- |
| Auth | `GET /auth/csrf`, `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `PUT /auth/profile`, `POST /auth/change-password`, `POST /auth/forgot-password`, `POST /auth/reset-password` |
| Recipes | `GET/POST /recipes`, `GET /recipes/mine`, `GET/PUT/PATCH/DELETE /recipes/<id>`, `PATCH /recipes/<id>/publish`, `POST /recipes/<id>/favorite`, `GET /recipes/<id>/pdf`, `POST /recipes/match` |
| Reviews | `GET/POST /recipes/<id>/reviews`, `PUT/DELETE /recipes/reviews/<reviewId>` |
| Discovery | `GET /categories`, `GET /dashboard`, `GET /ingredients?q=`, `GET /settings` |
| Personal | `GET /favorites`, `DELETE /favorites/<recipeId>`, `GET/POST/PATCH/DELETE /shopping-list...`, `GET /my-reviews`, `GET/PATCH/DELETE /notifications...` |
| Reports | `POST /reports` |
| Uploads | `POST /uploads` (multipart `file`, optional `kind=recipe|avatar`) |
| Admin | `/admin/stats`, `/admin/users`, `/admin/recipes`, `/admin/categories`, `/admin/reviews`, `/admin/reports`, `/admin/settings` |

All mutating calls require the CSRF token returned by `GET /api/auth/csrf` in the `X-CSRF-Token` header. The frontend axios interceptor handles this automatically.

---

## Testing performed

The build was verified end-to-end:

- 50+ API assertions: auth, CSRF, roles, CRUD, filters/search/sort/pagination, uploads, PDF, favourites, reviews, shopping list, SQL matching, notifications, admin, reset password.
- Browser tests (Chrome/Playwright): login, registration, forgot/reset, dashboard, light/dark, English/Hindi, explore filters, recipe detail, review creation, favourites, shopping list, timer, kitchen matcher, recipe create/delete via UI, profile image upload, PDF download, notifications, admin overview/users/recipes/categories/reviews/reports/featured/settings, mobile sidebar and responsive layouts.
- Production frontend build (`npm run build`) succeeds.

No automated test files are shipped in the app itself; the scripts used for verification can be recreated from the API overview above.

---

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `SECRET_KEY` | Flask session/CSRF signing key (required) | — |
| `DATABASE_URL` | SQLAlchemy PostgreSQL URL | local cluster on `5434` |
| `UPLOAD_FOLDER` | Absolute/relative upload directory | `backend/uploads` |
| `MAX_UPLOAD_MB` | Max image size | `5` |
| `CORS_ORIGINS` | Comma-separated allowed origins | local dev origins |
| `FRONTEND_URL` | Reset-link base URL | `http://127.0.0.1:5189` |
| `SHOW_RESET_TOKEN` | Return reset token in API response when no email provider is configured | `true` for local development; set `false` in production |
| `RESET_TOKEN_TTL_MINUTES` | Reset-link lifetime | `30` |
| `SESSION_COOKIE_SECURE` | Require HTTPS cookies | `false` locally |
| `CSRF_ENABLED` | Enable mutating-request CSRF checks | `true` |
| `FLASK_HOST` / `FLASK_PORT` | Backend bind address/port | `127.0.0.1` / `5000` |
| `VITE_API_URL` | Frontend API base URL | `http://127.0.0.1:5399/api` |
| `VITE_API_ORIGIN` | Origin used to resolve `/uploads/...` images | `http://127.0.0.1:5399` |

---

## Production notes

1. Set a unique `SECRET_KEY` from a secret manager.
2. Use a managed PostgreSQL instance and a least-privilege database user.
3. Set `SESSION_COOKIE_SECURE=true`, `SESSION_COOKIE_SAMESITE=None` only when using cross-site cookies over HTTPS; otherwise keep `Lax`.
4. Set `SHOW_RESET_TOKEN=false` and connect an email provider in `auth.forgot_password` (the token creation is already implemented).
5. Restrict `CORS_ORIGINS` to your real frontend domain.
6. Serve the built frontend (`frontend/dist`) from a static host/reverse proxy and proxy `/api` and `/uploads` to Flask.
7. Run Flask with a production WSGI server (e.g. gunicorn on Linux) — not the dev server.
8. Do not commit `.env`, uploaded user images, `node_modules`, virtualenvs, or the local `.pgdata` cluster.

---

## Troubleshooting

- **`SECRET_KEY is not set`** — copy `backend/.env.example` to `backend/.env` and set a value.
- **Database connection refused** — run `.\scripts\start-db.ps1` or start your PostgreSQL service; confirm `DATABASE_URL`.
- **CORS / login cookie issues** — `CORS_ORIGINS` must exactly match the browser origin, including port.
- **Images not loading** — confirm `VITE_API_ORIGIN` points at the Flask server and `/uploads/...` is reachable.
- **Reset token not shown** — local `.env` must have `SHOW_RESET_TOKEN=true`; in production use email delivery.
- **Port already in use** — change `FLASK_PORT`/Vite `server.port` and the corresponding env values.
