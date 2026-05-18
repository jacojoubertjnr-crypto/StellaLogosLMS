import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, gql } from '@apollo/client'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { usePageBackground } from '@/hooks/usePageBackground'

const VT: React.CSSProperties = { fontFamily: "'VT323', monospace" }
const GOLD = '#FFD700'

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const STAFFROOM_STATE = gql`
  query StaffroomState { staffroomState { speakerId speakerName } }
`
const STAFF_MESSAGES = gql`
  query StaffMessages($limit: Int) {
    staffMessages(limit: $limit) { id senderId senderName body isSpeakerPost sentAt }
  }
`
const SPEAKER_MESSAGES = gql`
  query SpeakerMessages($limit: Int) {
    speakerMessages(limit: $limit) { id senderId senderName body isSpeakerPost sentAt }
  }
`
const ALL_ANNOUNCEMENTS = gql`
  query AllAnnouncements {
    allAnnouncements { id createdById createdBy body target pinned createdAt }
  }
`
const ALL_STAFF = gql`
  query AllStaff { allStaff { id displayName role } }
`

const SEND_STAFF_MESSAGE = gql`
  mutation SendStaffMessage($body: String!, $isSpeakerPost: Boolean) {
    sendStaffMessage(body: $body, isSpeakerPost: $isSpeakerPost) {
      id senderId senderName body isSpeakerPost sentAt
    }
  }
`
const CREATE_ANNOUNCEMENT = gql`
  mutation CreateAnnouncement($body: String!, $target: String!) {
    createAnnouncement(body: $body, target: $target) {
      id createdById createdBy body target pinned createdAt
    }
  }
`
const PIN_ANNOUNCEMENT = gql`
  mutation PinAnnouncement($id: ID!, $pinned: Boolean!) {
    pinAnnouncement(id: $id, pinned: $pinned) { id pinned }
  }
`
const DELETE_ANNOUNCEMENT = gql`
  mutation DeleteAnnouncement($id: ID!) { deleteAnnouncement(id: $id) }
`
const ASSIGN_PODIUM = gql`
  mutation AssignPodium($userId: ID) {
    assignPodium(userId: $userId) { speakerId speakerName }
  }
`

// ─── Types ───────────────────────────────────────────────────────────────────

interface StaffMessage { id: string; senderId: string; senderName: string; body: string; isSpeakerPost: boolean; sentAt: string }
interface Announcement { id: string; createdById: string; createdBy: string; body: string; target: string; pinned: boolean; createdAt: string }
interface StaffroomState { speakerId: string | null; speakerName: string | null }
interface BasicUser { id: string; displayName: string; role: string }

// ─── ExpandingCard (bar + inline downward expansion) ─────────────────────────

