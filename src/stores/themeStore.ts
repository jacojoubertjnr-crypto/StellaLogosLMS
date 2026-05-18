import { create } from 'zustand'

export type Theme = string
export type PerformanceTier = 'High' | 'Low'

interface ThemeState {
  currentTheme: Theme
  performanceTier: PerformanceTier
  setTheme: (theme: Theme) => void
  setPerformanceTier: (tier: PerformanceTier) => void
}

// Set initial attributes synchronously at module load — before React's first render —
// so CSS variables resolve correctly on the very first paint.
document.documentElement.setAttribute('data-theme', 'default')
document.documentElement.setAttribute('data-performance', 'High')

export const useThemeStore = create<ThemeState>((set) => ({
  currentTheme: 'default',
  performanceTier: 'High',
  setTheme: (theme: Theme) => {
    set({ currentTheme: theme })
    document.documentElement.setAttribute('data-theme', theme)
  },
  setPerformanceTier: (tier: PerformanceTier) => {
    set({ performanceTier: tier })
    document.documentElement.setAttribute('data-performance', tier)
  },
}))
