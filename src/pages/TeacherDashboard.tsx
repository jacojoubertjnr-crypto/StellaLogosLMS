import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, gql } from '@apollo/client'
import { useAuthStore } from '@/stores/authStore'
import { usePageBackground } from '@/hooks/usePageBackground'
import { BroadcastBar } from '@/components/BroadcastBar'

const TEACHER_CLASSES = gql`
  query TeacherClasses {
    teacherClasses {
      id
      name
      subject
      totalSteps
    }
  }
`

const CLASS_PROGRESS = gql`
  query ClassProgress($academicClassId: ID!) {
    classProgress(academicClassId: $academicClassId) {
      learnerId
      displayName
      email
      currentStep
      isLocked
      totalSteps
    }
  }
`

const UNLOCK_STEP = gql`
  mutation UnlockStep($learnerId: ID!, $academicClassId: ID!) {
    unlockStep(learnerId: $learnerId, academicClassId: $academicClassId) {
      learnerId
      currentStep
      isLocked
    }
  }
`

const SEND_TO_LEARNER = gql`
  mutation SendToLearner($learnerId: ID!, $body: String!) {
    sendToLearner(learnerId: $learnerId, body: $body) {
      id
      body
      sentAt
    }
  }
`

const LEARNER_MESSAGES = gql`
  query LearnerMessages($learnerId: ID!) {
    learnerMessages(learnerId: $learnerId, limit: 30) {
      id
      senderName
      body
      sentAt
      fromMe
    }
  }
`

const CREATE_TASK_GROUP = gql`
  mutation CreateTaskGroup($academicClassId: ID!, $memberRoles: [TaskGroupMemberInput!]!) {
    createTaskGroup(academicClassId: $academicClassId, memberRoles: $memberRoles) {
      id
      members {
        learnerId
        displayName
        role
      }
    }
  }
`

interface TeacherLearner {
  learnerId: string
  displayName: string
  email: string
  currentStep: number
  isLocked: boolean
  totalSteps: number
}

interface AcademicClass {
  id: string
  name: string
  subject: string
  totalSteps: number
}

interface DirectMessage {
  id: string
  senderName: string
  body: string
  sentAt: string
  fromMe: boolean
}

const NUDGE_PRESETS = ['Still there?', 'Need help?', 'Keep going!']

// ── Grouping engine constants ─────────────────────────────────────────────────

const GROUP_ROLES = ['Leader', 'Timer', 'Scribe', 'AngleChecker'] as const
type GroupRole = typeof GROUP_ROLES[number]

const ROLE_ICONS: Record<GroupRole, string> = {
  Leader: '♚', Timer: '◷', Scribe: '✎', AngleChecker: '◈',
}

interface GroupSlot { role: GroupRole; learnerId: string | null; displayName: string | null }
interface GroupBucket { id: string; slots: GroupSlot[] }
interface GroupResult { groupNumber: number; members: { displayName: string; role: GroupRole }[] }

function shuffleLearners<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makeGroupBucket(id: string): GroupBucket {
  return { id, slots: GROUP_ROLES.map(role => ({ role, learnerId: null, displayName: null })) }
}

// ── Chat panel — renders inside expanded 2×2 card ────────────────────────────

