# Stella Logos Frontend Architecture

## Design Philosophy: State-Driven Theatrical UI

The Stella Logos frontend is engineered to deliver a "Mediated Game Screen" experience, not a traditional web interface. Every design decision prioritizes:

1. **Theme Interchangeability** - Visual identity controlled by folder paths
2. **Pixel-Perfect Rendering** - 16-bit aesthetic on 4K displays
3. **Performance Awareness** - Adaptive rendering for school networks
4. **Cognitive Clarity** - Vector typography over pixel art for readability

## Core Architecture Pillars

### 1. Theme-Folder System

**Folder structure — assets scoped per page:**
```
/assets/themes/[theme-name]/
│
├── login/                        (page subfolder)
│   ├── background.png            → loaded by usePageBackground('login')
│   ├── sprites.json              → sprite manifest for this page
│   └── sprites/
│       ├── stationary/           → fixed-position, frame-animated (torches, candles…)
│       │   └── torch_flicker/    → frame_1/2/3.png
│       └── moving/               → travelling sprites (creatures, clouds…)
│           └── dove/             → frame_1/2/3.png + clicked.png
│
├── home/                         → background.png + sprites/{stationary,moving}/
├── mySubjects/                   → background.png + sprites/{stationary,moving}/
├── messages/                     → background.png + sprites/{stationary,moving}/
├── attendence/                   → background.png + sprites/{stationary,moving}/
├── learningTask/                 → background.png + sprites/{stationary,moving}/
├── shop/                         → background.png + sprites/{stationary,moving}/
│
├── banner_top.png                → CSS var: --theme-banner       (shared, all pages)
├── banner_home.png               → CSS var: --theme-banner-home  (shared)
├── frame_main.png                → CSS var: --theme-frame        (shared)
├── btn_primary.png               → CSS var: --theme-btn-primary  (shared)
├── ambient_sprite.png            → CSS var: --theme-ambient      (shared)
├── input_box.png                 → CSS var: --theme-input-box    (shared)
├── music/theme.wav               (single looping ambient track)
└── theme_map.txt                 (standard → themed name registry)
```

**CSS Variable Mapping (globals.css):**
```css
:root[data-theme='medieval'] {
  --theme-bg: url('/assets/themes/medieval/login/background.png'); /* fallback only */
  --theme-banner: url('/assets/themes/medieval/banner_top.png');
  --color-primary: #8B4513;
  /* No --theme-bg-home — page backgrounds load dynamically via usePageBackground() */
}
```

**Switching Implementation:**
```typescript
// Zustand store updates HTML attribute
setTheme('medieval') → document.documentElement.setAttribute('data-theme', 'medieval')
// CSS auto-applies new variables — no component re-renders needed
```

**Flash prevention — synchronous attribute initialisation:**
`data-theme` and `data-performance` are set in two places to eliminate any unstyled flash before React renders:
- `index.html` hardcodes them on `<html>`: `<html data-theme="medieval" data-performance="High">`
- `themeStore.ts` re-applies them synchronously **at module load** (not inside a `useEffect`) so the correct values are in place before React's first paint even if sessionStorage holds a different saved theme.

**Page background loading — `usePageBackground` hook (`src/hooks/usePageBackground.ts`):**
```typescript
// Called inside every page component
usePageBackground('home')
// → probes /assets/themes/{theme}/home/background.png
// → sets document.body.style.backgroundImage on success
// → clears inline style on unmount (CSS var --theme-bg takes over)
```

**Advantage:** Instant theme switching without React re-renders. Page backgrounds load silently via image probe — missing assets fall back gracefully to the CSS default.

---

### 2. 9-Slice Scaling Architecture

**Problem Solved:**
Traditional frame graphics stretch and distort at different sizes. Pixel-art corners must stay crisp.

**Solution: CSS border-image**
```css
/* Base: works for any theme without border art */
.frame-parchment {
  background-image: var(--theme-frame);
  padding: 3rem 2.5rem 2.5rem;
  /* Corners preserved, edges repeat, center stretches */
}

/* Medieval override: extra horizontal padding to clear the scroll border art */
[data-theme='medieval'] .frame-parchment {
  padding-left: 5rem;
  padding-right: 5rem;
}
```

**Layout vs visual rule:** Base classes own layout (padding, width, display). Theme overrides change visuals only (background-image, border, color, box-shadow). Never put layout changes in a theme override — this ensures all themes get a correct layout by default and themes only need to supply their visual assets.

