import React from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { usePageBackground } from '@/hooks/usePageBackground'
import { mockLearningTaskDetails } from '@/mockState'

const VT: React.CSSProperties = { fontFamily: "'VT323', monospace" }

export const AssignmentSubmitUI: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate   = useNavigate()
  usePageBackground('attendence') // reuse tavern background until a dedicated one is made

  const task = taskId ? mockLearningTaskDetails[taskId] : null

  return (
    <div className="theatrical-container" style={{ alignItems: 'flex-start', overflowY: 'auto' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="safe-zone"
        style={{ marginTop: '72px', marginBottom: '2rem', maxWidth: '720px', gap: '0.75rem' }}
      >

        {/* Page header */}
        <div style={{ textAlign: 'center', width: '100%', marginBottom: '0.5rem' }}>
          <p style={{ ...VT, fontSize: '0.8rem', letterSpacing: '5px', color: 'rgba(255,215,0,0.4)', margin: '0 0 0.2rem' }}>
            ◆ ─────── ◆
          </p>
          <h1 style={{ ...VT, fontSize: '2rem', letterSpacing: '4px', color: 'rgba(255,215,0,0.9)', margin: 0, textShadow: '1px 1px 0 rgba(0,0,0,0.6)' }}>
            SUBMISSION PORTAL
          </h1>
          <p style={{ ...VT, fontSize: '0.85rem', letterSpacing: '3px', color: 'rgba(255,215,0,0.35)', margin: '0.2rem 0 0' }}>
            ASSIGNMENT HAND-IN
          </p>
        </div>

        {task ? (
          <>
            {/* Task identity card */}
            <div style={{
              width: '100%', padding: '1rem 1.25rem',
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,215,0,0.25)',
            }}>
              <p style={{ ...VT, margin: '0 0 0.15rem', fontSize: '0.75rem', letterSpacing: '3px', color: 'rgba(255,215,0,0.35)' }}>
                {task.subject}
              </p>
              <h2 style={{ ...VT, margin: '0 0 0.5rem', fontSize: '1.4rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.9)' }}>
                {task.title}
              </h2>
              <div style={{ display: 'flex', gap: '2rem' }}>
                <div>
                  <p style={{ ...VT, margin: '0 0 0.1rem', fontSize: '0.7rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.3)' }}>SUBMISSION TYPE</p>
                  <p style={{ ...VT, margin: 0, fontSize: '0.95rem', color: 'rgba(255,215,0,0.65)' }}>{task.submissionType}</p>
                </div>
                <div>
                  <p style={{ ...VT, margin: '0 0 0.1rem', fontSize: '0.7rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.3)' }}>TOTAL MARKS</p>
                  <p style={{ ...VT, margin: 0, fontSize: '0.95rem', color: 'rgba(255,215,0,0.65)' }}>{task.totalMarks}</p>
                </div>
              </div>
            </div>

            {/* Placeholder submission form */}
            <div style={{
              width: '100%', padding: '1.25rem',
              background: 'rgba(0,0,0,0.45)',
              border: '1px solid rgba(255,215,0,0.15)',
              display: 'flex', flexDirection: 'column', gap: '1rem',
            }}>
              <p style={{ ...VT, margin: 0, fontSize: '0.75rem', letterSpacing: '3px', color: 'rgba(255,215,0,0.3)' }}>
                SUBMISSION FORM — COMING SOON
              </p>

              {/* File upload placeholder */}
              <div style={{
                border: '1px dashed rgba(255,215,0,0.2)',
                padding: '2rem',
                textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
              }}>
                <span style={{ fontSize: '2rem', color: 'rgba(255,215,0,0.2)' }}>⬆</span>
                <p style={{ ...VT, margin: 0, fontSize: '1rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.3)' }}>
                  FILE UPLOAD
                </p>
                <p style={{ ...VT, margin: 0, fontSize: '0.8rem', letterSpacing: '1px', color: 'rgba(255,215,0,0.18)' }}>
                  Drag and drop or click to browse — not yet active
                </p>
              </div>

              {/* Comment placeholder */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <p style={{ ...VT, margin: 0, fontSize: '0.75rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.3)' }}>
                  COMMENTS TO TEACHER (OPTIONAL)
                </p>
                <div style={{
                  height: '80px',
                  border: '1px solid rgba(255,215,0,0.15)',
                  background: 'rgba(255,255,255,0.03)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ ...VT, fontSize: '0.85rem', color: 'rgba(255,215,0,0.15)', letterSpacing: '1px' }}>
                    Text input — not yet active
                  </span>
                </div>
              </div>

              {/* Submit button placeholder */}
              <button
                disabled
                style={{
                  ...VT, fontSize: '1.2rem', letterSpacing: '3px',
                  padding: '0.6rem 2rem', alignSelf: 'flex-end',
                  background: 'rgba(255,215,0,0.06)',
                  border: '1px solid rgba(255,215,0,0.2)',
                  color: 'rgba(255,215,0,0.3)',
                  cursor: 'not-allowed',
                }}
              >
                SUBMIT ASSIGNMENT
              </button>
            </div>
          </>
        ) : (
          <div style={{
            width: '100%', padding: '2rem', textAlign: 'center',
            background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,215,0,0.15)',
          }}>
            <p style={{ ...VT, margin: 0, fontSize: '1.2rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.4)' }}>
              ASSIGNMENT NOT FOUND
            </p>
          </div>
        )}

        {/* Back button */}
        <button
          onClick={() => navigate('/attendence')}
          style={{
            ...VT, fontSize: '1.1rem', letterSpacing: '2px',
            padding: '0.5rem 2rem', background: 'transparent',
            border: '1px solid rgba(255,215,0,0.35)',
            color: 'rgba(255,215,0,0.6)', cursor: 'pointer',
            alignSelf: 'center', marginTop: '0.5rem',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.8)'; e.currentTarget.style.color = 'rgba(255,215,0,1)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.35)'; e.currentTarget.style.color = 'rgba(255,215,0,0.6)' }}
        >
          ◂ BACK TO REGISTER
        </button>

      </motion.div>
    </div>
  )
}
