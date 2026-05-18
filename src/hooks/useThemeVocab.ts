import { useEffect } from 'react'
import { useThemeStore } from '@/stores/themeStore'
import { useVocabStore } from '@/stores/vocabStore'
import { type ThemeVocab } from '@/lib/themeVocabulary'

export function useThemeVocab(): ThemeVocab {
  const { currentTheme } = useThemeStore()
  const { ensureLoaded, getVocab } = useVocabStore()

  // Kick off the fetch on first use and whenever the theme changes.
  // ensureLoaded is a no-op if the file is already cached or in-flight.
  useEffect(() => {
    ensureLoaded(currentTheme)
  }, [currentTheme])

  // Also ensure the default is always loaded (used as fallback)
  useEffect(() => {
    ensureLoaded('default')
  }, [])

  return getVocab(currentTheme)
}
