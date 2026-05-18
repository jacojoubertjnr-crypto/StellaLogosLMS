// Color scheme CSS variable overrides applied on top of the current theme
const COLOR_SCHEME_VARS: Record<string, Record<string, string>> = {
  'Crimson Court': {
    '--color-primary':    '#3D0000',
    '--color-secondary':  '#6B0000',
    '--color-accent':     '#C0392B',
    '--color-text':       '#FFE4E1',
    '--color-bg-overlay': 'rgba(192,57,43,0.12)',
  },
  'Emerald Isle': {
    '--color-primary':    '#0D2B0D',
    '--color-secondary':  '#1A4A1A',
    '--color-accent':     '#4CAF4C',
    '--color-text':       '#E8F5E9',
    '--color-bg-overlay': 'rgba(76,175,76,0.12)',
  },
  'Midnight Blue': {
    '--color-primary':    '#0A1628',
    '--color-secondary':  '#1B3A6B',
    '--color-accent':     '#4A9EFF',
    '--color-text':       '#E8F0FE',
    '--color-bg-overlay': 'rgba(74,158,255,0.12)',
  },
}

const COLOR_SCHEME_PROPS = [
  '--color-primary',
  '--color-secondary',
  '--color-accent',
  '--color-text',
  '--color-bg-overlay',
]

export function applyColorScheme(name: string) {
  const vars = COLOR_SCHEME_VARS[name]
  if (!vars) return
  Object.entries(vars).forEach(([k, v]) =>
    document.documentElement.style.setProperty(k, v),
  )
}

export function clearColorScheme() {
  COLOR_SCHEME_PROPS.forEach(k =>
    document.documentElement.style.removeProperty(k),
  )
}

export interface SkinItem {
  name: string
  itemType: string
  assetPath: string
  active: boolean
}

// Maps built-in theme item names → store theme key
const THEME_KEY: Record<string, string> = {
  'Medieval Realm': 'medieval',
}

export function applySkinsFromInventory(
  items: SkinItem[],
  setTheme: (t: string) => void,
) {
  const activeTheme  = items.find(i => i.itemType === 'Theme' && i.active)
  const activeScheme = items.find(i => i.itemType === 'Color Scheme' && i.active)

  // Inventory is the single source of truth — always set theme, defaulting to 'default'
  // so a stale Zustand-persisted value can never override an unequip.
  if (activeTheme) {
    const key = THEME_KEY[activeTheme.name]
      ?? (activeTheme.assetPath?.startsWith('themes/')
          ? activeTheme.assetPath.replace('themes/', '')
          : null)
    setTheme(key ?? 'default')
  } else {
    setTheme('default')
  }

  clearColorScheme()
  if (activeScheme) applyColorScheme(activeScheme.name)
}
