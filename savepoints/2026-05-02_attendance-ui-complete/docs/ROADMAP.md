# Stella Logos — Project Roadmap

> Update this file as features are completed. Mark items `[x]` when done and add a short note if relevant.

---

## Phase 1: Login Screen ✅ COMPLETE

### Theme System
- [x] Vite + React + TypeScript project setup
- [x] CSS variable theming system (`data-theme` on `<html>`)
- [x] Three theme slots registered: `medieval`, `scifi`, `modern`
- [x] Theme switcher buttons (styled as wooden plaques)
- [x] Performance tier system (High/Low via Network Information API)

### Medieval Theme Assets
- [x] Background scene (`bg.png`) — pixel art landscape with tree and castle
- [x] Banner top (`banner_top.png`) — wooden plank with Stella Logos sign
- [x] Parchment scroll frame (`frame_main.png`) — Celtic-bordered scroll
- [x] Primary button (`btn_primary.png`) — stone button
- [x] Ambient sprites (`ambient_sprite.png`) — tree left / castle right bookends
- [x] Input box (`input_box.png`) — dark wooden themed input background

### Sprite System
- [x] `SpriteManager` component — reads per-page `sprites.json` manifest (`page` prop selects folder)
- [x] Anchor system: `background`, `top_header`, `safe_zone`
- [x] Performance tier filtering (sprites marked `"high"` only render on High tier)
- [x] GIF → PNG fallback chain with error guard
- [x] `frame_loop` movement type — `LoopingSprite` component for fixed-position frame cycling
- [x] `random_flight` movement type — `AnimatedSprite` component with yMin/yMax clamping
- [x] `linear_drift` movement type — CSS keyframe animation for clouds
- [x] Torch sprites on `top_header` anchor with staggered frame-cycle delay
- [x] Per-page asset folders: `sprites/stationary/` and `sprites/moving/` subfolders
- [x] All sprite manifests scoped to their page (`login/sprites.json`, `home/sprites.json`, etc.)

### Mini-Game
- [x] Animated creature (dove — login, rabbit — home) with click interaction
- [x] Click creature → `clicked.png` shown for 0.9s → respawns / continues run
- [x] `+1` score popup animation on click (dove/AnimatedSprite)
- [x] Frame animation resumes mid-cycle after click (no restart)

### Login Form
- [x] `ThemedInput` component with `input_box.png` background
- [x] Username / Password fields with placeholder text
- [x] Input focus state: soft golden glow + warm background tint
- [x] LOGIN button — wider, 9-slice scaled, centered
- [x] Error message on bad credentials
- [x] VT323 pixel font (Google Fonts) applied to headings, inputs, button

### Layout & Responsiveness
- [x] Full-width banner pinned behind theme switcher (z-index layering)
- [x] Parchment scroll centered in viewport below banner
- [x] Responsive breakpoints at 640px and 480px
- [x] `safe-zone--below-banner` class with media query overrides

---

## Phase 2: Sci-Fi & Modern Themes 🔲 TODO

Each theme follows the per-page folder convention. See `docs/THEME_IMPLEMENTATION.md` for the full spec.

- [ ] Create `scifi/` theme — shared root assets:
  - [ ] `banner_top.png` — holographic header bar
  - [ ] `frame_main.png` — terminal / hologram panel
  - [ ] `btn_primary.png` — neon button
  - [ ] `ambient_sprite.png` — robot / spaceship side elements
  - [ ] `input_box.png` — neon-bordered input
- [ ] Create `scifi/login/background.png` — dark space / cyberpunk cityscape
- [ ] Create `scifi/home/background.png` — distinct home scene
- [ ] Create scifi sprites in `scifi/login/sprites/` and `scifi/home/sprites/`
- [ ] Create `modern/` theme folder (clean flat design), same structure
- [ ] Add `modern` button to the theme switcher in `App.tsx`
- [ ] Verify all three themes switch cleanly with no missing assets

---

## Phase 3: Authentication ✅ COMPLETE

- [x] Build GraphQL middleware (Node.js + Apollo Server v5, standalone)
- [x] `LOGIN` mutation connected to real credentials
- [x] JWT token returned and stored (sessionStorage)
- [ ] LTI 1.3 SSO integration for school single sign-on (deferred to Phase 7)
- [x] Replace demo `learner / quest` credentials with real auth flow
- [x] Show meaningful error messages from API (not hardcoded)
- [x] PostgreSQL schema — Users, Classes, Enrollments, Learner_Progress, Activity_Logs, Shop_Items, Inventory
- [x] PL/pgSQL trigger — auto-logs every step movement as xAPI statement
- [x] Row-Level Security — PaidStatus paywall at DB level
- [x] React Router — `/` login, `/home` protected route, `ProtectedRoute` guard
- [x] Seed script — Admin, Teacher, Learner users + sample class

