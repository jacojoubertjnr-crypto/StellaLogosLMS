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
.frame-parchment {
  background-image: var(--theme-frame);
  padding: 3rem 2.5rem;
  /* Corners preserved, edges repeat, center stretches */
}
```

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
  currentTheme: 'medieval' | 'scifi' | 'modern'
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
  user: { id, displayName, role } | null
  setUsername(value)
  setPassword(value)
  login() → Promise<boolean>
  logout()
}
```

**Use Case:**
- Form input management, loading state during auth
- Holds the decoded JWT user object after login
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
  fetchProgress()
  advanceStep(academicClassId: string)
  setActiveClass(id: string)
}
```

**Use Case:** Drives `QuestScreen`. Combines `myProgress` + `me` in one GraphQL query.

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
    │         ├── SpriteManager anchor="background" page="login"
    │         ├── banner_top.png
    │         ├── SpriteManager anchor="top_header" page="login"
    │         ├── safe-zone → frame-parchment → login form
    │         │     ├── ThemedInput (username)
    │         │     ├── ThemedInput (password)
    │         │     └── btn-9slice (LOGIN)
    │         └── MusicToggle (fixed, bottom-right)
    │
    ├── /home → HomePage → HomeCrossroads (Learner) | TeacherPlaceholder
    │             HomeCrossroads:
    │             ├── usePageBackground('home')
    │             ├── RunningRabbit — rAF loop, position:fixed, bottom-anchored
    │             │     └── home/sprites/moving/rabbit/frame_N.png
    │             ├── cloud <img> × 2 — home/sprites/moving/cloud_drift.png (very slow drift)
    │             ├── HomeCrossroadsHeader
    │             │     ├── UserIdentity + CurrencyCounter
    │             │     ├── MusicToggle (inline)
    │             │     └── Logout button
    │             └── safe-zone
    │                   ├── streak indicator
    │                   ├── GreatPortal (primary action button)
    │                   └── UtilityGrid (4 × UtilityTile)
    │
    ├── /quest → QuestScreen
    │             ├── HeaderBar
    │             ├── ClassTabs (hidden if one class)
    │             ├── QuestPath (step circles)
    │             ├── StepPanel | QuestCompletePanel
    │             └── PointsPopup (AnimatePresence)
    │
    ├── /attendence → AttendenceUI [The Tavern]
    │                  ├── usePageBackground('attendence')
    │                  ├── SpriteManager anchor="background" page="attendence"
    │                  │     └── attendence/sprites.json → LoopingSprite (fireplace)
    │                  ├── TeacherTicker — marquee bar → notice modal on click
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
    │                  └── GO TO LESSON row → /quest
    │
    ├── /submit/:taskId → AssignmentSubmitUI [Submission Portal]
    │                       ├── usePageBackground('attendence')
    │                       ├── Task identity card
    │                       └── Placeholder form (file upload, comments, disabled submit)
    │
    ├── /library → CurriculumNavigator [The Royal Library]
    │               └── Tape scroll (3 visible subjects, ◀/▶ nav, 560ms expo-out ease)
    ├── /shop    → ShopUI (placeholder)
    └── /social  → SocialUI (placeholder)
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
   - Label clarity
   - Error/success states

7. **Responsive Breakpoints**
   - 640px (tablet)
   - 480px (mobile)

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
- **This is a prototype** - no actual auth here
- Password transmitted to backend only
- Uses HTTPS in production
- CORS configured for GraphQL endpoint

### Future Integration
- LTI 1.3 SSO for school systems
- JWT tokens for session management
- Secure cookie storage

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

## Future Roadmap

### Phase 2: Teacher Dashboard
- Live student progress (Grid Monitor)
- Real-time messaging (Socket.io integration)
- Teacher "Theater Mode"

### Phase 3: Full LMS
- Quest progression system
- Virtual economy (points, rewards)
- Asset shop interface

### Phase 4: Extensibility
- Custom theme builder UI
- API for third-party apps
- Internationalization (i18n)

---

## References

- [CSS Variables (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [border-image Spec](https://www.w3.org/TR/css-backgrounds-3/#border-image)
- [Network Information API](https://wicg.github.io/netinfo/)
- [Zustand Documentation](https://zustand-react.dev/)
- [React Best Practices](https://react.dev/reference/rules)

---

**Last Updated:** May 1, 2026  
**Version:** 1.6.0  
**Status:** Phase 4 UI shell complete. AttendenceUI fully built (timetable navigation, assessment due column, task detail modal, roster-in-chat, GO TO LESSON). AssignmentSubmitUI placeholder added. All pages have entrance animations. Dual-strategy background preloader implemented. Themed scrollbars and smooth library tape scroll.
