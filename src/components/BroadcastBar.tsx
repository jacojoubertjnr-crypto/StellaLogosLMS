import React, { useState } from 'react'
import { useMutation, gql } from '@apollo/client'

const SEND_BROADCAST = gql`
  mutation SendBroadcast($learnerIds: [ID!]!, $body: String!) {
    sendBroadcast(learnerIds: $learnerIds, body: $body)
  }
`

export interface BroadcastLearner {
  learnerId: string
  displayName: string
}

interface Props {
  learners: BroadcastLearner[]
}

export const BroadcastBar: React.FC<Props> = ({ learners }) => {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [text, setText] = useState('')
  const [flashMsg, setFlashMsg] = useState<string | null>(null)

  const allSelected = learners.length > 0 && selected.size === learners.length

  const [sendBroadcast, { loading }] = useMutation(SEND_BROADCAST, {
    onCompleted: (data) => {
      const count = data.sendBroadcast as number
      setFlashMsg(`✓ Sent to ${count} learner${count !== 1 ? 's' : ''}`)
      setText('')
      setSelected(new Set())
      setTimeout(() => setFlashMsg(null), 3000)
    },
  })

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(learners.map(l => l.learnerId)))
    }
  }

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || selected.size === 0 || loading) return
    sendBroadcast({ variables: { learnerIds: [...selected], body: trimmed } })
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const canSend = text.trim().length > 0 && selected.size > 0

  return (
    <div style={{ fontFamily: "'VT323', monospace" }}>

      {/* ── Collapsed strip ── */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1rem',
          height: 36,
          background: 'rgba(10,10,30,0.95)',
          borderBottom: open
            ? '1px solid rgba(100,160,255,0.4)'
            : '1px solid rgba(100,160,255,0.15)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1rem' }}>📢</span>
          <span style={{ fontSize: '0.9rem', letterSpacing: '2px', color: 'rgba(140,180,255,0.8)' }}>
            BROADCAST TO CLASS
          </span>
          {selected.size > 0 && !open && (
            <span style={{
              fontSize: '0.75rem',
              background: 'rgba(100,160,255,0.15)',
              border: '1px solid rgba(100,160,255,0.3)',
              color: 'rgba(140,180,255,0.7)',
              padding: '0 6px',
              letterSpacing: '1px',
            }}>
              {selected.size} SELECTED
            </span>
          )}
          {flashMsg && (
            <span style={{ fontSize: '0.8rem', color: '#4ade80', letterSpacing: '1px' }}>
              {flashMsg}
            </span>
          )}
        </div>
        <span style={{ fontSize: '0.8rem', color: 'rgba(140,180,255,0.35)' }}>
          {open ? '▲' : '▼'}
        </span>
      </div>

      {/* ── Expanded panel ── */}
      {open && (
        <div style={{
          background: 'rgba(5,5,25,0.97)',
          borderBottom: '2px solid rgba(100,160,255,0.25)',
          padding: '0.75rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
        }}>

          {/* Recipient selector row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', letterSpacing: '1px', color: 'rgba(140,180,255,0.45)', marginRight: '0.25rem' }}>
              TO:
            </span>

            {/* Select All chip */}
            <button
              onClick={toggleAll}
              style={{
                fontFamily: 'inherit',
                fontSize: '0.78rem',
                padding: '0.2rem 0.65rem',
                background: allSelected ? 'rgba(100,160,255,0.25)' : 'transparent',
                border: `1px solid ${allSelected ? 'rgba(100,160,255,0.6)' : 'rgba(100,160,255,0.25)'}`,
                color: allSelected ? 'rgba(180,210,255,0.95)' : 'rgba(140,180,255,0.5)',
                cursor: 'pointer',
                letterSpacing: '1px',
                transition: 'all 0.15s',
              }}
            >
              {allSelected ? '✓ ALL' : 'SELECT ALL'}
            </button>

            {/* Individual learner chips */}
            {learners.map(l => {
              const isChosen = selected.has(l.learnerId)
              return (
                <button
                  key={l.learnerId}
                  onClick={() => toggleOne(l.learnerId)}
                  style={{
                    fontFamily: 'inherit',
                    fontSize: '0.78rem',
                    padding: '0.2rem 0.65rem',
                    background: isChosen ? 'rgba(100,160,255,0.2)' : 'transparent',
                    border: `1px solid ${isChosen ? 'rgba(100,160,255,0.55)' : 'rgba(100,160,255,0.15)'}`,
                    color: isChosen ? 'rgba(180,210,255,0.9)' : 'rgba(140,180,255,0.4)',
                    cursor: 'pointer',
                    letterSpacing: '0.5px',
                    transition: 'all 0.15s',
                  }}
                >
                  {isChosen && <span style={{ marginRight: '0.3rem' }}>✓</span>}
                  {l.displayName}
                </button>
              )
            })}

            {learners.length === 0 && (
              <span style={{ fontSize: '0.8rem', color: 'rgba(140,180,255,0.25)' }}>
                No learners enrolled
              </span>
            )}
          </div>

          {/* Message input row */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder={
                selected.size === 0
                  ? 'Select recipients above first...'
                  : `Message to ${selected.size === learners.length ? 'all learners' : `${selected.size} learner${selected.size !== 1 ? 's' : ''}`}...`
              }
              disabled={selected.size === 0}
              style={{
                flex: 1,
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                padding: '0.4rem 0.65rem',
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${selected.size > 0 ? 'rgba(100,160,255,0.25)' : 'rgba(100,160,255,0.1)'}`,
                color: 'rgba(180,210,255,0.9)',
                outline: 'none',
                opacity: selected.size === 0 ? 0.4 : 1,
              }}
            />
            <button
              onClick={handleSend}
              disabled={!canSend || loading}
              style={{
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                padding: '0.4rem 1.25rem',
                background: canSend ? 'rgba(100,160,255,0.15)' : 'transparent',
                border: `1px solid ${canSend ? 'rgba(100,160,255,0.45)' : 'rgba(100,160,255,0.1)'}`,
                color: canSend ? 'rgba(180,210,255,0.9)' : 'rgba(140,180,255,0.2)',
                cursor: canSend ? 'pointer' : 'default',
                letterSpacing: '2px',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {loading
                ? 'SENDING...'
                : selected.size > 0
                ? `SEND TO ${selected.size === learners.length ? 'ALL' : selected.size}`
                : 'SEND'}
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
