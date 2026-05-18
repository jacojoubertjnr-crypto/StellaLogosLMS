# Stella Logos — Theme Implementation Guide

## Overview

The Theme-Folder Architecture allows instant visual identity swaps by changing CSS variables mapped to asset folders. Assets are organised **per page** within each theme — every GUI screen has its own subfolder containing its background and sprites.

---

## Theme & Page Folder Structure

```
public/assets/themes/[theme-name]/
│
├── login/
│   ├── background.png            # Full-viewport background for the login screen
│   ├── sprites.json              # Sprite manifest for this page
│   └── sprites/
│       ├── stationary/           # Fixed-position, frame-animated sprites (torches, candles…)
│       │   └── torch_flicker/
│       │       ├── frame_1.png
│       │       ├── frame_2.png
│       │       └── frame_3.png
│       └── moving/               # Sprites that travel across the screen (creatures, clouds…)
│           └── dove/
│               ├── frame_1.png
│               ├── frame_2.png
│               ├── frame_3.png
│               └── clicked.png
│
├── home/
│   ├── background.png
│   ├── sprites.json
│   └── sprites/
│       ├── stationary/
│       └── moving/
│           ├── rabbit/
│           └── cloud_drift.png
│
├── mySubjects/
│   ├── background.png
│   ├── sprites.json
│   └── sprites/
│       ├── stationary/
│       └── moving/
│
├── messages/
│   ├── background.png
│   ├── sprites.json
│   └── sprites/
│       ├── stationary/
│       └── moving/
│
├── attendence/
│   ├── background.png
│   ├── sprites.json
│   └── sprites/
│       ├── stationary/
│       │   └── fireplace/        ← frame_1/2/3.png
│       └── moving/
│
├── learningTask/
│   ├── background.png
│   ├── sprites.json
│   └── sprites/
│       ├── stationary/
│       └── moving/
│
├── shop/
│   ├── background.png
│   ├── sprites.json
│   └── sprites/
│       ├── stationary/
│       └── moving/
│
├── banner_top.png                # Shared header banner (login page)
├── banner_home.png               # Shared header bar (home page)
├── frame_main.png                # Parchment scroll frame (9-slice) — shared
├── btn_primary.png               # Primary button (9-slice) — shared
├── ambient_sprite.png            # Side scenery (castle, trees…) — shared
├── input_box.png                 # Themed input field background — shared
├── input_frame.png               # Themed input border frame — shared
└── music/
    └── theme.wav                 # Single looping ambient track for this theme
```

Shared root assets (banner, frame, button, ambient, input) apply to all pages of a theme.  
Per-page assets (background, sprites) are scoped to their folder and loaded dynamically.

---

## Background Loading — `usePageBackground`

Every page component calls the `usePageBackground(page)` hook from `src/hooks/usePageBackground.ts`.

```typescript
// src/hooks/usePageBackground.ts
export function usePageBackground(page: string) {
  const { currentTheme } = useThemeStore()

  useEffect(() => {
    const url = `/assets/themes/${currentTheme}/${page}/background.png`
    let active = true
    const probe = new Image()
    probe.onload = () => {
      if (active) document.body.style.backgroundImage = `url('${url}')`
    }
    probe.src = url
    return () => {
      active = false
      document.body.style.backgroundImage = ''   // restore CSS-var default on unmount
    }
  }, [currentTheme, page])
}
```

**How it works:**
- Probes `/{theme}/{page}/background.png` with a silent `Image()` object.
- If the file exists, sets `document.body.style.backgroundImage` inline (overrides the CSS var).
- On page unmount, clears the inline style so the CSS `--theme-bg` fallback takes over.
- If the file is missing, the CSS variable default is left untouched — no broken UI.

**Usage in every page component:**
```typescript
// MedievalLoginScreen (login page)
usePageBackground('login')

// HomeCrossroads (home page)
usePageBackground('home')

// Future pages follow the same pattern
usePageBackground('mySubjects')
usePageBackground('shop')
// etc.
```

---

