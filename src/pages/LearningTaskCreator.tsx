import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, gql } from '@apollo/client'
import { usePageBackground } from '@/hooks/usePageBackground'
import { GeneralTaskCreator } from './GeneralTaskCreator'
import { TaskPreviewModal } from './TaskPreviewModal'

// ─── Style constants ──────────────────────────────────────────────────────────

const VT: React.CSSProperties = { fontFamily: "'VT323', monospace" }
const GOLD = '#FFD700'
const GOLD_DIM = 'rgba(255,215,0,0.5)'
const GOLD_FAINT = 'rgba(255,215,0,0.15)'
const PANEL = 'var(--color-pane-bg, rgba(0,0,0,0.55))'
const BORDER = 'rgba(255,215,0,0.25)'
const GREEN = '#4ade80'
const AMBER = '#fb923c'
const RED = '#f87171'

// ─── Step metadata ────────────────────────────────────────────────────────────

export const STEP_LABELS = [
  'ORIENTATION',
  'CHALLENGE',
  'REFLECTION',
  'CONTENT',
  'QUIZ',
  'DISCUSSION',
  'ASSIGNMENT',
]

const STEP_TYPE_DESCRIPTIONS: Record<string, string> = {
  CHALLENGE:  'Present the real-life challenge. Add a video, document, or text note — or combine several. Learners see this before any content.',
  REFLECTION: 'Train meta-cognitive thinking. Add a Reflection block (question checklist) and optionally extra text notes.',
  CONTENT:    'Provide the resources that teach learners how to solve the challenge. Videos, documents, and audio files all work here.',
  QUIZ:       'Add a Quiz block and paste your multiple-choice questions. You can add text notes alongside for context.',
  DISCUSSION: 'Configure the cooperative group discussion. Add a Discussion block to set the time, plus any supporting documents.',
  ASSIGNMENT: 'Define what learners must submit. Add an Assignment block with instructions and allowed formats.',
}

const AVAILABLE_STEP_TYPES: Array<{ label: string; icon: string; desc: string }> = [
  { label: 'CHALLENGE',  icon: '⚡', desc: 'Real-life scenario opener' },
  { label: 'REFLECTION', icon: '🪞', desc: 'Meta-cognitive questions' },
  { label: 'CONTENT',    icon: '📚', desc: 'Teaching videos & documents' },
  { label: 'QUIZ',       icon: '❓', desc: 'Multiple-choice assessment' },
  { label: 'DISCUSSION', icon: '💬', desc: 'Cooperative group activity' },
  { label: 'ASSIGNMENT', icon: '✏️', desc: 'Individual submission task' },
]

const HELP_CONTENT: Record<number, { title: string; tips: string[] }> = {
  0: { title: 'Getting Started', tips: [
    'Every Learning Task needs a clear topic title.',
    'The task number is auto-assigned.',
    'Watch the orientation video on your first task to understand the HQL workflow.',
  ]},
  1: { title: 'The Real-Life Challenge', tips: [
    'Add as many blocks as needed — a VIDEO is typical, plus an optional DOCUMENT summary.',
    'Multiple challenge videos work well for complex scenarios.',
    'TEXT NOTE blocks let you add written context alongside media.',
    'Click NEXT when you are satisfied with this step.',
  ]},
  2: { title: 'Meta-Learning Reflection', tips: [
    'A REFLECTION block contains a checklist of meta-cognitive questions.',
    'You can add multiple Reflection blocks for different question sets.',
    'Select at least 3 questions per Reflection block.',
    'TEXT NOTE blocks can add instructions or framing.',
  ]},
  3: { title: 'Core Content Resources', tips: [
    'Add the videos and documents that teach learners how to solve the challenge.',
    'Keep it focused — one video + one PDF is often enough.',
    'Resist over-loading this phase; content overload kills engagement.',
  ]},
  4: { title: 'The Smart Quiz', tips: [
    'Paste quiz questions using: 1. Question, A. Option, B. Correct option**',
    'Answer options are shuffled automatically for learners.',
    'Aim for 15–20 questions.',
    'You can add multiple Quiz blocks for multi-part assessments.',
  ]},
  5: { title: 'Group Discussion Setup', tips: [
    'A DISCUSSION block sets the total discussion time.',
    'The three sub-phases (compare quiz, compare reflections, group solution) are fixed by the system.',
    'Set a total time that allows roughly 3–4 minutes per quiz question.',
    'Add a DOCUMENT block if you want to supply a rubric or guide sheet.',
  ]},
  6: { title: 'Individual Assignment', tips: [
    'An ASSIGNMENT block holds the specific instructions and submission formats.',
    'Be specific — vague prompts produce vague submissions.',
    'Allow at least two submission formats so learners can choose their strengths.',
    'You can attach a DOCUMENT (rubric or template) alongside the assignment block.',
  ]},
}

// ─── Block type definitions ───────────────────────────────────────────────────

export type HqlBlockType =
  | 'VIDEO' | 'DOCUMENT' | 'AUDIO' | 'TEXT'
  | 'REFLECTION' | 'QUIZ' | 'DISCUSSION' | 'ASSIGNMENT'

export const BLOCK_META: Record<HqlBlockType, { icon: string; label: string }> = {
  VIDEO:      { icon: '📹', label: 'VIDEO' },
  DOCUMENT:   { icon: '📄', label: 'DOCUMENT' },
  AUDIO:      { icon: '🎵', label: 'AUDIO' },
  TEXT:       { icon: '📝', label: 'TEXT NOTE' },
  REFLECTION: { icon: '🧠', label: 'REFLECTION' },
  QUIZ:       { icon: '✏️', label: 'QUIZ' },
  DISCUSSION: { icon: '💬', label: 'DISCUSSION' },
  ASSIGNMENT: { icon: '📋', label: 'ASSIGNMENT' },
}

const STEP_TYPE_PALETTE: Record<string, HqlBlockType[]> = {
  CHALLENGE:  ['VIDEO', 'DOCUMENT', 'AUDIO', 'TEXT'],
  REFLECTION: ['REFLECTION', 'TEXT', 'DOCUMENT'],
  CONTENT:    ['VIDEO', 'DOCUMENT', 'AUDIO', 'TEXT'],
  QUIZ:       ['QUIZ', 'TEXT'],
  DISCUSSION: ['DISCUSSION', 'DOCUMENT', 'TEXT'],
  ASSIGNMENT: ['ASSIGNMENT', 'DOCUMENT', 'TEXT'],
}

// ─── Preset reflection questions ──────────────────────────────────────────────

const PRESET_QUESTIONS = [
  'What is the core problem being presented in this challenge?',
  'What is your initial proposed solution?',
  'What steps will you follow to create your solution?',
  'What criteria would a successful solution need to meet?',
  'What assumptions are you making in your solution?',
  'What information would change your answer?',
  'Is this the best possible solution, or just the first one you thought of?',
  'What is the biggest risk in your proposed solution?',
]

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReflectionQuestion {
  id: number; text: string; checked: boolean; timeMin: number
}

export interface ParsedQuestion {
  number: number
  text: string
  options: { letter: string; text: string; isCorrect: boolean }[]
}

export interface AllowedFormats {
  video: boolean; audio: boolean; pdf: boolean; image: boolean
}

export interface HqlBlock {
  id: string
  type: HqlBlockType
  title: string
  timeMin: number
  // FILE-BASED
  fileName: string
  filePath: string
  // TEXT / ASSIGNMENT / DISCUSSION
  textContent: string
  // REFLECTION
  reflectionQuestions: ReflectionQuestion[]
  // QUIZ
  quizRaw: string
  // ASSIGNMENT
  allowedFormats: AllowedFormats
}

export interface TaskDraft {
  title: string; subject: string; grade: string
  stepLabels: string[]      // ordered labels for content steps (length = active step count)
  stepBlocks: HqlBlock[][]  // index 0 unused; index 1..N = blocks for each active step
}

// ─── Quiz parser ──────────────────────────────────────────────────────────────

