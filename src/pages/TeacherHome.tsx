import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { usePageBackground } from '@/hooks/usePageBackground'
import { useBackgroundPreloader } from '@/hooks/useBackgroundPreloader'
import { TeacherPlanningHub } from '@/pages/TeacherPlanningHub'

const FONT = "'VT323', monospace"

// ─── Palette ─────────────────────────────────────────────────────────────────

const PORTAL_PALETTE = {
  medieval: {
    text:    'rgba(30,15,0,0.95)',
    subtext: 'rgba(30,15,0,0.7)',
    shadow:  '1px 1px 0 rgba(255,255,255,0.25)',
  },
  default: {
    text:    'rgba(232,240,254,0.95)',
    subtext: 'rgba(232,240,254,0.7)',
    shadow:  '0 1px 4px rgba(0,0,0,0.6)',
  },
}

// ─── TeacherPortal ───────────────────────────────────────────────────────────

const TeacherPortal: React.FC<{ label: string; subLabel: string; onEnter: () => void }> = ({
  label, subLabel, onEnter,
}) => {
  const { currentTheme } = useThemeStore()
  const pal = PORTAL_PALETTE[currentTheme as keyof typeof PORTAL_PALETTE] ?? PORTAL_PALETTE.medieval

  return (
    <button className="btn-portal" onClick={onEnter} style={{ fontFamily: FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.6rem', color: pal.subtext, lineHeight: 1 }}>▶</span>
        <span style={{ fontSize: '2rem', letterSpacing: '2px', color: pal.text, textShadow: pal.shadow, lineHeight: 1.1 }}>
          {label}
        </span>
      </div>
      <div>
        <span style={{ fontSize: '1rem', letterSpacing: '2px', color: pal.subtext }}>{subLabel}</span>
      </div>
    </button>
  )
}

// ─── TeacherTile ─────────────────────────────────────────────────────────────

const TeacherTile: React.FC<{
  icon: string
  label: string
  onClick: () => void
  onMouseEnter?: () => void
}> = ({ icon, label, onClick, onMouseEnter }) => (
  <button
    className="tile-item"
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    style={{ fontFamily: FONT }}
  >
    <span style={{
      fontSize: '2rem',
      lineHeight: 1,
      color: 'rgba(255,215,0,0.7)',
      textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
    }}>
      {icon}
    </span>
    <span style={{
      fontSize: '1.15rem',
      letterSpacing: '1px',
      textAlign: 'center',
      color: 'rgba(255,215,0,0.9)',
      textShadow: '1px 1px 0 rgba(0,0,0,0.7)',
      lineHeight: 1.15,
    }}>
      {label}
    </span>
  </button>
)

// ─── TeacherHome ─────────────────────────────────────────────────────────────

export const TeacherHome: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { preloadPage } = useBackgroundPreloader()

  usePageBackground('home')

  return (
    <div className="theatrical-container" style={{ alignItems: 'flex-start', overflowY: 'auto' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="safe-zone"
        style={{ marginTop: '72px', marginBottom: '2rem', maxWidth: '680px', gap: '1.25rem' }}
      >
        {/* Identity line */}
        <p style={{
          fontFamily: FONT,
          fontSize: '0.85rem',
          letterSpacing: '3px',
          color: 'rgba(255,215,0,0.5)',
          margin: 0,
          textAlign: 'center',
          textShadow: '1px 1px 0 rgba(0,0,0,0.6)',
        }}>
          {user?.displayName?.toUpperCase()} · {user?.role?.toUpperCase()}
        </p>

        {/* Primary portal */}
        <div style={{ width: '100%' }}>
          <TeacherPortal
            label="LIVE LESSON"
            subLabel="Open class dashboard"
            onEnter={() => navigate('/teacherDashboard')}
          />
        </div>

        {/* Utility tiles */}
        <div className="utility-grid">
          <TeacherTile
            icon="◈"
            label="STAFFROOM"
            onClick={() => navigate('/staffroom')}
          />
          <TeacherTile
            icon="◆"
            label="REGISTER"
            onClick={() => navigate('/register')}
          />
          <TeacherTile
            icon="✦"
            label="MESSAGES"
            onClick={() => navigate('/social')}
            onMouseEnter={() => preloadPage('messages')}
          />
          <TeacherTile
            icon="≡"
            label="MY CLASSES"
            onClick={() => navigate('/classes')}
          />
        </div>

        {/* Manage Learning Tasks — full-width bar, same tile style */}
        <button
          className="tile-item"
          onClick={() => navigate('/task-manager')}
          style={{
            fontFamily: FONT,
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'center',
            padding: '0.9rem 1.75rem',
            minHeight: 'unset',
          }}
        >
          <span style={{ fontSize: '1.6rem', color: 'rgba(255,215,0,0.7)', textShadow: '1px 1px 0 rgba(0,0,0,0.5)', lineHeight: 1 }}>✦</span>
          <span style={{ fontSize: '1.15rem', letterSpacing: '1px', color: 'rgba(255,215,0,0.9)', textShadow: '1px 1px 0 rgba(0,0,0,0.7)', marginLeft: '0.75rem' }}>MANAGE LEARNING TASKS</span>
        </button>

        {/* Planning hub: timetable · term plan · year plan */}
        <TeacherPlanningHub />

      </motion.div>
    </div>
  )
}
