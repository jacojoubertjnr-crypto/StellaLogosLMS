import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, gql } from '@apollo/client'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { usePageBackground } from '@/hooks/usePageBackground'

// ── GQL ──────────────────────────────────────────────────────────────────────

const MY_REGISTER_CLASS = gql`
  query MyRegisterClass {
    myRegisterClass {
      id name grade
      learners { learnerId displayName status markedAt }
    }
  }
`

const REGISTER_CHAT = gql`
  query RegisterChatMessages($registerClassId: ID!) {
    registerChatMessages(registerClassId: $registerClassId, limit: 60) {
      id senderId senderName body sentAt fromMe
    }
  }
`

const REGISTER_NOTICES = gql`
  query RegisterNotices($registerClassId: ID!) {
    registerNotices(registerClassId: $registerClassId) {
      id body pinned createdAt authorName
    }
  }
`

const MARK_ATTENDANCE = gql`
  mutation MarkAttendance($registerClassId: ID!, $learnerId: ID!, $status: String!) {
    markAttendance(registerClassId: $registerClassId, learnerId: $learnerId, status: $status) {
      learnerId status markedAt
    }
  }
`

const SEND_REGISTER_CHAT = gql`
  mutation SendRegisterChat($registerClassId: ID!, $body: String!) {
    sendRegisterChat(registerClassId: $registerClassId, body: $body) {
      id senderId senderName body sentAt fromMe
    }
  }
`

const CREATE_NOTICE = gql`
  mutation CreateNotice($registerClassId: ID!, $body: String!) {
    createNotice(registerClassId: $registerClassId, body: $body) {
      id body pinned createdAt authorName
    }
  }
`

const PIN_NOTICE = gql`
  mutation PinNotice($noticeId: ID!, $pinned: Boolean!) {
    pinNotice(noticeId: $noticeId, pinned: $pinned) { id pinned }
  }
`

const DELETE_NOTICE = gql`
  mutation DeleteNotice($noticeId: ID!) { deleteNotice(noticeId: $noticeId) }
`

const DISMISS_CLASS = gql`
  mutation DismissClass($registerClassId: ID!) {
    dismissClass(registerClassId: $registerClassId) { id body sentAt fromMe }
  }
`

// ── Types ─────────────────────────────────────────────────────────────────────

interface RegisterLearner { learnerId: string; displayName: string; status: string; markedAt: string | null }
interface ClassChatMessage { id: string; senderId: string; senderName: string; body: string; sentAt: string; fromMe: boolean }
interface Notice { id: string; body: string; pinned: boolean; createdAt: string; authorName: string }

const VT: React.CSSProperties = { fontFamily: "'VT323', monospace" }

// ── SmartContainer ────────────────────────────────────────────────────────────