**Pixel Layout (256x256px template):**
```
┌─32px─┬────────────┬─32px─┐
│      │  top edge  │      │
├──────┼────────────┼──────┤ 32px
│ left │            │right │
│edge  │   center   │edge  │ repeating
│      │            │      │
├──────┼────────────┼──────┤ 32px
│      │ bottom edge│      │
└──────┴────────────┴──────┘
  32px    repeating    32px
```

**How Frame Scaling Works:**
1. Corners: Preserved at original size (stays 32x32px)
2. Edges: Repeated/tiled as container grows
3. Center: Stretched or repeated based on CSS

**Applied to UI Elements:**
- `.frame-parchment` - Login form container
- `.btn-9slice` - Primary button
- Future: Modals, panels, quest markers

---

### 3. Performance-Adaptive Rendering

**Two Tier System:**

#### High Performance Tier
- **Detected:** 4G connection + saveData = false
- **Features Enabled:**
  - CSS keyframe animations (sway, flutter)
  - backdrop-filter blur effects
  - Ambient sprite rendering (castle, trees)
  - Smooth transitions

#### Low Performance Tier
- **Detected:** 3G/2G connection OR saveData = true
- **Features Disabled:**
  - All CSS animations (replaced with static states)
  - backdrop-filter (GPU intensive)
  - Ambient sprites hidden (saves rendering)
  - Reduced visual polish for speed

**Implementation:**
```typescript
// Auto-detection via Network Information API
const connection = navigator.connection
if (connection.effectiveType === '4g' && !connection.saveData) {
  setPerformanceTier('High')
} else {
  setPerformanceTier('Low')
}
```

**CSS-Based Switching:**
```css
:root[data-performance='High'] .ambient-sprite {
  animation: sway 3s ease-in-out infinite;
}

:root[data-performance='Low'] .ambient-sprite {
  display: none;
}
```

**Benefit:** No JavaScript re-evaluation needed. CSS media queries handle everything.

---

### 3b. Sprite Behaviour Details

#### `AnimatedSprite` — Directional Flipping
`AnimatedSprite.tsx` handles `random_flight` sprites (e.g. the dove on the login screen).  
The sprite flips horizontally to face the direction of travel:
- A `posRef` stores the current position so the rAF/interval can read it without stale closure issues.
- A `facingLeft` React state tracks direction.
- `transform: scaleX(-1)` is applied to the `<img>` when `facingLeft` is true.
- The flip triggers whenever the next waypoint is to the left of the current position.

#### `SpriteManager` — Anchor Z-Index Convention
| Anchor | Z-index | Notes |
|---|---|---|
| `background` | 1 | Dove/creatures — appear behind the safe-zone form |
| `safe_zone` | inside safe-zone | Mounted within the safe-zone container |
| `top_header` | inside banner | Torches — only rendered when the banner image exists |

#### Login Screen — Banner Probe & Sprite Visibility
- Torches (`top_header` anchor) are only mounted when `bannerSrc` is non-null (i.e. the banner image has loaded).
- On theme change, `bannerSrc` is reset to `null` immediately in the banner-probe `useEffect` to prevent a layout flash before the new theme's banner is probed.
- The dove (`background` anchor) is always mounted when `performanceTier` is `'High'`, regardless of banner state.

---

### 4. Theatrical Safe Zone Layout

**Conceptual Design:**
```
┌─────────────────────────────────────────┐
│                                         │
│    🌳 AMBIENT SPRITES (sides)  🏰     │
│                                         │
│         ┌─────────────────────┐         │
│         │   SAFE ZONE         │         │
│         │  (max-width: 600px) │         │
│         │  ┌───────────────┐  │         │
│         │  │ Parchment     │  │         │
│         │  │ Frame (9-slice)│  │         │
│         │  │               │  │         │
│         │  │   Login Form  │  │         │
│         │  │               │  │         │
│         │  └───────────────┘  │         │
│         │                     │         │
│         └─────────────────────┘         │
│                                         │
└─────────────────────────────────────────┘
```

**Implementation:**
```typescript
const MedievalLoginScreen = () => (
  <div className="theatrical-container">
    {/* Background: Auto-filled via CSS variable */}
    
    {/* Optional: Ambient scenery on sides */}
    <div className="ambient-sprite ambient-left"></div>
    <div className="ambient-sprite ambient-right"></div>
    
    {/* Safe Zone: All interactive content */}
    <div className="safe-zone">
      <div className="frame-parchment">
        {/* Form content here */}
      </div>
    </div>
  </div>
)
```

**Responsive Behavior:**
- Desktop: Full ambient sprites visible
- Tablet: Ambient sprites scaled down
- Mobile: Ambient sprites hidden (save space)

---

### 5. Vector Typography Over Pixel Art

**Principle:** Pixel art for aesthetics, vector fonts for clarity.

