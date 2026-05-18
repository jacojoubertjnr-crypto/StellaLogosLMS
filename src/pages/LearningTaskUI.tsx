import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, gql } from '@apollo/client'
import { useAuthStore } from '@/stores/authStore'
import { usePageBackground } from '@/hooks/usePageBackground'
import { useQuestStore } from '@/stores/questStore'

const MY_TASK_GROUP = gql`
  query MyTaskGroup($academicClassId: ID!) {
    myTaskGroup(academicClassId: $academicClassId) {
      id
      conversationId
      members {
        learnerId
        displayName
        role
      }
    }
  }
`

const GROUP_CHAT_MESSAGES = gql`
  query GroupChatMessages($conversationId: ID!) {
    conversationMessages(conversationId: $conversationId, limit: 200) {
      id senderName body time
    }
  }
`

const SEND_GROUP_MESSAGE = gql`
  mutation SendGroupMessage($conversationId: ID!, $body: String!) {
    sendMessage(conversationId: $conversationId, body: $body) {
      id senderName body time
    }
  }
`

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = 1 | 2 | 3 | 4 | 5
type Role = 'leader' | 'timer' | 'scribe' | 'angle-checker'

interface QuizQuestion {
  id: number
  text: string
  options: string[]
  correct: string
}

interface ChatMessage {
  id: number
  author: string
  body: string
  time: string
  isTeacher?: boolean
}

interface MetacogState {
  problem: string
  criteria: string
  solution: string
  audit: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FONT = "'VT323', monospace"
const ACCENT = 'var(--color-accent, #FFD700)'
const TEXT = 'var(--color-text, #2C1810)'

const CHALLENGE_SCENARIO = `You are a Grade 10 learner who has just been selected by your class to deliver a 5-minute presentation to the school board tomorrow morning. The topic: "How can our school improve its digital learning resources?"

Your class is counting on you. But as you sit down to prepare, reality sets in: you have never spoken in front of the school board before, you have no idea what they actually want to hear, your notes are scattered across three different exercise books, and just thinking about standing at that podium makes your hands shake.

You have 24 hours. The pressure is real. The stakes are high.

What do you do?`

const QUIZ_QUESTIONS: QuizQuestion[] = [
  { id: 1,  text: 'Which of the following is an INCORRECT header of the main method?', options: ['public static void main(String[] args)', 'public static void mane(String[] args)'], correct: 'B' },
  { id: 2,  text: 'Which of the following output statements is INCORRECT?', options: ['System.out.prin1n("Hello World");', 'System.out.print("Hello World");', 'System.out.println("Hello World");'], correct: 'A' },
  { id: 3,  text: 'Which of the following letters is NOT an example of a letter used in an escape sequence in Java?', options: ['t', 'n', 'm'], correct: 'C' },
  { id: 4,  text: 'True or False: String is the most suitable data type for a variable containing a single letter.', options: ['True', 'False'], correct: 'B' },
  { id: 5,  text: 'True or False: Double is the most suitable data type for a variable containing a decimal number.', options: ['True', 'False'], correct: 'A' },
  { id: 6,  text: 'True or False: The data type used for True and False is called: booleen.', options: ['True', 'False'], correct: 'B' },
  { id: 7,  text: 'The following is an INCORRECT rule regarding variable names in Java:', options: ['variable names cannot contain a space.', 'variable names cannot start with a capital letter.', 'variable names cannot start with a number.'], correct: 'B' },
  { id: 8,  text: 'Identify the INCORRECT code that will NOT add the contents of a variable called "name" to a variable called "surname".', options: ['System.out.println("Your full name is" + name + " " + surname);', 'System.out.print("Your full name is" + name " " + surname);', 'System.out.print("Your full name is" + name + " " + surname);'], correct: 'B' },
  { id: 9,  text: 'Identify the CORRECT code that will change a given input to capital letters.', options: ['String name = JOptionPane.showInputDialog("What is your surname?").toUppercase();', 'String name = JOptionPane.showInputDialog("What is your name?").toUpperCase();', 'String name = JOptionPane.showInputDialog("What is your initial?").toupperCase();'], correct: 'B' },
  { id: 10, text: 'True or False: "double.parseDouble" will change String input into a whole number (without decimals).', options: ['True', 'False'], correct: 'B' },
  { id: 11, text: 'In Java, multiplication is indicated by the following symbol:', options: ['x', '*'], correct: 'B' },
  { id: 12, text: 'Indicate which line of code will output a number with three decimal spaces:', options: ['new DecimalFormat("#.###");', 'new DecimalFormat("#.3");', 'new DecimalFormat("#.##");'], correct: 'A' },
  { id: 13, text: 'Indicate which line of code will return the letter "o" from a variable called "word" that contains "hello".', options: ['word.charAt(0);', 'word.charAt(4);', 'word.charAt(5);'], correct: 'B' },
  { id: 14, text: 'Which group do you think needs to be rescued first? The group with the elderly lady (Group 1) or the group with the child (Group 2)?', options: ['Group 1', 'Group 2'], correct: 'B' },
]

const RESOURCES: { type: string; title: string; desc: string; href: string }[] = [
  { type: 'VIDEO', title: 'Content Mastery Video', desc: 'Instructional video — watch before attempting the quiz', href: '/assets/learning-tasks/LearningTask1/Content/content_video.mp4' },
  { type: 'PDF',   title: 'Reference Document',    desc: 'Study material for this learning task',              href: '/assets/learning-tasks/LearningTask1/Content/content_document.pdf' },
]

// ─── Dev Group Config ─────────────────────────────────────────────────────────
// For dev purposes: 4 fixed learners always in the same group with fixed roles.
// Replace with real group-assignment logic when the backend supports it.

const DEV_GROUP: { email: string; name: string; role: Role }[] = [
  { email: 'learner@stellalogos.dev',  name: 'Aria BOT',   role: 'leader'        },
  { email: 'learner2@stellalogos.dev', name: 'Conrad BOT', role: 'timer'         },
  { email: 'learner3@stellalogos.dev', name: 'Petra BOT',  role: 'scribe'        },
  { email: 'learner4@stellalogos.dev', name: 'Rex BOT',    role: 'angle-checker' },
]

const DEV_GROUP_ROLE_MAP: Record<string, Role> = Object.fromEntries(
  DEV_GROUP.map(m => [m.email, m.role])
)

const MOCK_TEAM = DEV_GROUP.map(m => m.name)

const INITIAL_CHAT: ChatMessage[] = [
  { id: 1, author: 'Mr. van der Berg', body: 'Welcome to the cooperative discussion phase. Each role player — please ensure you are prepared. Leader, you may begin when the group is ready.', time: '09:00', isTeacher: true },
  { id: 2, author: 'Conrad BOT', body: 'Ready on my end.', time: '09:01' },
  { id: 3, author: 'Petra BOT',  body: 'Ready here too.', time: '09:01' },
  { id: 4, author: 'Rex BOT',    body: "Let's go — I found the content video really useful for structuring my answers.", time: '09:02' },
  { id: 5, author: 'Aria BOT',   body: 'Same. Question 5 was tricky though — I second-guessed myself.', time: '09:03' },
]

const ROLE_DEFS: { role: Role; label: string; desc: string; icon: string }[] = [
  { role: 'leader', label: 'LEADER', desc: "Control question flow. Prompt your team. Maintain the group's pulse.", icon: '♚' },
  { role: 'timer', label: 'TIMER', desc: 'Manage session time privately. Alert the group when needed.', icon: '◷' },
  { role: 'scribe', label: 'SCRIBE', desc: 'Capture insights from the chat. Draft the final team solution.', icon: '✎' },
  { role: 'angle-checker', label: 'ANGLE CHECKER', desc: 'Challenge assumptions. Ensure no angle is missed.', icon: '◈' },
]

const PHASE_LABELS = ['STRUCTURE', 'MASTER', 'DISCUSS', 'RECALIBRATE', 'SUBMIT']
const OPT_LABELS = ['A', 'B', 'C', 'D']

// ─── Utilities ────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makeDistribution(): Record<string, number> {
  let rem = MOCK_TEAM.length
  const dist: Record<string, number> = {}
  OPT_LABELS.forEach((opt, i) => {
    if (i === OPT_LABELS.length - 1) { dist[opt] = rem; return }
    const n = Math.floor(Math.random() * (rem + 1))
    dist[opt] = n; rem -= n
  })
  return dist
}