## Sprite System

### `SpriteManager` Component

`src/components/SpriteManager.tsx` reads the page's `sprites.json` manifest and renders all sprites for a given anchor layer.

**Props:**
```typescript
interface SpriteManagerProps {
  anchor: 'top_header' | 'background' | 'safe_zone'
  page: string   // e.g. 'login', 'home', 'shop'
}
```

**URL pattern:**
```
/assets/themes/{theme}/{page}/sprites.json
/assets/themes/{theme}/{page}/sprites/{file}
```

**Usage in a page component:**
```tsx
<SpriteManager anchor="background" page="login" />
<SpriteManager anchor="top_header" page="login" />
```

---

### `sprites.json` Manifest Schema

Each page folder contains a `sprites.json` that declares every sprite for that page:

```json
{
  "sprites": [
    {
      "id": "torch_left",
      "file": "stationary/torch_flicker",
      "anchor": "top_header",
      "position": { "x": "27.5%", "y": "-8px" },
      "size": { "width": "32px", "height": "64px" },
      "performance": "high",
      "animationDelay": "0s",
      "movement": { "type": "frame_loop", "frameRate": 110 }
    },
    {
      "id": "creature_1",
      "file": "moving/dove",
      "anchor": "background",
      "position": { "x": "20%", "y": "30%" },
      "size": { "width": "64px", "height": "64px" },
      "movement": {
        "type": "random_flight",
        "waypointInterval": 3000,
        "frameRate": 150
      },
      "performance": "high"
    }
  ]
}
```

**Field reference:**

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier for this sprite instance |
| `file` | string | Path within `sprites/` — prefix `stationary/` or `moving/` then folder name |
| `anchor` | string | Where in the layout to mount: `background`, `top_header`, or `safe_zone` |
| `position` | object | `{ x, y }` — percentage or px, relative to the anchor container |
| `size` | object | `{ width, height }` in px |
| `performance` | `"high"` | If set, sprite only renders on the High performance tier |
| `animationDelay` | string | CSS-style delay, e.g. `"0.5s"` — used to stagger stationary sprites |
| `movement.type` | string | `frame_loop` (stationary) · `random_flight` (creature) · `linear_drift` (cloud) |
| `movement.frameRate` | number | ms per frame for frame_loop and random_flight |
| `movement.waypointInterval` | number | ms between random waypoints (random_flight only) |
| `movement.speed` | string | CSS duration for linear_drift, e.g. `"40s"` |
| `movement.yMin` / `yMax` | number | Vertical range clamp for random_flight (0–100 % of container) |

---

### Sprite Types

#### Stationary Sprites (`stationary/`)
Fixed-position sprites that loop through numbered frames.  
Files: `frame_1.png`, `frame_2.png`, `frame_3.png` (minimum 3 frames).  
Movement type: `frame_loop`.  
Examples: torch flames, fireplace, candles, waving flags.

#### Moving Sprites (`moving/`)
Sprites that travel across the screen.  
Files: `frame_1.png`, `frame_2.png`, `frame_3.png` + `clicked.png` (for clickable creatures).  
Movement types: `random_flight` (creatures), `linear_drift` (clouds).  
Clicking a `random_flight` sprite shows `clicked.png` for 0.9 s then respawns.

---

## CSS Theme Registration

Add a block to `src/styles/globals.css` for each theme. The `--theme-bg` variable is the **fallback body background** shown before any page-specific background loads.

```css
:root[data-theme='medieval'] {
  --theme-bg: url('/assets/themes/medieval/login/background.png');
  --theme-banner: url('/assets/themes/medieval/banner_top.png');
  --theme-banner-home: url('/assets/themes/medieval/banner_home.png');
  --theme-frame: url('/assets/themes/medieval/frame_main.png');
  --theme-btn-primary: url('/assets/themes/medieval/btn_primary.png');
  --theme-ambient: url('/assets/themes/medieval/ambient_sprite.png');
  --theme-input-frame: url('/assets/themes/medieval/input_frame.png');
  --theme-input-box: url('/assets/themes/medieval/input_box.png');

  --color-primary: #8B4513;
  --color-secondary: #D2691E;
  --color-accent: #FFD700;
  --color-text: #2C1810;
  --color-bg-overlay: rgba(139, 69, 19, 0.15);
}
```