**Implementation:**
```css
/* Pixel art rendering */
body {
  image-rendering: pixelated;
}

/* But fonts stay crisp */
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-family: Inter, Roboto, sans-serif;
}
```

**Font Strategy:**
- **Standard Labels:** "USERNAME", "PASSWORD", "LOGIN" (not themed)
- **Themed Words:** Kept in pixel-art assets only
- **Font Sizes:** Responsive 16-24px for readability

**Color:** Uses `--color-text` CSS variable (theme-controlled)

---

### 6. Pixel-Perfect Rendering on 4K

**Challenge:** Sub-pixel blurring on high-DPI screens.

**Solution: Integer Scaling**
```css
html {
  image-rendering: pixelated;
  -ms-interpolation-mode: nearest-neighbor;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}
```

**How It Works:**
- Browser uses nearest-neighbor scaling (no interpolation)
- Pixels stay crisp even at 2x or 4x resolution
- No sub-pixel rendering artifacts

**Testing:**
```javascript
// Verify scaling is integer
const dpr = window.devicePixelRatio
console.log(`Device pixel ratio: ${dpr}`) // Should be 1, 2, or 4
```

---

## State Management Architecture

### Zustand Stores

**Why Zustand?**
- Lightweight (1.2KB gzipped)
- No boilerplate (Redux-free)
- Instant theme switching without re-renders
- Perfect for global UI state

### Store 1: themeStore.ts
```typescript
interface ThemeState {
  currentTheme: 'medieval' | 'scifi' | 'default'
  performanceTier: 'High' | 'Low'
  setTheme(theme)
  setPerformanceTier(tier)
}
```

**Data Flow:**
1. User clicks "Medieval" button
2. `setTheme('medieval')` called
3. Zustand updates state + DOM attribute
4. CSS re-evaluates via `[data-theme='medieval']` selector
5. All components instantly reflect new theme
6. **No React re-render needed**

### Store 2: authStore.ts
```typescript
interface AuthState {
  username: string
  password: string
  isLoading: boolean
  user: { id, displayName, role, email } | null
  setUsername(value)
  setPassword(value)
  login() → Promise<boolean>
  logout()
}
```

**Use Case:**
- Form input management, loading state during auth
- Holds the decoded JWT user object after login (includes `email` for dev group role lookup)
- Session persistence via sessionStorage (`sl_token`)

### Store 3: questStore.ts
```typescript
interface QuestState {
  progresses: LearnerProgressFull[]
  activeClassId: string | null
  pointsBalance: number
  isLoading: boolean
  lastPointsAwarded: number
  isQuestComplete: boolean
  devFreshStart: boolean        // when true, fetchProgress() overrides all currentStep to 0
  fetchProgress()
  advanceStep(academicClassId: string)
  setActiveClass(id: string)
  setDevFreshStart(v: boolean)  // also immediately zeros progresses in store
}
```

**Use Case:** Drives `QuestScreen`. Combines `myProgress` + `me` in one GraphQL query. `devFreshStart` ensures learners always enter LT1 from Step 1 when navigating from the home portal.

### Store 4: musicStore.ts
```typescript
interface MusicStore {
  isReady: boolean     // audio has buffered enough to play
  isMuted: boolean
  needsGesture: boolean  // browser blocked autoplay; waiting for user click
  init(src, shouldPlay?)  // load a new track (no-op if same src)
  fadeIn(durationMs?)     // resume and ramp volume 0 → 0.35
  fadeOut(durationMs?)    // ramp volume to 0 then pause
  toggleMute()
  enable()                // alias for fadeIn(600) — used by gesture unlock
}
```

**Key design:** The `HTMLAudioElement` lives as a module-level variable outside React (survives route changes and component unmounts). Zustand only tracks the reactive UI state (`isReady`, `isMuted`, `needsGesture`).

### Store 5: entryStore.ts
```typescript
type Section = 'timetable' | 'chat'
interface EntryStore {
  isTimetableOpen: boolean
  isChatOpen: boolean
  toggleSection(section: Section)  // accordion — closes others when one opens
}
```

**Use Case:** Controls the SmartContainer accordion in `AttendenceUI`. Only one overlay open at a time.

### Store 6: vocabStore.ts
```typescript
interface VocabStore {
  cache: Record<string, ThemeVocab>   // keyed by theme name
  loading: Record<string, boolean>
  ensureLoaded(theme: string)         // fetches /assets/themeVocabulary/{theme}.json if not cached
  getVocab(theme: string): ThemeVocab // returns cache[theme] ?? cache['default'] ?? FALLBACK_VOCAB
}
```

