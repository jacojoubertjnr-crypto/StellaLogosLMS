import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useQuestStore, type QuestProgress } from '@/stores/questStore'
import { usePageBackground } from '@/hooks/usePageBackground'

// Placeholder step titles — replaced when real curriculum content is built
const STEP_TITLES: Record<number, string> = {
  1: 'THE FIRST SCROLL',
  2: 'THE SECOND TRIAL',
  3: 'THE THIRD CHALLENGE',
  4: 'THE FOURTH PATH',
  5: 'THE FIFTH GATE',
  6: 'THE SIXTH TRIAL',
  7: 'THE FINAL CHAPTER',
}

function stepTitle(n: number): string {
  return STEP_TITLES[n] ?? `STEP ${n}`
}

// ─── Quest Progress Path ────────────────────────────────────────────────────

interface QuestPathProps {
  currentStep: number
  totalSteps: number
  isLocked: boolean
}

const QuestPath: React.FC<QuestPathProps> = ({ currentStep, totalSteps, isLocked }) => {
  const isComplete = currentStep >= totalSteps

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      maxWidth: '700px',
      padding: '0.5rem 1rem',
    }}>
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i + 1
        const isDone = stepNum <= currentStep
        const isActive = !isComplete && stepNum === currentStep + 1
        const isFuture = !isDone && !isActive

        const nodeColor = isDone
          ? 'var(--color-accent, #FFD700)'
          : isActive
          ? 'transparent'
          : 'transparent'

        const borderColor = isDone || isActive
          ? 'var(--color-accent, #FFD700)'
          : 'rgba(255, 215, 0, 0.25)'

        const textColor = isDone
          ? '#1a1000'
          : isActive
          ? 'var(--color-accent, #FFD700)'
          : 'rgba(255, 215, 0, 0.3)'

        const lineColor = isDone
          ? 'var(--color-accent, #FFD700)'
          : 'rgba(255, 215, 0, 0.2)'

        return (
          <React.Fragment key={stepNum}>
            {stepNum > 1 && (
              <div style={{
                flex: 1,
                height: '2px',
                background: lineColor,
                minWidth: '8px',
              }} />
            )}

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <motion.div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: nodeColor,
                  border: `2px solid ${borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'VT323', monospace",
                  fontSize: '1rem',
                  color: textColor,
                  position: 'relative',
                  opacity: isFuture ? 0.45 : 1,
                  cursor: 'default',
                }}
                animate={isActive ? {
                  boxShadow: [
                    '0 0 4px rgba(255,215,0,0.2)',
                    '0 0 16px rgba(255,215,0,0.8)',
                    '0 0 4px rgba(255,215,0,0.2)',
                  ],
                } : {}}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                {isDone ? '✓' : stepNum}
                {isActive && isLocked && (
                  <span style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '-10px',
                    fontSize: '14px',
                    lineHeight: 1,
                  }}>
                    🔒
                  </span>
                )}
              </motion.div>

              <span style={{
                fontFamily: "'VT323', monospace",
                fontSize: '0.75rem',
                color: isDone || isActive ? 'var(--color-accent, #FFD700)' : 'rgba(255,215,0,0.25)',
                lineHeight: 1,
              }}>
                {stepNum}
              </span>
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ─── Step Panel ─────────────────────────────────────────────────────────────

interface StepPanelProps {
  stepNumber: number
  totalSteps: number
  isLocked: boolean
  isLoading: boolean
  error: string | null
  onAdvance: () => void
}

const StepPanel: React.FC<StepPanelProps> = ({ stepNumber, totalSteps, isLocked, isLoading, error, onAdvance }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', textAlign: 'center' }}>
    <div>
      <p style={{
        fontFamily: "'VT323', monospace",
        fontSize: '0.85rem',
        letterSpacing: '3px',
        opacity: 0.6,
        marginBottom: '0.25rem',
        color: 'var(--color-text, #2C1810)',
      }}>
        STEP {stepNumber} OF {totalSteps}
      </p>
      <h2 style={{
        fontFamily: "'VT323', monospace",
        fontSize: '1.8rem',
        letterSpacing: '2px',
        margin: 0,
        color: 'var(--color-text, #2C1810)',
        textShadow: '1px 1px 0 rgba(0,0,0,0.2)',
      }}>
        {stepTitle(stepNumber)}
      </h2>
    </div>

    <p style={{
      fontFamily: "'VT323', monospace",
      fontSize: '1.1rem',
      opacity: 0.75,
      maxWidth: '340px',
      lineHeight: 1.5,
      color: 'var(--color-text, #2C1810)',
    }}>
      Complete the learning task for this step, then mark it done to advance your quest marker.
    </p>

    {error && (
      <p style={{ color: '#c0392b', fontFamily: "'VT323', monospace", fontSize: '1rem' }}>
        {error}
      </p>
    )}

    {isLocked ? (
      <div style={{
        padding: '0.75rem 1.5rem',
        border: '2px solid rgba(180,130,0,0.4)',
        fontFamily: "'VT323', monospace",
        fontSize: '1.1rem',
        opacity: 0.7,
        color: 'var(--color-text, #2C1810)',
        letterSpacing: '1px',
      }}>
        🔒 WAITING FOR TEACHER TO UNLOCK
      </div>
    ) : (
      <button
        className="btn-9slice"
        onClick={onAdvance}
        disabled={isLoading}
        style={{
          opacity: isLoading ? 0.6 : 1,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          minWidth: '200px',
          fontSize: '1.3rem',
          letterSpacing: '2px',
        }}
      >
        {isLoading ? 'ADVANCING...' : 'COMPLETE STEP'}
      </button>
    )}
  </div>
)

// ─── Quest Complete Panel ────────────────────────────────────────────────────

const QuestCompletePanel: React.FC = () => (
  <motion.div
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.5, ease: 'backOut' }}
    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}
  >
    <motion.div
      animate={{ rotate: [0, -8, 8, -8, 8, 0] }}
      transition={{ duration: 0.6, delay: 0.4 }}
      style={{ fontSize: '3rem', lineHeight: 1 }}
    >
      ★
    </motion.div>
    <h2 style={{
      fontFamily: "'VT323', monospace",
      fontSize: '2.2rem',
      letterSpacing: '3px',
      margin: 0,
      color: 'var(--color-accent, #FFD700)',
      textShadow: '0 0 12px rgba(255,215,0,0.6)',
    }}>
      QUEST COMPLETE!
    </h2>
    <p style={{
      fontFamily: "'VT323', monospace",
      fontSize: '1.1rem',
      opacity: 0.8,
      color: 'var(--color-text, #2C1810)',
    }}>
      You have completed all steps of this quest.
      <br />A new adventure awaits!
    </p>
  </motion.div>
)

// ─── Points Popup ────────────────────────────────────────────────────────────

interface PointsPopupProps {
  amount: number
}

const PointsPopup: React.FC<PointsPopupProps> = ({ amount }) => (
  <motion.div
    key={`pts-${amount}-${Date.now()}`}
    initial={{ opacity: 0, y: 0, scale: 0.7 }}
    animate={{ opacity: 1, y: -80, scale: 1.3 }}
    exit={{ opacity: 0, y: -130, scale: 0.9 }}
    transition={{ duration: 1.4, ease: 'easeOut' }}
    style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 200,
      pointerEvents: 'none',
      fontFamily: "'VT323', monospace",
      fontSize: '2.5rem',
      fontWeight: 700,
      color: '#FFD700',
      textShadow: '0 0 16px rgba(255,215,0,0.9), 2px 2px 0 rgba(0,0,0,0.6)',
      letterSpacing: '2px',
      whiteSpace: 'nowrap',
    }}
  >
    +{amount} PTS
  </motion.div>
)

// ─── Header Bar ──────────────────────────────────────────────────────────────

interface HeaderBarProps {
  displayName: string
  pointsBalance: number
  onLogout: () => void
}

const HeaderBar: React.FC<HeaderBarProps> = ({ displayName, pointsBalance, onLogout }) => (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    height: '52px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1.25rem',
    background: 'rgba(20, 10, 0, 0.72)',
    backdropFilter: 'blur(4px)',
    borderBottom: '1px solid rgba(255,215,0,0.2)',
    fontFamily: "'VT323', monospace",
  }}>
    <span style={{ fontSize: '1.1rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.9)' }}>
      STELLA LOGOS
    </span>
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
      <span style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.85)', letterSpacing: '1px' }}>
        {displayName}
      </span>
      <motion.span
        key={pointsBalance}
        initial={{ scale: 1.4, color: '#FFD700' }}
        animate={{ scale: 1, color: 'rgba(255,215,0,0.9)' }}
        transition={{ duration: 0.4 }}
        style={{ fontSize: '1.1rem', letterSpacing: '1px', fontWeight: 700 }}
      >
        ★ {pointsBalance} PTS
      </motion.span>
      <button
        onClick={onLogout}
        style={{
          fontFamily: 'inherit',
          fontSize: '1rem',
          letterSpacing: '2px',
          padding: '2px 14px',
          background: 'transparent',
          border: '1px solid rgba(255,215,0,0.4)',
          color: 'rgba(255,215,0,0.7)',
          cursor: 'pointer',
          transition: 'border-color 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,215,0,0.9)'
          e.currentTarget.style.color = 'rgba(255,215,0,1)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,215,0,0.4)'
          e.currentTarget.style.color = 'rgba(255,215,0,0.7)'
        }}
      >
        LOGOUT
      </button>
    </div>
  </div>
)

// ─── Class Selector Tab ──────────────────────────────────────────────────────

interface ClassTabsProps {
  progresses: QuestProgress[]
  activeClassId: string | null
  onSelect: (id: string) => void
}

const ClassTabs: React.FC<ClassTabsProps> = ({ progresses, activeClassId, onSelect }) => {
  if (progresses.length <= 1) return null

  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      {progresses.map((p) => (
        <button
          key={p.academicClassId}
          onClick={() => onSelect(p.academicClassId)}
          style={{
            fontFamily: "'VT323', monospace",
            fontSize: '1rem',
            letterSpacing: '1px',
            padding: '4px 14px',
            background: activeClassId === p.academicClassId ? 'rgba(255,215,0,0.15)' : 'transparent',
            border: `1px solid ${activeClassId === p.academicClassId ? 'rgba(255,215,0,0.8)' : 'rgba(255,215,0,0.3)'}`,
            color: activeClassId === p.academicClassId ? 'rgba(255,215,0,1)' : 'rgba(255,215,0,0.5)',
            cursor: 'pointer',
          }}
        >
          {p.subject}
        </button>
      ))}
    </div>
  )
}

// ─── QuestScreen (main export) ───────────────────────────────────────────────

export const QuestScreen: React.FC = () => {
  const navigate = useNavigate()
  usePageBackground('learningTask')
  const { user, logout } = useAuthStore()
  const {
    progresses,
    activeClassId,
    pointsBalance,
    isLoading,
    error,
    lastPointsAwarded,
    isQuestComplete,
    fetchProgress,
    advance,
    setActiveClass,
    clearPointsPopup,
  } = useQuestStore()

  const activeProgress = progresses.find((p) => p.academicClassId === activeClassId) ?? progresses[0]

  useEffect(() => {
    fetchProgress()
  }, [])

  // Auto-clear the points popup after 1.8 s
  useEffect(() => {
    if (lastPointsAwarded > 0) {
      const id = setTimeout(clearPointsPopup, 1800)
      return () => clearTimeout(id)
    }
  }, [lastPointsAwarded])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // ── Loading state (first load only)
  if (isLoading && progresses.length === 0) {
    return (
      <div
        className="theatrical-container"
        style={{
          fontFamily: "'VT323', monospace",
          fontSize: '1.8rem',
          letterSpacing: '3px',
          color: 'var(--color-accent, #FFD700)',
          opacity: 0.7,
        }}
      >
        LOADING QUEST...
      </div>
    )
  }

  // ── No enrolled classes
  if (!isLoading && progresses.length === 0) {
    return (
      <div className="theatrical-container" style={{ flexDirection: 'column', gap: '1rem' }}>
        <p style={{ fontFamily: "'VT323', monospace", fontSize: '1.4rem', color: 'var(--color-accent, #FFD700)' }}>
          No active quests found.
        </p>
        <button className="btn-9slice" onClick={handleLogout} style={{ fontSize: '1.2rem' }}>
          LOGOUT
        </button>
      </div>
    )
  }

  const questDone = isQuestComplete || (activeProgress ? activeProgress.currentStep >= activeProgress.totalSteps : false)
  const activeStepNumber = activeProgress ? activeProgress.currentStep + 1 : 1

  return (
    <div className="theatrical-container" style={{ alignItems: 'flex-start', overflowY: 'auto' }}>
      <HeaderBar
        displayName={user?.displayName ?? ''}
        pointsBalance={pointsBalance}
        onLogout={handleLogout}
      />

      {/* Main content — centred below header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="safe-zone"
        style={{
          marginTop: '72px',
          marginBottom: '2rem',
          maxWidth: '860px',
          gap: '1.5rem',
        }}
      >
        {/* Class tabs (only shown when enrolled in multiple classes) */}
        <ClassTabs
          progresses={progresses}
          activeClassId={activeClassId}
          onSelect={setActiveClass}
        />

        {activeProgress && (
          <>
            {/* Quest title */}
            <div style={{ textAlign: 'center' }}>
              <h1 style={{
                fontFamily: "'VT323', monospace",
                fontSize: '1.6rem',
                letterSpacing: '3px',
                margin: 0,
                color: 'var(--color-accent, #FFD700)',
                opacity: 0.9,
              }}>
                {activeProgress.className}
              </h1>
              <p style={{
                fontFamily: "'VT323', monospace",
                fontSize: '0.9rem',
                letterSpacing: '2px',
                margin: '0.25rem 0 0',
                color: 'var(--color-accent, #FFD700)',
                opacity: 0.5,
                textTransform: 'uppercase',
              }}>
                {activeProgress.subject}
              </p>
            </div>

            {/* Progress path */}
            <QuestPath
              currentStep={activeProgress.currentStep}
              totalSteps={activeProgress.totalSteps}
              isLocked={activeProgress.isLocked}
            />

            {/* Step content panel */}
            <div
              className="frame-parchment"
              style={{ width: '100%', maxWidth: '540px', alignItems: 'center' }}
            >
              {questDone ? (
                <QuestCompletePanel />
              ) : (
                <StepPanel
                  stepNumber={activeStepNumber}
                  totalSteps={activeProgress.totalSteps}
                  isLocked={activeProgress.isLocked}
                  isLoading={isLoading}
                  error={error}
                  onAdvance={() => advance(activeProgress.academicClassId)}
                />
              )}
            </div>
          </>
        )}
      </motion.div>

      {/* Floating +N pts reward popup */}
      <AnimatePresence>
        {lastPointsAwarded > 0 && (
          <PointsPopup amount={lastPointsAwarded} />
        )}
      </AnimatePresence>
    </div>
  )
}
