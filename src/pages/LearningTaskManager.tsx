import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, gql } from '@apollo/client'
import { usePageBackground } from '@/hooks/usePageBackground'

const VT: React.CSSProperties = { fontFamily: "'VT323', monospace" }
const GOLD = '#FFD700'
const GOLD_DIM = 'rgba(255,215,0,0.5)'
const GOLD_FAINT = 'rgba(255,215,0,0.12)'
const BORDER = 'rgba(255,215,0,0.22)'
const GREEN = '#4ade80'
const AMBER = '#fb923c'

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const MY_TASKS_QUERY = gql`
  query MyTasks {
    myTasks {
      id
      title
      subject
      grade
      templateType
      totalTimeMin
      published
      quizQuestionCount
      blockCount
      createdAt
    }
  }
`

interface LiveTask {
  id: string
  title: string
  subject: string
  grade: string
  templateType: string
  totalTimeMin: number
  published: boolean
  quizQuestionCount: number
  blockCount: number
  createdAt: string
}

type TaskStatus = 'active' | 'draft'

// ─── Adaptor: map LiveTask → display shape ────────────────────────────────────

interface DisplayTask {
  id: string
  taskNumber: number
  title: string
  subject: string
  grade: number
  stepCount: number
  quizQuestions: number
  totalMinutes: number
  status: TaskStatus
  createdAt: string
}

