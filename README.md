# FoodieBook by Marshru

A complete, premium, bilingual **recipe management and food discovery platform** — built with React, Flask, PostgreSQL and a maroon-and-gold visual identity.

FoodieBook is not a UI mock-up. Every page talks to a real REST API, persists to PostgreSQL, enforces authentication and role-based permissions, and was exercised through automated API tests and headless-browser UI checks on desktop and mobile.

---

## Highlights

| Area | What is implemented |
| --- | --- |
| **Brand** | Text-based FoodieBook logo, gold “by Marshru” identity, warm editorial typography |
| **Themes** | Light (warm cream + maroon + gold) and dark (`#171416` + gold), persisted in `localStorage`; sidebar stays maroon |
| **Languages** | English and Hindi, centralized translations, persisted in `localStorage`; recipe content keeps its original language |
| **Auth** | Registration, login, logout, forgot/reset password, secure password hashing, session protection, role-based access |
| **Recipes** | Full CRUD, publish/draft, image upload, ingredients, step timers, nutrition, tips, video, PDF download |
| **Discovery** | Search, category/cuisine/diet/time/difficulty/rating/ingredient filters, sorting, pagination |
| **Community** | Favorites, five-star reviews with edit/delete, average ratings, reports |
| **Kitchen** | “What’s in Your Kitchen?” ingredient matching with match percentages and missing ingredients |
| **Utilities** | Shopping list generated from recipes, cooking timer, browser notifications |
| **Profile** | Avatar upload, profile editing, own recipes/favorites/reviews, password change |
| **Admin** | Stats, users, recipes, categories, reviews, reports, featured recipes, website settings, announcements |
| **Database** | 16 normalized PostgreSQL tables, foreign keys, unique constraints, indexes, timestamps, Flask-Migrate migration |
| **Security** | Password hashing, CSRF token guard, CORS allow-list, secure cookies, upload validation, ownership checks |
| **Responsive** | Desktop, laptop, tablet and mobile layouts; collapsible mobile sidebar |

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| **Administrator** | `admin@foodiebook.com` | `Admin@123` |
| **Demo user** | `demo@foodiebook.com` | `Demo@123` |
| **Chef accounts** | `aarav@foodiebook.com`, `priya@foodiebook.com`, `meera@foodiebook.com`, `rohan@foodiebook.com` | `Chef@123` |

> Change these defaults before deploying. They live in `backend/.env` and are created by `seed.py`.

---

## Technology stack

- **Frontend:** React 18, Vite, React Router, Axios, Lucide React, hand-crafted CSS (no UI framework)
- **Backend:** Python 3, Flask, Flask-SQLAlchemy, Flask-Migrate, Flask-Login, Flask-CORS
- **Database:** PostgreSQL 14+ (tested on PostgreSQL 18) with the `psycopg` v3 driver
- **Files:** Pillow validation, UUID-safe filenames, local `/uploads` directory
- **PDF:** ReportLab (uses Nirmala UI/Mangal when available so Hindi renders in PDFs)

---

## Project structure

```text
foodbook by mashru/
├── backend/
│   ├── app/
│   │   ├── __init__.py            # app factory, CSRF, error handlers, uploads
│   │   ├── extensions.py          # db, migrate, login, cors
│   │   ├── models/                # users, recipes, interactions, shopping, system
│   │   ├── routes/                # auth, recipes, categories, dashboard, admin...
│   │   ├── services/              # recipe queries, PDF, mail, notifications
│   │   └── utils/                 # serializers, validators, image handling
│   ├── migrations/                # Alembic migration (initial schema)
│   ├── tests/test_api.py          # 10 automated API tests
│   ├── uploads/                   # recipe + avatar images (not in DB)
│   ├── config.py
│   ├── run.py
│   ├── seed.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/            # reusable UI building blocks
│   │   ├── context/               # Auth, Theme, Language, Toast
│   │   ├── hooks/
│   │   ├── layouts/               # AppLayout, AuthLayout, Sidebar, Header
│   │   ├── pages/                 # 28 screens, including admin/
│   │   ├── services/              # isolated API layer + CSRF-aware Axios
│   │   ├── styles/global.css      # design system + responsive rules
│   │   ├── translations/          # en.js / hi.js
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── .env.example
├── .gitignore
└── README.md
```

---

## Quick start

### 1. PostgreSQL

Create a database and a user:

```sql
CREATE USER foodiebook WITH PASSWORD 'change-me';
CREATE DATABASE foodiebook OWNER foodiebook;
```

Or with `createdb`:

```bash
createdb -U postgres foodiebook
```

### 2. Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Copy the environment template and edit it:

```bash
copy .env.example .env        # Windows
cp .env.example .env          # macOS / Linux
```

Minimum values to change:

