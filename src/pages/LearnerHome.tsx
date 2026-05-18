import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useThemeStore } from '@/stores/themeStore'
import { useQuestStore } from '@/stores/questStore'
import { mockLearnerState } from '@/mockState'
import { useThemeVocab } from '@/hooks/useThemeVocab'
import { usePageBackground } from '@/hooks/usePageBackground'
import { useBackgroundPreloader } from '@/hooks/useBackgroundPreloader'

// ─── RunningRabbit ───────────────────────────────────────────────────────────
// Moves left→right along the bottom via requestAnimationFrame — no CSS
// keyframes. Silently absent until animated/rabbit/frame_1.png exists.

const RunningRabbit: React.FC<{ theme: string }> = ({ theme }) => {
  const [frame, setFrame]     = useState(0)
  const [visible, setVisible] = useState(false)
  const [exists, setExists]   = useState(false)
  const [clicked, setClicked] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const basePath = `/assets/themes/${theme}/home/sprites/moving/rabbit`

  // Probe once for the sprite assets
  useEffect(() => {
    const probe = new Image()
    probe.onload  = () => setExists(true)
    probe.onerror = () => setExists(false)
    probe.src = `${basePath}/frame_1.png`
  }, [basePath])

  // rAF loop — directly writes left style so React isn't re-rendering every frame
  useEffect(() => {
    if (!exists) return

    let rafId: number
    let frameTimer: ReturnType<typeof setInterval>
    let waitTimer: ReturnType<typeof setTimeout>
    let posX = -80
    let lastTime = 0
    // X pixel where the rabbit appears from behind the rocks — adjust to match bg
    const rockX = 160
    // Rabbit disappears this many px before the right edge (into the burrow)
    const burrowX = () => window.innerWidth - 120
    // Fade starts this many px before the burrow
    const fadeDistance = 80
    // px per second to cross from rocks to burrow in 4 s
    const pxPerSec = () => (burrowX() - rockX) / 4
    // V-path: rabbit dips from edgeBottom down to midBottom at the horizontal centre
    const edgeBottom = 36   // px — start and end height (matches JSX bottom)
    const midBottom  = 1    // px — lowest point at the screen's horizontal midpoint

    const stopRun = () => {
      cancelAnimationFrame(rafId)
      clearInterval(frameTimer)
      setVisible(false)
      waitTimer = setTimeout(startRun, 14000)
    }

    const step = (now: number) => {
      const dt = lastTime ? (now - lastTime) / 1000 : 0
      lastTime = now
      posX += pxPerSec() * dt
      const el = wrapperRef.current
      if (el) {
        el.style.left = `${posX}px`
        // V-path: triangle wave on bottom — dips to midBottom at horizontal centre
        const progress = (posX - rockX) / (burrowX() - rockX)
        const bottom = midBottom + (edgeBottom - midBottom) * Math.abs(progress * 2 - 1)
        el.style.bottom = `${bottom}px`
        // Fade out as the rabbit approaches the burrow
        const fadeStart = burrowX() - fadeDistance
        el.style.opacity = posX > fadeStart
          ? `${Math.max(0, 1 - (posX - fadeStart) / fadeDistance)}`
          : '1'
      }
      if (posX > burrowX()) { stopRun(); return }
      rafId = requestAnimationFrame(step)
    }

    const startRun = () => {
      posX = rockX
      lastTime = 0
      if (wrapperRef.current) {
        wrapperRef.current.style.opacity = '1'
        wrapperRef.current.style.bottom = `${edgeBottom}px`
      }
      setVisible(true)
      setFrame(0)
      let f = 0
      frameTimer = setInterval(() => { f = (f + 1) % 3; setFrame(f) }, 150)
      rafId = requestAnimationFrame(step)
    }

    waitTimer = setTimeout(startRun, 1500)

    return () => {
      cancelAnimationFrame(rafId)
      clearInterval(frameTimer)
      clearTimeout(waitTimer)
    }
  }, [exists, basePath])

  const handleClick = () => {
    if (clicked) return
    setClicked(true)
    setTimeout(() => setClicked(false), 900)
  }

  if (!exists) return null

  return (
    <div
      ref={wrapperRef}
      onClick={handleClick}
      style={{
        position: 'fixed',
        bottom: '36px',
        left: '-80px',
        zIndex: 5,
        cursor: 'crosshair',
        display: visible ? 'block' : 'none',
      }}
    >
      <img
        src={clicked ? `${basePath}/clicked.png` : `${basePath}/frame_${frame + 1}.png`}
        alt=""
        style={{
          width: '64px',
          height: '64px',
          imageRendering: 'pixelated',
          display: 'block',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

// ─── Theme palette ────────────────────────────────────────────────────────────

const PORTAL_PALETTE = {
  medieval: {
    text:     'rgba(30,15,0,0.95)',
    subtext:  'rgba(30,15,0,0.7)',
    faint:    'rgba(30,15,0,0.35)',
    accent:   'rgba(40,100,200,0.9)',
    accentDim:'rgba(40,100,200,0.2)',
    shadow:   '1px 1px 0 rgba(255,255,255,0.25)',
  },
  default: {
    text:     'rgba(232,240,254,0.95)',
    subtext:  'rgba(232,240,254,0.7)',
    faint:    'rgba(232,240,254,0.25)',
    accent:   'rgba(74,158,255,0.9)',
    accentDim:'rgba(74,158,255,0.2)',
    shadow:   '0 1px 4px rgba(0,0,0,0.6)',
  },
}

// ─── PrimaryAction [The Great Portal] ───────────────────────────────────────

interface GreatPortalProps {
  questLabel: string
  classLabel: string
  currentStep: number
  totalSteps: number
  onEnter: () => void
}

const GreatPortal: React.FC<GreatPortalProps> = ({ questLabel, classLabel, currentStep, totalSteps, onEnter }) => {
  const { currentTheme } = useThemeStore()
  const pal = PORTAL_PALETTE[currentTheme as keyof typeof PORTAL_PALETTE] ?? PORTAL_PALETTE.medieval
  const progressPct = Math.round((currentStep / totalSteps) * 100)

  return (
    <button className="btn-portal" onClick={onEnter} style={{ fontFamily: "'VT323', monospace" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.6rem', color: pal.subtext, lineHeight: 1 }}>▶</span>
        <span style={{ fontSize: '2rem', letterSpacing: '2px', color: pal.text, textShadow: pal.shadow, lineHeight: 1.1 }}>
          {questLabel}
        </span>
      </div>

      {/* Step dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <span
            key={i}
            style={{
              display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%',
              background: i < currentStep ? pal.accent : pal.accentDim,
              border: i === currentStep ? `2px solid ${pal.accent}` : `1px solid ${pal.accentDim}`,
            }}
          />
        ))}
      </div>

      {/* Meta line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '1rem', letterSpacing: '2px', color: pal.subtext }}>
          {currentStep === 0 ? 'NOT STARTED' : `Step ${currentStep} of ${totalSteps}`}
        </span>
        <span style={{ color: pal.faint }}>·</span>
        <span style={{ fontSize: '1rem', letterSpacing: '2px', color: pal.subtext }}>{classLabel}</span>
        <span style={{ color: pal.faint }}>·</span>
        <span style={{ fontSize: '1rem', letterSpacing: '1px', color: pal.accent }}>{progressPct}% COMPLETE</span>
      </div>
    </button>
  )
}

// ─── UtilityTile ─────────────────────────────────────────────────────────────
// Shows standard functional name; themed [AestheticName] appears as tooltip on hover.

interface UtilityTileProps {
  icon: string
  label: string      // Standard functional name shown on button
  themeName: string  // Medieval [Aesthetic] name shown as hover tooltip
  active?: boolean
  onClick: () => void
  onMouseEnter?: () => void
}

const UtilityTile: React.FC<UtilityTileProps> = ({ icon, label, themeName, active, onClick, onMouseEnter }) => (
  <button
    className={`tile-item${active ? ' tile-active' : ''}`}
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    style={{ fontFamily: "'VT323', monospace" }}
  >
    {/* Themed name tooltip — visible on hover only */}
    <span className="tile-tooltip">{themeName}</span>

    <span style={{
      fontSize: '2rem',
      lineHeight: 1,
      color: active ? '#FFD700' : 'rgba(255,215,0,0.7)',
      textShadow: active ? '0 0 8px rgba(255,215,0,0.5)' : '1px 1px 0 rgba(0,0,0,0.5)',
    }}>
      {icon}
    </span>

    <span style={{
      fontSize: '1.15rem',
      letterSpacing: '1px',
      textAlign: 'center',
      color: active ? '#FFD700' : 'rgba(255,215,0,0.9)',
      textShadow: '1px 1px 0 rgba(0,0,0,0.7)',
      lineHeight: 1.15,
    }}>
      {label}
    </span>
  </button>
)

// ─── LearnerHome ─────────────────────────────────────────────────────────────

export const LearnerHome: React.FC = () => {
  const navigate = useNavigate()
  const { currentTheme } = useThemeStore()
  const vocab = useThemeVocab()
  const checkedIn = mockLearnerState.attendance.checkedInToday
  const [cloudPath, setCloudPath] = useState<string | null>(null)

  usePageBackground('home')
  const { preloadPage } = useBackgroundPreloader()

  useEffect(() => {
    const primarySrc = `/assets/themes/${currentTheme}/home/sprites/moving/cloud_drift.png`
    const img = new Image()
    img.onload  = () => setCloudPath(primarySrc)
    img.onerror = () => setCloudPath(null)
    img.src = primarySrc
  }, [currentTheme])

  const { primaryAction, attendance } = mockLearnerState
  const actionVerb = primaryAction.currentStep > 0 ? vocab.actionVerbContinue : vocab.actionVerbStart
  const portalLabel = `${actionVerb}: ${primaryAction.questLabel}`

  return (
    <div className="theatrical-container" style={{ alignItems: 'flex-start', overflowY: 'auto' }}>
      {/* Drifting clouds — only mounted when asset confirmed to exist */}
      {cloudPath && (
        <>
          <img src={cloudPath} alt=""
            style={{
              position: 'absolute', left: '-10%', top: '20%',
              width: '160px', height: '80px',
              imageRendering: 'pixelated', zIndex: 1, pointerEvents: 'none',
              animation: 'linear-drift 200s linear infinite',
              animationDirection: 'reverse',
            }} />
          <img src={cloudPath} alt=""
            style={{
              position: 'absolute', left: '-10%', top: '10%',
              width: '120px', height: '60px',
              imageRendering: 'pixelated', zIndex: 1, pointerEvents: 'none',
              animation: 'linear-drift 280s linear infinite',
              animationDirection: 'reverse',
              animationDelay: '40s',
            }} />
        </>
      )}

      <RunningRabbit theme={currentTheme} />


      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="safe-zone"
        style={{ marginTop: '72px', marginBottom: '2rem', maxWidth: '680px', gap: '1.25rem' }}
      >
        {/* Streak + ledger link */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <p style={{
            fontFamily: "'VT323', monospace",
            fontSize: '0.85rem',
            letterSpacing: '3px',
            color: 'rgba(255,215,0,0.5)',
            margin: 0,
            textAlign: 'center',
            textShadow: '1px 1px 0 rgba(0,0,0,0.6)',
          }}>
            {checkedIn
              ? `★ CHECKED IN · ${attendance.streakDays + 1}-DAY STREAK`
              : `${attendance.streakDays}-DAY STREAK · CHECK IN TO CONTINUE`}
          </p>
          <button
            onClick={() => navigate('/ledger')}
            style={{
              fontFamily: "'VT323', monospace",
              fontSize: '0.75rem',
              letterSpacing: '2px',
              background: 'transparent',
              border: '1px solid rgba(255,215,0,0.2)',
              color: 'rgba(255,215,0,0.35)',
              cursor: 'pointer',
              padding: '0.1rem 0.6rem',
              transition: 'border-color 0.12s, color 0.12s',
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.6)'; e.currentTarget.style.color = 'rgba(255,215,0,0.8)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.2)'; e.currentTarget.style.color = 'rgba(255,215,0,0.35)' }}
          >
            HISTORY
          </button>
        </div>

        {/* PrimaryAction [The Great Portal] */}
        <div onMouseEnter={() => preloadPage('learningTask')} style={{ width: '100%' }}>
          <GreatPortal
            questLabel={portalLabel}
            classLabel={primaryAction.classLabel}
            currentStep={primaryAction.currentStep}
            totalSteps={primaryAction.totalSteps}
            onEnter={() => { sessionStorage.removeItem('task_phase_default_1'); useQuestStore.getState().setDevFreshStart(true); navigate('/learningtask') }}
          />
        </div>

        {/* UtilityGrid — standard labels, themed names as hover tooltip */}
        <div className="utility-grid">
          <UtilityTile
            icon="◆"
            label="ATTENDANCE"
            themeName={vocab.tileAttendance}
            active={checkedIn}
            onClick={() => navigate('/attendence')}
            onMouseEnter={() => preloadPage('attendence')}
          />
          <UtilityTile
            icon="≡"
            label="MY SUBJECTS"
            themeName={vocab.tileSubjects}
            onClick={() => navigate('/subjects')}
            onMouseEnter={() => preloadPage('mySubjects')}
          />
          <UtilityTile
            icon="✦"
            label="MESSAGES"
            themeName={vocab.tileMessages}
            onClick={() => navigate('/social')}
            onMouseEnter={() => preloadPage('messages')}
          />
          <UtilityTile
            icon="◈"
            label="SHOP"
            themeName={vocab.tileShop}
            onClick={() => navigate('/shop')}
            onMouseEnter={() => preloadPage('shop')}
          />
        </div>
      </motion.div>
    </div>
  )
}
