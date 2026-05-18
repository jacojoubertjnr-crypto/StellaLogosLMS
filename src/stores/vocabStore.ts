import { create } from 'zustand'
import { parseRawVocab, FALLBACK_VOCAB, type ThemeVocab, type RawVocab } from '@/lib/themeVocabulary'

interface VocabState {
  cache: Record<string, ThemeVocab>
  loading: Record<string, boolean>
  ensureLoaded: (theme: string) => void
  getVocab: (theme: string) => ThemeVocab
}

export const useVocabStore = create<VocabState>((set, get) => ({
  cache: {},
  loading: {},

  ensureLoaded(theme: string) {
    const { cache, loading } = get()
    if (cache[theme] || loading[theme]) return

    set(s => ({ loading: { ...s.loading, [theme]: true } }))

    fetch(`/assets/themeVocabulary/${theme}.json`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((raw: RawVocab) => {
        set(s => ({
          cache: { ...s.cache, [theme]: parseRawVocab(raw) },
          loading: { ...s.loading, [theme]: false },
        }))
      })
      .catch(() => {
        // Theme file missing — fall back to default if not already loading it
        set(s => ({ loading: { ...s.loading, [theme]: false } }))
        if (theme !== 'default') get().ensureLoaded('default')
      })
  },

  getVocab(theme: string): ThemeVocab {
    return get().cache[theme] ?? get().cache['default'] ?? FALLBACK_VOCAB
  },
}))