**Use Case:** Async cache for theme vocabulary JSON files. `useThemeVocab()` hook calls `ensureLoaded` on theme change and returns `getVocab(currentTheme)` synchronously. `FALLBACK_VOCAB` (TypeScript constant mirroring `default.json`) is used for the instant before the file loads.

### Utility: src/lib/skinInjection.ts

Applies equipped shop skins to the DOM at runtime. Called by `ProtectedLayout` on Learner login and by `ShopUI` on equip.

```typescript
applyColorScheme(name: string)   // sets --color-* CSS vars on :root for the named scheme
clearColorScheme()               // removes all --color-* inline overrides
applySkinsFromInventory(items, setTheme)  // scans active inventory; calls setTheme() + applyColorScheme()
```

**Color schemes supported:** Crimson Court (dark crimson), Emerald Isle (deep green), Midnight Blue (dark navy).  
`ProtectedLayout` queries `myInventory` via `apolloClient.query` on mount (Learners only) — this ensures equipped skins survive page refreshes.  
`ShopUI.handleEquip` calls `applyColorScheme` immediately on equip (no page reload needed).

### Hook: useBackgroundPreloader.ts
```typescript
// Module-level Set — deduplicates across re-renders and navigations
const loaded = new Set<string>()

export function useBackgroundPreloader() {
  // High tier: preloads all 6 pages on mount
  // Low tier: no-op on mount, exposes preloadPage() for hover-triggered loading
  return { preloadPage: (page: string) => void }
}
```

**Strategy:** `ProtectedLayout` calls this for the upfront High-tier sweep. `HomeCrossroads` tiles call `preloadPage(page)` on `onMouseEnter` for Low-tier lazy loading. The module-level `Set` ensures no asset is fetched twice regardless of which path fires first.

**`ThemeMusicController`** is mounted once inside `<BrowserRouter>` and owns all music logic:
- On theme change → `init('/assets/themes/{theme}/music/theme.wav', onMusicRoute)`
- On route change → `fadeIn()` for `/` and `/home`; `fadeOut()` for all others
- When `needsGesture` → attaches a one-time `document` click listener that calls `enable()`

---

## Component Hierarchy