export function parseQuiz(raw: string): ParsedQuestion[] {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const questions: ParsedQuestion[] = []
  let current: ParsedQuestion | null = null
  for (const line of lines) {
    const qMatch = line.match(/^(\d+)[.)]\s+(.+)/)
    if (qMatch) {
      if (current) questions.push(current)
      current = { number: parseInt(qMatch[1]), text: qMatch[2], options: [] }
      continue
    }
    const optMatch = line.match(/^([A-Da-d])[.)]\s+(.+?)(\*\*)?$/)
    if (optMatch && current) {
      current.options.push({ letter: optMatch[1].toUpperCase(), text: optMatch[2].trim(), isCorrect: !!optMatch[3] })
    }
  }
  if (current) questions.push(current)
  return questions
}

// ─── Block factory ────────────────────────────────────────────────────────────

function makeBlock(type: HqlBlockType): HqlBlock {
  return {
    id: crypto.randomUUID(),
    type,
    title: '',
    timeMin: 5,
    fileName: '',
    filePath: '',
    textContent: '',
    reflectionQuestions: PRESET_QUESTIONS.map((text, i) => ({ id: i, text, checked: i < 4, timeMin: 2 })),
    quizRaw: '',
    allowedFormats: { video: true, audio: false, pdf: true, image: false },
  }
}

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const TEACHER_CLASSES_FOR_CREATOR = gql`
  query TeacherClassesForCreator {
    teacherClasses { id subject grade }
  }
`

const TASK_COUNT_QUERY = gql`
  query TaskCount { taskCount }
`

const SAVE_HQL_TASK = gql`
  mutation SaveHqlTask($input: HqlTaskInput!, $publish: Boolean) {
    saveHqlTask(input: $input, publish: $publish) { id title published }
  }
`

const LOAD_TASK = gql`
  query LoadTask($id: ID!) {
    taskById(id: $id) { id title subject grade stepLabels templateType }
    hqlBlocks(taskId: $id)
  }
`

