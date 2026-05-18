import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, gql } from '@apollo/client'
import { usePageBackground } from '@/hooks/usePageBackground'
import { TaskPreviewModal } from './TaskPreviewModal'

const VT: React.CSSProperties = { fontFamily: "'VT323', monospace" }
const GOLD = '#FFD700'
const GOLD_DIM = 'rgba(255,215,0,0.5)'
const GOLD_FAINT = 'rgba(255,215,0,0.15)'
const PANEL = 'rgba(0,0,0,0.55)'
const BORDER = 'rgba(255,215,0,0.25)'
const GREEN = '#4ade80'
const RED = '#f87171'

// ─── Types ────────────────────────────────────────────────────────────────────

export type GeneralBlockType = 'video' | 'document' | 'quiz' | 'assignment' | 'discussion' | 'note' | 'embed'

export const BLOCK_META: Record<GeneralBlockType, { icon: string; label: string; color: string }> = {
  video:      { icon: '🎬', label: 'VIDEO',        color: 'rgba(100,160,255,0.85)' },
  document:   { icon: '📄', label: 'DOCUMENT',     color: 'rgba(255,215,0,0.6)'  },
  quiz:       { icon: '❓', label: 'QUIZ',         color: 'rgba(255,180,50,0.85)' },
  assignment: { icon: '✏',  label: 'ASSIGNMENT',   color: '#4ade80'              },
  discussion: { icon: '💬', label: 'DISCUSSION',   color: 'rgba(200,150,255,0.85)' },
  note:       { icon: '📋', label: 'TEACHER NOTE', color: 'rgba(255,255,255,0.45)' },
  embed:      { icon: '🌐', label: 'WEB EMBED',    color: 'rgba(80,220,200,0.85)' },
}

interface AllowedFormats { video: boolean; audio: boolean; pdf: boolean; image: boolean }

export interface GeneralBlock {
  id: string
  type: GeneralBlockType
  title: string
  timeMin: number
  videoName: string
  videoFilePath: string    // server path after upload
  videoDescription: string
  documentName: string
  documentFilePath: string // server path after upload
  documentDescription: string
  quizRaw: string
  quizTimeMin: number
  assignmentInstructions: string
  allowedFormats: AllowedFormats
  discussionPrompt: string
  noteText: string
  embedUrl: string
  embedDescription: string
  embedHeightPx: number
}

export interface GeneralDraft {
  title: string
  subject: string
  grade: string
  blocks: GeneralBlock[]
}

function makeBlock(type: GeneralBlockType): GeneralBlock {
  return {
    id: crypto.randomUUID(), type, title: '', timeMin: 5,
    videoName: '', videoFilePath: '', videoDescription: '',
    documentName: '', documentFilePath: '', documentDescription: '',
    quizRaw: '', quizTimeMin: 0,
    assignmentInstructions: '',
    allowedFormats: { video: true, audio: false, pdf: true, image: false },
    discussionPrompt: '', noteText: '',
    embedUrl: '', embedDescription: '', embedHeightPx: 520,
  }
}

// ─── Quiz parser ──────────────────────────────────────────────────────────────

interface ParsedQ { number: number; text: string; options: { letter: string; text: string; isCorrect: boolean }[] }

function parseQuiz(raw: string): ParsedQ[] {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const out: ParsedQ[] = []
  let cur: ParsedQ | null = null
  for (const line of lines) {
    const qm = line.match(/^(\d+)[.)]\s+(.+)/)
    if (qm) { if (cur) out.push(cur); cur = { number: parseInt(qm[1]), text: qm[2], options: [] }; continue }
    const om = line.match(/^([A-Da-d])[.)]\s+(.+?)(\*\*)?$/)
    if (om && cur) cur.options.push({ letter: om[1].toUpperCase(), text: om[2].trim(), isCorrect: !!om[3] })
  }
  if (cur) out.push(cur)
  return out
}

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const TEACHER_CLASSES = gql`
  query TeacherClassesGeneral {
    teacherClasses { id subject grade }
  }
`

const TASK_COUNT_QUERY = gql`
  query TaskCountGeneral {
    taskCount
  }
`

const SAVE_GENERAL_TASK = gql`
  mutation SaveGeneralTask($input: GeneralTaskInput!, $publish: Boolean) {
    saveGeneralTask(input: $input, publish: $publish) {
      id
      title
      published
    }
  }
`

const GENERAL_BLOCKS = gql`
  query GeneralBlocks($taskId: ID!) {
    generalBlocks(taskId: $taskId)
  }
`

