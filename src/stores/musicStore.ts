import { create } from 'zustand'

const TARGET_VOLUME = 0.35
const FADE_STEPS = 30

// Module-level singleton — survives React re-renders and route changes.
let _audio: HTMLAudioElement | null = null
let _currentSrc = ''
let _fadeTimer: ReturnType<typeof setInterval> | null = null

function clearFade() {
  if (_fadeTimer !== null) { clearInterval(_fadeTimer); _fadeTimer = null }
}

interface MusicStore {
  isReady: boolean
  isMuted: boolean
  needsGesture: boolean
  init: (src: string, shouldPlay?: boolean) => void
  fadeOut: (durationMs?: number) => void
  fadeIn: (durationMs?: number) => void
  toggleMute: () => void
  enable: () => void
}

export const useMusicStore = create<MusicStore>((set, get) => ({
  isReady: false,
  isMuted: false,
  needsGesture: false,

  init(src, shouldPlay = false) {
    // Same track already loaded — nothing to recreate.
    if (src === _currentSrc && _audio) return

    clearFade()
    if (_audio) { _audio.pause(); _audio.src = '' }

    const a = new Audio()
    a.loop = true
    a.volume = TARGET_VOLUME
    a.preload = 'auto'
    a.muted = get().isMuted
    _audio = a
    _currentSrc = src
    set({ isReady: false, needsGesture: false })

    a.addEventListener('canplaythrough', () => {
      set({ isReady: true })
      if (shouldPlay) get().fadeIn()
    }, { once: true })

    // 404s fire 'error' — silently ignored, music simply absent for this theme.
    a.src = src
    a.load()
  },

  fadeOut(durationMs = 1500) {
    clearFade()
    if (!_audio || _audio.paused || _audio.volume === 0) return
    const startVol = _audio.volume
    const interval = durationMs / FADE_STEPS
    const step = startVol / FADE_STEPS
    _fadeTimer = setInterval(() => {
      if (!_audio) { clearFade(); return }
      const next = Math.max(0, _audio.volume - step)
      _audio.volume = next
      if (next <= 0) { clearFade(); _audio.pause() }
    }, interval)
  },

  fadeIn(durationMs = 800) {
    clearFade()
    if (!_audio) return
    // Already playing at full volume — nothing to do.
    if (!_audio.paused && _audio.volume >= TARGET_VOLUME) return
    _audio.volume = 0
    _audio.play()
      .then(() => {
        set({ needsGesture: false })
        const interval = durationMs / FADE_STEPS
        const step = TARGET_VOLUME / FADE_STEPS
        _fadeTimer = setInterval(() => {
          if (!_audio) { clearFade(); return }
          const next = Math.min(TARGET_VOLUME, _audio.volume + step)
          _audio.volume = next
          if (next >= TARGET_VOLUME) clearFade()
        }, interval)
      })
      .catch(() => set({ needsGesture: true }))
  },

  toggleMute() {
    if (!_audio) return
    const next = !get().isMuted
    _audio.muted = next
    set({ isMuted: next })
  },

  // Called when user performs the first gesture to unlock autoplay.
  enable() {
    get().fadeIn(600)
  },
}))