const SmartContainer: React.FC<{
  title: string
  preview?: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}> = ({ title, preview, isOpen, onToggle, children }) => (
  <>
    <div
      onClick={onToggle}
      style={{
        ...VT,
        height: '52px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 1rem',
        background: 'rgba(0,0,0,0.55)',
        border: '1px solid rgba(255,215,0,0.2)',
        cursor: 'pointer', width: '100%',
        transition: 'border-color 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.5)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.2)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden' }}>
        <span style={{ fontSize: '1.3rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.85)', flexShrink: 0 }}>{title}</span>
        {preview && (
          <span style={{ fontSize: '0.9rem', letterSpacing: '1px', color: 'rgba(255,215,0,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {preview}
          </span>
        )}
      </div>
      <span style={{ fontSize: '1.1rem', color: 'rgba(255,215,0,0.45)', flexShrink: 0 }}>▶</span>
    </div>

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
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '80px 2rem 2rem',
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={e => e.stopPropagation()}
            style={{
              ...VT,
              background: 'var(--color-modal-bg)',
              border: '1px solid rgba(255,215,0,0.3)',
              width: '100%', maxWidth: '860px',
              maxHeight: '100%',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Panel header */}
            <div style={{
              position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0.6rem 3.5rem',
              borderBottom: '1px solid rgba(255,215,0,0.15)',
              flexShrink: 0,
            }}>
              <span style={{ ...VT, fontSize: '1.6rem', letterSpacing: '4px', color: 'rgba(255,215,0,1)', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                {title}
              </span>
              <button
                onClick={onToggle}
                style={{
                  ...VT, fontSize: '1rem', letterSpacing: '2px',
                  background: 'transparent', border: '1px solid rgba(255,215,0,0.3)',
                  color: 'rgba(255,215,0,0.6)', cursor: 'pointer', padding: '0.2rem 0.9rem',
                  position: 'absolute', right: '1rem',
                  transition: 'border-color 0.12s, color 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.8)'; e.currentTarget.style.color = '#FFD700' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.color = 'rgba(255,215,0,0.6)' }}
              >
                ✕ CLOSE
              </button>
            </div>

            {/* Scrollable content */}
            <div style={{ padding: '1.25rem 2rem 2rem', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </>
)

// ── Roll Call Content ─────────────────────────────────────────────────────────

const STATUS_CYCLE: Record<string, string> = { unmarked: 'present', present: 'late', late: 'absent', absent: 'present' }
const STATUS_COLOR: Record<string, string> = {
  unmarked: 'rgba(255,215,0,0.18)',
  present:  'rgba(74,222,128,0.7)',
  late:     'rgba(251,191,36,0.7)',
  absent:   'rgba(239,68,68,0.65)',
}
const STATUS_LABEL: Record<string, string> = { unmarked: '—', present: '✓ PRESENT', late: '⏱ LATE', absent: '✗ ABSENT' }

const RollCall: React.FC<{
  learners: RegisterLearner[]
  registerClassId: string
  onMark: (learnerId: string, status: string) => void
  marking: boolean
}> = ({ learners, registerClassId, onMark, marking }) => {
  const presentCount = learners.filter(l => l.status === 'present').length
  const lateCount    = learners.filter(l => l.status === 'late').length
  const absentCount  = learners.filter(l => l.status === 'absent').length
  const unmarkedCount = learners.filter(l => l.status === 'unmarked').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Summary strip */}
      <div style={{
        display: 'flex', gap: '1.5rem',
        padding: '0.5rem 0.75rem',
        background: 'rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,215,0,0.1)',
        fontSize: '1rem', color: 'rgba(255,215,0,0.6)',
      }}>
        <span>PRESENT: <strong style={{ color: '#4ade80' }}>{presentCount}</strong></span>
        <span>LATE: <strong style={{ color: '#fbbf24' }}>{lateCount}</strong></span>
        <span>ABSENT: <strong style={{ color: '#ef4444' }}>{absentCount}</strong></span>
        {unmarkedCount > 0 && <span style={{ marginLeft: 'auto', color: 'rgba(255,215,0,0.3)' }}>{unmarkedCount} UNMARKED</span>}
      </div>

      <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,215,0,0.3)', letterSpacing: '1px' }}>
        TAP A LEARNER TO CYCLE: PRESENT → LATE → ABSENT
      </p>

      {/* Learner grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
        {learners.map(l => {
          const color = STATUS_COLOR[l.status] ?? STATUS_COLOR.unmarked
          return (
            <button
              key={l.learnerId}
              onClick={() => !marking && onMark(l.learnerId, STATUS_CYCLE[l.status] ?? 'present')}
              disabled={marking}
              style={{
                ...VT,
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                padding: '0.6rem 0.75rem',
                background: 'rgba(0,0,0,0.5)',
                border: `2px solid ${color}`,
                cursor: marking ? 'wait' : 'pointer',
                textAlign: 'left',
                transition: 'border-color 0.15s',
              }}
            >
              <span style={{ fontSize: '1rem', color: '#FFD700', letterSpacing: '0.5px' }}>
                {l.displayName.toUpperCase()}
              </span>
              <span style={{ fontSize: '0.82rem', color: color, letterSpacing: '1px', marginTop: '0.15rem' }}>
                {STATUS_LABEL[l.status] ?? '—'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Class Chat Content ────────────────────────────────────────────────────────

const ClassChat: React.FC<{
  registerClassId: string
  learners: RegisterLearner[]
}> = ({ registerClassId, learners }) => {
  const { user } = useAuthStore()
  const [msg, setMsg] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data, refetch } = useQuery<{ registerChatMessages: ClassChatMessage[] }>(REGISTER_CHAT, {
    variables: { registerClassId },
    pollInterval: 4000,
  })
  const messages = data?.registerChatMessages ?? []

  const [sendChat, { loading: sending }] = useMutation(SEND_REGISTER_CHAT, {
    onCompleted: () => refetch(),
  })

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const handleSend = () => {
    const body = msg.trim()
    if (!body || sending) return
    sendChat({ variables: { registerClassId, body } })
    setMsg('')
  }

  const presentCount = learners.filter(l => l.status === 'present' || l.status === 'late').length

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
      {/* Roster strip */}
      <div style={{
        padding: '0.5rem 0.75rem',
        background: 'rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,215,0,0.1)',
        display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center',
      }}>
        <span style={{ fontSize: '0.9rem', color: 'rgba(255,215,0,0.5)', letterSpacing: '1px', marginRight: '0.25rem' }}>
          {presentCount} OF {learners.length} PRESENT
        </span>
        {learners.map(l => (
          <span key={l.learnerId} style={{
            fontSize: '0.8rem', color: '#FFD700', letterSpacing: '0.5px',
            display: 'flex', alignItems: 'center', gap: '0.3rem',
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: l.status === 'present' ? '#4ade80' : l.status === 'late' ? '#fbbf24' : l.status === 'absent' ? '#ef4444' : 'rgba(255,215,0,0.2)',
            }} />
            {l.displayName}
          </span>
        ))}
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}
      >
        {[...messages].reverse().map(m => (
          <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.fromMe ? 'flex-end' : 'flex-start' }}>
            {!m.fromMe && (
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,215,0,0.35)', marginBottom: '1px', letterSpacing: '0.5px' }}>
                {m.senderName}
              </span>
            )}
            <span style={{
              display: 'inline-block', maxWidth: '80%',
              padding: '0.25rem 0.65rem',
              background: m.fromMe ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${m.fromMe ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.12)'}`,
              color: m.fromMe ? 'rgba(255,215,0,0.9)' : 'rgba(220,220,220,0.85)',
              fontSize: '0.95rem', lineHeight: 1.4,
            }}>
              {m.body}
            </span>
            <span style={{ fontSize: '0.62rem', color: 'rgba(255,215,0,0.2)', marginTop: '1px' }}>
              {formatTime(m.sentAt)}
            </span>
          </div>
        ))}
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', opacity: 0.2, fontSize: '0.9rem', color: '#FFD700', marginTop: '2rem' }}>
            NO MESSAGES YET
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
        <input
          value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Message the class…"
          style={{
            ...VT, flex: 1, fontSize: '1rem',
            padding: '0.4rem 0.65rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,215,0,0.25)',
            color: '#FFD700', outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!msg.trim() || sending}
          style={{
            ...VT, fontSize: '1rem', padding: '0.4rem 1.1rem',
            background: msg.trim() ? 'rgba(255,215,0,0.12)' : 'transparent',
            border: '1px solid rgba(255,215,0,0.35)',
            color: msg.trim() ? '#FFD700' : 'rgba(255,215,0,0.25)',
            cursor: msg.trim() ? 'pointer' : 'default', letterSpacing: '2px',
          }}
        >
          {sending ? '…' : 'SEND'}
        </button>
      </div>
    </div>
  )
}

// ── Notice Board Content ──────────────────────────────────────────────────────

const NoticeBoard: React.FC<{ registerClassId: string }> = ({ registerClassId }) => {
  const [draft, setDraft] = useState('')

  const { data, refetch } = useQuery<{ registerNotices: Notice[] }>(REGISTER_NOTICES, {
    variables: { registerClassId },
    pollInterval: 10000,
  })
  const notices = data?.registerNotices ?? []

  const [createNotice, { loading: creating }] = useMutation(CREATE_NOTICE, { onCompleted: () => { refetch(); setDraft('') } })
  const [pinNotice]   = useMutation(PIN_NOTICE,    { onCompleted: () => refetch() })
  const [deleteNotice] = useMutation(DELETE_NOTICE, { onCompleted: () => refetch() })

  const handleCreate = () => {
    const body = draft.trim()
    if (!body || creating) return
    createNotice({ variables: { registerClassId, body } })
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getDate()} ${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getMonth()]} · ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  const pinned  = notices.filter(n => n.pinned)
  const unpinned = notices.filter(n => !n.pinned)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Compose row */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreate() } }}
          placeholder="New notice…"
          style={{
            ...VT, flex: 1, fontSize: '1rem',
            padding: '0.4rem 0.65rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,215,0,0.25)',
            color: '#FFD700', outline: 'none',
          }}
        />
        <button
          onClick={handleCreate}
          disabled={!draft.trim() || creating}
          style={{
            ...VT, fontSize: '1rem', padding: '0.4rem 1rem',
            background: draft.trim() ? 'rgba(255,215,0,0.12)' : 'transparent',
            border: '1px solid rgba(255,215,0,0.35)',
            color: draft.trim() ? '#FFD700' : 'rgba(255,215,0,0.25)',
            cursor: draft.trim() ? 'pointer' : 'default', letterSpacing: '2px',
            whiteSpace: 'nowrap',
          }}
        >
          {creating ? '…' : '+ POST'}
        </button>
      </div>

      {/* Pinned notices */}
      {pinned.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,215,0,0.35)', letterSpacing: '2px' }}>📌 PINNED</div>
          {pinned.map(n => <NoticeCard key={n.id} notice={n} onPin={() => pinNotice({ variables: { noticeId: n.id, pinned: false } })} onDelete={() => deleteNotice({ variables: { noticeId: n.id } })} formatDate={formatDate} />)}
        </div>
      )}

      {/* Unpinned notices */}
      {unpinned.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {pinned.length > 0 && <div style={{ fontSize: '0.72rem', color: 'rgba(255,215,0,0.25)', letterSpacing: '2px' }}>RECENT</div>}
          {unpinned.map(n => <NoticeCard key={n.id} notice={n} onPin={() => pinNotice({ variables: { noticeId: n.id, pinned: true } })} onDelete={() => deleteNotice({ variables: { noticeId: n.id } })} formatDate={formatDate} />)}
        </div>
      )}

      {notices.length === 0 && (
        <div style={{ textAlign: 'center', opacity: 0.2, fontSize: '0.95rem', color: '#FFD700', padding: '2rem 0' }}>
          NO NOTICES YET
        </div>
      )}
    </div>
  )
}