```
App.tsx (BrowserRouter)
├── ThemeMusicController          — persistent music singleton (no UI)
└── Routes
    ├── / → MedievalLoginScreen
    │         ├── usePageBackground('login')
    │         ├── SpriteManager anchor="background" page="login"   ← dove (random_flight, z-index 1)
    │         ├── banner_top.png (probed — bannerSrc resets to null on theme change to prevent flash)
    │         ├── SpriteManager anchor="top_header" page="login"   ← torches (frame_loop, only when banner exists)
    │         ├── Theme switcher buttons — embedded in banner when banner exists; fixed top-right when no banner
    │         ├── safe-zone → frame-parchment (z-index 10) → login form
    │         │     ├── ThemedInput (username) wrapped in <div className="input-frame-wrap">
    │         │     ├── ThemedInput (password) wrapped in <div className="input-frame-wrap">
    │         │     └── btn-9slice (LOGIN)
    │         ├── Dev quick-fill row (below form) — LEARNER / TEACHER / ADMIN chips; setUsername+setPassword on click
    │         └── MusicToggle (fixed, bottom-right)
    │
    ├── /home → HomePage — role-switches: Learner → LearnerHome | Teacher → TeacherHome | Admin → redirect /admin
    │             LearnerHome (src/pages/LearnerHome.tsx):
    │             ├── usePageBackground('home')
    │             ├── RunningRabbit — rAF loop, position:fixed, bottom-anchored
    │             │     └── home/sprites/moving/rabbit/frame_N.png
    │             ├── cloud <img> × 2 — home/sprites/moving/cloud_drift.png (very slow drift)
    │             │     └── probed before render: {cloudExists && <img …/>} — no onError handler needed
    │             ├── LearnerHomeHeader
    │             │     ├── UserIdentity + CurrencyCounter
    │             │     ├── MusicToggle (inline)
    │             │     └── Logout button
    │             └── safe-zone
    │                   ├── streak indicator
    │                   ├── GreatPortal (primary action button)
    │                   └── UtilityGrid (4 × UtilityTile)
    │             TeacherHome (src/pages/TeacherHome.tsx):
    │             ├── usePageBackground('home'), useBackgroundPreloader
    │             ├── identity line (displayName · role)
    │             ├── TeacherPortal — LIVE LESSON → /teacherDashboard
    │             ├── 4 × TeacherTile: STAFFROOM/REGISTER/MESSAGES/MY CLASSES
    │             └── TeacherPlanningHub (src/pages/TeacherPlanningHub.tsx) — collapsible
    │                   ├── Tab: TIMETABLE
    │                   │     ├── Class legend (7 color-coded chips)
    │                   │     ├── Cycle day nav (days 1–10, ◂/▸ + numbered pills)
    │                   │     └── TimetableSlotRow per lesson (color border, P#, class, Task·Step·N/M, time, → btn)
    │                   ├── Tab: TERM PLAN  ← live myTasks query (DB)
    │                   │     ├── Grade tabs (GR 9/10/11/12) — tasks grouped by task.grade from DB
    │                   │     ├── TaskCard per task — published/draft badge; EDIT → /task-creator/:id
    │                   │     └── taskToLearningTaskPlan() maps stepLabels[] → TaskCard shape
    │                   └── Tab: YEAR PLAN  ← mock data (no DB table for curriculum year plan)
    │                         ├── Grade selector (Gr 9/10/11/12)
    │                         ├── Year mark formula note
    │                         └── 4 × TermCard (topics, color-coded assessments, % year contribution, exam flag)
    │                   Timetable + Year Plan mock data: src/mockPlanningData.ts — TEACHER_CLASSES, CYCLE_TIMETABLE, YEAR_PLANS
    │
    ├── /teacherDashboard → TeacherDashboard
    │             ├── useSearchParams — reads ?classId to pre-select class tab
    │             ├── ClassTabs — all teacher's academic classes
    │             ├── "◂ MY CLASSES" back button → /classes
    │             └── [per-class learner progress panels — see Phase 5a]
    │
    ├── /classes → TeacherClassesOverview
    │             ├── teacherClasses query
    │             └── ClassCard grid (repeat(auto-fill, minmax(300px,1fr)))
    │                   ├── classProgress(academicClassId) — 10 s poll
    │                   ├── Progress bar (blue→gold gradient)
    │                   ├── Breakdown chips: ACTIVE/WAIT-STATE/COMPLETE/NOT STARTED
    │                   └── "OPEN DASHBOARD →" → /teacherDashboard?classId=X
    │
    ├── /staffroom → StaffroomUI (src/pages/StaffroomUI.tsx)
    │             ├── DB: staff_messages, announcements, staffroom_state (migrate_staffroom.sql)
    │             ├── Section: SPEAKER CHANNEL (always expanded)
    │             │     ├── Podium banner — admin assign/release dropdown; speaker RELEASE btn
    │             │     ├── Speaker message stream (speakerMessages — 5 s poll)
    │             │     └── Speaker input (only rendered when user holds podium)
    │             ├── Section: STAFF CHAT (collapsible inline)
    │             │     ├── RosterStrip — allStaff query, green dot per member
    │             │     ├── ChatThread — staffMessages — 5 s poll, auto-scroll
    │             │     └── MessageInput (enter-to-send)
    │             └── Section: ANNOUNCEMENTS (collapsible inline)
    │                   ├── AnnouncementForm — textarea + ALL / SELECT GRADES target
    │                   └── AnnouncementCard list — pinned first; pin/delete for own or admin
    │
    ├── /learningtask → QuestScreen
    │             ├── HeaderBar
    │             ├── ClassTabs (hidden if one class)
    │             ├── QuestPath (step circles)
    │             ├── StepPanel | QuestCompletePanel
    │             │     StepPanel: fetches task_info.json per step; title + description from JSON
    │             │       "START LEARNING TASK →" → /task?classId=<uuid>&step=<n>
    │             │       (COMPLETE STEP button removed — advancement happens via LearningTaskUI Phase V)
    │             │     QuestCompletePanel: uses vocab.taskCompleteTitle + vocab.taskCompleteBody
    │             └── PointsPopup (AnimatePresence)
    │
    ├── /task → LearningTaskUI [The Cooperative Quest]
    │             URL params: ?classId=<uuid>&step=<n>  (passed from QuestScreen)
    │             Always opens at Phase 1 — sessionStorage read removed; no mid-flow resumption on re-entry
    │             ├── PhaseBar (5-node progress: STRUCTURE·MASTER·DISCUSS·RECALIBRATE·SUBMIT)
    │             ├── Phase 1 — MetacogScaffold
    │             │     ├── ChallengePanel (video placeholder + scenario text)
    │             │     └── ResponsePanel (4 mandatory textarea questions; unlock gate)
    │             ├── Phase 2 — ContentMastery
    │             │     ├── ResourceHub tab (PDF + VIDEO resource tiles)
    │             │     └── BlindQuiz tab — one question at a time; dot-strip nav; auto-advance 350 ms; AnimatePresence slide
    │             ├── Phase 3 — CooperativeDiscussion
    │             │     ├── RoleSelection (Leader / Timer / Scribe / Angle Checker / Learner)
    │             │     │     DEV_GROUP_ROLE_MAP auto-assigns role by email on entry; CHANGE ROLE still available
    │             │     ├── Group member strip — all 4 dev members shown; current user highlighted gold
    │             │     ├── Group chat — wired to real conversation via myTaskGroup.conversationId
    │             │     │     GROUP_CHAT_MESSAGES query polls every 4 s when conversationId exists
    │             │     │     SEND_GROUP_MESSAGE mutation sends to real conversation; DEV_GROUP local append is fallback
    │             │     ├── QuizReview (shared, above all role panels, collapsible)
    │             │     │     Receives currentQuestion prop from parent (driven by Leader's NEXT QUESTION button)
    │             │     │     No independent navigation — dot strip display-only; "Waiting…" state at q=0
    │             │     │     Two-column layout: question+options (flex:3) | KEEP/CHANGE buttons (flex:2)
    │             │     │     frame-parchment maxWidth overridden to 'none' so panel fills full width
    │             │     ├── LeaderPanel (NextQuestion control, DistChart, PulseButton 20 s, Prompter icons)
    │             │     ├── TimerPanel (private countdown, DivideTime, PulseButton 30 s, MoveOnAlert)
    │             │     ├── ScribePanel (ChatPanel + Capture icons, Notebook reorder, Draft + FinalPhase trigger)
    │             │     ├── AngleCheckerPanel (Anti-Groupthink Triad × 3, PulseButton 30 s)
    │             │     ├── LearnerPanel (pushed question + DistChart + Keep/Change intent → onIntent callback)
    │             │     └── FinalPhaseView (scribe draft revealed to all → proceed to Phase 4)
    │             ├── Phase 4 — RecalibrationQuiz (questions + options reshuffled; p3Intents pre-loaded)
    │             └── Phase 5 — FinalArtifact (Video/PDF/Document selector, file drop, quest-complete)
    │
    │             Content assets: public/assets/learning-tasks/LearningTask1/
    │               RLC/challenge_video.mp4   — Phase I scenario video
    │               Content/content_video.mp4 — Phase II resource video
    │               Content/content_document.pdf — Phase II resource PDF
    │               Quiz/quiz_reference.pdf   — teacher mark scheme
    │
    ├── /attendence → AttendenceUI [Attendance]
    │                  ├── usePageBackground('attendence')
    │                  ├── SpriteManager anchor="background" page="attendence"
    │                  │     └── attendence/sprites.json → LoopingSprite (fireplace)
    │                  ├── TeacherTicker — marquee bar → notice modal on click
    │                  │     myAnnouncements query (30 s poll) — grade-filtered; pinned first with 📌 badge
    │                  ├── SmartContainer "TODAY'S TIMETABLE · DAY N"
    │                  │     └── TimetableContent
    │                  │           ├── Day nav (◀/▶) — today + 9 future school days
    │                  │           ├── Academic day calculation (10-day cycle)
    │                  │           ├── Assessment Due column (amber/green per task state)
    │                  │           └── TaskDetailModal (zIndex 80) → /submit/:taskId
    │                  ├── SmartContainer "CLASS CHAT"
    │                  │     └── ChatContent
    │                  │           ├── Roster strip (presence dots, 4-col grid)
    │                  │           ├── Scrollable message list
    │                  │           └── Pinned message input
    │                  └── GO TO LESSON row → /learningtask
    │
    ├── /submit/:taskId → AssignmentSubmitUI [Submission Portal]
    │                       ├── usePageBackground('attendence')
    │                       ├── Task identity card
    │                       └── Placeholder form (file upload, comments, disabled submit)
    │
    ├── /subjects → CurriculumNavigator [My Subjects]
    │               ├── Tape scroll (3 visible subjects, ◀/▶ nav, 560ms expo-out ease)
    │               └── Merges live questStore progress onto mockSubjects (IT subject reflects real DB step/%)
    ├── /shop    → ShopUI [Shop]
    │               ├── useThemeVocab() — page title + currency label from vocab
    │               ├── ItemCard grid — PreviewImage component loads real theme assets per item type/page
    │               │     resolvePreviewPaths(): assetPath (DB, priority) → theme background (themes only)
    │               │     Sprites/backgrounds with no assetPath return [] → type icon placeholder (no image bleed)
    │               │     4 sprites have confirmed assetPath: Torch Flicker, Dove, Rabbit, Fireplace
    │               │     Sprite item names must match their asset folder name (snake_case → Title Case)
    │               │     Color schemes: 4-colour swatch preview; Soundtracks: ♪ audio placeholder
    │               ├── ItemModal — 220 px preview + PreviewImage (modalSize) + buy/equip CTA
    │               └── Filter tabs: All · Themes · Soundtracks · Color Schemes · Sprites · Backgrounds
    ├── /social  → SocialUI [Messages]
    │               ├── useThemeVocab() — messagesPageTitle + messagesReturnLabel from vocab
    │               ├── Dual-pane: sidebar (conversation list) + right chat pane
    │               └── New Chat / New Group modals; group multi-select mode
    │
    ├── /admin   → AdminUI (src/pages/AdminUI.tsx) — Admin role only
    │               ├── 4 ExpandingCard sections (same pattern as StaffroomUI): TEACHERS · LEARNERS · REGISTER CLASSES · ACADEMIC CLASSES
    │               ├── UserModal — create/edit users (role, email, password, paidStatus)
    │               ├── RegisterClassModal — create/edit register class + assign teacher
    │               ├── AcademicClassModal — create/edit academic class + assign register class + teacher
    │               └── EnrollModal — view/add/remove learner enrollments per academic class
    │
    └── /ledger  → LedgerUI (src/pages/LedgerUI.tsx) — Learner role
                    ├── myLedger(limit: 100) + me.pointsBalance via GraphQL
                    ├── Scrollable list: date · reason label · delta (green/red)
                    └── HISTORY button on LearnerHome links here
```

