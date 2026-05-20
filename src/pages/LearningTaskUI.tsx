import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, gql } from '@apollo/client'
import { useAuthStore } from '@/stores/authStore'
import { usePageBackground } from '@/hooks/usePageBackground'
import { useQuestStore } from '@/stores/questStore'
import { useTaskContextStore } from '@/stores/taskContextStore'
import { randomTiers, BOT_NAMES, BOT_ACCURACY, ROLE_ORDER as BOT_ROLE_ORDER, type BotRole, type BotTier } from '@/lib/botEngine'

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

const JOIN_ACTIVE_TASK_SESSION = gql`
  mutation JoinActiveTaskSession($academicClassId: ID!) {
    joinActiveTaskSession(academicClassId: $academicClassId) {
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

// ─── Bot / group config ───────────────────────────────────────────────────────

const MOCK_TEAM = ['AriaBOT', 'ConradBOT', 'PetraBOT', 'RexBOT']

const INITIAL_CHAT: ChatMessage[] = [
  { id: 1, author: 'Mr. Bot', body: 'Welcome to the cooperative discussion phase. Each role player — please ensure you are prepared. Leader, you may begin when the group is ready.', time: '09:00', isTeacher: true },
  { id: 2, author: 'ConradBOT', body: 'Ready on my end.', time: '09:01' },
  { id: 3, author: 'PetraBOT',  body: 'Ready here too.', time: '09:01' },
  { id: 4, author: 'RexBOT',    body: "Let's go — I found the content video really useful for structuring my answers.", time: '09:02' },
  { id: 5, author: 'AriaBOT',   body: 'Same. Question 5 was tricky though — I second-guessed myself.', time: '09:03' },
]

// ─── Bot Phase-1 metacog answers (smart / stupid per role) ───────────────────

const BOT_METACOG: Record<BotRole, Record<BotTier, MetacogState>> = {
  leader: {
    smart: {
      problem:  "The learner faces a high-stakes formal presentation with no preparation structure, no knowledge of the board's expectations, and severe performance anxiety — all within a 24-hour window.",
      solution: "A structured three-stage approach: research and outline (evening), rehearsal and refinement (morning), confident delivery (presentation).",
      criteria: "The board engages with the ideas, the learner stays within 5 minutes, and at least one recommendation is acknowledged.",
      audit:    "1. Research the school board's recent decisions online.\n2. Draft a 5-point outline: problem, evidence, proposal, cost, benefit.\n3. Create one clear visual aid.\n4. Rehearse 3 times — solo, in mirror, to a friend.\n5. Prepare 3 likely questions and answers.\n6. Sleep 8 hours and arrive 10 minutes early.",
    },
    stupid: {
      problem:  "She has to give a big presentation and she's nervous and not prepared.",
      solution: "Just practice as much as possible and write some notes to help.",
      criteria: "If the board doesn't look bored and she gets through it.",
      audit:    "1. Write some notes.\n2. Practice in front of a mirror.\n3. Go to the presentation and do it.",
    },
  },
  timer: {
    smart: {
      problem:  "The core problem is time pressure combined with lack of focus — without a timed plan the learner will either over-prepare on irrelevant areas or rush the delivery.",
      solution: "Divide the 24 hours into strict timed blocks: 2 h research, 3 h writing, 1 h visual, 3 h rehearsal, 8 h sleep, 1 h morning review.",
      criteria: "All preparation blocks are completed on schedule and the learner delivers without exceeding 5 minutes.",
      audit:    "1. Write a schedule with phone alarms for each block.\n2. Research for exactly 2 hours.\n3. Draft and structure for 3 hours.\n4. Create one simple visual.\n5. Use a stopwatch during rehearsal.\n6. Review notes at breakfast.",
    },
    stupid: {
      problem:  "Not enough time to get ready for the presentation.",
      solution: "Do everything as fast as possible and hope for the best.",
      criteria: "If you don't run out of things to say.",
      audit:    "1. Set a timer.\n2. Write notes quickly.\n3. Practice once.\n4. Go and do it.",
    },
  },
  scribe: {
    smart: {
      problem:  "The learner must synthesise scattered notes and nervous energy into a coherent, evidence-based 5-minute argument that persuades a formal audience.",
      solution: "Create a structured written outline first, then convert it to spoken cue cards — every point backed by evidence.",
      criteria: "The outline covers 5 key points, fits 5 minutes when read aloud, and each claim has at least one piece of evidence.",
      audit:    "1. Collect all ideas from the three exercise books.\n2. Sort into: problem, evidence, solution, impact, recommendation.\n3. Write one paragraph per category (max 3 sentences).\n4. Convert to bullet-point cue cards.\n5. Read aloud and time — cut anything that overruns.\n6. Review for clarity the morning of the presentation.",
    },
    stupid: {
      problem:  "Her notes are all over the place and she doesn't know what to say.",
      solution: "Write out what she wants to say and read it if she has to.",
      criteria: "If she remembers most of what she planned to say.",
      audit:    "1. Gather all the notes.\n2. Write out the main points.\n3. Read through a couple of times.\n4. Go do the presentation.",
    },
  },
  'angle-checker': {
    smart: {
      problem:  "The real risk is not the lack of time but the lack of audience awareness — the learner doesn't know what the board actually wants, so even a well-prepared talk could miss the mark entirely.",
      solution: "Before preparing content, spend 30 minutes researching the board's stated priorities, then build the presentation around those — not personal opinions.",
      criteria: "Every point links directly to a known board priority. The board asks at least one follow-up question, indicating genuine engagement.",
      audit:    "1. Search the school website and meeting minutes for the board's current priorities.\n2. Identify 2–3 priorities relevant to digital learning.\n3. Structure the presentation around those priorities.\n4. Check each point: 'Does this answer something the board cares about?'\n5. Rehearse with someone who will challenge your assumptions.\n6. Prepare for: 'What evidence do you have for this?'",
    },
    stupid: {
      problem:  "She doesn't really know what the board wants to hear.",
      solution: "Just talk about what she thinks is important and hope they agree.",
      criteria: "If they don't ask hard questions.",
      audit:    "1. Think about what she knows.\n2. Talk about the most important stuff.\n3. Answer any questions as best she can.",
    },
  },
}

// ─── Phase 3b template bot responses ─────────────────────────────────────────

function getBotP3bResponse(
  role: BotRole, tier: BotTier, _name: string, msgIdx: number,
  ctx: { userName: string; userSolution: string; userSteps: string },
): string {
  const { userName, userSolution, userSteps } = ctx
  const i = msgIdx % 6
  const sol60 = userSolution.substring(0, 60)
  const steps50 = userSteps.substring(0, 50)

  if (role === 'leader') {
    return tier === 'smart' ? [
      `Right, let's get into it. ${userName}, your approach — "${sol60}..." — is a strong starting point. Can you tell us more about why you started there?`,
      `Good thinking. What does everyone consider the single most critical step? Let's identify the core before we draft anything.`,
      `Let's not lose sight of the real constraint — the student has 24 hours. We need something realistic, not just theoretically ideal.`,
      `I'm seeing a common theme across our solutions. Scribe, are you capturing that? It should anchor the final draft.`,
      `Angle Checker — have we stress-tested the plan? What if the student freezes on the day?`,
      `We're close to consensus. Scribe, please start pulling the final solution together based on what we've discussed.`,
    ][i] : [
      `ok so ${userName} said "${sol60}..." that's not bad I guess`,
      `we should probably pick the best bits? idk`,
      `anyone have ideas we should decide`,
      `ok scribe can you write it down`,
      `yeah that seems fine`,
      `ok lets go with that`,
    ][i]
  }

  if (role === 'timer') {
    return tier === 'smart' ? [
      `Keeping us on track — we've been on the problem framing for a while. Let's make sure we leave time for the solution and delivery steps.`,
      `Good discussion. I'd suggest 5 more minutes on solution structure, then we finalise the steps.`,
      `We're in the middle stretch — Scribe, where's the draft at?`,
      `Time check: we need to wrap up soon. Leader, are we close to consensus?`,
      `Scribe needs to draft the final answer. Let's commit to a direction now.`,
      `Last call — everyone raise any remaining concerns or we lock this in.`,
    ][i] : [
      `oh right I'm supposed to track time... we should probably hurry up`,
      `how long have we been going? feels like a while`,
      `we should wrap up soon I think`,
      `ok we really need to finish`,
      `seriously tho`,
      `someone write it down already`,
    ][i]
  }

  if (role === 'scribe') {
    return tier === 'smart' ? [
      `I'm capturing the key elements. So far: the solution centres on researching the audience first, then structuring content around their priorities. Does that reflect the group's thinking?`,
      `Quick check — ${userName}, your steps mentioned "${steps50}..." — should I include that level of detail in the draft?`,
      `Common thread noted: thorough preparation is the core of everyone's approach. I'll anchor the draft around that.`,
      `I'm ready to draft when the group reaches consensus. Are we going with the research-first approach?`,
      `Noted. I'll incorporate that — checking with Leader before I finalise.`,
      `Draft submitted — structured as: research → outline → rehearsal → delivery. Adjust anything that needs changing.`,
    ][i] : [
      `ok I'll try to write this down`,
      `got it... kind of`,
      `I'm noting: "${sol60.substring(0, 30)}..." — is that right?`,
      `ok noted`,
      `sure I'll add that`,
      `here's what I have so far, sorry if it's a bit messy`,
    ][i]
  }

  // angle-checker
  return tier === 'smart' ? [
    `Before we commit — has anyone considered that the student might not have internet access to research the board's priorities? ${userName}'s solution assumes resource availability.`,
    `Hold on — most solutions focus on preparation structure, but what about the anxiety problem? I don't see a specific step for managing performance nerves.`,
    `I want to push back on the research step: what if the board's priorities aren't publicly available? Do we have a fallback?`,
    `The plan looks solid overall — but is the rehearsal timeline realistic for a severely anxious student? Should we be more specific?`,
    `Final check: does our plan address all three original problems — structure, board expectations, and anxiety?`,
    `Satisfied with the direction. Last flag: make sure the draft mentions what to do if the student goes over time. Real risk.`,
  ][i] : [
    `hmm I guess I should check something... nope seems fine`,
    `wait actually should we consider that she might forget everything?`,
    `I think it looks ok`,
    `yeah no issues from me`,
    `all good I think`,
    `looks fine to me`,
  ][i]
}

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
              fontFamily: FONT, fontSize: '1.15rem',
              color: done ? '#1a1000' : active ? ACCENT : 'rgba(255,215,0,0.3)',
              opacity: !done && !active ? 0.45 : 1,
            }}>
              {done ? '✓' : n}
            </div>
            <span style={{ fontFamily: FONT, fontSize: '1.1rem', letterSpacing: '1px', color: done || active ? ACCENT : 'rgba(255,215,0,0.25)', whiteSpace: 'nowrap' }}>
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
        <p style={{ fontFamily: FONT, fontSize: '1rem', letterSpacing: '3px', opacity: 0.6, color: TEXT, margin: 0 }}>PHASE I · STRUCTURE THE PROBLEM</p>
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
        <p style={{ fontFamily: FONT, fontSize: '1rem', letterSpacing: '3px', opacity: 0.6, color: TEXT, margin: 0 }}>ANSWER ALL FOUR QUESTIONS TO UNLOCK THE NEXT SECTION</p>
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
                  fontFamily: FONT, fontSize: '1.1rem', cursor: 'pointer',
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
                    fontFamily: FONT, fontSize: '1.2rem', lineHeight: 1.55,
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
            <p style={{ fontFamily: FONT, fontSize: '1.2rem', opacity: 0.75, color: TEXT, margin: 0, lineHeight: 1.4 }}>{prompt}</p>
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
          <p style={{ fontFamily: FONT, fontSize: '1.1rem', opacity: 0.5, color: TEXT, textAlign: 'center', margin: 0 }}>
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
  const { setTaskContext } = useTaskContextStore()
  useEffect(() => { setTaskContext(2, tab) }, [tab])
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
            background: tab === t ? 'var(--color-pane-bg, rgba(10,18,30,0.92))' : 'rgba(10,18,30,0.65)',
            border: `1px solid ${tab === t ? 'rgba(255,215,0,0.8)' : 'rgba(255,215,0,0.3)'}`,
            color: tab === t ? ACCENT : 'rgba(255,215,0,0.5)', cursor: 'pointer',
          }}>
            {t === 'resources' ? 'RESOURCE HUB' : `BLIND QUIZ (${answered}/${QUIZ_QUESTIONS.length})`}
          </button>
        ))}
      </div>

      {tab === 'resources' && (
        <div className="frame-parchment" style={{ padding: '1.5rem', gap: '1rem' }}>
          <p style={{ fontFamily: FONT, fontSize: '1rem', letterSpacing: '3px', opacity: 0.6, color: TEXT, margin: 0 }}>PHASE II · RESOURCE HUB · Study these before attempting the quiz</p>
          {RESOURCES.map((r, i) => (
            <div key={i} onClick={() => window.open(r.href, '_blank')} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', border: '1px solid rgba(255,215,0,0.2)', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,215,0,0.6)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,215,0,0.2)')}
            >
              <div style={{
                fontFamily: FONT, fontSize: '1.05rem', letterSpacing: '1px', padding: '2px 8px', minWidth: '48px', textAlign: 'center',
                background: r.type === 'PDF' ? 'rgba(220,60,60,0.25)' : 'rgba(60,120,220,0.25)',
                border: `1px solid ${r.type === 'PDF' ? 'rgba(220,60,60,0.5)' : 'rgba(60,120,220,0.5)'}`,
                color: r.type === 'PDF' ? '#ff8888' : '#88aaff',
              }}>{r.type}</div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: '1.05rem', color: ACCENT }}>{r.title}</div>
                <div style={{ fontFamily: FONT, fontSize: '1.1rem', opacity: 0.6, color: TEXT }}>{r.desc}</div>
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
          setAnswers(p => ({ ...p, [q.id]: origIdx }))
        }

        return (
          <div className="frame-parchment" style={{ padding: '1.5rem', gap: '1.25rem' }}>
            {/* header */}
            <p style={{ fontFamily: FONT, fontSize: '1rem', letterSpacing: '3px', opacity: 0.6, color: TEXT, margin: 0 }}>
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
                      fontFamily: FONT, fontSize: '1.2rem', lineHeight: 1.4,
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

              <span style={{ fontFamily: FONT, fontSize: '1.1rem', opacity: 0.5, color: TEXT }}>
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
              <p style={{ fontFamily: FONT, fontSize: '1.05rem', opacity: 0.5, color: TEXT, textAlign: 'center', margin: 0 }}>
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
    <p style={{ fontFamily: FONT, fontSize: '1rem', letterSpacing: '3px', opacity: 0.6, color: TEXT, margin: 0 }}>PHASE III · SELECT YOUR ROLE FOR THIS SESSION</p>
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
          <div style={{ fontSize: '1.15rem', color: TEXT, opacity: 0.75, marginTop: '2px' }}>{desc}</div>
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
      <p style={{ fontFamily: FONT, fontSize: '1rem', letterSpacing: '3px', opacity: 0.5, color: TEXT, margin: 0 }}>GROUP CHAT</p>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', minHeight: '180px', maxHeight: '50vh' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontFamily: FONT, fontSize: '1.1rem', fontWeight: 700, color: msg.isTeacher ? '#88aaff' : ACCENT }}>{msg.author}</span>
              <span style={{ fontFamily: FONT, fontSize: '1.05rem', opacity: 0.4, color: TEXT, marginLeft: '6px' }}>{msg.time}</span>
              <div style={{ fontFamily: FONT, fontSize: '1.2rem', color: TEXT, lineHeight: 1.4 }}>{msg.body}</div>
            </div>
            {showCapture && onCapture && (
              <button onClick={() => onCapture(msg)} title="Capture to Notebook" style={{ background: 'transparent', border: '1px solid rgba(255,215,0,0.3)', color: ACCENT, cursor: 'pointer', fontFamily: FONT, fontSize: '1.05rem', padding: '2px 6px', flexShrink: 0 }}>✎</button>
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
          <span style={{ fontFamily: FONT, fontSize: '1.15rem', minWidth: '18px', color: isMe ? ACCENT : 'rgba(255,255,255,0.5)' }}>{opt}</span>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', height: '14px', position: 'relative' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: isMe ? ACCENT : 'rgba(255,215,0,0.4)', transition: 'width 0.5s ease' }} />
          </div>
          <span style={{ fontFamily: FONT, fontSize: '1.05rem', color: TEXT, minWidth: '32px', textAlign: 'right' }}>{count}/{total}</span>
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
      {expired && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontFamily: FONT, fontSize: '1.1rem', color: '#ff6666', margin: 0, textAlign: 'center' }}>⚠ {warning}</motion.p>}
    </div>
  )
}

