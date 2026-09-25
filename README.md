# Cviator Pro — University CV Builder

A full-stack, role-aware CV builder for university students with live preview, server-side PDF export, email verification, and an admin dashboard.

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | Next.js (pages router) + Tailwind   |
| Backend   | Node.js + Express                   |
| PDF       | Puppeteer (server-side rendering)   |
| Database  | PostgreSQL 16 (JSONB for CV data)   |
| Auth      | JWT (stateless, 7-day expiry)       |
| Email     | Nodemailer (SMTP or console in dev) |
| Containers| Docker + Docker Compose             |
| CI        | GitHub Actions (build + optional Docker Hub push) |

---

## Roles

| Role    | Can build CV | Can view all CVs | Notes                              |
|---------|:------------:|:----------------:|------------------------------------|
| Student | Yes          | No               | Requires GIKI student email (`u<regno>@giki.edu.pk`), reg no, faculty, batch. Needs email verification. |
| Admin   | No           | Yes              | Requires a `@giki.edu.pk` email. Every admin except `ROOT_ADMIN_EMAIL` needs approval from the root admin before they can sign in. |

---

## Project Structure

```
cviator/
├── frontend/                  # Next.js + Tailwind
│   ├── pages/
│   │   ├── index.js           # CV builder (auto-save, live preview)
│   │   ├── login.js
│   │   ├── signup.js
│   │   ├── verify-email.js    # Post-signup email verification
│   │   ├── forgot-password.js
│   │   ├── reset-password.js
│   │   └── admin/index.js     # Admin dashboard
│   ├── components/
│   │   ├── ResumeForm.js
│   │   ├── LivePreview.js
│   │   └── templates/         # TemplateClassic, TemplateModern
│   ├── hooks/useAuth.js
│   └── services/              # api.js, auth.js, cv.js, admin.js
├── backend/
│   ├── server.js              # Express app + rate limiting
│   ├── config.js
│   ├── routes/
│   │   ├── auth.js            # signup/login/verify-email/reset-password
│   │   ├── cv.js              # GET/PUT /api/cv
│   │   ├── admin.js           # user list, per-user PDF, bulk ZIP
│   │   └── pdf.js             # /generate-pdf (Puppeteer)
│   ├── db/
│   │   ├── schema.sql         # Idempotent schema (safe on every boot)
│   │   └── pool.js
│   ├── middleware/auth.js      # requireAuth, requireAdmin, requireNonAdmin
│   └── utils/
│       ├── generateHTML.js    # CV → HTML for Puppeteer
│       ├── browser.js         # Shared, reused Puppeteer/Chromium instance
│       ├── cache.js           # In-process TTL cache (reference-data endpoints)
│       └── mailer.js          # Email sending (SMTP or console fallback)
├── scripts/backup.sh          # Daily pg_dump, run by the `backup` compose service
├── backups/                   # Dump output (gitignored — contains real user data)
├── .env.example                # Root env template for docker-compose
└── docker-compose.yml
```

---

## Local Setup (without Docker)

### Prerequisites
- Node.js 18+ (22 recommended — matches the Docker images)
- PostgreSQL running locally (native install, or just `docker-compose up postgres` for the DB only)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in JWT_SECRET, DB_* vars (see table below)
npm run dev            # starts on http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev            # starts on http://localhost:3000
```

Visit `http://localhost:3000`, sign up with a `u<7-digit-regno>@giki.edu.pk`
address, and check the backend console for the verification link (email
sending is skipped and the link is logged instead whenever `SMTP_HOST` is
unset).

---

## Running with Docker

```bash
cp .env.example .env   # fill in JWT_SECRET and DB_PASSWORD at minimum
docker-compose up --build
```