**Key Principle:** `ThemeMusicController` mounts once and never unmounts — the audio element persists across all route changes.

---

## CSS Architecture

### Organization (globals.css)

1. **CSS Variables** (theme injection)
   - Theme colors, asset paths
   - Performance toggles

2. **Pixel-Perfect Rendering**
   - image-rendering directives
   - Font smoothing

3. **Theatrical Layout**
   - Container, safe zone, ambient sprites
   - Positioning and z-index

4. **9-Slice Framework**
   - Generic frame class
   - Button-specific styles
   - Border preservation logic

5. **Performance-Aware Animations**
   - Conditional keyframes
   - Glass-morphism (High tier only)

6. **Form Styling**
   - Input focus states
   - Label clarity (`--color-text` for USERNAME/PASSWORD labels — not `--color-accent`)
   - Error/success states
   - **Autofill-proof input pattern** (see below)

7. **Responsive Breakpoints**
   - 640px (tablet)
   - 480px (mobile)

### Autofill-Proof Input Pattern

Chrome autofill overrides the `background` of `<input>` elements, wiping any themed background image applied directly to the input. The working solution:

```tsx
{/* Wrapper div carries background image — Chrome autofill cannot touch it */}
<div className="input-frame-wrap">
  <input className="form-input" ... />
</div>
```

