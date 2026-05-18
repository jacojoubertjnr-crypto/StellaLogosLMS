import { useEffect } from 'react'
import { useThemeStore } from '@/stores/themeStore'

/**
 * Sets document.body background to /{theme}/{page}/background.png when mounted.
 * Falls back to the CSS --theme-bg variable if the asset doesn't exist.
 * Clears the inline style on unmount so the next page can set its own.
 */
export function usePageBackground(page: string) {
  const { currentTheme } = useThemeStore()

  useEffect(() => {
    const url = `/assets/themes/${currentTheme}/${page}/background.png`
    let active = true

    const probe = new Image()
    probe.onload = () => {
      if (active) document.body.style.backgroundImage = `url('${url}')`
    }
    probe.src = url

    return () => {
      active = false
      document.body.style.backgroundImage = ''
    }
  }, [currentTheme, page])
}
