import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, gql } from '@apollo/client'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useThemeVocab } from '@/hooks/useThemeVocab'
import { MusicToggle } from '@/components/MusicToggle'

const ME_BALANCE_QUERY = gql`
  query AppHeaderBalance {
    me { pointsBalance }
  }
`

const routeToPage: Record<string, string> = {
  '/home':       'home',
  '/teacherDashboard':    'home',
  '/staffroom':  'home',
  '/classes':    'home',
  '/subjects':   'mySubjects',
  '/attendence': 'attendence',
  '/shop':       'shop',
  '/social':     'messages',
  '/learningtask': 'learningTask',
  '/task':       'learningTask',
  '/submit':     'attendence',
  '/task-manager': 'home',
  '/task-creator': 'home',
  '/admin':        'home',
  '/ledger':       'home',
}

export const AppHeader: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { currentTheme } = useThemeStore()
  const vocab = useThemeVocab()
  const isLearner = user?.role === 'Learner'
  const { data: meData } = useQuery(ME_BALANCE_QUERY, {
    skip: !isLearner,
    fetchPolicy: 'cache-and-network',
  })
  const pointsBalance: number = meData?.me?.pointsBalance ?? 0
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)

  useEffect(() => {
    if (currentTheme === 'default') { setBannerUrl(null); return }
    const url = `/assets/themes/${currentTheme}/banner_top.png`
    let active = true
    const probe = new Image()
    probe.onload  = () => { if (active) setBannerUrl(url) }
    probe.onerror = () => { if (active) setBannerUrl(null) }
    probe.src = url
    return () => { active = false }
  }, [currentTheme])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 50,
      height: '52px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.25rem',
      backgroundImage: bannerUrl ? `url('${bannerUrl}')` : 'var(--theme-banner-home)',
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      imageRendering: 'pixelated',
      fontFamily: "'VT323', monospace",
    }}>
      {/* UserIdentity [The Knight's Crest] */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%',
          border: '2px solid rgba(255,215,0,0.6)',
          background: 'rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.9rem', color: 'rgba(255,215,0,0.85)',
        }}>
          ◆
        </div>
        <span style={{ fontSize: '1.2rem', letterSpacing: '1px', color: '#fff', textShadow: '1px 1px 0 rgba(0,0,0,0.8)' }}>
          {user?.displayName ?? ''}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {/* CurrencyCounter [The Gold Pouch] — learners only */}
        {isLearner && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '1rem', color: 'rgba(255,215,0,0.8)' }}>◆</span>
            <span style={{ fontSize: '1.25rem', letterSpacing: '1px', color: '#FFD700', textShadow: '1px 1px 0 rgba(0,0,0,0.8)' }}>
              {pointsBalance.toLocaleString()} {vocab.currencyLabel}
            </span>
          </div>
        )}

        <MusicToggle variant="inline" />

        <button
          onClick={handleLogout}
          style={{
            fontFamily: 'inherit',
            fontSize: '1rem', letterSpacing: '2px',
            padding: '2px 12px',
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,215,0,0.45)',
            color: 'rgba(255,215,0,0.8)',
            cursor: 'pointer',
            textShadow: '1px 1px 0 rgba(0,0,0,0.6)',
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0,0,0,0.6)'
            e.currentTarget.style.borderColor = 'rgba(255,215,0,0.9)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0,0,0,0.4)'
            e.currentTarget.style.borderColor = 'rgba(255,215,0,0.45)'
          }}
        >
          LOGOUT
        </button>
      </div>
    </div>
  )
}