```css
.input-frame-wrap {
  background-image: var(--theme-input-box);
  background-size: 100% 100%;
}

/* Input is transparent — autofill only affects <input>, not the parent div */
.input-frame-wrap .form-input {
  appearance: none;
  background: transparent !important;
  box-shadow: none !important;   /* prevent inset box-shadow from covering wrapper */
  width: 100%;
  box-sizing: border-box;
}

/* Delay trick: postpones Chrome's autofill background-color indefinitely */
.input-frame-wrap .form-input:-webkit-autofill {
  transition: background-color 9999s ease-in-out 0s;
}
```

**Do not** use the `box-shadow: inset 0 0 0 1000px` autofill override — it covers the wrapper's `background-image`.

---

### Tailwind Configuration

```javascript
theme.extend.spacing {
  '1': '8px',    // 8px base unit
  '2': '16px',
  '3': '24px',   // Used throughout
}
```

**Why 8px Grid?**
- Aligns with pixel-art scale
- Professional design system
- Responsive consistency

---

## Cognitive Load Management

**Design Goal:** Isolate learner focus to current step.

**Implementation (Ready for Future):**
```typescript
// Step-based rendering
const currentStep = 3

return (
  <>
    {currentStep === 1 && <LoginScreen />}
    {currentStep === 2 && <QuestionScreen />}
    {currentStep === 3 && <RewardScreen />}
    {/* Step 4+ assets NOT loaded */}
  </>
)
```

**Benefits:**
- Reduces cognitive overload
- Faster initial page load
- Students can't skip ahead

---

## Network Optimization

### Image Asset Strategy

1. **Lazy Loading (Future)**
   - Load theme assets on-demand
   - Preload next theme during transition

2. **Compression**
   - Target: 300-500KB per theme
   - Use PNG optimization, WebP conversion

3. **Network Adaptation**
   - High tier: Full resolution + animations
   - Low tier: Reduced quality + static only

### API Integration (Middleware)

