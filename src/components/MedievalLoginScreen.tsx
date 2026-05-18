import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { ThemedInput } from '@/components/ThemedInput'
import { SpriteManager } from '@/components/SpriteManager'
import { MusicToggle } from '@/components/MusicToggle'
import { usePageBackground } from '@/hooks/usePageBackground'
import { clearColorScheme } from '@/lib/skinInjection'

const VT: React.CSSProperties = { fontFamily: "'VT323', monospace" }

export const MedievalLoginScreen: React.FC = () => {
  const { username, password, isLoading, error, setUsername, setPassword, login } = useAuthStore()
  const { currentTheme, performanceTier, setTheme } = useThemeStore()
  const navigate = useNavigate()
  const [bannerSrc, setBannerSrc] = useState<string | null>(null)

  usePageBackground('login')

  // Login page always resets to the default theme — the user's theme kicks in after login
  useEffect(() => {
    setTheme('default')
    clearColorScheme()
  }, [])

  useEffect(() => {
    if (currentTheme === 'default') {
      setBannerSrc(null)
      return
    }
    const url = `/assets/themes/${currentTheme}/banner_top.png`
    const img = new Image()
    let cancelled = false
    img.onload  = () => { if (!cancelled) setBannerSrc(url) }
    img.onerror = () => { if (!cancelled) setBannerSrc(null) }
    img.src = url
    return () => { cancelled = true }
  }, [currentTheme])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await login()
    if (ok) navigate('/home')
  }

  const hasBanner = bannerSrc !== null

  return (
    <div className="theatrical-container">
      <SpriteManager anchor="background" page="login" />

      {/* Theme switcher — always fixed top-right so it never jumps position */}
      <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 50, display: 'flex', gap: '0.5rem' }}>
        <button onClick={() => setTheme('medieval')} className={`theme-switcher-btn${currentTheme === 'medieval' ? ' active' : ''}`}>Medieval</button>
        <button onClick={() => setTheme('default')}  className={`theme-switcher-btn${currentTheme === 'default'  ? ' active' : ''}`}>Default</button>
      </div>

      {/* Banner — only rendered when the image actually loads */}
      {hasBanner && (
        <div style={{ position: 'absolute', top: '1.25rem', left: 0, width: '100%', zIndex: 2 }}>
          <img
            src={bannerSrc!}
            alt=""
            style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '170px' }}
          />
          <SpriteManager anchor="top_header" page="login" />
        </div>
      )}

      {performanceTier === 'High' && (
        <>
          <div className="ambient-sprite ambient-left" />
          <div className="ambient-sprite ambient-right" />
        </>
      )}

      {/* Safe zone — pushed below banner only when banner exists */}
      <div className={`safe-zone${hasBanner ? ' safe-zone--below-banner' : ''}`}>

        {/* Branding header — shown when no banner image is present */}
        {!hasBanner && (
          <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
            <div style={{ ...VT, fontSize: '3rem', letterSpacing: '8px', color: 'var(--color-accent)', textShadow: '0 2px 16px color-mix(in srgb, var(--color-accent) 30%, transparent)' }}>
              STELLA LOGOS
            </div>
            <div style={{ ...VT, fontSize: '1rem', letterSpacing: '5px', color: 'var(--color-accent)', opacity: 0.45, marginTop: '0.25rem' }}>
              LEARNING MANAGEMENT SYSTEM
            </div>
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleSubmit} className="frame-parchment" style={{ gap: '0.85rem', overflow: 'visible' }}>

          {/* Title inside form — only when no banner */}
          {!hasBanner && (
            <div style={{ ...VT, textAlign: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.4rem', letterSpacing: '4px', color: 'var(--color-accent)', opacity: 0.7 }}>
                SIGN IN
              </span>
            </div>
          )}

          {/* Username */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label htmlFor="username" style={{ ...VT, fontSize: '0.95rem', letterSpacing: '3px', color: 'var(--color-text)', opacity: 0.85, paddingLeft: '0.1rem' }}>
              USERNAME
            </label>
            <div className="input-frame-wrap">
              <ThemedInput
                id="username"
                type="text"
                placeholder="learner@stellalogos.dev"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label htmlFor="password" style={{ ...VT, fontSize: '0.95rem', letterSpacing: '3px', color: 'var(--color-text)', opacity: 0.85, paddingLeft: '0.1rem' }}>
              PASSWORD
            </label>
            <div className="input-frame-wrap">
              <ThemedInput
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <div className="state-error" style={{ ...VT, textAlign: 'center', fontSize: '1rem', letterSpacing: '1px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`btn-9slice ${isLoading ? 'is-loading' : ''}`}
            style={{ marginTop: '0.25rem' }}
          >
            {isLoading ? 'VERIFYING...' : 'LOGIN'}
          </button>

        </form>

        {/* Dev quick-fill — remove before production */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'center' }}>
          {([
            { label: 'LEARNER',     email: 'testlearner@stellalogos.dev', pw: 'learner1234' },
            { label: 'BOT TEACHER', email: 'vanderberg@stellalogos.dev', pw: 'teacher1234' },
            { label: 'TEACHER',     email: 'teacher@stellalogos.dev',    pw: 'teacher1234' },
            { label: 'ADMIN',       email: 'admin@stellalogos.dev',      pw: 'admin1234'   },
          ] as const).map(({ label, email, pw }) => (
            <button
              key={label}
              type="button"
              onClick={() => { setUsername(email); setPassword(pw) }}
              style={{
                ...VT, fontSize: '0.75rem', letterSpacing: '1px',
                padding: '0.2rem 0.65rem',
                background: 'rgba(255,215,0,0.06)',
                border: '1px solid rgba(255,215,0,0.2)',
                color: 'rgba(255,215,0,0.4)',
                cursor: 'pointer',
                transition: 'border-color 0.12s, color 0.12s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.5)'; e.currentTarget.style.color = 'rgba(255,215,0,0.8)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.2)'; e.currentTarget.style.color = 'rgba(255,215,0,0.4)' }}
            >
              {label}
            </button>
          ))}
        </div>

      </div>

      <MusicToggle variant="fixed" />
    </div>
  )
}
