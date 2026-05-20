import React, { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useDevStore } from '@/stores/devStore'

const FONT = "'VT323', monospace"

type TestStatus = 'idle' | 'testing' | 'ok' | 'fail'

export const DevBotToggle: React.FC = () => {
  const user = useAuthStore((s) => s.user)
  const { aiBotsEnabled, setAiBots } = useDevStore()
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testDetail, setTestDetail] = useState('')
  const [showPopup, setShowPopup] = useState(false)

  if (!user) return null

  const runConnectivityTest = async () => {
    setTestStatus('testing')
    setTestDetail('')
    setShowPopup(true)

    const token = sessionStorage.getItem('sl_token') ?? ''
    if (!token) {
      setTestStatus('fail')
      setTestDetail('No auth token found — please log in again.')
      return
    }

    try {
      const res = await fetch('/teacher-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          pageContext: 'This is a connectivity test.',
          userMessage: 'Respond with exactly: CONNECTED',
          displayName: user.displayName,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string }
        setTestStatus('fail')
        setTestDetail(err.error ?? `HTTP ${res.status}`)
        return
      }

      const data = await res.json() as { reply?: string }
      setTestStatus('ok')
      setTestDetail(data.reply ?? 'OK')
      setAiBots(true)
    } catch (e) {
      setTestStatus('fail')
      setTestDetail(e instanceof Error ? e.message : 'Network error')
    }
  }

  const handleToggle = () => {
    if (aiBotsEnabled) {
      setAiBots(false)
      setTestStatus('idle')
      setShowPopup(false)
    } else {
      runConnectivityTest()
    }
  }

  const statusColor = {
    idle:    'rgba(255,130,0,0.65)',
    testing: 'rgba(255,215,0,0.8)',
    ok:      'rgba(100,220,100,0.85)',
    fail:    'rgba(220,80,80,0.9)',
  }[testStatus]

  const statusBg = {
    idle:    'rgba(255,100,0,0.07)',
    testing: 'rgba(255,215,0,0.07)',
    ok:      'rgba(100,220,100,0.10)',
    fail:    'rgba(220,80,80,0.10)',
  }[testStatus]

  const label = aiBotsEnabled
    ? 'DEV · AI BOTS ON ●'
    : testStatus === 'testing'
      ? 'DEV · TESTING...'
      : 'DEV · AI BOTS OFF ○'

  return (
    <div style={{
      position: 'fixed', bottom: '1rem', left: '1rem', zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px',
      pointerEvents: 'auto',
    }}>
      <button
        onClick={handleToggle}
        disabled={testStatus === 'testing'}
        style={{
          fontFamily: FONT, fontSize: '1rem', letterSpacing: '1.5px',
          padding: '3px 12px', cursor: testStatus === 'testing' ? 'default' : 'pointer',
          background: statusBg,
          border: `1px dashed ${statusColor}`,
          color: statusColor,
          transition: 'all 0.2s',
        }}
      >
        {label}
      </button>

      {/* Connectivity test popup */}
      {showPopup && (
        <div style={{
          fontFamily: FONT,
          fontSize: '0.9rem',
          letterSpacing: '0.5px',
          padding: '8px 12px',
          background: 'rgba(8,8,8,0.97)',
          border: `1px solid ${statusColor}`,
          color: statusColor,
          maxWidth: '280px',
          lineHeight: '1.4',
        }}>
          {testStatus === 'testing' && '⏳ Testing connection to Mr. Bot...'}
          {testStatus === 'ok' && (
            <>
              <div>✓ CONNECTION OK</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '3px' }}>
                Response: {testDetail.substring(0, 60)}
              </div>
              <div style={{ marginTop: '6px', fontSize: '0.8rem', opacity: 0.6 }}>
                AI bots are now active.
              </div>
              <button
                onClick={() => setShowPopup(false)}
                style={{ fontFamily: FONT, marginTop: '6px', fontSize: '0.85rem', background: 'none', border: 'none', color: 'rgba(100,220,100,0.6)', cursor: 'pointer', padding: 0 }}
              >
                DISMISS
              </button>
            </>
          )}
          {testStatus === 'fail' && (
            <>
              <div>✗ CONNECTION FAILED</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '3px', wordBreak: 'break-word' }}>
                {testDetail}
              </div>
              <div style={{ marginTop: '6px', fontSize: '0.8rem', opacity: 0.6 }}>
                AI bots remain OFF. Check that the backend is running.
              </div>
              <button
                onClick={() => setShowPopup(false)}
                style={{ fontFamily: FONT, marginTop: '6px', fontSize: '0.85rem', background: 'none', border: 'none', color: 'rgba(220,80,80,0.6)', cursor: 'pointer', padding: 0 }}
              >
                DISMISS
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
