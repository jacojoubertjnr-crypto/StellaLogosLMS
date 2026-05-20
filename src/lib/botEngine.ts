export type BotRole = 'leader' | 'timer' | 'scribe' | 'angle-checker'
export type BotTier = 'smart' | 'stupid'

export const BOT_NAMES: Record<BotRole, { smart: string; stupid: string }> = {
  leader:          { smart: 'Aria',   stupid: 'Finn'  },
  timer:           { smart: 'Conrad', stupid: 'Ollie' },
  scribe:          { smart: 'Petra',  stupid: 'Mila'  },
  'angle-checker': { smart: 'Rex',    stupid: 'Bea'   },
}

export const ROLE_ORDER: BotRole[] = ['leader', 'timer', 'scribe', 'angle-checker']

export const BOT_ACCURACY: Record<BotRole, Record<BotTier, number>> = {
  leader:          { smart: 0.82, stupid: 0.33 },
  timer:           { smart: 0.78, stupid: 0.30 },
  scribe:          { smart: 0.80, stupid: 0.28 },
  'angle-checker': { smart: 0.85, stupid: 0.25 },
}

export function randomTiers(): Record<BotRole, BotTier> {
  return Object.fromEntries(
    ROLE_ORDER.map(r => [r, Math.random() > 0.5 ? 'smart' : 'stupid'])
  ) as Record<BotRole, BotTier>
}

export interface BotSessionConfig {
  userRole: BotRole
  realRoles: Set<BotRole>
  postMessage: (author: string, body: string, isTeacher?: boolean) => void
  advanceQuestion: () => void
  triggerFinalPhase: (draft: string) => void
  sessionDurationMs: number
  tiers: Record<BotRole, BotTier>
  getUserIntent: (qId: number) => 'keep' | 'change' | undefined  // reads live React state via ref
  getCurrentQuestion: () => number                                // reads live React state via ref
  leaderAdvanceRef?: { current: (() => void) | null }            // component calls this when user decides
  userName: string
}