const ExpandingCard: React.FC<{
  title: string
  badge?: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}> = ({ title, badge, isOpen, onToggle, children }) => (
  <div style={{ width: '100%', border: '1px solid rgba(255,215,0,0.2)', background: 'var(--color-pane-bg, rgba(0,0,0,0.45))' }}>
    {/* Clickable bar */}
    <div
      onClick={onToggle}
      style={{
        ...VT,
        height: '52px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 1.25rem',
        cursor: 'pointer', width: '100%',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.05)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden' }}>
        <span style={{ fontSize: '1.3rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.85)', flexShrink: 0 }}>{title}</span>
        {badge && (
          <span style={{ fontSize: '0.9rem', letterSpacing: '1px', color: 'rgba(255,215,0,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {badge}
          </span>
        )}
      </div>
      <span style={{
        fontSize: '1.1rem', color: 'rgba(255,215,0,0.45)', flexShrink: 0,
        display: 'inline-block',
        transform: isOpen ? 'rotate(90deg)' : 'none',
        transition: 'transform 0.2s',
      }}>▶</span>
    </div>

    {/* Inline downward expansion */}
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={{ overflow: 'hidden' }}
        >
          <div style={{
            padding: '1rem 1.25rem 1.25rem',
            borderTop: '1px solid rgba(255,215,0,0.12)',
            display: 'flex', flexDirection: 'column', gap: '0.75rem',
          }}>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
)

// ─── ChatThread (auto-scroll to bottom) ──────────────────────────────────────

const ChatThread: React.FC<{
  messages: StaffMessage[]
  currentUserId: string
  showSpeakerBadge?: boolean
}> = ({ messages, currentUserId, showSpeakerBadge }) => {
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (!messages.length) {
    return (
      <div style={{ ...VT, color: 'rgba(255,215,0,0.25)', fontSize: '1rem', letterSpacing: '1px', padding: '1rem 0', textAlign: 'center' }}>
        No messages yet.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {messages.map(msg => {
        const fromMe = msg.senderId === currentUserId
        const time = new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        return (
          <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: fromMe ? 'flex-end' : 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '2px' }}>
              {showSpeakerBadge && msg.isSpeakerPost && (
                <span style={{ fontSize: '0.85rem', color: GOLD }}>🎙</span>
              )}
              <span style={{ ...VT, fontSize: '0.85rem', letterSpacing: '1px', color: 'rgba(255,215,0,0.4)' }}>
                {fromMe ? 'YOU' : msg.senderName.toUpperCase()}
              </span>
              <span style={{ ...VT, fontSize: '0.75rem', color: 'rgba(255,215,0,0.22)' }}>{time}</span>
            </div>
            <div style={{
              ...VT,
              fontSize: '1rem', letterSpacing: '1px', lineHeight: 1.4,
              background: fromMe ? 'rgba(255,215,0,0.10)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${fromMe ? 'rgba(255,215,0,0.25)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '2px',
              padding: '0.4rem 0.75rem',
              maxWidth: '80%',
              color: fromMe ? 'rgba(255,215,0,0.9)' : 'rgba(255,255,255,0.8)',
              wordBreak: 'break-word',
            }}>
              {msg.body}
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}

// ─── MessageInput ─────────────────────────────────────────────────────────────

const MessageInput: React.FC<{
  placeholder?: string
  onSend: (body: string) => void
  disabled?: boolean
  loading?: boolean
}> = ({ placeholder = 'Type a message…', onSend, disabled, loading }) => {
  const [text, setText] = useState('')

  const submit = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled || loading) return
    onSend(trimmed)
    setText('')
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          ...VT, flex: 1,
          fontSize: '1rem', letterSpacing: '1px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,215,0,0.25)',
          color: 'rgba(255,215,0,0.9)',
          padding: '0.45rem 0.75rem',
          outline: 'none',
        }}
      />
      <button
        onClick={submit}
        disabled={!text.trim() || disabled || loading}
        style={{
          ...VT, fontSize: '1rem', letterSpacing: '2px',
          padding: '0 1.25rem',
          background: 'rgba(255,215,0,0.08)',
          border: '1px solid rgba(255,215,0,0.35)',
          color: GOLD,
          cursor: 'pointer',
          opacity: (!text.trim() || disabled || loading) ? 0.4 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        SEND
      </button>
    </div>
  )
}

// ─── RosterStrip ──────────────────────────────────────────────────────────────

const RosterStrip: React.FC<{ staff: BasicUser[]; currentUserId: string }> = ({ staff, currentUserId }) => (
  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
    {staff.map(s => {
      const isMe = s.id === currentUserId
      const initials = s.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
      return (
        <div key={s.id} title={s.displayName} style={{
          display: 'flex', alignItems: 'center', gap: '0.35rem',
          padding: '0.2rem 0.6rem',
          background: isMe ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isMe ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '2px',
        }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />
          <span style={{ ...VT, fontSize: '0.85rem', letterSpacing: '1px', color: isMe ? GOLD : 'rgba(255,255,255,0.65)' }}>
            {initials}
          </span>
        </div>
      )
    })}
  </div>
)

// ─── AnnouncementCard ─────────────────────────────────────────────────────────

const AnnouncementCard: React.FC<{
  a: Announcement
  currentUserId: string
  isAdmin: boolean
  onPin: (id: string, pinned: boolean) => void
  onDelete: (id: string) => void
}> = ({ a, currentUserId, isAdmin, onPin, onDelete }) => {
  const isOwn = a.createdById === currentUserId
  const canEdit = isOwn || isAdmin
  const date = new Date(a.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  const targetLabel = a.target === 'all' ? 'ALL LEARNERS' : `GR ${a.target.replace(/,/g, ', ')}`

  return (
    <div style={{
      ...VT,
      background: 'var(--color-pane-bg, rgba(0,0,0,0.45))',
      border: `1px solid ${a.pinned ? 'rgba(255,215,0,0.45)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: '2px',
      padding: '0.85rem 1rem',
      display: 'flex', flexDirection: 'column', gap: '0.4rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        {a.pinned && <span style={{ color: GOLD, fontSize: '0.9rem' }}>📌</span>}
        <span style={{ fontSize: '0.85rem', letterSpacing: '1px', color: 'rgba(255,215,0,0.55)' }}>
          {a.createdBy.toUpperCase()} · {date}
        </span>
        <span style={{
          fontSize: '0.8rem', letterSpacing: '1px', padding: '0.1rem 0.5rem',
          background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)',
          color: 'rgba(255,215,0,0.7)',
        }}>
          {targetLabel}
        </span>
        {canEdit && (
          <div style={{ display: 'flex', gap: '0.4rem', marginLeft: 'auto' }}>
            <button
              onClick={() => onPin(a.id, !a.pinned)}
              title={a.pinned ? 'Unpin' : 'Pin'}
              style={{ ...VT, fontSize: '0.85rem', background: 'transparent', border: '1px solid rgba(255,215,0,0.2)', color: 'rgba(255,215,0,0.5)', cursor: 'pointer', padding: '0.1rem 0.5rem' }}
            >
              {a.pinned ? 'UNPIN' : 'PIN'}
            </button>
            <button
              onClick={() => onDelete(a.id)}
              style={{ ...VT, fontSize: '0.85rem', background: 'transparent', border: '1px solid rgba(255,100,100,0.25)', color: 'rgba(255,100,100,0.5)', cursor: 'pointer', padding: '0.1rem 0.5rem' }}
            >
              DELETE
            </button>
          </div>
        )}
      </div>
      <div style={{ fontSize: '1rem', letterSpacing: '1px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.45 }}>
        {a.body}
      </div>
    </div>
  )
}

// ─── AnnouncementForm ─────────────────────────────────────────────────────────

const GRADE_OPTS = ['8', '9', '10', '11', '12']

const AnnouncementForm: React.FC<{ onPost: (body: string, target: string) => void; loading: boolean }> = ({ onPost, loading }) => {
  const [body, setBody] = useState('')
  const [mode, setMode] = useState<'all' | 'grades'>('all')
  const [grades, setGrades] = useState<string[]>([])
  const [open, setOpen] = useState(false)

  const toggleGrade = (g: string) =>
    setGrades(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])

  const submit = () => {
    const trimmed = body.trim()
    if (!trimmed) return
    const target = mode === 'all' ? 'all' : grades.join(',')
    if (mode === 'grades' && !grades.length) return
    onPost(trimmed, target)
    setBody('')
    setGrades([])
    setMode('all')
    setOpen(false)
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        style={{
          ...VT, fontSize: '1rem', letterSpacing: '2px',
          padding: '0.4rem 1rem',
          background: 'rgba(255,215,0,0.07)',
          border: '1px solid rgba(255,215,0,0.3)',
          color: 'rgba(255,215,0,0.7)',
          cursor: 'pointer', width: '100%', textAlign: 'left',
          marginBottom: open ? '0.75rem' : 0,
        }}
      >
        {open ? '▾' : '▸'} NEW ANNOUNCEMENT
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingBottom: '1rem' }}>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Write your announcement…"
                rows={3}
                style={{
                  ...VT, fontSize: '1rem', letterSpacing: '1px', resize: 'vertical',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,215,0,0.25)',
                  color: 'rgba(255,215,0,0.9)',
                  padding: '0.5rem 0.75rem', outline: 'none',
                }}
              />

              {/* Target selector */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ ...VT, fontSize: '0.9rem', letterSpacing: '1px', color: 'rgba(255,215,0,0.45)' }}>TARGET:</span>
                {(['all', 'grades'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    style={{
                      ...VT, fontSize: '0.9rem', letterSpacing: '1px',
                      padding: '0.2rem 0.75rem',
                      background: mode === m ? 'rgba(255,215,0,0.15)' : 'transparent',
                      border: `1px solid ${mode === m ? 'rgba(255,215,0,0.5)' : 'rgba(255,215,0,0.2)'}`,
                      color: mode === m ? GOLD : 'rgba(255,215,0,0.45)',
                      cursor: 'pointer',
                    }}
                  >
                    {m === 'all' ? 'ALL LEARNERS' : 'SELECT GRADES'}
                  </button>
                ))}
              </div>

              {mode === 'grades' && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {GRADE_OPTS.map(g => (
                    <button
                      key={g}
                      onClick={() => toggleGrade(g)}
                      style={{
                        ...VT, fontSize: '1rem', letterSpacing: '1px',
                        padding: '0.2rem 0.75rem',
                        background: grades.includes(g) ? 'rgba(255,215,0,0.15)' : 'transparent',
                        border: `1px solid ${grades.includes(g) ? 'rgba(255,215,0,0.5)' : 'rgba(255,215,0,0.15)'}`,
                        color: grades.includes(g) ? GOLD : 'rgba(255,215,0,0.4)',
                        cursor: 'pointer',
                      }}
                    >
                      GR {g}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={submit}
                disabled={!body.trim() || (mode === 'grades' && !grades.length) || loading}
                style={{
                  ...VT, fontSize: '1.05rem', letterSpacing: '2px',
                  padding: '0.45rem',
                  background: 'rgba(255,215,0,0.1)',
                  border: '1px solid rgba(255,215,0,0.4)',
                  color: GOLD,
                  cursor: 'pointer',
                  opacity: (!body.trim() || (mode === 'grades' && !grades.length) || loading) ? 0.4 : 1,
                }}
              >
                POST ANNOUNCEMENT
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── StaffroomUI ─────────────────────────────────────────────────────────────

export const StaffroomUI: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'Admin'
  const userId = user?.id ?? ''

  usePageBackground('home')

  // Section open state
  const [speakerOpen, setSpeakerOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [announcementsOpen, setAnnouncementsOpen] = useState(false)

  // Admin podium dropdown
  const [podiumTarget, setPodiumTarget] = useState<string>('')

  // Queries
  const { data: stateData, refetch: refetchState } = useQuery<{ staffroomState: StaffroomState }>(STAFFROOM_STATE, { pollInterval: 5000 })
  const { data: chatData, refetch: refetchChat } = useQuery<{ staffMessages: StaffMessage[] }>(STAFF_MESSAGES, { variables: { limit: 100 }, pollInterval: 5000 })
  const { data: speakerData, refetch: refetchSpeaker } = useQuery<{ speakerMessages: StaffMessage[] }>(SPEAKER_MESSAGES, { variables: { limit: 100 }, pollInterval: 5000 })
  const { data: announcementsData, refetch: refetchAnnouncements } = useQuery<{ allAnnouncements: Announcement[] }>(ALL_ANNOUNCEMENTS, { pollInterval: 10000 })
  const { data: staffData } = useQuery<{ allStaff: BasicUser[] }>(ALL_STAFF)

  // Mutations
  const [sendStaffMessage, { loading: sendingChat }] = useMutation(SEND_STAFF_MESSAGE)
  const [sendSpeakerMessage, { loading: sendingSpeaker }] = useMutation(SEND_STAFF_MESSAGE)
  const [createAnnouncement, { loading: creatingAnnouncement }] = useMutation(CREATE_ANNOUNCEMENT)
  const [pinAnnouncement] = useMutation(PIN_ANNOUNCEMENT)
  const [deleteAnnouncement] = useMutation(DELETE_ANNOUNCEMENT)
  const [assignPodium, { loading: assigningPodium }] = useMutation(ASSIGN_PODIUM)

  const state = stateData?.staffroomState
  const chatMessages = chatData?.staffMessages ?? []
  const speakerMessages = speakerData?.speakerMessages ?? []
  const announcements = announcementsData?.allAnnouncements ?? []
  const allStaff = staffData?.allStaff ?? []
  const isSpeaker = state?.speakerId === userId

  const handleSendChat = async (body: string) => {
    await sendStaffMessage({ variables: { body, isSpeakerPost: false } })
    refetchChat()
  }

  const handleSendSpeaker = async (body: string) => {
    await sendSpeakerMessage({ variables: { body, isSpeakerPost: true } })
    refetchSpeaker()
    refetchChat()
  }

  const handleAssignPodium = async (targetUserId: string | null) => {
    await assignPodium({ variables: { userId: targetUserId } })
    refetchState()
    setPodiumTarget('')
  }

  const handlePostAnnouncement = async (body: string, target: string) => {
    await createAnnouncement({ variables: { body, target } })
    refetchAnnouncements()
  }

  const handlePin = async (id: string, pinned: boolean) => {
    await pinAnnouncement({ variables: { id, pinned } })
    refetchAnnouncements()
  }

  const handleDelete = async (id: string) => {
    await deleteAnnouncement({ variables: { id } })
    refetchAnnouncements()
  }

  return (
    <div className="theatrical-container" style={{ alignItems: 'flex-start', overflowY: 'auto' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="safe-zone"
        style={{ marginTop: '72px', marginBottom: '2rem', maxWidth: '860px', gap: '0.75rem' }}
      >

        {/* Page title */}
        <div style={{ textAlign: 'center', width: '100%', marginBottom: '0.5rem' }}>
          <p style={{ ...VT, fontSize: '0.8rem', letterSpacing: '5px', color: 'rgba(255,215,0,0.4)', margin: '0 0 0.2rem' }}>◆ ─────── ◆</p>
          <h1 style={{ ...VT, fontSize: '2rem', letterSpacing: '4px', color: GOLD, margin: 0 }}>STAFFROOM</h1>
          <p style={{ ...VT, fontSize: '0.85rem', letterSpacing: '3px', color: 'rgba(255,215,0,0.35)', margin: '0.2rem 0 0' }}>
            {user?.displayName?.toUpperCase()} · {user?.role?.toUpperCase()}
          </p>
        </div>

        {/* ── Speaker Channel ── */}
        <ExpandingCard
          title="📢 SPEAKER CHANNEL"
          badge={state?.speakerId ? `🎙 ${state.speakerName?.toUpperCase()}` : 'PODIUM OPEN'}
          isOpen={speakerOpen}
          onToggle={() => setSpeakerOpen(!speakerOpen)}
        >
          {/* Podium banner */}
          <div style={{
            ...VT,
            padding: '0.6rem 1rem',
            background: state?.speakerId ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${state?.speakerId ? 'rgba(255,215,0,0.35)' : 'rgba(255,255,255,0.08)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem',
          }}>
            {state?.speakerId ? (
              <span style={{ fontSize: '1.1rem', letterSpacing: '1px', color: GOLD }}>🎙 {state.speakerName} · PODIUM ACTIVE</span>
            ) : (
              <span style={{ fontSize: '1.1rem', letterSpacing: '1px', color: 'rgba(255,255,255,0.35)' }}>PODIUM OPEN — no active speaker</span>
            )}
            {isAdmin && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={podiumTarget}
                  onChange={e => setPodiumTarget(e.target.value)}
                  style={{ ...VT, fontSize: '0.9rem', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,215,0,0.3)', color: 'rgba(255,215,0,0.8)', padding: '0.2rem 0.5rem' }}
                >
                  <option value="">— SELECT STAFF —</option>
                  {allStaff.map(s => <option key={s.id} value={s.id}>{s.displayName} ({s.role})</option>)}
                </select>
                <button
                  onClick={() => handleAssignPodium(podiumTarget || null)}
                  disabled={assigningPodium}
                  style={{ ...VT, fontSize: '0.9rem', letterSpacing: '2px', padding: '0.2rem 0.75rem', background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.35)', color: GOLD, cursor: 'pointer', opacity: assigningPodium ? 0.5 : 1 }}
                >
                  {podiumTarget ? 'GIVE PODIUM' : 'RELEASE PODIUM'}
                </button>
              </div>
            )}
            {isSpeaker && !isAdmin && (
              <button
                onClick={() => handleAssignPodium(null)}
                disabled={assigningPodium}
                style={{ ...VT, fontSize: '0.9rem', letterSpacing: '2px', padding: '0.2rem 0.75rem', background: 'transparent', border: '1px solid rgba(255,100,100,0.35)', color: 'rgba(255,150,150,0.8)', cursor: 'pointer' }}
              >
                RELEASE PODIUM
              </button>
            )}
          </div>

          {/* Speaker message stream */}
          <div style={{ maxHeight: '280px', overflowY: 'auto', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,215,0,0.1)', padding: '0.75rem' }}>
            <ChatThread messages={speakerMessages} currentUserId={userId} />
          </div>

          {isSpeaker && <MessageInput placeholder="Post to the speaker channel…" onSend={handleSendSpeaker} loading={sendingSpeaker} />}
          {!isSpeaker && !state?.speakerId && (
            <div style={{ ...VT, fontSize: '0.9rem', letterSpacing: '1px', color: 'rgba(255,215,0,0.25)', textAlign: 'center' }}>
              {isAdmin ? 'Assign the podium to enable the speaker channel.' : 'Waiting for the speaker channel to open.'}
            </div>
          )}
        </ExpandingCard>

        {/* ── Staff Chat ── */}
        <ExpandingCard
          title="💬 STAFF CHAT"
          badge={`${allStaff.length} STAFF`}
          isOpen={chatOpen}
          onToggle={() => setChatOpen(!chatOpen)}
        >
          <RosterStrip staff={allStaff} currentUserId={userId} />
          <div style={{ maxHeight: '280px', overflowY: 'auto', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,215,0,0.08)', padding: '0.75rem' }}>
            <ChatThread messages={chatMessages} currentUserId={userId} showSpeakerBadge />
          </div>
          <MessageInput placeholder="Message all staff…" onSend={handleSendChat} loading={sendingChat} />
        </ExpandingCard>

        {/* ── Announcements ── */}
        <ExpandingCard
          title="📋 ANNOUNCEMENTS"
          badge={`${announcements.length} POSTED`}
          isOpen={announcementsOpen}
          onToggle={() => setAnnouncementsOpen(!announcementsOpen)}
        >
          <AnnouncementForm onPost={handlePostAnnouncement} loading={creatingAnnouncement} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {announcements.length === 0 && (
              <div style={{ ...VT, fontSize: '1rem', letterSpacing: '1px', color: 'rgba(255,215,0,0.25)', textAlign: 'center', padding: '1rem 0' }}>
                No announcements yet.
              </div>
            )}
            {announcements.map(a => (
              <AnnouncementCard key={a.id} a={a} currentUserId={userId} isAdmin={isAdmin} onPin={handlePin} onDelete={handleDelete} />
            ))}
          </div>
        </ExpandingCard>

        {/* Back */}
        <button
          className="btn-9slice"
          onClick={() => navigate('/home')}
          style={{ fontFamily: "'VT323', monospace", letterSpacing: '2px' }}
        >
          ◂ HOME
        </button>

      </motion.div>
    </div>
  )
}