const ChatPanel: React.FC<{
  learnerId: string
  borderColor: string
  onSend: (body: string) => void
}> = ({ learnerId, borderColor, onSend }) => {
  const [msg, setMsg] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data, loading } = useQuery<{ learnerMessages: DirectMessage[] }>(LEARNER_MESSAGES, {
    variables: { learnerId },
    pollInterval: 5000,
  })
  const messages = data?.learnerMessages ?? []

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    const body = msg.trim()
    if (!body) return
    onSend(body)
    setMsg('')
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      borderLeft: `1px solid ${borderColor}`,
      height: '100%', overflow: 'hidden',
    }}>
      <div style={{
        padding: '0.4rem 0.75rem',
        borderBottom: `1px solid ${borderColor}`,
        fontSize: '0.7rem', color: 'rgba(255,215,0,0.35)', letterSpacing: '2px',
      }}>
        MESSAGES
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}
        onClick={e => e.stopPropagation()}
      >
        {loading && messages.length === 0 && (
          <div style={{ opacity: 0.3, fontSize: '0.78rem', color: '#FFD700' }}>Loading…</div>
        )}
        {messages.length === 0 && !loading && (
          <div style={{ opacity: 0.2, fontSize: '0.78rem', color: '#FFD700', textAlign: 'center', marginTop: '0.75rem' }}>
            NO MESSAGES YET
          </div>
        )}
        {[...messages].reverse().map(m => (
          <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.fromMe ? 'flex-end' : 'flex-start' }}>
            <span style={{
              display: 'inline-block', maxWidth: '88%',
              padding: '0.2rem 0.55rem',
              background: m.fromMe ? 'rgba(255,215,0,0.12)' : 'rgba(74,222,128,0.08)',
              border: `1px solid ${m.fromMe ? 'rgba(255,215,0,0.3)' : 'rgba(74,222,128,0.25)'}`,
              color: m.fromMe ? 'rgba(255,215,0,0.85)' : '#4ade80',
              fontSize: '0.8rem', lineHeight: 1.4,
            }}>
              {m.body}
            </span>
            <span style={{ fontSize: '0.6rem', color: 'rgba(255,215,0,0.18)', marginTop: '1px' }}>
              {formatTime(m.sentAt)}
            </span>
          </div>
        ))}
      </div>

      {/* Input row */}
      <div
        style={{ display: 'flex', gap: '0.35rem', padding: '0.4rem 0.5rem', borderTop: `1px solid ${borderColor}` }}
        onClick={e => e.stopPropagation()}
      >
        <input
          value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Message learner…"
          style={{
            flex: 1, fontFamily: "'VT323', monospace", fontSize: '0.85rem',
            padding: '0.3rem 0.5rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,215,0,0.2)',
            color: '#FFD700', outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!msg.trim()}
          style={{
            fontFamily: "'VT323', monospace", fontSize: '0.85rem',
            padding: '0.3rem 0.65rem',
            background: msg.trim() ? 'rgba(255,215,0,0.1)' : 'transparent',
            border: '1px solid rgba(255,215,0,0.3)',
            color: msg.trim() ? '#FFD700' : 'rgba(255,215,0,0.25)',
            cursor: msg.trim() ? 'pointer' : 'default', letterSpacing: '1px',
          }}
        >
          SEND
        </button>
      </div>
    </div>
  )
}

// ── Main Teacher Dashboard ────────────────────────────────────────────────────

