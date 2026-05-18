# Stella Logos — Global Tech Stack (As-Built, 2026)

This document describes the **actual implemented architecture** of Stella Logos. It reflects the system as it exists in code, not an aspirational plan.

---

## Overview: Three-Segment Stack

| Segment | Role | Key Technologies |
|---|---|---|
| **Frontend (UI/UX)** | Renders all learner and teacher screens; manages theme, state, and animations | React 18, Vite, TypeScript, Tailwind CSS, Zustand, Framer Motion, Apollo Client |
| **Middleware (API)** | GraphQL API; authentication; file uploads; analytics export | Apollo Server v5, Node.js (ESM, TypeScript), Express 5, JWT, Multer |
| **Data Vault (Storage)** | Persistent relational data; optional high-speed cache; institutional interop tables | PostgreSQL 16, Redis (optional, graceful fallback), xAPI via PL/pgSQL trigger |

---

## 1. Frontend (UI/UX Segment)

### Framework
- **Vite + React 18 + TypeScript** — fastest HMR in development; ESM output for production
- **Tailwind CSS** — 8px grid utility classes; PostCSS pipeline
- **Framer Motion** — `AnimatePresence` transitions for phase changes, card expansions, particle bursts

### State Management (Zustand stores)
| Store | Responsibility |
|---|---|
| `themeStore.ts` | Active theme (`medieval`/`scifi`/`default`), performance tier (`High`/`Low`); sets `data-theme` + `data-performance` on `<html>` synchronously at module load |
| `authStore.ts` | JWT user object, login/logout, sessionStorage (`sl_token`) |
| `questStore.ts` | Learner progress per class, `advanceStep`, `devFreshStart` flag |
| `musicStore.ts` | Module-level `HTMLAudioElement` singleton; fade-in/out, mute, gesture unlock |
| `entryStore.ts` | SmartContainer accordion state for `AttendenceUI` |
| `vocabStore.ts` | Async cache of theme vocabulary JSON files; `useThemeVocab()` hook |

### Theme System
- Every visual asset lives in `public/assets/themes/[theme-name]/[page]/`
- CSS variables drive all theming; switching themes is a DOM attribute change — no React re-render
- `usePageBackground(page)` hook probes `background.png` and applies it as `body.style.backgroundImage`
- Performance tier controls sprite rendering and animations via `[data-performance]` CSS selectors
- `src/lib/skinInjection.ts` applies equipped shop skins (colour schemes, themes) at login and on equip

### API Layer
- **Apollo Client** with in-memory cache; all GraphQL queries/mutations go through `/graphql` (Vite proxy → `localhost:4000`)
- No REST calls from the frontend except file upload (`POST /upload`) and analytics export (`GET /analytics/export`)

### Rendering Notes
- **9-slice scaling** via CSS `border-image` for pixel-art frames and buttons
- `image-rendering: pixelated` on `<html>` for crisp pixel art at any DPI
- Autofill-proof inputs: background image on wrapper `<div>`, not on `<input>`

---

## 2. Middleware (Linking Segment)

### GraphQL API — Apollo Server v5
- `typeDefs.ts` + `resolvers.ts` — single schema, ~50+ queries and mutations
- `expressMiddleware` integration with Express 5 (`@as-integrations/express5`)
- JWT extracted from `Authorization: Bearer <token>` header in every request context
- Role guards: `requireRole(ctx, role)` helper used throughout resolvers

### Authentication
- **JWT** — signed with `JWT_SECRET` from `.env`; decoded on every request; stored in browser `sessionStorage` as `sl_token`
- **LTI 1.3** — DB tables provisioned (`migrate_lti.sql`); protocol implementation is a future phase

### REST Endpoints (Express)
| Endpoint | Description |
|---|---|
| `POST /upload?taskId=<uuid>&folder=<name>` | File upload via Multer; stores to `backend/uploads/tasks/<taskId>/<folder>/`; returns `{ path, originalName }` |
| `GET /uploads/*` | Static file serving for uploaded assets |
| `GET /analytics/export?classId=<uuid>&format=csv\|json` | xAPI activity export; requires Teacher/Admin JWT; CSV or JSON output |

### Real-Time Strategy
- **Apollo polling** — not Socket.io. Live features (teacher dashboard, chat, staffroom) use short-interval `pollInterval` on Apollo `useQuery`:
  - Teacher dashboard learner grid: 5 s
  - Group chat (Phase III): 4 s
  - Staff chat: 5 s
  - Register chat: 4 s
  - Announcements: 10–30 s
- Socket.io was originally planned but was not implemented — polling on school Wi-Fi is simpler and sufficient for class sizes.