// ─── Leader Panel ─────────────────────────────────────────────────────────────

const LeaderPanel: React.FC<{ chat: ChatMessage[]; onSend: (t: string) => void; currentQuestion: number; onNextQuestion: () => void; allMembersDecided: boolean }> = ({ chat, onSend, currentQuestion, onNextQuestion, allMembersDecided }) => {
  const [distribution, setDistribution] = useState<Record<string, number>>(makeDistribution())

  const advance = () => { setDistribution(makeDistribution()); onNextQuestion() }
  const q = currentQuestion > 0 ? QUIZ_QUESTIONS[currentQuestion - 1] : null

  return (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', width: '100%' }}>
      <div className="frame-parchment" style={{ flex: '1 1 300px', padding: '1rem', gap: '1rem', minWidth: '280px' }}>
        <p style={{ fontFamily: FONT, fontSize: '1rem', letterSpacing: '3px', opacity: 0.6, color: TEXT, margin: 0 }}>♚ LEADER · LOGIC ENGINE</p>
        <div style={{ fontFamily: FONT, fontSize: '1.1rem', color: TEXT }}>
          Question: <span style={{ color: ACCENT }}>{currentQuestion === 0 ? 'Not started' : `${currentQuestion} / 20`}</span>
        </div>
        {q && (
          <>
            <p style={{ fontFamily: FONT, fontSize: '1.2rem', color: TEXT, lineHeight: 1.4, margin: 0 }}>{q.text}</p>
            <DistChart distribution={distribution} total={MOCK_TEAM.length} />
          </>
        )}
        {allMembersDecided && currentQuestion > 0 && currentQuestion < QUIZ_QUESTIONS.length && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            style={{
              fontFamily: FONT, fontSize: '1rem', letterSpacing: '2px',
              padding: '0.4rem 0.75rem', textAlign: 'center',
              border: '1px solid rgba(100,220,100,0.6)',
              background: 'rgba(100,220,100,0.08)',
              color: 'rgba(100,220,100,0.9)',
            }}
          >
            ✓ ALL MEMBERS DECIDED — ADVANCE
          </motion.div>
        )}
        <button className="btn-9slice" onClick={advance} disabled={currentQuestion >= QUIZ_QUESTIONS.length} style={{ fontSize: '1.05rem', letterSpacing: '2px', opacity: currentQuestion >= QUIZ_QUESTIONS.length ? 0.4 : 1 }}>
          {currentQuestion === 0 ? 'START DISCUSSION ▶' : currentQuestion >= QUIZ_QUESTIONS.length ? 'ALL QUESTIONS DONE' : 'NEXT QUESTION ▶'}
        </button>
        <PulseButton intervalSeconds={20} label="PARTICIPATION PULSE" onPulse={() => onSend('[System] Leader pulse confirmed — Active.')} warning="Click PULSE to maintain Active status!" />
        <div>
          <p style={{ fontFamily: FONT, fontSize: '1rem', letterSpacing: '2px', opacity: 0.6, color: TEXT, margin: '0 0 0.4rem' }}>PROMPT A MEMBER</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {MOCK_TEAM.map(name => (
              <button key={name} onClick={() => onSend(`${name}, what do you think about this discrepancy?`)} style={{
                fontFamily: FONT, fontSize: '1.1rem', padding: '3px 10px', background: 'rgba(255,215,0,0.06)',
                border: '1px solid rgba(255,215,0,0.3)', color: ACCENT, cursor: 'pointer',
              }}>{name}</button>
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
        <p style={{ fontFamily: FONT, fontSize: '1rem', letterSpacing: '3px', opacity: 0.6, color: TEXT, margin: 0 }}>◷ TIMER · PRIVATE HEARTBEAT</p>
        {timePerQ !== null && (
          <div style={{ fontFamily: FONT, fontSize: '4rem', color: secondsLeft < 30 ? '#ff6666' : ACCENT, textAlign: 'center', letterSpacing: '4px', lineHeight: 1 }}>
            {fmt(secondsLeft)}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input value={totalMins} onChange={e => setTotalMins(e.target.value)} placeholder="Total mins (e.g. 40)"
            style={{ flex: 1, fontFamily: FONT, fontSize: '1rem', padding: '0.4rem 0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,215,0,0.25)', color: 'rgba(255,255,255,0.9)', outline: 'none' }} />
          <button className="btn-9slice" onClick={divide} style={{ fontSize: '1.15rem', letterSpacing: '1px' }}>DIVIDE</button>
        </div>
        {timePerQ !== null && (
          <>
            <p style={{ fontFamily: FONT, fontSize: '1.1rem', color: TEXT, opacity: 0.7, margin: 0 }}>~{fmt(timePerQ)} per question (20 Qs + final phase)</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-9slice" onClick={() => setRunning(true)} style={{ flex: 1, fontSize: '1.2rem' }}>{running ? 'RUNNING...' : 'START'}</button>
              <button className="btn-9slice" onClick={() => { setSecondsLeft(timePerQ!); setRunning(false) }} style={{ flex: 1, fontSize: '1.2rem' }}>RESET Q</button>
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
          <p style={{ fontFamily: FONT, fontSize: '1rem', letterSpacing: '3px', opacity: 0.6, color: TEXT, margin: '0 0 0.5rem' }}>✎ SCRIBE · CAPTURE FROM CHAT</p>
          <ChatPanel messages={chat} onSend={onSend} showCapture onCapture={capture} />
        </div>
        <div className="frame-parchment" style={{ flex: '1 1 280px', padding: '1rem', gap: '0.6rem', minWidth: '260px' }}>
          <p style={{ fontFamily: FONT, fontSize: '1rem', letterSpacing: '3px', opacity: 0.6, color: TEXT, margin: 0 }}>NOTEBOOK · {notebook.length} captured</p>
          {notebook.length === 0 && <p style={{ fontFamily: FONT, fontSize: '1.15rem', opacity: 0.4, color: TEXT, margin: 0 }}>Click ✎ next to a message to capture it here.</p>}
          {notebook.map((note, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, fontFamily: FONT, fontSize: '1.15rem', color: TEXT, lineHeight: 1.4, padding: '0.4rem', background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.15)' }}>{note}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {[['▲', () => moveUp(i)], ['▼', () => moveDown(i)]].map(([lbl, fn]) => (
                  <button key={lbl as string} onClick={fn as () => void} style={{ fontFamily: FONT, fontSize: '1rem', padding: '1px 6px', background: 'transparent', border: '1px solid rgba(255,215,0,0.3)', color: ACCENT, cursor: 'pointer' }}>{lbl as string}</button>
                ))}
                <button onClick={() => remove(i)} style={{ fontFamily: FONT, fontSize: '1rem', padding: '1px 6px', background: 'transparent', border: '1px solid rgba(220,60,60,0.4)', color: '#ff8888', cursor: 'pointer' }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="frame-parchment" style={{ padding: '1rem', gap: '0.75rem' }}>
        <p style={{ fontFamily: FONT, fontSize: '1rem', letterSpacing: '3px', opacity: 0.6, color: TEXT, margin: 0 }}>DRAFT · FINAL TEAM SOLUTION</p>
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
        <p style={{ fontFamily: FONT, fontSize: '1rem', letterSpacing: '3px', opacity: 0.6, color: TEXT, margin: 0 }}>◈ ANGLE CHECKER · ANTI-GROUPTHINK TRIAD</p>
        <p style={{ fontFamily: FONT, fontSize: '1.15rem', opacity: 0.75, color: TEXT, margin: 0 }}>
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


// ─── Phase IIIa Intro Modal ───────────────────────────────────────────────────

const Phase3aIntroModal: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 200,
    background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
  }}>
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
      className="frame-parchment"
      style={{ maxWidth: '520px', width: '100%', padding: '2rem', gap: '1.25rem' }}
    >
      <p style={{ fontFamily: FONT, fontSize: '0.9rem', letterSpacing: '3px', color: ACCENT, opacity: 0.55, margin: 0 }}>
        PHASE IIIa · GROUP QUIZ REVIEW
      </p>
      <h2 style={{ fontFamily: FONT, fontSize: '1.7rem', color: ACCENT, margin: 0, letterSpacing: '2px' }}>
        REVIEW YOUR ANSWERS AS A GROUP
      </h2>
      <p style={{ fontFamily: FONT, fontSize: '1.1rem', lineHeight: 1.65, color: TEXT, opacity: 0.85, margin: 0 }}>
        You will now go through each quiz question together with your group. For every question you can see how each member answered.
      </p>
      <p style={{ fontFamily: FONT, fontSize: '1.1rem', lineHeight: 1.65, color: TEXT, opacity: 0.85, margin: 0 }}>
        Compare the answers, then decide: keep your original answer, or change it. Once you decide the group moves on to the next question.
      </p>
      <p style={{ fontFamily: FONT, fontSize: '1.1rem', lineHeight: 1.65, color: TEXT, opacity: 0.85, margin: 0 }}>
        After all questions are reviewed, your group will work together to build the best possible solution to the real-life challenge.
      </p>
      <button className="btn-9slice" onClick={onDismiss} style={{ alignSelf: 'center', fontSize: '1.2rem', letterSpacing: '2px', minWidth: '240px' }}>
        START REVIEW →
      </button>
    </motion.div>
  </div>
)

// ─── Phase IIIa: Unanimous Quiz Review (no roles) ────────────────────────────

const Phase3a: React.FC<{
  phase2Answers: Record<number, number>
  botAnswers: Record<BotRole, Record<number, number>>
  botTiers: Record<BotRole, BotTier>
  userName: string
  onComplete: (finalAnswers: Record<number, number>) => void
}> = ({ phase2Answers, botAnswers, botTiers, userName, onComplete }) => {
  // Group = user + leader bot + timer bot + angle-checker bot
  const BOT_3 = ['leader', 'timer', 'angle-checker'] as const

  const [introVisible, setIntroVisible] = useState(true)
  const [qIdx, setQIdx]     = useState(0)
  const [chat, setChat]     = useState<ChatMessage[]>([])
  const [picking, setPicking]     = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // decisions in ref so timeouts always read current value
  const decisionsRef = useRef<Record<number, { intent: 'keep' | 'change'; newIdx?: number }>>({})
  const [, forceRender] = useState(0)

  // Scroll only within the chat container — never touches page scroll
  useEffect(() => {
    const el = chatContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chat])

  const q        = QUIZ_QUESTIONS[qIdx]
  const userAns  = phase2Answers[q?.id] ?? -1
  const botAnsList  = BOT_3.map(r => botAnswers[r][q?.id] ?? -1)
  const allAnsList  = [userAns, ...botAnsList]
  const isUnanimous = q && allAnsList.every(a => a >= 0 && a === allAnsList[0])
  const decision    = q ? decisionsRef.current[q.id] : undefined
  const voteCounts  = q ? q.options.map((_, i) => allAnsList.filter(a => a === i).length) : []

  const postBot = (author: string, body: string) =>
    setChat(p => [...p, { id: Date.now() + Math.random(), author, body, time: nowTime() }])

  const goNext = (fromIdx: number) => {
    const nextIdx = fromIdx + 1
    if (nextIdx >= QUIZ_QUESTIONS.length) {
      const final = Object.fromEntries(
        QUIZ_QUESTIONS.map(qq => {
          const d = decisionsRef.current[qq.id]
          return [qq.id, d?.intent === 'change' && d.newIdx !== undefined ? d.newIdx : (phase2Answers[qq.id] ?? 0)]
        })
      )
      onComplete(final)
    } else {
      setQIdx(nextIdx)
      setPicking(false)
      setAdvancing(false)
    }
  }

  const afterDecide = (qId: number, d: { intent: 'keep' | 'change'; newIdx?: number }) => {
    decisionsRef.current[qId] = d
    forceRender(n => n + 1)
    setAdvancing(true)
    setPicking(false)

    const leaderName = BOT_NAMES.leader[botTiers.leader]
    const timerName  = BOT_NAMES.timer[botTiers.timer]
    const isSmartL   = botTiers.leader === 'smart'
    const isSmartT   = botTiers.timer  === 'smart'

    setTimeout(() => postBot(leaderName, d.intent === 'keep'
      ? (isSmartL ? `Good call, ${userName}. I'll align with that.` : 'ok yeah')
      : (isSmartL ? `Makes sense — ${d.newIdx !== undefined ? OPT_LABELS[d.newIdx] : 'that'} is the stronger answer.` : 'ok sure')
    ), 600)
    setTimeout(() => postBot(timerName, isSmartT ? 'Agreed — moving on.' : 'ok'), 1100)
    setTimeout(() => goNext(qIdx), 1600)
  }

  if (!q) return null

  const pct = Math.round((qIdx / QUIZ_QUESTIONS.length) * 100)

  return (
    <>
    {introVisible && <Phase3aIntroModal onDismiss={() => setIntroVisible(false)} />}
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontFamily: FONT, fontSize: '1rem', letterSpacing: '2px', color: ACCENT, opacity: 0.7, flexShrink: 0 }}>
          Q {qIdx + 1} / {QUIZ_QUESTIONS.length}
        </span>
        <div style={{ flex: 1, height: '4px', background: 'rgba(255,215,0,0.1)' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: ACCENT, transition: 'width 0.4s' }} />
        </div>
        <span style={{ fontFamily: FONT, fontSize: '1rem', color: ACCENT, opacity: 0.45, flexShrink: 0 }}>{pct}%</span>
      </div>

      {/* Two-column body — fixed height so the page never jumps */}
      <div style={{ display: 'flex', gap: '1rem', width: '100%', alignItems: 'flex-start' }}>

        {/* Left — question + options (scrollable) + decision (pinned bottom) */}
        <div className="frame-parchment" style={{
          flex: '1 1 0', minWidth: 0, padding: '1rem',
          height: '420px', display: 'flex', flexDirection: 'column', gap: 0,
        }}>
          {/* Scrollable upper section */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '2px' }}>
            <p style={{ fontFamily: FONT, fontSize: '0.9rem', letterSpacing: '3px', color: ACCENT, opacity: 0.5, margin: 0 }}>
              GROUP REVIEW — QUESTION {qIdx + 1}
            </p>
            <p style={{ fontFamily: FONT, fontSize: '1.05rem', color: TEXT, lineHeight: 1.6, margin: 0 }}>{q.text}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {q.options.map((opt, optIdx) => {
                const count     = voteCounts[optIdx] ?? 0
                const barPct    = (count / 4) * 100
                const isUserAns = optIdx === userAns
                const isNewPick = decision?.intent === 'change' && decision.newIdx === optIdx
                const highlight = isNewPick || (isUserAns && decision?.intent !== 'change')

                return (
                  <div key={optIdx}
                    onClick={picking && !decision ? () => afterDecide(q.id, { intent: 'change', newIdx: optIdx }) : undefined}
                    style={{
                      padding: '0.45rem 0.7rem', cursor: picking && !decision ? 'pointer' : 'default',
                      border: `1px solid ${highlight ? ACCENT : 'rgba(255,215,0,0.14)'}`,
                      background: highlight ? 'rgba(255,215,0,0.07)' : 'transparent',
                      transition: 'border-color 0.12s, background 0.12s',
                    }}
                    onMouseEnter={e => { if (picking && !decision) e.currentTarget.style.borderColor = 'rgba(255,215,0,0.55)' }}
                    onMouseLeave={e => { if (picking && !decision) e.currentTarget.style.borderColor = highlight ? ACCENT : 'rgba(255,215,0,0.14)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontFamily: FONT, fontSize: '1rem', color: highlight ? ACCENT : 'rgba(255,215,0,0.4)', minWidth: '14px' }}>
                        {OPT_LABELS[optIdx]}
                      </span>
                      <span style={{ fontFamily: FONT, fontSize: '1rem', color: highlight ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)', flex: 1, lineHeight: 1.4 }}>
                        {opt}
                      </span>
                      {isUserAns && !picking && (
                        <span style={{ fontFamily: FONT, fontSize: '0.85rem', letterSpacing: '1px', color: ACCENT, opacity: 0.7, flexShrink: 0 }}>
                          {decision?.intent === 'change' ? 'ORIGINAL' : 'YOUR ANSWER'}
                        </span>
                      )}
                      {isNewPick && <span style={{ fontFamily: FONT, fontSize: '0.85rem', letterSpacing: '1px', color: ACCENT, flexShrink: 0 }}>NEW CHOICE</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '4px' }}>
                      <div style={{ flex: 1, height: '4px', background: 'rgba(255,215,0,0.08)', borderRadius: '2px' }}>
                        <div style={{ width: `${barPct}%`, height: '100%', background: 'rgba(255,215,0,0.4)', borderRadius: '2px', transition: 'width 0.35s' }} />
                      </div>
                      <span style={{ fontFamily: FONT, fontSize: '0.8rem', color: ACCENT, opacity: count > 0 ? 0.7 : 0.25, minWidth: '28px', textAlign: 'right' }}>
                        {count}/4
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Decision area — pinned to bottom, fixed height */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', minHeight: '46px', flexShrink: 0 }}>
            {decision ? (
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: FONT, fontSize: '1rem', letterSpacing: '1px',
                border: `1px solid ${decision.intent === 'keep' ? 'rgba(100,220,100,0.4)' : ACCENT}`,
                background: decision.intent === 'keep' ? 'rgba(100,220,100,0.05)' : 'rgba(255,215,0,0.05)',
                color: decision.intent === 'keep' ? 'rgba(100,220,100,0.85)' : ACCENT,
              }}>
                {decision.intent === 'keep' ? '✓ ANSWER KEPT' : `↻ CHANGED TO ${decision.newIdx !== undefined ? OPT_LABELS[decision.newIdx] : '?'}`}
              </div>
            ) : picking ? (
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: FONT, fontSize: '1rem', letterSpacing: '1px',
                color: ACCENT, opacity: 0.65,
              }}>
                ↑ CLICK AN OPTION ABOVE TO SELECT YOUR NEW ANSWER
              </div>
            ) : (
              <>
                <button onClick={() => afterDecide(q.id, { intent: 'keep' })} style={{
                  flex: 1, fontFamily: FONT, fontSize: '1rem', letterSpacing: '1px', padding: '0.65rem',
                  cursor: 'pointer', background: 'rgba(100,220,100,0.07)',
                  border: '2px solid rgba(100,220,100,0.5)', color: 'rgba(100,220,100,0.85)',
                }}>✓ KEEP MY ANSWER</button>
                <button onClick={() => setPicking(true)} style={{
                  flex: 1, fontFamily: FONT, fontSize: '1rem', letterSpacing: '1px', padding: '0.65rem',
                  cursor: 'pointer', background: 'rgba(255,180,0,0.06)',
                  border: '2px solid rgba(255,180,0,0.5)', color: 'rgba(255,180,0,0.85)',
                }}>↻ CHANGE MY ANSWER</button>
              </>
            )}
          </div>
        </div>

        {/* Right — persistent group chat, same fixed height */}
        <div className="frame-parchment" style={{
          flex: '1 1 0', padding: '0.75rem',
          height: '420px', display: 'flex', flexDirection: 'column', gap: '0.5rem',
        }}>
          <p style={{ fontFamily: FONT, fontSize: '0.9rem', letterSpacing: '2px', opacity: 0.45, color: TEXT, margin: 0, flexShrink: 0 }}>GROUP DISCUSSION</p>
          <div ref={chatContainerRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.4rem', background: 'rgba(0,0,0,0.15)' }}>
            {chat.length === 0 && (
              <p style={{ fontFamily: FONT, fontSize: '1.05rem', opacity: 0.3, color: TEXT, margin: 'auto', textAlign: 'center' }}>
                Discuss with your group here.
              </p>
            )}
            {chat.map(msg => (
              <div key={msg.id}>
                <span style={{ fontFamily: FONT, fontSize: '0.95rem', fontWeight: 700, color: ACCENT }}>{msg.author} </span>
                <span style={{ fontFamily: FONT, fontSize: '0.9rem', opacity: 0.45, color: TEXT }}>{msg.time}</span>
                <div style={{ fontFamily: FONT, fontSize: '1.05rem', color: TEXT, lineHeight: 1.4 }}>{msg.body}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
            <input
              placeholder="Type a message..."
              onKeyDown={e => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  setChat(p => [...p, { id: Date.now(), author: userName, body: e.currentTarget.value.trim(), time: nowTime() }])
                  e.currentTarget.value = ''
                }
              }}
              style={{ flex: 1, fontFamily: FONT, fontSize: '0.95rem', padding: '0.35rem 0.6rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,215,0,0.2)', color: 'rgba(255,255,255,0.85)', outline: 'none' }}
            />
            <button
              className="btn-9slice"
              onClick={e => {
                const inp = (e.currentTarget.previousSibling as HTMLInputElement)
                if (inp.value.trim()) {
                  setChat(p => [...p, { id: Date.now(), author: userName, body: inp.value.trim(), time: nowTime() }])
                  inp.value = ''
                }
              }}
              style={{ fontSize: '0.9rem', padding: '4px 10px' }}
            >SEND</button>
          </div>
        </div>

      </div>
    </div>
    </>
  )
}

// ─── Phase IIIb: Cooperative Solution Synthesis ───────────────────────────────

// ─── Phase IIIb Intro Modal ───────────────────────────────────────────────────

const Phase3bIntroModal: React.FC<{
  isBotMode: boolean
  onRoleSelected: (r: Role) => void
}> = ({ isBotMode, onRoleSelected }) => {
  const [step, setStep] = useState<1 | 2>(1)
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
        className="frame-parchment"
        style={{ maxWidth: '520px', width: '100%', padding: '2rem', gap: '1.25rem' }}
      >
        {step === 1 ? (
          <>
            <p style={{ fontFamily: FONT, fontSize: '0.9rem', letterSpacing: '3px', color: ACCENT, opacity: 0.55, margin: 0 }}>PHASE IIIb · COOPERATIVE SOLUTION</p>
            <h2 style={{ fontFamily: FONT, fontSize: '1.7rem', color: ACCENT, margin: 0, letterSpacing: '2px' }}>BUILD THE BEST SOLUTION</h2>
            <p style={{ fontFamily: FONT, fontSize: '1.1rem', lineHeight: 1.65, color: TEXT, opacity: 0.85, margin: 0 }}>
              Your group has reviewed the content and completed the quiz together. Now you will collaborate to build the best possible solution to the real-life challenge.
            </p>
            <p style={{ fontFamily: FONT, fontSize: '1.1rem', lineHeight: 1.65, color: TEXT, opacity: 0.85, margin: 0 }}>
              Every member has already submitted their initial approach. Discuss, challenge each other's ideas, and help the Scribe craft the group's final answer.
            </p>
            <button className="btn-9slice" onClick={() => setStep(2)} style={{ alignSelf: 'center', fontSize: '1.2rem', letterSpacing: '2px', minWidth: '200px' }}>CONTINUE →</button>
          </>
        ) : isBotMode ? (
          <>
            <p style={{ fontFamily: FONT, fontSize: '0.9rem', letterSpacing: '3px', color: ACCENT, opacity: 0.55, margin: 0 }}>SELECT YOUR ROLE</p>
            <h2 style={{ fontFamily: FONT, fontSize: '1.5rem', color: ACCENT, margin: 0, letterSpacing: '2px' }}>CHOOSE YOUR ROLE FOR THIS SESSION</h2>
            <p style={{ fontFamily: FONT, fontSize: '1.05rem', lineHeight: 1.55, color: TEXT, opacity: 0.75, margin: 0 }}>
              The AI bots will fill the remaining three roles.
            </p>
            {ROLE_DEFS.map(({ role, label, desc, icon }) => (
              <button key={role} onClick={() => onRoleSelected(role)} style={{
                display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.9rem 1rem',
                textAlign: 'left', width: '100%', fontFamily: FONT, background: 'transparent',
                border: '1px solid rgba(255,215,0,0.25)', cursor: 'pointer',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,215,0,0.7)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,215,0,0.25)' }}
              >
                <span style={{ fontSize: '2rem', color: ACCENT, minWidth: '2.5rem', textAlign: 'center' }}>{icon}</span>
                <div>
                  <div style={{ fontSize: '1.1rem', color: ACCENT, letterSpacing: '2px' }}>{label}</div>
                  <div style={{ fontSize: '1rem', color: TEXT, opacity: 0.7, marginTop: '2px' }}>{desc}</div>
                </div>
              </button>
            ))}
          </>
        ) : (
          // Facilitated mode — role assigned by teacher (allocation from DB to be wired in future)
          <>
            <p style={{ fontFamily: FONT, fontSize: '0.9rem', letterSpacing: '3px', color: ACCENT, opacity: 0.55, margin: 0 }}>YOUR ROLE</p>
            <h2 style={{ fontFamily: FONT, fontSize: '1.5rem', color: ACCENT, margin: 0, letterSpacing: '2px' }}>ROLE ASSIGNED BY YOUR TEACHER</h2>
            <p style={{ fontFamily: FONT, fontSize: '1.1rem', lineHeight: 1.65, color: TEXT, opacity: 0.85, margin: 0 }}>
              Your teacher has assigned your role for this session. Please wait for further instructions from your group before proceeding.
            </p>
          </>
        )}
      </motion.div>
    </div>
  )
}

// ─── Phase IIIb Compact Role Panels ──────────────────────────────────────────

const LeaderCompact: React.FC<{
  onSend: (t: string) => void
  memberNames: string[]
  chat: ChatMessage[]
}> = ({ onSend, memberNames, chat }) => {
  const [started, setStarted] = useState(false)

  const startSession = () => {
    setStarted(true)
    onSend(
      '♚ [Leader] Starting the cooperative group chat. ' +
      'Everyone — please click your PARTICIPATION PULSE button to confirm you are ready. ' +
      'Timer — are you set up and ready to start timing?'
    )
  }

  // How many messages ago did this member last contribute? Infinity = never.
  const sinceLastMsg = (name: string): number => {
    for (let i = chat.length - 1; i >= 0; i--) {
      if (chat[i].author === name) return chat.length - 1 - i
    }
    return Infinity
  }

  const participationColor = (name: string): string => {
    const n = sinceLastMsg(name)
    if (n <= 2)           return 'rgba(100,220,100,0.75)'   // green  — recent
    if (n <= 5)           return 'rgba(255,200,0,0.8)'      // yellow — a few turns ago
    return                       'rgba(220,80,80,0.85)'     // red    — hasn't spoken in a while
  }

  const participationBg = (name: string): string => {
    const n = sinceLastMsg(name)
    if (n <= 2)  return 'rgba(100,220,100,0.06)'
    if (n <= 5)  return 'rgba(255,200,0,0.06)'
    return              'rgba(220,80,80,0.06)'
  }

  return (
    <div className="frame-parchment" style={{ height: '360px', padding: '1rem', gap: '0.75rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <p style={{ fontFamily: FONT, fontSize: '0.9rem', letterSpacing: '3px', color: ACCENT, opacity: 0.55, margin: 0, flexShrink: 0 }}>♚ LEADER</p>
      <p style={{ fontFamily: FONT, fontSize: '1rem', color: TEXT, opacity: 0.7, margin: 0, lineHeight: 1.5, flexShrink: 0 }}>
        Guide the discussion. Ensure every perspective is considered before the Scribe commits to the draft.
      </p>

      {!started ? (
        <button className="btn-9slice" onClick={startSession} style={{ fontSize: '1rem', letterSpacing: '2px', flexShrink: 0 }}>
          ♚ START COOPERATIVE GROUP CHAT
        </button>
      ) : (
        <div style={{ fontFamily: FONT, fontSize: '0.9rem', letterSpacing: '1px', color: 'rgba(100,220,100,0.75)', padding: '0.4rem 0.6rem', border: '1px solid rgba(100,220,100,0.25)', background: 'rgba(100,220,100,0.05)', flexShrink: 0 }}>
          ✓ Session started — waiting for readiness confirmations
        </div>
      )}

      <div style={{ flexShrink: 0 }}>
        <p style={{ fontFamily: FONT, fontSize: '0.85rem', letterSpacing: '2px', color: ACCENT, opacity: 0.55, margin: '0 0 0.4rem' }}>PROMPT A MEMBER</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {memberNames.map(name => {
            const col = participationColor(name)
            const bg  = participationBg(name)
            return (
              <button key={name} onClick={() => onSend(`${name}, give some input.`)} style={{
                fontFamily: FONT, fontSize: '1rem', padding: '3px 10px',
                background: bg, border: `1px solid ${col}`, color: col, cursor: 'pointer',
                transition: 'border-color 0.4s, color 0.4s, background 0.4s',
              }}>{name}</button>
            )
          })}
        </div>
        <p style={{ fontFamily: FONT, fontSize: '0.8rem', opacity: 0.4, color: TEXT, margin: '0.35rem 0 0', letterSpacing: '1px' }}>
          ■ green = recent &nbsp;■ yellow = a few turns ago &nbsp;■ red = hasn't spoken
        </p>
      </div>
      <PulseButton intervalSeconds={20} label="PARTICIPATION PULSE" onPulse={() => onSend('[Leader] Participation check — is everyone engaged with the draft?')} warning="Send your Participation Pulse!" />
    </div>
  )
}

const TimerCompact: React.FC<{ onSend: (t: string) => void }> = ({ onSend }) => {
  const [totalMins, setTotalMins] = useState('')
  const [timePerPhase, setTimePerPhase] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [running, setRunning] = useState(false)
  const [moveOnFired, setMoveOnFired] = useState(false)
  const divide = () => {
    const m = parseFloat(totalMins)
    if (isNaN(m) || m <= 0) return
    const perPhase = Math.floor((m * 60) / 3)
    setTimePerPhase(perPhase); setSecondsLeft(perPhase)
  }
  useEffect(() => {
    if (!running || secondsLeft <= 0) return
    const id = setInterval(() => setSecondsLeft(s => { if (s <= 1) { setRunning(false); return 0 } return s - 1 }), 1000)
    return () => clearInterval(id)
  }, [running, secondsLeft])
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  return (
    <div className="frame-parchment" style={{ height: '360px', padding: '1rem', gap: '0.75rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <p style={{ fontFamily: FONT, fontSize: '0.9rem', letterSpacing: '3px', color: ACCENT, opacity: 0.55, margin: 0, flexShrink: 0 }}>◷ TIMER</p>
      {timePerPhase !== null && (
        <div style={{ fontFamily: FONT, fontSize: '3.5rem', color: secondsLeft < 60 ? '#ff6666' : ACCENT, textAlign: 'center', letterSpacing: '4px', lineHeight: 1, flexShrink: 0 }}>
          {fmt(secondsLeft)}
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
        <input value={totalMins} onChange={e => setTotalMins(e.target.value)} placeholder="Total mins"
          style={{ flex: 1, fontFamily: FONT, fontSize: '1rem', padding: '0.4rem 0.6rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,215,0,0.25)', color: 'rgba(255,255,255,0.9)', outline: 'none' }} />
        <button className="btn-9slice" onClick={divide} style={{ fontSize: '1rem' }}>DIVIDE</button>
      </div>
      {timePerPhase !== null && (
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <button className="btn-9slice" onClick={() => setRunning(true)} style={{ flex: 1 }}>{running ? 'RUNNING...' : 'START'}</button>
          <button className="btn-9slice" onClick={() => { setSecondsLeft(timePerPhase!); setRunning(false) }} style={{ flex: 1 }}>RESET</button>
        </div>
      )}
      <PulseButton intervalSeconds={30} label="TIME STATUS" onPulse={() => onSend(`[Timer] Time Status — ${timePerPhase !== null ? fmt(secondsLeft) + ' remaining.' : 'Timer not started.'}`)} warning="Send Time Status!" />
      <button onClick={() => { setMoveOnFired(true); onSend('⚠ [TIMER ALERT] The group is stalling — time to MOVE ON!') }} style={{
        fontFamily: FONT, fontSize: '1rem', letterSpacing: '2px', padding: '0.5rem', flexShrink: 0,
        background: moveOnFired ? 'rgba(220,60,60,0.35)' : 'rgba(220,60,60,0.12)',
        border: '2px solid rgba(220,60,60,0.8)', color: '#ff8888', cursor: 'pointer',
      }}>⚠ MOVE ON</button>
    </div>
  )
}

const ScribeCompact: React.FC<{ onSend: (t: string) => void }> = ({ onSend }) => (
  <div className="frame-parchment" style={{ height: '360px', padding: '1rem', gap: '0.75rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
    <p style={{ fontFamily: FONT, fontSize: '0.9rem', letterSpacing: '3px', color: ACCENT, opacity: 0.55, margin: 0, flexShrink: 0 }}>✎ SCRIBE</p>
    <p style={{ fontFamily: FONT, fontSize: '1rem', color: TEXT, opacity: 0.7, margin: 0, lineHeight: 1.55, flexShrink: 0 }}>
      Your job is to capture the group's best thinking and build it into the final solution. Use the Solution Workspace below — add individual solutions to the draft, then refine the combined answer.
    </p>
    <p style={{ fontFamily: FONT, fontSize: '1rem', color: TEXT, opacity: 0.7, margin: 0, lineHeight: 1.55, flexShrink: 0 }}>
      Use the chat to discuss with your group before committing a direction.
    </p>
    <PulseButton intervalSeconds={30} label="SCRIBE CHECK-IN" onPulse={() => onSend("[Scribe] Checking in — does the current draft direction reflect everyone's thinking?")} warning="Check in with your group!" />
  </div>
)

const AngleCheckerCompact: React.FC<{ onSend: (t: string) => void }> = ({ onSend }) => {
  const [used, setUsed] = useState<Set<string>>(new Set())
  const BUTTONS = [
    { key: 'sure',    label: '"Are we sure about this?"',                   msg: "[Angle Checker] ◈ Are we sure about this? Let's verify before the Scribe commits." },
    { key: 'another', label: '"Is there another way of thinking about this?"', msg: '[Angle Checker] ◈ Is there another way of thinking about this? We may be missing an angle.' },
    { key: 'missing', label: '"Are we missing something?"',                  msg: '[Angle Checker] ◈ Are we missing something? Checking for blind spots in the draft.' },
  ]
  const use = (key: string, msg: string) => { setUsed(p => new Set([...p, key])); onSend(msg) }
  return (
    <div className="frame-parchment" style={{ height: '360px', padding: '1rem', gap: '0.75rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <p style={{ fontFamily: FONT, fontSize: '0.9rem', letterSpacing: '3px', color: ACCENT, opacity: 0.55, margin: 0, flexShrink: 0 }}>◈ ANGLE CHECKER</p>
      <p style={{ fontFamily: FONT, fontSize: '1rem', color: TEXT, opacity: 0.7, margin: 0, lineHeight: 1.5, flexShrink: 0 }}>
        Challenge assumptions and prevent groupthink. Use all three prompts at least once. ({used.size}/3 used)
      </p>
      {BUTTONS.map(({ key, label, msg }) => (
        <button key={key} onClick={() => use(key, msg)} style={{
          fontFamily: FONT, fontSize: '1rem', letterSpacing: '1px', padding: '0.65rem', textAlign: 'left', flexShrink: 0,
          background: used.has(key) ? 'rgba(255,215,0,0.1)' : 'transparent',
          border: `2px solid ${used.has(key) ? 'rgba(255,215,0,0.7)' : 'rgba(255,215,0,0.3)'}`,
          color: used.has(key) ? ACCENT : 'rgba(255,215,0,0.6)', cursor: 'pointer',
        }}>
          {used.has(key) ? '✓ ' : ''}{label}
        </button>
      ))}
      <PulseButton intervalSeconds={30} label="PERSPECTIVE PULSE" onPulse={() => onSend('[Angle Checker] ◈ Perspective Pulse — actively monitoring for logic gaps.')} warning="Send your Perspective Pulse!" />
    </div>
  )
}

// ─── Phase IIIb Scribe Draft Panel (full-width, below two columns) ────────────

const ScribeDraftPanel: React.FC<{
  userRole: Role
  scribeDraft: string
  setScribeDraft: (d: string) => void
  finalPhaseActive: boolean
  onTriggerFinal: (draft: string) => void
}> = ({ userRole, scribeDraft, setScribeDraft, finalPhaseActive, onTriggerFinal }) => {
  const isScribe = userRole === 'scribe'
  return (
    <div className="frame-parchment" style={{ padding: '1.25rem', gap: '0.75rem', maxWidth: 'none' }}>
      <p style={{ fontFamily: FONT, fontSize: '0.9rem', letterSpacing: '3px', color: ACCENT, opacity: 0.55, margin: 0 }}>
        ✎ GROUP DRAFT SOLUTION{isScribe ? ' · YOU ARE THE SCRIBE — BUILD THE FINAL ANSWER' : ' · SCRIBE IS BUILDING THE GROUP\'S FINAL ANSWER'}
      </p>
      {finalPhaseActive ? (
        <div style={{ fontFamily: FONT, fontSize: '1rem', color: TEXT, lineHeight: 1.7, whiteSpace: 'pre-wrap', padding: '1rem', background: 'rgba(255,215,0,0.04)', border: '1px solid rgba(255,215,0,0.25)' }}>
          {scribeDraft || '[No draft was submitted]'}
        </div>
      ) : isScribe ? (
        <textarea value={scribeDraft} onChange={e => setScribeDraft(e.target.value)}
          placeholder="Draft the group's final solution here. Use the ADD TO DRAFT buttons above to pull in individual solutions, then edit and refine..."
          rows={7}
          style={{ width: '100%', resize: 'vertical', fontFamily: FONT, fontSize: '1rem', padding: '0.75rem', lineHeight: 1.6, boxSizing: 'border-box', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,215,0,0.3)', color: 'rgba(255,255,255,0.9)', outline: 'none' }}
        />
      ) : (
        <div style={{ fontFamily: FONT, fontSize: '1rem', color: TEXT, lineHeight: 1.7, whiteSpace: 'pre-wrap', padding: '1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,215,0,0.12)', minHeight: '80px', opacity: scribeDraft ? 0.9 : 0.4 }}>
          {scribeDraft || '[Scribe is drafting the solution...]'}
        </div>
      )}
      {isScribe && !finalPhaseActive && (
        <button className="btn-9slice" onClick={() => onTriggerFinal(scribeDraft)} disabled={scribeDraft.trim().length < 20}
          style={{ alignSelf: 'center', fontSize: '1.1rem', letterSpacing: '2px', minWidth: '260px', opacity: scribeDraft.trim().length < 20 ? 0.4 : 1, cursor: scribeDraft.trim().length < 20 ? 'not-allowed' : 'pointer' }}>
          ▶ SUBMIT FINAL SOLUTION
        </button>
      )}
      {finalPhaseActive && (
        <div style={{ textAlign: 'center', fontFamily: FONT, fontSize: '1rem', letterSpacing: '2px', color: 'rgba(100,220,100,0.85)', padding: '0.5rem', border: '1px solid rgba(100,220,100,0.3)', background: 'rgba(100,220,100,0.05)' }}>
          ✓ FINAL SOLUTION SUBMITTED — GROUP IS REVIEWING
        </div>
      )}
    </div>
  )
}

// ─── Phase IIIb: Cooperative Solution Synthesis ───────────────────────────────

const Phase3b: React.FC<{
  metacogAnswers: MetacogState
  botMetacog: Record<BotRole, MetacogState>
  botTiers: Record<BotRole, BotTier>
  userName: string
  isBotMode: boolean
  chat: ChatMessage[]
  onUserSend: (text: string) => void
  addBotMsg: (author: string, body: string, isTeacher?: boolean) => void
  role: Role | null
  setRole: (r: Role) => void
  finalPhaseActive: boolean
  setFinalPhaseActive: (v: boolean) => void
  scribeDraft: string
  setScribeDraft: (d: string) => void
  onProceed: () => void
}> = ({ metacogAnswers, botMetacog, botTiers, userName, isBotMode, chat, onUserSend, addBotMsg,
        role, setRole, finalPhaseActive, setFinalPhaseActive, scribeDraft, setScribeDraft, onProceed }) => {
  const [msgCount, setMsgCount] = useState(0)
  const [chatInput, setChatInput] = useState('')
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const welcomeSent = useRef(false)

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chat])

  // Teacher welcome fires once, when role is first selected
  useEffect(() => {
    if (!isBotMode || !role || welcomeSent.current) return
    welcomeSent.current = true
    setTimeout(() => addBotMsg('Mr. Bot',
      "Welcome to the cooperative solution phase. Review everyone's initial approach, discuss as a group, and help the Scribe craft the final answer.",
      true,
    ), 600)
  }, [role]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = (text: string) => {
    onUserSend(text)
    if (!isBotMode || !role) return
    const ctx = { userName, userSolution: metacogAnswers.solution, userSteps: metacogAnswers.audit }
    const mc = msgCount
    setMsgCount(c => c + 1)
    const botRoles = (BOT_ROLE_ORDER as BotRole[]).filter(r => r !== (role as BotRole))
    const primary  = botRoles[mc % botRoles.length]
    const primName = BOT_NAMES[primary][botTiers[primary]]
    setTimeout(() => addBotMsg(primName, getBotP3bResponse(primary, botTiers[primary], primName, mc, ctx)), 1800)
    if (Math.random() < 0.45 && botRoles.length > 1) {
      const secondary = botRoles[(mc + 1) % botRoles.length]
      const secName   = BOT_NAMES[secondary][botTiers[secondary]]
      setTimeout(() => addBotMsg(secName, getBotP3bResponse(secondary, botTiers[secondary], secName, mc + 3, ctx)), 3600)
    }
  }

  const sendFromInput = () => {
    if (chatInput.trim()) { handleSend(chatInput.trim()); setChatInput('') }
  }

  // Build member list once (role is non-null here)
  const botRoles3b = (BOT_ROLE_ORDER as BotRole[]).filter(r => r !== (role as BotRole)).slice(0, 3)
  const members3b = [
    { name: userName, metacog: metacogAnswers, isUser: true },
    ...botRoles3b.map(r => ({ name: BOT_NAMES[r][botTiers[r]], metacog: botMetacog[r], isUser: false })),
  ]
  const addToDraft = (member: typeof members3b[0]) => {
    const block = `— ${member.name}${member.isUser ? ' (you)' : ''} —\n${member.metacog.solution}\n\nSteps:\n${member.metacog.audit}`
    setScribeDraft(scribeDraft ? `${scribeDraft}\n\n${block}` : block)
  }

  // Show intro modal until role is selected
  if (!role) return <Phase3bIntroModal isBotMode={isBotMode} onRoleSelected={r => setRole(r)} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>

      {/* ── 1. Two columns: role panel (left) | chat (right) ── */}
      <div style={{ display: 'flex', gap: '1rem', width: '100%', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 0' }}>
          {role === 'leader'        && <LeaderCompact onSend={handleSend} memberNames={members3b.filter(m => !m.isUser).map(m => m.name)} chat={chat} />}
          {role === 'timer'         && <TimerCompact        onSend={handleSend} />}
          {role === 'scribe'        && <ScribeCompact       onSend={handleSend} />}
          {role === 'angle-checker' && <AngleCheckerCompact onSend={handleSend} />}
        </div>
        <div className="frame-parchment" style={{ flex: '1 1 0', height: '360px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ fontFamily: FONT, fontSize: '0.9rem', letterSpacing: '2px', opacity: 0.45, color: TEXT, margin: 0, flexShrink: 0 }}>GROUP DISCUSSION</p>
          <div ref={chatContainerRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.4rem', background: 'rgba(0,0,0,0.15)' }}>
            {chat.length === 0 && (
              <p style={{ fontFamily: FONT, fontSize: '1.05rem', opacity: 0.3, color: TEXT, margin: 'auto', textAlign: 'center' }}>Discuss with your group here.</p>
            )}
            {chat.map(msg => (
              <div key={msg.id}>
                <span style={{ fontFamily: FONT, fontSize: '0.95rem', fontWeight: 700, color: msg.isTeacher ? '#88aaff' : ACCENT }}>{msg.author} </span>
                <span style={{ fontFamily: FONT, fontSize: '0.9rem', opacity: 0.45, color: TEXT }}>{msg.time}</span>
                <div style={{ fontFamily: FONT, fontSize: '1.05rem', color: TEXT, lineHeight: 1.4 }}>{msg.body}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendFromInput()}
              placeholder="Type a message..."
              style={{ flex: 1, fontFamily: FONT, fontSize: '0.95rem', padding: '0.35rem 0.6rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,215,0,0.2)', color: 'rgba(255,255,255,0.85)', outline: 'none' }}
            />
            <button className="btn-9slice" onClick={sendFromInput} style={{ fontSize: '0.9rem', padding: '4px 10px' }}>SEND</button>
          </div>
        </div>
      </div>

      {/* ── 2. Scribe draft — full width, scribe only ── */}
      {finalPhaseActive ? (
        <div className="frame-parchment" style={{ padding: '1.5rem', gap: '1rem', maxWidth: 'none' }}>
          <p style={{ fontFamily: FONT, fontSize: '1rem', letterSpacing: '3px', color: ACCENT, margin: 0 }}>
            ▶ FINAL SOLUTION — ALL MEMBERS REVIEWING
          </p>
          <div style={{ fontFamily: FONT, fontSize: '1.05rem', color: TEXT, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {scribeDraft || '[No draft was submitted]'}
          </div>
          <button className="btn-9slice" onClick={onProceed} style={{ alignSelf: 'center', fontSize: '1.2rem', letterSpacing: '2px', minWidth: '260px' }}>
            PROCEED TO RECALIBRATION →
          </button>
        </div>
      ) : (
        <ScribeDraftPanel
          userRole={role}
          scribeDraft={scribeDraft} setScribeDraft={setScribeDraft}
          finalPhaseActive={finalPhaseActive}
          onTriggerFinal={draft => { setScribeDraft(draft); setFinalPhaseActive(true) }}
        />
      )}

      {/* ── 3. Challenge — full width, scrollable ── */}
      <div className="frame-parchment" style={{ padding: '1.25rem', gap: '0.6rem', maxWidth: 'none', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <p style={{ fontFamily: FONT, fontSize: '0.9rem', letterSpacing: '3px', color: ACCENT, opacity: 0.55, margin: 0 }}>THE CHALLENGE</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontFamily: FONT, fontSize: '0.9rem', letterSpacing: '1px', color: ACCENT, opacity: 0.75 }}>
              {ROLE_DEFS.find(d => d.role === role)?.icon} {ROLE_DEFS.find(d => d.role === role)?.label}
            </span>
            <button onClick={() => setRole(null as unknown as Role)} style={{ fontFamily: FONT, fontSize: '0.9rem', padding: '2px 10px', background: 'transparent', border: '1px solid rgba(255,215,0,0.3)', color: 'rgba(255,215,0,0.55)', cursor: 'pointer' }}>
              CHANGE ROLE
            </button>
          </div>
        </div>
        <div style={{ height: '100px', overflowY: 'auto', paddingRight: '4px' }}>
          <p style={{ fontFamily: FONT, fontSize: '1rem', lineHeight: 1.75, color: TEXT, whiteSpace: 'pre-line', opacity: 0.9, margin: 0 }}>
            {CHALLENGE_SCENARIO}
          </p>
        </div>
      </div>

      {/* ── 4. Member solutions — full width, all 4 cards ── */}
      <div className="frame-parchment" style={{ padding: '1.25rem', gap: '1rem', maxWidth: 'none' }}>
        <p style={{ fontFamily: FONT, fontSize: '0.9rem', letterSpacing: '3px', color: ACCENT, opacity: 0.55, margin: 0 }}>
          MEMBER SOLUTIONS{role === 'scribe' && !finalPhaseActive ? ' · CLICK + ADD TO DRAFT TO INCLUDE A SOLUTION' : ''}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {members3b.map(member => (
            <div key={member.name} className="frame-parchment" style={{ flex: '1 1 180px', minWidth: '180px', padding: '0.85rem', gap: '0.6rem' }}>
              <p style={{ fontFamily: FONT, fontSize: '0.9rem', letterSpacing: '2px', color: member.isUser ? ACCENT : 'rgba(255,215,0,0.6)', margin: 0 }}>
                {member.name}{member.isUser ? ' · YOU' : ''}
              </p>
              <div>
                <span style={{ fontFamily: FONT, fontSize: '0.75rem', letterSpacing: '2px', color: ACCENT, opacity: 0.45 }}>SOLUTION</span>
                <p style={{ fontFamily: FONT, fontSize: '0.9rem', color: TEXT, opacity: 0.85, margin: '3px 0 0', lineHeight: 1.55 }}>
                  {member.metacog.solution}
                </p>
              </div>
              <div>
                <span style={{ fontFamily: FONT, fontSize: '0.75rem', letterSpacing: '2px', color: ACCENT, opacity: 0.45 }}>STEPS</span>
                <p style={{ fontFamily: FONT, fontSize: '0.9rem', color: TEXT, opacity: 0.85, margin: '3px 0 0', lineHeight: 1.55, whiteSpace: 'pre-line' }}>
                  {member.metacog.audit}
                </p>
              </div>
              {role === 'scribe' && !finalPhaseActive && (
                <button onClick={() => addToDraft(member)} style={{
                  fontFamily: FONT, fontSize: '0.9rem', letterSpacing: '1px', padding: '0.35rem 0.75rem', marginTop: '0.25rem',
                  background: 'rgba(255,215,0,0.07)', border: '1px solid rgba(255,215,0,0.4)', color: ACCENT, cursor: 'pointer',
                }}>+ ADD TO DRAFT</button>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

// ─── Phase III: Quiz Review (legacy — kept for reference, replaced by Phase3a) ─

const QuizReview: React.FC<{
  phase2Answers: Record<number, number>
  p3Intents: Record<number, 'keep' | 'change'>
  p3ChangedAnswers: Record<number, number>
  currentQuestion: number
  onIntent: (qId: number, intent: 'keep' | 'change') => void
  onChangeAnswer: (qId: number, origIdx: number) => void
  groupVotes?: { answerIdx: number }[]
}> = ({ phase2Answers, p3Intents, p3ChangedAnswers, currentQuestion, onIntent, onChangeAnswer, groupVotes = [] }) => {
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
        fontFamily: FONT, fontSize: '1.1rem', letterSpacing: '2px', padding: '0.6rem 1rem',
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
                <p style={{ fontFamily: FONT, fontSize: '1.2rem', opacity: 0.5, color: TEXT, margin: 0 }}>
                  No quiz answers found. Go through Phase II normally to review your answers here.
                </p>
              ) : notStarted ? (
                <p style={{ fontFamily: FONT, fontSize: '1.2rem', opacity: 0.5, color: TEXT, margin: 0, textAlign: 'center' }}>
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
                      <p style={{ fontFamily: FONT, fontSize: '1rem', letterSpacing: '2px', color: ACCENT, opacity: 0.6, margin: 0 }}>
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
                              <span style={{ fontFamily: FONT, fontSize: '1.1rem', color: highlight ? ACCENT : 'rgba(255,215,0,0.45)', flexShrink: 0, minWidth: '16px' }}>
                                {OPT_LABELS[optIdx]}
                              </span>
                              <span style={{ fontFamily: FONT, fontSize: '1.15rem', color: highlight ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)', flex: 1, lineHeight: 1.4 }}>
                                {opt}
                              </span>
                              {isOriginal && !isChanging && (
                                <span style={{ fontFamily: FONT, fontSize: '1.1rem', letterSpacing: '1px', color: ACCENT, flexShrink: 0, alignSelf: 'center' }}>YOUR ANSWER</span>
                              )}
                              {isOriginal && isChanging && (
                                <span style={{ fontFamily: FONT, fontSize: '1.1rem', letterSpacing: '1px', color: 'rgba(255,215,0,0.35)', flexShrink: 0, alignSelf: 'center' }}>ORIGINAL</span>
                              )}
                              {isNewPick && (
                                <span style={{ fontFamily: FONT, fontSize: '1.1rem', letterSpacing: '1px', color: ACCENT, flexShrink: 0, alignSelf: 'center' }}>NEW ANSWER</span>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Group vote distribution */}
                      {groupVotes.length > 0 && (
                        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <p style={{ fontFamily: FONT, fontSize: '0.9rem', letterSpacing: '3px', color: ACCENT, opacity: 0.55, margin: 0 }}>
                            GROUP VOTES
                          </p>
                          {q.options.map((_, optIdx) => {
                            const voters = groupVotes.filter(v => v.answerIdx === optIdx)
                            const pct = groupVotes.length ? (voters.length / groupVotes.length) * 100 : 0
                            return (
                              <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontFamily: FONT, fontSize: '1rem', color: ACCENT, opacity: 0.6, minWidth: '14px' }}>
                                  {OPT_LABELS[optIdx]}
                                </span>
                                <div style={{ flex: 1, height: '6px', background: 'rgba(255,215,0,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: 'rgba(255,215,0,0.55)', borderRadius: '3px', transition: 'width 0.3s' }} />
                                </div>
                                <span style={{ fontFamily: FONT, fontSize: '0.95rem', color: ACCENT, opacity: voters.length ? 0.9 : 0.3, minWidth: '32px', textAlign: 'right' }}>
                                  {voters.length}/{groupVotes.length}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
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
                          <span style={{ fontFamily: FONT, fontSize: '1.15rem', letterSpacing: '1px', color: 'rgba(100,220,100,0.85)', textAlign: 'center' }}>ANSWER KEPT</span>
                          <button onClick={() => onIntent(q.id, 'change')} style={{
                            fontFamily: FONT, fontSize: '1rem', padding: '3px 10px', cursor: 'pointer', marginTop: '0.25rem',
                            background: 'transparent', border: '1px solid rgba(255,215,0,0.3)', color: 'rgba(255,215,0,0.5)',
                          }}>CHANGE INSTEAD</button>
                        </div>
                      )}
                      {intent === 'change' && changedIdx === undefined && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                          border: '2px solid rgba(255,180,0,0.5)', background: 'rgba(255,180,0,0.06)', padding: '1rem' }}>
                          <span style={{ fontFamily: FONT, fontSize: '2rem', color: 'rgba(255,180,0,0.8)', lineHeight: 1 }}>↻</span>
                          <span style={{ fontFamily: FONT, fontSize: '1.1rem', letterSpacing: '1px', color: 'rgba(255,180,0,0.8)', textAlign: 'center', lineHeight: 1.4 }}>SELECT A NEW ANSWER FROM THE LIST</span>
                          <button onClick={() => { onIntent(q.id, 'keep'); onChangeAnswer(q.id, -1) }} style={{
                            fontFamily: FONT, fontSize: '1rem', padding: '3px 10px', cursor: 'pointer', marginTop: '0.25rem',
                            background: 'transparent', border: '1px solid rgba(255,215,0,0.3)', color: 'rgba(255,215,0,0.5)',
                          }}>REVERT</button>
                        </div>
                      )}
                      {intent === 'change' && changedIdx !== undefined && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                          border: `2px solid ${ACCENT}`, background: 'rgba(255,215,0,0.08)', padding: '1rem' }}>
                          <span style={{ fontFamily: FONT, fontSize: '2rem', color: ACCENT, lineHeight: 1 }}>↻</span>
                          <span style={{ fontFamily: FONT, fontSize: '1.15rem', letterSpacing: '1px', color: ACCENT, textAlign: 'center' }}>ANSWER CHANGED</span>
                          <button onClick={() => { onIntent(q.id, 'keep'); onChangeAnswer(q.id, -1) }} style={{
                            fontFamily: FONT, fontSize: '1rem', padding: '3px 10px', cursor: 'pointer', marginTop: '0.25rem',
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
      <p style={{ fontFamily: FONT, fontSize: '1rem', letterSpacing: '3px', color: ACCENT, margin: 0, opacity: 0.9 }}>
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
  onComplete: () => void
}> = ({ phase2Answers, onComplete }) => {
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
      <p style={{ fontFamily: FONT, fontSize: '1rem', letterSpacing: '3px', opacity: 0.6, color: TEXT, margin: 0 }}>
        PHASE IV · RECALIBRATION — Questions and options reshuffled. Your Phase III answers pre-loaded.
      </p>
      {!submitted ? (
        <>
          {shuffledOrder.map((qId, displayIdx) => {
            const q = QUIZ_QUESTIONS.find(x => x.id === qId)!
            const opts = shuffledOpts[qId]
            const p2OrigIdx = phase2Answers[qId]

            return (
              <div key={qId} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <p style={{ fontFamily: FONT, fontSize: '1rem', color: TEXT, margin: 0, lineHeight: 1.5 }}>
                  <span style={{ color: ACCENT }}>Q{displayIdx + 1}. </span>{q.text}
                </p>
                {opts.map((origIdx, displayOptIdx) => {
                  const isSelected = answers[qId] === origIdx
                  const isPreloaded = p2OrigIdx === origIdx && !isSelected
                  return (
                    <button key={origIdx} onClick={() => setAnswers(p => ({ ...p, [qId]: origIdx }))} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.55rem 0.75rem', textAlign: 'left',
                      fontFamily: FONT, fontSize: '1.2rem', lineHeight: 1.4,
                      background: isSelected ? 'rgba(255,215,0,0.15)' : isPreloaded ? 'rgba(255,215,0,0.05)' : 'transparent',
                      border: `1px solid ${isSelected ? 'rgba(255,215,0,0.7)' : isPreloaded ? 'rgba(255,215,0,0.3)' : 'rgba(255,215,0,0.15)'}`,
                      color: isSelected ? ACCENT : 'rgba(255,255,255,0.75)', cursor: 'pointer',
                    }}>
                      <span style={{ minWidth: '20px', color: ACCENT, fontWeight: 700 }}>{OPT_LABELS[displayOptIdx]}.</span>
                      {q.options[origIdx]}
                      {isPreloaded && <span style={{ marginLeft: 'auto', fontSize: '1rem', opacity: 0.5, color: ACCENT }}>← prev</span>}
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
          {!allAnswered && <p style={{ fontFamily: FONT, fontSize: '1.1rem', opacity: 0.5, color: TEXT, textAlign: 'center', margin: 0 }}>Answer all {QUIZ_QUESTIONS.length} questions to proceed.</p>}
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
      <p style={{ fontFamily: FONT, fontSize: '1rem', letterSpacing: '3px', opacity: 0.6, color: TEXT, margin: 0 }}>PHASE V · FINAL ARTIFACT SUBMISSION</p>
      <h2 style={{ fontFamily: FONT, fontSize: '1.8rem', color: ACCENT, margin: 0, letterSpacing: '2px' }}>INDIVIDUAL RESPONSE</h2>
      <p style={{ fontFamily: FONT, fontSize: '1rem', opacity: 0.8, color: TEXT, margin: 0, lineHeight: 1.5 }}>
        Submit your individual artifact addressing the original challenge using the strategy refined during the cooperative discussion.
      </p>

      {!submitted ? (
        <>
          <div>
            <p style={{ fontFamily: FONT, fontSize: '1rem', letterSpacing: '2px', opacity: 0.6, color: TEXT, margin: '0 0 0.5rem' }}>SUBMISSION TYPE</p>
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
                  <span style={{ fontSize: '1rem', opacity: 0.6 }}>.{t.ext}</span>
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
  const isDevMode = taskClassId === 'default'

  // Fetch real group assignment for this learner + class
  const { data: groupData, refetch: refetchGroup } = useQuery<{
    myTaskGroup: { id: string; conversationId: string; members: { learnerId: string; displayName: string; role: string }[] } | null
  }>(MY_TASK_GROUP, {
    variables: { academicClassId: taskClassId },
    skip: isDevMode,
    fetchPolicy: 'cache-and-network',
  })

  const realGroup = groupData?.myTaskGroup
  // Bot mode: dev mode, or no real group, or solo in group (bots fill the other seats)
  const isBotMode = isDevMode || !realGroup || realGroup.members.length <= 1
  const conversationId = !isBotMode ? (realGroup?.conversationId ?? null) : null

  const { data: groupMsgsData } = useQuery<{
    conversationMessages: { id: string; senderName: string; body: string; time: string }[]
  }>(GROUP_CHAT_MESSAGES, {
    variables: { conversationId },
    skip: !conversationId,
    pollInterval: 4000,
  })

  const [sendGroupMessage] = useMutation(SEND_GROUP_MESSAGE)
  const [joinSession] = useMutation(JOIN_ACTIVE_TASK_SESSION, {
    onCompleted: () => { refetchGroup() },
  })
  const joinAttempted = useRef(false)

  // Bot tiers + pre-seeded answers — both computed once on mount and held stable
  const [{ botTiers, botAnswers }] = useState(() => {
    const tiers = randomTiers()
    const answers = {} as Record<BotRole, Record<number, number>>
    for (const r of BOT_ROLE_ORDER as BotRole[]) {
      const acc = BOT_ACCURACY[r][tiers[r]]
      const qAnswers: Record<number, number> = {}
      for (const q of QUIZ_QUESTIONS) {
        const correctIdx = OPT_LABELS.indexOf(q.correct)
        if (Math.random() < acc) {
          qAnswers[q.id] = correctIdx
        } else {
          const wrongs = q.options.map((_, i) => i).filter(i => i !== correctIdx)
          qAnswers[q.id] = wrongs.length ? wrongs[Math.floor(Math.random() * wrongs.length)] : correctIdx
        }
      }
      answers[r] = qAnswers
    }
    return { botTiers: tiers, botAnswers: answers }
  })

  const [phase, setPhase]           = useState<Phase>(1)
  const [subPhase, setSubPhase]     = useState<'review' | 'cooperative'>('review')
  const { setTaskContext, setRole: setStoreRole, clearTaskContext } = useTaskContextStore()
  useEffect(() => { setTaskContext(phase) }, [phase])
  useEffect(() => { setStoreRole(role ?? '') }, [role])
  useEffect(() => () => clearTaskContext(), [])
  const [metacogAnswers, setMetacogAnswers] = useState<MetacogState | null>(null)

  // Stable bot metacog — seeded once, aligned with botTiers
  const [botMetacog] = useState<Record<BotRole, MetacogState>>(() =>
    Object.fromEntries(
      BOT_ROLE_ORDER.map(r => [r, BOT_METACOG[r as BotRole][randomTiers()[r as BotRole]]])
    ) as Record<BotRole, MetacogState>
  )

  const [phase2Answers, setPhase2Answers] = useState<Record<number, number>>({})
  const [role,  setRole]  = useState<Role | null>(null)
  const [chat,  setChat]  = useState<ChatMessage[]>([])
  const [finalPhaseActive,  setFinalPhaseActive]  = useState(false)
  const [scribeDraft,       setScribeDraft]       = useState('')

  const addBotMsg = useCallback((author: string, body: string, isTeacher?: boolean) => {
    setChat(p => [...p, { id: Date.now() + Math.random(), author, body, time: nowTime(), isTeacher }])
  }, [])


  const advancePhase = useCallback((next: Phase) => {
    setPhase(next)
  }, [])

  // Messages: DB conversation when in multi-learner mode, local chat otherwise
  const activeMessages: ChatMessage[] = conversationId && groupMsgsData
    ? groupMsgsData.conversationMessages.map((m, i) => ({
        id: i + 1,
        author: m.senderName,
        body: m.body,
        time: m.time ? new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      }))
    : chat

  const sendChat = useCallback(async (text: string) => {
    if (!isBotMode && conversationId) {
      await sendGroupMessage({ variables: { conversationId, body: text } })
    } else {
      setChat(prev => [...prev, {
        id: prev.length + 1,
        author: user?.displayName ?? 'Me',
        body: text,
        time: nowTime(),
      }])
    }
  }, [isBotMode, conversationId, sendGroupMessage, user])

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
              <Phase1 onComplete={(a) => { setMetacogAnswers(a); advancePhase(2) }} />
            </motion.div>
          )}

          {phase === 2 && (
            <motion.div key="p2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ width: '100%' }}>
              <Phase2 onComplete={(answers) => { setPhase2Answers(answers); advancePhase(3) }} />
            </motion.div>
          )}

          {phase === 3 && (
            <motion.div key="p3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ width: '100%' }}>
              {subPhase === 'review' ? (
                <Phase3a
                  phase2Answers={phase2Answers}
                  botAnswers={botAnswers}
                  botTiers={botTiers}
                  userName={user?.displayName ?? ''}
                  onComplete={(finalAnswers) => {
                    setPhase2Answers(finalAnswers)
                    setSubPhase('cooperative')
                  }}
                />
              ) : (
                <Phase3b
                  metacogAnswers={metacogAnswers ?? { problem: '', criteria: '', solution: '', audit: '' }}
                  botMetacog={botMetacog}
                  botTiers={botTiers}
                  userName={user?.displayName ?? ''}
                  isBotMode={isBotMode}
                  chat={activeMessages}
                  onUserSend={sendChat}
                  addBotMsg={addBotMsg}
                  role={role}
                  setRole={r => setRole(r)}
                  finalPhaseActive={finalPhaseActive}
                  setFinalPhaseActive={setFinalPhaseActive}
                  scribeDraft={scribeDraft}
                  setScribeDraft={setScribeDraft}
                  onProceed={() => { advancePhase(4); setRole(null); setFinalPhaseActive(false); setSubPhase('review') }}
                />
              )}
            </motion.div>
          )}

          {phase === 4 && (
            <motion.div key="p4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Phase4 phase2Answers={phase2Answers} onComplete={() => advancePhase(5)} />
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
            <span style={{ fontFamily: FONT, fontSize: '1rem', letterSpacing: '2px', color: 'rgba(255,100,0,0.5)' }}>
              DEV
            </span>
            <button
              onClick={() => {
                if (phase === 1) {
                  setMetacogAnswers({ problem: '[dev]', criteria: '[dev]', solution: '[dev] skip solution', audit: '[dev] skip steps' })
                  advancePhase(2)
                } else if (phase === 2) {
                  const rand: Record<number, number> = {}
                  QUIZ_QUESTIONS.forEach(q => { rand[q.id] = Math.floor(Math.random() * q.options.length) })
                  setPhase2Answers(rand)
                  advancePhase(3)
                } else if (phase === 3) {
                  setRole(null); setFinalPhaseActive(false); setSubPhase('review'); advancePhase(4)
                } else if (phase === 4) advancePhase(5)
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
