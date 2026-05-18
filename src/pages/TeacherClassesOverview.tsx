import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, gql } from '@apollo/client'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { usePageBackground } from '@/hooks/usePageBackground'

const VT = { fontFamily: "'VT323', monospace" } as const
const GOLD = 'var(--color-accent, #FFD700)'
const GOLD_DIM = 'rgba(255,215,0,0.5)'
const BORDER = 'rgba(255,215,0,0.2)'
const GREEN = '#4ade80'

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const TEACHER_CLASSES = gql`
  query TeacherClassesOverview {
    teacherClasses {
      id name subject grade totalSteps
      activeTaskId activeTaskTitle activeTaskFormat activeTaskDueDate
    }
  }
`

const CLASS_PROGRESS = gql`
  query ClassProgressOverview($academicClassId: ID!) {
    classProgress(academicClassId: $academicClassId) {
      learnerId currentStep isLocked totalSteps
    }
  }
`

const MY_TASKS = gql`
  query MyTasksOverview {
    myTasks { id title subject published templateType totalTimeMin stepLabels }
  }
`

const ACTIVATE_TASK = gql`
  mutation ActivateTask($academicClassId: ID!, $taskId: ID!, $format: String!, $enabledSteps: [Int!]!, $dueDate: String!) {
    activateTask(academicClassId: $academicClassId, taskId: $taskId, format: $format, enabledSteps: $enabledSteps, dueDate: $dueDate)
  }
`

// ─── Types ───────────────────────────────────────────────────────────────────

interface AcademicClass {
  id: string
  name: string
  subject: string
  grade: number
  totalSteps: number
  activeTaskId: string | null
  activeTaskTitle: string | null
  activeTaskFormat: string | null
  activeTaskDueDate: string | null
}

interface LearnerProgress {
  learnerId: string
  currentStep: number
  isLocked: boolean
  totalSteps: number
}

interface LiveTask {
  id: string
  title: string
  subject: string
  published: boolean
  templateType: string
  totalTimeMin: number
  stepLabels: string[]
}

function suggestDueDate(totalMinutes: number): string {
  const daysOut = totalMinutes < 80 ? 5 : totalMinutes < 100 ? 7 : 10
  const d = new Date()
  d.setDate(d.getDate() + daysOut)
  return d.toISOString().split('T')[0]
}

// ─── ActivationForm ───────────────────────────────────────────────────────────

// FULL:      1 CHALLENGE → 2 REFLECTION → 3 CONTENT → 4 QUIZ → 5 DISCUSSION [→ 6 ASSIGNMENT]
// SHORTENED: 3 CONTENT → 4 QUIZ [→ 6 ASSIGNMENT]

type LTMode = 'full' | 'shortened'

const MODE_STEPS: Record<LTMode, number[]> = {
  full:      [1, 2, 3, 4, 5],
  shortened: [3, 4],
}

const MODE_LABELS: Record<LTMode, { title: string; subtitle: string }> = {
  full:      { title: 'FULL LEARNING TASK',      subtitle: 'Challenge · Reflection · Content · Quiz · Discussion' },
  shortened: { title: 'SHORTENED LEARNING TASK', subtitle: 'Content · Quiz only'                                  },
}

const STEP_DESCRIPTIONS: Record<number, string> = {
  1: 'Real-life open-ended problem — video and scenario document',
  2: 'Meta-cognitive questions answered before accessing content',
  3: 'Core resources teaching how to solve the challenge',
  4: 'Individual knowledge check',
  5: 'Cooperative group phase: compare answers and build solution',
  6: 'Individual artefact applying the group solution',
}

const STEP_LABELS_MAP: Record<number, string> = {
  1: 'CHALLENGE', 2: 'REFLECTION', 3: 'CONTENT',
  4: 'QUIZ',      5: 'DISCUSSION', 6: 'ASSIGNMENT',
}