async function uploadFile(file: File, taskId: string, folder: string, token: string | null): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`/upload?taskId=${encodeURIComponent(taskId)}&folder=${encodeURIComponent(folder)}`, {
    method: 'POST', body: form, headers,
  })
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`)
  const json = await res.json() as { path: string }
  return json.path
}

// ─── Shared UI components ─────────────────────────────────────────────────────

const SectionPanel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '6px', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', ...style }}>
    {children}
  </div>
)

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ ...VT, fontSize: '0.85rem', letterSpacing: '2px', color: GOLD_DIM }}>{children}</span>
)

const FieldRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
    <Label>{label}</Label>
    {children}
  </div>
)

const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input {...props} style={{ ...VT, fontSize: '1.15rem', background: 'rgba(0,0,0,0.4)', border: `1px solid ${BORDER}`, borderRadius: '4px', padding: '0.4rem 0.75rem', color: '#fff', width: '100%', boxSizing: 'border-box', outline: 'none', letterSpacing: '1px', ...props.style }} />
)

const NumInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input type="number" {...props} style={{ ...VT, fontSize: '1.15rem', background: 'rgba(0,0,0,0.4)', border: `1px solid ${BORDER}`, borderRadius: '4px', padding: '0.4rem 0.75rem', color: GOLD, width: '90px', outline: 'none', letterSpacing: '1px', textAlign: 'center', ...props.style }} />
)

const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea {...props} style={{ ...VT, fontSize: '1.1rem', background: 'rgba(0,0,0,0.4)', border: `1px solid ${BORDER}`, borderRadius: '4px', padding: '0.6rem 0.75rem', color: '#fff', width: '100%', boxSizing: 'border-box', outline: 'none', letterSpacing: '1px', resize: 'vertical', lineHeight: 1.5, ...props.style }} />
)

const SelectInput: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select {...props} style={{ ...VT, fontSize: '1.15rem', background: 'rgba(0,0,0,0.4)', border: `1px solid ${BORDER}`, borderRadius: '4px', padding: '0.4rem 0.75rem', color: props.disabled ? 'rgba(255,215,0,0.25)' : '#fff', width: '100%', boxSizing: 'border-box', outline: 'none', letterSpacing: '1px', cursor: props.disabled ? 'not-allowed' : 'pointer', ...props.style }} />
)

// ─── FilePicker ───────────────────────────────────────────────────────────────

const FilePicker: React.FC<{
  label: string; accept: string; fileName: string
  onPick: (name: string) => void; onPickFile?: (file: File) => void
}> = ({ label, accept, fileName, onPick, onPickFile }) => {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <button onClick={() => ref.current?.click()} style={{ ...VT, fontSize: '1rem', letterSpacing: '1px', padding: '0.35rem 1rem', background: 'rgba(255,215,0,0.08)', border: `1px solid ${BORDER}`, borderRadius: '4px', color: GOLD, cursor: 'pointer', whiteSpace: 'nowrap' }}>
        {label}
      </button>
      <span style={{ ...VT, fontSize: '1rem', color: fileName ? GREEN : 'rgba(255,255,255,0.35)', letterSpacing: '1px' }}>
        {fileName || 'No file selected'}
      </span>
      <input ref={ref} type="file" accept={accept} style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { onPick(f.name); onPickFile?.(f) } }} />
    </div>
  )
}

// ─── Step Progress Bar ────────────────────────────────────────────────────────

const StepBar: React.FC<{ current: number; stepLabels: string[]; onJump: (n: number) => void }> = ({ current, stepLabels, onJump }) => {
  const allLabels = [STEP_LABELS[0], ...stepLabels]
  return (
    <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
      {allLabels.map((label, i) => {
        const done = i < current; const active = i === current
        return (
          <button key={i} onClick={() => onJump(i)} title={label} style={{ flex: 1, height: '28px', border: 'none', borderRadius: '3px', background: active ? GOLD : done ? 'rgba(255,215,0,0.35)' : 'rgba(255,215,0,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, transition: 'background 0.2s' }}>
            <span style={{ ...VT, fontSize: '0.65rem', letterSpacing: '1px', color: active ? '#000' : done ? GOLD : GOLD_DIM, lineHeight: 1 }}>
              {i === 0 ? '◆' : `${i}`}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Help Panel ───────────────────────────────────────────────────────────────

const HelpPanel: React.FC<{ step: number; onClose: () => void }> = ({ step, onClose }) => {
  const info = HELP_CONTENT[step] ?? HELP_CONTENT[0]
  return (
    <motion.div initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      style={{ position: 'fixed', top: '52px', right: 0, bottom: 0, width: '300px', background: 'var(--color-modal-bg)', borderLeft: `1px solid ${BORDER}`, zIndex: 200, padding: '1.5rem 1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ ...VT, fontSize: '1.2rem', letterSpacing: '2px', color: GOLD }}>{info.title.toUpperCase()}</span>
        <button onClick={onClose} style={{ ...VT, background: 'none', border: 'none', color: GOLD_DIM, fontSize: '1.2rem', cursor: 'pointer', padding: 0 }}>✕</button>
      </div>
      <div style={{ background: 'rgba(255,215,0,0.05)', border: `1px solid ${GOLD_FAINT}`, borderRadius: '4px', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80px', color: GOLD_DIM, fontSize: '0.85rem', ...VT, letterSpacing: '1px' }}>
        ▶  HOW-TO VIDEO PLACEHOLDER
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <span style={{ ...VT, fontSize: '0.8rem', letterSpacing: '2px', color: GOLD_DIM }}>BEST PRACTICES</span>
        {info.tips.map((tip, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <span style={{ color: GOLD, marginTop: '2px', flexShrink: 0 }}>◆</span>
            <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{tip}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ─── Step 0: Orientation (metadata only) ─────────────────────────────────────

const Step0: React.FC<{
  draft: TaskDraft; taskNumber: number; tutorialSeen: boolean
  onSeenTutorial: () => void; onChange: (p: Partial<TaskDraft>) => void
}> = ({ draft, taskNumber, tutorialSeen, onSeenTutorial, onChange }) => {
  const { data, loading } = useQuery<{ teacherClasses: { id: string; subject: string; grade: number }[] }>(TEACHER_CLASSES_FOR_CREATOR)
  const classes = data?.teacherClasses ?? []
  const subjects = [...new Set(classes.map(c => c.subject))].sort()
  const gradesForSubject = draft.subject
    ? [...new Set(classes.filter(c => c.subject === draft.subject).map(c => c.grade))].sort((a, b) => a - b) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <SectionPanel>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
          <span style={{ ...VT, fontSize: '0.85rem', letterSpacing: '3px', color: GOLD_DIM }}>LEARNING TASK #{taskNumber}</span>
          <span style={{ ...VT, fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px' }}>auto-assigned</span>
        </div>
        <FieldRow label="TOPIC TITLE *">
          <TextInput placeholder="e.g. Public Speaking in Professional Settings" value={draft.title} onChange={e => onChange({ title: e.target.value })} style={{ fontSize: '1.4rem' }} />
        </FieldRow>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <FieldRow label="SUBJECT *">
            <SelectInput value={draft.subject} onChange={e => onChange({ subject: e.target.value, grade: '' })} disabled={loading || subjects.length === 0}>
              <option value="">{loading ? 'LOADING...' : subjects.length === 0 ? 'NO CLASSES ASSIGNED' : '— SELECT SUBJECT —'}</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </SelectInput>
          </FieldRow>
          <FieldRow label="GRADE *">
            <SelectInput value={draft.grade} onChange={e => onChange({ grade: e.target.value })} disabled={!draft.subject || gradesForSubject.length === 0} style={{ width: '120px' }}>
              <option value="">{draft.subject ? '— GRADE —' : '— —'}</option>
              {gradesForSubject.map(g => <option key={g} value={String(g)}>GRADE {g}</option>)}
            </SelectInput>
          </FieldRow>
        </div>
      </SectionPanel>

      {!tutorialSeen ? (
        <SectionPanel>
          <span style={{ ...VT, fontSize: '1rem', letterSpacing: '2px', color: GOLD }}>WHAT IS THE HQL TEMPLATE?</span>
          <div style={{ background: 'rgba(0,0,0,0.6)', border: `1px solid ${BORDER}`, borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '2rem', minHeight: '160px' }}>
            <span style={{ fontSize: '3rem' }}>▶</span>
            <span style={{ ...VT, fontSize: '1rem', letterSpacing: '2px', color: GOLD_DIM }}>ORIENTATION VIDEO</span>
            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>Watch this once to understand the HQL workflow</span>
          </div>
          <button onClick={onSeenTutorial} style={{ ...VT, alignSelf: 'flex-end', fontSize: '1rem', letterSpacing: '2px', padding: '0.4rem 1.25rem', background: 'rgba(255,215,0,0.1)', border: `1px solid ${BORDER}`, borderRadius: '4px', color: GOLD_DIM, cursor: 'pointer' }}>
            SKIP / I'VE SEEN THIS ▶
          </button>
        </SectionPanel>
      ) : (
        <SectionPanel style={{ padding: '0.75rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ ...VT, fontSize: '0.9rem', letterSpacing: '2px', color: GOLD_DIM }}>✓ ORIENTATION COMPLETE</span>
            <button onClick={onSeenTutorial} style={{ ...VT, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.85rem', letterSpacing: '1px' }}>RE-WATCH</button>
          </div>
        </SectionPanel>
      )}
    </div>
  )
}

// ─── BlockCard — collapsed view of an added block ─────────────────────────────

const STEP_SHORT = ['', 'CHALLENGE', 'REFLECT', 'CONTENT', 'QUIZ', 'DISCUSS', 'ASSIGN']

const BlockCard: React.FC<{
  block: HqlBlock; index: number; currentStep: number; totalSteps: number
  onDelete: () => void; onEdit: () => void; onMove: (toStep: number) => void
}> = ({ block, index, currentStep, totalSteps, onDelete, onEdit, onMove }) => {
  const [showMovePicker, setShowMovePicker] = useState(false)
  const meta = BLOCK_META[block.type]
  const parsedCount = block.type === 'QUIZ' ? parseQuiz(block.quizRaw).length : 0
  const reflCount = block.type === 'REFLECTION' ? block.reflectionQuestions.filter(q => q.checked).length : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
      style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${showMovePicker ? 'rgba(100,180,255,0.4)' : BORDER}`, borderLeft: `3px solid ${GOLD_DIM}`, borderRadius: '5px', overflow: 'hidden' }}
    >
      {/* Main row */}
      <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.3rem', lineHeight: 1, flexShrink: 0 }}>{meta.icon}</span>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.1rem', minWidth: 0 }}>
          <div style={{ ...VT, fontSize: '1rem', letterSpacing: '1px', color: '#fff' }}>
            {block.title || meta.label}
          </div>
          <div style={{ ...VT, fontSize: '0.8rem', color: GOLD_DIM, letterSpacing: '1px' }}>
            {block.type === 'QUIZ' && `${parsedCount} QUESTIONS`}
            {block.type === 'REFLECTION' && `${reflCount} SELECTED QUESTIONS`}
            {(block.type === 'VIDEO' || block.type === 'DOCUMENT' || block.type === 'AUDIO') && block.fileName && block.fileName}
            {block.type === 'TEXT' && block.textContent && block.textContent.slice(0, 55) + (block.textContent.length > 55 ? '…' : '')}
            {block.type === 'DISCUSSION' && 'COOPERATIVE DISCUSSION'}
            {block.type === 'ASSIGNMENT' && 'INDIVIDUAL ASSIGNMENT'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          {block.timeMin > 0 && (
            <span style={{ ...VT, fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px' }}>≈{block.timeMin} MIN</span>
          )}
          <span style={{ ...VT, fontSize: '0.72rem', letterSpacing: '1px', padding: '0.1rem 0.4rem', background: 'rgba(255,215,0,0.08)', border: `1px solid rgba(255,215,0,0.2)`, borderRadius: '3px', color: GOLD_DIM }}>
            #{index + 1}
          </span>
          <button
            onClick={() => setShowMovePicker(p => !p)}
            style={{ background: 'none', border: 'none', color: showMovePicker ? 'rgba(100,180,255,0.9)' : 'rgba(100,180,255,0.5)', cursor: 'pointer', fontSize: '0.95rem', padding: 0, lineHeight: 1 }}
            title="Move to another step"
          >⇄</button>
          <button onClick={onEdit} style={{ background: 'none', border: 'none', color: 'rgba(255,215,0,0.5)', cursor: 'pointer', fontSize: '0.95rem', padding: 0, lineHeight: 1 }} title="Edit block">✎</button>
          <button onClick={onDelete} style={{ background: 'none', border: 'none', color: 'rgba(248,113,113,0.6)', cursor: 'pointer', fontSize: '0.95rem', padding: 0, lineHeight: 1 }} title="Remove block">✕</button>
        </div>
      </div>

      {/* Move picker */}
      <AnimatePresence>
        {showMovePicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0.5rem 1rem 0.75rem', borderTop: '1px solid rgba(100,180,255,0.15)', background: 'rgba(100,180,255,0.04)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ ...VT, fontSize: '0.75rem', letterSpacing: '2px', color: 'rgba(100,180,255,0.6)', flexShrink: 0 }}>MOVE TO:</span>
              {Array.from({ length: totalSteps }, (_, i) => i + 1).filter(n => n !== currentStep).map(n => (
                <button
                  key={n}
                  onClick={() => { onMove(n); setShowMovePicker(false) }}
                  style={{ ...VT, fontSize: '0.8rem', letterSpacing: '1px', padding: '0.2rem 0.65rem', background: 'rgba(100,180,255,0.08)', border: '1px solid rgba(100,180,255,0.25)', borderRadius: '4px', color: 'rgba(100,180,255,0.85)', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(100,180,255,0.18)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(100,180,255,0.08)' }}
                >
                  {n} {STEP_SHORT[n]}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── ReflectionBlockEditor ────────────────────────────────────────────────────

const ReflectionBlockEditor: React.FC<{
  questions: ReflectionQuestion[]
  onChange: (questions: ReflectionQuestion[]) => void
}> = ({ questions, onChange }) => {
  const [editingId, setEditingId] = useState<number | null>(null)
  const selectedCount = questions.filter(q => q.checked).length
  const totalTime = questions.filter(q => q.checked).reduce((s, q) => s + q.timeMin, 0)

  const toggle = (id: number) => onChange(questions.map(q => q.id === id ? { ...q, checked: !q.checked } : q))
  const updateText = (id: number, text: string) => onChange(questions.map(q => q.id === id ? { ...q, text } : q))
  const updateTime = (id: number, timeMin: number) => onChange(questions.map(q => q.id === id ? { ...q, timeMin } : q))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ ...VT, fontSize: '0.9rem', letterSpacing: '2px', color: selectedCount >= 3 ? GREEN : AMBER }}>
          {selectedCount} SELECTED {selectedCount < 3 ? '— select at least 3' : '✓'}
        </span>
        <span style={{ ...VT, fontSize: '0.9rem', letterSpacing: '2px', color: GOLD_DIM }}>TOTAL: {totalTime} MIN</span>
      </div>
      {questions.map(q => (
        <div key={q.id} style={{ background: 'rgba(0,0,0,0.35)', border: `1px solid ${BORDER}`, borderRadius: '4px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <button onClick={() => toggle(q.id)} style={{ width: '22px', height: '22px', flexShrink: 0, marginTop: '2px', background: q.checked ? GOLD : 'rgba(255,215,0,0.08)', border: `1px solid ${q.checked ? GOLD : BORDER}`, borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '0.8rem', fontWeight: 'bold' }}>
            {q.checked ? '✓' : ''}
          </button>
          <div style={{ flex: 1 }}>
            {editingId === q.id ? (
              <TextInput value={q.text} onChange={e => updateText(q.id, e.target.value)} onBlur={() => setEditingId(null)} autoFocus />
            ) : (
              <span onClick={() => q.checked && setEditingId(q.id)} style={{ fontSize: '0.95rem', color: q.checked ? '#fff' : 'rgba(255,255,255,0.45)', lineHeight: 1.5, cursor: q.checked ? 'text' : 'default', borderBottom: q.checked ? '1px dashed rgba(255,215,0,0.3)' : 'none' }}>
                {q.text}
              </span>
            )}
          </div>
          {q.checked && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
              <NumInput min={1} max={15} value={q.timeMin} onChange={e => updateTime(q.id, parseInt(e.target.value) || 1)} style={{ width: '60px' }} />
              <span style={{ ...VT, fontSize: '0.8rem', color: GOLD_DIM }}>MIN</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── BlockForm — inline editor for a new block ────────────────────────────────

const QUIZ_EXAMPLE = `1. What is the primary goal of active listening?
A. To prepare your own response
B. To fully understand the speaker's message**
C. To evaluate the speaker's credibility
D. To take notes efficiently`

const BlockForm: React.FC<{
  type: HqlBlockType
  initialBlock?: HqlBlock
  onAdd: (block: HqlBlock) => void
  onCancel: () => void
  onPickFile: (key: string, file: File) => void
}> = ({ type, initialBlock, onAdd, onCancel, onPickFile }) => {
  const [block, setBlock] = useState<HqlBlock>(() => initialBlock ?? makeBlock(type))
  const isEditMode = !!initialBlock
  const [showQuizPreview, setShowQuizPreview] = useState(false)
  const update = (p: Partial<HqlBlock>) => setBlock(b => ({ ...b, ...p }))
  const meta = BLOCK_META[type]

  const isFile = type === 'VIDEO' || type === 'DOCUMENT' || type === 'AUDIO'
  const parsedQuiz = type === 'QUIZ' ? parseQuiz(block.quizRaw) : []
  const selectedRefl = type === 'REFLECTION' ? block.reflectionQuestions.filter(q => q.checked).length : 0

  const canAdd = () => {
    if (isFile) return !!block.fileName
    if (type === 'TEXT') return !!block.textContent.trim()
    if (type === 'REFLECTION') return selectedRefl >= 1
    if (type === 'QUIZ') return parsedQuiz.length > 0 && block.timeMin > 0
    if (type === 'DISCUSSION') return block.timeMin > 0
    if (type === 'ASSIGNMENT') return !!block.textContent.trim() && Object.values(block.allowedFormats).some(Boolean)
    return false
  }

  const fileAccept = type === 'VIDEO' ? 'video/*' : type === 'AUDIO' ? 'audio/*' : '.pdf,.doc,.docx,.ppt,.pptx'

  return (
    <SectionPanel style={{ borderLeft: `3px solid ${GOLD}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ ...VT, fontSize: '1rem', letterSpacing: '2px', color: GOLD }}>
          {meta.icon} {isEditMode ? 'EDIT' : 'ADD'} {meta.label} BLOCK
        </span>
        <button onClick={onCancel} style={{ ...VT, background: 'none', border: 'none', color: GOLD_DIM, fontSize: '1rem', cursor: 'pointer', padding: 0 }}>✕ CANCEL</button>
      </div>

      {/* Title — optional for TEXT, DISCUSSION; hidden for QUIZ/ASSIGNMENT (auto-labelled) */}
      {type !== 'QUIZ' && type !== 'ASSIGNMENT' && (
        <FieldRow label={type === 'TEXT' || type === 'DISCUSSION' ? 'TITLE (OPTIONAL)' : 'LABEL *'}>
          <TextInput
            placeholder={
              type === 'VIDEO' ? 'e.g. Challenge Introduction Video' :
              type === 'DOCUMENT' ? 'e.g. Challenge Scenario PDF' :
              type === 'AUDIO' ? 'e.g. Audio Narrative' :
              type === 'REFLECTION' ? 'e.g. Meta-Learning Reflection' :
              type === 'DISCUSSION' ? 'e.g. Cooperative Discussion' : ''
            }
            value={block.title}
            onChange={e => update({ title: e.target.value })}
          />
        </FieldRow>
      )}

      {/* File blocks */}
      {isFile && (
        <>
          <FilePicker
            label={`📁 UPLOAD ${type}`}
            accept={fileAccept}
            fileName={block.fileName}
            onPick={name => update({ fileName: name, filePath: '' })}
            onPickFile={file => onPickFile(`block_${block.id}`, file)}
          />
          {block.fileName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '4px' }}>
              <span style={{ fontSize: '1.2rem' }}>{meta.icon}</span>
              <span style={{ ...VT, fontSize: '0.95rem', color: GREEN, letterSpacing: '1px' }}>✓ {block.fileName}</span>
            </div>
          )}
          <FieldRow label="ESTIMATED TIME (MINUTES) *">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <NumInput min={1} value={block.timeMin} onChange={e => update({ timeMin: parseInt(e.target.value) || 1 })} />
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' }}>min</span>
            </div>
          </FieldRow>
        </>
      )}

      {/* TEXT block */}
      {type === 'TEXT' && (
        <FieldRow label="CONTENT *">
          <TextArea rows={5} placeholder="Write a note, instruction, or framing text for learners…" value={block.textContent} onChange={e => update({ textContent: e.target.value })} />
        </FieldRow>
      )}

      {/* REFLECTION block */}
      {type === 'REFLECTION' && (
        <ReflectionBlockEditor
          questions={block.reflectionQuestions}
          onChange={reflectionQuestions => update({ reflectionQuestions })}
        />
      )}

      {/* QUIZ block */}
      {type === 'QUIZ' && (
        <>
          <SectionPanel style={{ padding: '0.65rem 1rem', background: 'rgba(255,215,0,0.03)' }}>
            <span style={{ ...VT, fontSize: '0.8rem', letterSpacing: '2px', color: GOLD_DIM }}>FORMAT</span>
            <pre style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {'1. Question text\nA. Wrong option\nB. Correct option**\nC. Wrong option'}
            </pre>
          </SectionPanel>
          <TextArea rows={14} placeholder={QUIZ_EXAMPLE} value={block.quizRaw} onChange={e => { update({ quizRaw: e.target.value }); setShowQuizPreview(false) }} style={{ fontFamily: 'monospace', fontSize: '0.9rem' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ ...VT, fontSize: '0.9rem', letterSpacing: '2px', color: parsedQuiz.length > 0 ? GREEN : GOLD_DIM }}>
              {parsedQuiz.length > 0 ? `✓ ${parsedQuiz.length} QUESTIONS PARSED` : 'PASTE QUIZ ABOVE'}
            </span>
            <button onClick={() => setShowQuizPreview(p => !p)} disabled={parsedQuiz.length === 0}
              style={{ ...VT, fontSize: '0.9rem', letterSpacing: '1px', padding: '0.3rem 1rem', background: parsedQuiz.length > 0 ? 'rgba(255,215,0,0.1)' : 'transparent', border: `1px solid ${parsedQuiz.length > 0 ? BORDER : 'rgba(255,215,0,0.1)'}`, borderRadius: '4px', color: parsedQuiz.length > 0 ? GOLD : GOLD_DIM, cursor: parsedQuiz.length > 0 ? 'pointer' : 'not-allowed' }}>
              {showQuizPreview ? 'HIDE' : 'PREVIEW ▶'}
            </button>
          </div>
          <AnimatePresence>
            {showQuizPreview && parsedQuiz.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                <div style={{ background: 'rgba(0,20,40,0.7)', border: '1px solid rgba(0,120,255,0.3)', borderRadius: '6px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {parsedQuiz.slice(0, 3).map(q => (
                    <div key={q.number} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.9rem', color: '#fff' }}><strong style={{ color: GOLD }}>{q.number}.</strong> {q.text}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '1rem' }}>
                        {q.options.map(opt => (
                          <div key={opt.letter} style={{ padding: '0.2rem 0.5rem', background: opt.isCorrect ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${opt.isCorrect ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '3px', display: 'flex', gap: '0.5rem' }}>
                            <span style={{ ...VT, color: GOLD_DIM, minWidth: '16px' }}>{opt.letter}.</span>
                            <span style={{ fontSize: '0.85rem', color: opt.isCorrect ? GREEN : 'rgba(255,255,255,0.65)' }}>{opt.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {parsedQuiz.length > 3 && <span style={{ ...VT, fontSize: '0.8rem', color: GOLD_DIM }}>… and {parsedQuiz.length - 3} more</span>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <FieldRow label="TOTAL QUIZ TIME (MINUTES) *">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <NumInput min={1} value={block.timeMin} onChange={e => update({ timeMin: parseInt(e.target.value) || 0 })} />
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                {parsedQuiz.length > 0 ? `Recommended: ${Math.round(parsedQuiz.length * 1.5)}–${parsedQuiz.length * 2} min` : ''}
              </span>
            </div>
          </FieldRow>
        </>
      )}

      {/* DISCUSSION block */}
      {type === 'DISCUSSION' && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {[
              { icon: '①', label: 'COMPARE QUIZ ANSWERS', desc: 'Group compares individual quiz answers question by question.' },
              { icon: '②', label: 'COMPARE REFLECTIONS', desc: 'Group compares meta-cognitive responses to find consensus.' },
              { icon: '③', label: 'GROUP SOLUTION', desc: 'Scribe drafts a collective answer to the original challenge.' },
            ].map(ph => (
              <div key={ph.label} style={{ display: 'flex', gap: '0.75rem', padding: '0.6rem 0.9rem', background: 'rgba(0,0,0,0.35)', border: `1px solid ${BORDER}`, borderRadius: '4px' }}>
                <span style={{ ...VT, fontSize: '1.4rem', color: GOLD, lineHeight: 1 }}>{ph.icon}</span>
                <div>
                  <div style={{ ...VT, fontSize: '0.9rem', letterSpacing: '2px', color: GOLD }}>{ph.label}</div>
                  <div style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{ph.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <FieldRow label="TOTAL DISCUSSION TIME (MINUTES) *">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <NumInput min={5} value={block.timeMin} onChange={e => update({ timeMin: parseInt(e.target.value) || 0 })} />
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>Recommended: 3–4 min per quiz question</span>
            </div>
          </FieldRow>
          <FieldRow label="DISCUSSION PROMPT (OPTIONAL)">
            <TextArea rows={3} placeholder="Optional: a specific question or scenario to guide the group discussion…" value={block.textContent} onChange={e => update({ textContent: e.target.value })} />
          </FieldRow>
        </>
      )}

      {/* ASSIGNMENT block */}
      {type === 'ASSIGNMENT' && (
        <>
          <FieldRow label="ASSIGNMENT TITLE *">
            <TextInput placeholder="e.g. Individual Challenge Response" value={block.title} onChange={e => update({ title: e.target.value })} />
          </FieldRow>
          <FieldRow label="SPECIFIC INSTRUCTIONS *">
            <TextArea rows={5} placeholder="Describe exactly what learners must produce and how it should address the original challenge scenario." value={block.textContent} onChange={e => update({ textContent: e.target.value })} />
          </FieldRow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <Label>ALLOWED SUBMISSION FORMATS *</Label>
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
              {([
                { key: 'video' as keyof AllowedFormats, icon: '🎬', label: 'VIDEO' },
                { key: 'audio' as keyof AllowedFormats, icon: '🎵', label: 'AUDIO' },
                { key: 'pdf'   as keyof AllowedFormats, icon: '📄', label: 'PDF/DOC' },
                { key: 'image' as keyof AllowedFormats, icon: '🖼', label: 'IMAGE' },
              ]).map(({ key, icon, label }) => {
                const active = block.allowedFormats[key]
                return (
                  <button key={key} onClick={() => update({ allowedFormats: { ...block.allowedFormats, [key]: !active } })}
                    style={{ ...VT, fontSize: '0.95rem', letterSpacing: '1px', padding: '0.45rem 1rem', background: active ? 'rgba(255,215,0,0.15)' : 'rgba(255,215,0,0.04)', border: `1px solid ${active ? GOLD : BORDER}`, borderRadius: '5px', color: active ? GOLD : GOLD_DIM, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {icon} {label} {active && <span style={{ color: GREEN }}>✓</span>}
                  </button>
                )
              })}
            </div>
          </div>
          <FieldRow label="ESTIMATED TIME (MINUTES) *">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <NumInput min={5} value={block.timeMin} onChange={e => update({ timeMin: parseInt(e.target.value) || 0 })} />
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' }}>min</span>
            </div>
          </FieldRow>
        </>
      )}

      {/* Add / Cancel row */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.25rem', borderTop: `1px solid rgba(255,215,0,0.1)` }}>
        <button onClick={onCancel} style={{ ...VT, fontSize: '0.95rem', letterSpacing: '1px', padding: '0.4rem 1rem', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '4px', color: GOLD_DIM, cursor: 'pointer' }}>
          CANCEL
        </button>
        <button
          onClick={() => canAdd() && onAdd(block)}
          disabled={!canAdd()}
          style={{ ...VT, fontSize: '0.95rem', letterSpacing: '1px', padding: '0.4rem 1.25rem', background: canAdd() ? GOLD : 'rgba(255,215,0,0.15)', border: 'none', borderRadius: '4px', color: canAdd() ? '#000' : GOLD_DIM, cursor: canAdd() ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}
        >
          {isEditMode ? 'SAVE CHANGES ✓' : 'ADD BLOCK ✓'}
        </button>
      </div>
    </SectionPanel>
  )
}

// ─── StepBlockBuilder — the per-step block canvas ─────────────────────────────

const StepBlockBuilder: React.FC<{
  stepNumber: number
  stepLabel: string
  totalSteps: number
  blocks: HqlBlock[]
  onChange: (blocks: HqlBlock[]) => void
  onPickFile: (key: string, file: File) => void
  onMoveBlock: (block: HqlBlock, toStep: number) => void
  onDeleteStep: () => void
}> = ({ stepNumber, stepLabel, totalSteps, blocks, onChange, onPickFile, onMoveBlock, onDeleteStep }) => {
  const [addingType, setAddingType] = useState<HqlBlockType | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const addBlock = (block: HqlBlock) => {
    onChange([...blocks, block])
    setAddingType(null)
  }
  const saveEdit = (updated: HqlBlock) => {
    onChange(blocks.map(b => b.id === updated.id ? updated : b))
    setEditingId(null)
  }
  const startEdit = (id: string) => { setEditingId(id); setAddingType(null) }
  const removeBlock = (id: string) => onChange(blocks.filter(b => b.id !== id))

  const handleDeleteStep = () => {
    if (blocks.length > 0) {
      if (!window.confirm(`Delete step "${stepLabel}"? This will remove all ${blocks.length} block(s) in this step.`)) return
    }
    onDeleteStep()
  }

  const palette = STEP_TYPE_PALETTE[stepLabel] ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, flex: 1 }}>
          {STEP_TYPE_DESCRIPTIONS[stepLabel] ?? ''}
        </p>
        <button
          onClick={handleDeleteStep}
          style={{ ...VT, flexShrink: 0, fontSize: '0.8rem', letterSpacing: '1px', padding: '0.25rem 0.65rem', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '4px', color: 'rgba(248,113,113,0.6)', cursor: 'pointer' }}
          title="Delete this step"
        >
          🗑 DELETE STEP
        </button>
      </div>

      {/* Existing blocks */}
      <AnimatePresence>
        {blocks.map((block, i) => (
          editingId === block.id ? (
            <motion.div key={`edit-${block.id}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
              <BlockForm
                type={block.type}
                initialBlock={block}
                onAdd={saveEdit}
                onCancel={() => setEditingId(null)}
                onPickFile={onPickFile}
              />
            </motion.div>
          ) : (
            <BlockCard key={block.id} block={block} index={i} currentStep={stepNumber} totalSteps={totalSteps} onDelete={() => removeBlock(block.id)} onEdit={() => startEdit(block.id)} onMove={toStep => onMoveBlock(block, toStep)} />
          )
        ))}
      </AnimatePresence>

      {/* Inline block form */}
      <AnimatePresence mode="wait">
        {addingType ? (
          <motion.div key={addingType} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <BlockForm
              type={addingType}
              onAdd={addBlock}
              onCancel={() => setAddingType(null)}
              onPickFile={onPickFile}
            />
          </motion.div>
        ) : (
          <motion.div key="palette" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {blocks.length === 0 && (
                <div style={{ ...VT, fontSize: '0.85rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '1px', textAlign: 'center', padding: '0.5rem' }}>
                  NO BLOCKS YET — ADD ONE BELOW
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {palette.map(type => {
                  const m = BLOCK_META[type]
                  return (
                    <button key={type} onClick={() => { setAddingType(type); setEditingId(null) }}
                      style={{ ...VT, fontSize: '0.9rem', letterSpacing: '1px', padding: '0.45rem 0.9rem', background: 'rgba(255,215,0,0.06)', border: `1px dashed ${BORDER}`, borderRadius: '5px', color: GOLD_DIM, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.12)'; e.currentTarget.style.color = GOLD }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.06)'; e.currentTarget.style.color = GOLD_DIM }}
                    >
                      {m.icon} + {m.label}
                    </button>
                  )
                })}
              </div>
              {blocks.length > 0 && (
                <div style={{ ...VT, fontSize: '0.8rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '1px', textAlign: 'right' }}>
                  {blocks.length} BLOCK{blocks.length !== 1 ? 'S' : ''} · CLICK NEXT → WHEN DONE
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(draft: TaskDraft, step: number): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (step === 0) {
    if (!draft.title.trim())   errors.push('Topic title is required')
    if (!draft.subject.trim()) errors.push('Subject is required')
    if (!draft.grade.trim())   errors.push('Grade is required')
  } else {
    const blocks = draft.stepBlocks[step] ?? []
    const label = draft.stepLabels[step - 1] ?? `STEP ${step}`
    if (blocks.length === 0) errors.push(`Add at least one block to ${label}`)
  }
  return { valid: errors.length === 0, errors }
}

// ─── Template Selector ────────────────────────────────────────────────────────

type SelectedTemplate = 'hql' | 'general'

const TEMPLATE_DEFS = [
  {
    id: 'hql' as SelectedTemplate, badge: 'RECOMMENDED', subtitle: 'HQL TEMPLATE',
    title: 'HIGHEST QUALITY\nOF LEARNING', videoLabel: 'HQL TEMPLATE EXPLAINED', videoDuration: '~6 min',
    description: 'A structured 6-step pedagogical journey. Each step is a flexible block canvas — add as many videos, documents, quizzes, and activities as you need, then click NEXT to move on.',
    steps: ['CHALLENGE', 'REFLECTION', 'CONTENT', 'QUIZ', 'DISCUSSION', 'ASSIGNMENT'],
  },
  {
    id: 'general' as SelectedTemplate, badge: null, subtitle: 'FLEXIBLE TEMPLATE',
    title: 'GENERAL\nLEARNING TASK', videoLabel: 'GENERAL TEMPLATE OVERVIEW', videoDuration: '~4 min',
    description: 'No preset structure. Build your task by adding content blocks in any order — videos, documents, quizzes, discussions, and assignments.',
    steps: [],
  },
]

const TemplateSelector: React.FC<{ onSelect: (t: SelectedTemplate) => void }> = ({ onSelect }) => {
  const navigate = useNavigate()
  return (
    <div style={{ height: 'calc(100vh - 52px)', marginTop: '52px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', ...VT }}>
      <button onClick={() => navigate('/task-manager')} style={{ ...VT, background: 'none', border: 'none', color: GOLD_DIM, fontSize: '0.9rem', letterSpacing: '2px', cursor: 'pointer', marginBottom: '1.5rem', alignSelf: 'flex-start', maxWidth: '780px', width: '100%' }}>
        ◂ TASK MANAGER
      </button>
      <div style={{ textAlign: 'center', maxWidth: '780px', width: '100%' }}>
        <h1 style={{ ...VT, margin: '0 0 0.35rem', fontSize: '1.9rem', letterSpacing: '4px', color: GOLD }}>CHOOSE A TEMPLATE</h1>
        <p style={{ margin: '0 0 2rem', fontSize: '1rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>How do you want to structure this Learning Task?</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', width: '100%', maxWidth: '780px' }}>
        {TEMPLATE_DEFS.map((t, di) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: di * 0.1 }}
            style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
            {t.badge && <span style={{ position: 'absolute', top: '1rem', right: '1rem', ...VT, fontSize: '0.7rem', letterSpacing: '2px', padding: '0.15rem 0.5rem', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '3px', color: GREEN }}>{t.badge}</span>}
            <div>
              <div style={{ fontSize: '0.75rem', letterSpacing: '2px', color: GOLD_DIM }}>{t.subtitle}</div>
              <div style={{ fontSize: '1.4rem', letterSpacing: '2px', color: GOLD, marginTop: '0.15rem', whiteSpace: 'pre-line', lineHeight: 1.15 }}>{t.title}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.6)', border: `1px solid ${BORDER}`, borderRadius: '6px', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontSize: '2rem', lineHeight: 1, color: GOLD_DIM }}>▶</span>
              <span style={{ ...VT, fontSize: '0.88rem', letterSpacing: '1px', color: GOLD_DIM, textAlign: 'center' }}>{t.videoLabel}</span>
              <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.28)', textAlign: 'center' }}>{t.videoDuration} · Video coming soon</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{t.description}</p>
            {t.steps.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {t.steps.map((s, i) => (
                  <span key={s} style={{ ...VT, fontSize: '0.72rem', letterSpacing: '1px', padding: '0.15rem 0.5rem', background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '3px', color: GOLD_DIM }}>
                    {i + 1}. {s}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.32)', fontStyle: 'italic' }}>
                Add VIDEO · DOCUMENT · QUIZ · ASSIGNMENT · DISCUSSION · NOTE blocks in any order.
              </div>
            )}
            <button onClick={() => onSelect(t.id)} style={{ ...VT, fontSize: '1.1rem', letterSpacing: '2px', padding: '0.65rem', background: t.id === 'hql' ? GOLD : GOLD_FAINT, border: t.id === 'hql' ? 'none' : `1px solid ${BORDER}`, borderRadius: '5px', color: t.id === 'hql' ? '#000' : GOLD, cursor: 'pointer', fontWeight: t.id === 'hql' ? 'bold' : 'normal', marginTop: 'auto' }}>
              USE THIS TEMPLATE ▶
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── Initial draft ────────────────────────────────────────────────────────────

const INITIAL_DRAFT: TaskDraft = {
  title: '', subject: '', grade: '',
  stepLabels: ['CHALLENGE', 'REFLECTION', 'CONTENT', 'QUIZ', 'DISCUSSION', 'ASSIGNMENT'],
  stepBlocks: [[], [], [], [], [], [], []],
}

// ─── DB row → HqlBlock conversion (used when loading a saved task) ────────────

interface RawBlock {
  id: string; step_number: number; block_type: string; position: number
  title: string | null; time_min: number; text_content: string | null
  file_path: string | null; original_name: string | null
  data: Record<string, unknown> | null
}

function rowsToStepBlocks(rows: RawBlock[], stepCount = 6): HqlBlock[][] {
  const defaultReflQ = () => PRESET_QUESTIONS.map((text, i) => ({ id: i, text, checked: i < 4, timeMin: 2 }))
  const defaultFormats: AllowedFormats = { video: true, audio: false, pdf: true, image: false }
  const stepBlocks: HqlBlock[][] = Array.from({ length: stepCount + 1 }, () => [] as HqlBlock[])
  for (const row of rows) {
    const sn = row.step_number
    if (sn < 1 || sn > stepCount) continue
    const type = row.block_type as HqlBlockType
    const d = row.data ?? {}
    stepBlocks[sn].push({
      id: row.id,
      type,
      title: row.title ?? '',
      timeMin: row.time_min ?? 0,
      fileName: row.original_name ?? '',
      filePath: row.file_path ?? '',
      textContent: row.text_content ?? '',
      reflectionQuestions: type === 'REFLECTION'
        ? ((d.questions as ReflectionQuestion[]) ?? defaultReflQ())
        : defaultReflQ(),
      quizRaw: type === 'QUIZ' ? ((d.quizRaw as string) ?? '') : '',
      allowedFormats: type === 'ASSIGNMENT'
        ? ((d.allowedFormats as AllowedFormats) ?? defaultFormats)
        : defaultFormats,
    })
  }
  return stepBlocks
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const LearningTaskCreator: React.FC = () => {
  const navigate = useNavigate()
  const { taskId } = useParams<{ taskId?: string }>()
  const token = sessionStorage.getItem('sl_token')
  const [template, setTemplate] = useState<SelectedTemplate | null>(null)
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<TaskDraft>(INITIAL_DRAFT)
  const [tutorialSeen, setTutorialSeen] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showAddStep, setShowAddStep] = useState(false)
  // For general task editing — passed to GeneralTaskCreator
  const [generalEditMeta, setGeneralEditMeta] = useState<{ title: string; subject: string; grade: string } | null>(null)
  const taskIdRef = useRef<string>(taskId ?? crypto.randomUUID())
  const fileStoreRef = useRef<Map<string, File>>(new Map())

  const { data: countData } = useQuery<{ taskCount: number }>(TASK_COUNT_QUERY, { skip: template !== 'hql' })
  const { data: loadData, loading: loadLoading } = useQuery<{
    taskById: { id: string; title: string; subject: string; grade: string; stepLabels: string[]; templateType: string } | null
    hqlBlocks: string
  }>(LOAD_TASK, { skip: !taskId, variables: { id: taskId } })
  const [saveHqlTask] = useMutation(SAVE_HQL_TASK)

  useEffect(() => {
    if (!loadData?.taskById) return
    const task = loadData.taskById
    taskIdRef.current = task.id
    if (task.templateType === 'general') {
      setGeneralEditMeta({ title: task.title, subject: task.subject, grade: task.grade })
      setTemplate('general')
    } else {
      const rows: RawBlock[] = JSON.parse(loadData.hqlBlocks)
      const labels: string[] = task.stepLabels?.length ? task.stepLabels : ['CHALLENGE', 'REFLECTION', 'CONTENT', 'QUIZ', 'DISCUSSION', 'ASSIGNMENT']
      setDraft({
        title: task.title,
        subject: task.subject,
        grade: task.grade,
        stepLabels: labels,
        stepBlocks: rowsToStepBlocks(rows, labels.length),
      })
      setTemplate('hql')
    }
  }, [loadData])

  usePageBackground('home')

  if (taskId && (loadLoading || !template)) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: "'VT323', monospace", fontSize: '1.2rem', letterSpacing: '3px', color: 'rgba(255,215,0,0.6)' }}>
      LOADING TASK…
    </div>
  )

  if (template === null) return <TemplateSelector onSelect={setTemplate} />
  if (template === 'general') return <GeneralTaskCreator onBack={() => setTemplate(null)} editingTaskId={taskId} editingMeta={generalEditMeta} />

  const taskNumber = (countData?.taskCount ?? 0) + 1

  const storeFile = (key: string, file: File) => { fileStoreRef.current.set(key, file) }

  const onChange = (partial: Partial<TaskDraft>) => {
    setDraft(prev => ({ ...prev, ...partial }))
    setShowErrors(false)
    setSaved(false)
  }

  const onStepBlocksChange = (stepNum: number, blocks: HqlBlock[]) => {
    const updated = [...draft.stepBlocks]
    updated[stepNum] = blocks
    onChange({ stepBlocks: updated })
  }

  const onMoveBlock = (block: HqlBlock, fromStep: number, toStep: number) => {
    const updated = draft.stepBlocks.map(arr => [...arr])
    updated[fromStep] = updated[fromStep].filter(b => b.id !== block.id)
    if (!updated[toStep]) updated[toStep] = []
    updated[toStep] = [...updated[toStep], block]
    onChange({ stepBlocks: updated })
  }

  const deleteStep = (sn: number) => {
    const newLabels = draft.stepLabels.filter((_, i) => i !== sn - 1)
    const newBlocks = draft.stepBlocks.filter((_, i) => i !== sn)
    setDraft(prev => ({ ...prev, stepLabels: newLabels, stepBlocks: newBlocks }))
    setStep(s => Math.min(s, newLabels.length))
    setSaved(false)
  }

  const addStep = (label: string) => {
    const newLabels = [...draft.stepLabels, label]
    const newBlocks = [...draft.stepBlocks, []]
    setDraft(prev => ({ ...prev, stepLabels: newLabels, stepBlocks: newBlocks }))
    setStep(newLabels.length)
    setShowAddStep(false)
    setSaved(false)
  }

  const { valid, errors } = validate(draft, step)

  const handleNext = () => {
    if (!valid) { setShowErrors(true); return }
    setShowErrors(false)
    setStep(s => Math.min(s + 1, draft.stepLabels.length))
  }

  const handleBack = () => {
    setShowErrors(false)
    setStep(s => Math.max(s - 1, 0))
  }

  const doSave = async (publish: boolean) => {
    setIsSaving(true)
    setSaveError(null)
    try {
      const tid = taskIdRef.current
      const store = fileStoreRef.current

      // Upload any pending files and collect updated block arrays
      const updatedStepBlocks = draft.stepBlocks.map(arr => [...arr])
      for (let sn = 1; sn <= draft.stepLabels.length; sn++) {
        const updated: HqlBlock[] = []
        for (const block of updatedStepBlocks[sn]) {
          let filePath = block.filePath
          const file = store.get(`block_${block.id}`)
          if (file) {
            filePath = await uploadFile(file, tid, `step-${sn}-${block.type.toLowerCase()}`, token)
            store.delete(`block_${block.id}`)
          }
          updated.push({ ...block, filePath })
        }
        updatedStepBlocks[sn] = updated
      }

      // Persist updated paths back to draft so re-saves skip re-upload
      setDraft(prev => ({ ...prev, stepBlocks: updatedStepBlocks }))

      // Flatten blocks into the mutation input
      const allBlocks: {
        id: string; stepNumber: number; blockType: string; position: number
        title: string | null; timeMin: number; textContent: string | null
        filePath: string | null; originalName: string | null; data: string | null
      }[] = []

      for (let sn = 1; sn <= draft.stepLabels.length; sn++) {
        updatedStepBlocks[sn].forEach((block, pos) => {
          let data: string | null = null
          if (block.type === 'REFLECTION') {
            data = JSON.stringify({ questions: block.reflectionQuestions })
          } else if (block.type === 'QUIZ') {
            const questions = parseQuiz(block.quizRaw).map(q => ({
              number: q.number, text: q.text, options: q.options,
              correctIndex: q.options.findIndex(o => o.isCorrect),
            }))
            data = JSON.stringify({ quizRaw: block.quizRaw, questions })
          } else if (block.type === 'ASSIGNMENT') {
            data = JSON.stringify({ allowedFormats: block.allowedFormats })
          }

          allBlocks.push({
            id: block.id,
            stepNumber: sn,
            blockType: block.type,
            position: pos,
            title: block.title || null,
            timeMin: block.timeMin,
            textContent: (block.type === 'TEXT' || block.type === 'ASSIGNMENT' || block.type === 'DISCUSSION') ? (block.textContent || null) : null,
            filePath: block.filePath || null,
            originalName: block.fileName || null,
            data,
          })
        })
      }

      await saveHqlTask({
        variables: {
          publish,
          input: {
            id: tid,
            title: draft.title,
            subject: draft.subject,
            grade: draft.grade,
            stepLabels: draft.stepLabels,
            blocks: allBlocks,
          },
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

  const handlePublish = () => {
    const allErrors: string[] = []
    for (let i = 0; i <= draft.stepLabels.length; i++) {
      const r = validate(draft, i)
      allErrors.push(...r.errors)
    }
    if (allErrors.length > 0) {
      alert('Fix all steps before publishing:\n\n' + allErrors.join('\n'))
      return
    }
    doSave(true)
  }

  const totalTimeMin = draft.stepBlocks.flat().reduce((s, b) => s + b.timeMin, 0)

  const stepContent = [
    <Step0 key={0} draft={draft} taskNumber={taskNumber} tutorialSeen={tutorialSeen} onSeenTutorial={() => setTutorialSeen(t => !t)} onChange={onChange} />,
    ...draft.stepLabels.map((label, i) => {
      const sn = i + 1
      return (
        <StepBlockBuilder
          key={sn}
          stepNumber={sn}
          stepLabel={label}
          totalSteps={draft.stepLabels.length}
          blocks={draft.stepBlocks[sn] ?? []}
          onChange={blocks => onStepBlocksChange(sn, blocks)}
          onPickFile={storeFile}
          onMoveBlock={(block, toStep) => onMoveBlock(block, sn, toStep)}
          onDeleteStep={() => deleteStep(sn)}
        />
      )
    }),
  ]

  return (
    <div className="theatrical-container" style={{ alignItems: 'flex-start', overflowY: 'auto' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: '760px', margin: '72px auto 3rem', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxSizing: 'border-box' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <button onClick={() => setTemplate(null)} style={{ ...VT, background: 'none', border: 'none', color: GOLD_DIM, fontSize: '0.9rem', letterSpacing: '2px', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
              ◂ CHANGE TEMPLATE
            </button>
            <h1 style={{ ...VT, margin: 0, fontSize: '1.8rem', letterSpacing: '3px', color: GOLD, lineHeight: 1 }}>TASK CREATOR</h1>
            {draft.title && (
              <span style={{ ...VT, fontSize: '1rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.5)' }}>{draft.title.toUpperCase()}</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
            {totalTimeMin > 0 && (
              <span style={{ ...VT, fontSize: '0.85rem', letterSpacing: '2px', color: GOLD_DIM }}>⏱ {totalTimeMin} MIN TOTAL</span>
            )}
            <button onClick={() => setShowHelp(h => !h)} style={{ width: '36px', height: '36px', borderRadius: '50%', background: showHelp ? GOLD : 'rgba(255,215,0,0.1)', border: `1px solid ${showHelp ? GOLD : BORDER}`, color: showHelp ? '#000' : GOLD, fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Contextual help">?</button>
          </div>
        </div>

        {/* Step bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <StepBar current={step} stepLabels={draft.stepLabels} onJump={setStep} />
            <button
              onClick={() => setShowAddStep(s => !s)}
              title="Add a new step"
              style={{ flexShrink: 0, width: '28px', height: '28px', border: `1px dashed ${showAddStep ? GOLD : BORDER}`, borderRadius: '3px', background: showAddStep ? 'rgba(255,215,0,0.1)' : 'transparent', color: showAddStep ? GOLD : GOLD_DIM, fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
            >+</button>
          </div>
          <AnimatePresence>
            {showAddStep && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                <div style={{ padding: '0.6rem 0.75rem', background: 'rgba(255,215,0,0.04)', border: `1px solid ${BORDER}`, borderRadius: '5px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ ...VT, fontSize: '0.75rem', letterSpacing: '2px', color: GOLD_DIM }}>ADD STEP — CHOOSE TYPE:</span>
                  <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                    {AVAILABLE_STEP_TYPES.map(t => (
                      <button key={t.label} onClick={() => addStep(t.label)}
                        style={{ ...VT, fontSize: '0.85rem', letterSpacing: '1px', padding: '0.3rem 0.75rem', background: 'rgba(255,215,0,0.07)', border: `1px solid ${BORDER}`, borderRadius: '4px', color: GOLD_DIM, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.15)'; e.currentTarget.style.color = GOLD }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.07)'; e.currentTarget.style.color = 'rgba(255,215,0,0.5)' }}
                      >
                        {t.icon} {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ ...VT, fontSize: '0.8rem', letterSpacing: '2px', color: GOLD }}>
              {step === 0 ? '◆ ORIENTATION' : `STEP ${step} — ${draft.stepLabels[step - 1] ?? ''}`}
            </span>
            <span style={{ ...VT, fontSize: '0.8rem', letterSpacing: '1px', color: GOLD_DIM }}>{step} / {draft.stepLabels.length}</span>
          </div>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
            {stepContent[step]}
          </motion.div>
        </AnimatePresence>

        {/* Validation errors */}
        <AnimatePresence>
          {showErrors && errors.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.4)', borderRadius: '5px', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {errors.map((e, i) => (
                <span key={i} style={{ ...VT, fontSize: '0.95rem', color: RED, letterSpacing: '1px' }}>✕ {e}</span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.25rem', borderTop: `1px solid ${BORDER}` }}>
          <button onClick={handleBack} disabled={step === 0} style={{ ...VT, fontSize: '1.05rem', letterSpacing: '2px', padding: '0.5rem 1.25rem', background: 'transparent', border: `1px solid ${step === 0 ? 'rgba(255,215,0,0.1)' : BORDER}`, borderRadius: '4px', color: step === 0 ? 'rgba(255,215,0,0.2)' : GOLD_DIM, cursor: step === 0 ? 'not-allowed' : 'pointer' }}>
            ◂ BACK
          </button>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {saveError && <span style={{ ...VT, fontSize: '0.85rem', color: RED, letterSpacing: '1px' }}>✕ {saveError}</span>}
            {saved && !saveError && <span style={{ ...VT, fontSize: '0.9rem', color: GREEN, letterSpacing: '1px' }}>✓ DRAFT SAVED</span>}
            <button onClick={() => setShowPreview(true)} style={{ ...VT, fontSize: '1rem', letterSpacing: '1px', padding: '0.5rem 1.1rem', background: 'rgba(80,220,200,0.07)', border: '1px solid rgba(80,220,200,0.3)', borderRadius: '4px', color: 'rgba(80,220,200,0.8)', cursor: 'pointer' }}>
              👁 PREVIEW
            </button>
            <button onClick={() => doSave(false)} disabled={isSaving} style={{ ...VT, fontSize: '1rem', letterSpacing: '1px', padding: '0.5rem 1.1rem', background: 'rgba(255,215,0,0.07)', border: `1px solid ${BORDER}`, borderRadius: '4px', color: isSaving ? 'rgba(255,215,0,0.3)' : GOLD_DIM, cursor: isSaving ? 'wait' : 'pointer' }}>
              {isSaving ? '⏳ SAVING…' : '💾 DRAFT'}
            </button>
            {step < draft.stepLabels.length ? (
              <button onClick={handleNext} style={{ ...VT, fontSize: '1.05rem', letterSpacing: '2px', padding: '0.5rem 1.5rem', background: GOLD, border: 'none', borderRadius: '4px', color: '#000', cursor: 'pointer', fontWeight: 'bold' }}>
                NEXT ▶
              </button>
            ) : (
              <button onClick={handlePublish} disabled={isSaving} style={{ ...VT, fontSize: '1.05rem', letterSpacing: '2px', padding: '0.5rem 1.5rem', background: isSaving ? 'rgba(74,222,128,0.3)' : GREEN, border: 'none', borderRadius: '4px', color: '#000', cursor: isSaving ? 'wait' : 'pointer', fontWeight: 'bold' }}>
                {isSaving ? '⏳ SAVING…' : '✓ PUBLISH'}
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Help panel */}
      <AnimatePresence>
        {showHelp && <HelpPanel key="help" step={step} onClose={() => setShowHelp(false)} />}
      </AnimatePresence>

      {/* Preview modal */}
      {showPreview && (
        <TaskPreviewModal
          template="hql"
          draft={draft}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  )
}
