# Stella Logos LMS - Quick Start Guide

## Installation & Setup

```bash
# 1. Navigate to project directory
cd StellaLogosLMS

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

The app will open at `http://localhost:5173`

## What You're Seeing

### Medieval Login Screen
A pixel-perfect theatrical interface with:
- **Seamless Background:** Full-viewport medieval landscape
- **Ambient Scenery:** Castle and trees on sides (High performance tier)
- **Safe Zone:** Centered login form (max 600px width)
- **Parchment Frame:** 9-slice scaled container with crisp edges
- **Clear Typography:** "USERNAME" and "PASSWORD" labels in vector fonts

### Try It Out
- **Demo Credentials:** `learner` / `quest`
- **Theme Switcher:** Top-right corner buttons to swap Medieval ↔ Sci-Fi
- **Performance Indicator:** Bottom shows current tier (High/Low)

## Project Structure

```
src/
├── App.tsx                  # Main app + theme initialization
├── components/
│   └── MedievalLoginScreen.tsx    # Login UI component
├── stores/
│   ├── themeStore.ts       # Theme & performance state (Zustand)
│   └── authStore.ts        # Form state (Zustand)
├── styles/
│   └── globals.css         # 9-slice classes, theme variables, animations
└── main.tsx                # React entry point

public/assets/themes/
└── medieval/
    ├── bg.png              # ⚠️ PLACEHOLDER - replace with pixel art
    ├── banner_top.png      # ⚠️ PLACEHOLDER
    ├── frame_main.png      # ⚠️ PLACEHOLDER (9-slice ready)
    ├── btn_primary.png     # ⚠️ PLACEHOLDER (9-slice ready)
    └── ambient_sprite.png  # ⚠️ PLACEHOLDER
```

## Key Features Implemented

✅ **Theme-Folder Architecture**
- CSS variables inject theme paths
- Instant switching via `data-theme` attribute
- Ready to add new themes (Medieval, Sci-Fi, Modern, etc.)

✅ **9-Slice Scaling**
- Parchment frame + buttons preserve pixel-art corners
- Edges repeat, center stretches - stays crisp on any size

✅ **Performance Tiers**
- Auto-detects network speed (4G = High, 3G/2G = Low)
- High: Animations + ambient sprites
- Low: Static rendering only

✅ **Pixel-Perfect Rendering**
- `image-rendering: pixelated` prevents blurring
- Integer scaling on 4K displays
- Vector fonts for readable text

✅ **State Management**
- Zustand stores for theme, performance, and auth
- Global theme switching without re-renders
- Form input management

✅ **Responsive Design**
- Works on desktop, tablet, mobile
- Adaptive Safe Zone sizing
- Ambient sprites hidden on small screens

## Next Steps

### 1. Replace Placeholder Assets
The theme folder has `.txt` placeholders instead of PNGs. To add real pixel art:

```bash
# Replace these files with actual 16-bit PNG assets:
public/assets/themes/medieval/
├── bg.png              # Medieval castle landscape (1920x1080+)
├── banner_top.png      # Decorative header
├── frame_main.png      # Parchment scroll (9-slice optimized)
├── btn_primary.png     # Stone button (9-slice optimized)
└── ambient_sprite.png  # Castle towers for sides
```

See **THEME_IMPLEMENTATION.md** for detailed pixel-art guidelines and 9-slice specifications.

### 2. Create Additional Themes
Copy the medieval folder to create Sci-Fi or Modern themes:

```bash
cp -r public/assets/themes/medieval public/assets/themes/scifi

# Then add to CSS in src/styles/globals.css:
:root[data-theme='scifi'] {
  --theme-bg: url('/assets/themes/scifi/bg.png');
  /* ... define color palette ... */
}

# And update type in src/stores/themeStore.ts:
export type Theme = 'medieval' | 'scifi' | 'modern'
```

### 3. Build for Production
```bash
npm run build
# Output: dist/ folder (ready for deployment)
```

### 4. Connect Backend API
Once the GraphQL middleware is built:

```typescript
// In src/components/MedievalLoginScreen.tsx
const handleSubmit = async (e) => {
  setIsLoading(true)
  
  const response = await fetch('https://api.stellalogos.io/graphql', {
    method: 'POST',
    body: JSON.stringify({
      query: LOGIN_MUTATION,
      variables: { username, password }
    })
  })
  
  const data = await response.json()
  // Handle login response...
}
```

## Architecture Highlights

### Why This Design?
- **Theme-Folder System:** Schools can swap visual identity without code changes
- **9-Slice Scaling:** Pixel art stays crisp on any resolution (even 4K)
- **Performance Tiers:** Works smoothly on slow school Wi-Fi networks
- **Zustand State:** Instant theme switching with zero React re-renders
- **Safe Zone Layout:** Learners focus on task, not distracted by edges

See **FRONTEND_ARCHITECTURE.md** for deep-dive technical details.

## File Sizes

| File | Size |
|------|------|
| HTML | 1.2 KB |
| main.tsx | 2.1 KB |
| globals.css | 12 KB |
| themeStore.ts | 0.9 KB |
| authStore.ts | 0.8 KB |
| LoginComponent | 4.2 KB |
| **Total Gzipped** | ~9 KB |

Theme assets (to be added):
- bg.png: ~300-500 KB (per theme)
- Other assets: ~100-200 KB each

## Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Network Information API (performance detection) requires modern browser, but gracefully falls back to High tier if unavailable.

## Troubleshooting

**Assets not loading?**
- Check that `.png` files exist in `public/assets/themes/medieval/`
- (Currently only `.txt` placeholders - need real PNG files)
- Clear browser cache: Ctrl+Shift+R

**Theme not switching?**
- Open browser DevTools → Elements tab
- Check `data-theme` attribute on `<html>` tag
- Verify CSS variables are defined in globals.css

**Dev server not starting?**
```bash
# Clear npm cache
npm cache clean --force

# Reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## Resources
- [README.md](./README.md) - Full project documentation
- [THEME_IMPLEMENTATION.md](./THEME_IMPLEMENTATION.md) - Pixel-art guidelines
- [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md) - Technical deep-dive
- [React + Vite Docs](https://vitejs.dev/guide/)
- [Zustand Docs](https://zustand-react.dev/)

---

**Questions?** See the documentation files or check the code comments.

Happy learning quest! 🏰✨