### Caching — Redis (optional)
- `backend/src/lib/cache.ts` — `ioredis` client with 2 000 ms connect timeout and graceful fallback
- If Redis is unreachable at startup: all cache ops silently no-op; app behaves identically
- Cached queries and TTLs:
  | Query | Cache key | TTL |
  |---|---|---|
  | `teacherClasses` | `tc:<userId>` | 30 s |
  | `myConversations` | `convs:<userId>` | 5 s |
  | `conversationMessages` | `msgs:<convId>:<userId>:<limit>:<offset>` | 4 s |
- Write mutations invalidate relevant keys immediately (`cacheDel` / `cacheDelPattern`)

---

## 3. Data Vault (Storage Segment)

### Primary Database — PostgreSQL 16
- Deployed locally; production target is managed PostgreSQL (Supabase or equivalent)
- **Connection:** `postgresql://postgres:1234@localhost:5432/stella_logos`
- All tables, indexes, and triggers defined in `backend/src/db/schema.sql`
- Incremental features added via numbered migration files (all `IF NOT EXISTS` — safe to re-run)

### Schema Summary

| Table group | Tables | Migration |
|---|---|---|
| Institutional core | `users`, `register_classes`, `academic_classes`, `enrollments` | `schema.sql` |
| Quest state | `learner_progress`, `activity_logs` | `schema.sql` |
| Economy | `shop_items`, `learner_inventory`, `points_ledger` | `migrate_shop.sql`, `migrate_ledger.sql` |
| Messaging | `conversations`, `conversation_participants`, `group_chat_metadata`, `messages`, `message_read_status` | `migrate_messages.sql` |
| Register period | `register_entries`, `register_chat_messages`, `notices` | `migrate_register.sql` |
| Staffroom | `staff_messages`, `announcements`, `staffroom_state` | `migrate_staffroom.sql` |
| Learning tasks | `learning_tasks`, `task_step_blocks`, `task_blocks` | `migrate_learning_tasks.sql`, `migrate_hql_step_blocks.sql`, `migrate_dynamic_steps.sql` |
| Cooperative groups | `task_groups`, `task_group_members` | (in `schema.sql`) |
| LTI 1.3 | `lti_platforms`, `lti_deployments`, `lti_user_links`, `lti_grade_passback` | `migrate_lti.sql` |

### xAPI Logging
- `activity_logs` table stores JSONB xAPI statements
- `log_marker_movement()` PL/pgSQL trigger fires on every `UPDATE` of `learner_progress.current_step` — no application-layer code needed
- Analytics export available via `GET /analytics/export` (REST) and `activitySummary(academicClassId)` (GraphQL)

### LTI 1.3 (Institutional Interop)
- DB tables provisioned and indexed — `migrate_lti.sql`
- Platform registration, deployment tracking, user SSO linking, grade passback records
- Full LTI 1.3 protocol handshake (OIDC + JWT + AGS) is a future implementation phase

### Row-Level Security (RLS)
- `PaidStatus` paywall enforced at DB level — unpaid learners are physically rejected from curriculum data, not just hidden in the UI

### Atomic Transactions
- Shop purchases: `BEGIN/COMMIT/ROLLBACK` — balance deduction + inventory grant are atomic
- Points ledger row inserted in the same transaction as the balance change

---

## Migration Run Order

After applying `schema.sql`, run migrations in this order:

```powershell
$env:PGPASSWORD = "1234"
$psql = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
$db   = "-h localhost -p 5432 -U postgres -d stella_logos"

& $psql $db -f backend/src/db/migrate_shop.sql
& $psql $db -f backend/src/db/migrate_messages.sql
& $psql $db -f backend/src/db/migrate_register.sql
& $psql $db -f backend/src/db/migrate_staffroom.sql
& $psql $db -f backend/src/db/migrate_learning_tasks.sql
& $psql $db -f backend/src/db/migrate_hql_step_blocks.sql
& $psql $db -f backend/src/db/migrate_dynamic_steps.sql
& $psql $db -f backend/src/db/migrate_ledger.sql
& $psql $db -f backend/src/db/migrate_lti.sql
```

See `docs/runningProject.md` for the full launch procedure.

---

## Why This Stack Wins in 2026

- **Low latency** — Vite + GraphQL means the UI feels instant even on 3G school Wi-Fi; Apollo polling avoids WebSocket complexity for the session sizes involved
- **Scalability** — PostgreSQL + optional Redis can handle hundreds of simultaneous learners; caching layer activates without code changes when Redis is available
- **Modular branding** — theme-folder system lets the entire UI be reskinned (cyberpunk IT → medieval history) by swapping one folder of PNG assets and one CSS variable block
- **Institutional portability** — LTI 1.3 tables and xAPI logging are already in place; connecting to Canvas, Moodle, or Google Classroom requires only the handshake implementation, not a schema redesign
