# Stella Logos LMS - Frontend Implementation Guide

## Project Overview
Stella Logos is a professional-grade Educational Management & Gamification Platform built with React + Vite. This frontend implements the "Theme-Folder Architecture" for a pixel-perfect, state-driven theatrical UI.

## Quick Start

### Prerequisites
- Node.js 16+ and npm
- A code editor (VS Code recommended)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

The application will open at `http://localhost:5173`

## Project Structure

```
StellaLogosLMS/
├── src/
│   ├── components/           # React components
│   │   └── MedievalLoginScreen.tsx
│   ├── stores/              # Zustand state management
│   │   ├── themeStore.ts    # Theme and performance tier state
│   │   └── authStore.ts     # Authentication state
│   ├── styles/
│   │   └── globals.css      # Global styles, 9-slice classes, theme variables
│   ├── App.tsx              # Main app component
│   └── main.tsx             # React DOM entry point
├── public/
│   └── assets/
│       └── themes/
│           ├── medieval/    # Medieval theme assets
│           ├── scifi/       # Sci-Fi theme assets (to be created)
│           └── modern/      # Modern theme assets (to be created)
├── index.html               # HTML entry point
├── package.json             # Dependencies
├── vite.config.ts          # Vite configuration
├── tailwind.config.js       # Tailwind CSS setup
└── tsconfig.json           # TypeScript configuration
```

## Architecture Highlights

### 1. Theme-Folder System
Each theme is a self-contained folder with standardized asset names:
- `bg.png` - Main background image
- `banner_top.png` - Header/banner element
- `frame_main.png` - Parchment scroll frame (9-slice)
- `btn_primary.png` - Primary button (9-slice)
- `ambient_sprite.png` - Side scenery (castle, trees)

**Adding a new theme:**
1. Create `/public/assets/themes/[theme-name]/`
2. Add the 5 standardized PNG files
3. The CSS automatically maps to these via CSS variables

### 2. 9-Slice Scaling
All UI frames use CSS `border-image` for pixel-perfect scaling:
```css
.frame-parchment {
  background-image: var(--theme-frame);
  padding: 3rem 2.5rem;
  /* Corners stay sharp, edges repeat */
}
```

### 3. Performance Tiers
Zustand manages `performanceTier` (High/Low):
- **High Tier:** CSS animations, backdrop-filter effects, ambient sprites
- **Low Tier:** Static images only (optimal for low-bandwidth school networks)

Automatically detected via Network Information API:
```typescript
const effectiveType = navigator.connection.effectiveType // '4g', '3g', '2g'
```

### 4. State Management (Zustand)
Two focused stores:

**themeStore.ts:**
```typescript
useThemeStore()
- currentTheme: Theme
- performanceTier: PerformanceTier
- setTheme(theme)
- setPerformanceTier(tier)
```

**authStore.ts:**
```typescript
useAuthStore()
- username, password
- isLoading
- setUsername(), setPassword(), setIsLoading()
```

### 5. Pixel-Perfect Rendering
```css
html {
  image-rendering: pixelated;
  -ms-interpolation-mode: nearest-neighbor;
}
```
- Integer scaling on 4K displays
- No sub-pixel blurring on high-DPI screens

## UI Components

### MedievalLoginScreen
The first screen implementing all architectural requirements:
- **Theatrical Container:** Full-viewport game-like layout
- **Safe Zone:** Centered interactive area (max-width: 600px)
- **Parchment Scroll Frame:** 9-slice scaled container for the form
- **Form Inputs:** Clean vector typography, themed styling
- **Ambient Sprites:** Castle/trees on sides (High tier only)

**Demo credentials:** `learner` / `quest`

## Styling System

### Tailwind + Global CSS
- **Grid:** 8px base unit spacing
- **Fonts:** Inter (primary), Roboto (fallback)
- **Color Palette:** Theme-specific via CSS variables
  - `--color-primary`, `--color-secondary`, `--color-accent`, `--color-text`

### Responsive Breakpoints
- Desktop: 100% of assets
- Tablet (640px): Reduced padding
- Mobile (480px): Minimal padding, optimized form

## Performance Optimizations

1. **Lazy Loading:** Ambient sprites conditionally render based on tier
2. **Network-Aware:** Auto-detects connection quality
3. **CSS-Only Animations:** No JavaScript animation libraries
4. **Image Rendering:** Pixelated mode for crisp sprites
5. **Cognitive Load:** Step-based rendering (framework ready)

## Theme Swapping Example

```typescript
import { useThemeStore } from '@/stores/themeStore'

function App() {
  const { setTheme } = useThemeStore()
  
  return (
    <button onClick={() => setTheme('scifi')}>
      Switch to Sci-Fi
    </button>
  )
}
```

Changes applied instantly via `data-theme` attribute on `<html>`.

## Creating Pixel Art Assets

### Guidelines
1. **Resolution:** Create at 1920x1080 or 2560x1440 for high-DPI support
2. **Format:** PNG-32 with transparency where needed
3. **Color Depth:** 16-bit or 32-bit (no filters/smoothing)
4. **Composition:**
   - Background: Seamless tileable or single large image
   - Frames: 9-slice ready with clear border regions
   - Buttons: Small, stylized for 9-slice

### 9-Slice Template
When creating frame graphics:
```
┌─────────────────────┐
│  32px  │   repeating │  32px │
├────────┼─────────────┼────────┤
│ corner │   top edge  │ corner │  32px
│ corner │  center     │ corner │  repeating
│ corner │ bottom edge │ corner │  32px
└────────┴─────────────┴────────┘
```

## Security Considerations
- This is a **frontend prototype** - implement proper authentication server-side
- GraphQL API endpoint (to be built in middleware segment)
- LTI 1.3 SSO support for school integration
- Password validation happens on secure backend

## Next Steps
1. Replace placeholder assets in `/public/assets/themes/medieval/` with real pixel art
2. Create additional themes (Sci-Fi, Modern) by copying the medieval folder
3. Build the GraphQL middleware (authentication, data fetching)
4. Integrate PostgreSQL database with xAPI logging
5. Implement "Theater Mode" for teachers (Socket.io real-time updates)

## Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Pixel-perfect rendering works best on modern browsers with hardware acceleration enabled.

## Troubleshooting

**Assets not loading?**
- Check paths in CSS variables (globals.css)
- Ensure PNG files are in correct theme folder
- Clear browser cache (Ctrl+Shift+R)

**Theme not switching?**
- Verify `data-theme` attribute on `<html>` tag
- Check CSS variables are defined in globals.css
- Confirm Zustand store is being called

**Performance issues on low-bandwidth?**
- Network Information API should auto-detect and set Low tier
- If not working, manually test: `setPerformanceTier('Low')`
- Low tier disables animations and ambient sprites

## Resources
- [React Documentation](https://react.dev)
- [Vite Guide](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Zustand Documentation](https://zustand-react.dev)
- [CSS Border-Image (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/border-image)

## License
Stella Logos © 2026 - Educational Platform