function nowTime() {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// ─── PhaseBar ─────────────────────────────────────────────────────────────────

const PhaseBar: React.FC<{ current: Phase }> = ({ current }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: '700px' }}>
    {PHASE_LABELS.map((label, i) => {
      const n = (i + 1) as Phase
      const done = n < current
      const active = n === current
      return (
        <React.Fragment key={n}>
          {i > 0 && <div style={{ flex: 1, height: '2px', background: done ? ACCENT : 'rgba(255,215,0,0.2)', minWidth: '8px' }} />}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: done ? ACCENT : 'transparent',
              border: `2px solid ${done || active ? ACCENT : 'rgba(255,215,0,0.25)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONT, fontSize: '0.9rem',
              color: done ? '#1a1000' : active ? ACCENT : 'rgba(255,215,0,0.3)',
              opacity: !done && !active ? 0.45 : 1,
            }}>
              {done ? '✓' : n}
            </div>
            <span style={{ fontFamily: FONT, fontSize: '0.6rem', letterSpacing: '1px', color: done || active ? ACCENT : 'rgba(255,215,0,0.25)', whiteSpace: 'nowrap' }}>
              {label}
            </span>
          </div>
        </React.Fragment>
      )
    })}
  </div>
)

// ─── Phase I: Metacognitive Scaffold ──────────────────────────────────────────

const Phase1: React.FC<{ onComplete: (a: MetacogState) => void }> = ({ onComplete }) => {
  const [answers, setAnswers] = useState<MetacogState>({ problem: '', criteria: '', solution: '', audit: '' })
  const [helpOpen, setHelpOpen] = useState<keyof MetacogState | null>(null)

  const allAnswered = Object.values(answers).every(v => v.trim().length > 10)
  const set = (field: keyof MetacogState) => (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setAnswers(p => ({ ...p, [field]: e.target.value }))
  const toggleHelp = (field: keyof MetacogState) =>
    setHelpOpen(prev => (prev === field ? null : field))

  const questions: { field: keyof MetacogState; label: string; prompt: string; help: string }[] = [
    {
      field: 'problem',
      label: '1. WHAT IS THE ACTUAL PROBLEM?',
      prompt: 'What is going wrong? Write it in your own words — keep it short and clear.',
      help: "Don't write your solution here — just say what the problem is. Ask yourself: What is happening that shouldn't be? Or what isn't happening that should be? Who is affected by it?",
    },
    {
      field: 'solution',
      label: '2. HOW WOULD YOU SOLVE IT?',
      prompt: 'What would you do to fix the problem? Write your best idea.',
      help: "Be specific about what you would actually do. Don't just say \"I would try harder\" — say exactly what action you would take. Think about what you have available and what you could realistically do right now.",
    },
    {
      field: 'criteria',
      label: '3. HOW WOULD YOU KNOW YOUR SOLUTION WORKED?',
      prompt: 'What would be different if your solution worked? How could you tell it was the right choice?',
      help: 'Think about proof. What could you see, count, or compare? Try finishing this sentence: \"I would know it worked if...\" Can you think of a way to compare your solution to a different option?',
    },
    {
      field: 'audit',
      label: '4. WHAT STEPS WOULD YOU TAKE?',
      prompt: 'Write out your steps in order. What would you do first? What comes next?',
      help: 'Each step should be one clear action — something you could tick off a list. Put them in the right order. Think: what needs to happen before the next step can start? Try to write at least 3 steps.',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', alignItems: 'center' }}>
      <div className="frame-parchment" style={{ padding: '1.5rem', gap: '1rem' }}>
        <p style={{ fontFamily: FONT, fontSize: '0.75rem', letterSpacing: '3px', opacity: 0.6, color: TEXT, margin: 0 }}>PHASE I · STRUCTURE THE PROBLEM</p>
        <h2 style={{ fontFamily: FONT, fontSize: '1.8rem', letterSpacing: '2px', color: ACCENT, margin: 0 }}>THE CHALLENGE</h2>

        <video
          controls
          style={{ width: '100%', display: 'block', background: '#000', maxHeight: '360px' }}
          src="/assets/learning-tasks/LearningTask1/RLC/challenge_video.mp4"
        />

        <div style={{ fontFamily: FONT, fontSize: '1.05rem', lineHeight: 1.7, color: TEXT, whiteSpace: 'pre-line', opacity: 0.9 }}>
          {CHALLENGE_SCENARIO}
        </div>
      </div>

      <div className="frame-parchment" style={{ padding: '1.5rem', gap: '1.25rem' }}>
        <p style={{ fontFamily: FONT, fontSize: '0.75rem', letterSpacing: '3px', opacity: 0.6, color: TEXT, margin: 0 }}>ANSWER ALL FOUR QUESTIONS TO UNLOCK THE NEXT SECTION</p>
        {questions.map(({ field, label, prompt, help }) => (
          <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {/* Label row with help toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontFamily: FONT, fontSize: '1.1rem', letterSpacing: '1px', color: ACCENT, flex: 1 }}>{label}</label>
              <button
                onClick={() => toggleHelp(field)}
                title="Show guidance"
                style={{
                  width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                  background: helpOpen === field ? 'rgba(255,215,0,0.25)' : 'transparent',
                  border: `1px solid ${helpOpen === field ? 'rgba(255,215,0,0.8)' : 'rgba(255,215,0,0.35)'}`,
                  color: helpOpen === field ? ACCENT : 'rgba(255,215,0,0.5)',
                  fontFamily: FONT, fontSize: '0.85rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1, transition: 'all 0.15s',
                }}
              >
                ?
              </button>
            </div>
            {/* Collapsible help panel */}
            <AnimatePresence>
              {helpOpen === field && (
                <motion.div
                  key="help"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{
                    fontFamily: FONT, fontSize: '0.95rem', lineHeight: 1.55,
                    color: 'rgba(255,215,0,0.85)', padding: '0.6rem 0.75rem',
                    background: 'rgba(255,215,0,0.06)',
                    border: '1px solid rgba(255,215,0,0.18)',
                    borderRadius: '2px',
                  }}>
                    {help}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <p style={{ fontFamily: FONT, fontSize: '0.95rem', opacity: 0.75, color: TEXT, margin: 0, lineHeight: 1.4 }}>{prompt}</p>
            <textarea
              value={answers[field]}
              onChange={set(field)}
              placeholder="Type your answer here..."
              rows={4}
              style={{
                width: '100%', resize: 'vertical', fontFamily: FONT, fontSize: '1rem',
                padding: '0.75rem', lineHeight: 1.5, boxSizing: 'border-box',
                background: 'rgba(0,0,0,0.3)',
                border: `1px solid ${answers[field].trim().length > 10 ? 'rgba(255,215,0,0.7)' : 'rgba(255,215,0,0.25)'}`,
                color: 'rgba(255,255,255,0.9)', outline: 'none',
              }}
            />
          </div>
        ))}
        <button
          className="btn-9slice"
          onClick={() => allAnswered && onComplete(answers)}
          disabled={!allAnswered}
          style={{ opacity: allAnswered ? 1 : 0.4, cursor: allAnswered ? 'pointer' : 'not-allowed', fontSize: '1.3rem', letterSpacing: '2px', alignSelf: 'center', minWidth: '260px' }}
        >
          UNLOCK CONTENT MASTERY →
        </button>
        {!allAnswered && (
          <p style={{ fontFamily: FONT, fontSize: '0.85rem', opacity: 0.5, color: TEXT, textAlign: 'center', margin: 0 }}>
            Answer all four questions (at least 10 characters each) to move on.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Phase II: Content Mastery & Blind Quiz ───────────────────────────────────

const Phase2: React.FC<{ onComplete: (answers: Record<number, number>, shuffled: Record<number, number[]>) => void }> = ({ onComplete }) => {
  const [tab, setTab] = useState<'resources' | 'quiz'>('resources')
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [shuffledIndices] = useState<Record<number, number[]>>(() => {
    const r: Record<number, number[]> = {}
    QUIZ_QUESTIONS.forEach(q => { r[q.id] = shuffle(q.options.map((_, i) => i)) })
    return r
  })
  const [submitted, setSubmitted] = useState(false)
  const [currentQ, setCurrentQ] = useState(0)

  const answered = Object.keys(answers).length
  const allAnswered = answered === QUIZ_QUESTIONS.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
        {(['resources', 'quiz'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            fontFamily: FONT, fontSize: '1.1rem', letterSpacing: '2px', padding: '6px 20px',
            background: tab === t ? 'rgba(255,215,0,0.15)' : 'transparent',
            border: `1px solid ${tab === t ? 'rgba(255,215,0,0.8)' : 'rgba(255,215,0,0.3)'}`,
            color: tab === t ? ACCENT : 'rgba(255,215,0,0.5)', cursor: 'pointer',
          }}>
            {t === 'resources' ? 'RESOURCE HUB' : `BLIND QUIZ (${answered}/${QUIZ_QUESTIONS.length})`}
          </button>
        ))}
      </div>

      {tab === 'resources' && (
        <div className="frame-parchment" style={{ padding: '1.5rem', gap: '1rem' }}>
          <p style={{ fontFamily: FONT, fontSize: '0.75rem', letterSpacing: '3px', opacity: 0.6, color: TEXT, margin: 0 }}>PHASE II · RESOURCE HUB · Study these before attempting the quiz</p>
          {RESOURCES.map((r, i) => (
            <div key={i} onClick={() => window.open(r.href, '_blank')} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', border: '1px solid rgba(255,215,0,0.2)', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,215,0,0.6)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,215,0,0.2)')}
            >
              <div style={{
                fontFamily: FONT, fontSize: '0.8rem', letterSpacing: '1px', padding: '2px 8px', minWidth: '48px', textAlign: 'center',
                background: r.type === 'PDF' ? 'rgba(220,60,60,0.25)' : 'rgba(60,120,220,0.25)',
                border: `1px solid ${r.type === 'PDF' ? 'rgba(220,60,60,0.5)' : 'rgba(60,120,220,0.5)'}`,
                color: r.type === 'PDF' ? '#ff8888' : '#88aaff',
              }}>{r.type}</div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: '1.05rem', color: ACCENT }}>{r.title}</div>
                <div style={{ fontFamily: FONT, fontSize: '0.85rem', opacity: 0.6, color: TEXT }}>{r.desc}</div>
              </div>
            </div>
          ))}
          <button className="btn-9slice" onClick={() => setTab('quiz')} style={{ alignSelf: 'center', fontSize: '1.2rem', letterSpacing: '2px', minWidth: '200px' }}>
            PROCEED TO QUIZ →
          </button>
        </div>
      )}

      {tab === 'quiz' && !submitted && (() => {
        const q = QUIZ_QUESTIONS[currentQ]
        const idxOrder = shuffledIndices[q.id]
        const isLast = currentQ === QUIZ_QUESTIONS.length - 1
        const isFirst = currentQ === 0
        const qAnswered = answers[q.id] !== undefined

        const selectAnswer = (origIdx: number) => {
          setAnswers(p => {
            const next = { ...p, [q.id]: origIdx }
            if (!isLast) setTimeout(() => setCurrentQ(c => c + 1), 350)
            return next
          })
        }

        return (
          <div className="frame-parchment" style={{ padding: '1.5rem', gap: '1.25rem' }}>
            {/* header */}
            <p style={{ fontFamily: FONT, fontSize: '0.75rem', letterSpacing: '3px', opacity: 0.6, color: TEXT, margin: 0 }}>
              PHASE II · BLIND QUIZ · {answered} / {QUIZ_QUESTIONS.length} answered · No marks shown on submission
            </p>

            {/* dot-strip */}
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {QUIZ_QUESTIONS.map((dq, i) => {
                const isDone = answers[dq.id] !== undefined
                const isCur = i === currentQ
                return (
                  <button key={dq.id} onClick={() => setCurrentQ(i)} style={{
                    width: '14px', height: '14px', borderRadius: '50%', padding: 0, cursor: 'pointer',
                    background: isDone ? ACCENT : 'rgba(255,215,0,0.08)',
                    border: isCur ? `2px solid ${ACCENT}` : '2px solid rgba(255,215,0,0.25)',
                    boxShadow: isCur ? `0 0 6px ${ACCENT}` : 'none',
                    transition: 'all 0.2s',
                  }} />
                )
              })}
            </div>

            {/* question */}
            <AnimatePresence mode="wait">
              <motion.div
                key={q.id}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.22 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}
              >
                <p style={{ fontFamily: FONT, fontSize: '1rem', color: TEXT, margin: 0, lineHeight: 1.5 }}>
                  <span style={{ color: ACCENT }}>Q{q.id}. </span>{q.text}
                </p>
                {idxOrder.map((origIdx, displayIdx) => {
                  const isSelected = answers[q.id] === origIdx
                  return (
                    <button key={origIdx} onClick={() => selectAnswer(origIdx)} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.55rem 0.75rem', textAlign: 'left',
                      fontFamily: FONT, fontSize: '0.95rem', lineHeight: 1.4,
                      background: isSelected ? 'rgba(255,215,0,0.15)' : 'transparent',
                      border: `1px solid ${isSelected ? 'rgba(255,215,0,0.7)' : 'rgba(255,215,0,0.18)'}`,
                      color: isSelected ? ACCENT : 'rgba(255,255,255,0.75)', cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}>
                      <span style={{ minWidth: '20px', color: ACCENT, fontWeight: 700 }}>{OPT_LABELS[displayIdx]}.</span>
                      {q.options[origIdx]}
                    </button>
                  )
                })}
              </motion.div>
            </AnimatePresence>

            {/* nav row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.25rem' }}>
              <button
                onClick={() => setCurrentQ(c => c - 1)}
                disabled={isFirst}
                style={{
                  fontFamily: FONT, fontSize: '1rem', letterSpacing: '2px', padding: '6px 18px',
                  background: 'transparent', border: '1px solid rgba(255,215,0,0.3)',
                  color: isFirst ? 'rgba(255,215,0,0.25)' : ACCENT,
                  cursor: isFirst ? 'not-allowed' : 'pointer',
                }}
              >← BACK</button>

              <span style={{ fontFamily: FONT, fontSize: '0.85rem', opacity: 0.5, color: TEXT }}>
                {currentQ + 1} / {QUIZ_QUESTIONS.length}
              </span>

              {isLast ? (
                <button
                  className="btn-9slice"
                  onClick={() => { setSubmitted(true); setTimeout(() => onComplete(answers, shuffledIndices), 800) }}
                  disabled={!allAnswered}
                  style={{ fontSize: '1rem', letterSpacing: '2px', minWidth: '160px', opacity: allAnswered ? 1 : 0.4, cursor: allAnswered ? 'pointer' : 'not-allowed' }}
                >
                  SUBMIT →
                </button>
              ) : (
                <button
                  onClick={() => setCurrentQ(c => c + 1)}
                  style={{
                    fontFamily: FONT, fontSize: '1rem', letterSpacing: '2px', padding: '6px 18px',
                    background: qAnswered ? 'rgba(255,215,0,0.1)' : 'transparent',
                    border: `1px solid ${qAnswered ? 'rgba(255,215,0,0.6)' : 'rgba(255,215,0,0.3)'}`,
                    color: ACCENT, cursor: 'pointer',
                  }}
                >NEXT →</button>
              )}
            </div>

            {isLast && !allAnswered && (
              <p style={{ fontFamily: FONT, fontSize: '0.8rem', opacity: 0.5, color: TEXT, textAlign: 'center', margin: 0 }}>
                Use the dots above to return to unanswered questions.
              </p>
            )}
          </div>
        )
      })()}

      {submitted && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="frame-parchment" style={{ padding: '2rem', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '2.5rem' }}>⚔</div>
          <h2 style={{ fontFamily: FONT, fontSize: '1.8rem', color: ACCENT, margin: 0, letterSpacing: '3px' }}>QUIZ SUBMITTED</h2>
          <p style={{ fontFamily: FONT, fontSize: '1rem', color: TEXT, opacity: 0.8, margin: 0 }}>
            Your answers are locked. No marks revealed until the cooperative discussion ends.
            <br />Entering Phase III...
          </p>
        </motion.div>
      )}
    </div>
  )
}

// ─── Role Selection ───────────────────────────────────────────────────────────

const RoleSelection: React.FC<{ onSelect: (r: Role) => void }> = ({ onSelect }) => (
  <div className="frame-parchment" style={{ padding: '1.5rem', gap: '1rem' }}>
    <p style={{ fontFamily: FONT, fontSize: '0.75rem', letterSpacing: '3px', opacity: 0.6, color: TEXT, margin: 0 }}>PHASE III · SELECT YOUR ROLE FOR THIS SESSION</p>
    <h2 style={{ fontFamily: FONT, fontSize: '1.6rem', color: ACCENT, margin: 0, letterSpacing: '2px' }}>THE COOPERATIVE DISCUSSION</h2>
    <p style={{ fontFamily: FONT, fontSize: '1rem', opacity: 0.75, color: TEXT, margin: 0, lineHeight: 1.5 }}>
      A group only functions when individuals have distinct, accountable responsibilities.
    </p>
    {ROLE_DEFS.map(({ role, label, desc, icon }) => (
      <button key={role} onClick={() => onSelect(role)} style={{
        display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.9rem 1rem',
        textAlign: 'left', width: '100%', fontFamily: FONT, background: 'transparent',
        border: '1px solid rgba(255,215,0,0.25)', cursor: 'pointer',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,215,0,0.7)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,215,0,0.25)' }}
      >
        <span style={{ fontSize: '2rem', color: ACCENT, minWidth: '2.5rem', textAlign: 'center' }}>{icon}</span>
        <div>
          <div style={{ fontSize: '1.2rem', color: ACCENT, letterSpacing: '2px' }}>{label}</div>
          <div style={{ fontSize: '0.9rem', color: TEXT, opacity: 0.75, marginTop: '2px' }}>{desc}</div>
        </div>
      </button>
    ))}
  </div>
)

// ─── Chat Panel ───────────────────────────────────────────────────────────────

const ChatPanel: React.FC<{
  messages: ChatMessage[]
  onSend?: (t: string) => void
  onCapture?: (m: ChatMessage) => void
  showCapture?: boolean
}> = ({ messages, onSend, onCapture, showCapture }) => {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  const send = () => { if (input.trim() && onSend) { onSend(input.trim()); setInput('') } }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.5rem' }}>
      <p style={{ fontFamily: FONT, fontSize: '0.75rem', letterSpacing: '3px', opacity: 0.5, color: TEXT, margin: 0 }}>GROUP CHAT</p>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', minHeight: '180px', maxHeight: '300px' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontFamily: FONT, fontSize: '0.85rem', fontWeight: 700, color: msg.isTeacher ? '#88aaff' : ACCENT }}>{msg.author}</span>
              <span style={{ fontFamily: FONT, fontSize: '0.8rem', opacity: 0.4, color: TEXT, marginLeft: '6px' }}>{msg.time}</span>
              <div style={{ fontFamily: FONT, fontSize: '0.95rem', color: TEXT, lineHeight: 1.4 }}>{msg.body}</div>
            </div>
            {showCapture && onCapture && (
              <button onClick={() => onCapture(msg)} title="Capture to Notebook" style={{ background: 'transparent', border: '1px solid rgba(255,215,0,0.3)', color: ACCENT, cursor: 'pointer', fontFamily: FONT, fontSize: '0.8rem', padding: '2px 6px', flexShrink: 0 }}>✎</button>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {onSend && (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Type a message..."
            style={{ flex: 1, fontFamily: FONT, fontSize: '1rem', padding: '0.4rem 0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,215,0,0.25)', color: 'rgba(255,255,255,0.9)', outline: 'none' }} />
          <button className="btn-9slice" onClick={send} style={{ fontSize: '1rem', padding: '4px 14px' }}>SEND</button>
        </div>
      )}
    </div>
  )
}

// ─── Distribution Chart ───────────────────────────────────────────────────────

const DistChart: React.FC<{ distribution: Record<string, number>; total: number; myAnswer?: string }> = ({ distribution, total, myAnswer }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
    {OPT_LABELS.map(opt => {
      const count = distribution[opt] ?? 0
      const pct = total > 0 ? (count / total) * 100 : 0
      const isMe = myAnswer === opt
      return (
        <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontFamily: FONT, fontSize: '0.9rem', minWidth: '18px', color: isMe ? ACCENT : 'rgba(255,255,255,0.5)' }}>{opt}</span>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', height: '14px', position: 'relative' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: isMe ? ACCENT : 'rgba(255,215,0,0.4)', transition: 'width 0.5s ease' }} />
          </div>
          <span style={{ fontFamily: FONT, fontSize: '0.8rem', color: TEXT, minWidth: '32px', textAlign: 'right' }}>{count}/{total}</span>
        </div>
      )
    })}
  </div>
)

// ─── Pulse Button ─────────────────────────────────────────────────────────────

const PulseButton: React.FC<{ intervalSeconds: number; label: string; onPulse: () => void; warning: string }> = ({ intervalSeconds, label, onPulse, warning }) => {
  const [seconds, setSeconds] = useState(intervalSeconds)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setSeconds(s => { if (s <= 1) { setExpired(true); return 0 } return s - 1 }), 1000)
    return () => clearInterval(id)
  }, [])

  const handleClick = () => { setSeconds(intervalSeconds); setExpired(false); onPulse() }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
      <button className="btn-9slice" onClick={handleClick} style={{ fontSize: '1rem', letterSpacing: '2px', minWidth: '200px', borderColor: expired ? 'rgba(220,60,60,0.8)' : undefined, color: expired ? '#ff8888' : undefined }}>
        {label} [{seconds}s]
      </button>
      {expired && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontFamily: FONT, fontSize: '0.85rem', color: '#ff6666', margin: 0, textAlign: 'center' }}>⚠ {warning}</motion.p>}
    </div>
  )
}

// ─── Leader Panel ─────────────────────────────────────────────────────────────

const LeaderPanel: React.FC<{ chat: ChatMessage[]; onSend: (t: string) => void; currentQuestion: number; onNextQuestion: () => void }> = ({ chat, onSend, currentQuestion, onNextQuestion }) => {
  const [distribution, setDistribution] = useState<Record<string, number>>(makeDistribution())

  const advance = () => { setDistribution(makeDistribution()); onNextQuestion() }
  const q = currentQuestion > 0 ? QUIZ_QUESTIONS[currentQuestion - 1] : null

  return (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', width: '100%' }}>
      <div className="frame-parchment" style={{ flex: '1 1 300px', padding: '1rem', gap: '1rem', minWidth: '280px' }}>
        <p style={{ fontFamily: FONT, fontSize: '0.75rem', letterSpacing: '3px', opacity: 0.6, color: TEXT, margin: 0 }}>♚ LEADER · LOGIC ENGINE</p>
        <div style={{ fontFamily: FONT, fontSize: '1.1rem', color: TEXT }}>
          Question: <span style={{ color: ACCENT }}>{currentQuestion === 0 ? 'Not started' : `${currentQuestion} / 20`}</span>
        </div>
        {q && (
          <>
            <p style={{ fontFamily: FONT, fontSize: '0.95rem', color: TEXT, lineHeight: 1.4, margin: 0 }}>{q.text}</p>
            <DistChart distribution={distribution} total={MOCK_TEAM.length} />
          </>
        )}
        <button className="btn-9slice" onClick={advance} disabled={currentQuestion >= 20} style={{ fontSize: '1.05rem', letterSpacing: '2px', opacity: currentQuestion >= 20 ? 0.4 : 1 }}>
          {currentQuestion === 0 ? 'START DISCUSSION ▶' : currentQuestion >= 20 ? 'ALL QUESTIONS DONE' : 'NEXT QUESTION ▶'}
        </button>
        <PulseButton intervalSeconds={20} label="PARTICIPATION PULSE" onPulse={() => onSend('[System] Leader pulse confirmed — Active.')} warning="Click PULSE to maintain Active status!" />
        <div>
          <p style={{ fontFamily: FONT, fontSize: '0.75rem', letterSpacing: '2px', opacity: 0.6, color: TEXT, margin: '0 0 0.4rem' }}>PROMPT A MEMBER</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {MOCK_TEAM.map(name => (
              <button key={name} onClick={() => onSend(`${name}, what do you think about this discrepancy?`)} style={{
                fontFamily: FONT, fontSize: '0.85rem', padding: '3px 10px', background: 'rgba(255,215,0,0.06)',
                border: '1px solid rgba(255,215,0,0.3)', color: ACCENT, cursor: 'pointer',
              }}>{name.split(' ')[0]}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="frame-parchment" style={{ flex: '1 1 280px', padding: '1rem', minWidth: '260px' }}>
        <ChatPanel messages={chat} onSend={onSend} />
      </div>
    </div>
  )
}

// ─── Timer Panel ──────────────────────────────────────────────────────────────

const TimerPanel: React.FC<{ chat: ChatMessage[]; onSend: (t: string) => void }> = ({ chat, onSend }) => {
  const [totalMins, setTotalMins] = useState('')
  const [timePerQ, setTimePerQ] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [running, setRunning] = useState(false)
  const [moveOnFired, setMoveOnFired] = useState(false)

  const divide = () => {
    const m = parseFloat(totalMins)
    if (isNaN(m) || m <= 0) return
    const perQ = Math.floor((m * 60) / 21)
    setTimePerQ(perQ); setSecondsLeft(perQ)
  }

  useEffect(() => {
    if (!running || secondsLeft <= 0) return
    const id = setInterval(() => setSecondsLeft(s => { if (s <= 1) { setRunning(false); return 0 } return s - 1 }), 1000)
    return () => clearInterval(id)
  }, [running, secondsLeft])

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', width: '100%' }}>
      <div className="frame-parchment" style={{ flex: '1 1 280px', padding: '1rem', gap: '1rem', minWidth: '260px' }}>
        <p style={{ fontFamily: FONT, fontSize: '0.75rem', letterSpacing: '3px', opacity: 0.6, color: TEXT, margin: 0 }}>◷ TIMER · PRIVATE HEARTBEAT</p>
        {timePerQ !== null && (
          <div style={{ fontFamily: FONT, fontSize: '4rem', color: secondsLeft < 30 ? '#ff6666' : ACCENT, textAlign: 'center', letterSpacing: '4px', lineHeight: 1 }}>
            {fmt(secondsLeft)}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input value={totalMins} onChange={e => setTotalMins(e.target.value)} placeholder="Total mins (e.g. 40)"
            style={{ flex: 1, fontFamily: FONT, fontSize: '1rem', padding: '0.4rem 0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,215,0,0.25)', color: 'rgba(255,255,255,0.9)', outline: 'none' }} />
          <button className="btn-9slice" onClick={divide} style={{ fontSize: '0.9rem', letterSpacing: '1px' }}>DIVIDE</button>
        </div>
        {timePerQ !== null && (
          <>
            <p style={{ fontFamily: FONT, fontSize: '0.85rem', color: TEXT, opacity: 0.7, margin: 0 }}>~{fmt(timePerQ)} per question (20 Qs + final phase)</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-9slice" onClick={() => setRunning(true)} style={{ flex: 1, fontSize: '0.95rem' }}>{running ? 'RUNNING...' : 'START'}</button>
              <button className="btn-9slice" onClick={() => { setSecondsLeft(timePerQ!); setRunning(false) }} style={{ flex: 1, fontSize: '0.95rem' }}>RESET Q</button>
            </div>
          </>
        )}
        <PulseButton intervalSeconds={30} label="TIME STATUS" onPulse={() => onSend(`[Timer] Time Status — ${timePerQ !== null ? fmt(secondsLeft) + ' remaining.' : 'Timer not started.'}`)} warning="Send Time Status to the group!" />
        <button onClick={() => { setMoveOnFired(true); onSend('⚠ [TIMER ALERT] The group is stalling — time to MOVE ON!') }} style={{
          fontFamily: FONT, fontSize: '1.15rem', letterSpacing: '2px', padding: '0.6rem', width: '100%',
          background: moveOnFired ? 'rgba(220,60,60,0.35)' : 'rgba(220,60,60,0.12)',
          border: '2px solid rgba(220,60,60,0.8)', color: '#ff8888', cursor: 'pointer',
        }}>
          ⚠ MOVE ON ALERT
        </button>
      </div>
      <div className="frame-parchment" style={{ flex: '1 1 280px', padding: '1rem', minWidth: '260px' }}>
        <ChatPanel messages={chat} onSend={onSend} />
      </div>
    </div>
  )
}

// ─── Scribe Panel ─────────────────────────────────────────────────────────────

const ScribePanel: React.FC<{ chat: ChatMessage[]; onSend: (t: string) => void; onTriggerFinalPhase: (draft: string) => void }> = ({ chat, onSend, onTriggerFinalPhase }) => {
  const [notebook, setNotebook] = useState<string[]>([])
  const [draft, setDraft] = useState('')

  const capture = (msg: ChatMessage) => setNotebook(p => p.includes(msg.body) ? p : [...p, msg.body])
  const moveUp = (i: number) => setNotebook(p => { if (i === 0) return p; const n = [...p]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n })
  const moveDown = (i: number) => setNotebook(p => { if (i >= p.length - 1) return p; const n = [...p]; [n[i], n[i + 1]] = [n[i + 1], n[i]]; return n })
  const remove = (i: number) => setNotebook(p => p.filter((_, idx) => idx !== i))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div className="frame-parchment" style={{ flex: '1 1 280px', padding: '1rem', minWidth: '260px' }}>
          <p style={{ fontFamily: FONT, fontSize: '0.75rem', letterSpacing: '3px', opacity: 0.6, color: TEXT, margin: '0 0 0.5rem' }}>✎ SCRIBE · CAPTURE FROM CHAT</p>
          <ChatPanel messages={chat} onSend={onSend} showCapture onCapture={capture} />
        </div>
        <div className="frame-parchment" style={{ flex: '1 1 280px', padding: '1rem', gap: '0.6rem', minWidth: '260px' }}>
          <p style={{ fontFamily: FONT, fontSize: '0.75rem', letterSpacing: '3px', opacity: 0.6, color: TEXT, margin: 0 }}>NOTEBOOK · {notebook.length} captured</p>
          {notebook.length === 0 && <p style={{ fontFamily: FONT, fontSize: '0.9rem', opacity: 0.4, color: TEXT, margin: 0 }}>Click ✎ next to a message to capture it here.</p>}
          {notebook.map((note, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, fontFamily: FONT, fontSize: '0.9rem', color: TEXT, lineHeight: 1.4, padding: '0.4rem', background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.15)' }}>{note}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {[['▲', () => moveUp(i)], ['▼', () => moveDown(i)]].map(([lbl, fn]) => (
                  <button key={lbl as string} onClick={fn as () => void} style={{ fontFamily: FONT, fontSize: '0.75rem', padding: '1px 6px', background: 'transparent', border: '1px solid rgba(255,215,0,0.3)', color: ACCENT, cursor: 'pointer' }}>{lbl as string}</button>
                ))}
                <button onClick={() => remove(i)} style={{ fontFamily: FONT, fontSize: '0.75rem', padding: '1px 6px', background: 'transparent', border: '1px solid rgba(220,60,60,0.4)', color: '#ff8888', cursor: 'pointer' }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="frame-parchment" style={{ padding: '1rem', gap: '0.75rem' }}>
        <p style={{ fontFamily: FONT, fontSize: '0.75rem', letterSpacing: '3px', opacity: 0.6, color: TEXT, margin: 0 }}>DRAFT · FINAL TEAM SOLUTION</p>
        <textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="Draft the team's final solution here, synthesising the captured notebook points..." rows={6}
          style={{ width: '100%', resize: 'vertical', fontFamily: FONT, fontSize: '1rem', padding: '0.75rem', lineHeight: 1.5, boxSizing: 'border-box', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,215,0,0.25)', color: 'rgba(255,255,255,0.9)', outline: 'none' }} />
        <button className="btn-9slice" onClick={() => onTriggerFinalPhase(draft)} disabled={draft.trim().length < 20}
          style={{ alignSelf: 'center', fontSize: '1.2rem', letterSpacing: '2px', minWidth: '260px', opacity: draft.trim().length < 20 ? 0.4 : 1, cursor: draft.trim().length < 20 ? 'not-allowed' : 'pointer' }}>
          ▶ TRIGGER FINAL SOLUTION PHASE
        </button>
      </div>
    </div>
  )
}

// ─── Angle Checker Panel ──────────────────────────────────────────────────────

const AngleCheckerPanel: React.FC<{ chat: ChatMessage[]; onSend: (t: string) => void }> = ({ chat, onSend }) => {
  const [used, setUsed] = useState<Set<string>>(new Set())

  const BUTTONS = [
    { key: 'sure', label: '"Are we sure about this?"', msg: "[Angle Checker] ◈ Are we sure about this? Let's verify before moving on." },
    { key: 'another', label: '"Is there another way of thinking about this?"', msg: '[Angle Checker] ◈ Is there another way of thinking about this? We may be missing an alternative.' },
    { key: 'missing', label: '"Are we missing something?"', msg: '[Angle Checker] ◈ Are we missing something? Checking for blind spots.' },
  ]

  const use = (key: string, msg: string) => { setUsed(p => new Set([...p, key])); onSend(msg) }

  return (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', width: '100%' }}>
      <div className="frame-parchment" style={{ flex: '1 1 280px', padding: '1rem', gap: '1rem', minWidth: '260px' }}>
        <p style={{ fontFamily: FONT, fontSize: '0.75rem', letterSpacing: '3px', opacity: 0.6, color: TEXT, margin: 0 }}>◈ ANGLE CHECKER · ANTI-GROUPTHINK TRIAD</p>
        <p style={{ fontFamily: FONT, fontSize: '0.9rem', opacity: 0.75, color: TEXT, margin: 0 }}>
          You MUST use all three buttons at least once. ({used.size}/3 used)
        </p>
        {BUTTONS.map(({ key, label, msg }) => (
          <button key={key} onClick={() => use(key, msg)} style={{
            fontFamily: FONT, fontSize: '1rem', letterSpacing: '1px', padding: '0.7rem', textAlign: 'left', width: '100%',
            background: used.has(key) ? 'rgba(255,215,0,0.1)' : 'transparent',
            border: `2px solid ${used.has(key) ? 'rgba(255,215,0,0.7)' : 'rgba(255,215,0,0.3)'}`,
            color: used.has(key) ? ACCENT : 'rgba(255,215,0,0.6)', cursor: 'pointer',
          }}>
            {used.has(key) ? '✓ ' : ''}{label}
          </button>
        ))}
        <PulseButton intervalSeconds={30} label="PERSPECTIVE PULSE" onPulse={() => onSend('[Angle Checker] ◈ Perspective Pulse — actively monitoring for logic gaps.')} warning="Send your Perspective Pulse!" />
      </div>
      <div className="frame-parchment" style={{ flex: '1 1 280px', padding: '1rem', minWidth: '260px' }}>
        <ChatPanel messages={chat} onSend={onSend} />
      </div>
    </div>
  )
}


// ─── Phase III: Quiz Review (shared across all roles) ────────────────────────

const QuizReview: React.FC<{
  phase2Answers: Record<number, number>
  p3Intents: Record<number, 'keep' | 'change'>
  p3ChangedAnswers: Record<number, number>
  currentQuestion: number
  onIntent: (qId: number, intent: 'keep' | 'change') => void
  onChangeAnswer: (qId: number, origIdx: number) => void
}> = ({ phase2Answers, p3Intents, p3ChangedAnswers, currentQuestion, onIntent, onChangeAnswer }) => {
  const [open, setOpen] = useState(true)

  const idx = Math.max(0, Math.min(currentQuestion - 1, QUIZ_QUESTIONS.length - 1))
  const decided = QUIZ_QUESTIONS.filter(q => p3Intents[q.id] !== undefined).length
  const noAnswers = Object.keys(phase2Answers).length === 0
  const q = QUIZ_QUESTIONS[idx]
  const originalIdx  = phase2Answers[q.id]
  const intent       = p3Intents[q.id]
  const changedIdx   = p3ChangedAnswers[q.id]
  const isChanging   = intent === 'change'
  const allDecided   = decided === QUIZ_QUESTIONS.length
  const notStarted   = currentQuestion === 0

  return (
    <div style={{ width: '100%' }}>
      {/* ── Collapsible header ── */}
      <button onClick={() => setOpen(p => !p)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontFamily: FONT, fontSize: '0.85rem', letterSpacing: '2px', padding: '0.6rem 1rem',
        background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.25)',
        color: allDecided ? 'rgba(100,220,100,0.85)' : ACCENT, cursor: 'pointer',
      }}>
        <span>QUIZ REVIEW · {decided} / {QUIZ_QUESTIONS.length} DECISIONS MADE</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div key="qr" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
            <div className="frame-parchment" style={{ padding: '1rem', gap: '0.9rem', borderTop: 'none', maxWidth: 'none' }}>

              {noAnswers ? (
                <p style={{ fontFamily: FONT, fontSize: '0.95rem', opacity: 0.5, color: TEXT, margin: 0 }}>
                  No quiz answers found. Go through Phase II normally to review your answers here.
                </p>
              ) : notStarted ? (
                <p style={{ fontFamily: FONT, fontSize: '0.95rem', opacity: 0.5, color: TEXT, margin: 0, textAlign: 'center' }}>
                  Waiting for the Leader to start the discussion...
                </p>
              ) : (
                <>
                  {/* Dot strip — display only */}
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {QUIZ_QUESTIONS.map((dq, i) => {
                      const di = p3Intents[dq.id]
                      const borderCol = di === 'keep' ? 'rgba(100,220,100,0.75)' : di === 'change' ? 'rgba(255,180,0,0.85)' : 'rgba(255,215,0,0.2)'
                      return (
                        <div key={dq.id} style={{
                          width: '22px', height: '22px', borderRadius: '50%',
                          background: i === idx ? 'rgba(255,215,0,0.15)' : 'transparent',
                          border: `2px solid ${borderCol}`,
                          fontFamily: FONT, fontSize: '0.65rem', color: borderCol,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {i + 1}
                        </div>
                      )
                    })}
                  </div>

                  {/* Two-column body: question+options | decision panel */}
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'stretch' }}>

                    {/* Left — question text + options */}
                    <div style={{ flex: '3 1 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <p style={{ fontFamily: FONT, fontSize: '0.75rem', letterSpacing: '2px', color: ACCENT, opacity: 0.6, margin: 0 }}>
                        QUESTION {currentQuestion} OF {QUIZ_QUESTIONS.length}
                      </p>
                      <p style={{ fontFamily: FONT, fontSize: '1rem', color: TEXT, lineHeight: 1.5, margin: 0 }}>{q.text}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.25rem' }}>
                        {q.options.map((opt, optIdx) => {
                          const isOriginal = optIdx === originalIdx
                          const isNewPick  = isChanging && optIdx === changedIdx
                          const highlight  = isChanging ? isNewPick : isOriginal
                          return (
                            <div key={optIdx}
                              onClick={isChanging ? () => onChangeAnswer(q.id, optIdx) : undefined}
                              style={{
                                display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                                padding: '0.4rem 0.65rem', cursor: isChanging ? 'pointer' : 'default',
                                border: `1px solid ${highlight ? ACCENT : isOriginal && isChanging ? 'rgba(255,215,0,0.3)' : 'rgba(255,215,0,0.12)'}`,
                                background: highlight ? 'rgba(255,215,0,0.1)' : 'transparent',
                                transition: 'border-color 0.12s, background 0.12s',
                              }}
                              onMouseEnter={e => { if (isChanging) e.currentTarget.style.borderColor = 'rgba(255,215,0,0.6)' }}
                              onMouseLeave={e => { if (isChanging) e.currentTarget.style.borderColor = highlight ? ACCENT : isOriginal ? 'rgba(255,215,0,0.3)' : 'rgba(255,215,0,0.12)' }}
                            >
                              <span style={{ fontFamily: FONT, fontSize: '0.85rem', color: highlight ? ACCENT : 'rgba(255,215,0,0.45)', flexShrink: 0, minWidth: '16px' }}>
                                {OPT_LABELS[optIdx]}
                              </span>
                              <span style={{ fontFamily: FONT, fontSize: '0.9rem', color: highlight ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)', flex: 1, lineHeight: 1.4 }}>
                                {opt}
                              </span>
                              {isOriginal && !isChanging && (
                                <span style={{ fontFamily: FONT, fontSize: '0.6rem', letterSpacing: '1px', color: ACCENT, flexShrink: 0, alignSelf: 'center' }}>YOUR ANSWER</span>
                              )}
                              {isOriginal && isChanging && (
                                <span style={{ fontFamily: FONT, fontSize: '0.6rem', letterSpacing: '1px', color: 'rgba(255,215,0,0.35)', flexShrink: 0, alignSelf: 'center' }}>ORIGINAL</span>
                              )}
                              {isNewPick && (
                                <span style={{ fontFamily: FONT, fontSize: '0.6rem', letterSpacing: '1px', color: ACCENT, flexShrink: 0, alignSelf: 'center' }}>NEW ANSWER</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Right — decision panel, fills same column as chat below */}
                    <div style={{ flex: '2 1 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {!intent && (
                        <>
                          <button onClick={() => onIntent(q.id, 'keep')} style={{
                            flex: 1, fontFamily: FONT, fontSize: '1.1rem', letterSpacing: '1px',
                            cursor: 'pointer', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                            background: 'rgba(100,220,100,0.06)',
                            border: '2px solid rgba(100,220,100,0.45)',
                            color: 'rgba(100,220,100,0.85)',
                            transition: 'background 0.15s, border-color 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(100,220,100,0.14)'; e.currentTarget.style.borderColor = 'rgba(100,220,100,0.8)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(100,220,100,0.06)'; e.currentTarget.style.borderColor = 'rgba(100,220,100,0.45)' }}
                          >
                            <span style={{ fontSize: '2rem', lineHeight: 1 }}>✓</span>
                            <span>KEEP MY</span>
                            <span>ANSWER</span>
                          </button>
                          <button onClick={() => onIntent(q.id, 'change')} style={{
                            flex: 1, fontFamily: FONT, fontSize: '1.1rem', letterSpacing: '1px',
                            cursor: 'pointer', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                            background: 'rgba(255,180,0,0.06)',
                            border: '2px solid rgba(255,180,0,0.45)',
                            color: 'rgba(255,180,0,0.85)',
                            transition: 'background 0.15s, border-color 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,180,0,0.14)'; e.currentTarget.style.borderColor = 'rgba(255,180,0,0.8)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,180,0,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,180,0,0.45)' }}
                          >
                            <span style={{ fontSize: '2rem', lineHeight: 1 }}>↻</span>
                            <span>CHANGE MY</span>
                            <span>ANSWER</span>
                          </button>
                        </>
                      )}
                      {intent === 'keep' && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                          border: '2px solid rgba(100,220,100,0.6)', background: 'rgba(100,220,100,0.08)', padding: '1rem' }}>
                          <span style={{ fontFamily: FONT, fontSize: '2rem', color: 'rgba(100,220,100,0.9)', lineHeight: 1 }}>✓</span>
                          <span style={{ fontFamily: FONT, fontSize: '0.9rem', letterSpacing: '1px', color: 'rgba(100,220,100,0.85)', textAlign: 'center' }}>ANSWER KEPT</span>
                          <button onClick={() => onIntent(q.id, 'change')} style={{
                            fontFamily: FONT, fontSize: '0.75rem', padding: '3px 10px', cursor: 'pointer', marginTop: '0.25rem',
                            background: 'transparent', border: '1px solid rgba(255,215,0,0.3)', color: 'rgba(255,215,0,0.5)',
                          }}>CHANGE INSTEAD</button>
                        </div>
                      )}
                      {intent === 'change' && changedIdx === undefined && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                          border: '2px solid rgba(255,180,0,0.5)', background: 'rgba(255,180,0,0.06)', padding: '1rem' }}>
                          <span style={{ fontFamily: FONT, fontSize: '2rem', color: 'rgba(255,180,0,0.8)', lineHeight: 1 }}>↻</span>
                          <span style={{ fontFamily: FONT, fontSize: '0.85rem', letterSpacing: '1px', color: 'rgba(255,180,0,0.8)', textAlign: 'center', lineHeight: 1.4 }}>SELECT A NEW ANSWER FROM THE LIST</span>
                          <button onClick={() => { onIntent(q.id, 'keep'); onChangeAnswer(q.id, -1) }} style={{
                            fontFamily: FONT, fontSize: '0.75rem', padding: '3px 10px', cursor: 'pointer', marginTop: '0.25rem',
                            background: 'transparent', border: '1px solid rgba(255,215,0,0.3)', color: 'rgba(255,215,0,0.5)',
                          }}>REVERT</button>
                        </div>
                      )}
                      {intent === 'change' && changedIdx !== undefined && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                          border: `2px solid ${ACCENT}`, background: 'rgba(255,215,0,0.08)', padding: '1rem' }}>
                          <span style={{ fontFamily: FONT, fontSize: '2rem', color: ACCENT, lineHeight: 1 }}>↻</span>
                          <span style={{ fontFamily: FONT, fontSize: '0.9rem', letterSpacing: '1px', color: ACCENT, textAlign: 'center' }}>ANSWER CHANGED</span>
                          <button onClick={() => { onIntent(q.id, 'keep'); onChangeAnswer(q.id, -1) }} style={{
                            fontFamily: FONT, fontSize: '0.75rem', padding: '3px 10px', cursor: 'pointer', marginTop: '0.25rem',
                            background: 'transparent', border: '1px solid rgba(255,215,0,0.3)', color: 'rgba(255,215,0,0.5)',
                          }}>REVERT TO ORIGINAL</button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Final Phase View (Scribe's draft revealed to all) ────────────────────────

const FinalPhaseView: React.FC<{ scribeDraft: string; chat: ChatMessage[]; onSend: (t: string) => void; onProceed: () => void }> = ({ scribeDraft, chat, onSend, onProceed }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="frame-parchment" style={{ padding: '1.5rem', gap: '1rem' }}>
      <p style={{ fontFamily: FONT, fontSize: '0.75rem', letterSpacing: '3px', color: ACCENT, margin: 0, opacity: 0.9 }}>
        ▶ FINAL SOLUTION PHASE — ALL MEMBERS NOW REVIEWING THE SCRIBE'S DRAFT
      </p>
      <div style={{ fontFamily: FONT, fontSize: '1.05rem', color: TEXT, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
        {scribeDraft || '[No draft was submitted by the Scribe]'}
      </div>
      <button className="btn-9slice" onClick={onProceed} style={{ alignSelf: 'center', fontSize: '1.2rem', letterSpacing: '2px', minWidth: '260px' }}>
        PROCEED TO RECALIBRATION →
      </button>
    </motion.div>
    <div className="frame-parchment" style={{ padding: '1rem' }}>
      <ChatPanel messages={chat} onSend={onSend} />
    </div>
  </div>
)

// ─── Phase IV: Recalibration Quiz ─────────────────────────────────────────────

const Phase4: React.FC<{
  phase2Answers: Record<number, number>
  p3Intents: Record<number, 'keep' | 'change'>
  onComplete: () => void
}> = ({ phase2Answers, p3Intents, onComplete }) => {
  const [shuffledOrder] = useState<number[]>(() => shuffle(QUIZ_QUESTIONS.map(q => q.id)))
  const [shuffledOpts] = useState<Record<number, number[]>>(() => {
    const r: Record<number, number[]> = {}
    QUIZ_QUESTIONS.forEach(q => { r[q.id] = shuffle(q.options.map((_, i) => i)) })
    return r
  })
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)

  const allAnswered = Object.keys(answers).length === QUIZ_QUESTIONS.length

  return (
    <div className="frame-parchment" style={{ padding: '1.5rem', gap: '1.5rem' }}>
      <p style={{ fontFamily: FONT, fontSize: '0.75rem', letterSpacing: '3px', opacity: 0.6, color: TEXT, margin: 0 }}>
        PHASE IV · RECALIBRATION — Questions and options reshuffled. Phase III intents pre-loaded.
      </p>
      {!submitted ? (
        <>
          {shuffledOrder.map((qId, displayIdx) => {
            const q = QUIZ_QUESTIONS.find(x => x.id === qId)!
            const opts = shuffledOpts[qId]
            const intent = p3Intents[displayIdx + 1]
            const p2OrigIdx = phase2Answers[qId]

            return (
              <div key={qId} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <p style={{ fontFamily: FONT, fontSize: '1rem', color: TEXT, margin: 0, lineHeight: 1.5 }}>
                  <span style={{ color: ACCENT }}>Q{displayIdx + 1}. </span>{q.text}
                  {intent && <span style={{ fontSize: '0.8rem', opacity: 0.55, marginLeft: '0.5rem' }}>[{intent === 'keep' ? 'INTENT: KEEP' : 'INTENT: CHANGE'}]</span>}
                </p>
                {opts.map((origIdx, displayOptIdx) => {
                  const isSelected = answers[qId] === origIdx
                  const isPreloaded = intent !== 'change' && p2OrigIdx === origIdx && !isSelected
                  return (
                    <button key={origIdx} onClick={() => setAnswers(p => ({ ...p, [qId]: origIdx }))} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.55rem 0.75rem', textAlign: 'left',
                      fontFamily: FONT, fontSize: '0.95rem', lineHeight: 1.4,
                      background: isSelected ? 'rgba(255,215,0,0.15)' : isPreloaded ? 'rgba(255,215,0,0.05)' : 'transparent',
                      border: `1px solid ${isSelected ? 'rgba(255,215,0,0.7)' : isPreloaded ? 'rgba(255,215,0,0.3)' : 'rgba(255,215,0,0.15)'}`,
                      color: isSelected ? ACCENT : 'rgba(255,255,255,0.75)', cursor: 'pointer',
                    }}>
                      <span style={{ minWidth: '20px', color: ACCENT, fontWeight: 700 }}>{OPT_LABELS[displayOptIdx]}.</span>
                      {q.options[origIdx]}
                      {isPreloaded && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', opacity: 0.5, color: ACCENT }}>← prev</span>}
                    </button>
                  )
                })}
              </div>
            )
          })}
          <button className="btn-9slice" onClick={() => { setSubmitted(true); setTimeout(onComplete, 700) }} disabled={!allAnswered}
            style={{ alignSelf: 'center', fontSize: '1.3rem', letterSpacing: '2px', minWidth: '260px', opacity: allAnswered ? 1 : 0.4, cursor: allAnswered ? 'pointer' : 'not-allowed' }}>
            SUBMIT RECALIBRATION →
          </button>
          {!allAnswered && <p style={{ fontFamily: FONT, fontSize: '0.85rem', opacity: 0.5, color: TEXT, textAlign: 'center', margin: 0 }}>Answer all {QUIZ_QUESTIONS.length} questions to proceed.</p>}
        </>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ fontSize: '2.5rem' }}>★</div>
          <h2 style={{ fontFamily: FONT, fontSize: '1.8rem', color: ACCENT, margin: 0, letterSpacing: '3px' }}>RECALIBRATION COMPLETE</h2>
          <p style={{ fontFamily: FONT, fontSize: '1rem', color: TEXT, opacity: 0.8 }}>Proceeding to final artifact submission...</p>
        </motion.div>
      )}
    </div>
  )
}

// ─── Phase V: Final Artifact ──────────────────────────────────────────────────

const Phase5: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [artifactType, setArtifactType] = useState<'video' | 'pdf' | 'word' | null>(null)
  const [fileSelected, setFileSelected] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const TYPES = [
    { key: 'video' as const, label: 'VIDEO', icon: '▶', ext: 'mp4' },
    { key: 'pdf' as const, label: 'PDF', icon: '◼', ext: 'pdf' },
    { key: 'word' as const, label: 'DOCUMENT', icon: '✎', ext: 'docx' },
  ]

  return (
    <div className="frame-parchment" style={{ padding: '1.5rem', gap: '1.5rem' }}>
      <p style={{ fontFamily: FONT, fontSize: '0.75rem', letterSpacing: '3px', opacity: 0.6, color: TEXT, margin: 0 }}>PHASE V · FINAL ARTIFACT SUBMISSION</p>
      <h2 style={{ fontFamily: FONT, fontSize: '1.8rem', color: ACCENT, margin: 0, letterSpacing: '2px' }}>INDIVIDUAL RESPONSE</h2>
      <p style={{ fontFamily: FONT, fontSize: '1rem', opacity: 0.8, color: TEXT, margin: 0, lineHeight: 1.5 }}>
        Submit your individual artifact addressing the original challenge using the strategy refined during the cooperative discussion.
      </p>

      {!submitted ? (
        <>
          <div>
            <p style={{ fontFamily: FONT, fontSize: '0.75rem', letterSpacing: '2px', opacity: 0.6, color: TEXT, margin: '0 0 0.5rem' }}>SUBMISSION TYPE</p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {TYPES.map(t => (
                <button key={t.key} onClick={() => setArtifactType(t.key)} style={{
                  flex: '1 1 100px', padding: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem',
                  fontFamily: FONT, fontSize: '1rem', letterSpacing: '1px',
                  background: artifactType === t.key ? 'rgba(255,215,0,0.12)' : 'transparent',
                  border: `1px solid ${artifactType === t.key ? 'rgba(255,215,0,0.7)' : 'rgba(255,215,0,0.25)'}`,
                  color: artifactType === t.key ? ACCENT : 'rgba(255,215,0,0.5)', cursor: 'pointer',
                }}>
                  <span style={{ fontSize: '1.5rem' }}>{t.icon}</span>
                  <span>{t.label}</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>.{t.ext}</span>
                </button>
              ))}
            </div>
          </div>

          {artifactType && (
            <div onClick={() => setFileSelected(true)} style={{
              padding: '1.5rem', border: `2px dashed ${fileSelected ? 'rgba(255,215,0,0.7)' : 'rgba(255,215,0,0.25)'}`,
              textAlign: 'center', cursor: 'pointer', background: fileSelected ? 'rgba(255,215,0,0.05)' : 'transparent',
            }}>
              {fileSelected
                ? <span style={{ fontFamily: FONT, fontSize: '1rem', color: ACCENT }}>✓ artifact_submission.{TYPES.find(t => t.key === artifactType)?.ext} selected</span>
                : <span style={{ fontFamily: FONT, fontSize: '1rem', color: TEXT, opacity: 0.6 }}>Click to select file — or drag & drop</span>}
            </div>
          )}

          <button className="btn-9slice" onClick={() => setSubmitted(true)} disabled={!fileSelected}
            style={{ alignSelf: 'center', fontSize: '1.3rem', letterSpacing: '2px', minWidth: '260px', opacity: fileSelected ? 1 : 0.4, cursor: fileSelected ? 'pointer' : 'not-allowed' }}>
            SUBMIT ARTIFACT →
          </button>
        </>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
          <motion.div animate={{ rotate: [0, -8, 8, -8, 8, 0] }} transition={{ duration: 0.6, delay: 0.2 }} style={{ fontSize: '3rem' }}>★</motion.div>
          <h2 style={{ fontFamily: FONT, fontSize: '2.2rem', color: ACCENT, margin: 0, letterSpacing: '3px', textShadow: '0 0 12px rgba(255,215,0,0.5)' }}>QUEST COMPLETE!</h2>
          <p style={{ fontFamily: FONT, fontSize: '1.1rem', color: TEXT, opacity: 0.8, margin: 0 }}>
            You have completed all five phases of the Cooperative Learning Task.
            <br />Your individual mastery has been recorded.
          </p>
          <button className="btn-9slice" onClick={onComplete} style={{ fontSize: '1.2rem', letterSpacing: '2px', minWidth: '200px' }}>RETURN TO QUEST MAP</button>
        </motion.div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const LearningTaskUI: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  usePageBackground('learningTask')
  const { user, logout } = useAuthStore()

  const taskClassId = searchParams.get('classId') ?? 'default'
  const taskStep    = searchParams.get('step') ?? '1'
  const { advance } = useQuestStore()

  // Fetch real group assignment for this learner + class
  const { data: groupData } = useQuery<{
    myTaskGroup: { id: string; conversationId: string; members: { learnerId: string; displayName: string; role: string }[] } | null
  }>(MY_TASK_GROUP, {
    variables: { academicClassId: taskClassId },
    skip: taskClassId === 'default',
    fetchPolicy: 'cache-and-network',
  })

  const conversationId = groupData?.myTaskGroup?.conversationId ?? null

  const { data: groupMsgsData } = useQuery<{
    conversationMessages: { id: string; senderName: string; body: string; time: string }[]
  }>(GROUP_CHAT_MESSAGES, {
    variables: { conversationId },
    skip: !conversationId,
    pollInterval: 4000,
  })

  const [sendGroupMessage] = useMutation(SEND_GROUP_MESSAGE)

  const [phase, setPhase] = useState<Phase>(1)
  const [role, setRole] = useState<Role | null>(null)

  const [phase2Answers, setPhase2Answers] = useState<Record<number, number>>({})
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [chat, setChat] = useState<ChatMessage[]>(INITIAL_CHAT)
  const [finalPhaseActive, setFinalPhaseActive] = useState(false)
  const [scribeDraft, setScribeDraft] = useState('')
  const [p3Intents, setP3Intents] = useState<Record<number, 'keep' | 'change'>>({})
  const [p3ChangedAnswers, setP3ChangedAnswers] = useState<Record<number, number>>({})

  const handleP3Intent = useCallback((qId: number, intent: 'keep' | 'change') =>
    setP3Intents(p => ({ ...p, [qId]: intent })), [])

  const handleP3ChangeAnswer = useCallback((qId: number, origIdx: number) => {
    if (origIdx < 0) setP3ChangedAnswers(p => { const n = { ...p }; delete n[qId]; return n })
    else setP3ChangedAnswers(p => ({ ...p, [qId]: origIdx }))
  }, [])

  // Map DB role strings → frontend Role type
  function dbRoleToRole(dbRole: string): Role {
    const map: Record<string, Role> = {
      Leader: 'leader', Timer: 'timer', Scribe: 'scribe',
      AngleChecker: 'angle-checker',
    }
    return map[dbRole] ?? 'angle-checker'
  }

  // Resolve active group: real data first, DEV_GROUP as fallback
  const realGroup = groupData?.myTaskGroup
  const activeGroup: { learnerId: string; name: string; role: Role }[] = realGroup
    ? realGroup.members.map(m => ({ learnerId: m.learnerId, name: m.displayName, role: dbRoleToRole(m.role) }))
    : DEV_GROUP.map(m => ({ learnerId: '', name: m.name, role: m.role }))

  // Auto-assign role when entering Phase III
  useEffect(() => {
    if (phase === 3 && !role && user) {
      // Try real group first (match by learnerId)
      if (realGroup) {
        const mine = realGroup.members.find(m => m.learnerId === user.id)
        if (mine) { setRole(dbRoleToRole(mine.role)); return }
      }
      // Fallback: dev group matched by email
      const devRole = DEV_GROUP_ROLE_MAP[user.email ?? '']
      if (devRole) setRole(devRole)
    }
  }, [phase, user, realGroup])

  const advancePhase = useCallback((next: Phase) => {
    setPhase(next)
  }, [])

  // Live messages from the group's conversation; fall back to local state (DEV mode)
  const activeMessages: ChatMessage[] = conversationId && groupMsgsData
    ? groupMsgsData.conversationMessages.map((m, i) => ({
        id: i + 1,
        author: m.senderName,
        body: m.body,
        time: m.time ? new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      }))
    : chat

  const sendChat = useCallback(async (text: string) => {
    if (conversationId) {
      await sendGroupMessage({ variables: { conversationId, body: text } })
    } else {
      setChat(prev => [...prev, {
        id: prev.length + 1,
        author: user?.displayName ?? 'Me',
        body: text,
        time: nowTime(),
      }])
    }
  }, [conversationId, sendGroupMessage, user])

  return (
    <div className="theatrical-container" style={{ alignItems: 'flex-start', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: '52px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 1.25rem', background: 'rgba(20,10,0,0.72)', backdropFilter: 'blur(4px)',
        borderBottom: '1px solid rgba(255,215,0,0.2)', fontFamily: FONT,
      }}>
        <span style={{ fontSize: '1.1rem', letterSpacing: '2px', color: 'rgba(255,215,0,0.9)' }}>STELLA LOGOS</span>
        <span style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.85)', letterSpacing: '1px' }}>{user?.displayName}</span>
        <button onClick={() => { logout(); navigate('/') }} style={{
          fontFamily: FONT, fontSize: '1rem', letterSpacing: '2px', padding: '2px 14px',
          background: 'transparent', border: '1px solid rgba(255,215,0,0.4)', color: 'rgba(255,215,0,0.7)', cursor: 'pointer',
        }}>LOGOUT</button>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: 'easeOut' }}
        className="safe-zone"
        style={{ marginTop: '108px', marginBottom: '2rem', maxWidth: '920px', gap: '1.5rem' }}
      >
        <PhaseBar current={phase} />

        <AnimatePresence mode="wait">
          {phase === 1 && (
            <motion.div key="p1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ width: '100%' }}>
              <Phase1 onComplete={() => advancePhase(2)} />
            </motion.div>
          )}

          {phase === 2 && (
            <motion.div key="p2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ width: '100%' }}>
              <Phase2 onComplete={(answers) => { setPhase2Answers(answers); advancePhase(3) }} />
            </motion.div>
          )}

          {phase === 3 && (
            <motion.div key="p3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
              {!role ? (
                <RoleSelection onSelect={setRole} />
              ) : finalPhaseActive ? (
                <FinalPhaseView scribeDraft={scribeDraft} chat={activeMessages} onSend={sendChat} onProceed={() => { advancePhase(4); setRole(null); setFinalPhaseActive(false) }} />
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontFamily: FONT, fontSize: '1rem', letterSpacing: '2px', color: ACCENT, opacity: 0.85 }}>
                      {ROLE_DEFS.find(r => r.role === role)?.icon} {ROLE_DEFS.find(r => r.role === role)?.label}
                    </span>
                    <button onClick={() => setRole(null)} style={{ fontFamily: FONT, fontSize: '0.85rem', padding: '2px 10px', background: 'transparent', border: '1px solid rgba(255,215,0,0.3)', color: 'rgba(255,215,0,0.6)', cursor: 'pointer' }}>
                      CHANGE ROLE
                    </button>
                  </div>

                  {/* Group member strip */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', width: '100%' }}>
                    {activeGroup.map((m, i) => {
                      const isSelf = realGroup
                        ? m.learnerId === user?.id
                        : m.name === (user?.displayName ?? '')
                      const def = ROLE_DEFS.find(r => r.role === m.role)
                      return (
                        <div key={m.learnerId || i} style={{
                          fontFamily: FONT, fontSize: '0.8rem', letterSpacing: '1px',
                          padding: '3px 10px', display: 'flex', alignItems: 'center', gap: '5px',
                          border: `1px solid ${isSelf ? 'rgba(255,215,0,0.7)' : 'rgba(255,215,0,0.2)'}`,
                          background: isSelf ? 'rgba(255,215,0,0.1)' : 'transparent',
                          color: isSelf ? ACCENT : 'rgba(255,255,255,0.5)',
                        }}>
                          <span>{def?.icon}</span>
                          <span>{m.name}</span>
                          <span style={{ opacity: 0.5 }}>· {def?.label}</span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Quiz review — open by default, collapsible */}
                  <QuizReview
                    phase2Answers={phase2Answers}
                    p3Intents={p3Intents}
                    p3ChangedAnswers={p3ChangedAnswers}
                    currentQuestion={currentQuestion}
                    onIntent={handleP3Intent}
                    onChangeAnswer={handleP3ChangeAnswer}
                  />

                  {role === 'leader' && (
                    <LeaderPanel chat={activeMessages} onSend={sendChat} currentQuestion={currentQuestion} onNextQuestion={() => setCurrentQuestion(p => Math.min(p + 1, 20))} />
                  )}
                  {role === 'timer' && <TimerPanel chat={activeMessages} onSend={sendChat} />}
                  {role === 'scribe' && (
                    <ScribePanel chat={activeMessages} onSend={sendChat} onTriggerFinalPhase={(draft) => { setScribeDraft(draft); setFinalPhaseActive(true) }} />
                  )}
                  {role === 'angle-checker' && <AngleCheckerPanel chat={activeMessages} onSend={sendChat} />}
                </>
              )}
            </motion.div>
          )}

          {phase === 4 && (
            <motion.div key="p4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Phase4 phase2Answers={phase2Answers} p3Intents={p3Intents} onComplete={() => advancePhase(5)} />
            </motion.div>
          )}

          {phase === 5 && (
            <motion.div key="p5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Phase5 onComplete={async () => {
                if (taskClassId !== 'default') await advance(taskClassId)
                navigate('/learningtask')
              }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── DEV SKIP BAR — remove before launch ────────────────────────── */}
        {phase < 5 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem',
            padding: '0.75rem 1rem',
            borderTop: '1px dashed rgba(255,100,0,0.35)',
            marginTop: '0.5rem',
          }}>
            <span style={{ fontFamily: FONT, fontSize: '0.75rem', letterSpacing: '2px', color: 'rgba(255,100,0,0.5)' }}>
              DEV
            </span>
            <button
              onClick={() => {
                if (phase === 1) advancePhase(2)
                else if (phase === 2) {
                  const rand: Record<number, number> = {}
                  QUIZ_QUESTIONS.forEach(q => { rand[q.id] = Math.floor(Math.random() * q.options.length) })
                  setPhase2Answers(rand)
                  advancePhase(3)
                }
                else if (phase === 3) { setRole(null); setFinalPhaseActive(false); advancePhase(4) }
                else if (phase === 4) advancePhase(5)
              }}
              style={{
                fontFamily: FONT, fontSize: '1rem', letterSpacing: '2px',
                padding: '4px 20px', cursor: 'pointer',
                background: 'rgba(255,100,0,0.08)',
                border: '1px dashed rgba(255,100,0,0.45)',
                color: 'rgba(255,130,0,0.75)',
              }}
            >
              SKIP TO NEXT PHASE →
            </button>
          </div>
        )}
        {/* ── END DEV SKIP BAR ────────────────────────────────────────────── */}

      </motion.div>
    </div>
  )
}
