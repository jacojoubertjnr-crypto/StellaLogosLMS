# Stella Logos — Component Naming Convention

## The "Functional [Aesthetic]" Pattern

Every component in Stella Logos follows a two-layer naming system that separates **what a component does** from **how it looks**.

```
FunctionalName [AestheticName]
```

| Layer | Format | Lives in | Can change? |
|---|---|---|---|
| **Functional** | PascalCase / snake_case | Code, DB columns, GraphQL fields, Zustand state | No — stable across all themes |
| **[Aesthetic]** | Plain English in brackets | Theme asset folders, UI copy, pixel-art labels | Yes — swapped per theme |

**The rule:** Code is always written against the functional name. The aesthetic bracket is a skin. Changing the theme folder re-skins the entire UI without touching a single line of logic.

---

## Instruction for AI Agents

Include this line in every prompt to an AI working on this codebase:

> "Names in **Bold** represent the standard software components. Names in [Brackets] represent the specific 'Medieval' visual theme assets. Ensure the code is written so that the visual theme (the bracketed names) can be easily swapped for a different theme in the future without breaking the component's underlying functionality."

---

## Master Component Legend

### Core Navigation & Flow

| Standard Component Name | Medieval [Aesthetic] | Sci-Fi [Aesthetic] | Logic Summary |
|---|---|---|---|
| **PrimaryAction** | [The Great Portal] | [The Launch Pad] | "Continue Quest" / main CTA handler |
| **QuestScreen** | [The Quest Parchment] | [Mission Briefing Terminal] | Post-login learner view |
| **ProgressPath** | [The Trail of Stones] | [Navigation Grid] | Visual step-by-step progress marker |
| **StepContentPanel** | [The Active Scroll] | [Active Mission File] | Current step instructions display |
| **CurriculumNavigator** | [The Grand Library] | [The Data Vault] | Subject/class data fetcher |

### Attendance & Social

| Standard Component Name | Medieval [Aesthetic] | Sci-Fi [Aesthetic] | Logic Summary |
|---|---|---|---|
| **AttendanceModule** | [The Town Square] | [Crew Muster Point] | Check-in time logger |
| **SocialHub** | [The Messenger Bird] | [Comms Array] | Chat window manager |
| **TeacherDashboard** | [The War Room] | [Command Bridge] | Teacher's live class monitor (Phase 5) |

### Economy & Identity

| Standard Component Name | Medieval [Aesthetic] | Sci-Fi [Aesthetic] | Logic Summary |
|---|---|---|---|
| **CurrencyCounter** | [The Gold Pouch] | [Credit Chip] | Integer points balance display |
| **MarketplaceEntry** | [The Merchant Stall] | [Black Market Terminal] | Point transaction handler |
| **InventoryPanel** | [The Adventurer's Pack] | [Loadout Screen] | Learner's owned cosmetic items |
| **SkinPreview** | [The Mirror of Fate] | [Holographic Projector] | CSS variable injection preview |

### Structural / Layout

| Standard Component Name | Medieval [Aesthetic] | Sci-Fi [Aesthetic] | Logic Summary |
|---|---|---|---|
| **SafeZone** | [The Keep] | [Shielded Sector] | Central content container |
| **HeaderBanner** | [The Wooden Plaque] | [Holographic Header] | Top identity bar |
| **FramePanel** | [The Parchment Scroll] | [Terminal Window] | 9-slice scaled content frame |
| **ActionButton** | [The Stone Rune] | [Neon Trigger] | Primary themed button |

---

## Practical Example

A learner clicks a button to submit their completed step.

```tsx
// ✅ Correct — functional name in code, aesthetic only in the asset path
<button className="btn-9slice" onClick={onAdvance}>
  COMPLETE STEP
</button>

// The "COMPLETE STEP" label lives in QuestScreen.tsx (theme layer).
// The onClick={onAdvance} logic lives in questStore.ts (functional layer).
// Changing theme → swap btn_primary.png + update the label string.
// No store, resolver, or DB change required.
```

---

## Theme Folder Structure (enforces the pattern)

```
/public/assets/themes/
  medieval/
    btn_primary.png     ← ActionButton skin
    frame_main.png      ← FramePanel skin
    banner_top.png      ← HeaderBanner skin
    bg.png              ← page background
  scifi/
    btn_primary.png     ← same slot, different skin
    frame_main.png
    ...
```

CSS variables map functional slot names (`--theme-btn-primary`) to physical asset paths. Components reference the variable — never the path directly.

---

## What Must Stay Theme-Neutral

The following must **never** contain theme-specific strings:

- Database column names (`current_step`, `points_balance`, `is_locked`)
- GraphQL field names (`advanceStep`, `myProgress`, `pointsBalance`)
- Zustand store keys (`currentStep`, `isLocked`, `advance`)
- React component prop names

If you find yourself writing `medievalScrollFrame` in a store or resolver, stop — that is a violation of the pattern.

---

*Last updated: 2026-04-29*
*Applies to: All phases, all themes*
