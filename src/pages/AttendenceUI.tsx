import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { gql, useQuery } from '@apollo/client'
import { usePageBackground } from '@/hooks/usePageBackground'
import { useEntryStore } from '@/stores/entryStore'
import { useThemeStore } from '@/stores/themeStore'
import { useThemeVocab } from '@/hooks/useThemeVocab'
import { mockAttendance, mockFutureTimetables, mockAssessmentSchedule, mockLearningTaskDetails, type LearningTaskDetail } from '@/mockState'
import { SpriteManager } from '@/components/SpriteManager'

// ─── Announcements ────────────────────────────────────────────────────────────

interface Announcement {
  id: string
  createdBy: string
  body: string
  target: string
  pinned: boolean
  createdAt: string
}

const MY_ANNOUNCEMENTS = gql`
  query MyAnnouncements {
    myAnnouncements { id createdBy body target pinned createdAt }
  }
`

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function fmtTarget(target: string): string {
  if (target === 'all') return 'ALL'
  return target.split(',').map(g => `GR ${g.trim()}`).join(', ')
}

const VT: React.CSSProperties = { fontFamily: "'VT323', monospace" }

// ─── TeacherTicker ────────────────────────────────────────────────────────────

const TeacherTicker: React.FC<{ announcements: Announcement[]; barBg?: string; panelBg?: string; barIcon?: string }> = ({ announcements, barBg, panelBg, barIcon }) => {
  const [open, setOpen] = useState(false)
  const tickerText = announcements.length > 0
    ? announcements.map(a => `${a.pinned ? '📌 ' : ''}${a.createdBy}: ${a.body}`).join('   ·   ')
    : 'No announcements at this time'

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        style={{
          ...VT,
          display: 'flex', alignItems: 'center', gap: '1rem',
          ...(barBg
            ? { backgroundImage: `url('${barBg}')`, backgroundSize: '100% 100%', imageRendering: 'pixelated' }
            : { background: 'var(--color-pane-bg, rgba(0,0,0,0.45))' }),
          border: '1px solid rgba(255,215,0,0.2)',
          height: '52px', width: '100%',
          overflow: 'hidden', cursor: 'pointer',
          padding: '0 1rem',
          transition: 'border-color 0.12s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.5)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.2)' }}
      >
        {barIcon && <img src={barIcon} alt="" style={{ width: '24px', height: '24px', imageRendering: 'pixelated', flexShrink: 0 }} />}
        <span style={{ fontSize: '1.3rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.85)', flexShrink: 0 }}>
          NOTICE BOARD
        </span>
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <motion.div
            animate={{ x: ['100%', '-100%'] }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            style={{ whiteSpace: 'nowrap', fontSize: '0.9rem', letterSpacing: '1px', color: 'rgba(255,215,0,0.35)' }}
          >
            {tickerText}
          </motion.div>
        </div>
        <span style={{ fontSize: '1.1rem', color: 'rgba(255,215,0,0.45)', flexShrink: 0 }}>▶</span>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(0,0,0,0.78)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '80px 2rem 2rem',
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              style={{
                ...(panelBg
                  ? { backgroundImage: `url('${panelBg}')`, backgroundSize: '100% 100%', imageRendering: 'pixelated' }
                  : { background: 'var(--color-modal-bg, rgba(8,8,8,0.97))', border: '1px solid rgba(255,215,0,0.35)' }),
                width: '100%', maxWidth: '680px',
                maxHeight: '100%',
                display: 'flex', flexDirection: 'column',
                ...VT,
              }}
            >
              {/* Header */}
              <div style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0.6rem 3.5rem',
                borderBottom: panelBg ? 'none' : '1px solid rgba(255,215,0,0.15)',
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {barIcon && <img src={barIcon} alt="" style={{ width: '24px', height: '24px', imageRendering: 'pixelated' }} />}
                  <span style={{ ...VT, fontSize: '1.6rem', letterSpacing: '4px', color: 'rgba(255,215,0,1)', textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.8)' }}>
                    NOTICE BOARD
                  </span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    position: 'absolute', right: '1rem',
                    ...VT, fontSize: '1rem', letterSpacing: '2px',
                    background: 'transparent', border: '1px solid rgba(255,215,0,0.3)',
                    color: 'rgba(255,215,0,0.6)', cursor: 'pointer', padding: '0.2rem 0.9rem',
                    transition: 'border-color 0.12s, color 0.12s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.8)'; e.currentTarget.style.color = 'rgba(255,215,0,1)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.color = 'rgba(255,215,0,0.6)' }}
                >
                  ✕ CLOSE
                </button>
              </div>

              {/* Scrollable notice cards */}
              <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem' }}>
                {announcements.length === 0 && (
                  <p style={{ ...VT, fontSize: '1rem', letterSpacing: '1px', color: 'rgba(255,215,0,0.35)', textAlign: 'center', margin: '2rem 0' }}>
                    No announcements at this time
                  </p>
                )}
                {announcements.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      padding: '0.75rem 1rem',
                      background: a.pinned ? 'rgba(255,215,0,0.07)' : 'rgba(255,215,0,0.04)',
                      borderLeft: `2px solid ${a.pinned ? 'rgba(255,215,0,0.7)' : 'rgba(255,215,0,0.35)'}`,
                      display: 'flex', flexDirection: 'column', gap: '0.3rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
                        {a.pinned && <span style={{ fontSize: '0.9rem' }}>📌</span>}
                        <span style={{ ...VT, fontSize: '1.1rem', letterSpacing: '1px', color: 'rgba(255,215,0,0.9)' }}>{a.createdBy}</span>
                      </div>
                      <span style={{ ...VT, fontSize: '0.8rem', color: 'rgba(255,215,0,0.3)', flexShrink: 0 }}>{fmtTime(a.createdAt)}</span>
                    </div>
                    <span style={{ ...VT, fontSize: '0.8rem', letterSpacing: '1px', color: 'rgba(255,215,0,0.4)' }}>
                      {fmtTarget(a.target)}
                    </span>
                    <p style={{ ...VT, margin: '0.25rem 0 0', fontSize: '1rem', letterSpacing: '0.5px', color: 'rgba(255,215,0,0.75)', lineHeight: 1.5 }}>
                      {a.body}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── SmartContainer ───────────────────────────────────────────────────────────

const SmartContainer: React.FC<{
  title: string
  preview?: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
  barBg?: string
  panelBg?: string
  barIcon?: string
}> = ({ title, preview, isOpen, onToggle, children, barBg, panelBg, barIcon }) => (
  <>
    {/* Always-collapsed clickable bar */}
    <div
      onClick={onToggle}
      style={{
        height: '52px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 1rem',
        ...(barBg
          ? { backgroundImage: `url('${barBg}')`, backgroundSize: '100% 100%', imageRendering: 'pixelated' }
          : { background: 'var(--color-pane-bg, rgba(0,0,0,0.45))' }),
        border: '1px solid rgba(255,215,0,0.2)',
        cursor: 'pointer', width: '100%', ...VT,
        transition: 'border-color 0.12s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.5)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.2)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden' }}>
        {barIcon && <img src={barIcon} alt="" style={{ width: '24px', height: '24px', imageRendering: 'pixelated', flexShrink: 0 }} />}
        <span style={{ fontSize: '1.3rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.85)', flexShrink: 0 }}>{title}</span>
        {preview && (
          <span style={{ fontSize: '0.9rem', letterSpacing: '1px', color: 'rgba(255,215,0,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {preview}
          </span>
        )}
      </div>
      <span style={{ fontSize: '1.1rem', color: 'rgba(255,215,0,0.45)', flexShrink: 0 }}>▶</span>
    </div>

    {/* Full-frame overlay when open */}
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onToggle}
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'rgba(0,0,0,0.72)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '80px 2rem 2rem',
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            style={{
              ...(panelBg
                ? { backgroundImage: `url('${panelBg}')`, backgroundSize: '100% 100%', imageRendering: 'pixelated' }
                : { background: 'var(--color-modal-bg, rgba(8,8,8,0.97))' }),
              border: panelBg ? 'none' : '1px solid rgba(255,215,0,0.3)',
              width: '100%', maxWidth: '860px',
              maxHeight: '100%',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Overlay header — centred title, close button top-right */}
            <div style={{
              position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0.6rem 3.5rem',
              borderBottom: panelBg ? 'none' : '1px solid rgba(255,215,0,0.15)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                {barIcon && <img src={barIcon} alt="" style={{ width: '24px', height: '24px', imageRendering: 'pixelated' }} />}
                <span style={{ ...VT, fontSize: '1.6rem', letterSpacing: '4px', color: 'rgba(255,215,0,1)', textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.8)' }}>{title}</span>
              </div>
              <button
                onClick={onToggle}
                style={{
                  ...VT, fontSize: '1rem', letterSpacing: '2px',
                  background: 'transparent', border: '1px solid rgba(255,215,0,0.3)',
                  color: 'rgba(255,215,0,0.6)', cursor: 'pointer', padding: '0.2rem 0.9rem',
                  transition: 'border-color 0.12s, color 0.12s',
                  position: 'absolute', right: '1rem',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.8)'; e.currentTarget.style.color = 'rgba(255,215,0,1)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.color = 'rgba(255,215,0,0.6)' }}
              >
                ✕ CLOSE
              </button>
            </div>

            {/* Scrollable content */}
            <div style={{ padding: '1.25rem 5rem 5rem', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </>
)

// ─── TimetableContent ─────────────────────────────────────────────────────────

const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
const MONTHS   = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER']
const MAX_DAY  = mockFutureTimetables.length // 0 = today, 1..MAX_DAY = future

// Monday 27 April 2026 is Day 1 of the 10-day academic cycle (mock reference point)
const CYCLE_REF = new Date(2026, 3, 27)

function getAcademicDay(date: Date): number {
  const ref = new Date(CYCLE_REF); ref.setHours(0, 0, 0, 0)
  const tgt = new Date(date);      tgt.setHours(0, 0, 0, 0)
  let schoolDays = 0
  const cur = new Date(ref)
  if (tgt >= ref) {
    while (cur < tgt) { cur.setDate(cur.getDate() + 1); const d = cur.getDay(); if (d !== 0 && d !== 6) schoolDays++ }
  } else {
    while (cur > tgt) { cur.setDate(cur.getDate() - 1); const d = cur.getDay(); if (d !== 0 && d !== 6) schoolDays-- }
  }
  return ((schoolDays % 10) + 10) % 10 + 1
}

function getSchoolDay(schoolDayIndex: number): Date {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  let added = 0
  while (added < schoolDayIndex) {
    date.setDate(date.getDate() + 1)
    const dow = date.getDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return date
}

// ─── TaskDetailModal ──────────────────────────────────────────────────────────

const TaskDetailModal: React.FC<{ task: LearningTaskDetail; taskId: string; onClose: () => void }> = ({ task, taskId, onClose }) => {
  const navigate = useNavigate()
  return (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={onClose}
    style={{
      position: 'fixed', inset: 0, zIndex: 80,
      background: 'rgba(0,0,0,0.82)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '80px 2rem 2rem',
    }}
  >
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      onClick={(e) => e.stopPropagation()}
      style={{
        background: 'var(--color-modal-bg)',
        border: `1px solid ${task.completed ? 'rgba(100,220,100,0.35)' : 'rgba(255,160,0,0.4)'}`,
        width: '100%', maxWidth: '700px', maxHeight: '100%',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem',
        padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,215,0,0.1)', flexShrink: 0,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <span style={{ ...VT, fontSize: '0.8rem', letterSpacing: '2px', padding: '1px 8px', border: `1px solid ${task.completed ? 'rgba(100,220,100,0.5)' : 'rgba(255,160,0,0.5)'}`, color: task.completed ? 'rgba(100,220,100,0.9)' : 'rgba(255,160,0,0.9)' }}>
              {task.completed ? '✓ SUBMITTED' : '● PENDING'}
            </span>
            <span style={{ ...VT, fontSize: '0.85rem', letterSpacing: '1px', color: 'rgba(255,215,0,0.35)' }}>{task.subject}</span>
          </div>
          <h2 style={{ ...VT, margin: 0, fontSize: '1.5rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.9)' }}>{task.title}</h2>
        </div>
        <button
          onClick={onClose}
          style={{ ...VT, fontSize: '1rem', letterSpacing: '2px', background: 'transparent', border: '1px solid rgba(255,215,0,0.3)', color: 'rgba(255,215,0,0.6)', cursor: 'pointer', padding: '0.2rem 0.9rem', flexShrink: 0, transition: 'border-color 0.12s, color 0.12s' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.8)'; e.currentTarget.style.color = 'rgba(255,215,0,1)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.color = 'rgba(255,215,0,0.6)' }}
        >✕ CLOSE</button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Description */}
        <p style={{ ...VT, margin: 0, fontSize: '1.05rem', letterSpacing: '0.5px', color: 'rgba(255,215,0,0.75)', lineHeight: 1.6 }}>
          {task.description}
        </p>

        {/* Instructions */}
        <div>
          <p style={{ ...VT, margin: '0 0 0.5rem', fontSize: '0.8rem', letterSpacing: '3px', color: 'rgba(255,215,0,0.35)' }}>INSTRUCTIONS</p>
          <ol style={{ margin: 0, paddingLeft: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {task.instructions.map((step, i) => (
              <li key={i} style={{ ...VT, fontSize: '1rem', letterSpacing: '0.5px', color: 'rgba(255,215,0,0.7)', lineHeight: 1.5 }}>
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', gap: '2rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,215,0,0.1)' }}>
          <div>
            <p style={{ ...VT, margin: '0 0 0.2rem', fontSize: '0.75rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.3)' }}>SUBMISSION</p>
            <p style={{ ...VT, margin: 0, fontSize: '1rem', color: 'rgba(255,215,0,0.7)' }}>{task.submissionType}</p>
          </div>
          <div>
            <p style={{ ...VT, margin: '0 0 0.2rem', fontSize: '0.75rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.3)' }}>TOTAL MARKS</p>
            <p style={{ ...VT, margin: 0, fontSize: '1rem', color: 'rgba(255,215,0,0.7)' }}>{task.totalMarks}</p>
          </div>
        </div>

        {/* Hand-in button */}
        {!task.completed && (
          <button
            onClick={() => navigate(`/submit/${taskId}`)}
            style={{
              ...VT, fontSize: '1.1rem', letterSpacing: '3px',
              padding: '0.55rem 2rem', alignSelf: 'flex-end',
              background: 'rgba(255,160,0,0.12)',
              border: '1px solid rgba(255,160,0,0.55)',
              color: 'rgba(255,160,0,0.95)',
              cursor: 'pointer',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,160,0,0.22)'; e.currentTarget.style.borderColor = 'rgba(255,160,0,0.9)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,160,0,0.12)'; e.currentTarget.style.borderColor = 'rgba(255,160,0,0.55)' }}
          >
            ▶ HAND IN ASSIGNMENT
          </button>
        )}
      </div>
    </motion.div>
  </motion.div>
  )
}

// ─── TimetableContent ─────────────────────────────────────────────────────────

const TimetableContent: React.FC = () => {
  const [dayIndex, setDayIndex] = useState(0)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const date        = getSchoolDay(dayIndex)
  const dayName     = WEEKDAYS[date.getDay()]
  const dateStr     = `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
  const academicDay = getAcademicDay(date)
  const isToday     = dayIndex === 0

  const periods = isToday
    ? mockAttendance.timetable
    : mockFutureTimetables[dayIndex - 1].map(e => ({ ...e, status: 'upcoming' as const }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

      {/* Day navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <button
          onClick={() => setDayIndex(d => d - 1)}
          disabled={dayIndex === 0}
          style={{
            ...VT, fontSize: '1.4rem', background: 'transparent', border: 'none',
            color: dayIndex === 0 ? 'rgba(255,215,0,0.15)' : 'rgba(255,215,0,0.6)',
            cursor: dayIndex === 0 ? 'default' : 'pointer',
            padding: '0 0.5rem', lineHeight: 1,
            transition: 'color 0.12s',
          }}
          onMouseEnter={(e) => { if (dayIndex > 0) e.currentTarget.style.color = 'rgba(255,215,0,1)' }}
          onMouseLeave={(e) => { if (dayIndex > 0) e.currentTarget.style.color = 'rgba(255,215,0,0.6)' }}
        >
          ◀
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ ...VT, fontSize: '1.8rem', letterSpacing: '4px', color: 'rgba(255,215,0,1)', textShadow: '1px 1px 0 rgba(0,0,0,0.8)' }}>
            {isToday ? `TODAY · ${dayName}` : dayName}
          </div>
          <div style={{ ...VT, fontSize: '1.1rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.65)', textShadow: '1px 1px 0 rgba(0,0,0,0.7)' }}>
            {dateStr}
            <span style={{ marginLeft: '0.75rem', color: 'rgba(255,215,0,0.85)', letterSpacing: '1px' }}>
              · DAY {academicDay}
            </span>
          </div>
        </div>

        <button
          onClick={() => setDayIndex(d => d + 1)}
          disabled={dayIndex === MAX_DAY}
          style={{
            ...VT, fontSize: '1.4rem', background: 'transparent', border: 'none',
            color: dayIndex === MAX_DAY ? 'rgba(255,215,0,0.15)' : 'rgba(255,215,0,0.6)',
            cursor: dayIndex === MAX_DAY ? 'default' : 'pointer',
            padding: '0 0.5rem', lineHeight: 1,
            transition: 'color 0.12s',
          }}
          onMouseEnter={(e) => { if (dayIndex < MAX_DAY) e.currentTarget.style.color = 'rgba(255,215,0,1)' }}
          onMouseLeave={(e) => { if (dayIndex < MAX_DAY) e.currentTarget.style.color = 'rgba(255,215,0,0.6)' }}
        >
          ▶
        </button>
      </div>

      {/* Divider */}
      <div style={{ borderBottom: '1px solid rgba(255,215,0,0.12)', marginBottom: '0.25rem' }} />

      {/* Column headers */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 0.6rem 0.3rem', borderBottom: '1px solid rgba(255,215,0,0.1)', ...VT }}>
        <span style={{ width: '18px', fontSize: '0.9rem', color: 'rgba(255,215,0,0.5)', flexShrink: 0 }}>#</span>
        <span style={{ width: '115px', fontSize: '0.9rem', color: 'rgba(255,215,0,0.5)', flexShrink: 0 }}>TIME</span>
        <span style={{ flex: 1, fontSize: '0.9rem', color: 'rgba(255,215,0,0.5)' }}>SUBJECT</span>
        <span style={{ width: '150px', fontSize: '0.9rem', color: 'rgba(255,215,0,0.5)', flexShrink: 0 }}>TEACHER</span>
        <span style={{ width: '180px', fontSize: '0.9rem', color: 'rgba(255,215,0,0.5)', textAlign: 'right', flexShrink: 0 }}>ASSESSMENT DUE</span>
      </div>

      {/* Period rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {periods.map((p) => {
          const entry      = mockAssessmentSchedule[`${academicDay}-${p.period}`]
          const task       = entry ? mockLearningTaskDetails[entry.taskId] : null
          const clickable  = !!task && !task.completed
          return (
            <div
              key={p.period}
              onClick={() => { if (clickable) setSelectedTaskId(entry!.taskId) }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.35rem 0.6rem',
                background: entry
                  ? 'rgba(255,180,0,0.06)'
                  : p.status === 'current' ? 'rgba(255,215,0,0.07)' : 'rgba(255,255,255,0.02)',
                border: entry
                  ? '1px solid rgba(255,160,0,0.3)'
                  : p.status === 'current' ? '1px solid rgba(255,215,0,0.28)' : '1px solid transparent',
                opacity: p.status === 'done' ? 0.4 : 1,
                cursor: clickable ? 'pointer' : 'default',
                transition: 'background 0.12s',
                ...VT,
              }}
              onMouseEnter={(e) => { if (clickable) e.currentTarget.style.background = 'rgba(255,180,0,0.13)' }}
              onMouseLeave={(e) => { if (clickable) e.currentTarget.style.background = 'rgba(255,180,0,0.06)' }}
            >
              <span style={{ width: '18px', fontSize: '1rem', color: 'rgba(255,215,0,0.5)', textAlign: 'center', flexShrink: 0 }}>
                {p.status === 'done' ? '✓' : p.status === 'current' ? '▶' : `${p.period}`}
              </span>
              <span style={{ width: '115px', fontSize: '0.95rem', color: 'rgba(255,215,0,0.45)', letterSpacing: '0.5px', flexShrink: 0 }}>
                {p.time}
              </span>
              <span style={{ flex: 1, fontSize: '1.1rem', letterSpacing: '1px', color: p.status === 'current' ? 'rgba(255,215,0,0.95)' : 'rgba(255,215,0,0.75)' }}>
                {p.subject}
              </span>
              <span style={{ width: '150px', fontSize: '0.9rem', color: 'rgba(255,215,0,0.4)', letterSpacing: '0.5px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.teacher}
              </span>
              <span style={{ width: '180px', fontSize: '0.9rem', letterSpacing: '0.5px', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                color: entry ? (task?.completed ? 'rgba(100,220,100,0.8)' : 'rgba(255,160,0,0.9)') : 'transparent' }}>
                {entry ? `${task?.completed ? '✓' : '★'} ${entry.label}` : '·'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Task detail modal */}
      <AnimatePresence>
        {selectedTaskId && mockLearningTaskDetails[selectedTaskId] && (
          <TaskDetailModal
            task={mockLearningTaskDetails[selectedTaskId]}
            taskId={selectedTaskId}
            onClose={() => setSelectedTaskId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── ChatContent (includes roster strip at top) ───────────────────────────────

const ChatContent: React.FC = () => {
  const [input, setInput] = useState('')
  const presentCount = mockAttendance.roster.filter(l => l.present).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0' }}>

      {/* Roster strip */}
      <div style={{ flexShrink: 0, paddingBottom: '0.75rem', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,215,0,0.1)' }}>
        <p style={{ ...VT, fontSize: '0.75rem', letterSpacing: '3px', color: 'rgba(255,215,0,0.35)', margin: '0 0 0.5rem' }}>
          {presentCount} OF {mockAttendance.roster.length} PRESENT
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.25rem 0.5rem' }}>
          {mockAttendance.roster.map((l) => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                background: l.present ? 'rgba(100,220,100,0.8)' : 'rgba(220,80,80,0.55)',
              }} />
              <span style={{
                ...VT, fontSize: '0.95rem', letterSpacing: '0.5px',
                color: l.present ? 'rgba(255,215,0,0.75)' : 'rgba(255,215,0,0.25)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {l.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable message list */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: 0 }}>
        {mockAttendance.chat.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex', flexDirection: 'column', gap: '2px',
              padding: '0.4rem 0.6rem',
              background: msg.isTeacher ? 'rgba(255,215,0,0.06)' : 'rgba(255,255,255,0.03)',
              borderLeft: msg.isTeacher ? '2px solid rgba(255,215,0,0.4)' : '2px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline' }}>
              <span style={{ ...VT, fontSize: '1rem', letterSpacing: '1px', color: msg.isTeacher ? 'rgba(255,215,0,0.85)' : 'rgba(255,215,0,0.55)' }}>
                {msg.author}
              </span>
              <span style={{ ...VT, fontSize: '0.8rem', color: 'rgba(255,215,0,0.25)' }}>{msg.time}</span>
            </div>
            <p style={{ ...VT, margin: 0, fontSize: '1.05rem', letterSpacing: '0.5px', color: 'rgba(255,215,0,0.7)' }}>
              {msg.message}
            </p>
          </div>
        ))}
      </div>

      {/* Input pinned at bottom */}
      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, paddingTop: '0.75rem' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Send a message..."
          style={{
            flex: 1, ...VT, fontSize: '1rem', letterSpacing: '1px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,215,0,0.25)',
            color: 'rgba(255,215,0,0.8)',
            padding: '0.3rem 0.6rem',
            outline: 'none',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.6)' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.25)' }}
        />
        <button
          style={{
            ...VT, fontSize: '1rem', letterSpacing: '1px',
            background: 'rgba(255,215,0,0.1)',
            border: '1px solid rgba(255,215,0,0.35)',
            color: 'rgba(255,215,0,0.8)',
            padding: '0.3rem 1rem', cursor: 'pointer',
            transition: 'background 0.12s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,215,0,0.2)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,215,0,0.1)' }}
        >
          SEND
        </button>
      </div>
    </div>
  )
}

// ─── AttendenceUI [The Tavern] ────────────────────────────────────────────────

export const AttendenceUI: React.FC = () => {
  const navigate = useNavigate()
  const { isTimetableOpen, isChatOpen, toggleSection } = useEntryStore()
  const { currentTheme } = useThemeStore()
  const vocab = useThemeVocab()
  const [checkedIn, setCheckedIn] = useState(mockAttendance.checkedInToday)
  const [pageAssets, setPageAssets] = useState<Record<string, string>>({})

  const { data: announcementsData } = useQuery<{ myAnnouncements: Announcement[] }>(MY_ANNOUNCEMENTS, { pollInterval: 30000 })
  const announcements = announcementsData?.myAnnouncements ?? []

  useEffect(() => {
    const files = [
      'checkin_frame.png',
      'btn_checkin.png',
      'noticeboard_bar.png',
      'section_bar.png',
      'overlay_panel.png',
      'icon_noticeboard.png',
      'icon_timetable.png',
      'icon_chat.png',
    ]
    files.forEach(file => {
      const url = `/assets/themes/${currentTheme}/attendence/${file}`
      const img = new Image()
      img.onload = () => setPageAssets(prev => ({ ...prev, [file]: url }))
      img.src = url
    })
  }, [currentTheme])
  usePageBackground('attendence')

  const currentPeriod    = mockAttendance.timetable.find(p => p.status === 'current')
  const presentCount     = mockAttendance.roster.filter(l => l.present).length
  const latestMessage    = mockAttendance.chat[mockAttendance.chat.length - 1]
  const todayAcademicDay = getAcademicDay(new Date())

  return (
    <div className="theatrical-container" style={{ alignItems: 'flex-start', overflowY: 'auto' }}>
      <SpriteManager anchor="background" page="attendence" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="safe-zone"
        style={{ marginTop: '72px', marginBottom: '2rem', maxWidth: '860px', gap: '0.75rem' }}
      >
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          style={{ textAlign: 'center', width: '100%', marginBottom: '0.5rem' }}
        >
          <p style={{ ...VT, fontSize: '0.8rem', letterSpacing: '5px', color: 'rgba(255,215,0,0.4)', margin: '0 0 0.2rem' }}>
            ◆ ─────── ◆
          </p>
          <h1 style={{ ...VT, fontSize: '2rem', letterSpacing: '4px', color: 'rgba(255,215,0,0.9)', margin: 0, textShadow: '1px 1px 0 rgba(0,0,0,0.6)' }}>
            {vocab.attendancePageTitle}
          </h1>
          <p style={{ ...VT, fontSize: '0.85rem', letterSpacing: '3px', color: 'rgba(255,215,0,0.35)', margin: '0.2rem 0 0' }}>
            ATTENDANCE · DAILY REGISTER
          </p>
        </motion.div>

        {/* Check-in section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            ...(pageAssets['checkin_frame.png']
              ? { backgroundImage: `url('${pageAssets['checkin_frame.png']}')`, backgroundSize: '100% 100%', imageRendering: 'pixelated' }
              : { background: 'var(--color-pane-bg, rgba(0,0,0,0.5))' }),
            border: checkedIn ? '1px solid rgba(100,220,100,0.4)' : '1px solid rgba(255,215,0,0.3)',
            padding: '0.85rem 1.25rem',
            width: '100%',
          }}
        >
          <div>
            <p style={{ ...VT, margin: 0, fontSize: '1.4rem', letterSpacing: '2px', color: checkedIn ? 'rgba(100,220,100,0.9)' : 'rgba(255,215,0,0.9)' }}>
              {checkedIn ? `✓ ${vocab.attendanceCheckedInLabel}` : vocab.attendanceCheckInLabel}
            </p>
            <p style={{ ...VT, margin: '0.2rem 0 0', fontSize: '0.9rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.4)' }}>
              {checkedIn
                ? `★ ${mockAttendance.streakDays + 1}-DAY STREAK · KEEP IT GOING`
                : `${mockAttendance.streakDays}-DAY STREAK · CHECK IN TO CONTINUE`}
            </p>
          </div>

          {!checkedIn && (
            <button
              onClick={() => setCheckedIn(true)}
              style={{
                ...VT, fontSize: '1.2rem', letterSpacing: '2px',
                padding: '0.4rem 1.5rem',
                ...(pageAssets['btn_checkin.png']
                  ? { backgroundImage: `url('${pageAssets['btn_checkin.png']}')`, backgroundSize: '100% 100%', imageRendering: 'pixelated', border: 'none' }
                  : { background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.5)' }),
                color: 'rgba(255,215,0,0.9)',
                cursor: 'pointer',
                transition: 'filter 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.2)' }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)' }}
            >
              ▶ CHECK IN
            </button>
          )}
        </motion.div>

        {/* Teacher Alert Ticker */}
        <TeacherTicker
          announcements={announcements}
          barBg={pageAssets['noticeboard_bar.png']}
          barIcon={pageAssets['icon_noticeboard.png']}
        />

        {/* Today's Timetable */}
        <SmartContainer
          title="TIMETABLE"
          preview={currentPeriod ? `NOW: ${currentPeriod.subject}` : undefined}
          isOpen={isTimetableOpen}
          onToggle={() => toggleSection('timetable')}
          barBg={pageAssets['section_bar.png']}
          panelBg={pageAssets['overlay_panel.png']}
          barIcon={pageAssets['icon_timetable.png']}
        >
          <TimetableContent />
        </SmartContainer>

        {/* Class Chat + Roster */}
        <SmartContainer
          title="CLASS CHAT"
          preview={`${presentCount}/${mockAttendance.roster.length} PRESENT · ${latestMessage.author}: ${latestMessage.message.slice(0, 32)}…`}
          isOpen={isChatOpen}
          onToggle={() => toggleSection('chat')}
          barBg={pageAssets['section_bar.png']}
          panelBg={pageAssets['overlay_panel.png']}
          barIcon={pageAssets['icon_chat.png']}
        >
          <ChatContent />
        </SmartContainer>

        {/* Go to Lesson */}
        <div
          onClick={() => navigate('/learningtask')}
          style={{
            height: '52px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', padding: '0 1rem',
            ...(pageAssets['section_bar.png']
              ? { backgroundImage: `url('${pageAssets['section_bar.png']}')`, backgroundSize: '100% 100%', imageRendering: 'pixelated' }
              : { background: 'var(--color-pane-bg, rgba(0,0,0,0.45))' }),
            border: '1px solid rgba(255,215,0,0.2)',
            cursor: 'pointer', width: '100%', ...VT,
            transition: 'border-color 0.12s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.5)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.2)' }}
        >
          <span style={{ fontSize: '1.3rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.85)' }}>GO TO NEXT LESSON</span>
          <span style={{ fontSize: '1.1rem', color: 'rgba(255,215,0,0.45)' }}>▶</span>
        </div>

        {/* Return */}
        <button
          onClick={() => navigate('/home')}
          style={{
            ...VT, fontSize: '1.1rem', letterSpacing: '2px',
            padding: '0.5rem 2rem', background: 'transparent',
            border: '1px solid rgba(255,215,0,0.35)',
            color: 'rgba(255,215,0,0.6)', cursor: 'pointer',
            alignSelf: 'center', marginTop: '0.5rem',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.8)'; e.currentTarget.style.color = 'rgba(255,215,0,1)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.35)'; e.currentTarget.style.color = 'rgba(255,215,0,0.6)' }}
        >
          ◂ {vocab.attendanceReturnLabel}
        </button>
      </motion.div>
    </div>
  )
}
