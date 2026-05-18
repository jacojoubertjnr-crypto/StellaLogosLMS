import React, { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, gql } from '@apollo/client'

const MY_TEACHER_MESSAGES = gql`
  query MyTeacherMessages {
    myTeacherMessages(limit: 40) {
      id
      senderName
      body
      sentAt
      fromMe
    }
  }
`

const SEND_TO_TEACHER = gql`
  mutation SendToTeacher($body: String!) {
    sendToTeacher(body: $body) {
      id
      senderName
      body
      sentAt
      fromMe
    }
  }
`

interface DirectMessage {
  id: string
  senderName: string
  body: string
  sentAt: string
  fromMe: boolean
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export const TeacherChatBar: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [lastSeenCount, setLastSeenCount] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data, refetch } = useQuery<{ myTeacherMessages: DirectMessage[] }>(
    MY_TEACHER_MESSAGES,
    { pollInterval: 5000 },
  )

  // Messages come back newest-first; reverse for display
  const messages = [...(data?.myTeacherMessages ?? [])].reverse()

  const unread = Math.max(0, messages.length - lastSeenCount)

  const [sendToTeacher, { loading: sending }] = useMutation(SEND_TO_TEACHER, {
    onCompleted: () => refetch(),
  })

  // Scroll to bottom and mark as read when panel opens
  useEffect(() => {
    if (open) {
      setLastSeenCount(messages.length)
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
      }, 50)
    }
  }, [open, messages.length])

  // Auto-scroll on new messages while panel is open
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
      setLastSeenCount(messages.length)
    }
  }, [messages.length, open])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || sending) return
    sendToTeacher({ variables: { body: trimmed } })
    setInput('')
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // Determine teacher name from messages (first message not from me)
  const teacherName = messages.find(m => !m.fromMe)?.senderName ?? 'Your Teacher'

  return (
    <div style={{
      position: 'fixed',
      top: 52,
      left: 0,
      right: 0,
      zIndex: 95,
      fontFamily: "'VT323', monospace",
    }}>
      {/* ── Collapsed bar ── */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1rem',
          height: 36,
          background: 'rgba(0,0,0,0.92)',
          borderBottom: open
            ? '1px solid rgba(255,215,0,0.4)'
            : '1px solid rgba(255,215,0,0.15)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* Pulse dot */}
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#4ade80',
            display: 'inline-block',
            boxShadow: '0 0 5px #4ade80',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: '0.9rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.75)' }}>
            TEACHER CHANNEL
          </span>
          <span style={{ fontSize: '0.78rem', color: 'rgba(255,215,0,0.35)', letterSpacing: '1px' }}>
            · {teacherName}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Unread badge */}
          {unread > 0 && (
            <span style={{
              background: '#ef4444',
              color: '#fff',
              fontSize: '0.75rem',
              fontFamily: 'sans-serif',
              fontWeight: 700,
              borderRadius: '50%',
              width: 18, height: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {unread}
            </span>
          )}
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,215,0,0.4)' }}>
            {open ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* ── Expanded chat panel ── */}
      {open && (
        <div style={{
          background: 'rgba(0,0,0,0.95)',
          borderBottom: '2px solid rgba(255,215,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Message list */}
          <div
            ref={scrollRef}
            style={{
              height: 220,
              overflowY: 'auto',
              padding: '0.75rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            {messages.length === 0 && (
              <div style={{ color: 'rgba(255,215,0,0.25)', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem' }}>
                No messages yet. Send one to your teacher.
              </div>
            )}
            {messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.fromMe ? 'flex-end' : 'flex-start',
                }}
              >
                {/* Sender label + time */}
                <div style={{
                  fontSize: '0.7rem',
                  color: 'rgba(255,215,0,0.3)',
                  marginBottom: '0.15rem',
                  letterSpacing: '0.5px',
                }}>
                  {msg.fromMe ? 'YOU' : msg.senderName.toUpperCase()} · {formatTime(msg.sentAt)}
                </div>
                {/* Bubble */}
                <div style={{
                  maxWidth: '70%',
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.9rem',
                  lineHeight: 1.4,
                  background: msg.fromMe
                    ? 'rgba(255,215,0,0.12)'
                    : 'rgba(74,222,128,0.1)',
                  border: msg.fromMe
                    ? '1px solid rgba(255,215,0,0.25)'
                    : '1px solid rgba(74,222,128,0.3)',
                  color: msg.fromMe ? '#FFD700' : '#4ade80',
                  wordBreak: 'break-word',
                }}>
                  {msg.body}
                </div>
              </div>
            ))}
          </div>

          {/* Input row */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            padding: '0.6rem 1rem',
            borderTop: '1px solid rgba(255,215,0,0.1)',
            background: 'rgba(0,0,0,0.6)',
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Message your teacher..."
              style={{
                flex: 1,
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                padding: '0.35rem 0.6rem',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,215,0,0.2)',
                color: '#FFD700',
                outline: 'none',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              style={{
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                padding: '0.35rem 1rem',
                background: input.trim() ? 'rgba(255,215,0,0.12)' : 'transparent',
                border: '1px solid rgba(255,215,0,0.3)',
                color: input.trim() ? '#FFD700' : 'rgba(255,215,0,0.25)',
                cursor: input.trim() ? 'pointer' : 'default',
                letterSpacing: '1px',
                transition: 'all 0.15s',
              }}
            >
              {sending ? '...' : 'SEND'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
