import { useEffect, useRef, useState } from 'react'
import { useThemeStore } from '@/stores/themeStore'

export interface ThemeMusicState {
  isReady: boolean
  isMuted: boolean
  needsGesture: boolean
  toggleMute: () => void
  enable: () => void
}

/**
 * Loads and plays /assets/themes/{currentTheme}/music/{screen}.wav in a loop.
 * Silently does nothing if the file is missing.
 * Handles browser autoplay policy: if blocked, sets needsGesture=true and
 * automatically retries on the next page click.
 */
export function useThemeMusic(screen: 'login' | 'home'): ThemeMusicState {
  const { currentTheme } = useThemeStore()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [needsGesture, setNeedsGesture] = useState(false)

  useEffect(() => {
    const audio = new Audio()
    audio.loop = true
    audio.volume = 0.35
    audio.preload = 'auto'
    audioRef.current = audio

    const onCanPlay = () => {
      setIsReady(true)
      audio.play()
        .then(() => setNeedsGesture(false))
        .catch(() => setNeedsGesture(true))
    }

    audio.addEventListener('canplaythrough', onCanPlay)
    // Setting src after adding the listener so canplaythrough fires correctly.
    // A 404 response fires the 'error' event — we intentionally ignore it so
    // missing music files cause no console noise and no UI breakage.
    audio.src = `/assets/themes/${currentTheme}/music/${screen}.wav`
    audio.load()

    return () => {
      audio.removeEventListener('canplaythrough', onCanPlay)
      audio.pause()
      audio.src = ''
      audioRef.current = null
      setIsReady(false)
      setNeedsGesture(false)
    }
  }, [currentTheme, screen])

  // When autoplay is blocked, silently resume on the next click anywhere
  useEffect(() => {
    if (!needsGesture) return
    const resume = () => {
      audioRef.current?.play()
        .then(() => setNeedsGesture(false))
        .catch(() => {})
    }
    document.addEventListener('click', resume, { once: true })
    return () => document.removeEventListener('click', resume)
  }, [needsGesture])

  const enable = () => {
    audioRef.current?.play()
      .then(() => setNeedsGesture(false))
      .catch(() => {})
  }

  const toggleMute = () => {
    if (!audioRef.current) return
    const next = !isMuted
    audioRef.current.muted = next
    setIsMuted(next)
  }

  return { isReady, isMuted, needsGesture, toggleMute, enable }
}
