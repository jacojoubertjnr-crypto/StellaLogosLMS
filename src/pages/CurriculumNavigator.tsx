import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { mockSubjects } from '@/mockState'
import { usePageBackground } from '@/hooks/usePageBackground'
import { useThemeStore } from '@/stores/themeStore'
import { useThemeVocab } from '@/hooks/useThemeVocab'
import { useQuestStore } from '@/stores/questStore'

// ─── Constants ────────────────────────────────────────────────────────────────

const VISIBLE = 7
const GAP_PX  = 4
const ANIM_MS = 560

// ─── Theme palette ────────────────────────────────────────────────────────────

const PALETTE = {
  medieval: {
    text:      'rgba(30,12,0,0.95)',
    subtext:   'rgba(30,12,0,0.75)',
    dim:       'rgba(30,12,0,0.6)',
    faint:     'rgba(30,12,0,0.25)',
    barTrack:  'rgba(30,12,0,0.12)',
    barFill:   'rgba(30,12,0,0.55)',
    dotFill:   'rgba(30,12,0,0.75)',
    dotEmpty:  'rgba(30,12,0,0.15)',
    cardBg:    null as string | null,
    cardBorder:'none',
    hoverGlow: 'brightness(1.08) drop-shadow(0 0 8px rgba(255,190,60,0.85)) drop-shadow(0 0 4px rgba(255,220,100,0.7))',
    detailGlow: ['drop-shadow(0 0 8px rgba(255,190,60,0.3))', 'drop-shadow(0 0 22px rgba(255,190,60,0.75))', 'drop-shadow(0 0 8px rgba(255,190,60,0.3))'] as string[],
  },
  default: {
    text:      'rgba(232,240,254,0.95)',
    subtext:   'rgba(232,240,254,0.65)',
    dim:       'rgba(232,240,254,0.45)',
    faint:     'rgba(232,240,254,0.2)',
    barTrack:  'rgba(74,158,255,0.12)',
    barFill:   'rgba(74,158,255,0.65)',
    dotFill:   'rgba(74,158,255,0.8)',
    dotEmpty:  'rgba(74,158,255,0.12)',
    cardBg:    'rgba(30,58,95,0.5)' as string | null,
    cardBorder:'1px solid rgba(74,158,255,0.22)',
    hoverGlow: 'brightness(1.06) drop-shadow(0 0 10px rgba(74,158,255,0.5))',
    detailGlow: ['drop-shadow(0 0 8px rgba(74,158,255,0.2))', 'drop-shadow(0 0 22px rgba(74,158,255,0.6))', 'drop-shadow(0 0 8px rgba(74,158,255,0.2))'] as string[],
  },
}

type Pal = typeof PALETTE[keyof typeof PALETTE]

// ─── Mock archived tasks ──────────────────────────────────────────────────────

interface ArchivedResource {
  label: string
  type: 'video' | 'pdf' | 'audio'
}

interface ArchivedOption {
  letter: string
  text: string
  isCorrect: boolean
}

interface ArchivedQuestion {
  number: number
  text: string
  options: ArchivedOption[]
}

interface ArchivedTask {
  taskNumber: number
  title: string
  completedDate: string
  resources: ArchivedResource[]
  quiz: ArchivedQuestion[]
}

const RESOURCE_ICON: Record<ArchivedResource['type'], string> = {
  video: '🎬',
  pdf:   '📄',
  audio: '🎵',
}