> **Note:** There is no longer a `--theme-bg-home` variable. Every page background is loaded dynamically by `usePageBackground()`. Only `--theme-bg` remains as the body fallback.

---

## Adding a New Theme: Step-by-Step

### Step 1: Create the theme folder tree
```
public/assets/themes/[theme-name]/
├── login/sprites/{stationary,moving}/
├── home/sprites/{stationary,moving}/
├── mySubjects/sprites/{stationary,moving}/
├── messages/sprites/{stationary,moving}/
├── attendence/sprites/{stationary,moving}/
├── learningTask/sprites/{stationary,moving}/
└── shop/sprites/{stationary,moving}/
```
Each page folder also gets a `sprites.json` (can start empty: `{"sprites":[]}`).

### Step 2: Create shared root assets
Design these five pixel-art PNGs:

| File | Purpose | Target Size |
|---|---|---|
| `banner_top.png` | Login page header bar | 1920×200 px, < 100 KB |
| `frame_main.png` | Parchment/form container (9-slice) | 512×512 px, < 150 KB |
| `btn_primary.png` | Primary button (9-slice) | 256×96 px, < 80 KB |
| `ambient_sprite.png` | Side scenery bookends | 512×640 px, < 200 KB |
| `input_box.png` | Input field background | 600×120 px, < 80 KB |

### Step 3: Create page backgrounds
Place `background.png` in each page subfolder.  
Recommended: 1920×1080 px minimum, < 500 KB per image.

### Step 4: Register in CSS
Add the CSS variable block (Step above) to `globals.css`.

### Step 5: Update the Theme type
```typescript
// src/stores/themeStore.ts
export type Theme = 'medieval' | 'scifi' | 'default' | '[theme-name]'
```

### Step 6: Add sprites
Place frame PNGs in `sprites/stationary/{name}/` or `sprites/moving/{name}/`  
and declare them in the page's `sprites.json`.

---

## Asset Specifications

### Background (background.png)
- **Size:** 1920×1080 minimum, 2560×1440 for 4K
- **Format:** PNG-32
- **File size:** < 500 KB after optimisation
- **Coverage:** Fills full viewport

### 9-Slice Frame (frame_main.png)
```
┌─32px─┬────────────┬─32px─┐
│      │ top edge   │      │
├──────┼────────────┼──────┤ 32px
│ left │            │right │
│ edge │   center   │ edge │
├──────┼────────────┼──────┤ 32px
│      │ btm edge   │      │
└──────┴────────────┴──────┘
  32px    repeating    32px
```
Corners preserved, edges repeat, center stretches.

### Sprite Frames (frame_N.png)
- Standard size: 64×64 px (or match `size` in sprites.json)
- `image-rendering: pixelated` applied automatically
- Minimum 3 frames; `clicked.png` required for clickable moving sprites

---

## Colour Palette Variables

```css
--color-primary:     /* Main interactive colour (buttons, borders) */
--color-secondary:   /* Accent for secondary elements */
--color-accent:      /* Highlight/focus colour */
--color-text:        /* Main text colour */
--color-bg-overlay:  /* Subtle overlay for glass effects (rgba) */
```

---

## Input Box Theming — Chrome Autofill-Proof Pattern

Chrome autofill overrides the `background` of `<input>` elements directly, which wipes any themed background image set on the input. The solution is to apply the background image to a **wrapper `<div>`** instead.

### Structure
```tsx
<div className="input-frame-wrap">
  <input className="form-input" ... />
</div>
```

