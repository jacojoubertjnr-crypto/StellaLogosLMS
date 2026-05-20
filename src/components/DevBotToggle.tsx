import React from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useDevStore } from '@/stores/devStore'

const FONT = "'VT323', monospace"

export const DevBotToggle: React.FC = () => {
  const user = useAuthStore((s) => s.user)
  const { aiBotsEnabled, toggleAiBots } = useDevStore()

  if (!user) return null

  const on = aiBotsEnabled

  return (
    <div style={{
      position: 'fixed',
      bottom: '1rem',
      left: '1rem',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '3px',
      pointerEvents: 'auto',
    }}>
      <button
        onClick={toggleAiBots}
        title={on ? 'AI bots active — click to disable' : 'AI bots disabled — click to enable for testing'}
        style={{
          fontFamily: FONT,
          fontSize: '1rem',
          letterSpacing: '1.5px',
          padding: '3px 12px',
          cursor: 'pointer',
          background: on ? 'rgba(100,220,100,0.10)' : 'rgba(255,100,0,0.07)',
          border: `1px dashed ${on ? 'rgba(100,220,100,0.55)' : 'rgba(255,100,0,0.45)'}`,
          color: on ? 'rgba(100,220,100,0.85)' : 'rgba(255,130,0,0.65)',
          transition: 'all 0.2s',
        }}
      >
        DEV · AI BOTS {on ? 'ON ●' : 'OFF ○'}
      </button>
      {on && (
        <span style={{
          fontFamily: FONT,
          fontSize: '0.85rem',
          color: 'rgba(100,220,100,0.5)',
          letterSpacing: '0.5px',
          paddingLeft: '2px',
        }}>
          teacher help API active
        </span>
      )}
    </div>
  )
}