function toDisplayTask(t: LiveTask, index: number): DisplayTask {
  return {
    id: t.id,
    taskNumber: index + 1,
    title: t.title,
    subject: t.subject,
    grade: parseInt(t.grade) || 0,
    stepCount: t.blockCount || 7,
    quizQuestions: t.quizQuestionCount,
    totalMinutes: t.totalTimeMin,
    status: t.published ? 'active' : 'draft',
    createdAt: t.createdAt.slice(0, 10),
  }
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────

const TaskCard: React.FC<{
  task: DisplayTask
  index: number
  onEdit: () => void
  onPreview: () => void
}> = ({ task, index, onEdit, onPreview }) => {
  const isDraft = task.status === 'draft'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      style={{
        background: 'var(--color-pane-bg, rgba(0,0,0,0.55))',
        border: `1px solid ${isDraft ? 'rgba(251,146,60,0.3)' : BORDER}`,
        borderLeft: `3px solid ${isDraft ? AMBER : GOLD}`,
        borderRadius: '4px',
        padding: '1rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        ...VT,
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.85rem', letterSpacing: '2px', color: GOLD_DIM }}>
              TASK {task.taskNumber}
            </span>
            <span style={{
              fontSize: '0.72rem', letterSpacing: '1px', padding: '0 0.4rem',
              background: isDraft ? 'rgba(251,146,60,0.12)' : 'rgba(74,222,128,0.1)',
              border: `1px solid ${isDraft ? 'rgba(251,146,60,0.35)' : 'rgba(74,222,128,0.3)'}`,
              color: isDraft ? AMBER : GREEN,
              borderRadius: '2px',
            }}>
              {isDraft ? 'DRAFT' : 'ACTIVE'}
            </span>
          </div>
          <span style={{ fontSize: '1.2rem', letterSpacing: '1px', color: '#fff', lineHeight: 1.2 }}>
            {task.title}
          </span>
          <span style={{ fontSize: '0.85rem', color: GOLD_DIM, letterSpacing: '1px' }}>
            {task.subject}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>
        <span>{task.stepCount} STEPS</span>
        <span>{task.quizQuestions} Q QUIZ</span>
        <span>≈{task.totalMinutes} MIN</span>
        <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.25)' }}>{task.createdAt}</span>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.6rem' }}>
        <button
          onClick={onEdit}
          style={{
            ...VT, flex: 1,
            fontSize: '0.95rem', letterSpacing: '2px',
            padding: '0.45rem 0',
            background: GOLD_FAINT,
            border: `1px solid rgba(255,215,0,0.4)`,
            borderRadius: '3px',
            color: GOLD,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.background = GOLD_FAINT }}
        >
          ✎ EDIT
        </button>
        <button
          onClick={onPreview}
          style={{
            ...VT, flex: 1,
            fontSize: '0.95rem', letterSpacing: '2px',
            padding: '0.45rem 0',
            background: 'transparent',
            border: `1px solid ${BORDER}`,
            borderRadius: '3px',
            color: GOLD_DIM,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          ▶ PREVIEW
        </button>
      </div>
    </motion.div>
  )
}

// ─── LearningTaskManager ──────────────────────────────────────────────────────

export const LearningTaskManager: React.FC = () => {
  const navigate = useNavigate()
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all')
  const [search, setSearch] = useState('')

  usePageBackground('home')

  const { data, loading } = useQuery<{ myTasks: LiveTask[] }>(MY_TASKS_QUERY)
  const allTasks: DisplayTask[] = (data?.myTasks ?? []).map((t, i) => toDisplayTask(t, i))
  const allGrades = [...new Set(allTasks.map(t => t.grade))].sort((a, b) => a - b)

  const filtered = allTasks.filter(t => {
    const gradeMatch = selectedGrade === 'all' || t.grade === selectedGrade
    const searchMatch = !search.trim() ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase())
    return gradeMatch && searchMatch
  })

  const draftCount = filtered.filter(t => t.status === 'draft').length
  const activeCount = filtered.filter(t => t.status === 'active').length

  return (
    <div style={{ height: 'calc(100vh - 52px)', marginTop: '52px', overflowY: 'auto', ...VT }}>

      {/* ── Sticky header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.9)',
        backdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${BORDER}`,
        padding: '0.65rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <button
            onClick={() => navigate('/home')}
            style={{ ...VT, fontSize: '1rem', background: 'none', border: 'none', color: GOLD_DIM, cursor: 'pointer', letterSpacing: '2px', padding: 0 }}
          >
            ◂ HOME
          </button>
          <h1 style={{ margin: 0, fontSize: '1.6rem', letterSpacing: '3px', color: GOLD, lineHeight: 1 }}>
            LEARNING TASKS
          </h1>
        </div>

        <button
          onClick={() => navigate('/task-creator')}
          style={{
            ...VT,
            fontSize: '1.05rem', letterSpacing: '2px',
            padding: '0.4rem 1.25rem',
            background: GOLD,
            border: 'none',
            borderRadius: '3px',
            color: '#000',
            cursor: 'pointer',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
          }}
        >
          + NEW TASK
        </button>
      </div>

      {/* ── Filters ── */}
      <div style={{
        padding: '1rem 1.5rem 0',
        display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
      }}>

        {/* Grade pills */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedGrade('all')}
            style={{
              ...VT, fontSize: '0.9rem', letterSpacing: '1px',
              padding: '0.25rem 0.75rem',
              background: selectedGrade === 'all' ? GOLD : 'transparent',
              border: `1px solid ${selectedGrade === 'all' ? GOLD : BORDER}`,
              borderRadius: '3px',
              color: selectedGrade === 'all' ? '#000' : GOLD_DIM,
              cursor: 'pointer',
            }}
          >
            ALL GRADES
          </button>
          {allGrades.map(g => (
            <button
              key={g}
              onClick={() => setSelectedGrade(g)}
              style={{
                ...VT, fontSize: '0.9rem', letterSpacing: '1px',
                padding: '0.25rem 0.75rem',
                background: selectedGrade === g ? GOLD : 'transparent',
                border: `1px solid ${selectedGrade === g ? GOLD : BORDER}`,
                borderRadius: '3px',
                color: selectedGrade === g ? '#000' : GOLD_DIM,
                cursor: 'pointer',
              }}
            >
              GR {g}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tasks..."
          style={{
            ...VT,
            fontSize: '1rem', letterSpacing: '1px',
            padding: '0.28rem 0.75rem',
            background: 'rgba(0,0,0,0.4)',
            border: `1px solid ${BORDER}`,
            borderRadius: '3px',
            color: '#fff',
            outline: 'none',
            width: '220px',
          }}
        />

        {/* Summary */}
        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px', marginLeft: 'auto' }}>
          {activeCount > 0 && <span style={{ color: GREEN }}>{activeCount} ACTIVE</span>}
          {activeCount > 0 && draftCount > 0 && <span style={{ color: 'rgba(255,255,255,0.2)' }}> · </span>}
          {draftCount > 0 && <span style={{ color: AMBER }}>{draftCount} DRAFT</span>}
        </span>
      </div>

      {/* ── Task grid ── */}
      <div style={{
        padding: '1rem 1.5rem 2rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '0.9rem',
      }}>
        {loading && (
          <div style={{ gridColumn: '1 / -1', padding: '3rem 0', textAlign: 'center', color: GOLD_DIM, letterSpacing: '2px' }}>
            LOADING TASKS...
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {filtered.map((task, i) => (
            <TaskCard
              key={task.id}
              task={task}
              index={i}
              onEdit={() => navigate(`/task-creator/${task.id}`)}
              onPreview={() => {/* preview modal — future */ }}
            />
          ))}
        </AnimatePresence>

        {!loading && filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ gridColumn: '1 / -1', padding: '3rem 0', textAlign: 'center' }}
          >
            <div style={{ fontSize: '1.1rem', letterSpacing: '2px', color: GOLD_DIM }}>
              {search ? `NO TASKS MATCHING "${search.toUpperCase()}"` : 'NO TASKS FOR THIS GRADE YET'}
            </div>
            <button
              onClick={() => navigate('/task-creator')}
              style={{
                ...VT, marginTop: '1rem',
                fontSize: '1rem', letterSpacing: '2px',
                padding: '0.5rem 1.5rem',
                background: GOLD_FAINT,
                border: `1px solid ${BORDER}`,
                borderRadius: '3px',
                color: GOLD_DIM,
                cursor: 'pointer',
              }}
            >
              + CREATE FIRST TASK
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
