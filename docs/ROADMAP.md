# Stella Logos — Project Roadmap

> Update this file as features are completed. Mark items `[x]` when done and add a short note if relevant.

---

## Phase 1: Login Screen ✅ COMPLETE

### Theme System
- [x] Vite + React + TypeScript project setup
- [x] CSS variable theming system (`data-theme` on `<html>`)
- [x] Three theme slots registered: `medieval`, `scifi`, `default` (was `modern` — renamed)
- [x] Theme switcher buttons (styled as wooden plaques) — moved from `App.tsx` into `MedievalLoginScreen.tsx`; single fixed top-right position (no duplicate switcher on banner overlay)
- [x] Theme jump fix: banner probe immediately clears for `default` theme (CSS-only, no image), waits for image probe on other themes — eliminates layout flash on theme switch
- [x] CSS `transition: padding-top 0.2s ease` on `.safe-zone` — smooths the vertical shift when banner appears/disappears
- [x] Performance tier system (High/Low via Network Information API)
- [x] `data-theme` and `data-performance` set synchronously at module load in `themeStore.ts` AND hardcoded in `index.html` — eliminates CSS variable flash on first paint

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
- [x] `AnimatedSprite` directional flip: sprite mirrors horizontally (`scaleX(-1)`) when flying left; uses `posRef` to avoid stale closure in interval
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
- [x] LOGIN button — wider, 9-slice scaled, centered; base `.btn-9slice` is `width: 100%; align-self: stretch` (theme overrides visual only)
- [x] Error message on bad credentials
- [x] VT323 pixel font (Google Fonts) applied to headings, inputs, button
- [x] Autofill-proof input box: `input_box.png` applied to `.input-frame-wrap` wrapper div (not the `<input>`); `<input>` is `background: transparent !important`; autofill uses `transition: background-color 9999s` delay trick
- [x] Dev quick-fill buttons below the form — LEARNER / TEACHER / ADMIN chips fill credentials on click; login still requires pressing LOGIN (remove before production)
- [x] USERNAME/PASSWORD label color set to `var(--color-text)` (changed from `var(--color-accent)`) for readability on parchment
- [x] Banner probe `useEffect` resets `bannerSrc` to `null` on theme change — prevents layout flash before new banner loads

### Layout & Responsiveness
- [x] Full-width banner pinned behind theme switcher (z-index layering)
- [x] Parchment scroll centered in viewport below banner
- [x] Responsive breakpoints at 640px and 480px
- [x] `safe-zone--below-banner` class with media query overrides

---

## Phase 2: Sci-Fi Theme Assets 🔲 TODO

The `default` theme (previously `modern`) is already registered as a valid theme slot with a CSS panel fallback — it needs real pixel assets. The `scifi` theme needs assets from scratch. Theme switcher buttons live in `MedievalLoginScreen.tsx`. See `docs/THEME_IMPLEMENTATION.md` for the full spec.

- [ ] Create `scifi/` theme — shared root assets:
  - [ ] `banner_top.png` — holographic header bar
  - [ ] `frame_main.png` — terminal / hologram panel
  - [ ] `btn_primary.png` — neon button
  - [ ] `ambient_sprite.png` — robot / spaceship side elements
  - [ ] `input_box.png` — neon-bordered input
- [ ] Create `scifi/login/background.png` — dark space / cyberpunk cityscape
- [ ] Create `scifi/home/background.png` — distinct home scene
- [ ] Create scifi sprites in `scifi/login/sprites/` and `scifi/home/sprites/`
- [ ] Create `default/` theme pixel assets (clean flat design), same folder structure
- [ ] Verify all three themes (`medieval`, `scifi`, `default`) switch cleanly with no missing assets

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
- [x] `AuthUser` interface extended with `email` field; `LOGIN_MUTATION` returns `email` — needed for dev group role lookup in Phase III
- [x] Dev learner accounts — `learner2–4@stellalogos.dev` added to DB (same password `learner1234`), enrolled in both academic classes, `learner_progress` records at step 0
- [x] `DEV_GROUP` constant in `LearningTaskUI.tsx` maps all 4 learner emails to fixed cooperative roles for dev purposes

---

## Phase 4: Learner Screens ✅ COMPLETE (UI shell)