```typescript
// Future GraphQL integration
const LOGIN_MUTATION = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      token
      user { id, name }
    }
  }
`
```

---

## Security Considerations

### Frontend Boundaries
- JWT stored in `sessionStorage` (`sl_token`) — cleared on tab close; no persistent cookie
- Password transmitted over HTTPS in production; never logged or stored in frontend state
- CORS configured on backend (`cors({ origin: '*' })` for local dev — restrict in production)
- `ProtectedRoute` component guards all routes requiring auth; role-based redirect at login

### Backend Auth
- JWT verified on every GraphQL request via `verifyToken` middleware in Apollo context
- `requireRole(ctx, role)` helper throws `AuthenticationError` for unauthorised access — no silent failures
- LTI 1.3 DB tables provisioned; full OIDC handshake is a future implementation phase

---

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| CSS Variables | ✅ 49+ | ✅ 31+ | ✅ 9.1+ | ✅ 15+ |
| border-image | ✅ All | ✅ All | ✅ All | ✅ All |
| image-rendering | ✅ Yes | ✅ 3.6+ | ✅ 11+ | ✅ Yes |
| Zustand | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| Network API | ✅ 61+ | ✅ 55+ | ❌ No | ✅ 79+ |

**Fallback for Network API:**
```typescript
if (!('connection' in navigator)) {
  setPerformanceTier('High') // Conservative default
}
```

---

## Performance Benchmarks

### Target Metrics
- **First Contentful Paint (FCP):** < 1.5s
- **Largest Contentful Paint (LCP):** < 2.5s
- **Cumulative Layout Shift (CLS):** < 0.1
- **Time to Interactive (TTI):** < 3.5s

### Optimization Strategies
1. Code-split components (Vite lazy imports)
2. Image optimization (WebP + fallback)
3. CSS-only animations (no JS overhead)
4. Minimal dependencies (Zustand only)
5. Server-side rendering (future: React SSR)

---

## Extensibility

### Adding New Screens

```typescript
// screens/QuestScreen.tsx
export const QuestScreen: React.FC = () => (
  <div className="theatrical-container">
    <div className="safe-zone">
      <div className="frame-parchment">
        {/* Content */}
      </div>
    </div>
  </div>
)
```

### Adding New Theme

1. Create `/public/assets/themes/[name]/`
2. Add CSS variables in `globals.css`
3. Update `Theme` type in `themeStore.ts`

### Adding Performance Features

1. Add condition in globals.css:
   ```css
   :root[data-performance='High'] .new-effect {
     /* Enable effect */
   }
   ```

2. Component respects via styling only (no JS)

---

## Testing Strategy

### Visual Regression Testing
```bash
# Screenshot comparison across themes
npm run test:visual
```

### Performance Testing
```bash
# Check metrics against benchmarks
npm run test:lighthouse
```

### Accessibility Testing
```bash
# WCAG 2.1 compliance
npm run test:a11y
```

---

## Remaining Roadmap

### Phase 2: Sci-Fi Theme Assets
- Pixel art assets for `scifi/` and `default/` theme folders
- CSS variables already registered; theme switcher already wired — only asset files needed

### Phase 8: Polish & Launch
- WCAG 2.1 accessibility audit
- Lighthouse performance audit (target FCP < 1.5 s)
- WebP conversion + PNG optimisation for all theme assets
- Cross-browser and mobile testing
- Production build + deployment pipeline

### Phase 10: Bot System (implement last)
- Frontend-only simulated group discussion bots for solo learners in Phase III
- See `docs/bots.md` for full design spec — do not implement until Phase III mechanics are final

### Landing Page
- Spec in `docs/website.md` — not yet started

---

## References

- [CSS Variables (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [border-image Spec](https://www.w3.org/TR/css-backgrounds-3/#border-image)
- [Network Information API](https://wicg.github.io/netinfo/)
- [Zustand Documentation](https://zustand-react.dev/)
- [React Best Practices](https://react.dev/reference/rules)

---

**Last Updated:** May 16, 2026  
**Version:** 1.25.0  
**Status:** Phases 1–7 + 5b + 5c + 5d + 5e + 9 complete. Frontend additions since last update: Phase III group chat wired to real `conversation_id` via `GROUP_CHAT_MESSAGES` polling + `SEND_GROUP_MESSAGE` mutation; TeacherPlanningHub TERM PLAN tab wired to live `myTasks` query with `taskToLearningTaskPlan()` converter; Vite proxy extended with `/analytics` route. Backend additions: Redis caching layer (`backend/src/lib/cache.ts`); LTI 1.3 tables (`migrate_lti.sql`); `activitySummary` GQL query; `GET /analytics/export` REST endpoint. All new migrations must be run in order — see `docs/runningProject.md`.
