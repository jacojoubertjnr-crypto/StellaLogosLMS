# Stella Logos — Theme Asset Generator Guide

> **How to use:**
> 1. Pick a theme name (e.g. `scifi`, `forest`, `cyberpunk`). This becomes the folder name.
> 2. Generate **Part A** backgrounds one at a time — you supply the scene, this document supplies the format rules.
> 3. Generate **Part B** sprite sheets — one AI generation per sheet. Cut individual assets from each sheet using the coordinate tables.
> 4. Place cut assets into the folder structure in **Part C**, or upload them directly via the Admin → Theme Adder wizard.
> 5. Create the text files in **Part D** (no AI needed — the wizard auto-generates sprites.json).
> 6. Run the **Part E** post-processing checklist.

---

## ⚠ Critical Rules — Read Before Generating Anything

### Dimensions are non-negotiable
Every prompt in this document specifies **exact pixel dimensions**. You MUST request and resize to these exact dimensions before cutting or uploading assets. Dimensions are stated prominently **twice** in every prompt — once at the top as a header, once inside the prompt body — so there is no ambiguity.

**What to do if your AI tool generates the wrong size:**
Most AI tools (DALL-E 3, Midjourney, Firefly) generate at a fixed set of sizes. After generation, resize the entire canvas to the exact dimensions specified in this guide using Photoshop, GIMP, or any image editor, then cut assets using the coordinate tables. Always resize the full canvas BEFORE cutting.

