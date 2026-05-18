import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery, gql } from '@apollo/client'
import { usePageBackground } from '@/hooks/usePageBackground'

const MY_LEDGER = gql`
  query MyLedger {
    myLedger(limit: 100) { id delta reason meta createdAt }
    me { pointsBalance }
  }
`

const VT: React.CSSProperties = { fontFamily: "'VT323', monospace" }
const GOLD = 'rgba(255,215,0,0.9)'

const REASON_LABEL: Record<string, string> = {
  step_complete: 'STEP COMPLETE',
  quest_bonus:   'QUEST BONUS',
  purchase:      'SHOP PURCHASE',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' · '
    + d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
}

function parseMeta(raw: string | null): string | null {
  if (!raw) return null
  try {
    const obj = JSON.parse(raw)
    if (obj.itemName) return obj.itemName
    if (obj.step) return `Step ${obj.step}`
    return null
  } catch {
    return null
  }
}

interface LedgerEntry {
  id: string
  delta: number
  reason: string
  meta: string | null
  createdAt: string
}

export const LedgerUI: React.FC = () => {
  const navigate = useNavigate()
  usePageBackground('home')

  const { data, loading } = useQuery<{
    myLedger: LedgerEntry[]
    me: { pointsBalance: number }
  }>(MY_LEDGER, { fetchPolicy: 'cache-and-network' })

  const entries = data?.myLedger ?? []
  const balance = data?.me?.pointsBalance ?? 0

  return (
    <div className="theatrical-container" style={{ alignItems: 'flex-start', overflowY: 'auto' }}>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="safe-zone"
        style={{ marginTop: '72px', marginBottom: '2rem', maxWidth: '620px', gap: '1rem' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <button
            className="btn-9slice"
            onClick={() => navigate('/home')}
            style={{ fontFamily: "'VT323', monospace", letterSpacing: '2px' }}
          >
            ◂ BACK
          </button>
          <span style={{ ...VT, fontSize: '1.6rem', letterSpacing: '4px', color: GOLD }}>POINTS HISTORY</span>
          <span style={{ ...VT, fontSize: '1.2rem', letterSpacing: '2px', color: GOLD }}>
            ★ {balance.toLocaleString()}
          </span>
        </div>

        {/* Ledger list */}
        <div style={{
          width: '100%',
          background: 'var(--color-pane-bg, rgba(0,0,0,0.45))',
          border: '1px solid rgba(255,215,0,0.2)',
          overflow: 'hidden',
        }}>
          {loading && entries.length === 0 && (
            <p style={{ ...VT, textAlign: 'center', color: 'rgba(255,215,0,0.4)', padding: '2rem', fontSize: '1.2rem', letterSpacing: '2px' }}>
              LOADING...
            </p>
          )}

          {!loading && entries.length === 0 && (
            <p style={{ ...VT, textAlign: 'center', color: 'rgba(255,215,0,0.4)', padding: '2rem', fontSize: '1.2rem', letterSpacing: '2px' }}>
              NO TRANSACTIONS YET
            </p>
          )}

          {entries.map((entry, i) => {
            const isPos = entry.delta > 0
            const detail = parseMeta(entry.meta)
            return (
              <div
                key={entry.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.7rem 1.1rem',
                  borderBottom: i < entries.length - 1 ? '1px solid rgba(255,215,0,0.08)' : 'none',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,215,0,0.02)',
                }}
              >
                {/* Left: reason + detail + date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                  <span style={{ ...VT, fontSize: '1.1rem', letterSpacing: '1.5px', color: 'rgba(255,215,0,0.85)' }}>
                    {REASON_LABEL[entry.reason] ?? entry.reason.toUpperCase()}
                    {detail && (
                      <span style={{ color: 'rgba(255,215,0,0.45)', marginLeft: '0.5rem', fontSize: '0.95rem' }}>
                        · {detail}
                      </span>
                    )}
                  </span>
                  <span style={{ ...VT, fontSize: '0.8rem', letterSpacing: '1px', color: 'rgba(255,215,0,0.3)' }}>
                    {formatDate(entry.createdAt)}
                  </span>
                </div>

                {/* Right: delta */}
                <span style={{
                  ...VT,
                  fontSize: '1.3rem',
                  letterSpacing: '1px',
                  fontWeight: 700,
                  color: isPos ? 'rgba(100,255,130,0.95)' : 'rgba(255,80,80,0.9)',
                  textShadow: isPos
                    ? '0 0 8px rgba(100,255,130,0.5)'
                    : '0 0 8px rgba(255,80,80,0.4)',
                  minWidth: '80px',
                  textAlign: 'right',
                }}>
                  {isPos ? `+${entry.delta}` : entry.delta} PTS
                </span>
              </div>
            )
          })}
        </div>

        {entries.length > 0 && (
          <p style={{ ...VT, fontSize: '0.8rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.25)', textAlign: 'center', margin: 0 }}>
            SHOWING LAST {entries.length} TRANSACTIONS
          </p>
        )}
      </motion.div>
    </div>
  )
}
