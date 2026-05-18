import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { mockSubjects } from '@/mockState'
import { usePageBackground } from '@/hooks/usePageBackground'
import { useThemeStore } from '@/stores/themeStore'

// ─── Constants ────────────────────────────────────────────────────────────────

const VISIBLE = 3
const GAP_PX  = 6
const ANIM_MS = 560

// ─── Shared dot row ───────────────────────────────────────────────────────────

const DotRow: React.FC<{ currentStep: number; totalSteps: number; size?: number }> = ({
  currentStep, totalSteps, size = 8,
}) => (
  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
    {Array.from({ length: totalSteps }, (_, i) => (
      <span
        key={i}
        style={{
          width: size, height: size, borderRadius: '50%', display: 'inline-block',
          background: i < currentStep ? 'rgba(30,12,0,0.75)' : 'rgba(30,12,0,0.15)',
          border: i === currentStep ? `1px solid rgba(30,12,0,0.75)` : 'none',
        }}
      />
    ))}
  </div>
)

// ─── TermBar ─────────────────────────────────────────────────────────────────

const TermBar: React.FC<{ termProgress: number; barHeight?: number }> = ({ termProgress, barHeight = 5 }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
      <span style={{ fontFamily: "'VT323', monospace", fontSize: '0.78rem', letterSpacing: '2px', color: 'rgba(30,12,0,0.6)' }}>TERM</span>
      <span style={{ fontFamily: "'VT323', monospace", fontSize: '0.78rem', letterSpacing: '1px', color: 'rgba(30,12,0,0.8)' }}>{termProgress}%</span>
    </div>
    <div style={{ height: barHeight, background: 'rgba(30,12,0,0.12)', borderRadius: '1px', overflow: 'hidden' }}>
      <div style={{ width: `${termProgress}%`, height: '100%', background: 'rgba(30,12,0,0.55)', borderRadius: '1px' }} />
    </div>
  </div>
)

// ─── SubjectCard (list) ───────────────────────────────────────────────────────

interface CardProps {
  name: string
  currentTask: string
  termProgress: number
  currentStep: number
  totalSteps: number
  onClick: () => void
}

const SubjectCard = React.forwardRef<HTMLButtonElement, CardProps>(
  ({ name, currentTask, termProgress, currentStep, totalSteps, onClick }, ref) => {
    const { currentTheme } = useThemeStore()
    const cardBg = `/assets/themes/${currentTheme}/mySubjects/subject.png`

    return (
      <motion.button
        ref={ref}
        onClick={onClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.filter = 'brightness(1.08) drop-shadow(0 0 8px rgba(255,190,60,0.85)) drop-shadow(0 0 4px rgba(255,220,100,0.7))'
        }}
        onMouseLeave={(e) => { e.currentTarget.style.filter = '' }}
        style={{
          backgroundImage: `url('${cardBg}')`,
          backgroundSize: '100% 100%',
          backgroundColor: 'transparent',
          imageRendering: 'pixelated',
          padding: '1.25rem 12rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          cursor: 'pointer',
          fontFamily: "'VT323', monospace",
          border: 'none',
          width: '100%',
          textAlign: 'left',
          flexShrink: 0,
          transition: 'filter 0.08s ease',
        }}
      >
        <p style={{ margin: 0, fontSize: '1.5rem', letterSpacing: '2px', color: 'rgba(30,12,0,0.95)', textShadow: '1px 1px 0 rgba(255,255,255,0.25)' }}>
          {name}
        </p>
        <p style={{ margin: 0, fontSize: '0.85rem', letterSpacing: '1px', color: 'rgba(30,12,0,0.75)' }}>
          {currentTask}
        </p>
        <TermBar termProgress={termProgress} />
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', letterSpacing: '2px', color: 'rgba(30,12,0,0.6)', marginRight: '4px' }}>TASK</span>
          <DotRow currentStep={currentStep} totalSteps={totalSteps} />
        </div>
      </motion.button>
    )
  }
)

// ─── SubjectDetail (expanded) ─────────────────────────────────────────────────

interface DetailProps {
  subject: typeof mockSubjects[0]
  onBack: () => void
  onEnter: () => void
}