const MOCK_ARCHIVED: Record<string, ArchivedTask[]> = {
  'Information Technology': [
    {
      taskNumber: 1,
      title: 'Introduction to Algorithms',
      completedDate: '2026-03-15',
      resources: [
        { label: 'What is an Algorithm? (Intro Video)',   type: 'video' },
        { label: 'Algorithm Design Patterns (PDF)',        type: 'pdf'   },
      ],
      quiz: [
        {
          number: 1,
          text: 'What is the primary purpose of an algorithm?',
          options: [
            { letter: 'A', text: 'To store data efficiently',                               isCorrect: false },
            { letter: 'B', text: 'To solve a problem through a defined sequence of steps',  isCorrect: true  },
            { letter: 'C', text: 'To display information to the user',                      isCorrect: false },
            { letter: 'D', text: 'To connect to a database',                                isCorrect: false },
          ],
        },
        {
          number: 2,
          text: 'Which of the following best describes Big O notation?',
          options: [
            { letter: 'A', text: 'A way to write algorithms in plain English',              isCorrect: false },
            { letter: 'B', text: 'A notation for database query speed',                     isCorrect: false },
            { letter: 'C', text: 'A measure of how runtime grows relative to input size',   isCorrect: true  },
            { letter: 'D', text: 'The maximum number of loops allowed in a program',        isCorrect: false },
          ],
        },
        {
          number: 3,
          text: 'Which sorting algorithm has an average time complexity of O(n log n)?',
          options: [
            { letter: 'A', text: 'Bubble Sort',   isCorrect: false },
            { letter: 'B', text: 'Merge Sort',    isCorrect: true  },
            { letter: 'C', text: 'Linear Search', isCorrect: false },
            { letter: 'D', text: 'Selection Sort',isCorrect: false },
          ],
        },
      ],
    },
    {
      taskNumber: 2,
      title: 'Data Structures: Arrays & Lists',
      completedDate: '2026-04-02',
      resources: [
        { label: 'Arrays vs Linked Lists (Video)',         type: 'video' },
        { label: 'Data Structures Reference Sheet (PDF)', type: 'pdf'   },
        { label: 'Stack & Queue Walkthrough (Audio)',      type: 'audio' },
      ],
      quiz: [
        {
          number: 1,
          text: 'What is the time complexity of accessing an element in an array by index?',
          options: [
            { letter: 'A', text: 'O(n)',    isCorrect: false },
            { letter: 'B', text: 'O(log n)',isCorrect: false },
            { letter: 'C', text: 'O(1)',    isCorrect: true  },
            { letter: 'D', text: 'O(n²)',   isCorrect: false },
          ],
        },
        {
          number: 2,
          text: 'Which data structure follows the Last-In First-Out principle?',
          options: [
            { letter: 'A', text: 'Queue',       isCorrect: false },
            { letter: 'B', text: 'Stack',       isCorrect: true  },
            { letter: 'C', text: 'Linked List', isCorrect: false },
            { letter: 'D', text: 'Binary Tree', isCorrect: false },
          ],
        },
      ],
    },
  ],
}

function getArchived(subjectName: string): ArchivedTask[] {
  return MOCK_ARCHIVED[subjectName] ?? []
}

// ─── Shared sub-components ────────────────────────────────────────────────────

const DotRow: React.FC<{ currentStep: number; totalSteps: number; size?: number; pal: Pal }> = ({
  currentStep, totalSteps, size = 8, pal,
}) => (
  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
    {Array.from({ length: totalSteps }, (_, i) => (
      <span
        key={i}
        style={{
          width: size, height: size, borderRadius: '50%', display: 'inline-block',
          background: i < currentStep ? pal.dotFill : pal.dotEmpty,
          border: i === currentStep ? `1px solid ${pal.dotFill}` : 'none',
        }}
      />
    ))}
  </div>
)

const TermBar: React.FC<{ termProgress: number; barHeight?: number; pal: Pal }> = ({ termProgress, barHeight = 5, pal }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
      <span style={{ fontFamily: "'VT323', monospace", fontSize: '0.78rem', letterSpacing: '2px', color: pal.dim }}>TERM</span>
      <span style={{ fontFamily: "'VT323', monospace", fontSize: '0.78rem', letterSpacing: '1px', color: pal.subtext }}>{termProgress}%</span>
    </div>
    <div style={{ height: barHeight, background: pal.barTrack, borderRadius: '1px', overflow: 'hidden' }}>
      <div style={{ width: `${termProgress}%`, height: '100%', background: pal.barFill, borderRadius: '1px' }} />
    </div>
  </div>
)