const NoticeCard: React.FC<{ notice: Notice; onPin: () => void; onDelete: () => void; formatDate: (iso: string) => string }> = ({ notice, onPin, onDelete, formatDate }) => (
  <div style={{
    padding: '0.75rem 1rem',
    background: notice.pinned ? 'rgba(255,215,0,0.05)' : 'rgba(0,0,0,0.35)',
    borderLeft: `3px solid ${notice.pinned ? 'rgba(255,215,0,0.6)' : 'rgba(255,215,0,0.2)'}`,
    display: 'flex', flexDirection: 'column', gap: '0.3rem',
  }}>
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem' }}>
      <span style={{ fontSize: '0.75rem', color: 'rgba(255,215,0,0.4)', letterSpacing: '1px' }}>
        {notice.authorName.toUpperCase()} · {formatDate(notice.createdAt)}
      </span>
      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
        <button
          onClick={onPin}
          style={{
            ...VT, fontSize: '0.75rem', padding: '0 0.5rem',
            background: 'transparent',
            border: `1px solid ${notice.pinned ? 'rgba(255,215,0,0.5)' : 'rgba(255,215,0,0.2)'}`,
            color: notice.pinned ? 'rgba(255,215,0,0.7)' : 'rgba(255,215,0,0.3)',
            cursor: 'pointer',
          }}
        >
          {notice.pinned ? 'UNPIN' : 'PIN'}
        </button>
        <button
          onClick={onDelete}
          style={{
            ...VT, fontSize: '0.75rem', padding: '0 0.5rem',
            background: 'transparent',
            border: '1px solid rgba(239,68,68,0.25)',
            color: 'rgba(239,68,68,0.45)',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
    </div>
    <p style={{ margin: 0, fontSize: '1rem', color: 'rgba(255,215,0,0.85)', lineHeight: 1.5 }}>
      {notice.body}
    </p>
  </div>
)

// ── Main Component ────────────────────────────────────────────────────────────

export const TeacherRegisterUI: React.FC = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  usePageBackground('attendence')

  const [openSection, setOpenSection] = useState<string | null>(null)
  const toggle = (key: string) => setOpenSection(prev => prev === key ? null : key)

  const { data: classData, refetch: refetchClass } = useQuery<{ myRegisterClass: { id: string; name: string; grade: number; learners: RegisterLearner[] } | null }>(MY_REGISTER_CLASS, {
    pollInterval: 10000,
  })
  const cls = classData?.myRegisterClass ?? null
  const learners = cls?.learners ?? []

  const [markAttendance, { loading: marking }] = useMutation(MARK_ATTENDANCE, {
    onCompleted: () => refetchClass(),
  })

  const [dismissClass, { loading: dismissing }] = useMutation(DISMISS_CLASS, {
    onCompleted: () => refetchClass(),
  })

  const handleMark = (learnerId: string, status: string) => {
    if (!cls) return
    markAttendance({ variables: { registerClassId: cls.id, learnerId, status } })
  }

  const presentCount = learners.filter(l => l.status === 'present').length
  const lateCount    = learners.filter(l => l.status === 'late').length
  const unmarkedCount = learners.filter(l => l.status === 'unmarked').length

  return (
    <div style={{ ...VT, height: '100vh', overflowY: 'auto' }}>

      {/* ── Sticky header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(8px)',
        borderBottom: '2px solid var(--color-accent, #FFD700)',
        padding: '0.6rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.75rem', letterSpacing: '3px', color: '#FFD700' }}>
            📋 REGISTER
          </h1>
          {cls && (
            <span style={{ fontSize: '1rem', color: 'rgba(255,215,0,0.5)' }}>
              {cls.name} · Grade {cls.grade}
            </span>
          )}
          <span style={{ fontSize: '0.85rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 6px #4ade80' }} />
            LIVE
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.9rem', color: 'rgba(255,215,0,0.4)' }}>
            {user?.displayName}
          </span>
          <button
            onClick={() => navigate('/teacherDashboard')}
            style={{
              ...VT, fontSize: '1rem', padding: '0.3rem 1rem',
              background: 'transparent',
              border: '1px solid rgba(255,215,0,0.35)',
              color: 'rgba(255,215,0,0.65)', cursor: 'pointer', letterSpacing: '2px',
            }}
          >
            DASHBOARD
          </button>
          <button
            onClick={() => { logout(); navigate('/') }}
            style={{
              ...VT, fontSize: '1rem', padding: '0.3rem 1rem',
              background: 'transparent',
              border: '1px solid rgba(255,215,0,0.2)',
              color: 'rgba(255,215,0,0.4)', cursor: 'pointer', letterSpacing: '2px',
            }}
          >
            LOGOUT
          </button>
        </div>
      </div>

      {/* ── No class assigned ── */}
      {!cls && (
        <div style={{ textAlign: 'center', padding: '5rem', opacity: 0.4, fontSize: '1.2rem', color: '#FFD700' }}>
          NO REGISTER CLASS ASSIGNED TO THIS ACCOUNT
        </div>
      )}

      {/* ── Main content ── */}
      {cls && (
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.5rem 1.5rem 4rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

          {/* Quick stats */}
          <div style={{
            display: 'flex', gap: '1.5rem',
            padding: '0.6rem 1rem',
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,215,0,0.12)',
            fontSize: '1rem', color: 'rgba(255,215,0,0.65)',
          }}>
            <span>ENROLLED: <strong style={{ color: '#FFD700' }}>{learners.length}</strong></span>
            <span>PRESENT: <strong style={{ color: '#4ade80' }}>{presentCount}</strong></span>
            <span>LATE: <strong style={{ color: '#fbbf24' }}>{lateCount}</strong></span>
            {unmarkedCount > 0 && (
              <span style={{ marginLeft: 'auto', color: 'rgba(255,215,0,0.3)' }}>
                {unmarkedCount} UNMARKED
              </span>
            )}
          </div>

          {/* Roll Call */}
          <SmartContainer
            title="ROLL CALL"
            preview={`${presentCount} present · ${lateCount} late · ${unmarkedCount} unmarked`}
            isOpen={openSection === 'rollcall'}
            onToggle={() => toggle('rollcall')}
          >
            <RollCall
              learners={learners}
              registerClassId={cls.id}
              onMark={handleMark}
              marking={marking}
            />
          </SmartContainer>

          {/* Class Chat */}
          <SmartContainer
            title="CLASS CHAT"
            preview={`${learners.length} learners · live`}
            isOpen={openSection === 'chat'}
            onToggle={() => toggle('chat')}
          >
            <ClassChat registerClassId={cls.id} learners={learners} />
          </SmartContainer>

          {/* Notice Board */}
          <SmartContainer
            title="NOTICE BOARD"
            preview="post · pin · delete"
            isOpen={openSection === 'notices'}
            onToggle={() => toggle('notices')}
          >
            <NoticeBoard registerClassId={cls.id} />
          </SmartContainer>

          {/* Dismiss button */}
          <div style={{ marginTop: '0.5rem' }}>
            <button
              onClick={() => cls && dismissClass({ variables: { registerClassId: cls.id } })}
              disabled={dismissing}
              style={{
                ...VT, width: '100%', fontSize: '1.25rem', letterSpacing: '3px',
                padding: '0.75rem',
                background: dismissing ? 'rgba(74,222,128,0.06)' : 'rgba(74,222,128,0.1)',
                border: '2px solid rgba(74,222,128,0.5)',
                color: '#4ade80',
                cursor: dismissing ? 'wait' : 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!dismissing) e.currentTarget.style.background = 'rgba(74,222,128,0.18)' }}
              onMouseLeave={e => { e.currentTarget.style.background = dismissing ? 'rgba(74,222,128,0.06)' : 'rgba(74,222,128,0.1)' }}
            >
              {dismissing ? 'SENDING…' : '🎒 DISMISS CLASS → FIRST LESSON'}
            </button>
          </div>

          {/* Back */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
            <button
              className="btn-9slice"
              onClick={() => navigate('/home')}
              style={{ fontFamily: "'VT323', monospace", letterSpacing: '2px' }}
            >
              ◂ HOME
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
