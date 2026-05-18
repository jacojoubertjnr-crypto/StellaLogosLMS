# Stella Logos LMS — Claude Instructions

## On Every New Session

1. Read `docs/projectDescription.md` — full product vision and pedagogy model.
2. Read `docs/architecture.md` — the 3-segment tech stack (Frontend / Middleware / Data Vault).
3. Read `docs/runningProject.md` — full launch procedure (PostgreSQL + backend + frontend).
4. Read `README.md` — project structure, component guide, and dev launch instructions.
5. Launch the backend via `Start-Process cmd` (PowerShell execution policy blocks npm.ps1 — never use `npm run dev` directly in PowerShell).
6. Launch the frontend via `Start-Process cmd` from the project root (Vite on port 5173 — may use 5174/5175 if taken).

## Launching the Project

> Full launch procedure (PostgreSQL → backend → frontend), psql credentials, and one-time DB setup steps are in **`docs/runningProject.md`**. Read that file before starting any servers.

Key reminders:
- PowerShell execution policy blocks npm.ps1 — always use `Start-Process cmd` for dev servers, or `cmd /c "..."` for one-off scripts like `npm run db:seed`.
- psql credentials: host `localhost`, port `5432`, db `stella_logos`, user `postgres`, password `1234`.
- psql binary: `C:\Program Files\PostgreSQL\16\bin\psql.exe` — set `$env:PGPASSWORD = "1234"` before calling it in PowerShell.

## Login Credentials
Use the full email address — the form does not accept short usernames:

| Role | Email | Password |
|---|---|---|
| Learner | `learner@stellalogos.dev` | `learner1234` |
| Teacher | `teacher@stellalogos.dev` | `teacher1234` |
| Admin | `admin@stellalogos.dev` | `admin1234` |

## Key Facts

- Stack: React + Vite, Tailwind CSS, Zustand, TypeScript (frontend) + Apollo Server 5, Node.js, PostgreSQL (backend).
- Theme system: each theme lives in `public/assets/themes/[theme-name]/` with per-page subfolders and shared root assets.
- State: Zustand stores — `themeStore.ts`, `authStore.ts`, `questStore.ts`, `musicStore.ts`, `entryStore.ts`.
- Auth: JWT stored in `sessionStorage` (`sl_token`). Login hits the real GraphQL API — no hardcoded demo credentials.
- Phases complete: 1 (Login), 3 (Auth/Backend), 4 (Learner screens), 5 (Teacher dashboard + Register UI + Hub + Staffroom + Task Designer + Admin UI + Theme Adder), 5b (Grouping engine), 6 (Shop), 7 (Backend data layer), 9 (Messaging), CSS Architecture Polish. Next: Phase 2 (Sci-Fi theme assets) or Phase 8 (Polish & Launch).
- Theme system: `medieval` is a **purchasable** theme (not a built-in fallback). `default` is CSS-variables-only — no asset files. Missing theme assets degrade gracefully to CSS; no fallback to another theme's files.
- Page backgrounds are probed as `background.png` (not `bg.png`). Custom themes uploaded via Theme Adder now save as `background.png` (fixed in `backend/src/index.ts` ASSET_MANIFEST).
- Theme Designer (`/theme-adder`) supports both CREATE NEW and EDIT EXISTING modes. Edit mode pre-loads asset status and colour palette from the DB.
- Custom themes (via Theme Adder) use a simplified asset set: banner, button, music, 7 page backgrounds, and 3 sprite types per page (static/moving/clickable). No frame_main, input_box, or ambient_sprite — custom themes use `--color-pane-bg` (opaque solid) for panels instead.
- CSS variables: `--color-pane-bg` (`rgba(0,0,0,0.62)` base — semi-transparent so theme backgrounds show through; `rgba(0,0,0,0.45)` on default theme) and `--color-modal-bg` (`rgba(8,8,8,0.97)` base — fully opaque; `rgba(12,26,46,0.97)` navy on default). All panels and modals use these — no hardcoded warm-brown backgrounds remain.
- Full roadmap: `docs/ROADMAP.md`.