// ─── SubjectCard (list row) ───────────────────────────────────────────────────

interface CardProps {
  name: string
  currentTask: string
  termProgress: number
  currentStep: number
  totalSteps: number
  onClick: () => void
}

const SubjectCard = React.forwardRef<HTMLButtonElement, CardProps>(
  ({ name, currentTask, termProgress, onClick }, ref) => (
    <motion.button
      ref={ref}
      onClick={onClick}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.5)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.2)' }}
      style={{
        height: '52px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 1rem',
        background: 'var(--color-pane-bg, rgba(0,0,0,0.45))',
        border: '1px solid rgba(255,215,0,0.2)',
        cursor: 'pointer', width: '100%', flexShrink: 0,
        fontFamily: "'VT323', monospace",
        transition: 'border-color 0.12s',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden' }}>
        <span style={{ fontSize: '1.3rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.85)', flexShrink: 0 }}>
          {name}
        </span>
        <span style={{ fontSize: '0.9rem', letterSpacing: '1px', color: 'rgba(255,215,0,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentTask}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
        <span style={{ fontSize: '0.9rem', letterSpacing: '1px', color: 'rgba(255,215,0,0.45)' }}>
          {termProgress}%
        </span>
        <span style={{ fontSize: '1.1rem', color: 'rgba(255,215,0,0.45)' }}>▶</span>
      </div>
    </motion.button>
  )
)

// ─── CurrentTaskPanel ─────────────────────────────────────────────────────────

const CurrentTaskPanel: React.FC<{
  subject: typeof mockSubjects[0]
  pal: Pal
  onEnter: () => void
  onBack: () => void
  onShowArchive: () => void
  archivedCount: number
}> = ({ subject, pal, onEnter, onBack, onShowArchive, archivedCount }) => (
  <motion.div
    key="current"
    initial={{ opacity: 0, x: 24 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -24 }}
    transition={{ duration: 0.2 }}
    style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%' }}
  >
    <div>
      <p style={{ margin: 0, fontSize: '2rem', letterSpacing: '2px', color: pal.text }}>
        {subject.name}
      </p>
      <p style={{ margin: 0, fontSize: '1.1rem', letterSpacing: '1px', color: pal.subtext }}>
        {subject.currentTask}
      </p>
    </div>

    <TermBar termProgress={subject.termProgress} barHeight={7} pal={pal} />

    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
      <span style={{ fontFamily: "'VT323', monospace", fontSize: '0.78rem', letterSpacing: '2px', color: pal.dim }}>TASK</span>
      <DotRow currentStep={subject.currentStep} totalSteps={subject.totalSteps} size={11} pal={pal} />
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
      <button
        onClick={onEnter}
        style={{
          fontFamily: "'VT323', monospace", fontSize: '1rem', letterSpacing: '1px',
          background: 'none', border: 'none', padding: 0,
          color: pal.subtext, cursor: 'pointer',
          textDecoration: 'underline', textUnderlineOffset: '3px', transition: 'color 0.1s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = pal.text }}
        onMouseLeave={(e) => { e.currentTarget.style.color = pal.subtext }}
      >
        ▶ GO TO
      </button>
      <span style={{ color: pal.faint }}>·</span>
      <button
        onClick={onBack}
        style={{
          fontFamily: "'VT323', monospace", fontSize: '1rem', letterSpacing: '1px',
          background: 'none', border: 'none', padding: 0,
          color: pal.dim, cursor: 'pointer',
          textDecoration: 'underline', textUnderlineOffset: '3px', transition: 'color 0.1s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = pal.subtext }}
        onMouseLeave={(e) => { e.currentTarget.style.color = pal.dim }}
      >
        ◂ BACK
      </button>
    </div>

    {archivedCount > 0 && (
      <button
        onClick={onShowArchive}
        style={{
          fontFamily: "'VT323', monospace", fontSize: '0.9rem', letterSpacing: '2px',
          background: 'none',
          border: `1px solid ${pal.faint}`,
          borderRadius: '3px',
          padding: '0.3rem 0.85rem',
          color: pal.dim,
          cursor: 'pointer',
          alignSelf: 'flex-start',
          marginTop: '0.25rem',
          transition: 'color 0.12s, border-color 0.12s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = pal.subtext
          e.currentTarget.style.borderColor = pal.subtext
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = pal.dim
          e.currentTarget.style.borderColor = pal.faint
        }}
      >
        ▼ PREVIOUS LEARNING TASKS ({archivedCount})
      </button>
    )}
  </motion.div>
)

// ─── ArchivedTaskPanel ────────────────────────────────────────────────────────

const ArchivedTaskPanel: React.FC<{
  tasks: ArchivedTask[]
  index: number
  pal: Pal
  onIndexChange: (i: number) => void
  onBack: () => void
}> = ({ tasks, index, pal, onIndexChange, onBack }) => {
  const task = tasks[index]
  if (!task) return null

  return (
    <motion.div
      key="archive"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ fontFamily: "'VT323', monospace", fontSize: '0.8rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.5)' }}>
            COMPLETED {task.completedDate}
          </div>
          <div style={{ fontFamily: "'VT323', monospace", fontSize: '1.75rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.97)', lineHeight: 1.1, marginTop: '2px' }}>
            TASK {task.taskNumber} — {task.title.toUpperCase()}
          </div>
        </div>

        {/* Task navigation */}
        {tasks.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              onClick={() => onIndexChange(index - 1)}
              disabled={index === 0}
              style={{
                fontFamily: "'VT323', monospace", fontSize: '1rem',
                background: 'none', border: `1px solid ${index === 0 ? pal.faint : pal.dim}`,
                borderRadius: '3px', padding: '0.1rem 0.5rem',
                color: index === 0 ? pal.faint : pal.dim,
                cursor: index === 0 ? 'default' : 'pointer',
              }}
            >◂</button>
            <span style={{ fontFamily: "'VT323', monospace", fontSize: '0.8rem', color: pal.dim, letterSpacing: '1px' }}>
              {index + 1} / {tasks.length}
            </span>
            <button
              onClick={() => onIndexChange(index + 1)}
              disabled={index === tasks.length - 1}
              style={{
                fontFamily: "'VT323', monospace", fontSize: '1rem',
                background: 'none', border: `1px solid ${index === tasks.length - 1 ? pal.faint : pal.dim}`,
                borderRadius: '3px', padding: '0.1rem 0.5rem',
                color: index === tasks.length - 1 ? pal.faint : pal.dim,
                cursor: index === tasks.length - 1 ? 'default' : 'pointer',
              }}
            >▶</button>
          </div>
        )}
      </div>

      {/* Resources */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <div style={{
          fontFamily: "'VT323', monospace", fontSize: '1.1rem', letterSpacing: '4px',
          color: '#FFD700',
          background: 'rgba(255,215,0,0.08)',
          border: '1px solid rgba(255,215,0,0.25)',
          borderRadius: '3px',
          padding: '0.3rem 0.6rem',
          marginBottom: '0.25rem',
        }}>
          CONTENT RESOURCES
        </div>
        {task.resources.map((r, i) => (
          <button
            key={i}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: '3px',
              padding: '0.45rem 0.75rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.12s, border-color 0.12s',
              width: '100%',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)' }}
          >
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>{RESOURCE_ICON[r.type]}</span>
            <span style={{ fontFamily: "'VT323', monospace", fontSize: '0.95rem', letterSpacing: '1px', color: 'rgba(255,255,255,0.88)' }}>
              {r.label}
            </span>
            <span style={{ fontFamily: "'VT323', monospace", fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginLeft: 'auto', letterSpacing: '1px' }}>
              VIEW ▶
            </span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)' }} />

      {/* Quiz */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{
          fontFamily: "'VT323', monospace", fontSize: '1.1rem', letterSpacing: '4px',
          color: '#FFD700',
          background: 'rgba(255,215,0,0.08)',
          border: '1px solid rgba(255,215,0,0.25)',
          borderRadius: '3px',
          padding: '0.3rem 0.6rem',
          marginBottom: '0.1rem',
        }}>
          QUIZ — {task.quiz.length} QUESTIONS
        </div>
        {task.quiz.map(q => (
          <div key={q.number} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <div style={{ fontFamily: "'VT323', monospace", fontSize: '0.95rem', color: 'rgba(255,255,255,0.92)', letterSpacing: '0.5px', lineHeight: 1.4 }}>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>{q.number}. </span>{q.text}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '0.75rem' }}>
              {q.options.map(opt => (
                <div
                  key={opt.letter}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.3rem 0.6rem',
                    background: opt.isCorrect ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${opt.isCorrect ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '3px',
                  }}
                >
                  <span style={{ fontFamily: "'VT323', monospace", fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', minWidth: '16px' }}>
                    {opt.letter}.
                  </span>
                  <span style={{ fontFamily: "'VT323', monospace", fontSize: '0.9rem', color: opt.isCorrect ? '#4ade80' : 'rgba(255,255,255,0.82)', letterSpacing: '0.5px' }}>
                    {opt.text}
                  </span>
                  {opt.isCorrect && (
                    <span style={{ fontFamily: "'VT323', monospace", fontSize: '0.72rem', color: '#4ade80', marginLeft: 'auto', letterSpacing: '1px' }}>
                      ✓ CORRECT
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Back to current */}
      <button
        onClick={onBack}
        style={{
          fontFamily: "'VT323', monospace", fontSize: '0.9rem', letterSpacing: '2px',
          background: 'none', border: `1px solid ${pal.faint}`, borderRadius: '3px',
          padding: '0.3rem 0.85rem',
          color: pal.dim,
          cursor: 'pointer',
          alignSelf: 'flex-start',
          marginTop: '0.25rem',
          transition: 'color 0.12s, border-color 0.12s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = pal.subtext
          e.currentTarget.style.borderColor = pal.subtext
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = pal.dim
          e.currentTarget.style.borderColor = pal.faint
        }}
      >
        ▲ CURRENT TASK
      </button>
    </motion.div>
  )
}

// ─── SubjectDetail (modal overlay) ───────────────────────────────────────────

interface DetailProps {
  subject: typeof mockSubjects[0]
  onBack: () => void
  onEnter: () => void
}

const SubjectDetail: React.FC<DetailProps> = ({ subject, onBack, onEnter }) => {
  const { currentTheme } = useThemeStore()
  const pal     = PALETTE[currentTheme as keyof typeof PALETTE] ?? PALETTE.medieval
  const imgUrl  = `/assets/themes/${currentTheme}/mySubjects/subject.png`
  const archived = getArchived(subject.name)

  const [view, setView]           = useState<'current' | 'archive'>('current')
  const [archiveIndex, setArchiveIndex] = useState(archived.length - 1)

  return (
    <motion.div
      key="detail"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 20,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '2rem',
      }}
    >
      <div onClick={onBack} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', cursor: 'default' }} />

      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        style={{ position: 'relative', width: '100%', maxWidth: '900px' }}
      >
        <motion.div
          animate={{ filter: pal.detailGlow }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            ...(pal.cardBg
              ? { backgroundColor: pal.cardBg, border: pal.cardBorder, backdropFilter: 'blur(4px)' }
              : { backgroundImage: `url('${imgUrl}')`, backgroundSize: '100% 100%', imageRendering: 'pixelated' }),
            padding: '2.5rem 13rem',
            fontFamily: "'VT323', monospace",
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxSizing: 'border-box',
          }}
        >
          <AnimatePresence mode="wait">
            {view === 'current' ? (
              <CurrentTaskPanel
                key="current"
                subject={subject}
                pal={pal}
                onEnter={onEnter}
                onBack={onBack}
                onShowArchive={() => { setArchiveIndex(archived.length - 1); setView('archive') }}
                archivedCount={archived.length}
              />
            ) : (
              <ArchivedTaskPanel
                key="archive"
                tasks={archived}
                index={archiveIndex}
                pal={pal}
                onIndexChange={setArchiveIndex}
                onBack={() => setView('current')}
              />
            )}
          </AnimatePresence>
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
      fontFamily: "'VT323', monospace", fontSize: '1.6rem', lineHeight: 1,
      background: 'transparent', border: 'none',
      color: enabled ? 'rgba(255,215,0,0.65)' : 'rgba(255,215,0,0.18)',
      cursor: enabled ? 'pointer' : 'default',
      alignSelf: 'center', padding: '0.1rem 1.5rem', transition: 'color 0.15s',
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
  const vocab = useThemeVocab()
  const { progresses } = useQuestStore()
  const [startIndex, setStartIndex]   = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [selectedId, setSelectedId]   = useState<string | null>(null)
  const [cardH, setCardH]             = useState(0)
  const firstCardRef                  = useRef<HTMLButtonElement>(null)
  const wheelCooldown                 = useRef(false)
  usePageBackground('mySubjects')

  const subjects = mockSubjects.map(s => {
    const live = progresses.find(p => p.subject === s.name)
    if (!live) return s
    const pct = live.totalSteps > 0 ? Math.round((live.currentStep / live.totalSteps) * 100) : 0
    return { ...s, currentStep: live.currentStep, totalSteps: live.totalSteps, termProgress: pct }
  })

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (firstCardRef.current) setCardH(firstCardRef.current.offsetHeight)
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  const canUp   = startIndex > 0
  const canDown = startIndex + VISIBLE < subjects.length

  const scrollDown = () => { if (!canDown || isAnimating) return; setIsAnimating(true); setStartIndex(i => i + 1) }
  const scrollUp   = () => { if (!canUp   || isAnimating) return; setIsAnimating(true); setStartIndex(i => i - 1) }

  const handleWheel = (e: React.WheelEvent) => {
    if (wheelCooldown.current) return
    wheelCooldown.current = true
    setTimeout(() => { wheelCooldown.current = false }, ANIM_MS + 60)
    if (e.deltaY > 0) scrollDown(); else scrollUp()
  }

  const tapeY   = -(startIndex * (cardH + GAP_PX))
  const windowH = cardH > 0 ? cardH * VISIBLE + GAP_PX * (VISIBLE - 1) : undefined
  const selected = selectedId ? subjects.find(s => s.id === selectedId) ?? null : null

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
            {vocab.subjectsPageTitle}
          </h1>
          <p style={{ fontFamily: "'VT323', monospace", fontSize: '0.85rem', letterSpacing: '3px', color: 'rgba(255,215,0,0.35)', margin: '0.25rem 0 0' }}>
            {selected
              ? selected.name.toUpperCase()
              : `${startIndex + 1}–${Math.min(startIndex + VISIBLE, subjects.length)} OF ${subjects.length} ${vocab.subjectsCountLabel}`}
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {selected ? (
            <SubjectDetail
              key="detail"
              subject={selected}
              onBack={() => setSelectedId(null)}
              onEnter={() => navigate('/learningtask')}
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

              <div onWheel={handleWheel} style={{ overflow: 'hidden', width: '100%', height: windowH, position: 'relative' }}>
                <motion.div
                  animate={{ y: tapeY }}
                  transition={{ duration: ANIM_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
                  onAnimationStart={() => setIsAnimating(true)}
                  onAnimationComplete={() => setIsAnimating(false)}
                  style={{ display: 'flex', flexDirection: 'column', gap: `${GAP_PX}px` }}
                >
                  {subjects.map((s, i) => (
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
                className="btn-9slice"
                onClick={() => navigate('/home')}
                style={{ fontFamily: "'VT323', monospace", letterSpacing: '2px' }}
              >
                ◂ {vocab.subjectsReturnLabel}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