```env
SECRET_KEY=use-a-long-random-value
DATABASE_URL=postgresql+psycopg://foodiebook:change-me@localhost:5432/foodiebook
FRONTEND_URL=http://localhost:5173
```

Create the schema and sample data:

```bash
flask --app run.py db upgrade
python seed.py
```

Start the API:

```bash
python run.py
# http://127.0.0.1:5000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

The Vite dev server proxies `/api` and `/uploads` to `http://127.0.0.1:5000`, so cookies and CSRF work without extra CORS configuration in development.

For a production build:

```bash
npm run build
npm run preview
```

Set `VITE_API_BASE_URL` (for example `https://api.example.com/api`) when the frontend is deployed on a different origin.

---

## Environment variables

All configuration is environment-driven. No database credentials are committed.

| Variable | Purpose | Default |
| --- | --- | --- |
| `SECRET_KEY` | Flask session/cookie signing | dev-only fallback |
| `DATABASE_URL` | SQLAlchemy PostgreSQL URL (`postgresql+psycopg://…`) | localhost:5432/foodiebook |
| `FRONTEND_URL` | Comma-separated allowed origins + reset-link base | `http://localhost:5173` |
| `SESSION_COOKIE_SECURE` | Set `true` behind HTTPS | `false` |
| `SESSION_COOKIE_SAMESITE` | Cookie same-site policy | `Lax` |
| `UPLOAD_FOLDER` | Upload directory (relative to `backend/`) | `uploads` |
| `MAX_UPLOAD_MB` | Maximum image size | `6` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Seeded administrator | demo values |
| `PASSWORD_RESET_TOKEN_MINUTES` | Reset link lifetime | `30` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `MAIL_FROM` | Optional password-reset email | disabled |
| `CSRF_ENABLED` | Double-submit CSRF guard | `true` |

Without SMTP, the forgot-password endpoint logs the reset link and, in development, returns `dev_reset_url` so the flow remains fully testable.

---

## Database design

16 tables with timestamps and indexes:

`roles`, `users`, `password_reset_tokens`, `categories`, `recipes`, `ingredients`, `recipe_ingredients`, `recipe_steps`, `favorites`, `reviews`, `reports`, `shopping_lists`, `shopping_list_items`, `notifications`, `site_settings`, `alembic_version`.

Key constraints:

- Unique email per user, unique role name
- Unique favorite per `(user, recipe)`, unique review per `(user, recipe)`
- Unique ingredient name, unique recipe slug
- Unique `(recipe, ingredient)` and `(recipe, step_number)`
- Rating check `1–5`, recipe status check `draft/published`, difficulty check
- Foreign keys with cascade/set-null semantics
- Indexes on all lookup and filter columns

Migrations:

```bash
flask --app run.py db migrate -m "describe change"
flask --app run.py db upgrade
```

---

## REST API overview

Base URL: `/api`

| Area | Endpoints |
| --- | --- |
| Health / CSRF | `GET /health`, `GET /auth/csrf` |
| Auth | `POST /auth/register`, `/login`, `/logout`, `/forgot-password`, `/reset-password`, `/change-password`; `GET /auth/me`; `PUT /auth/profile`; `POST /auth/profile/avatar` |
| Recipes | `GET/POST /recipes`, `GET /recipes/mine`, `GET /recipes/filters`, `GET /recipes/kitchen`, `GET/PUT/DELETE /recipes/:id`, `PATCH /recipes/:id/status`, `GET /recipes/:id/pdf`, `GET /recipes/:id/similar` |
| Favorites | `GET /favorites`; `POST/DELETE /recipes/:id/favorite` |
| Reviews | `GET /recipes/:id/reviews`, `POST /recipes/:id/reviews`; `PUT/DELETE /reviews/:id`; `GET /reviews/mine`; `POST /reports` |
| Categories | `GET /categories`, `GET /categories/:id`; admin `POST/PUT/DELETE` |
| Dashboard | `GET /dashboard`, `GET /dashboard/search` |
| Shopping | `GET /shopping-list`, `POST /shopping-list/items`, `PUT/DELETE /shopping-list/items/:id`, `DELETE /shopping-list/purchased`, `POST /shopping-list/from-recipe/:id` |
| Notifications | `GET /notifications`, `PUT /notifications/:id/read`, `PUT /notifications/read-all`, `DELETE /notifications/:id`, admin `POST /notifications/broadcast` |
| Admin | `GET /admin/stats`, `GET/PATCH/DELETE /admin/users/:id`, `GET /admin/recipes`, `PATCH /admin/recipes/:id/feature`, `GET /admin/reviews`, `GET/PATCH /admin/reports`, `GET /admin/categories` |
| Settings | `GET /settings`; admin `PUT /settings` |

All mutating requests require the CSRF header/cookie pair. Authenticated calls use Flask-Login session cookies (`withCredentials: true`).

---

## Security notes

