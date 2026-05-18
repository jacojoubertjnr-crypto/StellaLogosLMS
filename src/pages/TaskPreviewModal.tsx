import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TaskDraft, HqlBlock } from './LearningTaskCreator'
import { parseQuiz, STEP_LABELS, BLOCK_META as HQL_BLOCK_META } from './LearningTaskCreator'
import type { GeneralDraft, GeneralBlock } from './GeneralTaskCreator'
import { BLOCK_META } from './GeneralTaskCreator'

const VT: React.CSSProperties = { fontFamily: "'VT323', monospace" }
const GOLD = '#FFD700'
const GOLD_DIM = 'rgba(255,215,0,0.5)'
const BORDER = 'rgba(255,215,0,0.2)'
const GREEN = '#4ade80'
const TEAL = 'rgba(80,220,200,0.85)'
const PURPLE = 'rgba(200,150,255,0.9)'
const BLUE = 'rgba(100,180,255,0.9)'
const AMBER = 'rgba(255,180,50,0.9)'
const ORANGE = 'rgba(255,100,80,0.9)'

const STEP_ICONS = ['◆', '⚡', '🪞', '📚', '❓', '💬', '✏']
const STEP_COLORS = [GOLD, ORANGE, PURPLE, BLUE, AMBER, TEAL, GREEN]

// ─── Shared primitives ────────────────────────────────────────────────────────

