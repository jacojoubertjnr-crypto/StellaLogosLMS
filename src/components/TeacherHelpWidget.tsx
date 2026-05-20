import React, { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useDevStore } from '@/stores/devStore'
import { callTeacherHelpApi, getPageContext, speakTeacherReply } from '@/lib/teacherHelpApi'

const FONT = "'VT323', monospace"

interface Message {
  id: number
  from: 'user' | 'teacher'
  text: string
}

const WELCOME: Message = {
  id: 0,
  from: 'teacher',
  text: "Good day! I'm Mr. van der Berg. Type any question about what you're working on and I'll help you out.",
}

export const TeacherHelpWidget: React.FC = () => {
  const user = useAuthStore(s => s.user)
  const { aiBotsEnabled } = useDevStore()
  const { pathname } = useLocation()

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [voiceOn, setVoiceOn] = useState(false)
  const [unread, setUnread] = useState(0)
  const nextId = useRef(1)
  const listRef = useRef<HTMLDivElement>(null)

  if (!user || user.role !== 'Learner') return null

  const addMsg = (msg: Omit<Message, 'id'>) => {
    const id = nextId.current++
    setMessages(prev => [...prev, { ...msg, id }])
    return id
  }

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  const handleOpen = () => {
    setOpen(true)
    setUnread(0)
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    addMsg({ from: 'user', text })
    setLoading(true)

    if (!aiBotsEnabled) {
      setTimeout(() => {
        addMsg({ from: 'teacher', text: '[Dev mode — AI bots disabled. Enable via the DEV toggle bottom-left to activate live responses.]' })
        setLoading(false)
        if (!open) setUnread(u => u + 1)
      }, 600)
      return
    }

    const token = sessionStorage.getItem('sl_token') ?? ''
    const ctx = getPageContext(pathname)
    try {
      const reply = await callTeacherHelpApi(ctx, text, user.displayName, token)
      addMsg({ from: 'teacher', text: reply })
      if (voiceOn) speakTeacherReply(reply)
      if (!open) setUnread(u => u + 1)
    } catch {
      addMsg({
        from: 'teacher',
        text: "I'm having trouble connecting right now. Please try again in a moment.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <>
      {/* Toggle button — fixed top-right below header */}
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        title="Chat with Mr. van der Berg"
        style={{
          position: 'fixed',
          top: '56px',
          right: '1rem',
          zIndex: 95,
          fontFamily: FONT,
          fontSize: '1rem',
          letterSpacing: '1.5px',
          padding: '3px 14px',
          background: open ? 'rgba(30,80,160,0.85)' : 'rgba(0,0,0,0.55)',
          border: `1px solid ${open ? 'rgba(100,180,255,0.7)' : 'rgba(100,180,255,0.35)'}`,
          color: open ? 'rgba(160,210,255,0.95)' : 'rgba(100,180,255,0.75)',
          cursor: 'pointer',
          transition: 'all 0.15s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        ? HELP
        {unread > 0 && !open && (
          <span style={{
            background: 'rgba(255,100,60,0.9)',
            color: '#fff',
            borderRadius: '50%',
            fontSize: '0.75rem',
            width: '18px', height: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}>
            {unread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed',
          top: '88px',
          right: '1rem',
          zIndex: 94,
          width: '340px',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-modal-bg, rgba(8,8,8,0.97))',
          border: '1px solid rgba(100,180,255,0.3)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
          fontFamily: FONT,
        }}>

          {/* Panel header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 12px',
            borderBottom: '1px solid rgba(100,180,255,0.2)',
            background: 'rgba(30,80,160,0.25)',
          }}>
            <span style={{ fontSize: '1.1rem', letterSpacing: '1.5px', color: 'rgba(160,210,255,0.9)' }}>
              MR. VAN DER BERG
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => {
                  const next = !voiceOn
                  setVoiceOn(next)
                  if (!next) window.speechSynthesis?.cancel()
                }}
                title={voiceOn ? 'Voice on — click to mute' : 'Voice off — click to enable'}
                style={{
                  fontFamily: FONT, fontSize: '1rem',
                  background: 'none', border: 'none',
                  color: voiceOn ? 'rgba(100,220,180,0.9)' : 'rgba(255,255,255,0.35)',
                  cursor: 'pointer', padding: '0 2px',
                }}
              >
                {voiceOn ? '🔊' : '🔇'}
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{
                  fontFamily: FONT, fontSize: '1rem',
                  background: 'none', border: 'none',
                  color: 'rgba(255,255,255,0.45)', cursor: 'pointer', padding: '0 2px',
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Message list */}
          <div
            ref={listRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              maxHeight: '340px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.from === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <span style={{
                  fontSize: '0.8rem',
                  letterSpacing: '0.5px',
                  color: msg.from === 'teacher' ? 'rgba(100,180,255,0.6)' : 'rgba(255,215,0,0.5)',
                  marginBottom: '2px',
                }}>
                  {msg.from === 'teacher' ? 'MR. VDB' : 'YOU'}
                </span>
                <div style={{
                  maxWidth: '90%',
                  padding: '6px 10px',
                  background: msg.from === 'teacher'
                    ? 'rgba(30,80,160,0.35)'
                    : 'rgba(255,215,0,0.08)',
                  border: `1px solid ${msg.from === 'teacher' ? 'rgba(100,180,255,0.2)' : 'rgba(255,215,0,0.2)'}`,
                  fontSize: '1rem',
                  lineHeight: '1.4',
                  letterSpacing: '0.5px',
                  color: msg.from === 'teacher' ? 'rgba(200,230,255,0.9)' : 'rgba(255,240,180,0.85)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{
                alignSelf: 'flex-start',
                fontSize: '0.95rem',
                color: 'rgba(100,180,255,0.5)',
                letterSpacing: '1px',
                padding: '4px 0',
              }}>
                MR. VDB is typing...
              </div>
            )}
          </div>

          {/* Input row */}
          <div style={{
            display: 'flex',
            gap: '6px',
            padding: '8px 10px',
            borderTop: '1px solid rgba(100,180,255,0.2)',
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask me anything..."
              disabled={loading}
              style={{
                flex: 1,
                fontFamily: FONT,
                fontSize: '1rem',
                letterSpacing: '0.5px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(100,180,255,0.3)',
                color: 'rgba(255,255,255,0.85)',
                padding: '4px 8px',
                outline: 'none',
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{
                fontFamily: FONT,
                fontSize: '1rem',
                letterSpacing: '1px',
                padding: '4px 12px',
                background: input.trim() && !loading ? 'rgba(30,80,160,0.7)' : 'rgba(30,80,160,0.2)',
                border: '1px solid rgba(100,180,255,0.4)',
                color: input.trim() && !loading ? 'rgba(160,210,255,0.9)' : 'rgba(100,180,255,0.3)',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                transition: 'all 0.15s',
              }}
            >
              SEND
            </button>
          </div>
        </div>
      )}
    </>
  )
}