async function uploadFile(file: File, taskId: string, folder: string, token: string | null): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`/upload?taskId=${encodeURIComponent(taskId)}&folder=${encodeURIComponent(folder)}`, {
    method: 'POST',
    body: form,
    headers,
  })
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`)
  const json = await res.json() as { path: string }
  return json.path
}

// ─── Micro-components ─────────────────────────────────────────────────────────

const Panel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '6px', padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', ...style }}>
    {children}
  </div>
)

const Lbl: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ ...VT, fontSize: '0.82rem', letterSpacing: '2px', color: GOLD_DIM }}>{children}</span>
)

const TInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input {...props} style={{ ...VT, fontSize: '1.1rem', background: 'rgba(0,0,0,0.4)', border: `1px solid ${BORDER}`, borderRadius: '4px', padding: '0.4rem 0.7rem', color: '#fff', width: '100%', boxSizing: 'border-box', outline: 'none', letterSpacing: '1px', ...props.style }} />
)

const TArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea {...props} style={{ ...VT, fontSize: '1rem', background: 'rgba(0,0,0,0.4)', border: `1px solid ${BORDER}`, borderRadius: '4px', padding: '0.5rem 0.7rem', color: '#fff', width: '100%', boxSizing: 'border-box', outline: 'none', letterSpacing: '1px', resize: 'vertical', lineHeight: 1.5, ...props.style }} />
)

const NInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input type="number" {...props} style={{ ...VT, fontSize: '1.1rem', background: 'rgba(0,0,0,0.4)', border: `1px solid ${BORDER}`, borderRadius: '4px', padding: '0.4rem 0.7rem', color: GOLD, width: '80px', outline: 'none', letterSpacing: '1px', textAlign: 'center', ...props.style }} />
)

const FilePick: React.FC<{
  label: string
  accept: string
  fileName: string
  onPick: (n: string) => void
  onPickFile?: (file: File) => void
}> = ({ label, accept, fileName, onPick, onPickFile }) => {
  const ref = React.useRef<HTMLInputElement>(null)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <button onClick={() => ref.current?.click()} style={{ ...VT, fontSize: '0.95rem', letterSpacing: '1px', padding: '0.3rem 0.9rem', background: 'rgba(255,215,0,0.08)', border: `1px solid ${BORDER}`, borderRadius: '4px', color: GOLD, cursor: 'pointer', whiteSpace: 'nowrap' }}>
        {label}
      </button>
      <span style={{ ...VT, fontSize: '0.95rem', color: fileName ? GREEN : 'rgba(255,255,255,0.3)', letterSpacing: '1px' }}>
        {fileName || 'No file selected'}
      </span>
      <input ref={ref} type="file" accept={accept} style={{ display: 'none' }} onChange={e => {
        const file = e.target.files?.[0]
        if (file) { onPick(file.name); onPickFile?.(file) }
      }} />
    </div>
  )
}

// ─── Embed Block Fields (own component so it can hold previewLoaded state) ───

const EMBED_CYAN = 'rgba(80,220,200,0.8)'
const HEIGHT_PRESETS = [
  { label: 'S', px: 400,  hint: 'basic compiler' },
  { label: 'M', px: 560,  hint: 'most tools'     },
  { label: 'L', px: 720,  hint: 'IDE-style'       },
  { label: 'XL', px: 920, hint: 'full-screen feel' },
]

const EmbedBlockFields: React.FC<{
  block: GeneralBlock
  onChange: (p: Partial<GeneralBlock>) => void
}> = ({ block, onChange }) => {
  const [previewLoaded, setPreviewLoaded] = useState(false)
  const [showInfo, setShowInfo] = useState(true)
  const hasUrl = block.embedUrl.trim().startsWith('http')

  const handleUrlChange = (url: string) => {
    onChange({ embedUrl: url })
    setPreviewLoaded(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

      {/* Info modal */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', padding: '1rem' }}
            onClick={() => setShowInfo(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 12 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'var(--color-modal-bg)', border: `1px solid rgba(80,220,200,0.4)`, borderRadius: '8px', padding: '2rem 1.75rem', maxWidth: '480px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', ...VT }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>🌐</span>
                <span style={{ fontSize: '1.4rem', letterSpacing: '3px', color: EMBED_CYAN }}>WEB EMBED</span>
              </div>

              <p style={{ margin: 0, fontSize: '1rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.65, letterSpacing: '0.5px' }}>
                Not every website can be embedded inside another app.
                Some sites will load and work fully — others may load but have
                limited functionality, and some will refuse to load at all.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {[
                  { icon: '✓', color: '#4ade80', text: 'JDoodle, OnlineGDB, Programiz — compile and run code normally' },
                  { icon: '✓', color: '#4ade80', text: 'CodePen, JSFiddle — run HTML/CSS/JS live in-page' },
                  { icon: '⚠', color: '#fb923c', text: 'Some sites load visually but block features like "Run" or login' },
                  { icon: '✕', color: '#f87171', text: 'Google, YouTube, and most social sites block embedding entirely' },
                ].map(row => (
                  <div key={row.text} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                    <span style={{ color: row.color, fontSize: '1rem', lineHeight: 1.6, flexShrink: 0 }}>{row.icon}</span>
                    <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{row.text}</span>
                  </div>
                ))}
              </div>

              <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                Use <b style={{ color: EMBED_CYAN }}>OPEN IN TAB</b> to test the site before embedding.
                If it doesn't work inside the task, learners can always open it in a new tab from there.
              </p>

              <button
                onClick={() => setShowInfo(false)}
                style={{ ...VT, alignSelf: 'flex-end', fontSize: '1.1rem', letterSpacing: '2px', padding: '0.5rem 1.75rem', background: EMBED_CYAN, border: 'none', borderRadius: '5px', color: '#000', cursor: 'pointer', fontWeight: 'bold', marginTop: '0.25rem' }}
              >
                GOT IT ✓
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* URL row */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        <Lbl>WEBSITE URL *</Lbl>
        <TInput
          placeholder="https://www.jdoodle.com/online-java-compiler"
          value={block.embedUrl}
          onChange={e => handleUrlChange(e.target.value)}
          style={{ fontFamily: 'monospace', fontSize: '0.95rem' }}
        />
      </div>

      {/* Action buttons */}
      {hasUrl && (
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => window.open(block.embedUrl, '_blank', 'noopener')}
            style={{ ...VT, fontSize: '0.95rem', letterSpacing: '1px', padding: '0.4rem 1rem', background: 'rgba(80,220,200,0.08)', border: `1px solid rgba(80,220,200,0.35)`, borderRadius: '4px', color: EMBED_CYAN, cursor: 'pointer' }}
          >
            🔗 OPEN IN TAB
          </button>
          <button
            onClick={() => setPreviewLoaded(true)}
            style={{ ...VT, fontSize: '0.95rem', letterSpacing: '1px', padding: '0.4rem 1rem', background: previewLoaded ? 'rgba(80,220,200,0.05)' : 'rgba(80,220,200,0.15)', border: `1px solid rgba(80,220,200,0.35)`, borderRadius: '4px', color: EMBED_CYAN, cursor: 'pointer' }}
          >
            {previewLoaded ? '↺ RELOAD PREVIEW' : '▶ LOAD PREVIEW'}
          </button>
        </div>
      )}

      {/* Live preview */}
      {previewLoaded && hasUrl && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>

            {/* Height presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <Lbl>HEIGHT:</Lbl>
              {HEIGHT_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => onChange({ embedHeightPx: p.px })}
                  title={p.hint}
                  style={{
                    ...VT, fontSize: '0.85rem', letterSpacing: '1px',
                    padding: '0.2rem 0.6rem',
                    background: block.embedHeightPx === p.px ? 'rgba(80,220,200,0.2)' : 'rgba(80,220,200,0.05)',
                    border: `1px solid ${block.embedHeightPx === p.px ? EMBED_CYAN : 'rgba(80,220,200,0.25)'}`,
                    borderRadius: '3px',
                    color: block.embedHeightPx === p.px ? EMBED_CYAN : 'rgba(80,220,200,0.5)',
                    cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              ))}
              <NInput
                min={200} max={1200} step={20}
                value={block.embedHeightPx}
                onChange={e => onChange({ embedHeightPx: parseInt(e.target.value) || 520 })}
                style={{ width: '76px', color: EMBED_CYAN, border: `1px solid rgba(80,220,200,0.3)` }}
              />
              <span style={{ ...VT, fontSize: '0.82rem', color: 'rgba(80,220,200,0.5)' }}>PX</span>
            </div>

            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.28)' }}>
              Blank? The site blocks embedding — try a different URL
            </span>
          </div>

          <iframe
            src={block.embedUrl}
            style={{ width: '100%', height: `${block.embedHeightPx}px`, border: `1px solid rgba(80,220,200,0.3)`, borderRadius: '4px', background: '#111' }}
            title="Embedded tool preview"
          />
        </div>
      )}

      {/* Instructions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        <Lbl>INSTRUCTIONS FOR LEARNERS (optional)</Lbl>
        <TArea
          rows={2}
          placeholder='e.g. "Pause the video above and try typing the code yourself in the compiler below."'
          value={block.embedDescription}
          onChange={e => onChange({ embedDescription: e.target.value })}
        />
      </div>

      {/* Known-good list */}
      <div style={{ background: 'rgba(80,220,200,0.05)', border: '1px solid rgba(80,220,200,0.18)', borderRadius: '4px', padding: '0.65rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        <span style={{ ...VT, fontSize: '0.75rem', letterSpacing: '2px', color: 'rgba(80,220,200,0.65)' }}>◈ KNOWN EMBEDDABLE TOOLS</span>
        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.42)', lineHeight: 1.6 }}>
          Java / Python / C++: <b style={{ color: 'rgba(80,220,200,0.7)' }}>jdoodle.com</b> · <b style={{ color: 'rgba(80,220,200,0.7)' }}>onlinegdb.com</b> · <b style={{ color: 'rgba(80,220,200,0.7)' }}>programiz.com</b><br />
          Web (HTML/CSS/JS): <b style={{ color: 'rgba(80,220,200,0.7)' }}>codepen.io</b> · <b style={{ color: 'rgba(80,220,200,0.7)' }}>jsfiddle.net</b><br />
          Visual / Scratch: <b style={{ color: 'rgba(80,220,200,0.7)' }}>scratch.mit.edu</b> · <b style={{ color: 'rgba(80,220,200,0.7)' }}>blockly.games</b>
        </span>
      </div>
    </div>
  )
}

// ─── Block Editor ─────────────────────────────────────────────────────────────

const BlockEditor: React.FC<{
  block: GeneralBlock
  index: number
  total: number
  onChange: (p: Partial<GeneralBlock>) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
  onPickFile?: (key: string, file: File) => void
}> = ({ block, index, total, onChange, onRemove, onMove, onPickFile }) => {
  const [expanded, setExpanded] = useState(block.title === '')
  const meta = BLOCK_META[block.type]

  return (
    <div style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${BORDER}`, borderLeft: `3px solid ${meta.color}`, borderRadius: '5px', overflow: 'hidden' }}>

      {/* Header row */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 0.85rem', cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setExpanded(e => !e)}
      >
        <span style={{ ...VT, fontSize: '0.75rem', color: GOLD_DIM, minWidth: '18px' }}>{index + 1}.</span>
        <span style={{ fontSize: '1rem' }}>{meta.icon}</span>
        <span style={{ ...VT, fontSize: '0.72rem', letterSpacing: '2px', color: meta.color, minWidth: '88px' }}>{meta.label}</span>
        <span style={{ ...VT, fontSize: '1rem', color: block.title ? '#fff' : 'rgba(255,255,255,0.3)', flex: 1, letterSpacing: '1px' }}>
          {block.title || '— untitled —'}
        </span>
        {block.type !== 'note' && (
          <span style={{ ...VT, fontSize: '0.8rem', color: GOLD_DIM, whiteSpace: 'nowrap' }}>{block.timeMin} MIN</span>
        )}

        {/* Reorder buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }} onClick={e => e.stopPropagation()}>
          <button disabled={index === 0} onClick={() => onMove(-1)}
            style={{ ...VT, background: 'none', border: 'none', color: index === 0 ? 'rgba(255,215,0,0.15)' : GOLD_DIM, fontSize: '0.65rem', cursor: index === 0 ? 'not-allowed' : 'pointer', padding: '0 2px', lineHeight: 1 }}>▲</button>
          <button disabled={index === total - 1} onClick={() => onMove(1)}
            style={{ ...VT, background: 'none', border: 'none', color: index === total - 1 ? 'rgba(255,215,0,0.15)' : GOLD_DIM, fontSize: '0.65rem', cursor: index === total - 1 ? 'not-allowed' : 'pointer', padding: '0 2px', lineHeight: 1 }}>▼</button>
        </div>

        <button onClick={e => { e.stopPropagation(); onRemove() }}
          style={{ background: 'none', border: 'none', color: 'rgba(248,113,113,0.55)', cursor: 'pointer', fontSize: '0.9rem', padding: '0 4px' }}>✕</button>
        <span style={{ ...VT, color: GOLD_DIM, fontSize: '0.85rem', display: 'inline-block', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▶</span>
      </div>

      {/* Expanded fields */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0.85rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid rgba(255,215,0,0.1)' }}>

              {/* Title — all types */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <Lbl>BLOCK TITLE *</Lbl>
                <TInput
                  placeholder={block.type === 'video' ? 'e.g. Introduction Video' : block.type === 'document' ? 'e.g. Theory Document' : block.type === 'quiz' ? 'e.g. Knowledge Check' : block.type === 'assignment' ? 'e.g. Final Submission' : block.type === 'discussion' ? 'e.g. Group Discussion' : 'e.g. Important Note'}
                  value={block.title}
                  onChange={e => onChange({ title: e.target.value })}
                />
              </div>

              {/* Time — all except note */}
              {block.type !== 'note' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Lbl>TIME ALLOCATION</Lbl>
                  <NInput min={1} max={120} value={block.timeMin} onChange={e => onChange({ timeMin: parseInt(e.target.value) || 1 })} />
                  <span style={{ ...VT, fontSize: '0.85rem', color: GOLD_DIM }}>MIN</span>
                </div>
              )}

              {/* VIDEO */}
              {block.type === 'video' && <>
                <FilePick label="📹 UPLOAD VIDEO" accept="video/*" fileName={block.videoName}
                  onPick={n => onChange({ videoName: n, videoFilePath: '' })}
                  onPickFile={f => onPickFile?.(`block_${block.id}_video`, f)} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <Lbl>DESCRIPTION (optional)</Lbl>
                  <TArea rows={2} placeholder="Brief note to learners about what to focus on while watching..." value={block.videoDescription} onChange={e => onChange({ videoDescription: e.target.value })} />
                </div>
              </>}

              {/* DOCUMENT */}
              {block.type === 'document' && <>
                <FilePick label="📄 UPLOAD PDF / DOC" accept=".pdf,.doc,.docx" fileName={block.documentName}
                  onPick={n => onChange({ documentName: n, documentFilePath: '' })}
                  onPickFile={f => onPickFile?.(`block_${block.id}_document`, f)} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <Lbl>DESCRIPTION (optional)</Lbl>
                  <TArea rows={2} placeholder="Brief note about what learners should pay attention to..." value={block.documentDescription} onChange={e => onChange({ documentDescription: e.target.value })} />
                </div>
              </>}

              {/* QUIZ */}
              {block.type === 'quiz' && <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <Lbl>QUIZ QUESTIONS — paste using HQL format (1. Question · A. Option · B. Correct**)</Lbl>
                  <TArea rows={8} placeholder={`1. Question text here\nA. Wrong option\nB. Correct option**\nC. Wrong option\nD. Wrong option`} value={block.quizRaw} onChange={e => onChange({ quizRaw: e.target.value })} style={{ fontFamily: 'monospace', fontSize: '0.85rem' }} />
                </div>
                {parseQuiz(block.quizRaw).length > 0 && (
                  <span style={{ ...VT, fontSize: '0.85rem', color: GREEN, letterSpacing: '1px' }}>✓ {parseQuiz(block.quizRaw).length} QUESTIONS PARSED</span>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Lbl>QUIZ TIME</Lbl>
                  <NInput min={1} value={block.quizTimeMin || ''} onChange={e => onChange({ quizTimeMin: parseInt(e.target.value) || 0 })} />
                  <span style={{ ...VT, fontSize: '0.85rem', color: GOLD_DIM }}>MIN</span>
                </div>
              </>}

              {/* ASSIGNMENT */}
              {block.type === 'assignment' && <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <Lbl>INSTRUCTIONS *</Lbl>
                  <TArea rows={4} placeholder="Describe exactly what learners must produce..." value={block.assignmentInstructions} onChange={e => onChange({ assignmentInstructions: e.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <Lbl>ALLOWED SUBMISSION FORMATS</Lbl>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {([
                      { key: 'video' as const, icon: '🎬', label: 'VIDEO' },
                      { key: 'audio' as const, icon: '🎵', label: 'AUDIO' },
                      { key: 'pdf'   as const, icon: '📄', label: 'PDF/DOC' },
                      { key: 'image' as const, icon: '🖼', label: 'IMAGE' },
                    ]).map(({ key, icon, label }) => {
                      const active = block.allowedFormats[key]
                      return (
                        <button key={key} onClick={() => onChange({ allowedFormats: { ...block.allowedFormats, [key]: !active } })}
                          style={{ ...VT, fontSize: '0.9rem', letterSpacing: '1px', padding: '0.35rem 0.9rem', background: active ? 'rgba(255,215,0,0.15)' : 'rgba(255,215,0,0.04)', border: `1px solid ${active ? GOLD : BORDER}`, borderRadius: '4px', color: active ? GOLD : GOLD_DIM, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {icon} {label} {active && <span style={{ color: GREEN }}>✓</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>}

              {/* DISCUSSION */}
              {block.type === 'discussion' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <Lbl>DISCUSSION PROMPT (optional)</Lbl>
                  <TArea rows={3} placeholder="What should learners discuss? e.g. 'Debate the pros and cons of...'" value={block.discussionPrompt} onChange={e => onChange({ discussionPrompt: e.target.value })} />
                </div>
              )}

              {/* NOTE */}
              {block.type === 'note' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <Lbl>NOTE CONTENT *</Lbl>
                  <TArea rows={4} placeholder="Teacher instructions, context, or guidance for this part of the task..." value={block.noteText} onChange={e => onChange({ noteText: e.target.value })} />
                </div>
              )}

              {/* EMBED */}
              {block.type === 'embed' && <EmbedBlockFields block={block} onChange={onChange} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── GeneralTaskCreator ───────────────────────────────────────────────────────

export const GeneralTaskCreator: React.FC<{
  onBack: () => void
  editingTaskId?: string
  editingMeta?: { title: string; subject: string; grade: string } | null
}> = ({ onBack, editingTaskId, editingMeta }) => {
  const navigate = useNavigate()
  const token = sessionStorage.getItem('sl_token')
  const [draft, setDraft] = useState<GeneralDraft>({ title: '', subject: '', grade: '', blocks: [] })
  const [saved, setSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const taskIdRef = React.useRef<string>(editingTaskId ?? crypto.randomUUID())
  const fileStoreRef = React.useRef<Map<string, File>>(new Map())

  usePageBackground('home')

  const { data, loading } = useQuery<{ teacherClasses: { id: string; subject: string; grade: number }[] }>(TEACHER_CLASSES)
  const { data: countData } = useQuery<{ taskCount: number }>(TASK_COUNT_QUERY)
  const [saveGeneralTask] = useMutation(SAVE_GENERAL_TASK)

  const { data: blocksData } = useQuery<{ generalBlocks: string }>(
    GENERAL_BLOCKS,
    { skip: !editingTaskId, variables: { taskId: editingTaskId } },
  )

  // Pre-populate draft when editing an existing general task
  useEffect(() => {
    if (!editingMeta || !blocksData) return
    const rawBlocks = JSON.parse(blocksData.generalBlocks) as {
      id: string; type: string; position: number; title: string; time_min: number
      file_path: string | null; original_name: string | null; data: Record<string, unknown> | null
    }[]
    const blocks: GeneralBlock[] = rawBlocks.map(r => {
      const d = r.data ?? {}
      const isVideo    = r.type === 'video'
      const isDocument = r.type === 'document'
      return {
        id:                   r.id,
        type:                 r.type as GeneralBlockType,
        title:                r.title ?? '',
        timeMin:              r.time_min ?? 5,
        videoName:            isVideo    ? (r.original_name ?? '') : '',
        videoFilePath:        isVideo    ? (r.file_path ?? '')     : '',
        videoDescription:     String(d.videoDescription    ?? ''),
        documentName:         isDocument ? (r.original_name ?? '') : '',
        documentFilePath:     isDocument ? (r.file_path ?? '')     : '',
        documentDescription:  String(d.documentDescription ?? ''),
        quizRaw:              String(d.quizRaw              ?? ''),
        quizTimeMin:          Number(d.quizTimeMin          ?? 0),
        assignmentInstructions: String(d.assignmentInstructions ?? ''),
        allowedFormats:       (d.allowedFormats as AllowedFormats) ?? { video: true, audio: false, pdf: true, image: false },
        discussionPrompt:     String(d.discussionPrompt     ?? ''),
        noteText:             String(d.noteText              ?? ''),
        embedUrl:             String(d.embedUrl              ?? ''),
        embedDescription:     String(d.embedDescription     ?? ''),
        embedHeightPx:        Number(d.embedHeightPx        ?? 520),
      }
    })
    setDraft({ title: editingMeta.title, subject: editingMeta.subject, grade: editingMeta.grade, blocks })
  }, [blocksData, editingMeta])

  const classes = data?.teacherClasses ?? []
  const subjects = [...new Set(classes.map(c => c.subject))].sort()
  const gradesForSubject = draft.subject
    ? [...new Set(classes.filter(c => c.subject === draft.subject).map(c => c.grade))].sort((a, b) => a - b)
    : []

  const updateDraft = (p: Partial<GeneralDraft>) => { setDraft(prev => ({ ...prev, ...p })); setSaved(false) }

  const updateBlock = (id: string, partial: Partial<GeneralBlock>) => {
    setDraft(prev => ({ ...prev, blocks: prev.blocks.map(b => b.id === id ? { ...b, ...partial } : b) }))
    setSaved(false)
  }

  const addBlock = (type: GeneralBlockType) => {
    setDraft(prev => ({ ...prev, blocks: [...prev.blocks, makeBlock(type)] }))
    setSaved(false)
  }

  const removeBlock = (id: string) => setDraft(prev => ({ ...prev, blocks: prev.blocks.filter(b => b.id !== id) }))

  const moveBlock = (id: string, dir: -1 | 1) => {
    setDraft(prev => {
      const blocks = [...prev.blocks]
      const i = blocks.findIndex(b => b.id === id)
      if (i + dir < 0 || i + dir >= blocks.length) return prev
      ;[blocks[i], blocks[i + dir]] = [blocks[i + dir], blocks[i]]
      return { ...prev, blocks }
    })
  }

  const storeFile = (key: string, file: File) => { fileStoreRef.current.set(key, file) }

  const taskNumber = (countData?.taskCount ?? 0) + 1
  const totalTimeMin = draft.blocks.reduce((s, b) => s + (b.type !== 'note' ? b.timeMin : 0), 0)
  const canPublish = !!draft.title.trim() && !!draft.subject && !!draft.grade && draft.blocks.length > 0

  const doSave = async (publish: boolean) => {
    if (!canPublish && publish) return
    setIsSaving(true)
    setSaveError(null)
    try {
      const tid = taskIdRef.current
      const store = fileStoreRef.current

      // Upload files for video/document blocks
      const updatedBlocks = await Promise.all(
        draft.blocks.map(async (b, i) => {
          let videoFilePath = b.videoFilePath
          let documentFilePath = b.documentFilePath
          const vFile = store.get(`block_${b.id}_video`)
          const dFile = store.get(`block_${b.id}_document`)
          if (vFile) { videoFilePath = await uploadFile(vFile, tid, `block-${i}-${b.type}`, token); store.delete(`block_${b.id}_video`) }
          if (dFile) { documentFilePath = await uploadFile(dFile, tid, `block-${i}-${b.type}`, token); store.delete(`block_${b.id}_document`) }
          return { ...b, videoFilePath, documentFilePath }
        }),
      )

      setDraft(prev => ({ ...prev, blocks: updatedBlocks }))

      // Collect quiz questions from all quiz blocks
      const quizQuestions: { number: number; text: string; options: { letter: string; text: string; isCorrect: boolean }[]; correctIndex: number }[] = []
      updatedBlocks.forEach(b => {
        if (b.type === 'quiz') {
          parseQuiz(b.quizRaw).forEach(q => {
            quizQuestions.push({ number: q.number, text: q.text, options: q.options, correctIndex: q.options.findIndex(o => o.isCorrect) })
          })
        }
      })

      // Serialize each block's type-specific data as JSON
      const blocks = updatedBlocks.map((b, i) => {
        const data = JSON.stringify({
          videoDescription: b.videoDescription,
          documentDescription: b.documentDescription,
          quizRaw: b.quizRaw,
          quizTimeMin: b.quizTimeMin,
          assignmentInstructions: b.assignmentInstructions,
          allowedFormats: b.allowedFormats,
          discussionPrompt: b.discussionPrompt,
          noteText: b.noteText,
          embedUrl: b.embedUrl,
          embedDescription: b.embedDescription,
          embedHeightPx: b.embedHeightPx,
        })
        const filePath = b.videoFilePath || b.documentFilePath || null
        const originalName = b.videoName || b.documentName || null
        return { type: b.type, position: i, title: b.title, timeMin: b.timeMin, data, filePath, originalName }
      })

      await saveGeneralTask({
        variables: {
          publish,
          input: { id: tid, title: draft.title, subject: draft.subject, grade: draft.grade, totalTimeMin, blocks, quizQuestions },
        },
      })

      setSaved(true)
      if (publish) navigate('/task-manager')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveDraft = () => { doSave(false) }
  const handlePublish = () => { doSave(true) }

  return (
    <div style={{ height: 'calc(100vh - 52px)', marginTop: '52px', overflowY: 'auto', ...VT }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ maxWidth: '760px', margin: '0 auto', padding: '1.5rem 1rem 4rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <button onClick={onBack} style={{ ...VT, background: 'none', border: 'none', color: GOLD_DIM, fontSize: '0.9rem', letterSpacing: '2px', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
              ◂ CHANGE TEMPLATE
            </button>
            <h1 style={{ ...VT, margin: 0, fontSize: '1.8rem', letterSpacing: '3px', color: GOLD, lineHeight: 1 }}>TASK CREATOR</h1>
            <span style={{ ...VT, fontSize: '0.82rem', letterSpacing: '2px', color: GOLD_DIM }}>GENERAL TEMPLATE</span>
          </div>
          {totalTimeMin > 0 && (
            <span style={{ ...VT, fontSize: '0.9rem', letterSpacing: '2px', color: GOLD_DIM, marginTop: '0.5rem' }}>⏱ {totalTimeMin} MIN TOTAL</span>
          )}
        </div>

        {/* Task info */}
        <Panel>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.82rem', letterSpacing: '3px', color: GOLD_DIM }}>LEARNING TASK #{taskNumber}</span>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px' }}>auto-assigned</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <Lbl>TOPIC TITLE *</Lbl>
            <TInput placeholder="e.g. Forces and Newton's Laws" value={draft.title} onChange={e => updateDraft({ title: e.target.value })} style={{ fontSize: '1.35rem' }} />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <Lbl>SUBJECT *</Lbl>
              <select
                value={draft.subject}
                onChange={e => updateDraft({ subject: e.target.value, grade: '' })}
                style={{ ...VT, fontSize: '1.1rem', background: 'rgba(0,0,0,0.4)', border: `1px solid ${BORDER}`, borderRadius: '4px', padding: '0.4rem 0.7rem', color: '#fff', width: '100%', outline: 'none', letterSpacing: '1px', cursor: 'pointer' }}
              >
                <option value="">{loading ? 'LOADING...' : '— SELECT SUBJECT —'}</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <Lbl>GRADE *</Lbl>
              <select
                value={draft.grade}
                onChange={e => updateDraft({ grade: e.target.value })}
                disabled={!draft.subject}
                style={{ ...VT, fontSize: '1.1rem', background: 'rgba(0,0,0,0.4)', border: `1px solid ${BORDER}`, borderRadius: '4px', padding: '0.4rem 0.7rem', color: draft.subject ? '#fff' : 'rgba(255,215,0,0.25)', width: '120px', outline: 'none', letterSpacing: '1px', cursor: draft.subject ? 'pointer' : 'not-allowed' }}
              >
                <option value="">{draft.subject ? '— GRADE —' : '— —'}</option>
                {gradesForSubject.map(g => <option key={g} value={String(g)}>GRADE {g}</option>)}
              </select>
            </div>
          </div>
        </Panel>

        {/* Block list */}
        {draft.blocks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Lbl>LEARNING STEPS — {draft.blocks.length} BLOCK{draft.blocks.length !== 1 ? 'S' : ''}</Lbl>
            {draft.blocks.map((block, i) => (
              <BlockEditor
                key={block.id}
                block={block}
                index={i}
                total={draft.blocks.length}
                onChange={partial => updateBlock(block.id, partial)}
                onRemove={() => removeBlock(block.id)}
                onMove={dir => moveBlock(block.id, dir)}
                onPickFile={storeFile}
              />
            ))}
          </div>
        )}

        {/* Add block panel */}
        <Panel style={{ gap: '0.6rem' }}>
          <Lbl>+ ADD CONTENT BLOCK</Lbl>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {(Object.keys(BLOCK_META) as GeneralBlockType[]).map(type => {
              const meta = BLOCK_META[type]
              return (
                <button
                  key={type}
                  onClick={() => addBlock(type)}
                  style={{ ...VT, fontSize: '0.9rem', letterSpacing: '1px', padding: '0.45rem 1rem', background: 'rgba(255,215,0,0.05)', border: `1px dashed rgba(255,215,0,0.25)`, borderRadius: '5px', color: meta.color, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.05)' }}
                >
                  <span>{meta.icon}</span>
                  <span>{meta.label}</span>
                </button>
              )
            })}
          </div>
        </Panel>

        {draft.blocks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '1rem 0', color: 'rgba(255,255,255,0.3)', fontSize: '0.95rem', letterSpacing: '1px' }}>
            Add your first content block above to begin building this task.
          </div>
        )}

        {/* Bottom nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: `1px solid ${BORDER}` }}>
          <div>
            {saveError && <span style={{ ...VT, fontSize: '0.85rem', color: RED, letterSpacing: '1px' }}>✕ {saveError}</span>}
            {saved && !saveError && <span style={{ ...VT, fontSize: '0.9rem', color: GREEN, letterSpacing: '1px' }}>✓ DRAFT SAVED</span>}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => setShowPreview(true)} style={{ ...VT, fontSize: '1rem', letterSpacing: '1px', padding: '0.5rem 1.1rem', background: 'rgba(80,220,200,0.07)', border: '1px solid rgba(80,220,200,0.3)', borderRadius: '4px', color: 'rgba(80,220,200,0.8)', cursor: 'pointer' }}>
              👁 PREVIEW
            </button>
            <button onClick={handleSaveDraft} disabled={isSaving} style={{ ...VT, fontSize: '1rem', letterSpacing: '1px', padding: '0.5rem 1.1rem', background: 'rgba(255,215,0,0.07)', border: `1px solid ${BORDER}`, borderRadius: '4px', color: isSaving ? 'rgba(255,215,0,0.3)' : GOLD_DIM, cursor: isSaving ? 'wait' : 'pointer' }}>
              {isSaving ? '⏳ SAVING…' : 'SAVE DRAFT'}
            </button>
            <button onClick={handlePublish} disabled={!canPublish || isSaving} style={{ ...VT, fontSize: '1.1rem', letterSpacing: '2px', padding: '0.5rem 1.75rem', background: canPublish && !isSaving ? GREEN : 'rgba(74,222,128,0.12)', border: 'none', borderRadius: '4px', color: canPublish && !isSaving ? '#000' : 'rgba(74,222,128,0.4)', cursor: canPublish && !isSaving ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}>
              {isSaving ? '⏳ SAVING…' : 'PUBLISH TASK ✓'}
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showPreview && (
          <TaskPreviewModal template="general" draft={draft} onClose={() => setShowPreview(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
