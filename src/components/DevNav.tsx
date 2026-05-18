import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

// Only rendered when import.meta.env.DEV — stripped from production builds.

const PAGES = [
  { group: 'SHARED', items: [
    { label: 'Home',                path: '/home' },
    { label: 'Messages',            path: '/social' },
  ]},
  { group: 'TEACHER', items: [
    { label: 'Live Lesson',         path: '/teacherDashboard' },
    { label: 'My Classes',          path: '/classes' },
    { label: 'Register Period',     path: '/register' },
    { label: 'Staffroom',           path: '/staffroom' },
    { label: 'Task Manager',        path: '/task-manager' },
    { label: 'Task Creator (new)',  path: '/task-creator' },
    { label: 'Task Creator (edit)', path: '/task-creator/1' },
  ]},
  { group: 'LEARNER', items: [
    { label: 'Subjects',            path: '/subjects' },
    { label: 'Shop',                path: '/shop' },
    { label: 'Attendance',          path: '/attendence' },
    { label: 'Quest Screen',        path: '/learningtask' },
    { label: 'Learning Task UI',    path: '/task' },
    { label: 'Submit Assignment',   path: '/submit/demo' },
  ]},
]

export const DevNav: React.FC = () => {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const go = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '1rem',
      right: '1rem',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '0.5rem',
    }}>
      {open && (
        <div style={{
          background: '#0d1117',
          border: '1px solid #30363d',
          borderRadius: '8px',
          padding: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          minWidth: '200px',
          maxHeight: '70vh',
          overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
        }}>
          <span style={{ fontSize: '10px', letterSpacing: '2px', color: '#8b949e', fontFamily: 'monospace' }}>
            DEV NAV — {import.meta.env.MODE.toUpperCase()}
          </span>

          {PAGES.map(({ group, items }) => (
            <div key={group} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{
                fontSize: '10px', letterSpacing: '2px', color: '#58a6ff',
                fontFamily: 'monospace', marginTop: '4px',
              }}>
                {group}
              </span>
              {items.map(({ label, path }) => {
                const active = pathname === path || pathname.startsWith(path + '/')
                return (
                  <button
                    key={path}
                    onClick={() => go(path)}
                    style={{
                      background: active ? 'rgba(88,166,255,0.15)' : 'transparent',
                      border: `1px solid ${active ? 'rgba(88,166,255,0.4)' : 'transparent'}`,
                      borderRadius: '4px',
                      padding: '4px 8px',
                      color: active ? '#58a6ff' : '#c9d1d9',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                  >
                    {active ? '▶ ' : '  '}{label}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        title="Dev page navigator"
        style={{
          background: open ? '#58a6ff' : '#21262d',
          border: '1px solid #30363d',
          borderRadius: '6px',
          padding: '4px 10px',
          color: open ? '#000' : '#58a6ff',
          fontSize: '11px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          letterSpacing: '1px',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
          transition: 'all 0.15s',
        }}
      >
        {open ? '✕ DEV' : 'DEV'}
      </button>
    </div>
  )
}