### CSS Rules
```css
/* Wrapper carries the themed background image */
.input-frame-wrap {
  background-image: var(--theme-input-box);
  background-size: 100% 100%;
  background-repeat: no-repeat;
}

/* Input is fully transparent — Chrome autofill cannot affect the wrapper */
.input-frame-wrap .form-input {
  appearance: none;
  background: transparent !important;
  box-shadow: none !important;   /* blocks the inset box-shadow autofill hack */
  width: 100%;
  box-sizing: border-box;
}

/* Autofill delay trick — prevents yellow flash without using inset box-shadow */
.input-frame-wrap .form-input:-webkit-autofill {
  transition: background-color 9999s ease-in-out 0s;
}
```

**Why `transition` instead of `box-shadow`:** The classic autofill fix (`box-shadow: inset 0 0 0 1000px …`) would cover the wrapper's `background-image`. The `transition: background-color 9999s` trick delays Chrome's autofill colour paint effectively forever, leaving the wrapper image visible.

**`input_frame.png` overlay (`::after`):** A second decorative overlay is defined in CSS as a `::after` pseudo-element on `.input-frame-wrap`. It is currently **disabled** (`display: none`) for all themes and can be activated per-theme when the asset is ready.

---

## CSS Architecture — Layout vs Visual Rules

**Core rule:** Base classes own **layout**. Theme overrides own **visuals only**.

### `.frame-parchment` — Base Padding
```css
/* Base: works for any theme without border art */
.frame-parchment {
  padding: 3rem 2.5rem 2.5rem;
}

/* Medieval override: extra horizontal padding to clear scroll border art */
[data-theme='medieval'] .frame-parchment {
  padding-left: 5rem;
  padding-right: 5rem;
}

/* Default theme override: visual-only (background-color, border, box-shadow) */
[data-theme='default'] .frame-parchment {
  background-image: none;
  background-color: /* dark navy CSS panel */;
  border: /* panel border */;
  box-shadow: /* panel shadow */;
  /* NO padding change — base handles layout */
}
```

### `.btn-9slice` — Base Width
```css
/* Base: full-width for all themes */
.btn-9slice {
  width: 100%;
  align-self: stretch;
}

/* Theme overrides only change visuals */
[data-theme='default'] .btn-9slice {
  background-image: none;
  background-color: /* colour */;
  border: /* border */;
  color: /* text */;
  /* NO width/layout changes */
}
```

---

## Preventing CSS Variable Flash on First Paint

`data-theme` and `data-performance` are set in **two places** to eliminate any flash before React renders:

1. **`index.html`** — hardcoded on the `<html>` element:
   ```html
   <html data-theme="medieval" data-performance="High">
   ```

2. **`themeStore.ts`** — set synchronously at **module load** (before React's first render):
   ```typescript
   // Runs immediately when the module is imported — not inside a React effect
   document.documentElement.setAttribute('data-theme', storedTheme ?? 'medieval')
   document.documentElement.setAttribute('data-performance', storedTier ?? 'High')
   ```

This double-lock means CSS variables resolve on the very first CSS paint, with no unstyled flash.

---

## Troubleshooting

| Issue | Solution |
|---|---|
| Background doesn't appear | Confirm `background.png` exists at `{theme}/{page}/background.png` |
| Sprites not showing | Validate `sprites.json` with a JSON linter — a single syntax error silently clears all sprites |
| Torches staggered wrong | Check `animationDelay` strings match `"0s"` / `"0.5s"` format |
| Sprite in wrong layer | Check `anchor` value matches where `<SpriteManager>` is mounted in the DOM |
| Blurry sprite pixels | Confirm `image-rendering: pixelated` on the img element |
| Theme doesn't switch | Verify `data-theme` attribute updates; check CSS selector spelling |
| Autofill clears input background | Ensure `background-image` is on `.input-frame-wrap` (the wrapper div), not on the `<input>` itself |
| Yellow autofill flash | Use `transition: background-color 9999s` on `:-webkit-autofill` — do not use `box-shadow: inset` (it hides the wrapper image) |
| CSS flash before React renders | Confirm `index.html` has `data-theme` and `data-performance` on `<html>`; confirm `themeStore.ts` sets them at module load |
