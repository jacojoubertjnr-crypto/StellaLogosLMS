export type BotRole = 'leader' | 'timer' | 'scribe' | 'angle-checker'
export type BotTier = 'smart' | 'stupid'

export const BOT_NAMES: Record<BotRole, { smart: string; stupid: string }> = {
  leader:          { smart: 'AriaBOT',    stupid: 'FinnBOT'   },
  timer:           { smart: 'ConradBOT',  stupid: 'OllieBOT'  },
  scribe:          { smart: 'PetraBOT',   stupid: 'MilaBOT'   },
  'angle-checker': { smart: 'RexBOT',     stupid: 'BeaBOT'    },
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

// Simulates how long a 16-year-old would take to type `text`.
// Smart bots type a little faster; stupid bots a little slower.
// Includes think time (reading the conversation before starting to type).
export function typingDelay(text: string, tier: BotTier): number {
  const thinkMs   = tier === 'smart' ? 700  : 1400   // reading + forming a response
  const msPerChar = tier === 'smart' ? 42   : 68     // ~60 WPM smart / ~37 WPM stupid
  const maxMs     = tier === 'smart' ? 7000 : 11000  // cap so nothing waits forever
  return Math.min(thinkMs + text.length * msPerChar, maxMs)
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
  getSilentParticipants?: () => string[]                          // returns names of participants who haven't spoken yet
  getChat?: () => { id: number; author: string; body: string }[] // live chat snapshot for scribe bot
  captureNote?: (category: 'suggestion' | 'steps' | 'questions', author: string, body: string) => void
  // When provided, conversational bot messages are generated via AI instead of using scripted text.
  // The function should return a non-empty string or throw/return '' to fall back to the scripted fallback.
  generateMessage?: (botName: string, botRole: BotRole, context: string, fallback: string) => Promise<string>
}

export function startBotSession(cfg: BotSessionConfig): () => void {
  const tIds: ReturnType<typeof setTimeout>[] = []
  const iIds: ReturnType<typeof setInterval>[] = []
  // async-safe: fires the async fn and ignores the returned promise (cleanup still works via IDs)
  const later = (fn: () => void | Promise<void>, ms: number) => tIds.push(setTimeout(() => { void Promise.resolve(fn()) }, ms))
  const every = (fn: () => void | Promise<void>, ms: number) => iIds.push(setInterval(() => { void Promise.resolve(fn()) }, ms))

  const { realRoles, postMessage, advanceQuestion, triggerFinalPhase, sessionDurationMs, tiers, getUserIntent, getCurrentQuestion, leaderAdvanceRef, userName, getSilentParticipants, getChat, captureNote, generateMessage } = cfg

  // say: generates message via AI when available (falling back to scripted), then waits
  // the realistic typing delay before posting — accounting for time the API call already used.
  const say = async (botName: string, role: BotRole, context: string, fallback: string) => {
    let text = fallback
    let elapsed = 0
    if (generateMessage) {
      const t0 = Date.now()
      try {
        const generated = await generateMessage(botName, role, context, fallback)
        if (generated) text = generated
      } catch { /* keep fallback */ }
      elapsed = Date.now() - t0
    }
    const remaining = Math.max(0, typingDelay(text, tiers[role]) - elapsed)
    await new Promise<void>(r => setTimeout(r, remaining))
    postMessage(botName, text)
  }
  const start = Date.now()
  const remaining = () => Math.max(0, sessionDurationMs - (Date.now() - start))
  const remMin = () => Math.ceil(remaining() / 60000)

  // ── Leader ─────────────────────────────────────────────────────────────────
  if (!realRoles.has('leader')) {
    const tier = tiers.leader
    let qN = 0  // tracks advances for numbering; shared by all advance paths

    // Single advance function used by timer interval, interval fallback, AND user-triggered path
    const doAdvance = async () => {
      qN++
      advanceQuestion()
      await say(
        tier === 'smart' ? 'AriaBOT' : 'FinnBOT',
        'leader',
        `Advance to question ${qN} — one short prompt`,
        tier === 'smart' ? `Q${qN} — any different answers?` : 'next',
      )
    }

    // Expose so LearningTaskUI can trigger an immediate advance when the user decides
    if (leaderAdvanceRef) leaderAdvanceRef.current = () => { void doAdvance() }

    const tryAdvanceSmart = async () => {
      if (qN > 0 && getUserIntent(qN) === undefined) {
        await say('AriaBOT', 'leader',
          `${userName} hasn't submitted Q${qN} keep/change — short reminder`,
          `${userName}, Q${qN} decision?`)
      } else if (qN > 0) {
        await doAdvance()
      }
    }

    const tryAdvanceStupid = async () => {
      if (qN > 0 && getUserIntent(qN) === undefined) {
        await say('FinnBOT', 'leader',
          `${userName} hasn't decided on Q${qN} — casual nudge`,
          `${userName}? still waiting`)
      } else if (qN > 0) {
        await doAdvance()
      }
    }

    if (tier === 'smart') {
      later(() => say('AriaBOT', 'leader',
        'Open session as Participation Checker — one short sentence',
        "Let's go. Speak up if you disagree with anyone."), 60_000)
      // Guard: skip if user already triggered an advance before this timer fired
      later(async () => {
        if (getCurrentQuestion() === 0) {
          qN = 1; advanceQuestion()
          await say('AriaBOT', 'leader',
            'Kick off Q1 — short',
            'Q1 — any different answers?')
        }
      }, 120_000)
      every(tryAdvanceSmart, 150_000)
      every(() => postMessage('AriaBOT', '[Participation Checker] active'), 120_000)
      later(() => say('AriaBOT', 'leader',
        'Check in with scribe — very short',
        `@Scribe, Q${qN} captured?`), 130_000)
      // Proactively ping silent participants every 2 min
      every(async () => {
        const silent = getSilentParticipants?.() ?? []
        if (silent.length > 0) {
          const target = silent[0]
          await say('AriaBOT', 'leader',
            `${target} is silent — call them out in one short sentence`,
            `${target} — haven't heard from you.`)
        }
      }, 120_000)
    } else {
      later(() => say('FinnBOT', 'leader',
        'Start the session casually — very short',
        "ok let's start"), 45_000)
      later(async () => {
        if (getCurrentQuestion() === 0) {
          qN = 1; advanceQuestion()
          await say('FinnBOT', 'leader',
            'Move to Q1 casually',
            'ok Q1')
        }
      }, 90_000)
      every(tryAdvanceStupid, 90_000)
      later(() => postMessage('FinnBOT', '[Participation Checker] active'), 150_000)
      later(() => say('FinnBOT', 'leader',
        'Check if anyone is still there — casual short phrase',
        'anyone here?'), 210_000)
      // Proactively ping silent participants (less reliably)
      every(async () => {
        const silent = getSilentParticipants?.() ?? []
        if (silent.length > 0) {
          const target = silent[0]
          await say('FinnBOT', 'leader',
            `${target} is quiet — awkward short nudge`,
            `${target}? you good?`)
        }
      }, 150_000)
    }
  }

  // ── Timer ──────────────────────────────────────────────────────────────────
  if (!realRoles.has('timer')) {
    const tier = tiers.timer

    if (tier === 'smart') {
      later(() => postMessage('ConradBOT', '[Timer] active'), 5_000)
      later(() => say('ConradBOT', 'timer',
        'Introduce yourself as timer — one short sentence',
        "Timer here. I'll keep you posted."), 45_000)
      later(() => say('ConradBOT', 'timer',
        'Halfway mark — very brief',
        'Halfway through.'), sessionDurationMs * 0.5)
      later(() => say('ConradBOT', 'timer',
        '25% left — ask scribe to draft — short',
        '⚠ 25% left. Scribe, start the draft.'), sessionDurationMs * 0.75)
      later(() => say('ConradBOT', 'timer',
        'Urgent move-on — very short',
        '⚠ MOVE ON.'), sessionDurationMs * 0.9)
      every(() => postMessage('ConradBOT', `[Timer] ${remMin()} min left.`), 120_000)
    } else {
      later(() => say('OllieBOT', 'timer',
        'Realise you forgot to start timing — short and casual',
        "oh wait, I'm the timer lol"), 90_000)
      later(() => say('OllieBOT', 'timer',
        'Vague halfway guess — short and unsure',
        'are we halfway maybe?'), sessionDurationMs * 0.6)
      later(() => say('OllieBOT', 'timer',
        'Panic about time — short',
        'wait how much time is left??'), sessionDurationMs * 0.85)
      later(() => say('OllieBOT', 'timer',
        'Late move-on alert — short',
        '⚠ MOVE ON'), sessionDurationMs * 0.95)
      later(() => postMessage('OllieBOT', `[Timer] ${remMin()} min left.`), 120_000)
      later(() => postMessage('OllieBOT', `[Timer] ${remMin()} min left.`), 300_000)
    }
  }

  // ── Scribe ─────────────────────────────────────────────────────────────────
  if (!realRoles.has('scribe')) {
    const tier = tiers.scribe
    // Only capture messages from non-bot, non-system senders with real content
    const isCaptureable = (m: { author: string; body: string }) =>
      !m.author.endsWith('BOT') && m.author !== 'Mr. Bot' && !m.body.startsWith('[') && m.body.length > 15

    if (tier === 'smart') {
      later(() => say('PetraBOT', 'scribe',
        'Introduce yourself as scribe — one short sentence',
        "Scribe ready. Capturing key points."), 50_000)

      const capturedIds = new Set<number>()
      const smartCats: ('suggestion' | 'steps' | 'questions')[] = ['suggestion', 'steps', 'questions']
      let catIdx = 0

      // Every 3 min: capture the most recent uncaptured human message
      every(() => {
        const msgs = getChat?.() ?? []
        const candidates = msgs.filter(m => isCaptureable(m) && !capturedIds.has(m.id))
        if (candidates.length === 0) return
        const target = candidates[candidates.length - 1]
        capturedIds.add(target.id)
        const category = smartCats[catIdx % smartCats.length]
        catIdx++
        captureNote?.(category, target.author, target.body)
        const excerpt = target.body.length > 45 ? target.body.slice(0, 45) + '…' : target.body
        postMessage('PetraBOT', `✎ Captured [${category}] from ${target.author}: "${excerpt}"`)
      }, 180_000)

      later(() => say('PetraBOT', 'scribe',
        'Signal draft is ready — short',
        "Draft coming together."), sessionDurationMs * 0.7)
      later(() => {
        const draft = 'Based on our discussion: The group identified the core problem, evaluated all resources, and reached consensus on the optimal solution. Key dissenting views have been addressed.'
        triggerFinalPhase(draft)
        postMessage('PetraBOT', '✎ Final draft ready — please review.')
      }, Math.min(sessionDurationMs * 0.9, 1_620_000)) // after ~q18 or 90% elapsed
    } else {
      later(() => say('MilaBOT', 'scribe',
        'Hesitantly offer to take notes — short',
        "I'll try to take notes"), 120_000)

      const capturedIds = new Set<number>()

      // Every 5 min: capture a random uncaptured human message, always as 'suggestion'
      every(() => {
        const msgs = getChat?.() ?? []
        const candidates = msgs.filter(m => isCaptureable(m) && !capturedIds.has(m.id))
        if (candidates.length === 0) return
        const target = candidates[Math.floor(Math.random() * candidates.length)]
        capturedIds.add(target.id)
        captureNote?.('suggestion', target.author, target.body)
        postMessage('MilaBOT', '✎ noted')
      }, 300_000)

      later(async () => {
        const draft = "here's what I have: Q1 - the main issue, Q2 - resources, Q3 - not sure (sorry if incomplete)"
        triggerFinalPhase(draft)
        await say('MilaBOT', 'scribe',
          'Submit incomplete final notes — apologetic and short',
          "here's my notes, sorry if incomplete")
      }, sessionDurationMs * 0.95)
    }
  }

  // ── Discussion Checker ─────────────────────────────────────────────────────
  if (!realRoles.has('angle-checker')) {
    const tier = tiers['angle-checker']
    const agreements = ["yeah same", "agree", "makes sense"]
    let agIdx = 0

    if (tier === 'smart') {
      later(() => say('RexBOT', 'angle-checker',
        "Announce Discussion Checker role — one short sentence",
        "Discussion Checker in. Watching for solution, steps, and quality check."), 70_000)
      // NOTE: fallback strings must contain the gate substrings checked in LearningTaskUI dcVectorsComplete
      later(() => say('RexBOT', 'angle-checker',
        'Redirect group to commit to a concrete solution — short',
        "💬 Discussion Checker: We need to talk about the solution first."), 360_000)
      later(() => say('RexBOT', 'angle-checker',
        'Redirect group to map execution steps — short',
        "💬 Discussion Checker: We need to talk about the steps."), 780_000)
      later(() => say('RexBOT', 'angle-checker',
        'Push group to evaluate solution quality — short; must contain "we will know if this solution is the best"',
        "💬 Discussion Checker: We need to talk about how we will know if this solution is the best."), 1_260_000)
      later(() => say('RexBOT', 'angle-checker',
        'Check all three vectors covered — short',
        "Solution, steps, quality check — all covered?"), 1_680_000)
      every(() => postMessage('RexBOT', '[Discussion Checker] active'), 120_000)
    } else {
      later(() => say('BeaBOT', 'angle-checker',
        'Check in as Discussion Checker but agree with everything — short',
        "discussion checker here — all good!"), 150_000)
      later(() => say('BeaBOT', 'angle-checker',
        'Half-hearted check, conclude nothing wrong — short',
        "checked... we're good I think"), 300_000)
      later(() => postMessage('BeaBOT', '[Discussion Checker] active'), 180_000)
      every(async () => {
        const msg = agreements[agIdx % agreements.length]
        agIdx++
        await say('BeaBOT', 'angle-checker',
          'Agree with the group again — one word or very short phrase',
          msg)
      }, 180_000)
    }
  }

  return () => {
    tIds.forEach(clearTimeout)
    iIds.forEach(clearInterval)
  }
}