const SubjectDetail: React.FC<DetailProps> = ({ subject, onBack, onEnter }) => {
  const { currentTheme } = useThemeStore()
  const cardBg = `/assets/themes/${currentTheme}/mySubjects/subject.png`

  return (
    <motion.div
      key="detail"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      {/* Dim backdrop — click to close */}
      <div
        onClick={onBack}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', cursor: 'default' }}
      />

      {/* Enlarged scroll — floats above backdrop */}
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '900px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <motion.div
          animate={{
            filter: [
              'drop-shadow(0 0 8px rgba(255,190,60,0.3))',
              'drop-shadow(0 0 22px rgba(255,190,60,0.75))',
              'drop-shadow(0 0 8px rgba(255,190,60,0.3))',
            ],
          }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            backgroundImage: `url('${cardBg}')`,
            backgroundSize: '100% 100%',
            imageRendering: 'pixelated',
            padding: '2.5rem 13rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            fontFamily: "'VT323', monospace",
            width: '100%',
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: '2rem', letterSpacing: '2px', color: 'rgba(30,12,0,0.95)', textShadow: '1px 1px 0 rgba(255,255,255,0.3)' }}>
              {subject.name}
            </p>
            <p style={{ margin: 0, fontSize: '1.1rem', letterSpacing: '1px', color: 'rgba(30,12,0,0.75)' }}>
              {subject.currentTask}
            </p>
          </div>

          <TermBar termProgress={subject.termProgress} barHeight={7} />

          {/* Task dots + text actions — all on one line */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', letterSpacing: '2px', color: 'rgba(30,12,0,0.6)' }}>TASK</span>
            <DotRow currentStep={subject.currentStep} totalSteps={subject.totalSteps} size={11} />
            <span style={{ color: 'rgba(30,12,0,0.25)' }}>·</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={onEnter}
                style={{
                  fontFamily: "'VT323', monospace",
                  fontSize: '1rem',
                  letterSpacing: '1px',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'rgba(30,12,0,0.85)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                  transition: 'color 0.1s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(30,12,0,1)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(30,12,0,0.85)' }}
              >
                ▶ GO TO
              </button>
              <span style={{ color: 'rgba(30,12,0,0.25)' }}>·</span>
              <button
                onClick={onBack}
                style={{
                  fontFamily: "'VT323', monospace",
                  fontSize: '1rem',
                  letterSpacing: '1px',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'rgba(30,12,0,0.5)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                  transition: 'color 0.1s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(30,12,0,0.8)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(30,12,0,0.5)' }}
              >
                ◂ BACK
              </button>
            </div>
          </div>
        </motion.div>

      </motion.div>
    </motion.div>
  )
}

// ─── NavArrow ─────────────────────────────────────────────────────────────────

const NavArrow: React.FC<{ direction: 'up' | 'down'; enabled: boolean; onClick: () => void }> = ({
  direction, enabled, onClick,
}) => (
  <button
    onClick={onClick}
    disabled={!enabled}
    style={{
      fontFamily: "'VT323', monospace",
      fontSize: '1.6rem',
      lineHeight: 1,
      background: 'transparent',
      border: 'none',
      color: enabled ? 'rgba(255,215,0,0.65)' : 'rgba(255,215,0,0.18)',
      cursor: enabled ? 'pointer' : 'default',
      alignSelf: 'center',
      padding: '0.1rem 1.5rem',
      transition: 'color 0.15s',
    }}
    onMouseEnter={(e) => { if (enabled) e.currentTarget.style.color = 'rgba(255,215,0,1)' }}
    onMouseLeave={(e) => { e.currentTarget.style.color = enabled ? 'rgba(255,215,0,0.65)' : 'rgba(255,215,0,0.18)' }}
  >
    {direction === 'up' ? '▲' : '▼'}
  </button>
)

// ─── CurriculumNavigator [The Royal Library] ─────────────────────────────────

export const CurriculumNavigator: React.FC = () => {
  const navigate = useNavigate()
  const [startIndex, setStartIndex]   = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [selectedId, setSelectedId]   = useState<string | null>(null)
  const [cardH, setCardH]             = useState(0)
  const firstCardRef                  = useRef<HTMLButtonElement>(null)
  const wheelCooldown                 = useRef(false)
  usePageBackground('mySubjects')

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (firstCardRef.current) setCardH(firstCardRef.current.offsetHeight)
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  const canUp   = startIndex > 0
  const canDown = startIndex + VISIBLE < mockSubjects.length

  const scrollDown = () => {
    if (!canDown || isAnimating) return
    setIsAnimating(true)
    setStartIndex(i => i + 1)
  }

  const scrollUp = () => {
    if (!canUp || isAnimating) return
    setIsAnimating(true)
    setStartIndex(i => i - 1)
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (wheelCooldown.current) return
    wheelCooldown.current = true
    setTimeout(() => { wheelCooldown.current = false }, ANIM_MS + 60)
    if (e.deltaY > 0) scrollDown()
    else scrollUp()
  }

  const tapeY   = -(startIndex * (cardH + GAP_PX))
  const windowH = cardH > 0 ? cardH * VISIBLE + GAP_PX * (VISIBLE - 1) : undefined
  const selected = selectedId ? mockSubjects.find(s => s.id === selectedId) ?? null : null

  return (
    <div className="theatrical-container" style={{ alignItems: 'flex-start', overflowY: 'auto' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="safe-zone"
        style={{ marginTop: '2rem', marginBottom: '2rem', maxWidth: '900px', gap: '1rem' }}
      >
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          style={{ textAlign: 'center', width: '100%' }}
        >
          <p style={{ fontFamily: "'VT323', monospace", fontSize: '0.8rem', letterSpacing: '5px', color: 'rgba(255,215,0,0.4)', margin: '0 0 0.25rem' }}>
            ≡ ─────────── ≡
          </p>
          <h1 style={{ fontFamily: "'VT323', monospace", fontSize: '2rem', letterSpacing: '4px', color: 'rgba(255,215,0,0.9)', margin: 0, textShadow: '1px 1px 0 rgba(0,0,0,0.6)' }}>
            THE ROYAL LIBRARY
          </h1>
          <p style={{ fontFamily: "'VT323', monospace", fontSize: '0.85rem', letterSpacing: '3px', color: 'rgba(255,215,0,0.35)', margin: '0.25rem 0 0' }}>
            {selected
              ? selected.name.toUpperCase()
              : `${startIndex + 1}–${Math.min(startIndex + VISIBLE, mockSubjects.length)} OF ${mockSubjects.length} QUESTS`}
          </p>
        </motion.div>

        {/* List view / Detail view */}
        <AnimatePresence mode="wait">
          {selected ? (
            <SubjectDetail
              key="detail"
              subject={selected}
              onBack={() => setSelectedId(null)}
              onEnter={() => navigate('/quest')}
            />
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <NavArrow direction="up" enabled={canUp && !isAnimating} onClick={scrollUp} />

              <div
                onWheel={handleWheel}
                style={{ overflow: 'hidden', width: '100%', height: windowH, position: 'relative' }}
              >
                <motion.div
                  animate={{ y: tapeY }}
                  transition={{ duration: ANIM_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
                  onAnimationStart={() => setIsAnimating(true)}
                  onAnimationComplete={() => setIsAnimating(false)}
                  style={{ display: 'flex', flexDirection: 'column', gap: `${GAP_PX}px` }}
                >
                  {mockSubjects.map((s, i) => (
                    <SubjectCard
                      key={s.id}
                      ref={i === 0 ? firstCardRef : undefined}
                      name={s.name}
                      currentTask={s.currentTask}
                      termProgress={s.termProgress}
                      currentStep={s.currentStep}
                      totalSteps={s.totalSteps}
                      onClick={() => setSelectedId(s.id)}
                    />
                  ))}
                </motion.div>
              </div>

              <NavArrow direction="down" enabled={canDown && !isAnimating} onClick={scrollDown} />

              <button
                onClick={() => navigate('/home')}
                style={{
                  fontFamily: "'VT323', monospace",
                  fontSize: '1.1rem', letterSpacing: '2px',
                  padding: '0.5rem 2rem', background: 'transparent',
                  border: '1px solid rgba(255,215,0,0.35)',
                  color: 'rgba(255,215,0,0.6)', cursor: 'pointer',
                  alignSelf: 'center', transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,215,0,0.8)'
                  e.currentTarget.style.color = 'rgba(255,215,0,1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,215,0,0.35)'
                  e.currentTarget.style.color = 'rgba(255,215,0,0.6)'
                }}
              >
                ◂ RETURN TO TOWN SQUARE
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