- Passwords use Werkzeug PBKDF2 hashing; never stored or returned in plain text.
- SQL access goes through SQLAlchemy parameter binding (no string-built SQL).
- CSRF: double-submit token (`foodiebook_csrf` cookie + `X-CSRF-Token` header) checked on every mutating `/api/*` request. The Axios layer fetches and refreshes it automatically.
- CORS is restricted to `FRONTEND_URL`; credentials are enabled.
- Cookies are HTTP-only, `SameSite=Lax` by default, and `Secure` in production.
- Uploads are validated by Pillow (real image format + dimensions), limited to 6 MB, renamed with UUIDs and stored outside PostgreSQL.
- Ownership checks protect recipe/review edits; `admin_required` guards the admin blueprints; the last administrator cannot be removed.
- Role/active-state changes and self-protection rules are enforced server-side.
- Security headers: `nosniff`, `DENY` framing, referrer policy, permissions policy, no-store API responses.
- Secret keys and credentials stay in `.env` (gitignored). `.env.example` contains placeholders only.

---

## Testing

### Automated API tests

```bash
cd backend
python -m unittest discover -s tests -v
```

Result on this build: **10 tests passed** covering health/public recipes, registration/login, profile + password change, recipe CRUD/publish/permissions, image validation, favorites/reviews, shopping list, admin authorization, password reset, settings and notifications.

### Manual / browser checks performed

- Registration and login, incorrect-password handling, logout
- Role guard: user receives `403` on admin APIs/routes; admin succeeds
- Recipe create with image, draft → publish → update → delete
- Explore search and combined filters, pagination
- Favorites add/remove and duplicate prevention
- Review create/update/delete, average rating refresh
- Hindi ↔ English switching across nav, forms and dashboard
- Light ↔ dark theme across all pages; sidebar remains maroon
- Shopping list add, toggle, generate from recipe, clear purchased
- Cooking timer start/pause/reset + browser notification permission
- Kitchen finder matching and “add missing” actions
- Admin user roles/active state, recipe feature toggle, categories CRUD, reports, settings, announcements
- Mobile layout at 390×844, mobile drawer, no horizontal overflow
- Headless Chrome run reported **zero console errors** and **zero failed app requests**

---

## Design system

- **Palette:** Maroon `#800020`, deep maroon `#4A001F`, gold `#D4AF37`, soft gold `#F5E6B3`
- **Light:** warm cream backgrounds, ivory cards, dark-brown text
- **Dark:** `#171416` background, `#262025` cards, `#F8EEDC` text, gold actions
- **Type:** Playfair Display for editorial headings, Inter for UI, Noto Sans Devanagari for Hindi
- **Navigation:** maroon-gradient sidebar with gold active indicator; collapsible drawer below 1024 px
- **Motion:** gentle card lifts, page fades, dropdown/modal transitions — all respecting `prefers-reduced-motion`

Seed images are sourced from Unsplash URLs. Uploaded images live under `backend/uploads/`; if a remote image fails, the UI falls back to a branded local SVG.

---

## Deployment checklist

1. Set a strong `SECRET_KEY` and production `DATABASE_URL`.
2. Set `FRONTEND_URL` to the exact frontend origin; `SESSION_COOKIE_SECURE=true` behind HTTPS.
3. Run `flask --app run.py db upgrade` and `python seed.py` (or import your own data).
4. Serve the API with a WSGI server (e.g. Gunicorn/Waitress) — not the Flask dev server.
5. Build the frontend (`npm run build`) and serve `dist/` with your static host.
6. Configure a reverse proxy so `/api` and `/uploads` share the frontend origin, or set `VITE_API_BASE_URL` + CORS correctly.
7. Change the seeded administrator password immediately.
8. Configure SMTP for password-reset emails.
9. Back up PostgreSQL and the uploads directory.

---

## Troubleshooting

- **`ModuleNotFoundError`** — activate the backend virtualenv and run `pip install -r requirements.txt`.
- **`psycopg` connection errors** — verify PostgreSQL is running, the database exists, and `DATABASE_URL` has the correct driver prefix (`postgresql+psycopg://`).
- **CSRF 403 on mutations** — the browser must be able to read the `foodiebook_csrf` cookie; use the Vite proxy in development or serve frontend/API from the same site in production.
- **Images not visible** — check `/uploads` serving and the `UPLOAD_FOLDER`; remote seed photos require internet access and fall back to the branded placeholder.
- **Migration revision mismatch** — the database was created by another schema. Create a fresh database and run `flask db upgrade`; do not point two projects at the same database.
- **Port already in use** — Vite will choose the next available port; update `FRONTEND_URL` if it changes, or start with `npm run dev -- --port 5173 --strictPort`.

---

## Credits

Designed and engineered for **FoodieBook by Marshru** — recipes worth remembering.

© 2026 FoodieBook by Marshru. All rights reserved.