---

## Phase 4: Learner Screens ✅ COMPLETE (UI shell)

### HomeCrossroads [The Town Square] — Level 1 Hub
- [x] `HomeCrossroads` component with full layout
- [x] `HomeCrossroadsHeader` — UserIdentity [The Knight's Crest] + CurrencyCounter [The Gold Pouch] + Logout
- [x] `GreatPortal` [The Great Portal] — primary action button with step-dot progress indicator
- [x] `UtilityGrid` — 4 stone-button tiles: Register, My Subjects, Messages, Shop
  - [x] Tiles show standard names; themed names appear as CSS-only hover tooltip
- [x] `usePageBackground('home')` hook — probes `home/background.png`, falls back to CSS var
- [x] `RunningRabbit` — rAF-based sprite runs left→right along bottom, V-path, click interaction
  - [x] Sprite loaded from `home/sprites/moving/rabbit/` — silently absent if frames missing
  - [x] Appears from rocks position, fades into burrow before right edge, repeats every 14 s
- [x] Two drifting cloud images from `home/sprites/moving/cloud_drift.png` (very slow right→left)
- [x] `banner_home.png` wooden plank header bar
- [x] All data served from `mockState.ts` — no DB calls on this screen
- [x] `theme_map.txt` — standard → themed name registry per theme folder
- [x] `NAMING_CONVENTION.md` — `Functional [Aesthetic]` naming pattern documented

### LearningTaskEngine [The Quest Path] — Level 3
- [x] `QuestScreen` with visual progress path (`QuestPath`)
- [x] Step circles — pulsing glow on active step, ✓ for completed, locked state
- [x] `StepPanel` — step title, "COMPLETE STEP" button, locked guard
- [x] `QuestCompletePanel` — framer-motion scale animation
- [x] `PointsPopup` — AnimatePresence floating "+N PTS" reward
- [x] `ClassTabs` — multi-class selector (hidden when only one class)
- [x] GraphQL: `myProgress` query + `advanceStep` mutation (10 pts/step + 50 bonus)
- [x] `questStore.ts` — Zustand store combining `myProgress` + `me` in one query
- [x] Wait-state guard — locked steps cannot be advanced

### AttendenceUI [The Tavern] — Level 2
- [x] `TeacherTicker` — scrolling marquee notice bar; click → scale-in modal with full notice cards
- [x] `SmartContainer` — accordion-style overlay (fixed-position full-frame modal, AnimatePresence)
- [x] `entryStore.ts` — Zustand accordion (one section open at a time); sections: `timetable`, `chat`
- [x] Fireplace sprite — `SpriteManager` reads `attendence/sprites.json`; position/size tunable via JSON
- [x] **Multi-day timetable navigation** — ◀/▶ arrows, views today + 9 future school days
  - [x] Academic day number display (10-day cycle; Monday 27 Apr 2026 = Day 1 reference)
  - [x] `getAcademicDay()` — counts school days from reference, applies modulo 10
  - [x] `getSchoolDay(index)` — skips weekends when projecting future dates
- [x] **Assessment Due column** — amber highlight for pending tasks, green for submitted
  - [x] Clickable rows open `TaskDetailModal` (zIndex 80, above SmartContainer overlay)
  - [x] `TaskDetailModal` — status badge, description, instructions list, submission/marks meta, "HAND IN ASSIGNMENT" button
- [x] **Class Roster merged into Class Chat** — roster strip (4-col grid, presence dots) pinned above scrollable messages
- [x] **GO TO LESSON** row — styled as SmartContainer bar, navigates to `/quest`
- [x] Daily check-in button with streak counter
- [x] `mockFutureTimetables` — 9 future timetable entries in `mockState.ts`
- [x] `mockAssessmentSchedule` — keyed `"day-period"`, contains `{ label, taskId }`
- [x] `LearningTaskDetail` interface + `mockLearningTaskDetails` — 7 task entries (IT, Geo, Math, LO, CAT, Eng, Afr)

### AssignmentSubmitUI [Submission Portal]
- [x] Route `/submit/:taskId` — reads `taskId` from URL params
- [x] Task identity card (subject, title, submission type, total marks)
- [x] Placeholder form — file upload zone, comments textarea, disabled submit button
- [x] "BACK TO TAVERN" button → `/attendence`
- [x] Reuses `attendence` page background until dedicated asset is made

### Page Entrance Animations
- [x] All learner pages use `motion.div` with `initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}` — consistent fade+slide-up entrance

### Background Preloading
- [x] `useBackgroundPreloader.ts` hook — dual-strategy preloader
  - [x] **High tier** (4G): preloads all 6 page backgrounds immediately on mount (`home`, `mySubjects`, `attendence`, `shop`, `messages`, `learningTask`)
  - [x] **Low tier** (3G/saveData): preloads only on hover via `preloadPage(page)` callback
  - [x] Module-level `Set` deduplicates — no double-fetching regardless of which path triggers first
  - [x] `ProtectedLayout` calls hook for upfront High-tier preload
  - [x] `HomeCrossroads` wires each `UtilityTile.onMouseEnter` and GreatPortal hover to `preloadPage`

### Visual Polish
- [x] Themed scrollbars — gold thumb / dark track (`globals.css`, webkit + Firefox `scrollbar-color`)
- [x] `CurriculumNavigator` tape scroll — smoothed to 560ms with expo-out ease `[0.22, 1, 0.36, 1]`

### AppHeader Fixes
- [x] `/submit/:taskId` dynamic route — segment extraction (`pathname.split('/')[1]`) maps to `attendence` banner

### Level 2 Screens (Placeholders)
- [x] `CurriculumNavigator` [The Royal Library] (`/library`) — 3 subject cards, animated progress bars
- [x] `ShopUI` [The Merchant's Stall] (`/shop`) — placeholder, Phase 6; page folder `shop/` scaffolded
- [x] `SocialUI` [The Messenger Bird] (`/social`) — placeholder, Phase 5

### Theme Music System
- [x] `musicStore.ts` — Zustand store wrapping a module-level `HTMLAudioElement` singleton
- [x] `ThemeMusicController` — mounted once in `<BrowserRouter>`, manages all playback
  - [x] Loads `theme.wav` from active theme folder on mount/theme change
  - [x] Fades in (0.8 s) on `/` and `/home` routes; fades out (1.5 s) on all others
  - [x] Browser autoplay policy handled: `needsGesture` state + one-time click resume
- [x] `MusicToggle` — ♪/♩ button; `fixed` variant (login, bottom-right) and `inline` variant (home header)
- [x] Spec files: `public/assets/themes/medieval/music/theme.wav.txt`

### Bug Fixes
- [x] Input box fallback background-color so inputs are visible when `--theme-input-box` is unset on first paint
- [x] `-webkit-autofill` override prevents browser autofill from clearing the themed input background

---

## Phase 5: Teacher Dashboard (Theater Mode) 🔲 TODO

- [ ] Grid Monitor — live progress bars for every student in class
- [ ] Pulsing/highlighted indicators for stuck students
- [ ] Active messaging panel — tiled chat windows per student
- [ ] Filter students by current step or help-request flag
- [ ] Socket.io real-time sync between teacher and learner views
- [ ] Teacher can "unlock" a learner's next step from the dashboard

---

## Phase 6: Virtual Economy & Asset Shop 🔲 TODO

- [ ] `PointsBalance` tracked per learner in the database
- [ ] Milestone rewards: completing a step awards points (+ "cha-ching" animation)
- [ ] Asset shop UI — learner browses cosmetic skins
- [ ] Purchasing a skin updates CSS variables for that learner's interface
- [ ] Skin types: badges, avatars, profile themes
- [ ] Economy ledger — full history of earned and spent points

---

## Phase 7: Backend Data Layer 🔲 TODO

- [ ] PostgreSQL schema — Users, Classes, Enrollments, Steps, Transactions
- [ ] xAPI logging — every step movement logged as a standard statement
- [ ] Redis caching — active session data and messaging state
- [ ] LTI 1.3 compliant tables for grade passback and SSO
- [ ] Analytics export for institutional reporting

---

## Phase 8: Polish & Launch 🔲 TODO

- [ ] Replace all placeholder `.txt` asset files with real pixel art
- [ ] WebP conversion + PNG optimisation for all theme assets
- [ ] Lazy-load theme assets on demand (preload next theme during transition)
- [ ] Full WCAG 2.1 accessibility audit
- [ ] Lighthouse performance audit (target FCP < 1.5s)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile device testing (iOS Safari, Android Chrome)
- [ ] Production build + deployment pipeline

---

## Notes

- All placeholder assets are documented with `.txt` spec files alongside them in the theme folders.
- To run the dev server see `docs/runningProject.md`.
- For theme asset specifications see `docs/THEME_IMPLEMENTATION.md`.
- For full architecture overview see `docs/FRONTEND_ARCHITECTURE.md`.
- **Naming convention:** All components follow the `Functional [Aesthetic]` pattern. See `docs/NAMING_CONVENTION.md` for the full legend and AI agent instructions.