### White backgrounds only
All sprite sheets in this guide use a **solid white (#FFFFFF) background**, not black. Older tutorials use black as the "transparent matte" — this guide does not. White is used because modern AI tools produce significantly better sprite quality against white, and modern image editors handle white-removal more reliably.

**What this means for post-processing:** After cutting each sprite, use "Remove Background" or "Color Range → select white → delete" to make the background transparent. Save all cut sprites as **PNG with alpha channel**.

### Strong borders are mandatory
Every single visual element on every sprite sheet MUST have a **solid, unbroken 2–3 pixel outline** in the darkest available color from the palette. This outline:
- Separates the element cleanly from the white background during removal
- Ensures the sprite remains readable at small sizes
- Prevents "halo" artefacts when white is removed

**If an element is very light-colored (e.g. a white dove, a pale cloud), the dark outline is even more important** — it is the only thing that will survive background removal and define the shape.

### Maximum quality
Every prompt includes quality-boosting language. You should also:
- Use your AI tool's highest quality / most detailed mode
- Generate 2–3 variations and pick the crispest one
- Prefer AI tools that natively output PNG at high resolution (Adobe Firefly, DALL-E 3 with GPT-4o, Stable Diffusion XL)

---

## Style Principles — Apply to Every Single Asset

> **STYLE DIRECTIVE:** Execute this strictly as high-fidelity, modern 16-bit pixel art. The visual style must match a clean, polished adventure game aesthetic with **large, flat color fields** and **solid pixel blocking**.

All Stella Logos assets use a **16-bit pixel art** visual language. Every generation prompt must honour these rules:

- **Rendering style:** Hard-edged pixel art. No anti-aliasing. No sub-pixel blending. No Gaussian blur. No gradients unless achieved through pixel-level dithering.
- **Line weight:** 2–3 pixel outlines on ALL foreground elements — these outlines must be solid, unbroken, and use the darkest color in your palette. Light-colored elements especially need strong dark outlines.
- **Palette discipline:** Choose a palette of 16–32 colors for your theme. Every asset in the theme shares this palette. Pick: 1 dominant color, 1 highlight (+30% brightness), 1 shadow (−40% brightness), 2–3 accent colors.
- **Sprite sheet background:** All sprite sheets use SOLID WHITE `#FFFFFF`. Sprites are cut from this sheet; the white background is removed in post-processing (see Part E).
- **Scale:** Sprites are drawn at final output size — no upscaling. Pixel-art images render with `image-rendering: pixelated` in the browser, so do not rely on browser smoothing.
- **Depth:** Use 2–3 shades per material surface. Lighter shade on top-left facing planes, darker on bottom-right. This gives a consistent light source from the upper-left.

### ⚠ Anti-Grain Style Constraints — Critical

These constraints override any AI tool's default "painterly" or "textured" tendencies. Enforce them explicitly in every prompt.

- **No Noise:** Absolutely no fine noise, film grain, or procedural fuzziness on any surfaces. Every pixel must belong to a deliberate color from the palette — not a random scatter.
- **Clean Clusters:** Use clean, solid pixel clusters to define shapes, wood grains, stone walls, and material surfaces. Each cluster is a flat region of one palette color with crisp edges.
- **Anti-Dithering:** Do not use high-density checkerboard or cross-hatching dithering to blend shadows or transitions. All color gradients and lighting falloffs must use **flat, step-blended color bands** (posterized pixel gradients) rather than fuzzy texture blending.
- **Lighting:** Keep pools of lantern and ambient light clean and broad. Light blends out into dark areas via smooth, **distinct pixel steps** — not soft halos or noise scatter. No glowing fuzz around light sources.

---

## Part A — Page Backgrounds

Generate each background **individually**. These are full-screen scene paintings — not tiled textures. Do **not** include UI chrome (no buttons, frames, banners, or borders in the scene — those come from Part B).

Backgrounds are NOT sprite-sheet assets — they do not need a white background or border treatment. They are saved directly as full-scene art.

| Page | Save as | Canvas size | Scene role |
|---|---|---|---|
| Login | `login/bg.png` | **1920 × 1080 px** | Entrance / threshold location. Where a newcomer first arrives. The login form overlays the center of the screen, so keep the central zone slightly open but not empty. |
| Home | `home/bg.png` | **1920 × 1080 px** | Hub / town square. Warm, safe, active. The bottom ≈ 200 px must show ground-level terrain (path, floor, grass) because the running creature sprite walks along the bottom of the screen. |
| Learning Task | `learningTask/bg.png` | **1920 × 1080 px** | Focused work environment — classroom, workshop, laboratory, arena. Purposeful and slightly cooler or more saturated than the home scene. |
| Attendance | `attendence/bg.png` | **1920 × 1080 px** | Morning administrative space — registry hall, morning courtyard, notice-board room. Formal but warm. The ambient room sprite (Part B, Sheet 5) sits in the lower-left foreground. |
| My Subjects | `mySubjects/bg.png` | **1920 × 1080 px** | Library, archive, data vault. Rows of books / scrolls / terminals visible in the mid-ground. |
| Messages | `messages/bg.png` | **1920 × 1080 px** | Social / communication space — tavern common room, public plaza, network lounge. Implies gathering and conversation. |
| Shop | `shop/bg.png` | **1920 × 1080 px** | Market hall, vendor stalls, item gallery. Richest visual density of all pages — goods clearly on display. |

**AI prompt template for all backgrounds — fill in your scene:**
```
IMAGE SIZE: EXACTLY 1920 × 1080 PIXELS (16:9 widescreen)

[YOUR SCENE DESCRIPTION HERE].

Maximum detail, highest quality pixel art game background. 16-bit JRPG style, viewed from a slight elevated angle (isometric-adjacent, not top-down). Exactly 1920x1080 pixels, widescreen 16:9. Distinct foreground, mid-ground, and background depth layers. No text, no UI elements, no frames or borders — pure environment only. Color palette limited to [YOUR PALETTE — e.g. warm ambers, deep purples, and gold highlights]. Crisp pixel edges, no anti-aliasing, no blur. Detailed pixel art environment with strong light source from the upper-left. Professional game-ready background, richly detailed.

ANTI-GRAIN STYLE ENFORCEMENT: No fine noise, film grain, or procedural fuzziness on any surface. Use clean, solid pixel clusters — not splattery texture. No high-density checkerboard dithering; use flat step-blended color bands for gradients and shadows. Ambient and lantern light must be clean and broad, blending into darkness via distinct pixel steps — no glowing fuzz or soft halos. Large flat color fields. Solid pixel blocking.
```

---

## Part B — Sprite Sheets

Each sheet is one AI generation. Cut individual assets from the sheet using the coordinate table.

**ALL SHEETS USE SOLID WHITE `#FFFFFF` BACKGROUND — NOT BLACK.**

---

### Sheet 1 — Banner Bar

**Canvas: 1920 × 128 px — WHITE background**

A full-width horizontal bar that spans the top of every screen. It appears pinned to the top of the browser window as the title/navigation strip. Design it to read as a physical architectural element: a wooden beam, a holographic header strip, a carved stone lintel, a neon display bar, etc.

```
Canvas: 1920 × 128 px   (aspect ratio: 15:1)
──────────────────────────────────────────────────
y=0    [16 px white padding]
y=16   ┌────────────────────────────────────────┐
       │                                        │
       │         BANNER TOP  (1920 × 96 px)     │
       │                                        │
y=112  └────────────────────────────────────────┘
y=128  [16 px white padding]
──────────────────────────────────────────────────
```

**Cut-out coordinates:**

| Asset | x | y | W | H | Save as |
|---|---|---|---|---|---|
| Banner Top | 0 | 16 | 1920 | 96 | `banner_top.png` |

**Design requirements:**
- Spans the full 1920 px width with no visible seam
- Decorative end-caps at both left and right ends (carved beam-ends, connector plugs, ornate capitals, etc.)
- The middle section reads as a coherent material and can repeat internally
- 3D bevel: a 2–3 px lighter highlight on the top edge, a 2–3 px darker shadow on the bottom edge
- Strong 2–3 px dark outline along the top and bottom edges of the entire bar
- The bottom of the bar should have a clean straight edge — it sits flush with the page

**AI prompt — full sheet:**
```
IMAGE SIZE: EXACTLY 1920 × 128 PIXELS (a very wide, short horizontal strip)

A single horizontal [THEME] decorative banner bar for a pixel art RPG game UI. Displayed on a SOLID WHITE (#FFFFFF) background. The canvas is 1920 pixels wide and 128 pixels tall. The banner bar itself is 1920 × 96 pixels, with 16 pixels of white space above it and 16 pixels below.

THE BANNER (y=16, height=96px, width=1920px): A [MATERIAL — e.g. dark oak wooden plank, brushed titanium strip, carved granite beam, glowing neon panel] horizontal bar spanning the FULL 1920-pixel width without any break or seam.

LEFT END-CAP (first ~120px): A distinctive [DECORATIVE MOTIF — e.g. carved animal face, rivet cluster, glowing rune terminal, circuit contact]. Strong visual anchor, clearly more ornate than the center.
RIGHT END-CAP (last ~120px): The mirror image of the left end-cap.
CENTER SECTION: A [TEXTURE PATTERN — e.g. wood grain, etched circuitry, stone chisel marks, holographic shimmer] that tiles or repeats internally. Must read as one continuous material.

BEVEL & BORDERS: The TOP edge of the bar has a 3-pixel lighter highlight. The BOTTOM edge has a 3-pixel darker shadow. A STRONG 2-pixel solid dark outline runs along both the top and bottom of the entire bar — this outline must be clearly visible against the white canvas background.

16-bit pixel art. [COLOR PALETTE — e.g. dark brown #3D1F0A, gold highlight #C8901A, deep shadow #1A0A03]. NO anti-aliasing. Crisp, clean pixel edges throughout. Maximum detail and quality. Professional game-ready asset. The bar sits centered vertically within the 128-pixel tall canvas.

ANTI-GRAIN: No noise, no film grain, no fuzzy texture. Flat solid color clusters only. Step-blended gradients, not dithered transitions. Clean pixel blocking throughout.
```

---

### Sheet 2 — UI Elements

**Canvas: 2048 × 896 px — WHITE background**

All non-banner, non-sprite UI chrome in one generation. Contains the main content frame, primary button, text input background, and the side ambient decoration.

```
Canvas: 2048 × 896 px
──────────────────────────────────────────────────────────────────────
x=  0       576     672               1152              1536   2048
    │        │       │                 │                 │      │

y=32 ┌───────────────────────────────────────────────────────────────┐
     │  ┌──────────┐  ┌──────────────────────┐   ┌──────────────┐   │
     │  │          │  │  BTN_PRIMARY         │   │              │   │
     │  │          │  │  ( 384 × 96 px )     │   │              │   │
     │  │ FRAME    │  └──────────────────────┘   │              │   │
     │  │ MAIN     │  at x=672, y=32             │   AMBIENT    │   │
     │  │          │                             │   SPRITE     │   │
     │  │ 512×512  │  ┌──────────────────────┐   │              │   │
     │  │          │  │  INPUT_BOX (512×64)  │   │   320×640    │   │
     │  │ at x=32  │  └──────────────────────┘   │              │   │
     │  │    y=32  │  at x=672, y=160            │  at x=1536   │   │
     │  │          │                             │     y=32     │   │
     │  │ CENTER   │                             │              │   │
     │  │ = MAGENTA│                             │              │   │
     │  │ #FF00FF  │                             │              │   │
     │  └──────────┘                             └──────────────┘   │
     │  (512×512 ends at y=544)            (320×640 ends at y=672)  │
     │                                                               │
y=896└───────────────────────────────────────────────────────────────┘
```

**Cut-out coordinates:**

| Asset | x | y | W | H | Notes | Save as |
|---|---|---|---|---|---|---|
| frame_main | 32 | 32 | 512 | 512 | Center 384×384 at (96,96) will be transparent — currently filled with magenta | `frame_main.png` |
| btn_primary | 672 | 32 | 384 | 96 | 9-slice button | `btn_primary.png` |
| input_box | 672 | 160 | 512 | 64 | Text input background | `input_box.png` |
| ambient_sprite | 1536 | 32 | 320 | 640 | Left-side decoration; right side is CSS mirror | `ambient_sprite.png` |

---

#### frame_main.png — 512 × 512 px — Main Content Frame (9-Slice)

The single most important UI element. Every content panel in the game (login form, quest panels, planning hub, admin screens) is rendered inside this frame. It uses **9-slice scaling**: corners are fixed, edges tile, center is transparent.

The inner hollow area is filled with **BRIGHT MAGENTA (#FF00FF)** in the generated image. This acts as a chroma key — you remove the magenta separately from the white background. The result is a frame with a fully transparent center and opaque borders.

**9-slice grid — 64 px border, 384 px transparent center:**
```
  ┌────────64────────┬──────────────384──────────────┬────────64────────┐
  │  CORNER TL       │         TOP EDGE               │  CORNER TR       │  64px
  │  (fixed, ornate) │   (tileable horizontally)       │  (fixed, ornate) │
  ├──────────────────┼───────────────────────────────┼──────────────────┤
  │                  │                               │                  │
  │   LEFT EDGE      │   ████████████████████████    │   RIGHT EDGE     │  384px
  │  (tileable vert.)│   ████ MAGENTA #FF00FF ███    │  (tileable vert.)│
  │                  │   ████ (becomes transparent)██│                  │
  ├──────────────────┼───────────────────────────────┼──────────────────┤
  │  CORNER BL       │        BOTTOM EDGE             │  CORNER BR       │  64px
  │  (fixed, ornate) │   (tileable horizontally)       │  (fixed, ornate) │
  └──────────────────┴───────────────────────────────┴──────────────────┘
```

**AI prompt:**
```
IMAGE: THIS IS EXACTLY 512 × 512 PIXELS. A square hollow decorative border frame.

A 512×512 pixel art game UI border frame for a [THEME] RPG interface, on a SOLID WHITE (#FFFFFF) background.

The frame is a HOLLOW RING — a decorative border surrounding a completely EMPTY center. The border is EXACTLY 64 pixels wide on all four sides. The ENTIRE CENTER AREA (the inner 384 × 384 pixels at x=64,y=64 through x=448,y=448) is filled with SOLID BRIGHT MAGENTA (#FF00FF) — flat, pure, no texture, no gradient. This magenta zone must be clearly delineated from the frame border by a CLEAN, SHARP inner edge.

FRAME MATERIAL: A [MATERIAL — e.g. parchment scroll with Celtic knotwork, reinforced titanium panel with rivets, carved jade with rune inlays, dark wood with golden inlay].

CORNERS (each 64×64 px): Four IDENTICAL ornate [CORNER PIECE — e.g. Celtic knot medallion, rivet cluster, carved stone face, jade dragon clasp]. All four corners are rotational mirrors of each other. Each corner has a STRONG, COMPLETE 2-pixel dark outline on its outer edge.

TOP EDGE (center-top, 384×64 px): A [MATERIAL TEXTURE] band. The left and right ends of this section must be SEAMLESSLY TILEABLE — pixel-perfect match at the edges so this section can be repeated horizontally without a visible join. STRONG 2-pixel dark outline on the outer (top) edge.

BOTTOM EDGE (center-bottom, 384×64 px): Same material, tileable, strong outline on bottom.
LEFT EDGE (left-center, 64×384 px): Same material, tileable vertically, strong outline on left.
RIGHT EDGE (right-center, 64×384 px): Same material, strong outline on right.

INNER EDGE: The boundary between the frame border and the magenta center MUST be a perfectly straight, clean, hard-edged 2-pixel dark line. No blending, no anti-aliasing, no gradient at this boundary.

16-bit pixel art, MAXIMUM DETAIL AND QUALITY, [COLOR PALETTE]. NO anti-aliasing anywhere. Professional game-ready asset. The canvas is 512×512 pixels.

ANTI-GRAIN: No noise or film grain on frame surfaces. Flat solid color clusters define all material textures. Step-blended shading only — no dithered gradients or fuzzy blending. Clean pixel clusters throughout.
```

---

#### btn_primary.png — 384 × 96 px — Primary Action Button (9-Slice)

Used for all major actions: LOGIN, PUBLISH, SAVE, HAND IN, SEND, ACTIVATE. 9-slice scaling stretches to any width without distorting end-caps.

**9-slice grid — 32 px end-caps:**
```
  ┌──────32──────┬──────────────320 (stretches)──────────────┬──────32──────┐
  │  LEFT CAP    │           MIDDLE (tileable)               │  RIGHT CAP   │  96px
  │  (fixed)     │   Must stretch horizontally seamlessly     │  (mirror)    │
  └──────────────┴────────────────────────────────────────────┴──────────────┘
```

**AI prompt:**
```
IMAGE: EXACTLY 384 × 96 PIXELS. A wide, short horizontal button.

A 384×96 pixel art game UI action button for a [THEME] RPG interface, on a SOLID WHITE (#FFFFFF) background.

The button is a horizontal rectangle, 384 pixels wide and 96 pixels tall, centered on the white canvas.

LEFT END-CAP (x=0 to x=32, full 96px height): A [THEME MOTIF — e.g. carved stone animal face, metal rivet cluster, glowing rune terminal, circuit pads]. This is fixed and never scales. It must have a STRONG, COMPLETE 2-pixel dark outline on the left and outer edges.

RIGHT END-CAP (x=352 to x=384, full 96px height): The MIRROR IMAGE of the left end-cap.

MIDDLE SECTION (x=32 to x=352, full 96px height): A [MATERIAL TEXTURE — e.g. polished dark wood, brushed metal, smooth stone, glowing plasma fill] that can tile or stretch horizontally without a visible seam. The texture must match seamlessly at both cut points (x=32 and x=352).

BEVEL: A SOLID 3-pixel [HIGHLIGHT COLOR] line along the entire top edge of the button. A SOLID 3-pixel [SHADOW COLOR] line along the entire bottom edge. This makes the button look raised and pressable.

OUTER BORDER: A COMPLETE, UNBROKEN 2-pixel dark outline enclosing the entire button on all 4 sides. This outline must remain clearly visible against the white background — use the darkest color in your palette.

No text on the button. Maximum detail and quality. 16-bit pixel art. [COLOR PALETTE]. NO anti-aliasing. The canvas is 384×96 pixels.

ANTI-GRAIN: No noise or grain. Flat solid color clusters. Step-blended shading, not dithered.
```

---

#### input_box.png — 512 × 64 px — Text Input Field Background

Wraps every text input in the application. Must visually communicate "you can type here" — recessed, darker, clearly differentiated from the surrounding frame.

**AI prompt:**
```
IMAGE: EXACTLY 512 × 64 PIXELS. A long, thin horizontal input bar.

A 512×64 pixel art text input field background for a [THEME] RPG game interface, on a SOLID WHITE (#FFFFFF) background.

The input box is 512 pixels wide and 64 pixels tall, centered on the white canvas. It looks like a recessed [MATERIAL — e.g. dark stone channel carved into a tablet, dimmed terminal input bar, ink-stained parchment slot, dark metal trough].

OUTER BORDER: A SOLID, COMPLETE 2-3 pixel outline in the darkest palette color, enclosing the entire box on all 4 sides. This border must be crisp and clearly visible against the white canvas.

TOP EDGE (inner): A 3-4px inset shadow line (slightly darker than the interior) suggesting the slot is recessed below the surface.
INTERIOR FILL: A flat, relatively DARK fill color — dark enough that light (cream/white) text will be clearly legible against it. This interior must be visually distinct from the frame material.
BOTTOM EDGE (inner): A faint 2px lighter highlight suggesting depth.

LEFT END: A subtle [END DETAIL — e.g. small ink mark, circuit contact, rune scratch], approximately 12px wide.
RIGHT END: Mirror of left end.

The box must look like you can type text into it. 16-bit pixel art. MAXIMUM DETAIL. [COLOR PALETTE]. NO anti-aliasing. Canvas is 512×64 pixels.

ANTI-GRAIN: No noise or grain. Flat solid color clusters. Step-blended shading, not dithered.
```

---

#### ambient_sprite.png — 320 × 640 px — Side Ambient Decoration

A tall decorative column at the left and right edges of screens. The RIGHT side uses the same file mirrored via CSS (`transform: scaleX(-1)`). Design it to work on both sides.

**AI prompt:**
```
IMAGE: EXACTLY 320 × 640 PIXELS. A tall, narrow vertical pillar or column.

A tall vertical 320×640 pixel art decorative side element for a [THEME] RPG game screen, on a SOLID WHITE (#FFFFFF) background.

This is a LEFT-SIDE environmental decoration, 320 pixels wide and 640 pixels tall. It will be mirrored horizontally in CSS to create the right-side version.

The element represents [THEME STRUCTURE — e.g. a stone castle battlement column, a futuristic wall pylon with conduit cables, a massive ancient tree trunk, a coral reef pillar].

OUTLINE REQUIREMENT: The ENTIRE element must have a STRONG, UNBROKEN 2-3 pixel dark outline on all visible edges, especially the RIGHT EDGE (x=270 to x=320) where it meets the page content. This outline is critical — it is what remains after the white background is removed.

DEPTH LAYERS: Dark background shadow / mid-tone main surface / highlighted edges on upper-left facing planes.

BASE: Heavy, solid, clearly resting on the ground — visually anchored.
TOP: Can extend beyond the frame (implied to continue upward off-screen).
DETAIL: Include [THEME DETAIL — e.g. a mounted torch bracket halfway up, blinking indicator lights, carved face, hanging vines, glowing runes].

No characters or NPCs. Purely architectural/environmental. Maximum detail. 16-bit pixel art. [COLOR PALETTE]. NO anti-aliasing. Canvas is 320×640 pixels.

ANTI-GRAIN: No noise or grain on surfaces. Flat solid color clusters for all material textures. Step-blended lighting, not dithered. Clean pixel blocking throughout.
```

---

### Sheet 3 — Login Page Sprites

**Canvas: 1024 × 320 px — WHITE background**

Two sprite types for the login screen: stationary **light sources / torches** that flicker beside the banner, and a small **flying creature** that roams the background and can be clicked.

```
Canvas: 1024 × 320 px   (aspect ratio: approximately 3.2:1)
────────────────────────────────────────────────────────────────────────────────
x=  0    80   160  240  320         400  480  560  640  720  800  880  960 1024
    │    │    │    │    │            │    │    │    │    │    │    │    │    │

y=0     [32 px white padding]
y=32 ┌──────────────────────────────────────────────────────────────────────────┐
     │                                                                          │
     │  ┌──────┐ ┌──────┐ ┌──────┐         ┌──────┐ ┌──────┐ ┌──────┐ ┌────┐  │
     │  │  T1  │ │  T2  │ │  T3  │         │  D1  │ │  D2  │ │  D3  │ │ DX │  │
     │  │  80  │ │  80  │ │  80  │         │  80  │ │  80  │ │  80  │ │ 80 │  │
     │  │  ×   │ │  ×   │ │  ×   │         │  ×   │ │  ×   │ │  ×   │ │  × │  │
     │  │ 160  │ │ 160  │ │ 160  │         │  80  │ │  80  │ │  80  │ │ 80 │  │
     │  └──────┘ └──────┘ └──────┘         └──────┘ └──────┘ └──────┘ └────┘  │
     │  x=32    x=128   x=224              x=400   x=496   x=592   x=688       │
     │  y=80    y=80    y=80               y=120   y=120   y=120   y=120        │
     │                                                                          │
y=320└──────────────────────────────────────────────────────────────────────────┘
```

**Cut-out coordinates:**

| Asset | x | y | W | H | Notes | Save as |
|---|---|---|---|---|---|---|
| Torch frame 1 | 32 | 80 | 80 | 160 | Flame position A | `login/torch_flicker/frame_1.png` |
| Torch frame 2 | 128 | 80 | 80 | 160 | Flame position B | `login/torch_flicker/frame_2.png` |
| Torch frame 3 | 224 | 80 | 80 | 160 | Flame position C | `login/torch_flicker/frame_3.png` |
| Dove frame 1 | 400 | 120 | 80 | 80 | Wing up / flight A | `login/dove/frame_1.png` |
| Dove frame 2 | 496 | 120 | 80 | 80 | Wing mid / flight B | `login/dove/frame_2.png` |
| Dove frame 3 | 592 | 120 | 80 | 80 | Wing down / flight C | `login/dove/frame_3.png` |
| Dove clicked | 688 | 120 | 80 | 80 | Surprise / reaction | `login/dove/clicked.png` |

**Design requirements — torch / light source (folder: `torch_flicker`):**
- 3-frame subtle flicker animation. The MOUNT (bracket, base, housing) must be **pixel-perfect identical** across all 3 frames — not even a single pixel changes in the mount. Only the flame / glow / light element at the top changes.
- Frame differences are small: the flame shifts direction, grows/shrinks slightly. Not a dramatic change.
- The mount attaches naturally to a wall surface, facing forward.
- All three frames must have the same STRONG dark outline around the mount. The flame outline can vary frame-to-frame.

**Design requirements — flying creature (folder: `dove`):**
- 3-frame flight cycle: wings up → wings mid → wings down (or equivalent). Must loop smoothly.
- The creature must face **LEFT** — the code flips it horizontally when it needs to fly right.
- "Clicked" frame: creature is surprised / delighted — wider expression, spread wings, sparkle, etc.
- Clean, readable silhouette at 80×80px. STRONG dark outline (2-3px) around the ENTIRE creature in EVERY frame. For light-colored creatures (e.g. a white dove), this outline is especially critical.

**AI prompt — full sheet:**
```
IMAGE: EXACTLY 1024 × 320 PIXELS (wide horizontal canvas)

Seven pixel art sprite frames for a [THEME] game login screen, arranged on a SOLID WHITE (#FFFFFF) background, 1024 pixels wide and 320 pixels tall.

ALL SPRITES MUST HAVE A COMPLETE, UNBROKEN 2-3 PIXEL DARK OUTLINE enclosing every visible element. This outline is mandatory — it is what allows clean background removal. Even light-colored or white elements must have a strong dark border around them.

LEFT GROUP — THREE TORCH FRAMES (each 80×160 px, spaced left-to-right):
— Frame 1: at x=32, y=80
— Frame 2: at x=128, y=80
— Frame 3: at x=224, y=80

A [LIGHT SOURCE — e.g. flaming wall torch, neon tube lantern, magical crystal, bioluminescent pod] mounted on a [BRACKET — e.g. iron wall bracket, arcane pedestal, metallic arm, carved stone shelf].

CRITICAL: The MOUNT (bracket, housing, base) is ABSOLUTELY PIXEL-PERFECT IDENTICAL in all three frames — not one pixel differs. Copy the mount exactly. ONLY the [FLAME/GLOW ELEMENT] at the top changes:
- Frame 1 (x=32): [STATE A — e.g. flame medium height, leaning right, medium brightness]
- Frame 2 (x=128): [STATE B — e.g. flame taller, leaning left, slightly brighter]
- Frame 3 (x=224): [STATE C — e.g. flame shorter, centered, slightly dimmer]

RIGHT GROUP — FOUR CREATURE FRAMES (each 80×80 px):
— Frame 1 (dove idle A): at x=400, y=120
— Frame 2 (dove idle B): at x=496, y=120
— Frame 3 (dove idle C): at x=592, y=120
— Frame 4 "clicked" (reaction): at x=688, y=120

A small [FLYING CREATURE — e.g. white dove, mechanical hummingbird, pixel fairy, firefly] facing LEFT. Clean readable silhouette. COMPLETE DARK OUTLINE (2-3px) on all 4 frames — especially important if the creature is light-colored.

Flight animation:
- Frame 1: wings raised above body, gliding pose
- Frame 2: wings horizontal, mid-flap
- Frame 3: wings lowered below body, power stroke
- Frame 4 "clicked": creature startled or delighted — [REACTION — e.g. wings spread wide, eyes large, small star bursts]

16-bit pixel art, MAXIMUM DETAIL AND QUALITY, [COLOR PALETTE]. NO anti-aliasing. White background, sprites fully outlined. Canvas is exactly 1024×320 pixels.

ANTI-GRAIN: No noise or film grain on any surface. Flat solid pixel clusters. Step-blended shading. No dithered transitions.
```

---

### Sheet 4 — Home Page Sprites

**Canvas: 1024 × 256 px — WHITE background**

Two sprite types for the home / hub screen: a **small ground creature** that runs across the bottom of the screen, and a **sky-drifting element** (cloud, debris) that slides across the upper background.

```
Canvas: 1024 × 256 px   (aspect ratio: 4:1)
────────────────────────────────────────────────────────────────────────────────
x=  0    96   192  288  384        544             864    1024
    │    │    │    │    │           │               │       │

y=0     [32 px white padding]
y=32 ┌──────────────────────────────────────────────────────────────────────────┐
     │                                                                          │
     │  ┌────┐  ┌────┐  ┌────┐  ┌────┐      ┌────────────────────────────┐     │
     │  │ R1 │  │ R2 │  │ R3 │  │ RX │      │       CLOUD DRIFT           │     │
     │  │    │  │    │  │    │  │    │      │       320 × 80 px           │     │
     │  │ 96 │  │ 96 │  │ 96 │  │ 96 │      └────────────────────────────┘     │
     │  │  × │  │  × │  │  × │  │  × │      x=544, y=88                        │
     │  │ 96 │  │ 96 │  │ 96 │  │ 96 │                                         │
     │  └────┘  └────┘  └────┘  └────┘                                         │
     │  x=32   x=144  x=256  x=368                                             │
     │  y=80   y=80   y=80   y=80                                              │
     │                                                                          │
y=256└──────────────────────────────────────────────────────────────────────────┘
```

**Cut-out coordinates:**

| Asset | x | y | W | H | Notes | Save as |
|---|---|---|---|---|---|---|
| Rabbit frame 1 | 32 | 80 | 96 | 96 | Legs pose A | `home/rabbit/frame_1.png` |
| Rabbit frame 2 | 144 | 80 | 96 | 96 | Legs pose B | `home/rabbit/frame_2.png` |
| Rabbit frame 3 | 256 | 80 | 96 | 96 | Legs pose C | `home/rabbit/frame_3.png` |
| Rabbit clicked | 368 | 80 | 96 | 96 | Stop / surprise | `home/rabbit/clicked.png` |
| Cloud drift | 544 | 88 | 320 | 80 | Sky-drifting element | `home/cloud_drift.png` |

**Design requirements — running creature (folder: `rabbit`):**
- 3-frame run cycle (legs in three positions forming a loop). Must face **RIGHT**.
- "Clicked" frame: creature stops, turns or reacts with surprise/delight.
- Friendly, domestic, non-threatening (rabbit, small robot, pixel puppy, chipmunk, tiny dragon).
- STRONG DARK OUTLINE (2-3px) completely enclosing the creature in ALL frames. Small shadow beneath the creature's feet.

**Design requirements — cloud drift (file: `cloud_drift.png`):**
- A single wide image that drifts slowly from right to left across the upper screen.
- TWO copies of this sprite appear simultaneously — it must look natural when two are visible.
- Should feel weightless and slow. Not a character.
- MUST have a STRONG DARK OUTLINE around its entire silhouette, even where it fades or feathers at the edges. The outline defines the cutout boundary.

**AI prompt — full sheet:**
```
IMAGE: EXACTLY 1024 × 256 PIXELS (very wide, short canvas)

Five pixel art sprite frames for a [THEME] game home screen, on a SOLID WHITE (#FFFFFF) background, 1024 pixels wide and 256 pixels tall.

ALL SPRITES MUST HAVE A COMPLETE, UNBROKEN 2-3 PIXEL DARK OUTLINE around every visible element. This outline is mandatory for clean background removal. Do not feather or anti-alias any edges.

LEFT GROUP — FOUR CREATURE FRAMES (each 96×96 px):
— Frame 1: at x=32, y=80
— Frame 2: at x=144, y=80
— Frame 3: at x=256, y=80
— Frame 4 "clicked": at x=368, y=80

A small friendly [GROUND CREATURE — e.g. rabbit, pixel corgi, mechanical cat, tiny robot] facing RIGHT. COMPLETE DARK OUTLINE on all 4 frames. Small shadow ellipse beneath feet.

Run animation:
- Frame 1: run cycle pose A — [LEGS DESCRIPTION — e.g. left leg forward, right back]
- Frame 2: run cycle pose B — [MID-STRIDE — e.g. both legs transitioning]
- Frame 3: run cycle pose C — [OPPOSITE STRIDE — e.g. right leg forward, left back]
- Frame 4 "clicked": creature stops, reacts with delight — [REACTION — e.g. ears perked, arms raised, sparkles, glowing eyes]

RIGHT — CLOUD DRIFT (x=544, y=88, 320×80 px):
A single [SKY ELEMENT — e.g. fluffy pixel cloud, slow-moving leaf cluster, atmospheric neon haze, debris field] drifting from right to left. Exactly 320 pixels wide and 80 pixels tall. IMPORTANT: This element MUST have a CLEAN DARK OUTLINE (2px) around its entire outer edge — even at the ends where the element tapers or fades. The outline defines the cutout shape. Two of these will appear on screen simultaneously — keep the design self-contained.

16-bit pixel art, MAXIMUM DETAIL AND QUALITY, [COLOR PALETTE]. NO anti-aliasing. White background. Canvas is exactly 1024×256 pixels.

ANTI-GRAIN: No noise or film grain. Flat solid pixel clusters. Step-blended shading. No dithered transitions.
```

---

### Sheet 5 — Attendance / Room Ambient Sprite

**Canvas: 640 × 320 px — WHITE background**

One ambient room fixture: a stationary decorative object in the attendance/register screen. In medieval it is a fireplace. For sci-fi it could be a server rack with LEDs. For nature: an aquarium or stone fountain. 4-frame looping animation — only the animated element changes. The structure is identical across all frames.

```
Canvas: 640 × 320 px   (aspect ratio: 2:1)
────────────────────────────────────────────────────────────────────
x=  0    128  256  384  512  640
    │    │    │    │    │    │

y=0     [32 px white padding]
y=32 ┌──────────────────────────────────────────────────────────────┐
     │                                                              │
     │  ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐                 │
     │  │  F1  │   │  F2  │   │  F3  │   │  F4  │                 │
     │  │      │   │      │   │      │   │      │                 │
     │  │ 128  │   │ 128  │   │ 128  │   │ 128  │                 │
     │  │  ×   │   │  ×   │   │  ×   │   │  ×   │                 │
     │  │ 160  │   │ 160  │   │ 160  │   │ 160  │                 │
     │  └──────┘   └──────┘   └──────┘   └──────┘                 │
     │  x=32       x=176      x=320      x=464                     │
     │  y=80       y=80       y=80       y=80                      │
     │                                                              │
y=320└──────────────────────────────────────────────────────────────┘
```

**Cut-out coordinates:**

| Asset | x | y | W | H | Save as |
|---|---|---|---|---|---|
| Fireplace frame 1 | 32 | 80 | 128 | 160 | `attendence/fireplace/frame_1.png` |
| Fireplace frame 2 | 176 | 80 | 128 | 160 | `attendence/fireplace/frame_2.png` |
| Fireplace frame 3 | 320 | 80 | 128 | 160 | `attendence/fireplace/frame_3.png` |
| Fireplace frame 4 | 464 | 80 | 128 | 160 | `attendence/fireplace/frame_4.png` |

**Design requirements:**
- The **structure** (casing, surround, mantle, housing) must be **pixel-perfect identical** across all 4 frames — every pixel matches. ONLY the animated element changes.
- Frame 4 → Frame 1 transition must be seamless (continuous loop with no visual jump).
- Emit ambient glow from the light source — colored light spilling upward and outward.
- STRONG DARK OUTLINE (2-3px) around the entire object in every frame.

**AI prompt — full sheet:**
```
IMAGE: EXACTLY 640 × 320 PIXELS (moderately wide, short canvas)

Four looping animation frames of a pixel art ambient room fixture for a [THEME] game, arranged SIDE BY SIDE on a SOLID WHITE (#FFFFFF) background, 640 pixels wide and 320 pixels tall. Each frame is 128×160 pixels.

ALL FRAMES MUST HAVE A COMPLETE, UNBROKEN 2-3 PIXEL DARK OUTLINE enclosing the entire fixture. This is mandatory for clean background removal.

The fixture is a [AMBIENT OBJECT — e.g. stone fireplace, server rack with LEDs, magical glowing crystal plinth, coral aquarium, neon sign, forge furnace].

FOUR FRAMES, placed at:
— Frame 1: x=32, y=80 (128×160 px)
— Frame 2: x=176, y=80 (128×160 px)
— Frame 3: x=320, y=80 (128×160 px)
— Frame 4: x=464, y=80 (128×160 px)

STATIC STRUCTURE — pixel-perfect IDENTICAL in ALL FOUR FRAMES (not one pixel differs):
- [OUTER CASING — e.g. stone mantelpiece with carved decorations, black server housing, jade pedestal, oak cabinet frame]
- [BASE — e.g. stone hearth floor, metal feet, crystal stand]
- [SURROUNDING DETAILS — e.g. firewood stacked beside it, cable bundles, decorative trim, hanging tools]

ANIMATED ELEMENT — changes between frames to create a smooth 4-frame seamless loop:
- Frame 1 (x=32): [STATE A — e.g. flames medium height, two LEDs lit, glow intensity 60%]
- Frame 2 (x=176): [STATE B — e.g. flames taller and leaning left, three LEDs lit, glow intensity 80%]
- Frame 3 (x=320): [STATE C — e.g. flames at peak height, all LEDs lit, glow intensity 100%]
- Frame 4 (x=464): [STATE D — e.g. flames settling, two LEDs, glow 70% — must transition seamlessly back to frame 1]

AMBIENT GLOW: [COLOR — e.g. warm orange, cool cyan, green] light emanates from the source and tints nearby structural pixels. Glow is strongest at the source and fades using pixel-level dithering.

16-bit pixel art, MAXIMUM DETAIL AND QUALITY, [COLOR PALETTE]. NO anti-aliasing. Crisp edges. White background. Canvas is exactly 640×320 pixels.

ANTI-GRAIN: No noise or grain on any surface. Flat solid pixel clusters. Ambient glow must use distinct pixel steps — not soft halos or fuzzy scatter. Step-blended color bands only.
```

---

## Part C — Folder Structure & Complete File Checklist

Exact paths for every asset, matching what the **Theme Adder wizard** creates automatically. Base path: `public/assets/themes/[your-theme-name]/`

```
themes/[theme-name]/
│
├── banner_top.png               ← Sheet 1 cut  (1920 × 96)
├── frame_main.png               ← Sheet 2 cut  (512 × 512, center → transparent after post-processing)
├── btn_primary.png              ← Sheet 2 cut  (384 × 96)
├── input_box.png                ← Sheet 2 cut  (512 × 64)
├── ambient_sprite.png           ← Sheet 2 cut  (320 × 640)
│
├── music/
│   └── theme.wav                ← audio file (see Part D)
│
├── login/
│   ├── bg.png                   ← Part A background (1920 × 1080)
│   ├── sprites.json             ← AUTO-GENERATED by Theme Adder wizard on Finalise
│   ├── torch_flicker/           ← folder name is HARDCODED — do not rename
│   │   ├── frame_1.png          ← Sheet 3 cut  (80 × 160)
│   │   ├── frame_2.png          ← Sheet 3 cut  (80 × 160)
│   │   └── frame_3.png          ← Sheet 3 cut  (80 × 160)
│   └── dove/                    ← folder name is HARDCODED — do not rename
│       ├── frame_1.png          ← Sheet 3 cut  (80 × 80)
│       ├── frame_2.png          ← Sheet 3 cut  (80 × 80)
│       ├── frame_3.png          ← Sheet 3 cut  (80 × 80)
│       └── clicked.png          ← Sheet 3 cut  (80 × 80)
│
├── home/
│   ├── bg.png                   ← Part A background (1920 × 1080)
│   ├── rabbit/                  ← folder name is HARDCODED — do not rename
│   │   ├── frame_1.png          ← Sheet 4 cut  (96 × 96)
│   │   ├── frame_2.png          ← Sheet 4 cut  (96 × 96)
│   │   ├── frame_3.png          ← Sheet 4 cut  (96 × 96)
│   │   └── clicked.png          ← Sheet 4 cut  (96 × 96)
│   └── cloud_drift.png          ← Sheet 4 cut  (320 × 80) — filename is HARDCODED
│
├── attendence/
│   ├── bg.png                   ← Part A background (1920 × 1080)
│   ├── sprites.json             ← AUTO-GENERATED by Theme Adder wizard on Finalise
│   └── fireplace/               ← folder name is HARDCODED — do not rename
│       ├── frame_1.png          ← Sheet 5 cut  (128 × 160)
│       ├── frame_2.png          ← Sheet 5 cut  (128 × 160)
│       ├── frame_3.png          ← Sheet 5 cut  (128 × 160)
│       └── frame_4.png          ← Sheet 5 cut  (128 × 160)
│
├── learningTask/
│   └── bg.png                   ← Part A background (1920 × 1080)
│
├── mySubjects/
│   └── bg.png                   ← Part A background (1920 × 1080)
│
├── messages/
│   └── bg.png                   ← Part A background (1920 × 1080)
│
└── shop/
    └── bg.png                   ← Part A background (1920 × 1080)
```

> **Hardcoded folder names:** The React components reference `torch_flicker`, `dove`, `rabbit`, `fireplace`, and `cloud_drift` directly in code. These names must not be changed for any theme.

**Total asset count:**

| Source | Count |
|---|---|
| Part A — Backgrounds | 7 |
| Sheet 1 — Banner | 1 |
| Sheet 2 — UI elements | 4 |
| Sheet 3 — Login sprites | 7 |
| Sheet 4 — Home sprites | 5 |
| Sheet 5 — Attendance sprite | 4 |
| Music | 1 |
| **Total** | **29** |

---

## Part D — Supporting Files

### 1. sprites.json — Auto-generated

The **Theme Adder wizard** generates `login/sprites.json` and `attendence/sprites.json` automatically when you click **Finalise Theme**. You do not need to create these manually.

If you are placing files manually (not using the wizard), here are the formats:

**`login/sprites.json`:**
```json
{
  "sprites": [
    {
      "id": "torch_flicker",
      "frames": ["frame_1.png", "frame_2.png", "frame_3.png"],
      "frameDuration": 200,
      "width": 80,
      "height": 160
    },
    {
      "id": "dove",
      "frames": ["frame_1.png", "frame_2.png", "frame_3.png"],
      "frameDuration": 150,
      "width": 80,
      "height": 80,
      "clickFrame": "clicked.png"
    }
  ]
}
```

**`attendence/sprites.json`:**
```json
{
  "sprites": [
    {
      "id": "fireplace",
      "frames": ["frame_1.png", "frame_2.png", "frame_3.png", "frame_4.png"],
      "frameDuration": 150,
      "width": 128,
      "height": 160
    }
  ]
}
```

---

### 2. CSS Variables — Color Palette (handled by Theme Adder)

When you use the **Theme Adder wizard**, you enter the 5 color values in the wizard and they are stored in the database and injected automatically as CSS variables at runtime. No CSS file editing is needed.

If building manually, add a block to `src/styles/globals.css`:

```css
:root[data-theme='[theme-name]'] {
  --color-primary:    #;   /* main brand color — buttons, headings */
  --color-secondary:  #;   /* dimmer variant — borders, hover states */
  --color-accent:     #;   /* highlight pop — badges, notifications */
  --color-text:       #;   /* primary text on dark backgrounds */
  --color-bg-overlay: rgba(0,0,0,0.55);  /* semi-transparent panel overlay */
}
```

---

### 3. Theme Registration

The `Theme` type in `src/stores/themeStore.ts` is now `string` — no code change is needed when adding a new theme.

---

### 4. music/theme.wav — Ambient Soundtrack

- **Format:** `.wav` (lossless) preferred, `.mp3` acceptable
- **Duration:** 2–4 minutes, loops seamlessly (end → beginning is smooth)
- **Level:** Normalize to −14 LUFS (comfortable background level)
- **Character:** Ambient background music; fades in on login and home screens, pauses on lesson/task screens

---

## Part E — Post-Processing Checklist

After generating and cutting all sprites, complete these steps in your image editor (Photoshop, GIMP, Aseprite, etc.):

### Backgrounds (Part A)
- [ ] Verify each background is exactly **1920 × 1080 px** after saving.
- [ ] No UI chrome in any background — pure environment only.
- [ ] Save as PNG or high-quality JPG (PNG preferred).

### Banner (Sheet 1)
- [ ] After cutting, verify `banner_top.png` is exactly **1920 × 96 px**.
- [ ] No transparency needed — this is a fully opaque strip.
- [ ] Verify the bar has clean straight top and bottom edges.

### frame_main.png (Sheet 2 — most complex step)
- [ ] Cut the 512 × 512 px frame from Sheet 2.
- [ ] **Remove the white background** first: Select → Color Range → select `#FFFFFF` → Delete. Or use the "Remove Background" tool.
- [ ] **Remove the magenta center** second: Select → Color Range → select `#FF00FF` → Delete. The center is now transparent.
- [ ] Zoom in to 400% and inspect the inner edge of the frame. It must be a clean, hard pixel line — no fringe pixels.
- [ ] Zoom in to the outer corners — no white halo pixels should remain.
- [ ] Save as **PNG with alpha channel** (transparency enabled).

### All other sprite cut-outs (Sheets 2–5)
- [ ] **Remove white background:** Select → Color Range → select `#FFFFFF` → Delete. OR use "Remove Background" / "Magic Wand select white → Delete".
- [ ] Zoom in to 300% and check all edges — the dark outline on each sprite should be fully intact after white removal. If any part of the outline was removed, undo and adjust the selection tolerance.
- [ ] Check that NO holes appear within the sprite (e.g. white inner areas of an eye, window, etc. that were accidentally removed). If this happens: paint those areas back manually, or use a lower tolerance on the white selection.
- [ ] Save each cut-out as **PNG with alpha channel**.

### Sprite frame consistency
- [ ] Open all frames of each animated sprite (e.g. all 3 torch frames) as LAYERS in one Photoshop/GIMP document.
- [ ] Toggle layer visibility rapidly to check for any structural pixel that drifted between frames. Any drift will cause a visible twitch in the animation.
- [ ] For torch/fireplace sprites especially: the structure must be PERFECTLY IDENTICAL frame to frame. If the AI drifted even slightly, manually correct the frames by copying the structure pixels from frame 1 onto frames 2 and 3.

### Dimension verification
After all cuts and post-processing, verify each file's dimensions match the table exactly:

| File | Required dimensions |
|---|---|
| banner_top.png | 1920 × 96 |
| frame_main.png | 512 × 512 |
| btn_primary.png | 384 × 96 |
| input_box.png | 512 × 64 |
| ambient_sprite.png | 320 × 640 |
| login/bg.png | 1920 × 1080 |
| login/torch_flicker/frame_*.png | 80 × 160 each |
| login/dove/frame_*.png | 80 × 80 each |
| home/bg.png | 1920 × 1080 |
| home/rabbit/frame_*.png | 96 × 96 each |
| home/cloud_drift.png | 320 × 80 |
| attendence/bg.png | 1920 × 1080 |
| attendence/fireplace/frame_*.png | 128 × 160 each |
| learningTask/bg.png | 1920 × 1080 |
| mySubjects/bg.png | 1920 × 1080 |
| messages/bg.png | 1920 × 1080 |
| shop/bg.png | 1920 × 1080 |

### Final upload
- [ ] Upload all cut, post-processed assets via **Admin → Theme Adder wizard**.
- [ ] Click **Finalise Theme** — this generates `sprites.json` files and adds the theme to the shop.
- [ ] Navigate to the app, open the shop, purchase the theme, and activate it.
- [ ] Visit all 7 page routes and verify each background loads correctly.
- [ ] Verify torch flicker plays on the login screen and attendance fireplace loops.