Services:
- Frontend → **http://localhost:3000**
- Backend  → **http://localhost:5000**
- Postgres → port 5432 (internal only)
- `backup`  → daily `pg_dump` into `./backups/` (see [Backups](#backups))

```bash
docker-compose down        # stop
docker-compose down -v     # stop + wipe DB volume (also wipes backups' source DB — the dumps themselves live outside the volume, in ./backups)
```

---

## Environment Variables

### Required (must be set before deploying)

| Variable          | Description                                          |
|--------------------|------------------------------------------------------|
| `JWT_SECRET`       | Long random string for signing JWTs                  |
| `DB_PASSWORD`      | Postgres password                                    |
| `ROOT_ADMIN_EMAIL` | GIKI email that becomes root admin on first signup — required for *any* admin account to ever work, since every other admin needs the root admin's approval |

In production (`NODE_ENV=production`, which `docker-compose.yml` sets), the
backend **refuses to start** if `JWT_SECRET` or `DB_PASSWORD` are left at
their insecure defaults — this is a deliberate safety check, not a bug.

Generate a JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Optional — SMTP (email verification & password reset)

| Variable    | Default                   | Description               |
|-------------|---------------------------|---------------------------|
| `SMTP_HOST` | *(empty)*                 | Leave blank in dev — links are logged to console instead |
| `SMTP_PORT` | `587`                     |                           |
| `SMTP_USER` |                           |                           |
| `SMTP_PASS` |                           |                           |
| `SMTP_FROM` | `noreply@cviator.local`   |                           |

---

## Auth Flows

### Signup (Student)
1. Fill form → POST `/api/auth/signup`
2. Backend creates user, sends verification email (or logs link to console in dev)
3. Frontend redirects to `/verify-email`
4. User clicks link → `GET /api/auth/verify-email/:token` → redirected to `/login?verified=1`

### Signup (Admin)
1. Fill form with a `@giki.edu.pk` email → POST `/api/auth/signup`
2. If the email matches `ROOT_ADMIN_EMAIL` and no root admin exists yet, they're auto-approved and immediately receive a JWT.
3. Otherwise the account stays `pending` and an approval-request email goes to the root admin. Once approved (in-app or via the emailed link), the new admin can sign in.

### Password Reset
1. `/forgot-password` → POST `/api/auth/forgot-password` → email sent
2. User clicks link → `/reset-password?token=...`
3. POST `/api/auth/reset-password` → password updated → redirect to `/login`

---

## Deployment (institute-provided server)

Assumes a plain Ubuntu (or similar) server reachable over SSH, with Docker installable — no cloud provider assumed.

1. **SSH in and install Docker + Docker Compose** (skip if already installed):
   ```bash
   sudo apt-get update -y
   sudo apt-get install -y docker.io docker-compose git
   sudo usermod -aG docker $USER && newgrp docker
   ```
2. **Get the code onto the server** — either `git clone` (if you push this repo somewhere reachable from the server) or `scp`/copy the folder over:
   ```bash
   git clone <your-repo-url> cviator && cd cviator
   ```
3. **Configure environment**:
   ```bash
   cp .env.example .env
   # edit .env: set JWT_SECRET, DB_PASSWORD, ROOT_ADMIN_EMAIL
   # leave NEXT_PUBLIC_API_URL empty and FRONTEND_URL=* unless you have a real domain
   ```
4. **Start everything** (backend, frontend, Postgres, and the daily backup job):
   ```bash
   docker-compose up -d --build
   ```
5. **Verify**:
   ```bash
   docker-compose ps                    # all services should be "Up"/"healthy"
   docker-compose logs -f backup        # confirm the first backup ran
   ```
6. Open `http://<server-ip>:3000` in your browser.

If the institute gives you a domain and lets you open port 80/443, put a
reverse proxy (Caddy or nginx) in front with a Let's Encrypt certificate —
right now everything is plain HTTP, so login tokens travel in cleartext.
Caddy in particular is a one-line addition (it gets certs automatically);
ask if you want that wired into `docker-compose.yml`.

### Why login can fail with "Failed to fetch" after deploying

`NEXT_PUBLIC_API_URL` is baked into the Next.js bundle at **build time**. If
you build with `http://localhost:5000`, the user's browser will try to call
*their own* localhost, not your server.

The frontend **auto-detects** the backend at `<same-host>:5000` in the
browser instead, so leaving `NEXT_PUBLIC_API_URL` empty makes the same image
work on localhost or whatever server you deploy to, with no rebuild needed.

---

## Backups

The `backup` service in `docker-compose.yml` runs `scripts/backup.sh`, which
dumps the database once a day into `./backups/` on the host and deletes
dumps older than `BACKUP_RETENTION_DAYS` (default 14). No cloud storage, no
cron setup — it's a plain `pg_dump` in a loop, using the same Postgres image
already in the stack.

Restore a dump:
```bash
docker exec -i cviator-postgres psql -U <DB_USER> -d <DB_NAME> < backups/cviator_YYYYMMDD_HHMMSS.sql
```

`./backups/` is gitignored (the dumps contain real emails, names, and
password hashes) and lives outside the Postgres Docker volume, so
`docker-compose down -v` does *not* delete existing backups. It's still all
on one disk, though — if you want protection against that disk failing,
periodically copy `./backups/` somewhere else (your own machine, institute
network storage, whatever's free and available to you).

---

## CI/CD (GitHub Actions)

File: `.github/workflows/main.yml`

On push to `main`:
1. Install deps + build Next.js frontend
2. Build Docker images
3. *(Optional)* Push to Docker Hub if `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` secrets are set

This is optional — deploying directly on the institute server with
`docker-compose up -d --build` (above) doesn't need it. Remove this workflow
if you'd rather not set up Docker Hub at all.

---

## Known Limitations / Roadmap

- No automated test suite (Jest + Supertest planned)
- No automated deploy step in CI (manual `docker-compose` deploy for now)
- No TLS/reverse proxy by default — add one before real user data flows through this
- Schema uses `ADD COLUMN IF NOT EXISTS` for migrations; non-trivial changes need a migration tool
- JWT logout is client-side only (no server-side revocation)
- Backups are same-disk only; copy `./backups/` off-box periodically for real disaster recovery
