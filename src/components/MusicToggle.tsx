import React from 'react'
import { useMusicStore } from '@/stores/musicStore'

interface MusicToggleProps {
  /** 'fixed' = bottom-right corner overlay; 'inline' = renders in flow */
  variant?: 'fixed' | 'inline'
}

const FIXED_STYLE: React.CSSProperties = {
  position: 'fixed',
  bottom: '1rem',
  right: '1rem',
  zIndex: 100,
}

export const MusicToggle: React.FC<MusicToggleProps> = ({ variant = 'fixed' }) => {
  const { isReady, isMuted, needsGesture, toggleMute, enable } = useMusicStore()

  if (!isReady && !needsGesture) return null

  const handleClick = () => {
    if (needsGesture) enable()
    else toggleMute()
  }

  const label = isMuted || needsGesture ? '♩' : '♪'
  const title = needsGesture ? 'Click to start music' : isMuted ? 'Unmute music' : 'Mute music'
  const dimmed = isMuted || needsGesture

  return (
    <button
      onClick={handleClick}
      title={title}
      style={{
        ...(variant === 'fixed' ? FIXED_STYLE : {}),
        fontFamily: "'VT323', monospace",
        fontSize: '1.4rem',
        lineHeight: 1,
        width: '36px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)',
        border: `1px solid ${dimmed ? 'rgba(255,215,0,0.4)' : 'rgba(255,215,0,0.6)'}`,
        color: dimmed ? 'rgba(255,215,0,0.4)' : 'rgba(255,215,0,0.85)',
        cursor: 'pointer',
        transition: 'color 0.2s, border-color 0.2s',
        padding: 0,
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,215,0,0.9)'
        e.currentTarget.style.color = 'rgba(255,215,0,1)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = dimmed ? 'rgba(255,215,0,0.4)' : 'rgba(255,215,0,0.6)'
        e.currentTarget.style.color = dimmed ? 'rgba(255,215,0,0.4)' : 'rgba(255,215,0,0.85)'
      }}
    >
      {label}
    </button>
  )
}