### HomeCrossroads [The Town Square] — Level 1 Hub
- [x] `HomeCrossroads` component with full layout
- [x] `HomeCrossroadsHeader` — UserIdentity [The Knight's Crest] + CurrencyCounter [The Gold Pouch] + Logout
- [x] `GreatPortal` [The Great Portal] — primary action button with step-dot progress indicator
  - [x] Portal label uses `vocab.actionVerbStart` / `vocab.actionVerbContinue` prefix from theme vocab
  - [x] Step 0 meta line shows "NOT STARTED" instead of "Step 0 of N"
  - [x] Clicking portal: clears `sessionStorage` task phase key, calls `setDevFreshStart(true)`, navigates to `/learningtask` — learner always enters LT1 from Step 1
- [x] `UtilityGrid` — 4 stone-button tiles: Attendance, My Subjects, Messages, Shop
  - [x] Tiles show standard names; themed names from vocab appear as CSS-only hover tooltip
  - [x] All four `themeName` props use vocab keys (`vocab.tileAttendance`, `vocab.tileSubjects`, `vocab.tileMessages`, `vocab.tileShop`)
- [x] `usePageBackground('home')` hook — probes `home/background.png`, falls back to CSS var
- [x] `RunningRabbit` — rAF-based sprite runs left→right along bottom, V-path, click interaction
  - [x] Sprite loaded from `home/sprites/moving/rabbit/` — silently absent if frames missing
  - [x] Appears from rocks position, fades into burrow before right edge, repeats every 14 s
- [x] Two drifting cloud images from `home/sprites/moving/cloud_drift.png` (very slow right→left); images probed before render (`cloudExists` state, `onError` removed)
- [x] `banner_home.png` wooden plank header bar
- [x] All data served from `mockState.ts` — no DB calls on this screen
- [x] `theme_map.txt` — standard → themed name registry per theme folder
- [x] `NAMING_CONVENTION.md` — `Functional [Aesthetic]` naming pattern documented

### LearningTaskEngine [The Quest Path] — Level 3
- [x] `QuestScreen` with visual progress path (`QuestPath`)
- [x] Step circles — pulsing glow on active step, ✓ for completed, locked state
- [x] `StepPanel` — step title + description from `task_info.json`, "START LEARNING TASK →" button, locked guard
  - [x] **COMPLETE STEP button removed** — learners must complete the actual LearningTaskUI flow to advance (no manual skip)
  - [x] Fetches `/assets/learning-tasks/LearningTask{n}/task_info.json` per active step; displays `title` and `description`
  - [x] Step label uses `vocab.taskNumberLabel(stepNumber, totalSteps)` from theme vocab
  - [x] Step fallback title uses `vocab.stepFallbackTitle(n)` when no `task_info.json` exists
  - [x] Task description suffix uses `vocab.taskDescSuffix`
- [x] `QuestCompletePanel` — framer-motion scale animation; uses `vocab.taskCompleteTitle` and `vocab.taskCompleteBody`
- [x] `HeaderBar` — `◂ HOME` button added to left side; navigates to `/home`
- [x] `PointsPopup` — AnimatePresence floating "+N PTS" reward; uses `vocab.currencyLabel`
- [x] `ClassTabs` — multi-class selector (hidden when only one class)
- [x] GraphQL: `myProgress` query + `advanceStep` mutation (10 pts/step + 50 bonus)
- [x] `questStore.ts` — Zustand store combining `myProgress` + `me` in one query
  - [x] `devFreshStart` flag — when set, `fetchProgress()` overrides all `currentStep` to 0 after fetching; `setDevFreshStart(true)` immediately zeros progresses in store to avoid stale render
- [x] Wait-state guard — locked steps cannot be advanced
- [x] "START LEARNING TASK →" button in `StepPanel` — navigates to `/task?classId=X&step=Y`

### LearningTaskUI [The Cooperative Quest] ✅ COMPLETE
Route: `/task?classId=<uuid>&step=<n>` — entered from `QuestScreen`'s step panel.

- [x] **Phase I — Metacognitive Scaffold**: challenge video panel + written scenario; four mandatory questions (problem / criteria / solution / audit); unlock gate requires min. 10 chars per answer
- [x] **Phase II — Content Mastery & Blind Quiz**: Resource Hub tab (PDF + VIDEO tiles); 20-question blind quiz with shuffled option order; no marks shown on submission
  - [x] **One-at-a-time quiz** — single question shown per screen with Back/Next/Submit navigation; dot-strip progress indicator; auto-advance 350 ms after answering; AnimatePresence slide transition between questions
- [x] **Phase III — Cooperative Discussion**: role selection screen (Leader, Timer, Scribe, Angle Checker, General Learner); five distinct role panels:
  - Leader: Next Question control, distribution chart, 20 s Participation Pulse, Prompter icons
  - Timer: private countdown, Divide Time, 30 s Time Status pulse, Move On Alert
  - Scribe: Capture icons on chat messages, Notebook with drag-reorder (▲/▼), draft area, Final Solution phase trigger
  - Angle Checker: Anti-Groupthink Triad (3 mandatory buttons), 30 s Perspective Pulse
  - General Learner: pushed question view, side-by-side own answer vs group distribution, Keep / Change intent toggle
  - [x] **Dev group auto-assignment** — `DEV_GROUP_ROLE_MAP` maps 4 learner emails to fixed roles (leader, timer, scribe, angle-checker); `useEffect` auto-assigns on Phase III entry; CHANGE ROLE button still available for manual override
  - [x] Group member strip in Phase III — shows all 4 dev group members with icons, names, role labels; current user highlighted gold
  - [x] **QuizReview — leader-synced** — `QuizReview` component (shared across all roles, collapsible) now receives `currentQuestion` from the parent; independent PREV/NEXT navigation removed; dot strip is display-only; shows "Waiting for the Leader to start the discussion..." when `currentQuestion === 0`; Leader advances everyone's view via the existing "NEXT QUESTION ▶" button in `LeaderPanel`
  - [x] **QuizReview — two-column layout** — question+options on left (`flex: 3`), KEEP/CHANGE decision panel on right (`flex: 2`); decision panel has large icon buttons (✓ green / ↻ amber) that fill the full column height; `maxWidth: 'none'` inline override on `.frame-parchment` so the panel spans full page width matching the role panels below
- [x] **Phase IV — Recalibration Quiz**: questions and options reshuffled; Phase III keep/change intents pre-loaded as visual hints
- [x] **Phase V — Final Artifact Submission**: Video / PDF / Document type selector, file drop zone, quest-complete celebration
- [x] `p3Intents` bug fixed — `LearnerPanel` now passes intents up via `onIntent` callback; Phase IV receives real data
- [x] Phase persistence fixed — `/task` always opens at Phase 1 on entry; `sessionStorage` read removed from mount initialiser so returning to the portal never drops a learner mid-flow
- [x] `AppHeader` banner map includes `/task → learningTask`

### Learning Task Content Folder
- [x] `public/assets/learning-tasks/LearningTask1/` — content scaffold for first live task
  - `RLC/` — drop `challenge_video.mp4` here (Phase I scenario video)
  - `Content/` — drop `content_video.mp4` + `content_document.pdf` here (Phase II Resource Hub)
  - `Quiz/` — drop `quiz_reference.pdf` here (teacher mark scheme / Phase II reference)
- [ ] Wire `LearningTaskUI` to read real assets from this folder (replace hardcoded `CHALLENGE_SCENARIO` text and `RESOURCES` array)

### Theme Vocabulary System ✅ COMPLETE
All UI copy that varies by theme is driven by JSON files — no hardcoded aesthetic strings in TypeScript.

- [x] `public/assets/themeVocabulary/` folder — one JSON file per theme (`default.json`, `medieval.json`, `scifi.json`)
  - [x] `_keys.txt` — documents all keys and their purpose for content editors
  - [x] Keys cover: `currencyLabel`, `actionVerbStart/Continue`, `taskNumberTemplate`, `taskCompleteTitle/Body`, `taskDescSuffix`, `stepFallbackTemplate`, `stepTitles`, `tileAttendance/Subjects/Messages/Shop`, `attendancePage*/CheckIn*/Return*`, `subjectsPage*/Count*/Return*`, `messagesPage*/Return*`, `shopPageTitle`
- [x] `src/lib/themeVocabulary.ts` — `ThemeVocab` interface (parsed functions), `RawVocab` interface (JSON shape), `parseRawVocab()`, `FALLBACK_VOCAB` (mirrors default.json, used before async fetch completes)
- [x] `src/stores/vocabStore.ts` — Zustand store; `ensureLoaded(theme)` fetches + parses JSON; `getVocab(theme)` returns cached result or fallback
- [x] `src/hooks/useThemeVocab.ts` — synchronous hook; triggers `ensureLoaded` on theme change; returns `getVocab(currentTheme)`
- [x] Pages wired: `HomeCrossroads`, `QuestScreen`, `AttendenceUI`, `CurriculumNavigator`, `SocialUI`, `AppHeader`

### AttendenceUI [Attendance] — Level 2
- [x] Page title, check-in button, return label all use theme vocab (`vocab.attendancePageTitle`, `vocab.attendanceCheckInLabel`, `vocab.attendanceCheckedInLabel`, `vocab.attendanceReturnLabel`) — no hardcoded medieval strings
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
- [x] **GO TO LESSON** row — styled as SmartContainer bar, navigates to `/learningtask`
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
- [x] Route map updated: `'/subjects'` replaces `'/library'` → `'mySubjects'` page key
- [x] Currency label in header uses `vocab.currencyLabel` instead of hardcoded "GOLD"

### Level 2 Screens
- [x] `CurriculumNavigator` [My Subjects] (`/subjects`) — subject cards with animated progress bars
  - [x] Route renamed from `/library` to `/subjects` (`App.tsx`) — "library" is a medieval-specific term
  - [x] Page title, subject count label, return label all use theme vocab (`vocab.subjectsPageTitle`, `vocab.subjectsCountLabel`, `vocab.subjectsReturnLabel`)
  - [x] Merges live `questStore` progress data onto `mockSubjects` — IT subject reflects real DB step/progress values
- [x] `ShopUI` [Shop] (`/shop`) — fully wired to GraphQL backend; page title uses `vocab.shopPageTitle`; points balance uses `vocab.currencyLabel` (see Phase 6)
- [x] `SocialUI` [Messages] (`/social`) — page title and return label use theme vocab (`vocab.messagesPageTitle`, `vocab.messagesReturnLabel`)

### Theme Music System
- [x] `musicStore.ts` — Zustand store wrapping a module-level `HTMLAudioElement` singleton
- [x] `ThemeMusicController` — mounted once in `<BrowserRouter>`, manages all playback
  - [x] Loads `theme.wav` from active theme folder on mount/theme change
  - [x] Fades in (0.8 s) on `/` and `/home` routes; fades out (1.5 s) on all others
  - [x] Browser autoplay policy handled: `needsGesture` state + one-time click resume
- [x] `MusicToggle` — ♪/♩ button; `fixed` variant (login, bottom-right) and `inline` variant (home header)
- [x] Spec files: `public/assets/themes/medieval/music/theme.wav.txt`

### Bug Fixes & Polish
- [x] `QuestScreen` React hooks violation fixed — `useState`/`useEffect` for `taskInfo` were declared after two conditional early returns; moved all hooks above early returns so `/learningtask` renders correctly (was blank screen)
- [x] Input box fallback background-color so inputs are visible when `--theme-input-box` is unset on first paint
- [x] Autofill-proof input pattern: wrapper div approach + `transition: background-color 9999s` delay trick (replaces inset box-shadow hack)
- [x] CSS architecture standardised: base classes own layout, theme overrides own visuals only
- [x] `.frame-parchment` base padding `3rem 2.5rem 2.5rem`; medieval-specific `5rem` horizontal override to clear scroll border art
- [x] Default theme `.frame-parchment` CSS panel (dark navy); `.btn-9slice` visual-only override — no layout properties

---

## Phase 5: Teacher Dashboard + Register UI ✅ COMPLETE

### Teacher Dashboard — `/home` (Teacher/Admin role)
- [x] `TeacherDashboard` page — "THE WAR ROOM" sticky header, live indicator (5s poll)
- [x] Class tabs — `teacherClasses` query; Admin sees all, Teacher sees own
- [x] Stats bar — enrolled / wait-state / complete counts
- [x] Learner grid — `repeat(auto-fill, minmax(300px, 1fr))`, `gridAutoRows: 160px`; sorted locked-first then step-desc
- [x] Card colour coding — red border (locked/wait-state), green (complete), gold (active)
- [x] **2×2 expandable cards** — click to span 2 cols × 2 rows; semi-transparent overlay closes on click-outside; animated fade+scale (0.7s ease)
- [x] Expanded card — left column: stats + unlock button + quick nudge presets; right column: live `ChatPanel` (LEARNER_MESSAGES, 5s polling, scrollable with `minHeight:0` fix)
- [x] Unlock step — `unlockStep` mutation with refetch; disabled while in-flight
- [x] Quick nudge presets + custom message → `sendToLearner` mutation
- [x] 📋 REGISTER button in header → navigates to `/register`
- [x] Phase 5b preview panel — AUTO-DIVIDE + CUSTOM-DIVIDE (disabled, future scope)

### BroadcastBar — `src/components/BroadcastBar.tsx`
- [x] Mounted between Teacher Dashboard header and class tabs
- [x] Collapsed strip: "📢 BROADCAST TO CLASS", selected count badge, success flash
- [x] Expanded: SELECT ALL chip + individual learner chips (toggleable), message input, SEND TO N/ALL button
- [x] `sendBroadcast(learnerIds, body)` mutation — inserts one 1:1 message per learner; returns count
- [x] Blue colour scheme (rgba(100,160,255,...)) distinct from gold teacher channel

### Teacher Communication Bar — `src/components/TeacherChatBar.tsx`
- [x] Mounted in `ProtectedLayout` — only on lesson routes (`/learningtask`, `/task`, `/submit`)
- [x] `position: fixed, top: 52px` — sits below AppHeader, above theatrical-container; `zIndex: 95`
- [x] Lesson screen content margins bumped from 72px → 108px to clear the bar
- [x] Collapsed: 36px bar, green pulse dot, teacher name, unread badge
- [x] Expanded: scrollable 1:1 message thread, Enter-to-send, auto-scroll on new messages
- [x] `MY_TEACHER_MESSAGES` query (5s polling) — learner sees thread with their subject teacher
- [x] `sendToTeacher` mutation — learner replies appear in teacher's expanded Teacher Dashboard card

### Backend additions (Phase 5)
- [x] `teacherClasses` query — Admin sees all academic classes; Teacher sees own
- [x] `classProgress(academicClassId)` — JOIN to users + academic_classes; returns displayName, email, totalSteps
- [x] `learnerMessages(learnerId)` — teacher fetches 1:1 thread with a specific learner (now uses conversation system)
- [x] `myTeacherMessages` — learner fetches thread with their teacher (now uses conversation system)
- [x] `sendToTeacher`, `sendToLearner` mutations — route through `findOrCreateIndividualConversation` helper
- [x] `sendBroadcast(learnerIds, body)` — creates/reuses a conversation per learner, loops inserts; returns count
- [x] Seed fix — `register_classes.teacher_id` now correctly set to the teacher user on insert

### Register UI — `/register` (Teacher/Admin role)
- [x] `TeacherRegisterUI` page — "📋 REGISTER" sticky header, LIVE indicator, WAR ROOM nav button
- [x] Same `SmartContainer` collapsible sections as learner `AttendenceUI` (same aesthetic, same Framer Motion transitions)
- [x] **Roll Call** — tap learner to cycle `unmarked → present → late → absent`; colour-coded borders; summary strip (present/late/absent/unmarked counts); `markAttendance` upsert mutation
- [x] **Class Chat** — group thread (all learners + teacher); presence roster strip with coloured dots; `sendRegisterChat` mutation; 4s polling; Enter-to-send
- [x] **Notice Board** — compose + post; pin/unpin toggle; delete; pinned notices shown first with 📌 label; `createNotice`, `pinNotice`, `deleteNotice` mutations; 10s polling
- [x] **DISMISS CLASS** button — fires `dismissClass` mutation; posts farewell group chat message; green CTA styling

### New DB tables (Phase 5 — Register Period)
- [x] `register_entries` — `(register_class_id, learner_id, date, status, marked_at)` UNIQUE per class+learner+date; upsert-safe for re-marking
- [x] `register_chat_messages` — `(register_class_id, sender_id, body, sent_at)` group thread; indexed on `(register_class_id, sent_at DESC)`
- [x] `notices` — `(register_class_id, teacher_id, body, pinned, created_at)`

### New GraphQL (Phase 5 — Register Period)
- [x] Queries: `myRegisterClass`, `registerChatMessages(registerClassId, limit)`, `registerNotices(registerClassId)`
- [x] Mutations: `markAttendance`, `sendRegisterChat`, `createNotice`, `pinNotice`, `deleteNotice`, `dismissClass`

---

## Phase 5c: Teacher Hub + Staffroom ✅ COMPLETE (core)

> **Design spec:** `docs/teacherHub.md`

### Routing changes ✅
- [x] `/home` (teacher) → `TeacherHome` page — `HomePage.tsx` role-switches
- [x] `/teacherDashboard` → `TeacherDashboard`; `App.tsx` route added
- [x] `/staffroom` → `StaffroomUI` — live DB-backed staffroom
- [x] `/classes` → `TeacherClassesOverview`
- [x] All internal nav links updated; `AppHeader` banner map updated

### Teacher Hub (`TeacherHome.tsx`) ✅
- [x] LIVE LESSON portal → `/teacherDashboard`
- [x] 4 tiles: STAFFROOM / REGISTER / MESSAGES / MY CLASSES
- [x] `TeacherPlanningHub` collapsible section below tiles (3 tabs — see below)

### Teacher Classes Overview (`TeacherClassesOverview.tsx`) ✅
- [x] Grid of all teacher's classes; each `ClassCard` polls `classProgress` every 10 s
- [x] Progress bar, breakdown chips (ACTIVE / WAIT-STATE / COMPLETE / NOT STARTED)
- [x] "OPEN DASHBOARD →" → `/teacherDashboard?classId=X`; dashboard pre-selects tab via `useSearchParams`
- [x] Expandable learning task list per class card — shows done/next/upcoming tasks
- [x] **Task activation form** — teacher clicks ACTIVATE on the next task; form shows:
  - FORMAT selector: FULL LEARNING TASK (Challenge → Reflection → Content → Quiz → Discussion) or SHORTENED (Content → Quiz only)
  - Live step preview — numbered list updates as format changes
  - INCLUDE FINAL ASSIGNMENT toggle (on by default) — when off, Quiz is the terminal assessment; due date label updates accordingly
  - Due date picker with suggested days from today
  - Enabled steps array (`[1,2,3,4,5,6]` / `[1,2,3,4,5]` / `[3,4,6]` / `[3,4]`) logged to console pending DB wiring
- [x] HQL template steps corrected: CHALLENGE (1) → REFLECTION (2) → CONTENT (3) → QUIZ (4) → DISCUSSION (5) → ASSIGNMENT (6), matching `LearningTaskCreator.tsx` `STEP_LABELS` array
- [x] Wire `handleActivate` to `activateTask` mutation — fully wired; active task banner shown on class card with title + due date

### Staffroom (`StaffroomUI.tsx`) ✅
- [x] **DB**: `staff_messages`, `announcements`, `staffroom_state` — `migrate_staffroom.sql`
- [x] **GraphQL**: `staffMessages`, `speakerMessages`, `allAnnouncements`, `myAnnouncements`, `staffroomState`, `allStaff` queries; `sendStaffMessage`, `createAnnouncement`, `pinAnnouncement`, `deleteAnnouncement`, `assignPodium` mutations
- [x] **Speaker Channel**: podium banner, admin assign/release dropdown, speaker-only input, 5 s polled stream
- [x] **Staff Chat**: roster strip (all staff), scrollable thread with auto-scroll, enter-to-send, 5 s poll
- [x] **Announcements**: create form (textarea + ALL / SELECT GRADES target), list with pin/delete (own = any teacher; others = admin only), 10 s poll
- [x] Learner `AttendenceUI` `TeacherTicker` wired to `myAnnouncements` — grade-filtered, 30 s poll; pinned announcements show 📌 badge and brighter border; empty state shows "No announcements at this time"
- [x] **Layout redesign**: `theatrical-container` + `safe-zone` centered column; sections replaced by `ExpandingCard` inline accordion components (not modal overlays — all sections can be open simultaneously)
- [x] All sections start collapsed; chat thread containers capped at `maxHeight: 280px` with internal scroll
- [x] Scroll fix: root container changed from `minHeight: 100vh` to `height: calc(100vh - 52px)` + `marginTop: 52px` (required because `globals.css` sets `overflow: hidden` on body)
- [x] `◂ HOME` back button at bottom of page

### Teacher Planning Hub (`TeacherPlanningHub.tsx`) ✅ (mock data)
- [x] Collapsible section on `TeacherHome` with 3 tabs
- [x] **TIMETABLE tab**: color-coded class legend; 10-day cycle day navigation (days 1–10); slots sorted by period showing class color, P#, time, Task · Step · N/M indicator, topic; live `→` for real class, DEMO tag for mock classes
  - [x] Week navigation auto-selects Monday (Day 1 or Day 6) when switching weeks
  - [x] Only one arrow shown at a time: ◂ only on week 2 (backward), ▸ only on week 1 (forward)
- [x] **TERM PLAN tab**: grade tabs (GR 9 / GR 10 / GR 11 / GR 12) — term plans are universal per grade, not per class
  - [x] `GRADE_TERM_PLANS` array in `mockPlanningData.ts` replaces per-class `TERM_PLANS`; header shows "GRADE X · SUBJECT NAME"
- [x] **YEAR PLAN tab**: grade selector; year mark formula note; 4 term cards with topics, color-coded assessments (Practical/Test/Project/Exam/PAT), % year contribution, exam flags; NSC-accurate notes for Gr 12
- [x] Mock data covers 7 classes: IT 10A (real DB id), IT 10B, IT 11A, IT 11B, IT 12A, IT 12B (9 periods/cycle each), Robotics Gr 9 (3 periods/cycle)
- [ ] Replace mock data with live DB when learning task designer ships (Phase 5d)

---

## Phase 5d: Learning Task Designer ✅ COMPLETE

Teacher UI for creating, editing, and managing learning tasks. HQL and General templates are both fully wired end-to-end (DB + GraphQL + edit mode).

> **Files:** `src/pages/LearningTaskCreator.tsx`, `src/pages/GeneralTaskCreator.tsx`, `src/pages/TaskPreviewModal.tsx`, `src/pages/LearningTaskManager.tsx`
> **Design spec:** `docs/learningTaskCreationUI.md`

### Template Selector ✅
- [x] Full-screen template selector on first open; two template cards — **HQL** and **GENERAL** — training video placeholder, description, step chip list
- [x] "◂ CHANGE TEMPLATE" button returns to selector without hook order violations (all hooks declared above early returns)

### HQL Task Creator (`LearningTaskCreator.tsx`) ✅ (fully wired end-to-end)

**Architecture:** Dynamic block-based wizard. ORIENTATION step (step 0) + N configurable content steps. Each content step holds any number of typed blocks. Step count, step order, and block contents are all fully dynamic and persisted to the DB.

#### ORIENTATION step (step 0)
- [x] Task title, subject + grade dropdowns (live via `teacherClasses` query), task number badge (live `taskCount` query)

#### Content steps — dynamic
- [x] Default 6 content steps: CHALLENGE → REFLECTION → CONTENT → QUIZ → DISCUSSION → ASSIGNMENT
- [x] Teacher can **add** a step: animated step-type picker from 6 available types; new step appended and immediately navigated to
- [x] Teacher can **delete** a step: 🗑 DELETE STEP button per step; `window.confirm` guard when step has blocks; step navigator clamps to new total
- [x] `stepLabels: string[]` in `TaskDraft` is the single source of truth for step count; all rendering and save loops are dynamic (no hardcoded `[1…6]`)

#### Block system per step
- [x] Each step has a curated block palette based on its label (e.g. QUIZ step shows QUIZ block; CONTENT step shows VIDEO/DOCUMENT/AUDIO/TEXT)
- [x] **8 block types**: VIDEO · DOCUMENT · AUDIO · TEXT · REFLECTION · QUIZ · DISCUSSION · ASSIGNMENT
- [x] `BlockForm` — add or edit a block; fields vary by type; `initialBlock` prop pre-populates for edit mode
- [x] Per-block sequence badge (**#1**, **#2** …) clearly distinguishes multiple blocks in the same step
- [x] **Edit block** — ✎ button (gold) on each card reopens `BlockForm` pre-populated; "SAVE CHANGES ✓" replaces block in-place
- [x] **Move block** — ⇄ button opens animated step-picker panel; selecting a step moves the block to end of that step's list; `onMoveBlock` handler removes from source and appends to target
- [x] **Delete block** — ✕ button removes block immediately

#### REFLECTION block — preset questions
- [x] 8 preset meta-learning questions; first 4 checked by default (in order): core problem → initial solution → steps to create solution → criteria for success
- [x] Checkboxes enable/disable each question; per-question `timeMin` input; inline text editing

#### Backend — fully wired ✅
- [x] DB: `learning_tasks` — `id, title, subject, grade, template_type, total_time_min, step_labels JSONB, published, created_by, created_at`
- [x] DB: `task_step_blocks` — `id, task_id, step_number, block_type, position, title, time_min, text_content, file_path, original_name, data JSONB`
- [x] DB migration: `migrate_hql_step_blocks.sql` (initial table) + `migrate_dynamic_steps.sql` (relaxes step_number CHECK to `>= 1`; adds `step_labels JSONB` column with default 6-label array)
- [x] `saveHqlTask(input: HqlTaskInput!, publish: Boolean): LearningTask!` — upserts task row + deletes old blocks + batch-inserts new blocks; SAVE DRAFT and PUBLISH both use this mutation
- [x] `taskById(id: ID!): LearningTask` — returns task metadata including `stepLabels`
- [x] `hqlBlocks(taskId: ID!): String!` — returns all block rows as JSON string; `rowsToStepBlocks()` on the frontend converts to `HqlBlock[][]`
- [x] `myTasks: [LearningTask!]!` — teacher's own tasks (Admin sees all); drives Task Manager list
- [x] `taskCount: Int!` — live count displayed in creator header badge
- [x] `publishTask(id: ID!): LearningTask!` — toggles `published` flag on an existing task
- [x] `deleteTask(id: ID!): Boolean!` — cascades to all step blocks via FK `ON DELETE CASCADE`

#### Edit mode ✅
- [x] `/task-creator/:taskId` — `useParams` reads `taskId`; fetches `taskById` + `hqlBlocks` on mount
- [x] Full draft state populated from DB: title, subject, grade, `stepLabels`, and all block content per step
- [x] `taskIdRef` seeded from URL param so re-saves upsert the same row without creating duplicates
- [x] `template` state pre-set to `'hql'` when editing (bypasses template selector)

### General Task Creator (`GeneralTaskCreator.tsx`) ✅ (fully wired end-to-end)
- [x] Freeform block builder: 7 block types (VIDEO · DOCUMENT · QUIZ · ASSIGNMENT · DISCUSSION · NOTE · WEB EMBED)
- [x] Each block is a collapsible accordion; ▲/▼ reorder; ✕ remove; WEB EMBED lazy iframe; same `parseQuiz` format
- [x] Subject + grade dropdowns live; total time pill; SAVE DRAFT + PUBLISH buttons present
- [x] Backend: `saveGeneralTask(input: GeneralTaskInput!, publish: Boolean): LearningTask!` — upserts task row + deletes old blocks + batch-inserts new blocks into `task_blocks` table
- [x] `generalBlocks(taskId: ID!): String!` — returns all block rows as JSON string for edit mode
- [x] Edit mode: `/task-creator/:taskId` with `template=general` — fetches `taskById` + `generalBlocks`; populates full draft state from DB

### Task Preview Modal (`TaskPreviewModal.tsx`) ✅ (updated for dynamic steps)
- [x] HQL preview: dynamic tab strip — ORIENTATION + one tab per `draft.stepLabels` entry; `HqlStepPreview` component renders block-based content for each step
- [x] Step count, tab labels, and footer counter all driven by `draft.stepLabels` (no hardcoded 6-step assumption)
- [x] `BLOCK_META` exported from `LearningTaskCreator.tsx` so `TaskPreviewModal` can import type metadata
- [x] General preview: scrollable block list; embed blocks show URL placeholder

### Task Manager (`LearningTaskManager.tsx`) ✅ (wired to live data)
- [x] `myTasks` GraphQL query — real task list; mock data removed
- [x] EDIT → `/task-creator/${task.id}` — opens edit mode with full draft load
- [x] "+ NEW TASK" → `/task-creator` — generates fresh UUID via `crypto.randomUUID()` on mount

### Exported types
- [x] `STEP_LABELS`, `BLOCK_META`, `HqlBlock`, `HqlBlockType`, `TaskDraft`, `ReflectionQuestion`, `ParsedQuestion`, `AllowedFormats`, `parseQuiz`, `RawBlock`, `rowsToStepBlocks` exported from `LearningTaskCreator.tsx`
- [x] `GeneralBlockType`, `BLOCK_META` (General), `GeneralBlock`, `GeneralDraft` exported from `GeneralTaskCreator.tsx`

### Pending
- [x] File upload: `POST /upload?taskId&folder` multer endpoint in `backend/src/index.ts`; `backend/uploads/tasks/<taskId>/<folder>/` disk storage; `/uploads/*` static serving; Vite proxy forwards `/upload` + `/uploads`; `fileStoreRef` in both creators holds pending files; `doSave` uploads all pending files and writes returned `path` into block state before GraphQL mutation
- [x] Wire `TeacherPlanningHub` TERM PLAN tab to live `myTasks` query — tasks grouped by grade, step labels from DB, published/draft badges, EDIT button → `/task-creator/:id`; Timetable and Year Plan tabs retain mock data (no DB tables for timetable schedule or curriculum-level year plan exist)
- [x] Wire `handleActivate` in `TeacherClassesOverview.tsx` to `activateTask` mutation; `migrate_activate_task.sql` adds the 4 columns to `academic_classes`
- [x] `saveGeneralTask` mutation + edit mode — fully implemented in resolvers.ts

---

## Phase 5e: Admin UI ✅ COMPLETE

School administration screens accessible to the Admin role only. Route `/admin`, guarded to Admin role. Admin users now redirect directly to `/admin` from the login screen (bypasses TeacherHome).

### Database (shared with Phase 3 schema)
- [x] All admin operations use the existing `users`, `register_classes`, `academic_classes`, and `enrollments` tables — no new tables needed

### GraphQL — Admin Queries
- [x] `adminUsers(role: String): [AdminUser!]!` — list all users, optionally filtered by role
- [x] `adminRegisterClasses: [AdminRegisterClass!]!` — all register classes with teacher + academic class count
- [x] `adminAcademicClasses: [AdminAcademicClass!]!` — all academic classes with teacher + enrolled count
- [x] `adminClassEnrollments(academicClassId: ID!): [AdminEnrollment!]!` — learners enrolled in a specific class

### GraphQL — Admin Mutations
- [x] `adminCreateUser / adminUpdateUser / adminDeleteUser` — full user CRUD (teacher + learner accounts)
- [x] `adminCreateRegisterClass / adminUpdateRegisterClass / adminDeleteRegisterClass` — register class CRUD
- [x] `adminCreateAcademicClass / adminUpdateAcademicClass / adminDeleteAcademicClass` — academic class CRUD
- [x] `adminEnrollLearner / adminUnenrollLearner` — move learners between classes; automatically manages `enrollments` + `learner_progress`

### Frontend — `src/pages/AdminUI.tsx`
- [x] 4 ExpandingCard accordion sections (same pattern as StaffroomUI): TEACHERS · LEARNERS · REGISTER CLASSES · ACADEMIC CLASSES
- [x] Each section: add bar + row list with edit/delete actions
- [x] `UserModal` — create/edit teacher or learner with role, email, password, paidStatus
- [x] `RegisterClassModal` — create/edit register class with teacher dropdown
- [x] `AcademicClassModal` — create/edit academic class with register class + teacher dropdowns
- [x] `EnrollModal` — manage enrolled learners: view current, unenroll, enroll new from full learner list
- [x] `ConfirmDialog` — delete confirmation overlay
- [x] All queries use `fetchPolicy: 'network-only'`

### Routing changes
- [x] `HomePage.tsx` — Admin role redirects to `/admin` (not TeacherHome)
- [x] `App.tsx` — `/admin` route added
- [x] `AppHeader.tsx` — `/admin` added to banner route map
- [x] Login screen ADMIN quick-fill chip wired to admin credentials

---

## Phase 5f: Theme Adder + Custom Theme System ✅ COMPLETE

Admin-facing wizard for uploading and registering new pixel-art themes. Themes created here appear in the shop and apply dynamically — no code changes required.

### Database
- [x] `custom_themes` table — `id UUID PK`, `name TEXT UNIQUE`, `display_name`, `color_primary/secondary/accent/text/bg_overlay`, `status CHECK ('draft'|'active')`, `shop_item_id FK → shop_items ON DELETE SET NULL`, `created_at`; index on `status`
- [x] Migration: `backend/src/db/migrate_themes.sql` — safe to re-run

### Backend — REST endpoints
- [x] `POST /theme/init` — creates all required subfolders under `public/assets/themes/[name]/`; upserts `custom_themes` row with `status='draft'`; requires Admin JWT
- [x] `POST /upload/theme-asset?themeName=X&assetKey=Y` — multer writes uploaded file to the correct subfolder determined by `ASSET_MANIFEST`; requires Admin JWT
- [x] `POST /theme/skip-asset` — writes a spec `.txt` placeholder file when the admin skips an asset group
- [x] `GET /theme/asset-status/:themeName` — returns `uploaded/skipped/pending` status per asset key
- [x] `POST /theme/finalize` — auto-generates `login/sprites.json` and `attendence/sprites.json` from hardcoded templates (folder names `torch_flicker`, `dove`, `fireplace`, `rabbit`, `cloud_drift` are fixed in React components); inserts shop item row; sets `status='active'`
- [x] `ASSET_MANIFEST` — server-side map of 29 asset keys to relative paths + spec text; drives all file placement
- [x] `themeStorage` multer instance writes to `THEMES_DIR/[themeName]/[subfolder]/` dynamically
- [x] `requireAdminRest()` helper — verifies Admin JWT from `Authorization` header for all theme REST routes
- [x] Vite proxy: `'/theme': 'http://localhost:4000'` added to `vite.config.ts`

### GraphQL
- [x] `CustomTheme` type — `id, name, displayName, colorPrimary, colorSecondary, colorAccent, colorText, colorBgOverlay, status, shopItemId, createdAt`
- [x] `customThemes: [CustomTheme!]!` query — public; returns only `status='active'` themes (used by App.tsx for CSS injection)
- [x] `adminThemes: [CustomTheme!]!` query — Admin only; returns all themes including drafts
- [x] `adminDeleteTheme(themeName: String!): Boolean!` mutation — removes DB row

### Frontend — `src/pages/ThemeAdderUI.tsx` (rewritten)
- [x] 11-step guided wizard: step 0 (name + slug), step 1 (CSS colour pickers with live swatches), steps 2–9 (8 asset groups), step 10 (finalize)
- [x] **Simplified asset set** — custom themes consist of: banner, primary button, music, 7 page backgrounds, and 3 sprite types per page (static / moving / clickable). `frame_main`, `input_box`, and `ambient_sprite` removed from the custom theme system entirely; custom themes use `--color-pane-bg` for opaque solid panels instead.
- [x] **8 asset groups**: BANNER & BUTTON (`banner_top`, `btn_primary`), THEME MUSIC, PAGE BACKGROUNDS (7 pages), LOGIN — STATIC SPRITE (torch frames 1–3), LOGIN — CLICKABLE SPRITE (dove frames + clicked), HOME — MOVING SPRITE (cloud_drift), HOME — CLICKABLE SPRITE (rabbit frames + clicked), ATTENDANCE — STATIC SPRITE (fireplace frames 1–4)
- [x] **Sprite terminology**: Static sprite = animates in place at a fixed position (torch, fireplace); Moving sprite = drifts continuously across the screen (cloud_drift); Clickable sprite = moves across the screen AND reacts on click (dove, rabbit)
- [x] **PlacementPicker component** — appears after static sprite frames are uploaded; renders the page background as a 16:9 interactive canvas; sprite thumbnail follows cursor; click locks the position as `{ x, y }` percentage; RE-PLACE and USE DEFAULT POSITION buttons; placement required before advancing past static sprite groups
- [x] `spritePositions` state — `Record<string, { x: number; y: number }>` keyed by `'login_static'` / `'attendence_static'`; sent in the finalize payload
- [x] `ThemePreviewPanel` — 16:9 live preview sidebar showing banner, content pane (solid `rgba(8,8,8,0.97)`), and sprites at placed/default positions; background updates as each bg group is uploaded
- [x] Per asset: file picker → UPLOAD button or SKIP button; completed state shows REPLACE/ADD FILE
- [x] Auth: JWT read from `sessionStorage` (`sl_token`) and sent as `Authorization: Bearer` header on all fetch calls
- [x] Scroll fix: `height: 100vh` + `overflow: hidden` on outer shell; `overflowY: auto` on the inner content div
- [x] AnimatePresence step transitions; progress bar across top
- [x] `AdminUI.tsx` — THEME ADDER entry card at bottom; "OPEN WIZARD →" navigates to `/theme-adder`
- [x] `/theme-adder` route added to `App.tsx`
- [x] **Edit mode** — CREATE NEW / EDIT EXISTING landing; EDIT EXISTING fetches `adminThemes`, shows theme list with colour swatches; pre-populates all fields and asset statuses; asset groups never blocked in edit mode
- [x] **Image previews** — `ASSET_REL_PATH` map (24 keys); blob URL on select → served path after upload; edit mode pre-loads previews; final review shows 40×24 thumbnail per asset
- [x] **ASSET_MANIFEST background filenames** corrected in `backend/src/index.ts`: all `bg_*` entries use `background.png` (e.g. `login/background.png`), matching `usePageBackground` probe filename

### Backend — finalize endpoint updated
- [x] `POST /theme/finalize` — now accepts optional `spritePositions: Record<string, { x, y }>` in the body; merges admin-placed `x`/`y` percentage values into `sprites.json` for `torch_flicker` (login) and `fireplace` (attendance); defaults to `{ x: 15, y: 55 }` and `{ x: 12, y: 72 }` when no placement was made

### Dynamic CSS injection — `src/App.tsx`
- [x] `customThemes` GraphQL query on app load (`fetchPolicy: 'network-only'`)
- [x] `useEffect` generates `:root[data-theme='X'] { --color-primary/secondary/accent/text/bg-overlay; --theme-bg/banner/btn-primary/button-plank }` blocks for every active custom theme and injects into `<style id="dynamic-themes">` — no code changes needed per new theme
- [x] Simplified: `--theme-frame`, `--theme-ambient`, `--theme-input-frame`, `--theme-input-box`, `--ui-frame-texture` removed from injection; custom themes use solid `--color-pane-bg` panels instead of frame images

### themeStore type change — `src/stores/themeStore.ts`
- [x] `export type Theme = string` (was `'medieval' | 'scifi' | 'default'`) — allows any custom theme slug to be set as the active theme

### Theme asset fallback architecture
- [x] All theme assets (backgrounds, banners, sprites, music) degrade **gracefully to nothing** when missing — CSS variables / blank — no wasted fallback 404 requests to other themes
- [x] `medieval` is a purchasable theme, not a built-in fallback; `default` is CSS-variables-only (no asset files); this is intentional
- [x] `SpriteManager.tsx` — tracks `resolvedTheme` alongside `currentTheme`; sprite file paths always point to whichever theme's `sprites.json` was successfully loaded; falls back to empty sprite list when manifest is missing
- [x] `usePageBackground`, `AppHeader` (banner), `LearnerHome` (rabbit/cloud) — all probe once; if missing, element is simply absent; no secondary probe to another theme's folder

### ShopUI custom theme fixes — `src/pages/ShopUI.tsx`
- [x] `resolvePreviewPaths`: detects `assetPath.startsWith('themes/')` for custom themes and expands to real candidate image paths (`/assets/themes/X/home/bg.png`, `/assets/themes/X/login/bg.png`, etc.) instead of returning the folder path as a broken `<img src>`
- [x] `handleEquip`: for custom themes not in `THEME_KEY`, extracts the theme slug from `assetPath` (`themes/X` → `X`) and passes it to `setTheme` so CSS variables actually switch

### Documentation — `docs/themeGenerator.md`
- [x] ⚠ Critical Rules section: dimensions non-negotiable, white sprite sheet backgrounds, 2–3 px dark borders
- [x] All prompts: `IMAGE SIZE: EXACTLY W × H PIXELS` stated at top and in body; explicit outline + quality directives
- [x] **Anti-grain style directives merged in**: STYLE DIRECTIVE callout (high-fidelity modern 16-bit pixel art, large flat color fields, solid pixel blocking) + `### ⚠ Anti-Grain Style Constraints` subsection (No Noise, Clean Clusters, Anti-Dithering, Lighting rules); `ANTI-GRAIN:` enforcement line appended to every AI prompt template throughout the document

---

## Phase 5b: Cooperative Grouping Engine ✅ COMPLETE

- [x] DB: `task_groups` table — links an academic class session to a group conversation; keyed by `(academic_class_id, session_date)`
- [x] DB: `task_group_members` table — `(group_id, learner_id, role)` with CHECK constraint on role values (`Leader`, `Timer`, `Scribe`, `AngleChecker`, `Learner`)
- [x] GraphQL: `createTaskGroup(academicClassId, memberRoles)` — creates a group conversation + task group in one transaction; adds all members as conversation participants
- [x] GraphQL: `assignGroupRole(groupId, learnerId, role)` — updates a member's role
- [x] GraphQL: `myTaskGroup(academicClassId)` — learner fetches their group for today's session
- [x] Frontend: AUTO-DIVIDE button — `handleAutoDivide` shuffles learners into balanced groups of 4–5 with role auto-assignment; staged in `editing` mode before `handleSaveGroups` commits via `createTaskGroup` mutation
- [x] Frontend: CUSTOM-DIVIDE editor — click-to-select learner, click role slot to place; ADD GROUP / remove group; unassigned pool; same `handleSaveGroups` commit path
- [x] Wire Phase III cooperative discussion chat to real `conversation_id` — `MY_TASK_GROUP` query now returns `conversationId`; `GROUP_CHAT_MESSAGES` polls every 4 s; `SEND_GROUP_MESSAGE` mutation replaces local state append; DEV_GROUP local state retained as fallback when no real group exists

---

## Phase 6: Virtual Economy & Asset Shop ✅ COMPLETE

### Database
- [x] `PointsBalance` tracked per learner in `users.points_balance` (Int, default 0)
- [x] `shop_items` table with all 7 item types: Theme, Soundtrack, Interactive Sprite, Color Scheme, Alternate Background, Animated Sprite, Static Sprite
- [x] Columns: `name`, `item_type`, `subtype`, `tag`, `scope`, `theme_compatibility`, `cost`, `description`, `asset_path`
  - [x] `scope` field encodes the target page as a key: `'login'`, `'home'`, `'attendence'`, `'subjects'`, `'messages'`, `'shop'`, `'global'`
  - [x] `tag` field encodes display label + page for sprites: e.g. `'SPRITE · STATIC · LOGIN'`
- [x] `UNIQUE(name)` constraint on shop items
- [x] `learner_inventory` table — `(learner_id, item_id)` unique pair + `is_active` boolean
- [x] Migration script: `backend/src/db/migrate_shop.ts` — adds new columns + updated constraints (safe to re-run)
- [x] `points_ledger` table — `(id BIGSERIAL, learner_id UUID, delta INT, reason TEXT, meta JSONB, created_at TIMESTAMPTZ)` — immutable record of every balance delta; indexed on `(learner_id, created_at DESC)`; migration: `backend/src/db/migrate_ledger.sql`
- [x] **9-item catalog** in `seed.ts` (wipes and re-inserts on each run — only items backed by real asset files):
  - 1 global theme: Medieval Realm (scifi/default themes added when assets exist)
  - 4 medieval sprites with confirmed asset folders: Torch Flicker (login, static), Dove (login, interactive), Rabbit (home, interactive), Fireplace (attendance, static)
  - 1 medieval soundtrack: Tavern Ambience (`medieval/music/theme.wav` exists)
  - 3 default colour schemes: Crimson Court, Emerald Isle, Midnight Blue (CSS-only skins, no folder needed)
- [x] Starter inventory granted to all learner accounts: Medieval Realm (active), Tavern Ambience (owned), Fireplace (active)

### GraphQL API
- [x] `shopItems: [ShopItem!]!` query — LEFT JOINs inventory to return per-learner `owned`/`active` flags in a single query
- [x] `myInventory: [ShopItem!]!` — owned items only (used by ProtectedLayout for skin injection on login)
- [x] `myLedger(limit: Int): [LedgerEntry!]!` — points history most-recent-first; `LedgerEntry` has `id, delta, reason, meta (JSON string), createdAt`
- [x] `purchaseItem(itemId: ID!): PurchaseResult!` — atomic `BEGIN/COMMIT/ROLLBACK`; checks balance, prevents duplicates, deducts points, grants inventory; inserts ledger row (`reason: 'purchase'`)
- [x] `equipItem(itemId: ID!): ShopItem!` — deactivates all items of the same type, activates the chosen one
- [x] `advanceStep` — now also inserts ledger row (`reason: 'step_complete'` or `'quest_bonus'` on final step)

### Frontend — ShopUI [Shop]
- [x] Full Apollo integration: `useQuery(SHOP_ITEMS_QUERY)`, `useQuery(ME_QUERY)` for live points balance
- [x] `purchaseMutation` with `refetchQueries` — grid and balance update immediately after buy
- [x] `equipMutation` with `refetchQueries` — active state updates immediately
- [x] `gqlToShopItem()` mapper converts DB `itemType` string to frontend type/subtype; passes `assetPath` through
- [x] Loading skeleton cells while query in flight
- [x] Mutation error banner surfaces API errors (insufficient points, already owned, etc.)
- [x] Filter tabs (All, Themes, Soundtracks, Color Schemes, Sprites, Backgrounds) functional
- [x] Item IDs are UUIDs from the DB (changed from mock number IDs)
- [x] Page title uses `vocab.shopPageTitle`; points balance uses `vocab.currencyLabel` — no hardcoded strings
- [x] **Asset preview system** — `resolvePreviewPaths(item)` + `PreviewImage` component:
  - Tries `assetPath` from DB first (takes priority when populated)
  - Themes (global): shows home/login background of that theme; tries `background.png` before `bg.png`
  - Backgrounds + Sprites with no `assetPath`: return `[]` → renders the type icon placeholder (`⛰`/`✦`) — no fallback to a different item's image
  - 4 medieval sprites have real `assetPath` set in DB (from confirmed asset folders): Torch Flicker, Dove, Rabbit, Fireplace
  - Colour schemes: renders 4 named colour swatches (per-item palettes for Crimson Court, Emerald Isle, Midnight Blue)
  - Soundtracks: styled ♪ audio placeholder
  - `PreviewImage` uses `key={path}` per attempt so React remounts `<img>` cleanly on each fallback
- [x] `THEME_STYLE` includes scifi badge (`SCI-FI` label, cyan palette)
- [x] **Live points balance** — `AppHeader.tsx` replaced hardcoded `mockLearnerState.gold` (= 1500) with live `ME_BALANCE_QUERY` (`cache-and-network`); currency counter is learner-only (hidden for Teacher/Admin); `ShopUI` `ME_QUERY` uses `fetchPolicy: 'network-only'` to always fetch fresh balance
- [x] **Equip immediately after purchase** — purchase modal no longer closes on buy; `purchaseMutation.onCompleted` updates `selectedItem` to `{ ...prev, owned: true }` using returned server data; modal immediately re-renders showing EQUIP button without needing to close and reopen
- [x] **Custom theme background loading** — `classicPirate` theme: all `bg.png` files renamed to `background.png` in `public/assets/themes/classicPirate/` to match what `usePageBackground` probes

### Milestone Rewards (via Quest system)
- [x] `advanceStep` mutation awards 10 pts per step + 50 bonus pts on quest completion
- [x] Points deducted atomically on purchase; balance shown live in shop header
- [x] `advance()` from `questStore` now wired in `LearningTaskUI` Phase V `onComplete` — points are actually awarded when a learner completes Phase V (was previously unwired; just navigated back without calling the mutation)

### Cha-ching Animation ✅
- [x] `PointsPopup` in `QuestScreen.tsx` enhanced: 8 gold particles burst outward, expanding glow ring, main `+N PTS` text scales from 0.5× to 1.7× then floats up and fades over 1.8 s

### Economy Ledger ✅
- [x] DB: `points_ledger` table (see Database section above)
- [x] `LedgerUI` page (`src/pages/LedgerUI.tsx`) — route `/ledger`; green/red delta list, reason labels (`STEP COMPLETE`, `QUEST BONUS`, `SHOP PURCHASE`), item name from meta, date/time
- [x] "HISTORY" button on `LearnerHome` links to `/ledger`
- [x] `/ledger` route added to `App.tsx`; `/ledger` added to `AppHeader` banner map

### Active Skin Injection ✅
- [x] `src/lib/skinInjection.ts` — `applyColorScheme(name)` sets CSS custom properties; `clearColorScheme()` removes them; `applySkinsFromInventory(items, setTheme)` scans active inventory and applies active theme + color scheme
- [x] Color scheme CSS maps: Crimson Court (crimson/dark red), Emerald Isle (deep green), Midnight Blue (dark blue)
- [x] `ProtectedLayout.tsx` — on Learner mount, queries `myInventory` via `apolloClient.query` and calls `applySkinsFromInventory` so equipped skins persist across page loads and browser refreshes
- [x] `ShopUI.tsx` `handleEquip` — calls `applyColorScheme` when equipping a Color Scheme; calls `clearColorScheme` when equipping a Theme (themes define their own color palette)

### Pending
- [ ] Create art assets for medieval alternative backgrounds and sprites; add each to seed using the asset folder name as the shop item name (snake_case → Title Case)

---

## Phase 7: Backend Data Layer ✅ COMPLETE

- [x] PostgreSQL schema — Users, Classes, Enrollments, Steps, Transactions (already complete as of Phase 3)
- [x] xAPI logging — `activity_logs` table + `log_marker_movement()` PL/pgSQL trigger already in `schema.sql`; logs every `advanceStep` call as a full xAPI statement
- [x] Redis caching — `backend/src/lib/cache.ts` (`ioredis` with graceful fallback); wraps `teacherClasses` (TTL 30s), `myConversations` (TTL 5s), `conversationMessages` (TTL 4s); cache invalidated on `sendMessage`, `markConversationRead`, `createConversation`, `activateTask`; app works identically without Redis — caching activates automatically when Redis is running
- [x] LTI 1.3 compliant tables — `backend/src/db/migrate_lti.sql`; tables: `lti_platforms`, `lti_deployments`, `lti_user_links`, `lti_grade_passback`; indexes on `local_user_id` and `(platform_id, resource_link_id)`
- [x] Analytics export — `activitySummary(academicClassId)` GraphQL query + `GET /analytics/export?classId=<uuid>&format=csv|json` REST endpoint; JWT auth required (Teacher/Admin only); CSV columns: email, display_name, verb, object_id, recorded_at; Vite proxy: `/analytics → http://localhost:4000`

---

## Phase 9: Messaging System — Real Backend ✅ COMPLETE

> Migration file: `backend/src/db/migrate_messages.sql`. All layers — DB, GraphQL, and frontend — are fully wired and live.

### 9a — Database Schema ✅

- [x] `conversations` — `id UUID PK`, `type TEXT CHECK IN ('individual','group')`, `created_at`
- [x] `conversation_participants` — `(conversation_id, user_id)` composite PK; indexed on `user_id`
- [x] `group_chat_metadata` — `conversation_id PK`, `name`, `created_by` — name store for group chats
- [x] `messages` — rebuilt from scratch: `conversation_id FK`, `sender_id FK`, `content`, `context_link` (optional deep-link to a task step), `sent_at`; indexed `(conversation_id, sent_at ASC)`
- [x] `message_read_status` — `(message_id, user_id)` composite PK; records when each user read each message
- [x] Migration: `backend/src/db/migrate_messages.sql` — safe to re-run; drops old table, creates all new tables cleanly

### 9b — GraphQL Types ✅

- [x] `Message` — `id`, `conversationId`, `senderId`, `senderName`, `body`, `time`, `contextLink`, `read`
- [x] `Conversation` — `id`, `type`, `name`, `online`, `memberCount`, `unread`, `messages`
- [x] `DirectMessage` retained (unchanged) — still used by teacher dashboard nudge system

### 9c — Resolvers ✅

- [x] `myConversations` — all conversations for current user; unread count per conversation; ordered by latest message
- [x] `conversationMessages(conversationId, limit, offset)` — paginated; ordered `sent_at ASC`; `read` flag per message
- [x] `sendMessage(conversationId, body, contextLink)` — INSERT + return new message
- [x] `createConversation(participantId)` — find-or-create individual conversation
- [x] `createGroupChat(name, participantIds)` — transactional create; inserts metadata + all participants
- [x] `markConversationRead(conversationId)` — batch-inserts read receipts for all unread messages
- [x] `findOrCreateIndividualConversation` helper — shared by `sendToTeacher`, `sendToLearner`, `sendBroadcast`, `createConversation` to avoid duplicate 1:1 conversations
- [x] `sendToTeacher`, `sendToLearner`, `sendBroadcast` — updated to route through conversation system; still return `DirectMessage` for teacher dashboard compatibility

### 9d — Frontend Integration (`src/pages/SocialUI.tsx`) ✅

- [x] Removed `mockConversations` import; replaced with `useQuery(MY_CONVERSATIONS)` polling every 5s
- [x] `handleSend` replaced with `useMutation(SEND_MESSAGE)` — immediately refetches active conversation messages
- [x] `handleNewChat` replaced with `useMutation(CREATE_CONVERSATION)` — sets returned conversation id as active
- [x] `createGroupFromSelected` replaced with `useMutation(CREATE_GROUP_CHAT)` — group name auto-generated from selected contacts
- [x] `handleSelect` fires `useMutation(MARK_CONVERSATION_READ)` + refetches conversation list to clear unread badge
- [x] Hardcoded `ALL_CONTACTS` replaced with `useQuery(MY_CLASSMATES)` — lazily loaded only when a contact modal opens
- [x] `MockConversation` and `MockMessage` interfaces and `mockConversations` array removed from `mockState.ts`
- [x] `isMe` check uses `msg.senderId === user.id` (from `useAuthStore`) — no more hardcoded `'me'` string
- [x] Active conversation messages polled every 3s via `CONVERSATION_MESSAGES` query with `skip: !activeId`

### 9e — Seed Data ✅

- [x] 2 individual conversations seeded: teacher↔learner1 (3 messages), teacher↔learner2 (2 messages)
- [x] 1 group conversation seeded: "IT Study Group" — teacher + 3 learners, 4 messages

---

## Phase 9+: Learner API Layer ✅ COMPLETE

> All learner pages (`AttendenceUI`, `CurriculumNavigator`, `SocialUI`, `HomeCrossroads`) are still mock-driven on the frontend. The backend API is now fully ready for wiring.

### New GraphQL types
- [x] `BasicUser` — `id`, `displayName`, `role` — for contact lists and rosters
- [x] `LearnerRegisterView` — `id`, `name`, `grade`, `myStatus`, `roster` — learner's view of their register class
- [x] `AttendanceRecord` — `date`, `status`, `markedAt` — for attendance history

### New Queries
- [x] `myRegisterView` — learner's own register class: their attendance status today + full class roster with everyone's status
- [x] `myAttendanceHistory(limit)` — past attendance records ordered newest-first; dates formatted `YYYY-MM-DD`
- [x] `myInventory` — only the learner's owned shop items (not full catalog); `active` flag included; ordered by purchase date
- [x] `myClassmates` — all other learners in the same academic class + their teacher; used as contact list for `SocialUI`

### Existing queries ready for frontend wiring (no changes needed)
- [x] `myProgress` — enrolled subjects with `className`, `subject`, `currentStep`, `totalSteps` — ready for `CurriculumNavigator`
- [x] `shopItems` — full catalog with per-learner `owned`/`active` — ready for `ShopUI` (already wired)
- [x] `myConversations` + `conversationMessages` — ready for `SocialUI`
- [x] `registerChatMessages` + `registerNotices` — ready for learner `AttendenceUI`

### Seed data
- [x] Attendance seeded for all 4 learners for today: present / present / late / absent
- [x] 3 register chat messages seeded (teacher greeting + learner reply + teacher follow-up)
- [x] 2 notices seeded: 1 pinned (assignment due), 1 unpinned (encouragement)

---

## CSS Architecture Polish ✅ COMPLETE

Cross-cutting visual consistency work done after Phase 5f — applies to all pages.

### Pane transparency system
- [x] `--color-pane-bg` CSS variable added to `:root` — base value `rgba(0,0,0,0.62)` (semi-transparent, lets theme backgrounds show through); `[data-theme='default']` overrides to `rgba(0,0,0,0.45)` (lighter glass). Modals use `--color-modal-bg` (`rgba(8,8,8,0.97)` — fully opaque) so text always reads cleanly.
- [x] `--color-modal-bg` CSS variable added to `:root` — default `rgba(8,8,8,0.97)`; `[data-theme='default']` overrides to `rgba(12,26,46,0.97)` (opaque navy). Used for modals, sidebars, and sticky overlays that must be fully opaque.
- [x] `.frame-parchment` and `.btn-portal` base rules updated to use `background-color: var(--color-pane-bg)` — fills transparent frame centers with the pane color; works on both framed themes (medieval) and custom themes (no frame image).

### Cross-page warm-brown modal fix
- [x] All hardcoded warm-brown modal backgrounds (`rgba(8,4,0,0.97)`, `rgba(10,5,0,0.97)`, `rgba(6,3,0,0.98)`) replaced with `var(--color-modal-bg)` across: `AdminUI`, `ShopUI`, `SocialUI`, `AttendenceUI`, `LearningTaskCreator`, `TeacherRegisterUI`, `GeneralTaskCreator` — these were medieval-era amber tones leaking into the default navy theme.

### Cross-page pane-bg consistency pass
- [x] Hardcoded `rgba(0,0,0,0.x)` panel backgrounds replaced with `var(--color-pane-bg, rgba(0,0,0,0.x))` across: `ShopUI`, `StaffroomUI`, `AdminUI`, `CurriculumNavigator`, `LedgerUI`, `LearningTaskManager`, `LearningTaskCreator` (`PANEL` constant), `TeacherClassesOverview`, `TeacherDashboard`. Functionally identical today; allows future theme control via the CSS variable.

### Design decisions documented
- [x] Gold (`#FFD700` / `rgba(255,215,0,x)`) is kept as the universal hardcoded UI chrome color across all themes — intentional design choice; does not use CSS variables. Color scheme shop items override `--color-primary/accent/text` only, leaving gold chrome unaffected.
- [x] `default` theme is the only theme with transparent panes — all other themes (built-in and custom) get fully opaque panels automatically.

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

## Phase 10: Bot System — Simulated Group Discussion 🔲 HOLD (implement last)

> **Design spec:** `docs/bots.md` — read this in full before touching any code.
>
> **Do not implement until the program is feature-complete and all Phase III mechanics are finalised.**
> Bot dialogue scripts are tightly coupled to the exact role panel behaviours (pulse timings, question
> advance logic, scribe capture flow, angle-checker triad). Any tweak to Phase III after the bots are
> written will require re-auditing every script.

### What this phase delivers
- 8 simulated learner bots (smart + stupid variant per role) that populate Phase III for solo users
- 1 teacher bot that monitors user inactivity and role compliance
- Frontend-only — no DB tables, no GraphQL changes, no persistence

### Bot roster (see `docs/bots.md` for full scripts)
- [ ] Aria / Finn — Leader (smart / stupid)
- [ ] Conrad / Ollie — Timer (smart / stupid)
- [ ] Petra / Mila — Scribe (smart / stupid)
- [ ] Rex / Bea — Angle Checker (smart / stupid)
- [ ] Mr. van der Berg — Teacher bot (always active)

### Implementation tasks
- [ ] Create `src/lib/botEngine.ts` — bot roster, answer-sheet generator, session start/stop
- [ ] Modify `LearningTaskUI.tsx` — wire bot engine into Phase III; replace `DEV_GROUP` with bot assignment; wire distribution chart to bot answer sheets
- [ ] Add `teacherSend` helper (injects `isTeacher: true` messages as Mr. van der Berg)
- [ ] Add `userLastActionAt` inactivity tracker (updated on every user chat send and role-panel button press)

---

## Notes

- All placeholder assets are documented with `.txt` spec files alongside them in the theme folders.
- To run the dev server see `docs/runningProject.md`.
- For theme asset specifications see `docs/THEME_IMPLEMENTATION.md`.
- For full architecture overview see `docs/FRONTEND_ARCHITECTURE.md`.
- **Naming convention:** All components follow the `Functional [Aesthetic]` pattern. See `docs/NAMING_CONVENTION.md` for the full legend and AI agent instructions.
