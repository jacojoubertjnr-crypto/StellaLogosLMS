import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useThemeStore } from '@/stores/themeStore'
import { useMusicStore } from '@/stores/musicStore'

// Routes where music should play. All others trigger a fade-out.
const MUSIC_ROUTES = new Set(['/', '/home'])

/**
 * Mounted once inside <BrowserRouter>. Manages the persistent theme music
 * singleton: loads the track on theme change, fades in/out on route change,
 * and re-tries playback after the first user gesture if autoplay was blocked.
 */
export function ThemeMusicController() {
  const { pathname } = useLocation()
  const { currentTheme } = useThemeStore()
  const init = useMusicStore((s) => s.init)
  const fadeIn = useMusicStore((s) => s.fadeIn)
  const fadeOut = useMusicStore((s) => s.fadeOut)
  const needsGesture = useMusicStore((s) => s.needsGesture)
  const enable = useMusicStore((s) => s.enable)

  // (Re-)load the track when the active theme changes.
  useEffect(() => {
    init(
      `/assets/themes/${currentTheme}/music/theme.wav`,
      MUSIC_ROUTES.has(pathname),
    )
  }, [currentTheme]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fade in or out whenever the route changes.
  useEffect(() => {
    if (MUSIC_ROUTES.has(pathname)) {
      fadeIn()
    } else {
      fadeOut()
    }
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // When autoplay is blocked, resume on the next click anywhere on the page.
  useEffect(() => {
    if (!needsGesture) return
    document.addEventListener('click', enable, { once: true })
    return () => document.removeEventListener('click', enable)
  }, [needsGesture, enable])

  return null
}
