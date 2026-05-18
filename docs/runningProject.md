# Running the Project

Stella Logos requires **three things running at the same time**: PostgreSQL (database), the Node.js backend (GraphQL API), and the Vite frontend (React app). Start them in the order listed below.

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| [Node.js](https://nodejs.org/) | v18 or higher | Includes npm |
| [PostgreSQL](https://www.postgresql.org/download/) | v14 or higher | Must be running locally |

---

## Step 1 — Confirm PostgreSQL is running

The backend expects a local PostgreSQL instance with these connection details (already set in `backend/.env`):

| Setting | Value |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| Database | `stella_logos` |
| Username | `postgres` |
| Password | `1234` |

**On Windows**, open **Services** (`Win + R` → type `services.msc`) and confirm `postgresql-x64-XX` is running. Or check via terminal:

```
pg_isready -U postgres
```

If it prints `localhost:5432 - accepting connections`, PostgreSQL is ready.

---

## Step 2 — One-time database setup (run once only)

These commands only need to be run the first time, or after wiping the database.

### 2a. Create the database

Open a terminal and run:

```
psql -U postgres -c "CREATE DATABASE stella_logos;"
```

Enter password `1234` if prompted.

### 2b. Apply the schema (create all tables)

From the project root:

```
cd backend
psql postgresql://postgres:1234@localhost:5432/stella_logos -f src/db/schema.sql
```

This creates all tables, indexes, triggers, and row-level security policies.

### 2b-ii. Apply incremental migrations (run after schema)

Several features added after the initial schema require their own migration files. Run all of these in order:

```
$env:PGPASSWORD = "1234"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -p 5432 -U postgres -d stella_logos -f backend/src/db/migrate_shop.sql
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -p 5432 -U postgres -d stella_logos -f backend/src/db/migrate_messages.sql
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -p 5432 -U postgres -d stella_logos -f backend/src/db/migrate_register.sql
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -p 5432 -U postgres -d stella_logos -f backend/src/db/migrate_staffroom.sql
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -p 5432 -U postgres -d stella_logos -f backend/src/db/migrate_learning_tasks.sql
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -p 5432 -U postgres -d stella_logos -f backend/src/db/migrate_hql_step_blocks.sql
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -p 5432 -U postgres -d stella_logos -f backend/src/db/migrate_dynamic_steps.sql
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -p 5432 -U postgres -d stella_logos -f backend/src/db/migrate_ledger.sql
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -p 5432 -U postgres -d stella_logos -f backend/src/db/migrate_lti.sql
```

All migration files are safe to re-run (use `IF NOT EXISTS`). In PowerShell, set `$env:PGPASSWORD = "1234"` before calling psql, and use the full path `C:\Program Files\PostgreSQL\16\bin\psql.exe` since psql may not be on PATH.

### 2c. Seed the database (create test users and sample data)

Still inside the `backend` folder:

```
npm run db:seed
```

This inserts the following test accounts (safe to run again — skips existing rows):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@stellalogos.dev` | `admin1234` |
| Teacher | `teacher@stellalogos.dev` | `teacher1234` |
| Learner | `learner@stellalogos.dev` | `learner1234` |

---

### 2d. Redis (optional — caching layer)

Redis is not required to run the app. When Redis is unavailable, the backend detects this on startup and silently disables caching — all features work identically.

To enable caching, install and start Redis:
- **Windows (via WSL2):** `sudo service redis-server start` inside WSL2, then the backend connects automatically via `redis://localhost:6379`.
- **Windows (via Docker):** `docker run -d -p 6379:6379 redis:alpine`

If Redis is running when the backend starts, you'll see `✅ Redis connected` in the console. If not, you'll see `⚠️ Redis unavailable — caching disabled` — this is expected and safe.

---

## Step 3 — Start the backend (GraphQL API)

> **PowerShell note:** PowerShell's execution policy blocks `.ps1` scripts, so `npm run dev` fails directly. Always launch dev servers via `Start-Process cmd`:

```powershell
Start-Process cmd -ArgumentList '/c cd backend && npm run dev'
```

Or in a separate cmd window:

```
cd backend
npm run dev
```

You should see:

```
🚀 Stella Logos GraphQL ready at http://localhost:4000/
```

The backend must stay running. Leave this terminal open.

> **Port:** The API runs on `http://localhost:4000`. The frontend automatically proxies all `/graphql` requests to it — you never call port 4000 directly from the browser.

---

## Step 4 — Start the frontend (React app)

Open a **second** terminal in the project root (not the `backend` folder). In PowerShell use:

```powershell
Start-Process cmd -ArgumentList '/c npm run dev'
```

Or in a cmd window:

```
npm run dev
```

Vite will print the URL, for example:

```
➜  Local:   http://localhost:5173/
```

Open that URL in your browser.

> **Note:** If port 5173 is already in use (e.g. you have another dev server running), Vite will automatically try 5174, 5175, etc. Always check the terminal output for the actual URL.

---

## Step 5 — Log in

Use one of the seeded accounts from Step 2c. Enter the **full email address** in the Username field:

- **Username:** `learner@stellalogos.dev`
- **Password:** `learner1234`

---

## Stopping the servers

Press `Ctrl + C` in each terminal to stop the frontend and backend.

---

## Quick-reference: all commands

| Location | Command | What it does |
|---|---|---|
| Root | `npm run dev` | Start Vite frontend (port 5173) |
| Root | `npm run build` | Production build (output in `/dist`) |
| Root | `npm run preview` | Preview the production build |
| `backend/` | `npm run dev` | Start GraphQL API (port 4000, watch mode) |
| `backend/` | `npm run build` | Compile TypeScript to `dist/` |
| `backend/` | `npm start` | Start compiled backend (production) |
| `backend/` | `npm run db:seed` | Insert test users and sample data |
| `backend/` | `npm run db:migrate` | Re-apply `schema.sql` to the database |

---

## Environment files

| File | Purpose |
|---|---|
| `backend/.env` | Database URL, JWT secret, port — already configured for local dev |
| `.env.example` | Frontend example — only needed if you want to point at a remote API |

The frontend does **not** need a `.env` file for local development. It uses `/graphql` as a relative URL which Vite proxies to `http://localhost:4000`.

---

## Troubleshooting

**`EADDRINUSE: address already in use :::4000`**
Another process is already using port 4000. Either the backend is already running, or a previous instance didn't shut down cleanly. Find and kill it:
```
netstat -ano | findstr :4000
taskkill /PID <pid> /F
```

**`EADDRINUSE` on port 5173**
Vite will automatically pick the next available port. Check the terminal output for the actual URL.

**`Invalid email or password`**
Make sure you are typing the full email address (e.g. `learner@stellalogos.dev`), not just a username. The Username field takes an email.

**`Login failed. Please try again.`**
The frontend cannot reach the backend. Check that:
1. The backend is running (`npm run dev` inside `backend/`)
2. It printed `ready at http://localhost:4000/`
3. PostgreSQL is running and accepting connections

**`relation "users" does not exist`**
The schema hasn't been applied. Run Step 2b (apply schema) and Step 2c (seed) again.