const PreviewCard: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${BORDER}`,
    borderRadius: '8px',
    padding: '1rem 1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    ...style,
  }}>
    {children}
  </div>
)

const TimePill: React.FC<{ min: number }> = ({ min }) => (
  <span style={{ ...VT, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', letterSpacing: '1px', padding: '0.15rem 0.6rem', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '20px', color: GOLD_DIM }}>
    ⏱ {min} MIN
  </span>
)

// ─── HQL step renderers ───────────────────────────────────────────────────────

const HqlStep0: React.FC<{ draft: TaskDraft }> = ({ draft }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
    <PreviewCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <span style={{ ...VT, fontSize: '0.72rem', letterSpacing: '3px', color: GOLD_DIM, background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '3px', padding: '0.1rem 0.5rem' }}>
          LEARNING TASK
        </span>
        {draft.subject && <span style={{ ...VT, fontSize: '0.72rem', letterSpacing: '2px', color: BLUE, background: 'rgba(100,180,255,0.08)', border: '1px solid rgba(100,180,255,0.2)', borderRadius: '3px', padding: '0.1rem 0.5rem' }}>{draft.subject}</span>}
        {draft.grade && <span style={{ ...VT, fontSize: '0.72rem', letterSpacing: '2px', color: BLUE, background: 'rgba(100,180,255,0.08)', border: '1px solid rgba(100,180,255,0.2)', borderRadius: '3px', padding: '0.1rem 0.5rem' }}>GRADE {draft.grade}</span>}
      </div>
      <h2 style={{ ...VT, margin: 0, fontSize: '1.9rem', letterSpacing: '3px', color: GOLD, lineHeight: 1.1 }}>
        {draft.title || <span style={{ opacity: 0.3 }}>TASK TITLE</span>}
      </h2>
    </PreviewCard>
    <PreviewCard>
      <span style={{ ...VT, fontSize: '0.85rem', letterSpacing: '2px', color: GOLD_DIM }}>ABOUT THIS TASK</span>
      <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
        This is a Highest Quality Learning task. You will move through six phases — each one builds on the last. Take your time at every step.
      </p>
    </PreviewCard>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
      {(draft.stepLabels ?? STEP_LABELS.slice(1)).map((label, i) => (
        <span key={label} style={{ ...VT, fontSize: '0.75rem', letterSpacing: '1px', padding: '0.2rem 0.6rem', background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '20px', color: STEP_COLORS[i + 1] }}>
          {STEP_ICONS[i + 1]} {label}
        </span>
      ))}
    </div>
  </div>
)

// Renders one HqlBlock in preview mode
const HqlBlockPreview: React.FC<{ block: HqlBlock; index: number }> = ({ block, index }) => {
  const meta = HQL_BLOCK_META[block.type]
  const FORMAT_LABELS: Record<string, string> = { video: '🎬 VIDEO', audio: '🎵 AUDIO', pdf: '📄 PDF/DOC', image: '🖼 IMAGE' }

  return (
    <PreviewCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
        <span style={{ ...VT, fontSize: '0.72rem', letterSpacing: '2px', color: GOLD_DIM, background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.15)', borderRadius: '3px', padding: '0.1rem 0.4rem' }}>{index + 1}</span>
        <span style={{ fontSize: '1rem' }}>{meta.icon}</span>
        <span style={{ ...VT, fontSize: '0.85rem', letterSpacing: '2px', color: GOLD_DIM }}>{block.title || meta.label}</span>
        {block.timeMin > 0 && <span style={{ marginLeft: 'auto' }}><TimePill min={block.timeMin} /></span>}
      </div>

      {(block.type === 'VIDEO' || block.type === 'DOCUMENT' || block.type === 'AUDIO') && (
        block.fileName
          ? <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {block.type === 'VIDEO' && <div style={{ width: '70px', height: '46px', background: 'rgba(255,100,80,0.15)', border: '1px solid rgba(255,100,80,0.3)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>▶</div>}
              {block.type !== 'VIDEO' && <span style={{ fontSize: '1.8rem' }}>{meta.icon}</span>}
              <div>
                <div style={{ ...VT, fontSize: '0.95rem', color: '#fff', letterSpacing: '1px' }}>{block.fileName}</div>
              </div>
            </div>
          : <span style={{ ...VT, fontSize: '0.85rem', color: GOLD_DIM, opacity: 0.5 }}>File not uploaded yet</span>
      )}

      {block.type === 'TEXT' && (
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {block.textContent || <span style={{ opacity: 0.35, fontStyle: 'italic' }}>No text yet</span>}
        </p>
      )}

      {block.type === 'REFLECTION' && (() => {
        const selected = block.reflectionQuestions.filter(q => q.checked)
        return selected.length === 0
          ? <span style={{ ...VT, color: GOLD_DIM, opacity: 0.5 }}>No questions selected yet</span>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {selected.map((q, i) => (
                <div key={q.id} style={{ padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '4px' }}>
                  <span style={{ ...VT, fontSize: '0.7rem', color: GOLD_DIM }}>Q{i + 1}</span>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{q.text}</p>
                  <div style={{ marginTop: '0.4rem', minHeight: '38px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)', borderRadius: '3px', padding: '0.3rem 0.6rem', color: 'rgba(255,255,255,0.18)', fontSize: '0.82rem', fontStyle: 'italic' }}>Learner types answer here…</div>
                </div>
              ))}
            </div>
      })()}

      {block.type === 'QUIZ' && (() => {
        const questions = parseQuiz(block.quizRaw)
        return questions.length === 0
          ? <span style={{ ...VT, color: GOLD_DIM, opacity: 0.5 }}>No quiz questions yet</span>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {questions.map(q => (
                <div key={q.number} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span style={{ ...VT, fontSize: '0.9rem', color: '#fff' }}>{q.number}. {q.text}</span>
                  {q.options.map(opt => (
                    <div key={opt.letter} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.6rem', background: opt.isCorrect ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${opt.isCorrect ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '4px' }}>
                      <span style={{ ...VT, color: opt.isCorrect ? GREEN : GOLD_DIM, minWidth: '18px' }}>{opt.letter}.</span>
                      <span style={{ fontSize: '0.88rem', color: opt.isCorrect ? '#fff' : 'rgba(255,255,255,0.55)', flex: 1 }}>{opt.text}</span>
                      {opt.isCorrect && <span style={{ ...VT, fontSize: '0.7rem', color: GREEN }}>✓</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
      })()}

      {block.type === 'DISCUSSION' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {block.textContent && <p style={{ margin: '0 0 0.25rem', fontSize: '0.88rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>{block.textContent}</p>}
          {[
            { icon: '①', label: 'COMPARE QUIZ ANSWERS', desc: 'Work through each question as a group.' },
            { icon: '②', label: 'COMPARE REFLECTIONS', desc: 'Share reflection answers and find consensus.' },
            { icon: '③', label: 'GROUP SOLUTION', desc: 'Collaborate on a single group answer.' },
          ].map(ph => (
            <div key={ph.label} style={{ display: 'flex', gap: '0.6rem', padding: '0.45rem 0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px' }}>
              <span style={{ ...VT, fontSize: '1.2rem', color: TEAL }}>{ph.icon}</span>
              <div>
                <div style={{ ...VT, fontSize: '0.82rem', letterSpacing: '2px', color: TEAL }}>{ph.label}</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>{ph.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {block.type === 'ASSIGNMENT' && (
        <>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {block.textContent || <span style={{ opacity: 0.35, fontStyle: 'italic' }}>No instructions yet</span>}
          </p>
          {Object.values(block.allowedFormats).some(Boolean) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
              {(Object.entries(block.allowedFormats) as [string, boolean][]).filter(([, v]) => v).map(([k]) => (
                <span key={k} style={{ ...VT, fontSize: '0.82rem', padding: '0.2rem 0.6rem', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: '4px', color: GREEN }}>{FORMAT_LABELS[k]}</span>
              ))}
            </div>
          )}
        </>
      )}
    </PreviewCard>
  )
}

// Renders all blocks for a given HQL step
const HqlStepPreview: React.FC<{ stepNumber: number; draft: TaskDraft }> = ({ stepNumber, draft }) => {
  const blocks = draft.stepBlocks[stepNumber] ?? []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {blocks.length === 0
        ? <PreviewCard style={{ opacity: 0.4, borderStyle: 'dashed' }}>
            <span style={{ ...VT, color: GOLD_DIM }}>No blocks added to this step yet</span>
          </PreviewCard>
        : blocks.map((block, i) => <HqlBlockPreview key={block.id} block={block} index={i} />)
      }
    </div>
  )
}

// ─── General block renderer ───────────────────────────────────────────────────

const GeneralBlockPreview: React.FC<{ block: GeneralBlock; index: number }> = ({ block, index }) => {
  const meta = BLOCK_META[block.type]
  const parsedQ = block.type === 'quiz' ? parseQuiz(block.quizRaw) : []
  const FORMAT_LABELS: Record<string, string> = { video: '🎬 VIDEO', audio: '🎵 AUDIO', pdf: '📄 PDF', image: '🖼 IMAGE' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Block header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.9rem', background: 'rgba(0,0,0,0.55)', borderBottom: `1px solid rgba(255,255,255,0.07)`, borderLeft: `3px solid ${meta.color}` }}>
        <span style={{ ...VT, fontSize: '0.72rem', letterSpacing: '2px', color: GOLD_DIM }}>{index + 1}</span>
        <span style={{ fontSize: '1rem' }}>{meta.icon}</span>
        <span style={{ ...VT, fontSize: '0.85rem', letterSpacing: '2px', color: meta.color }}>{meta.label}</span>
        {block.title && <span style={{ ...VT, fontSize: '0.85rem', letterSpacing: '1px', color: 'rgba(255,255,255,0.7)', marginLeft: '0.2rem' }}>— {block.title}</span>}
        {block.type !== 'note' && block.timeMin > 0 && <span style={{ marginLeft: 'auto' }}><TimePill min={block.timeMin} /></span>}
      </div>

      {/* Block body */}
      <div style={{ padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>

        {block.type === 'video' && (
          block.videoName ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '80px', height: '50px', background: 'rgba(100,160,255,0.15)', border: '1px solid rgba(100,160,255,0.3)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>▶</div>
              <div>
                <div style={{ ...VT, fontSize: '0.95rem', color: '#fff', letterSpacing: '1px' }}>{block.videoName}</div>
                {block.videoDescription && <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4, marginTop: '2px' }}>{block.videoDescription}</div>}
              </div>
            </div>
          ) : <span style={{ ...VT, color: GOLD_DIM, opacity: 0.5 }}>No video uploaded</span>
        )}

        {block.type === 'document' && (
          block.documentName ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '2rem' }}>📄</span>
              <div style={{ flex: 1 }}>
                <div style={{ ...VT, fontSize: '0.95rem', color: '#fff', letterSpacing: '1px' }}>{block.documentName}</div>
                {block.documentDescription && <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4, marginTop: '2px' }}>{block.documentDescription}</div>}
              </div>
              <button style={{ ...VT, fontSize: '0.8rem', padding: '0.25rem 0.75rem', background: 'rgba(255,215,0,0.1)', border: `1px solid rgba(255,215,0,0.2)`, borderRadius: '4px', color: GOLD_DIM, cursor: 'pointer' }}>OPEN ↗</button>
            </div>
          ) : <span style={{ ...VT, color: GOLD_DIM, opacity: 0.5 }}>No document uploaded</span>
        )}

        {block.type === 'quiz' && (
          parsedQ.length > 0 ? parsedQ.map(q => (
            <div key={q.number} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ ...VT, fontSize: '0.9rem', letterSpacing: '1px', color: '#fff' }}>{q.number}. {q.text}</span>
              {q.options.map(opt => (
                <div key={opt.letter} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.6rem', background: opt.isCorrect ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${opt.isCorrect ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '4px' }}>
                  <span style={{ ...VT, fontSize: '0.82rem', color: opt.isCorrect ? GREEN : GOLD_DIM, minWidth: '18px' }}>{opt.letter}.</span>
                  <span style={{ fontSize: '0.88rem', color: opt.isCorrect ? '#fff' : 'rgba(255,255,255,0.5)', flex: 1 }}>{opt.text}</span>
                  {opt.isCorrect && <span style={{ ...VT, fontSize: '0.72rem', color: GREEN }}>✓</span>}
                </div>
              ))}
            </div>
          )) : <span style={{ ...VT, color: GOLD_DIM, opacity: 0.5 }}>No quiz questions yet</span>
        )}

        {block.type === 'assignment' && <>
          <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {block.assignmentInstructions || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>No instructions yet</span>}
          </div>
          {(Object.entries(block.allowedFormats) as [string, boolean][]).some(([, v]) => v) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
              {(Object.entries(block.allowedFormats) as [string, boolean][]).filter(([, v]) => v).map(([k]) => (
                <span key={k} style={{ ...VT, fontSize: '0.8rem', padding: '0.2rem 0.6rem', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: '4px', color: GREEN }}>{FORMAT_LABELS[k]}</span>
              ))}
            </div>
          )}
        </>}

        {block.type === 'discussion' && (
          block.discussionPrompt
            ? <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{block.discussionPrompt}</p>
            : <span style={{ ...VT, color: GOLD_DIM, opacity: 0.5 }}>No discussion prompt</span>
        )}

        {block.type === 'note' && (
          <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.05)', borderLeft: '3px solid rgba(255,255,255,0.2)', borderRadius: '0 4px 4px 0' }}>
            <div style={{ ...VT, fontSize: '0.72rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.35)', marginBottom: '0.25rem' }}>📋 TEACHER NOTE</div>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
              {block.noteText || <span style={{ opacity: 0.5, fontStyle: 'italic' }}>No note text</span>}
            </p>
          </div>
        )}

        {block.type === 'embed' && (
          block.embedUrl ? <>
            {block.embedDescription && (
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{block.embedDescription}</p>
            )}
            <div style={{ background: 'rgba(80,220,200,0.07)', border: '1px solid rgba(80,220,200,0.25)', borderRadius: '5px', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🌐</span>
              <div style={{ ...VT, fontSize: '0.85rem', letterSpacing: '1px', color: TEAL }}>WEB EMBED</div>
              <div style={{ ...VT, fontSize: '0.72rem', color: GOLD_DIM, maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{block.embedUrl}</div>
              <span style={{ ...VT, fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Preview loads when task is active</span>
            </div>
          </> : <span style={{ ...VT, color: GOLD_DIM, opacity: 0.5 }}>No URL set</span>
        )}

      </div>
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

type PreviewProps =
  | { template: 'hql'; draft: TaskDraft; onClose: () => void }
  | { template: 'general'; draft: GeneralDraft; onClose: () => void }

export const TaskPreviewModal: React.FC<PreviewProps> = (props) => {
  const { onClose } = props
  const [activeStep, setActiveStep] = useState(0)

  const activeStepLabels = props.template === 'hql' ? (props.draft.stepLabels ?? STEP_LABELS.slice(1)) : []
  const hqlSteps = props.template === 'hql' ? [
    <HqlStep0 key={0} draft={props.draft} />,
    ...activeStepLabels.map((_, i) => (
      <HqlStepPreview key={i + 1} stepNumber={i + 1} draft={props.draft} />
    )),
  ] : []

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column' }}
      onClick={onClose}
    >
      {/* ── Header ── */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ height: '52px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.25rem', borderBottom: `1px solid ${BORDER}`, background: 'rgba(0,0,0,0.85)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', overflow: 'hidden' }}>
          <span style={{ ...VT, flexShrink: 0, fontSize: '0.65rem', letterSpacing: '2px', padding: '0.15rem 0.6rem', background: 'rgba(80,220,200,0.15)', border: '1px solid rgba(80,220,200,0.4)', borderRadius: '20px', color: TEAL }}>
            PREVIEW MODE
          </span>
          <span style={{ ...VT, fontSize: '1.1rem', letterSpacing: '2px', color: GOLD, flexShrink: 0 }}>
            {props.template === 'hql' ? 'HQL TASK' : 'GENERAL TASK'}
          </span>
          {props.template !== 'general' && props.draft.title && (
            <span style={{ ...VT, fontSize: '0.9rem', letterSpacing: '1px', color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              — {props.draft.title.toUpperCase()}
            </span>
          )}
          {props.template === 'general' && props.draft.title && (
            <span style={{ ...VT, fontSize: '0.9rem', letterSpacing: '1px', color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              — {props.draft.title.toUpperCase()}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{ ...VT, flexShrink: 0, background: 'none', border: `1px solid ${BORDER}`, borderRadius: '4px', color: GOLD_DIM, fontSize: '0.9rem', letterSpacing: '2px', cursor: 'pointer', padding: '0.25rem 0.75rem' }}
        >
          ✕ CLOSE
        </button>
      </div>

      {/* ── Step tabs (HQL only) ── */}
      {props.template === 'hql' && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, background: 'rgba(0,0,0,0.7)', overflowX: 'auto', flexShrink: 0 }}
        >
          {[STEP_LABELS[0], ...(props.draft.stepLabels ?? STEP_LABELS.slice(1))].map((label, i) => (
            <button
              key={label}
              onClick={() => setActiveStep(i)}
              style={{
                ...VT,
                fontSize: '0.75rem', letterSpacing: '2px',
                padding: '0.65rem 1rem',
                background: activeStep === i ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: 'none',
                borderBottom: activeStep === i ? `2px solid ${STEP_COLORS[i]}` : '2px solid transparent',
                color: activeStep === i ? STEP_COLORS[i] : 'rgba(255,215,0,0.3)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.12s',
              }}
            >
              {STEP_ICONS[i]} {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Content area ── */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1rem 3rem' }}
      >
        <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

          {props.template === 'hql' && (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.16 }}
              >
                {hqlSteps[activeStep]}
              </motion.div>
            </AnimatePresence>
          )}

          {props.template === 'general' && (
            props.draft.blocks.length > 0
              ? props.draft.blocks.map((block, i) => (
                  <GeneralBlockPreview key={block.id} block={block} index={i} />
                ))
              : (
                <div style={{ textAlign: 'center', padding: '4rem 0', color: 'rgba(255,255,255,0.2)', ...VT, fontSize: '1rem', letterSpacing: '2px' }}>
                  NO BLOCKS ADDED YET
                </div>
              )
          )}

        </div>
      </div>

      {/* ── Footer nav (HQL only) ── */}
      {props.template === 'hql' && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ height: '48px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.25rem', borderTop: `1px solid ${BORDER}`, background: 'rgba(0,0,0,0.85)' }}
        >
          <button
            onClick={() => setActiveStep(s => Math.max(0, s - 1))}
            disabled={activeStep === 0}
            style={{ ...VT, fontSize: '0.9rem', letterSpacing: '2px', padding: '0.3rem 1rem', background: 'transparent', border: `1px solid ${activeStep === 0 ? 'rgba(255,215,0,0.1)' : BORDER}`, borderRadius: '4px', color: activeStep === 0 ? 'rgba(255,215,0,0.2)' : GOLD_DIM, cursor: activeStep === 0 ? 'not-allowed' : 'pointer' }}
          >
            ◂ PREV
          </button>
          <span style={{ ...VT, fontSize: '0.8rem', letterSpacing: '2px', color: GOLD_DIM }}>
            {activeStep + 1} / {activeStepLabels.length + 1}
          </span>
          <button
            onClick={() => setActiveStep(s => Math.min(activeStepLabels.length, s + 1))}
            disabled={activeStep === activeStepLabels.length}
            style={{ ...VT, fontSize: '0.9rem', letterSpacing: '2px', padding: '0.3rem 1rem', background: 'transparent', border: `1px solid ${activeStep === activeStepLabels.length ? 'rgba(255,215,0,0.1)' : BORDER}`, borderRadius: '4px', color: activeStep === activeStepLabels.length ? 'rgba(255,215,0,0.2)' : GOLD_DIM, cursor: activeStep === activeStepLabels.length ? 'not-allowed' : 'pointer' }}
          >
            NEXT ▶
          </button>
        </div>
      )}
    </motion.div>
  )
}
