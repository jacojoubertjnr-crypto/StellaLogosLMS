import { useEffect, useCallback } from 'react'
import { useThemeStore } from '@/stores/themeStore'

const ALL_PAGES = ['home', 'mySubjects', 'attendence', 'shop', 'messages', 'learningTask']

// Module-level cache — persists across re-renders and navigations within the session
const loaded = new Set<string>()

function loadBg(theme: string, page: string) {
  const key = `${theme}/${page}`
  if (loaded.has(key)) return
  loaded.add(key)
  new Image().src = `/assets/themes/${theme}/${page}/background.png`
}

/**
 * Dual-strategy background preloader.
 *
 * High performance tier (fast connection):
 *   Preloads all page backgrounds immediately on mount so every navigation
 *   transition is instant.
 *
 * Low performance tier (slow/metered connection):
 *   Does nothing on mount. Returns `preloadPage(page)` which callers invoke
 *   on hover so only backgrounds the learner is about to visit are fetched.
 */
export function useBackgroundPreloader() {
  const { currentTheme, performanceTier } = useThemeStore()

  useEffect(() => {
    if (performanceTier !== 'High') return
    ALL_PAGES.forEach(page => loadBg(currentTheme, page))
  }, [currentTheme, performanceTier])

  const preloadPage = useCallback((page: string) => {
    loadBg(currentTheme, page)
  }, [currentTheme])

  return { preloadPage }
}