export const TeacherDashboard: React.FC = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  usePageBackground('home')

  const [activeClassId, setActiveClassId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandAnimating, setExpandAnimating] = useState(false)

  useEffect(() => {
    if (!expandedId) return
    setExpandAnimating(true)
    const f1 = requestAnimationFrame(() => {
      const f2 = requestAnimationFrame(() => setExpandAnimating(false))
      return () => cancelAnimationFrame(f2)
    })
    return () => cancelAnimationFrame(f1)
  }, [expandedId])

  const { data: classesData } = useQuery<{ teacherClasses: AcademicClass[] }>(TEACHER_CLASSES)
  const classes = classesData?.teacherClasses ?? []

  useEffect(() => {
    if (classes.length > 0 && !activeClassId) {
      const paramId = searchParams.get('classId')
      const match = paramId ? classes.find(c => c.id === paramId) : null
      setActiveClassId(match ? match.id : classes[0].id)
    }
  }, [classes, activeClassId, searchParams])

  const { data: progressData, loading } = useQuery<{ classProgress: TeacherLearner[] }>(CLASS_PROGRESS, {
    variables: { academicClassId: activeClassId },
    skip: !activeClassId,
    pollInterval: 5000,
  })
  const learners = progressData?.classProgress ?? []

  const sortedLearners = [...learners].sort((a, b) => {
    if (a.isLocked !== b.isLocked) return a.isLocked ? -1 : 1
    return b.currentStep - a.currentStep
  })

  const [unlockStep, { loading: unlocking }] = useMutation(UNLOCK_STEP, {
    refetchQueries: [{ query: CLASS_PROGRESS, variables: { academicClassId: activeClassId } }],
  })

  const [sendToLearner] = useMutation(SEND_TO_LEARNER)
  const [createTaskGroupMutation] = useMutation(CREATE_TASK_GROUP)

  // ── Grouping engine state ──────────────────────────────────────────────────
  // 'editing' = review/adjust groups before saving; 'saved' = confirmed & in DB
  const [groupingMode, setGroupingMode] = useState<'editing' | 'saved' | null>(null)
  const [savedGroups, setSavedGroups] = useState<GroupResult[]>([])
  const [editingGroups, setEditingGroups] = useState<GroupBucket[]>([makeGroupBucket('g1'), makeGroupBucket('g2')])
  const [selectedLearnerId, setSelectedLearnerId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const resetGrouping = () => {
    setGroupingMode(null)
    setSavedGroups([])
    setEditingGroups([makeGroupBucket('g1'), makeGroupBucket('g2')])
    setSelectedLearnerId(null)
    setSaveError(null)
  }

  // Reset when class tab changes
  useEffect(() => { resetGrouping() }, [activeClassId])

  const assignedIds = new Set(
    editingGroups.flatMap(g => g.slots.map(s => s.learnerId)).filter(Boolean) as string[]
  )
  const unassignedLearners = sortedLearners.filter(l => !assignedIds.has(l.learnerId))

  // AUTO-DIVIDE: generate buckets locally — no DB call yet
  const handleAutoDivide = () => {
    if (learners.length === 0) return
    const shuffled = shuffleLearners(learners)
    const buckets: GroupBucket[] = []
    for (let i = 0; i < shuffled.length; i += 5) {
      const chunk = shuffled.slice(i, i + 5)
      const bucket = makeGroupBucket(`g${i}`)
      chunk.forEach((learner, j) => {
        bucket.slots[j] = { role: GROUP_ROLES[j], learnerId: learner.learnerId, displayName: learner.displayName }
      })
      buckets.push(bucket)
    }
    setEditingGroups(buckets)
    setSelectedLearnerId(null)
    setSaveError(null)
    setGroupingMode('editing')
  }

  const handleOpenCustom = () => {
    setEditingGroups([makeGroupBucket('g1'), makeGroupBucket('g2')])
    setSelectedLearnerId(null)
    setSaveError(null)
    setGroupingMode('editing')
  }

  const handleClickLearner = (learnerId: string) => {
    setSelectedLearnerId(prev => prev === learnerId ? null : learnerId)
  }

  const handleClickSlot = (groupId: string, role: GroupRole) => {
    if (selectedLearnerId) {
      const learner = learners.find(l => l.learnerId === selectedLearnerId)
      if (!learner) return
      setEditingGroups(prev => prev.map(g => ({
        ...g,
        slots: g.slots.map(s => {
          if (s.learnerId === selectedLearnerId) return { ...s, learnerId: null, displayName: null }
          if (g.id === groupId && s.role === role) return { ...s, learnerId: selectedLearnerId, displayName: learner.displayName }
          return s
        }),
      })))
      setSelectedLearnerId(null)
    } else {
      // No selection — clicking a filled slot returns that learner to the pool
      setEditingGroups(prev => prev.map(g => ({
        ...g,
        slots: g.slots.map(s =>
          g.id === groupId && s.role === role ? { ...s, learnerId: null, displayName: null } : s
        ),
      })))
    }
  }

  const handleAddGroup = () => {
    setEditingGroups(prev => [...prev, makeGroupBucket(`g${Date.now()}`)])
  }

  const handleRemoveGroup = (groupId: string) => {
    setEditingGroups(prev => prev.filter(g => g.id !== groupId))
  }

  const handleSaveGroups = async () => {
    if (!activeClassId) return
    const groupsToSave = editingGroups
      .map(g => ({
        members: g.slots.filter(s => s.learnerId !== null).map(s => ({ learnerId: s.learnerId!, role: s.role, displayName: s.displayName! })),
      }))
      .filter(g => g.members.length > 0)
    if (groupsToSave.length === 0) { setSaveError('Assign at least one learner to a group.'); return }
    setSaving(true)
    setSaveError(null)
    try {
      for (const g of groupsToSave) {
        await createTaskGroupMutation({ variables: { academicClassId: activeClassId, memberRoles: g.members.map(m => ({ learnerId: m.learnerId, role: m.role })) } })
      }
      setSavedGroups(groupsToSave.map((g, i) => ({
        groupNumber: i + 1,
        members: g.members.map(m => ({ displayName: m.displayName, role: m.role })),
      })))
      setGroupingMode('saved')
    } catch (e: unknown) {
      setSaveError((e as Error).message ?? 'Failed to save groups')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => { logout(); navigate('/') }
  const handleUnlock = (learnerId: string) => {
    if (!activeClassId) return
    unlockStep({ variables: { learnerId, academicClassId: activeClassId } })
  }

  const pct = (step: number, total: number) =>
    total > 0 ? Math.round((step / total) * 100) : 0

  const lockedCount = learners.filter(l => l.isLocked).length
  const doneCount = learners.filter(l => l.currentStep >= l.totalSteps).length

  return (
    <div style={{ height: '100vh', overflowY: 'auto', fontFamily: "'VT323', monospace" }}>

      {/* ── Header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(8px)',
        borderBottom: '2px solid var(--color-accent, #FFD700)',
        padding: '0.6rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button
            onClick={() => navigate('/classes')}
            style={{ fontFamily: 'inherit', fontSize: '1rem', background: 'transparent', border: 'none', color: 'rgba(255,215,0,0.65)', cursor: 'pointer', letterSpacing: '2px' }}
          >
            ◂ MY CLASSES
          </button>
          <h1 style={{ margin: 0, fontSize: '1.75rem', letterSpacing: '3px', color: 'var(--color-accent, #FFD700)' }}>
            TEACHER DASHBOARD
          </h1>
          <span style={{ fontSize: '1rem', color: 'rgba(255,215,0,0.45)' }}>
            {user?.displayName} · {user?.role}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
          <span style={{ fontSize: '0.85rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: '#4ade80',
              display: 'inline-block', boxShadow: '0 0 6px #4ade80',
            }} />
            LIVE · 5s
          </span>
          <button onClick={() => navigate('/register')} style={{
            fontFamily: 'inherit', fontSize: '1rem',
            padding: '0.3rem 1rem', background: 'transparent',
            border: '1px solid rgba(255,215,0,0.35)',
            color: 'rgba(255,215,0,0.65)', cursor: 'pointer', letterSpacing: '2px',
          }}>
            📋 REGISTER
          </button>
          <button onClick={handleLogout} style={{
            fontFamily: 'inherit', fontSize: '1rem',
            padding: '0.3rem 1rem', background: 'transparent',
            border: '1px solid rgba(255,215,0,0.35)',
            color: 'rgba(255,215,0,0.65)', cursor: 'pointer', letterSpacing: '2px',
          }}>
            LOGOUT
          </button>
        </div>
      </div>

      {/* ── Broadcast bar ── */}
      <BroadcastBar learners={sortedLearners.map(l => ({ learnerId: l.learnerId, displayName: l.displayName }))} />

      {/* ── Class tabs ── */}
      {classes.length > 0 && (
        <div style={{
          background: 'rgba(0,0,0,0.65)',
          padding: '0.5rem 1.5rem',
          display: 'flex', gap: '0.5rem',
          borderBottom: '1px solid rgba(255,215,0,0.15)',
          overflowX: 'auto',
        }}>
          {classes.map(cls => {
            const isActive = activeClassId === cls.id
            return (
              <button
                key={cls.id}
                onClick={() => { setActiveClassId(cls.id); setExpandedId(null) }}
                style={{
                  fontFamily: 'inherit', fontSize: '0.95rem', whiteSpace: 'nowrap',
                  padding: '0.35rem 1.1rem',
                  background: isActive ? 'var(--color-accent, #FFD700)' : 'transparent',
                  border: '1px solid var(--color-accent, #FFD700)',
                  color: isActive ? '#1a0a00' : 'var(--color-accent, #FFD700)',
                  cursor: 'pointer', letterSpacing: '1px',
                }}
              >
                {cls.name}
                <span style={{ marginLeft: '0.4rem', opacity: 0.55, fontSize: '0.8rem' }}>
                  ({cls.subject})
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Main content ── */}
      <div style={{ padding: '1.25rem 1.5rem', position: 'relative' }}>

        {/* Stats bar */}
        {activeClassId && !loading && learners.length > 0 && (
          <div style={{
            display: 'flex', gap: '2rem', marginBottom: '1.25rem',
            padding: '0.6rem 1rem',
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,215,0,0.15)',
            fontSize: '1rem', color: 'rgba(255,215,0,0.7)',
          }}>
            <span>ENROLLED: <strong style={{ color: '#FFD700' }}>{learners.length}</strong></span>
            <span>
              WAIT STATE:{' '}
              <strong style={{ color: lockedCount > 0 ? '#ef4444' : '#4ade80' }}>
                {lockedCount}
              </strong>
            </span>
            <span>COMPLETE: <strong style={{ color: '#4ade80' }}>{doneCount}</strong></span>
          </div>
        )}

        {/* Empty states */}
        {classes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '5rem', opacity: 0.4, fontSize: '1.2rem', color: '#FFD700' }}>
            NO CLASSES ASSIGNED TO THIS ACCOUNT
          </div>
        )}
        {activeClassId && !loading && learners.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.4, fontSize: '1.1rem', color: '#FFD700' }}>
            NO LEARNERS ENROLLED IN THIS CLASS
          </div>
        )}

        {/* Click-outside overlay — sits below expanded card (z:10) but above grid items (z:0) */}
        {expandedId && (
          <div
            onClick={() => setExpandedId(null)}
            style={{
              position: 'fixed', inset: 0,
              zIndex: 5,
              background: 'rgba(0,0,0,0.35)',
            }}
          />
        )}

        {/* Learner grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gridAutoRows: '160px',
          gap: '1rem',
          alignItems: 'start',
        }}>

          {/* Skeleton cards while loading */}
          {loading && learners.length === 0 &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{
                height: '100%', background: 'var(--color-pane-bg, rgba(0,0,0,0.4))',
                border: '1px solid rgba(255,215,0,0.08)', opacity: 0.5,
              }} />
            ))
          }

          {sortedLearners.map(learner => {
            const isExpanded = expandedId === learner.learnerId
            const progress = pct(learner.currentStep, learner.totalSteps)
            const isDone = learner.currentStep >= learner.totalSteps
            const notStarted = learner.currentStep === 0

            const borderColor = learner.isLocked
              ? 'rgba(239,68,68,0.5)'
              : isDone ? 'rgba(74,222,128,0.45)' : 'rgba(255,215,0,0.2)'
            const bgColor = learner.isLocked
              ? 'rgba(239,68,68,0.07)'
              : isDone ? 'rgba(74,222,128,0.06)' : 'var(--color-pane-bg, rgba(0,0,0,0.5))'
            const barColor = isDone ? '#4ade80' : learner.isLocked ? '#ef4444' : '#FFD700'

            if (isExpanded) {
              // ── Expanded 2×2 card ──────────────────────────────────────────
              return (
                <div
                  key={learner.learnerId}
                  style={{
                    gridColumn: 'span 2',
                    gridRow: 'span 2',
                    position: 'relative',
                    zIndex: 10,
                    background: bgColor,
                    border: `1px solid ${borderColor}`,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    height: '100%',
                    overflow: 'hidden',
                    opacity: expandAnimating ? 0 : 1,
                    transform: expandAnimating ? 'scale(0.97)' : 'scale(1)',
                    transformOrigin: 'top left',
                    transition: expandAnimating ? 'none' : 'opacity 0.7s ease, transform 0.7s ease',
                  }}
                >
                  {/* Left: stats + actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '0.85rem 1rem' }}>

                    {/* Header row: name + close button */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ fontSize: '1.15rem', color: '#FFD700', letterSpacing: '1px', lineHeight: 1.2 }}>
                          {learner.displayName.toUpperCase()}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,215,0,0.35)', marginTop: '0.1rem' }}>
                          {learner.email}
                        </div>
                      </div>
                      <button
                        onClick={() => setExpandedId(null)}
                        style={{
                          fontFamily: 'inherit', fontSize: '1.1rem',
                          background: 'transparent',
                          border: '1px solid rgba(255,215,0,0.2)',
                          color: 'rgba(255,215,0,0.45)',
                          cursor: 'pointer', lineHeight: 1,
                          padding: '0 0.4rem 0.1rem',
                          flexShrink: 0,
                        }}
                      >
                        ×
                      </button>
                    </div>

                    {/* Status badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.5rem' }}>
                      {learner.isLocked && (
                        <span style={{
                          background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.6)',
                          color: '#ef4444', fontSize: '0.72rem', padding: '1px 7px', letterSpacing: '1px',
                        }}>
                          🔒 WAIT STATE
                        </span>
                      )}
                      {isDone && (
                        <span style={{
                          background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.5)',
                          color: '#4ade80', fontSize: '0.72rem', padding: '1px 7px', letterSpacing: '1px',
                        }}>
                          ✓ COMPLETE
                        </span>
                      )}
                      <span style={{ fontSize: '0.85rem', color: 'rgba(255,215,0,0.55)' }}>
                        {notStarted ? 'NOT STARTED' : `STEP ${learner.currentStep} / ${learner.totalSteps}`}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: '0.2rem' }}>
                      <div style={{
                        height: '100%', width: `${progress}%`,
                        background: barColor, transition: 'width 0.5s ease',
                      }} />
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.7rem', color: 'rgba(255,215,0,0.3)', marginBottom: '0.75rem' }}>
                      {progress}%
                    </div>

                    {/* Unlock button */}
                    {learner.isLocked && (
                      <button
                        onClick={() => handleUnlock(learner.learnerId)}
                        disabled={unlocking}
                        style={{
                          fontFamily: 'inherit', fontSize: '1rem',
                          padding: '0.4rem', marginBottom: '0.75rem', width: '100%',
                          background: 'rgba(74,222,128,0.12)',
                          border: '1px solid #4ade80', color: '#4ade80',
                          cursor: unlocking ? 'wait' : 'pointer', letterSpacing: '2px',
                        }}
                      >
                        {unlocking ? 'UNLOCKING...' : '🔓 UNLOCK STEP'}
                      </button>
                    )}

                    {/* Nudge presets */}
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,215,0,0.4)', marginBottom: '0.35rem', letterSpacing: '1px' }}>
                      QUICK NUDGE
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {NUDGE_PRESETS.map(preset => (
                        <button
                          key={preset}
                          onClick={() => sendToLearner({ variables: { learnerId: learner.learnerId, body: preset } })}
                          style={{
                            fontFamily: 'inherit', fontSize: '0.75rem',
                            padding: '0.2rem 0.55rem', background: 'transparent',
                            border: '1px solid rgba(255,215,0,0.25)',
                            color: 'rgba(255,215,0,0.6)', cursor: 'pointer',
                          }}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right: chat panel */}
                  <ChatPanel
                    learnerId={learner.learnerId}
                    borderColor={borderColor}
                    onSend={(body) => sendToLearner({ variables: { learnerId: learner.learnerId, body } })}
                  />
                </div>
              )
            }

            // ── Compact card ──────────────────────────────────────────────────
            return (
              <div
                key={learner.learnerId}
                style={{
                  background: bgColor,
                  border: `1px solid ${borderColor}`,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
                onClick={() => setExpandedId(learner.learnerId)}
              >
                <div style={{ padding: '0.85rem 1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>

                    {/* Name + email */}
                    <div>
                      <div style={{ fontSize: '1.05rem', color: '#FFD700', letterSpacing: '1px', lineHeight: 1.2 }}>
                        {learner.displayName.toUpperCase()}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'rgba(255,215,0,0.35)', marginTop: '0.15rem' }}>
                        {learner.email}
                      </div>
                    </div>

                    {/* Status badges */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                      {learner.isLocked && (
                        <span style={{
                          background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.6)',
                          color: '#ef4444', fontSize: '0.72rem', padding: '1px 7px', letterSpacing: '1px',
                        }}>
                          🔒 WAIT STATE
                        </span>
                      )}
                      {isDone && (
                        <span style={{
                          background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.5)',
                          color: '#4ade80', fontSize: '0.72rem', padding: '1px 7px', letterSpacing: '1px',
                        }}>
                          ✓ COMPLETE
                        </span>
                      )}
                      <span style={{ fontSize: '0.85rem', color: 'rgba(255,215,0,0.55)' }}>
                        {notStarted ? 'NOT STARTED' : `STEP ${learner.currentStep} / ${learner.totalSteps}`}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${progress}%`,
                      background: barColor, transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.7rem', color: 'rgba(255,215,0,0.3)', marginTop: '0.2rem' }}>
                    {progress}%
                  </div>
                </div>

                {/* Click hint */}
                <div style={{
                  textAlign: 'center', fontSize: '0.65rem',
                  color: 'rgba(255,215,0,0.18)', letterSpacing: '1px',
                  paddingBottom: '0.5rem',
                }}>
                  CLICK TO EXPAND
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Phase 5b: Cooperative Grouping Engine ── */}
        <div style={{
          marginTop: '3rem',
          border: '1px solid rgba(255,215,0,0.25)',
          background: 'rgba(0,0,0,0.35)',
          padding: '1.25rem 1.5rem',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.85)' }}>
              COOPERATIVE GROUPING ENGINE
            </h2>
            {groupingMode === 'saved' && (
              <button
                onClick={resetGrouping}
                style={{ fontFamily: 'inherit', fontSize: '0.85rem', padding: '0.3rem 0.9rem', background: 'transparent', border: '1px solid rgba(255,215,0,0.3)', color: 'rgba(255,215,0,0.6)', cursor: 'pointer', letterSpacing: '1px' }}
              >
                ↺ DIVIDE AGAIN
              </button>
            )}
          </div>

          {/* ── Mode: default (choose how to divide) ── */}
          {!groupingMode && (
            <>
              <p style={{ margin: '0 0 1.25rem', fontSize: '0.9rem', color: 'rgba(255,215,0,0.5)', lineHeight: 1.6, maxWidth: 700 }}>
                Assign learners to cooperative groups before they enter Phase III.
                Review and adjust before saving — groups are committed to the database only when you confirm.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxWidth: 700 }}>

                <div style={{ border: '1px solid rgba(255,215,0,0.25)', background: 'rgba(255,215,0,0.03)', padding: '1rem' }}>
                  <div style={{ fontSize: '1.05rem', color: 'rgba(255,215,0,0.8)', letterSpacing: '1px', marginBottom: '0.5rem' }}>⚡ AUTO-DIVIDE</div>
                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: 'rgba(255,215,0,0.45)', lineHeight: 1.5 }}>
                    Randomly assigns all {learners.length} learner{learners.length !== 1 ? 's' : ''} into balanced groups of 4–5.
                    Review and swap before saving.
                  </p>
                  <button
                    onClick={handleAutoDivide}
                    disabled={learners.length === 0}
                    style={{
                      fontFamily: 'inherit', fontSize: '0.9rem', padding: '0.4rem 1rem', width: '100%',
                      background: learners.length > 0 ? 'rgba(255,215,0,0.1)' : 'transparent',
                      border: `1px solid ${learners.length > 0 ? 'rgba(255,215,0,0.5)' : 'rgba(255,215,0,0.15)'}`,
                      color: learners.length > 0 ? '#FFD700' : 'rgba(255,215,0,0.2)',
                      cursor: learners.length > 0 ? 'pointer' : 'not-allowed', letterSpacing: '2px',
                    }}
                  >
                    AUTO-DIVIDE LEARNERS
                  </button>
                </div>

                <div style={{ border: '1px solid rgba(255,215,0,0.25)', background: 'rgba(255,215,0,0.03)', padding: '1rem' }}>
                  <div style={{ fontSize: '1.05rem', color: 'rgba(255,215,0,0.8)', letterSpacing: '1px', marginBottom: '0.5rem' }}>🎯 CUSTOM-DIVIDE</div>
                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: 'rgba(255,215,0,0.45)', lineHeight: 1.5 }}>
                    Click a learner to select them, then click a role slot to place them. Build groups manually.
                  </p>
                  <button
                    onClick={handleOpenCustom}
                    disabled={learners.length === 0}
                    style={{
                      fontFamily: 'inherit', fontSize: '0.9rem', padding: '0.4rem 1rem', width: '100%',
                      background: learners.length > 0 ? 'rgba(255,215,0,0.1)' : 'transparent',
                      border: `1px solid ${learners.length > 0 ? 'rgba(255,215,0,0.5)' : 'rgba(255,215,0,0.15)'}`,
                      color: learners.length > 0 ? '#FFD700' : 'rgba(255,215,0,0.2)',
                      cursor: learners.length > 0 ? 'pointer' : 'not-allowed', letterSpacing: '2px',
                    }}
                  >
                    OPEN GROUP EDITOR →
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── Mode: editing (review & adjust before saving) ── */}
          {groupingMode === 'editing' && (
            <div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,215,0,0.5)', letterSpacing: '1px', marginBottom: '1rem' }}>
                REVIEW & ADJUST — click a learner to select, then click a role slot to place them.
                Click a filled slot with nothing selected to return that learner to the pool.
              </div>

              {/* Unassigned pool */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.72rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.45)', marginBottom: '0.5rem' }}>
                  UNASSIGNED ({unassignedLearners.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', minHeight: 34 }}>
                  {unassignedLearners.length === 0
                    ? <span style={{ fontSize: '0.85rem', color: 'rgba(255,215,0,0.25)', fontStyle: 'italic' }}>All learners assigned ✓</span>
                    : unassignedLearners.map(l => {
                        const isSel = selectedLearnerId === l.learnerId
                        return (
                          <button
                            key={l.learnerId}
                            onClick={() => handleClickLearner(l.learnerId)}
                            style={{
                              fontFamily: 'inherit', fontSize: '0.9rem', padding: '0.25rem 0.7rem',
                              background: isSel ? 'rgba(255,215,0,0.18)' : 'rgba(0,0,0,0.4)',
                              border: `1px solid ${isSel ? '#FFD700' : 'rgba(255,215,0,0.3)'}`,
                              color: isSel ? '#FFD700' : 'rgba(255,255,255,0.7)',
                              cursor: 'pointer',
                              boxShadow: isSel ? '0 0 8px rgba(255,215,0,0.25)' : 'none',
                            }}
                          >
                            {l.displayName}
                          </button>
                        )
                      })
                  }
                </div>
                {selectedLearnerId && (
                  <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'rgba(255,215,0,0.65)' }}>
                    ↓ Placing <strong style={{ color: '#FFD700' }}>{learners.find(l => l.learnerId === selectedLearnerId)?.displayName}</strong> — click any role slot
                    <button onClick={() => setSelectedLearnerId(null)} style={{ marginLeft: '0.75rem', fontFamily: 'inherit', fontSize: '0.75rem', padding: '1px 6px', background: 'transparent', border: '1px solid rgba(255,215,0,0.2)', color: 'rgba(255,215,0,0.45)', cursor: 'pointer' }}>cancel</button>
                  </div>
                )}
              </div>

              <div style={{ height: 1, background: 'rgba(255,215,0,0.1)', marginBottom: '1.25rem' }} />

              {/* Group buckets */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                {editingGroups.map((group, gi) => (
                  <div key={group.id} style={{ border: '1px solid rgba(255,215,0,0.2)', background: 'rgba(0,0,0,0.35)', minWidth: 195, flex: '0 0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.7rem', borderBottom: '1px solid rgba(255,215,0,0.12)' }}>
                      <span style={{ fontSize: '0.85rem', color: '#FFD700', letterSpacing: '2px' }}>GROUP {gi + 1}</span>
                      {editingGroups.length > 2 && (
                        <button onClick={() => handleRemoveGroup(group.id)} style={{ fontFamily: 'inherit', fontSize: '1rem', lineHeight: 1, padding: '0 0.3rem', background: 'transparent', border: 'none', color: 'rgba(255,215,0,0.35)', cursor: 'pointer' }}>×</button>
                      )}
                    </div>
                    {group.slots.map(slot => {
                      const isFilled = slot.learnerId !== null
                      const awaitingPlace = selectedLearnerId !== null
                      const isSelectedHere = slot.learnerId === selectedLearnerId
                      return (
                        <div
                          key={slot.role}
                          onClick={() => handleClickSlot(group.id, slot.role)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.35rem 0.7rem',
                            borderBottom: '1px solid rgba(255,215,0,0.06)',
                            cursor: 'pointer',
                            background: isSelectedHere ? 'rgba(255,215,0,0.14)' : isFilled ? 'rgba(255,215,0,0.06)' : awaitingPlace ? 'rgba(255,215,0,0.02)' : 'transparent',
                            outline: isSelectedHere ? '1px solid rgba(255,215,0,0.4)' : 'none',
                          }}
                        >
                          <span style={{ fontSize: '0.85rem', color: 'rgba(255,215,0,0.5)', width: 16, textAlign: 'center', flexShrink: 0 }}>{ROLE_ICONS[slot.role]}</span>
                          <span style={{ fontSize: '0.72rem', color: 'rgba(255,215,0,0.35)', letterSpacing: '1px', width: 68, flexShrink: 0 }}>
                            {slot.role === 'AngleChecker' ? 'ANGLE' : slot.role.toUpperCase()}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: isFilled ? 'rgba(255,255,255,0.85)' : 'rgba(255,215,0,0.2)', fontStyle: isFilled ? 'normal' : 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90 }}>
                            {isFilled ? slot.displayName : (awaitingPlace ? '· · ·' : 'empty')}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ))}

                <button
                  onClick={handleAddGroup}
                  style={{
                    fontFamily: 'inherit', fontSize: '0.9rem', letterSpacing: '2px',
                    padding: '0.5rem 1rem', alignSelf: 'flex-start', marginTop: '2.2rem',
                    background: 'transparent', border: '1px dashed rgba(255,215,0,0.25)',
                    color: 'rgba(255,215,0,0.45)', cursor: 'pointer',
                  }}
                >
                  + ADD GROUP
                </button>
              </div>

              {saveError && <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: '#ef4444' }}>{saveError}</div>}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button
                  onClick={handleSaveGroups}
                  disabled={saving}
                  style={{
                    fontFamily: 'inherit', fontSize: '1rem', letterSpacing: '2px',
                    padding: '0.5rem 2rem',
                    background: 'rgba(255,215,0,0.12)',
                    border: '1px solid rgba(255,215,0,0.5)',
                    color: '#FFD700', cursor: saving ? 'wait' : 'pointer',
                  }}
                >
                  {saving ? 'SAVING...' : 'CONFIRM & SAVE GROUPS'}
                </button>
                <button
                  onClick={resetGrouping}
                  style={{ fontFamily: 'inherit', fontSize: '0.9rem', padding: '0.5rem 1rem', background: 'transparent', border: '1px solid rgba(255,215,0,0.2)', color: 'rgba(255,215,0,0.5)', cursor: 'pointer' }}
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}

          {/* ── Mode: saved (read-only display of confirmed groups) ── */}
          {groupingMode === 'saved' && (
            <div>
              <div style={{ fontSize: '0.9rem', color: '#4ade80', marginBottom: '1.25rem', letterSpacing: '1px' }}>
                ✓ {savedGroups.length} GROUP{savedGroups.length !== 1 ? 'S' : ''} CONFIRMED — learners are ready for Phase III
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                {savedGroups.map(group => (
                  <div key={group.groupNumber} style={{ border: '1px solid rgba(74,222,128,0.2)', background: 'rgba(74,222,128,0.04)', minWidth: 190 }}>
                    <div style={{ padding: '0.4rem 0.75rem', borderBottom: '1px solid rgba(74,222,128,0.12)', fontSize: '0.85rem', color: '#4ade80', letterSpacing: '2px' }}>
                      GROUP {group.groupNumber}
                    </div>
                    {group.members.map(m => (
                      <div key={m.displayName} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.75rem', borderBottom: '1px solid rgba(255,215,0,0.06)', fontSize: '0.85rem' }}>
                        <span style={{ color: 'rgba(255,215,0,0.55)', width: 16, textAlign: 'center', flexShrink: 0 }}>{ROLE_ICONS[m.role]}</span>
                        <span style={{ color: 'rgba(255,255,255,0.85)', flex: 1 }}>{m.displayName}</span>
                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,215,0,0.35)', letterSpacing: '1px' }}>{m.role === 'AngleChecker' ? 'ANGLE' : m.role.toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
