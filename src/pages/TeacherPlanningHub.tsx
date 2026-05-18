import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, gql } from '@apollo/client'
import {
  TEACHER_CLASSES, CYCLE_TIMETABLE, YEAR_PLANS,
  classById, type TimetableSlot, type LearningTaskPlan, type YearPlan,
} from '@/mockPlanningData'

const MY_TASKS_PLANNING = gql`
  query MyTasksPlanning {
    myTasks {
      id title subject grade templateType published stepLabels
    }
  }
`

interface PlanningTask {
  id: string
  title: string
  subject: string
  grade: string
  templateType: string
  published: boolean
  stepLabels: string[]
}

const VT: React.CSSProperties = { fontFamily: "'VT323', monospace" }
const GOLD = '#FFD700'

// ─── Shared ───────────────────────────────────────────────────────────────────

function hex(color: string, alpha: number) {
  // convert #rrggbb to rgba
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

const ASSESSMENT_COLOR: Record<string, string> = {
  Practical: '#4ade80',
  Test:      '#60a5fa',
  Project:   '#fb923c',
  Exam:      '#f43f5e',
  PAT:       '#e879f9',
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

const TABS = ['TIMETABLE', 'TERM PLAN', 'YEAR PLAN'] as const
type Tab = typeof TABS[number]

const TabBar: React.FC<{ active: Tab; onChange: (t: Tab) => void }> = ({ active, onChange }) => (
  <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,215,0,0.2)' }}>
    {TABS.map(tab => (
      <button
        key={tab}
        onClick={() => onChange(tab)}
        style={{
          ...VT, flex: 1,
          fontSize: '0.95rem', letterSpacing: '2px',
          padding: '0.5rem 0',
          background: active === tab ? 'rgba(255,215,0,0.1)' : 'transparent',
          border: 'none',
          borderBottom: `2px solid ${active === tab ? GOLD : 'transparent'}`,
          color: active === tab ? GOLD : 'rgba(255,215,0,0.4)',
          cursor: 'pointer',
          transition: 'color 0.15s, border-color 0.15s, background 0.15s',
        }}
      >
        {tab}
      </button>
    ))}
  </div>
)

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — TIMETABLE
// ═══════════════════════════════════════════════════════════════════════════════

const DAY_LABELS = ['', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'MON', 'TUE', 'WED', 'THU', 'FRI']
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

function currentCycleDay(): number {
  const d = new Date().getDay()
  return d === 0 || d === 6 ? 1 : d  // weekend → Day 1; weekdays 1–5 as-is
}

// Returns the calendar Date for a given cycle day (1–10).
// Cycle days 1–5 = Mon–Fri of the current week.
// Cycle days 6–10 = Mon–Fri of the following week.
function cycleDayDate(cycleDay: number): Date {
  const today = new Date()
  const dow = today.getDay()                          // 0=Sun … 6=Sat
  const daysToMon = dow === 0 ? -6 : 1 - dow         // offset to reach Monday
  const monday = new Date(today)
  monday.setDate(today.getDate() + daysToMon)
  const weekOffset = cycleDay <= 5 ? 0 : 7
  const dayOffset  = cycleDay <= 5 ? cycleDay - 1 : cycleDay - 6
  const result = new Date(monday)
  result.setDate(monday.getDate() + weekOffset + dayOffset)
  return result
}

function fmtDate(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

const TimetableSlotRow: React.FC<{ slot: TimetableSlot; onOpen: () => void }> = ({ slot, onOpen }) => {
  const cls = classById(slot.classId)
  const color = cls?.color ?? GOLD
  const isMock = slot.classId.startsWith('mock-')
  const stepLabel = slot.periodsForStep > 1
    ? `STEP ${slot.step}  ·  ${slot.periodInStep}/${slot.periodsForStep}`
    : `STEP ${slot.step}`

  return (
    <div style={{
      ...VT,
      display: 'flex', alignItems: 'center', gap: '0.6rem',
      padding: '0.45rem 0.65rem',
      background: hex(color, 0.07),
      border: `1px solid ${hex(color, 0.3)}`,
      borderLeft: `3px solid ${color}`,
      borderRadius: '2px',
    }}>
      {/* Period */}
      <span style={{ fontSize: '0.85rem', letterSpacing: '1px', color, flexShrink: 0, width: '18px' }}>
        P{slot.period}
      </span>
      {/* Class */}
      <span style={{ fontSize: '0.9rem', letterSpacing: '1px', color, flexShrink: 0, width: '52px' }}>
        {cls?.shortName ?? slot.classId}
      </span>
      {/* Task + step */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: '0.82rem', letterSpacing: '1px', color: 'rgba(255,255,255,0.5)' }}>
          T{slot.taskNumber} · {stepLabel} · {slot.taskTopic}
        </span>
      </div>
      {/* Time */}
      <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{slot.time}</span>
      {/* Open */}
      <button
        onClick={onOpen}
        disabled={isMock}
        style={{
          ...VT, flexShrink: 0,
          fontSize: '0.9rem', padding: '0.1rem 0.45rem',
          background: 'transparent',
          border: `1px solid ${isMock ? 'rgba(255,255,255,0.1)' : hex(color, 0.5)}`,
          color: isMock ? 'rgba(255,255,255,0.2)' : color,
          cursor: isMock ? 'default' : 'pointer',
        }}
      >→</button>
    </div>
  )
}

const TimetableTab: React.FC = () => {
  const navigate = useNavigate()
  const [day, setDay] = useState(currentCycleDay)
  const [week, setWeek] = useState(currentCycleDay() <= 5 ? 0 : 1)
  const slots = CYCLE_TIMETABLE[day] ?? []
  const sorted = [...slots].sort((a, b) => a.period - b.period)
  const weekDays = week === 0 ? [1,2,3,4,5] : [6,7,8,9,10]
  const weekStart = fmtDate(cycleDayDate(weekDays[0]))
  const weekEnd   = fmtDate(cycleDayDate(weekDays[4]))

  // Class legend
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem' }}>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {TEACHER_CLASSES.map(c => (
          <span key={c.id} style={{
            ...VT, fontSize: '0.8rem', letterSpacing: '1px',
            padding: '0.1rem 0.5rem',
            background: hex(c.color, 0.12),
            border: `1px solid ${hex(c.color, 0.4)}`,
            color: c.color,
            borderRadius: '2px',
          }}>
            {c.shortName}
          </span>
        ))}
      </div>

      {/* Cycle day navigation — single-row with week arrow navigation */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: '0.3rem' }}>

        {/* Prev week arrow — only shown on week 2 */}
        {week === 1 ? (
          <button
            onClick={() => { setWeek(0); setDay(1) }}
            style={{ ...VT, background: 'transparent', border: 'none', color: 'rgba(255,215,0,0.5)', fontSize: '1.1rem', cursor: 'pointer', padding: '0 0.1rem' }}
          >◂</button>
        ) : (
          <div style={{ width: '18px', flexShrink: 0 }} />
        )}

        {/* Week label */}
        <div style={{
          ...VT, fontSize: '0.68rem', letterSpacing: '1px',
          color: 'rgba(255,215,0,0.4)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          alignItems: 'center', minWidth: '40px', flexShrink: 0,
        }}>
          <span>WEEK</span>
          <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', whiteSpace: 'nowrap' }}>
            {weekStart}
          </span>
          <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', whiteSpace: 'nowrap' }}>
            {weekEnd}
          </span>
        </div>

        {/* Day buttons */}
        {weekDays.map(d => {
          const date    = cycleDayDate(d)
          const isToday = fmtDate(date) === fmtDate(new Date())
          const active  = day === d
          return (
            <button
              key={d}
              onClick={() => setDay(d)}
              style={{
                ...VT, flex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '0.25rem 0.1rem',
                background: active ? 'rgba(255,215,0,0.15)' : isToday ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: `1px solid ${active ? 'rgba(255,215,0,0.55)' : isToday ? 'rgba(255,255,255,0.18)' : 'rgba(255,215,0,0.1)'}`,
                borderRadius: '2px',
                cursor: 'pointer',
                gap: '1px',
              }}
              title={`Day ${d} · ${DAY_LABELS[d]} · ${fmtDate(date)}`}
            >
              <span style={{ fontSize: '0.7rem', letterSpacing: '1px', color: active ? GOLD : 'rgba(255,215,0,0.4)' }}>
                {DAY_LABELS[d]}
              </span>
              <span style={{ fontSize: '0.85rem', color: active ? GOLD : isToday ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)' }}>
                {date.getDate()}
              </span>
              <span style={{ fontSize: '0.6rem', color: active ? 'rgba(255,215,0,0.55)' : 'rgba(255,255,255,0.18)', letterSpacing: '0.5px' }}>
                D{d}
              </span>
            </button>
          )
        })}

        {/* Next week arrow — only shown on week 1 */}
        {week === 0 ? (
          <button
            onClick={() => { setWeek(1); setDay(6) }}
            style={{ ...VT, background: 'transparent', border: 'none', color: 'rgba(255,215,0,0.5)', fontSize: '1.1rem', cursor: 'pointer', padding: '0 0.1rem' }}
          >▸</button>
        ) : (
          <div style={{ width: '18px', flexShrink: 0 }} />
        )}

      </div>

      {/* Slots */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {sorted.length === 0 ? (
          <div style={{ ...VT, fontSize: '0.95rem', color: 'rgba(255,215,0,0.25)', textAlign: 'center', padding: '0.75rem 0' }}>
            No classes on this cycle day.
          </div>
        ) : sorted.map(s => (
          <TimetableSlotRow
            key={`${s.classId}-${s.period}`}
            slot={s}
            onOpen={() => navigate(`/teacherDashboard?classId=${s.classId}`)}
          />
        ))}
      </div>

    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — TERM PLAN
// ═══════════════════════════════════════════════════════════════════════════════

const TaskCard: React.FC<{ task: LearningTaskPlan; color: string }> = ({ task, color }) => {
  const [expanded, setExpanded] = useState(false)
  const totalPeriods = task.steps.reduce((s, st) => s + st.periodsAllocated, 0)

  return (
    <div style={{
      border: `1px solid ${hex(color, 0.3)}`,
      borderLeft: `3px solid ${color}`,
      borderRadius: '2px',
      background: hex(color, 0.05),
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          ...VT, display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.55rem 0.75rem', cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: '0.95rem', letterSpacing: '1px', color, flexShrink: 0 }}>
          TASK {task.taskNumber}
        </span>
        <span style={{ flex: 1, fontSize: '0.95rem', letterSpacing: '1px', color: 'rgba(255,255,255,0.8)' }}>
          {task.topic}
        </span>
        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
          {task.steps.length} steps · {totalPeriods}p
        </span>
        {task.assessment && (
          <span style={{
            fontSize: '0.78rem', letterSpacing: '1px', padding: '0.05rem 0.4rem',
            background: hex(ASSESSMENT_COLOR[task.assessment.type] ?? GOLD, 0.15),
            border: `1px solid ${hex(ASSESSMENT_COLOR[task.assessment.type] ?? GOLD, 0.4)}`,
            color: ASSESSMENT_COLOR[task.assessment.type] ?? GOLD,
            flexShrink: 0,
          }}>
            {task.assessment.type.toUpperCase()}
          </span>
        )}
        <span style={{ fontSize: '0.9rem', color: 'rgba(255,215,0,0.4)', flexShrink: 0 }}>
          {expanded ? '▾' : '▸'}
        </span>
      </div>

      {/* Steps */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ borderTop: `1px solid ${hex(color, 0.2)}` }}>
              {task.steps.map(st => (
                <div key={st.stepNum} style={{
                  ...VT, display: 'flex', gap: '0.6rem', alignItems: 'baseline',
                  padding: '0.35rem 0.75rem 0.35rem 1.25rem',
                  borderBottom: `1px solid ${hex(color, 0.08)}`,
                }}>
                  <span style={{ fontSize: '0.82rem', color, flexShrink: 0, width: '42px' }}>
                    STEP {st.stepNum}
                  </span>
                  <span style={{ flex: 1, fontSize: '0.82rem', letterSpacing: '1px', color: 'rgba(255,255,255,0.65)' }}>
                    {st.description}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                    {st.periodsAllocated}p
                  </span>
                </div>
              ))}
              {task.assessment && (
                <div style={{
                  ...VT, padding: '0.45rem 0.75rem',
                  background: hex(ASSESSMENT_COLOR[task.assessment.type] ?? GOLD, 0.07),
                  fontSize: '0.82rem', letterSpacing: '1px',
                  color: ASSESSMENT_COLOR[task.assessment.type] ?? GOLD,
                  display: 'flex', gap: '1rem',
                }}>
                  <span>⬥ ASSESSMENT: {task.assessment.type}</span>
                  <span>{task.assessment.marks} marks</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>{task.assessment.termWeight}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function taskToLearningTaskPlan(t: PlanningTask, index: number): LearningTaskPlan {
  return {
    taskNumber: index + 1,
    topic: t.title,
    startCycleDay: 1,
    steps: t.stepLabels.map((label, i) => ({
      stepNum: i + 1,
      description: label,
      periodsAllocated: 1,
    })),
  }
}

const TermPlanTab: React.FC = () => {
  const navigate = useNavigate()
  const { data, loading } = useQuery<{ myTasks: PlanningTask[] }>(MY_TASKS_PLANNING)

  const allTasks = data?.myTasks ?? []

  // Group tasks by grade (parsed as number for sorting)
  const grades = [...new Set(allTasks.map(t => parseInt(t.grade, 10)))].filter(g => !isNaN(g)).sort((a, b) => a - b)
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null)
  const effectiveGrade = selectedGrade ?? grades[0] ?? null

  const gradeTasks = allTasks
    .filter(t => parseInt(t.grade, 10) === effectiveGrade)
    .sort((a, b) => a.title.localeCompare(b.title))

  const subject = gradeTasks[0]?.subject ?? ''
  const gradeColor = TEACHER_CLASSES.find(c => c.grade === effectiveGrade)?.color ?? GOLD

  const plans = gradeTasks.map((t, i) => taskToLearningTaskPlan(t, i))

  if (loading) return (
    <div style={{ ...VT, padding: '1.5rem', textAlign: 'center', color: 'rgba(255,215,0,0.35)', letterSpacing: '2px' }}>
      LOADING TASKS…
    </div>
  )

  if (allTasks.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem' }}>
      <div style={{ ...VT, fontSize: '0.9rem', color: 'rgba(255,215,0,0.3)', letterSpacing: '1px' }}>
        No tasks found. Create your first task to build a term plan.
      </div>
      <button
        onClick={() => navigate('/task-creator')}
        style={{
          ...VT, fontSize: '0.9rem', letterSpacing: '2px', padding: '0.55rem 0.75rem',
          background: 'transparent', border: '1px dashed rgba(255,215,0,0.3)',
          borderRadius: '2px', color: 'rgba(255,215,0,0.45)', cursor: 'pointer', textAlign: 'left',
        }}
      >+ CREATE NEW TASK</button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem' }}>

      {/* Grade selector */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
        {grades.map(g => (
          <button
            key={g}
            onClick={() => setSelectedGrade(g)}
            style={{
              ...VT, fontSize: '0.9rem', letterSpacing: '1px',
              padding: '0.2rem 0.75rem',
              background: effectiveGrade === g ? 'rgba(255,215,0,0.15)' : 'transparent',
              border: `1px solid ${effectiveGrade === g ? GOLD : 'rgba(255,215,0,0.25)'}`,
              color: effectiveGrade === g ? GOLD : 'rgba(255,215,0,0.45)',
              cursor: 'pointer', borderRadius: '2px',
            }}
          >
            GR {g}
          </button>
        ))}
      </div>

      {/* Grade / subject header */}
      {effectiveGrade !== null && (
        <div style={{
          ...VT,
          padding: '0.5rem 0.75rem',
          background: hex(gradeColor, 0.1),
          border: `1px solid ${hex(gradeColor, 0.4)}`,
          borderLeft: `3px solid ${gradeColor}`,
          borderRadius: '2px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '1rem', letterSpacing: '2px', color: gradeColor }}>
            GRADE {effectiveGrade} · {subject.toUpperCase()}
          </span>
          <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>
            {gradeTasks.length} task{gradeTasks.length !== 1 ? 's' : ''}
            {' · '}
            {gradeTasks.filter(t => t.published).length} published
          </span>
        </div>
      )}

      {/* Task cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {plans.map((plan, i) => {
          const live = gradeTasks[i]
          return (
            <div key={live.id} style={{ position: 'relative' }}>
              <TaskCard task={plan} color={gradeColor} />
              {/* Published/draft badge + edit button overlaid on the card header */}
              <div style={{
                position: 'absolute', top: '0.45rem', right: '2.5rem',
                display: 'flex', gap: '0.35rem', alignItems: 'center',
              }}>
                <span style={{
                  ...VT, fontSize: '0.68rem', letterSpacing: '1px',
                  padding: '0.05rem 0.35rem',
                  background: live.published ? 'rgba(74,222,128,0.15)' : 'rgba(255,215,0,0.08)',
                  border: `1px solid ${live.published ? 'rgba(74,222,128,0.4)' : 'rgba(255,215,0,0.2)'}`,
                  color: live.published ? '#4ade80' : 'rgba(255,215,0,0.45)',
                }}>
                  {live.published ? 'PUBLISHED' : 'DRAFT'}
                </span>
                <button
                  onClick={() => navigate(`/task-creator/${live.id}`)}
                  style={{
                    ...VT, fontSize: '0.75rem', padding: '0.05rem 0.4rem',
                    background: 'transparent',
                    border: `1px solid ${hex(gradeColor, 0.35)}`,
                    color: gradeColor, cursor: 'pointer',
                  }}
                >EDIT</button>
              </div>
            </div>
          )
        })}
        <button
          onClick={() => navigate('/task-creator')}
          style={{
            ...VT, fontSize: '0.9rem', letterSpacing: '2px', padding: '0.55rem 0.75rem',
            background: 'transparent', border: '1px dashed rgba(255,215,0,0.3)',
            borderRadius: '2px', color: 'rgba(255,215,0,0.45)', cursor: 'pointer', textAlign: 'left',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,215,0,0.06)'
            e.currentTarget.style.color = 'rgba(255,215,0,0.85)'
            e.currentTarget.style.borderColor = 'rgba(255,215,0,0.55)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'rgba(255,215,0,0.45)'
            e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'
          }}
        >
          + CREATE NEW TASK
        </button>
      </div>

    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — YEAR PLAN
// ═══════════════════════════════════════════════════════════════════════════════

const TERM_COLORS = ['#60a5fa', '#4ade80', '#fb923c', '#f43f5e']

const YearPlanTab: React.FC = () => {
  const grades = [...new Set(YEAR_PLANS.map(p => p.grade))].sort((a, b) => a - b)
  const [grade, setGrade] = useState(grades[0])
  const plan = YEAR_PLANS.find(p => p.grade === grade)

  if (!plan) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem' }}>

      {/* Grade selector */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {grades.map(g => (
          <button
            key={g}
            onClick={() => setGrade(g)}
            style={{
              ...VT, fontSize: '0.85rem', letterSpacing: '1px',
              padding: '0.2rem 0.65rem',
              background: grade === g ? 'rgba(255,215,0,0.15)' : 'transparent',
              border: `1px solid ${grade === g ? GOLD : 'rgba(255,215,0,0.25)'}`,
              color: grade === g ? GOLD : 'rgba(255,215,0,0.45)',
              cursor: 'pointer', borderRadius: '2px',
            }}
          >
            GR {g} · {plan.subject.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Year mark note */}
      <div style={{
        ...VT, fontSize: '0.8rem', letterSpacing: '1px',
        color: 'rgba(255,215,0,0.45)',
        padding: '0.4rem 0.65rem',
        background: 'rgba(255,215,0,0.05)',
        border: '1px solid rgba(255,215,0,0.15)',
        borderRadius: '2px',
      }}>
        {plan.yearMarkNote}
      </div>

      {/* Terms */}
      {plan.terms.map((term, i) => {
        const tColor = TERM_COLORS[i] ?? GOLD
        const totalMarks = term.assessments.reduce((s, a) => s + a.marks, 0)
        return (
          <div key={term.term} style={{
            border: `1px solid ${hex(tColor, 0.3)}`,
            borderLeft: `3px solid ${tColor}`,
            borderRadius: '2px',
            background: hex(tColor, 0.04),
            overflow: 'hidden',
          }}>
            {/* Term header */}
            <div style={{
              ...VT, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.5rem 0.75rem',
              background: hex(tColor, 0.1),
              borderBottom: `1px solid ${hex(tColor, 0.2)}`,
              flexWrap: 'wrap', gap: '0.4rem',
            }}>
              <span style={{ fontSize: '1rem', letterSpacing: '2px', color: tColor }}>
                TERM {term.term}
                {term.hasExam && <span style={{ fontSize: '0.75rem', marginLeft: '0.6rem', color: ASSESSMENT_COLOR.Exam }}>⬥ EXAM</span>}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>
                Year contribution: {term.yearContribution}%
              </span>
            </div>

            {/* Topics */}
            <div style={{ padding: '0.45rem 0.75rem', borderBottom: `1px solid ${hex(tColor, 0.12)}` }}>
              <div style={{ ...VT, fontSize: '0.78rem', letterSpacing: '1px', color: 'rgba(255,255,255,0.3)', marginBottom: '0.25rem' }}>
                TOPICS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                {term.topics.map((t, ti) => (
                  <div key={ti} style={{ ...VT, fontSize: '0.85rem', letterSpacing: '1px', color: 'rgba(255,255,255,0.7)', display: 'flex', gap: '0.4rem' }}>
                    <span style={{ color: tColor }}>▸</span> {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Assessments */}
            <div style={{ padding: '0.45rem 0.75rem' }}>
              <div style={{ ...VT, fontSize: '0.78rem', letterSpacing: '1px', color: 'rgba(255,255,255,0.3)', marginBottom: '0.25rem' }}>
                ASSESSMENTS · {totalMarks} total marks
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                {term.assessments.map((a, ai) => {
                  const aColor = ASSESSMENT_COLOR[a.type] ?? GOLD
                  return (
                    <div key={ai} style={{
                      ...VT, display: 'flex', gap: '0.5rem', alignItems: 'center',
                      fontSize: '0.82rem', letterSpacing: '1px', flexWrap: 'wrap',
                    }}>
                      <span style={{
                        padding: '0.05rem 0.35rem',
                        background: hex(aColor, 0.18),
                        border: `1px solid ${hex(aColor, 0.35)}`,
                        color: aColor, flexShrink: 0, fontSize: '0.75rem',
                      }}>{a.type.toUpperCase()}</span>
                      <span style={{ color: 'rgba(255,255,255,0.75)', flex: 1 }}>{a.name}</span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{a.marks}m</span>
                      <span style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{a.termContribution}%</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Notes */}
            {term.notes && (
              <div style={{
                ...VT, fontSize: '0.78rem', letterSpacing: '1px',
                color: 'rgba(255,255,255,0.35)', lineHeight: 1.5,
                padding: '0.35rem 0.75rem',
                borderTop: `1px solid ${hex(tColor, 0.12)}`,
              }}>
                {term.notes}
              </div>
            )}
          </div>
        )
      })}

    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main export
// ═══════════════════════════════════════════════════════════════════════════════

export const TeacherPlanningHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('TIMETABLE')
  const [open, setOpen] = useState(true)

  return (
    <div style={{ width: '100%' }}>

      {/* Section header */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          ...VT, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 0.75rem', height: '44px',
          background: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(255,215,0,0.2)',
          cursor: 'pointer', transition: 'border-color 0.12s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.5)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.2)' }}
      >
        <span style={{ fontSize: '1.15rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.85)' }}>PLANNING</span>
        <span style={{
          fontSize: '1rem', color: 'rgba(255,215,0,0.45)',
          display: 'inline-block',
          transform: open ? 'rotate(90deg)' : 'none',
          transition: 'transform 0.2s',
        }}>▶</span>
      </div>

      {/* Collapsible body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,215,0,0.12)',
              borderTop: 'none',
            }}>
              <TabBar active={activeTab} onChange={setActiveTab} />
              {activeTab === 'TIMETABLE' && <TimetableTab />}
              {activeTab === 'TERM PLAN' && <TermPlanTab />}
              {activeTab === 'YEAR PLAN' && <YearPlanTab />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