const ActivationForm: React.FC<{
  task: LiveTask
  onConfirm: (dueDate: string, format: string, enabledSteps: number[]) => void
  onCancel: () => void
}> = ({ task, onConfirm, onCancel }) => {
  const [dueDate, setDueDate]           = useState(suggestDueDate(task.totalTimeMin))
  const [mode, setMode]                 = useState<LTMode>('full')
  const [withAssignment, setWithAssign] = useState(true)

  const isHql        = task.templateType === 'hql'
  const daysLabel    = task.totalTimeMin < 80 ? '5' : task.totalTimeMin < 100 ? '7' : '10'
  const enabledSteps = isHql ? [...MODE_STEPS[mode], ...(withAssignment ? [6] : [])] : []
  const format       = isHql ? mode : 'general'
  const finalStep    = withAssignment ? 'ASSIGNMENT' : 'QUIZ'

  const ModeBtn: React.FC<{ m: LTMode }> = ({ m }) => {
    const active = mode === m
    return (
      <div
        onClick={() => setMode(m)}
        style={{
          flex: 1,
          padding: '0.6rem 0.75rem',
          background: active ? 'rgba(255,215,0,0.12)' : 'rgba(0,0,0,0.3)',
          border: `1px solid ${active ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: '3px',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'background 0.12s, border-color 0.12s',
        }}
      >
        <div style={{ ...VT, fontSize: '0.88rem', letterSpacing: '1.5px', color: active ? GOLD : 'rgba(255,255,255,0.4)' }}>
          {active ? '◉' : '○'} {MODE_LABELS[m].title}
        </div>
        <div style={{ ...VT, fontSize: '0.72rem', color: active ? 'rgba(255,215,0,0.55)' : 'rgba(255,255,255,0.2)', letterSpacing: '0.5px', marginTop: '2px' }}>
          {MODE_LABELS[m].subtitle}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      style={{
        background: 'rgba(255,215,0,0.05)',
        border: '1px solid rgba(255,215,0,0.3)',
        borderRadius: '4px',
        padding: '0.85rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
      }}
    >
      {/* Task heading */}
      <div>
        <div style={{ ...VT, fontSize: '0.72rem', letterSpacing: '2px', color: GOLD_DIM }}>ACTIVATING</div>
        <div style={{ ...VT, fontSize: '1rem', letterSpacing: '1px', color: '#fff', marginTop: '2px' }}>
          {task.title.toUpperCase()}
        </div>
      </div>

      {/* Mode selector — HQL only */}
      {isHql && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <span style={{ ...VT, fontSize: '0.72rem', letterSpacing: '2px', color: GOLD_DIM }}>FORMAT</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <ModeBtn m="full" />
            <ModeBtn m="shortened" />
          </div>
        </div>
      )}

      {/* Step preview — HQL only */}
      {isHql && enabledSteps.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {enabledSteps.map((num, idx) => (
            <div key={num} style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.3rem 0.6rem',
              background: 'rgba(255,215,0,0.04)',
              border: '1px solid rgba(255,215,0,0.1)',
              borderRadius: '3px',
            }}>
              <span style={{ ...VT, fontSize: '0.75rem', color: 'rgba(255,215,0,0.35)', flexShrink: 0, width: '20px', textAlign: 'right' }}>
                {idx + 1}.
              </span>
              <span style={{ ...VT, fontSize: '0.85rem', color: GOLD, letterSpacing: '1px', flexShrink: 0, width: '88px' }}>
                {STEP_LABELS_MAP[num]}
              </span>
              <span style={{ ...VT, fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.5px' }}>
                {STEP_DESCRIPTIONS[num]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Assignment toggle — HQL only */}
      {isHql && (
        <div
          onClick={() => setWithAssign(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.45rem 0.7rem',
            background: withAssignment ? 'rgba(255,215,0,0.07)' : 'rgba(0,0,0,0.3)',
            border: `1px solid ${withAssignment ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '3px',
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'background 0.12s, border-color 0.12s',
          }}
        >
          <span style={{ ...VT, fontSize: '1rem', color: withAssignment ? GREEN : 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
            {withAssignment ? '✓' : '○'}
          </span>
          <div>
            <span style={{ ...VT, fontSize: '0.88rem', letterSpacing: '1px', color: withAssignment ? '#fff' : 'rgba(255,255,255,0.35)' }}>
              INCLUDE FINAL ASSIGNMENT
            </span>
            <span style={{ ...VT, fontSize: '0.72rem', color: 'rgba(255,255,255,0.22)', marginLeft: '0.5rem', letterSpacing: '0.5px' }}>
              {withAssignment ? 'learners submit an artefact after discussion' : 'QUIZ is the final assessment'}
            </span>
          </div>
        </div>
      )}

      {/* Due date */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        <span style={{ ...VT, fontSize: '0.72rem', letterSpacing: '2px', color: GOLD_DIM }}>
          {finalStep} DUE DATE
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            style={{
              ...VT, fontSize: '1.05rem',
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,215,0,0.4)',
              borderRadius: '3px',
              padding: '0.25rem 0.6rem',
              color: GOLD, outline: 'none', letterSpacing: '1px', cursor: 'pointer',
            }}
          />
          <span style={{ ...VT, fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.5px' }}>
            suggested {daysLabel} days from today
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            ...VT, fontSize: '0.9rem', letterSpacing: '1px',
            padding: '0.25rem 0.85rem',
            background: 'transparent', border: '1px solid rgba(255,215,0,0.18)',
            borderRadius: '3px', color: GOLD_DIM, cursor: 'pointer',
          }}
        >
          CANCEL
        </button>
        <button
          onClick={() => dueDate && onConfirm(dueDate, format, enabledSteps)}
          disabled={!dueDate}
          style={{
            ...VT, fontSize: '0.9rem', letterSpacing: '1px',
            padding: '0.25rem 1.1rem',
            background: dueDate ? GOLD : 'rgba(255,215,0,0.12)',
            border: 'none', borderRadius: '3px',
            color: dueDate ? '#000' : GOLD_DIM,
            cursor: dueDate ? 'pointer' : 'not-allowed',
            fontWeight: 'bold',
          }}
        >
          ACTIVATE TASK ✓
        </button>
      </div>
    </motion.div>
  )
}

// ─── ClassCard ───────────────────────────────────────────────────────────────

const ClassCard: React.FC<{
  cls: AcademicClass
  index: number
  publishedTasks: LiveTask[]
  onOpen: () => void
}> = ({ cls, index, publishedTasks, onOpen }) => {
  const [expanded, setExpanded] = useState(false)
  const [activating, setActivating] = useState<LiveTask | null>(null)

  const { data, loading } = useQuery<{ classProgress: LearnerProgress[] }>(CLASS_PROGRESS, {
    variables: { academicClassId: cls.id },
    pollInterval: 10000,
  })

  const [activateTaskMutation] = useMutation(ACTIVATE_TASK, {
    refetchQueries: [{ query: TEACHER_CLASSES }],
  })

  const learners   = data?.classProgress ?? []
  const total      = learners.length
  const notStarted = learners.filter(l => l.currentStep === 0 && !l.isLocked).length
  const waitState  = learners.filter(l => l.isLocked).length
  const complete   = learners.filter(l => !l.isLocked && l.currentStep >= l.totalSteps && l.totalSteps > 0).length
  const active     = total - notStarted - waitState - complete
  const avgPct     = total > 0
    ? Math.round(learners.reduce((s, l) => s + (l.totalSteps > 0 ? l.currentStep / l.totalSteps : 0), 0) / total * 100)
    : 0

  const classTasks = publishedTasks.filter(t => t.subject === cls.subject)

  const handleActivate = async (dueDate: string, format: string, enabledSteps: number[]) => {
    if (!activating) return
    await activateTaskMutation({
      variables: { academicClassId: cls.id, taskId: activating.id, format, enabledSteps, dueDate },
    })
    setActivating(null)
    setExpanded(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
      style={{
        background: 'var(--color-pane-bg, rgba(0,0,0,0.65))',
        border: `1px solid rgba(255,215,0,${waitState > 0 ? '0.5' : '0.2'})`,
        borderRadius: '4px',
        padding: '1.25rem 1.4rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        ...VT,
      }}
    >
      {/* Identity */}
      <div>
        <div style={{ fontSize: '1.45rem', letterSpacing: '2px', color: GOLD, lineHeight: 1.1 }}>
          {cls.name}
        </div>
        <div style={{ fontSize: '1rem', color: GOLD_DIM, letterSpacing: '1px', marginTop: '2px' }}>
          {cls.subject}{cls.grade ? ` · GR ${cls.grade}` : ''}
        </div>
      </div>

      {/* Learner progress */}
      {loading ? (
        <div style={{ color: 'rgba(255,215,0,0.3)', fontSize: '0.95rem', letterSpacing: '1px' }}>LOADING...</div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: GOLD_DIM, letterSpacing: '1px' }}>
              <span>{total} LEARNERS</span>
              <span>{avgPct}% AVG PROGRESS</span>
            </div>
            <div style={{ height: '7px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${avgPct}%`,
                background: 'linear-gradient(90deg, rgba(74,158,255,0.85), rgba(255,215,0,0.85))',
                transition: 'width 0.5s ease', borderRadius: '2px',
              }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', fontSize: '0.9rem', letterSpacing: '1px' }}>
            {active > 0     && <span style={{ color: GREEN,                        borderBottom: '1px solid rgba(74,222,128,0.3)'  }}>{active} ACTIVE</span>}
            {waitState > 0  && <span style={{ color: '#f87171',                    borderBottom: '1px solid rgba(248,113,113,0.3)' }}>{waitState} WAIT-STATE</span>}
            {complete > 0   && <span style={{ color: GOLD,                         borderBottom: '1px solid rgba(255,215,0,0.3)'   }}>{complete} COMPLETE</span>}
            {notStarted > 0 && <span style={{ color: 'rgba(255,255,255,0.28)',     borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{notStarted} NOT STARTED</span>}
          </div>
        </>
      )}

      {/* Open dashboard */}
      <button
        onClick={onOpen}
        style={{
          ...VT, fontSize: '1.1rem', letterSpacing: '2px', padding: '0.5rem',
          background: 'rgba(255,215,0,0.07)', border: '1px solid rgba(255,215,0,0.4)',
          color: GOLD, cursor: 'pointer', width: '100%', transition: 'background 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.14)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.07)' }}
      >
        OPEN DASHBOARD →
      </button>

      {/* ── Learning tasks toggle ── */}
      <button
        onClick={() => { setExpanded(e => !e); setActivating(null) }}
        style={{
          ...VT, fontSize: '0.9rem', letterSpacing: '2px',
          padding: '0.35rem 0.75rem',
          background: expanded ? 'rgba(255,215,0,0.08)' : 'transparent',
          border: `1px solid ${BORDER}`,
          borderRadius: '3px',
          color: GOLD_DIM,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.08)' }}
        onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = 'transparent' }}
      >
        <span>{expanded ? '▲' : '▼'} LEARNING TASKS</span>
        <span style={{ fontSize: '0.8rem', color: 'rgba(255,215,0,0.35)' }}>
          {classTasks.length} PUBLISHED
        </span>
      </button>

      {/* ── Expanded task list ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingTop: '0.25rem' }}>

              {/* Active task banner (live from DB) */}
              {cls.activeTaskTitle && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(74,222,128,0.07)',
                  border: '1px solid rgba(74,222,128,0.25)',
                  borderRadius: '3px',
                  padding: '0.4rem 0.75rem',
                  marginBottom: '0.25rem',
                }}>
                  <span style={{ ...VT, fontSize: '0.85rem', color: GREEN, letterSpacing: '1px' }}>
                    ✓ ACTIVE: {cls.activeTaskTitle.toUpperCase()}{cls.activeTaskDueDate ? ` · DUE ${cls.activeTaskDueDate}` : ''}
                  </span>
                </div>
              )}

              {/* No published tasks */}
              {classTasks.length === 0 && (
                <div style={{ ...VT, fontSize: '0.85rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '1px', padding: '0.5rem 0' }}>
                  No published tasks for {cls.subject} yet.
                </div>
              )}

              {/* Task rows */}
              {classTasks.map((task) => {
                const isActive = task.id === cls.activeTaskId
                return (
                  <div key={task.id}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.4rem 0',
                      borderBottom: '1px solid rgba(255,215,0,0.06)',
                    }}>
                      <span style={{
                        ...VT, fontSize: '1rem', minWidth: '16px', textAlign: 'center',
                        color: isActive ? GREEN : 'rgba(255,255,255,0.2)',
                      }}>
                        {isActive ? '✓' : '○'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <span style={{ ...VT, fontSize: '0.75rem', color: GOLD_DIM, marginRight: '0.5rem', letterSpacing: '1px' }}>
                          {task.templateType.toUpperCase()}
                        </span>
                        <span style={{ fontSize: '0.88rem', color: isActive ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.55)' }}>
                          {task.title}
                        </span>
                      </div>
                      {isActive && (
                        <span style={{ ...VT, fontSize: '0.72rem', color: 'rgba(74,222,128,0.6)', letterSpacing: '1px' }}>ACTIVE</span>
                      )}
                      {!isActive && !activating && (
                        <button
                          onClick={() => setActivating(task)}
                          style={{
                            ...VT, fontSize: '0.82rem', letterSpacing: '1px',
                            padding: '0.18rem 0.65rem',
                            background: 'rgba(255,215,0,0.1)',
                            border: '1px solid rgba(255,215,0,0.45)',
                            borderRadius: '3px',
                            color: GOLD,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.2)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.1)' }}
                        >
                          ACTIVATE
                        </button>
                      )}
                    </div>

                    {/* Inline activation form */}
                    <AnimatePresence>
                      {activating?.id === task.id && (
                        <ActivationForm
                          task={task}
                          onConfirm={handleActivate}
                          onCancel={() => setActivating(null)}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── TeacherClassesOverview ───────────────────────────────────────────────────

export const TeacherClassesOverview: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  usePageBackground('home')

  const { data } = useQuery<{ teacherClasses: AcademicClass[] }>(TEACHER_CLASSES)
  const { data: tasksData } = useQuery<{ myTasks: LiveTask[] }>(MY_TASKS)
  const classes = data?.teacherClasses ?? []
  const publishedTasks = (tasksData?.myTasks ?? []).filter(t => t.published)

  return (
    <div style={{ height: 'calc(100vh - 52px)', marginTop: '52px', overflowY: 'auto', ...VT }}>

      {/* ── Header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(8px)',
        borderBottom: `2px solid ${GOLD}`,
        padding: '0.6rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button
            onClick={() => navigate('/home')}
            style={{ ...VT, fontSize: '1rem', background: 'transparent', border: 'none', color: GOLD_DIM, cursor: 'pointer', letterSpacing: '2px' }}
          >
            ◂ HOME
          </button>
          <h1 style={{ margin: 0, fontSize: '1.75rem', letterSpacing: '3px', color: GOLD }}>
            MY CLASSES
          </h1>
          <span style={{ fontSize: '1rem', color: 'rgba(255,215,0,0.45)' }}>
            {user?.displayName} · {classes.length} {classes.length === 1 ? 'class' : 'classes'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => navigate('/register')}
            style={{ ...VT, fontSize: '1rem', padding: '0.3rem 1rem', background: 'transparent', border: '1px solid rgba(255,215,0,0.35)', color: GOLD_DIM, cursor: 'pointer', letterSpacing: '2px' }}
          >
            📋 REGISTER
          </button>
          <button
            onClick={() => { logout(); navigate('/') }}
            style={{ ...VT, fontSize: '1rem', padding: '0.3rem 1rem', background: 'transparent', border: '1px solid rgba(255,215,0,0.2)', color: 'rgba(255,215,0,0.45)', cursor: 'pointer', letterSpacing: '2px' }}
          >
            LOGOUT
          </button>
        </div>
      </div>

      {/* ── Grid ── */}
      <div style={{
        padding: '1.5rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '1.25rem',
      }}>
        {classes.map((cls, i) => (
          <ClassCard
            key={cls.id}
            cls={cls}
            index={i}
            publishedTasks={publishedTasks}
            onOpen={() => navigate(`/teacherDashboard?classId=${cls.id}`)}
          />
        ))}

        {classes.length === 0 && (
          <div style={{ color: 'rgba(255,215,0,0.35)', fontSize: '1.1rem', letterSpacing: '2px', padding: '2rem 0' }}>
            No classes assigned.
          </div>
        )}
      </div>
    </div>
  )
}