export function startBotSession(cfg: BotSessionConfig): () => void {
  const tIds: ReturnType<typeof setTimeout>[] = []
  const iIds: ReturnType<typeof setInterval>[] = []
  const later = (fn: () => void, ms: number) => tIds.push(setTimeout(fn, ms))
  const every = (fn: () => void, ms: number) => iIds.push(setInterval(fn, ms))

  const { realRoles, postMessage, advanceQuestion, triggerFinalPhase, sessionDurationMs, tiers, getUserIntent, getCurrentQuestion, leaderAdvanceRef, userName } = cfg
  const start = Date.now()
  const remaining = () => Math.max(0, sessionDurationMs - (Date.now() - start))
  const remMin = () => Math.ceil(remaining() / 60000)

  // Teacher bot — always fires regardless of real roles
  postMessage('Mr. van der Berg',
    'Welcome to the cooperative discussion phase. Each role player — please ensure you are prepared. Leader, you may begin when the group is ready.',
    true,
  )

  // ── Leader ─────────────────────────────────────────────────────────────────
  if (!realRoles.has('leader')) {
    const tier = tiers.leader
    let qN = 0  // tracks advances for numbering; shared by all advance paths

    // Single advance function used by timer interval, interval fallback, AND user-triggered path
    const doAdvance = () => {
      qN++
      advanceQuestion()
      postMessage(
        tier === 'smart' ? 'Aria' : 'Finn',
        tier === 'smart' ? `Question ${qN} — any dissenting views?` : 'moving on',
      )
    }

    // Expose so LearningTaskUI can trigger an immediate advance when the user decides
    if (leaderAdvanceRef) leaderAdvanceRef.current = doAdvance

    const tryAdvanceSmart = () => {
      if (qN > 0 && getUserIntent(qN) === undefined) {
        postMessage('Aria', `${userName}, we need your Q${qN} decision before we can move on.`)
      } else if (qN > 0) {
        doAdvance()
      }
    }

    const tryAdvanceStupid = () => {
      if (qN > 0 && getUserIntent(qN) === undefined) {
        postMessage('Finn', `${userName}? still waiting on you`)
      } else if (qN > 0) {
        doAdvance()
      }
    }

    if (tier === 'smart') {
      later(() => postMessage('Aria', "Right, let's keep this tight. I'll walk us through each question — speak up if you disagree with the majority answer."), 30_000)
      // Guard: skip if user already triggered an advance before this timer fired
      later(() => {
        if (getCurrentQuestion() === 0) { qN = 1; advanceQuestion(); postMessage('Aria', 'Question 1 — does anyone have a different answer to the majority here?') }
      }, 60_000)
      every(tryAdvanceSmart, 90_000)
      every(() => postMessage('Aria', '[System] Leader pulse confirmed — Active.'), 20_000)
      later(() => postMessage('Aria', `@Scribe, have you captured the key point for Q${qN}?`), 65_000)
    } else {
      later(() => postMessage('Finn', "ok everyone ready? let's start"), 15_000)
      later(() => {
        if (getCurrentQuestion() === 0) { qN = 1; advanceQuestion(); postMessage('Finn', 'next one') }
      }, 45_000)
      every(tryAdvanceStupid, 45_000)
      later(() => postMessage('Finn', '[System] Leader pulse confirmed — Active.'), 80_000)
      later(() => postMessage('Finn', 'anyone? lol'), 120_000)
    }
  }

  // ── Timer ──────────────────────────────────────────────────────────────────
  if (!realRoles.has('timer')) {
    const tier = tiers.timer

    if (tier === 'smart') {
      postMessage('Conrad', '[Timer] Time Status — Full session started.')
      later(() => postMessage('Conrad', "Timer here. I'll divide the session evenly and keep you posted."), 20_000)
      later(() => postMessage('Conrad', 'Halfway through — good progress so far.'), sessionDurationMs * 0.5)
      later(() => postMessage('Conrad', '⚠ 25% time remaining — Scribe, please start drafting the final answer.'), sessionDurationMs * 0.75)
      later(() => postMessage('Conrad', '⚠ [TIMER ALERT] The group is stalling — time to MOVE ON!'), sessionDurationMs * 0.9)
      every(() => postMessage('Conrad', `[Timer] Time Status — ${remMin()} min remaining.`), 30_000)
    } else {
      later(() => postMessage('Ollie', "oh right, I'm the timer... let me start that now"), 45_000)
      later(() => postMessage('Ollie', 'wait are we halfway? I think so'), sessionDurationMs * 0.6)
      later(() => postMessage('Ollie', "wait how much time do we have left? I think it's running out"), sessionDurationMs * 0.85)
      later(() => postMessage('Ollie', '⚠ [TIMER ALERT] The group is stalling — time to MOVE ON!'), sessionDurationMs * 0.95)
      later(() => postMessage('Ollie', `[Timer] Time Status — ${remMin()} min remaining.`), 60_000)
      later(() => postMessage('Ollie', `[Timer] Time Status — ${remMin()} min remaining.`), 150_000)
    }
  }

  // ── Scribe ─────────────────────────────────────────────────────────────────
  if (!realRoles.has('scribe')) {
    const tier = tiers.scribe

    if (tier === 'smart') {
      later(() => postMessage('Petra', "Scribe ready. I'll capture key points as we go and draft the final solution."), 25_000)
      later(() => postMessage('Petra', '✎ Capturing: Group identifies core constraints and the primary challenge.'), 120_000)
      later(() => postMessage('Petra', '✎ Capturing: Majority favours a structured approach with verification steps.'), 240_000)
      later(() => postMessage('Petra', '✎ Capturing: Alternative perspective noted — Angle Checker raised a valid counterpoint.'), 360_000)
      later(() => postMessage('Petra', '✎ Capturing: Emerging consensus on primary methodology.'), 480_000)
      later(() => postMessage('Petra', "My draft is shaping up — I'll trigger the Final Solution on the Leader's signal."), sessionDurationMs * 0.7)
      later(() => {
        const draft = 'Based on our discussion: The group identified the core problem, evaluated all resources, and reached consensus on the optimal solution. Key dissenting views have been addressed.'
        triggerFinalPhase(draft)
        postMessage('Petra', '✎ Final Solution drafted — please review and confirm.')
      }, Math.min(sessionDurationMs * 0.9, 1_620_000)) // after ~q18 or 90% elapsed
    } else {
      later(() => postMessage('Mila', "I'll try to keep notes"), 60_000)
      later(() => postMessage('Mila', '✎ Capturing: ok'), 270_000)
      later(() => postMessage('Mila', '✎ Adding: yeah I agree'), 810_000)
      later(() => postMessage('Mila', '✎ noted: I think so'), 1_350_000)
      later(() => {
        const draft = "here's what I have: Q1 - the main issue, Q2 - resources, Q3 - not sure (sorry if incomplete)"
        triggerFinalPhase(draft)
        postMessage('Mila', "here's my final notes, sorry if they're a bit incomplete")
      }, sessionDurationMs * 0.95)
    }
  }

  // ── Angle Checker ──────────────────────────────────────────────────────────
  if (!realRoles.has('angle-checker')) {
    const tier = tiers['angle-checker']
    const agreements = ["yeah I agree with you all", "same answer as everyone else!", "makes sense to me"]
    let agIdx = 0

    if (tier === 'smart') {
      later(() => postMessage('Rex', "Angle Checker in position. I'll flag it if I think we're all agreeing too fast."), 35_000)
      later(() => postMessage('Rex', "Hold on — Q3: I answered differently. The scenario specifies a time constraint which changes the interpretation."), 270_000)
      later(() => postMessage('Rex', "Hold on — Q7: My answer differs from the majority. Have we considered the full context?"), 630_000)
      later(() => postMessage('Rex', "Hold on — Q12: I see this differently. The wording implies a nested condition we might be overlooking."), 1_080_000)
      later(() => postMessage('Rex', "Hold on — Q17: Before we move on — are we sure? I got a different answer here."), 1_530_000)
      later(() => postMessage('Rex', '◈ ALTERNATIVE PERSPECTIVE: Have we considered the opposite conclusion?'), 60_000)
      later(() => postMessage('Rex', "◈ DEVIL'S ADVOCATE: If we're wrong, what would that look like?"), 120_000)
      later(() => postMessage('Rex', "◈ BLIND SPOT CHECK: What are we assuming that we haven't verified?"), 180_000)
      every(() => postMessage('Rex', '[Angle Checker] ◈ Perspective Pulse — actively monitoring for logic gaps.'), 30_000)
    } else {
      later(() => postMessage('Bea', "angle checker here, all looks good to me!"), 90_000)
      later(() => postMessage('Bea', "◈ hmm I guess I should check... nope, we're all good."), 180_000)
      later(() => postMessage('Bea', '[Angle Checker] ◈ Perspective Pulse — actively monitoring for logic gaps.'), 90_000)
      every(() => { postMessage('Bea', agreements[agIdx % agreements.length]); agIdx++ }, 90_000)
    }
  }

  return () => {
    tIds.forEach(clearTimeout)
    iIds.forEach(clearInterval)
  }
}
