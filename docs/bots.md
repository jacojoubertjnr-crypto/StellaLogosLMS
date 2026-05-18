# Stella Logos — Bot System Design

> **Status:** Design phase. No code written yet.
> **Scope:** Three independent systems — Register Class, Phase III Cooperative Discussion, and Teacher Help.
> All bot logic is frontend-only. No DB reads/writes. Bots reset on every session entry.

---

## Overview

Three bot systems serve different moments in the learner journey:

| System | Where | Purpose |
|---|---|---|
| **Register Class Bots** | `AttendenceUI` — Class Chat | Simulate a live register class so the chat never feels empty |
| **Phase III Bots** | `LearningTaskUI` — Cooperative Discussion | Give solo users a full group experience |
| **Teacher Bot** | Every chat surface + help trigger | Monitors inactivity; provides context-aware help on demand |

---

## Core Principles

- **No persistence.** All bot state resets on every page mount.
- **Always positive.** Bots support the user, never frustrate or obstruct. Even "stupid" tier bots eventually do their job.
- **Teacher bot is independent.** It fires on its own timers regardless of what the other bots do.
- **Help is context-aware.** When the user types `help me` or `help`, the teacher bot detects the current route and phase and responds with targeted guidance.
- **Natural pacing.** Register bots use realistic morning rhythms. Phase III bots follow the pedagogical flow.

---

## Bot Roster — Master List

### Register Class Learner Bots

| Name | Personality | Role in chat |
|---|---|---|
| Thabo Dlamini | Enthusiastic, social, first to greet | Icebreaker; asks about homework |
| Keisha Naidoo | Organised, detail-focused, friendly | Reminds about deadlines; helpful |
| Daan van Zyl | Laid-back, dry humour, often late | Comic relief; light complaints about early mornings |
| Nomsa Sithole | Quiet, observant, insightful | Posts sparingly but meaningfully |

### Phase III Cooperative Discussion Bots

| # | Name | Role | Tier | Quiz Accuracy | Personality |
|---|---|---|---|---|---|
| 1 | Aria | Leader | Smart | 82% | Decisive, organised, keeps discussion on track |
| 2 | Finn | Leader | Stupid | 33% | Well-meaning but uncertain, advances questions too fast |
| 3 | Conrad | Timer | Smart | 78% | Punctual, clear alerts, good pace management |
| 4 | Ollie | Timer | Stupid | 30% | Forgetful, late warnings, misses pulses |
| 5 | Petra | Scribe | Smart | 80% | Accurate captures, clear draft, triggers Final Solution well |
| 6 | Mila | Scribe | Stupid | 28% | Disorganised, captures wrong things, slow to finalise |
| 7 | Rex | Angle Checker | Smart | 85% | Genuine contrarian, raises real alternative perspectives |
| 8 | Bea | Angle Checker | Stupid | 25% | Superficial, agrees with group, trivial challenges |

### Teacher Bot

| Name | Appears in | Function |
|---|---|---|
| Mr. van der Berg | Register chat + TeacherChatBar + Phase III | Inactivity monitor; help responder; morning register greeter |

---

---

# PART 1 — REGISTER CLASS BOT SYSTEM

---

## Trigger

Register Class bots activate when the learner opens `AttendenceUI` (`/attendence`). All timings are
relative to page mount (`t+` = seconds after mount). The teacher bot posts first; learner bots follow.

---

## Register Class — Teacher Bot Script (Mr. van der Berg)

These messages appear in the **Class Chat** section of `AttendenceUI`.

| t+ | Trigger | Message |
|---|---|---|
| 5 s | Page mount | "Good morning, class. Please check in using the check-in button at the top when you're ready. Have a great day." |
| 90 s | Page mount | "A reminder: check the assessment column in your timetable for any tasks that are due today or this week." |
| User not checked in after 3 min | Inactivity | "I notice you haven't checked in yet, [displayName]. Please tap the check-in button at the top of the page." |
| User types "help me" / "help" | Help trigger | *See Part 3 — Teacher Bot Help System* |
| 5 min | Near end of register | "We'll be moving to lessons shortly. Make sure you know which period you're in and have everything you need." |

---

## Register Class — Learner Bot Scripts

### Thabo Dlamini

| t+ | Trigger | Message |
|---|---|---|
| 12 s | Page mount | "Morning everyone 👋" |
| 35 s | After teacher greeting | "Morning sir! Ready for another day" |
| 2 min | General chat | "anyone finish the IT assignment? I was up late trying to sort out my algorithm" |
| 4 min | General | "at least it's Friday... wait, it's not is it 😩" |
| User posts anything | Response | "yeah same honestly" / "lol true" / "did you check the due date for that?" *(rotates randomly)* |

---

### Keisha Naidoo

| t+ | Trigger | Message |
|---|---|---|
| 25 s | Page mount | "Morning! Don't forget to check in 😊" |
| 1 min 10 s | After Thabo | "Thabo I finished it last night — the trick is to trace through the loop step by step before you code it" |
| 2 min 30 s | General | "Also check the timetable — there's an assessment column that shows what's due. Tap the row for details." |
| 3 min 30 s | General | "Sir already posted an announcement about today's lesson. Make sure you check the ticker at the top." |
| User posts anything | Response | "good idea" / "same — it really helped me too" / "definitely check that" *(rotates)* |

---

### Daan van Zyl

| t+ | Trigger | Message |
|---|---|---|
| 50 s | Page mount | "morning... I think. barely awake" |
| 1 min 40 s | After Keisha IT tip | "trace through the loop 💀 I just vibed with it and hoped for the best" |
| 3 min | General | "why does register have to be first thing. give us 10 minutes to become human first" |
| 4 min 30 s | General | "ok actually checking my timetable now. oh great, double period. excellent." |
| User posts anything | Response | "mood" / "yeah that's fair" / "honestly same" *(rotates)* |

---

### Nomsa Sithole

| t+ | Trigger | Message |
|---|---|---|
| 1 min 30 s | Page mount | "Morning. Checked in." |
| 2 min 50 s | After Daan | "The loop made sense once I drew it out. Flow diagrams help." |
| 4 min | General | "The timetable shows what period the IT lesson is. Worth checking." |
| User posts anything (only 30% chance) | Occasional response | "agreed" / "that works" *(rotates)* |

---

## Register Class — Response to User Posts

When the user sends any message to the class chat, one bot (chosen at random, with a 2–6 s delay) posts
a contextually appropriate reply from this pool:

```
"haha yeah"
"same honestly"
"good point"
"didn't think of it that way"
"lol true"
"that makes sense"
"I was wondering the same thing"
"ask sir, he'll know"
"check the timetable for that"
```

If the user's message contains a question mark, the teacher bot (`Mr. van der Berg`) also has a 40%
chance of responding with a subject-relevant nudge after a 8–15 s delay:

> "Good question, [displayName]. Check your timetable for the details, or tap GO TO LESSON when
> you're ready to begin today's task."

---

---

# PART 2 — PHASE III COOPERATIVE DISCUSSION BOTS

---

## Role Assignment Algorithm

1. On Phase III entry, randomly assign the user one of four roles: `leader`, `timer`, `scribe`, `angle-checker`.
2. Remaining three roles each get one bot — independent 50/50 smart/stupid coin flip per role.
3. Teacher bot activates at `t+0`.
4. Each role bot self-introduces within the first 90 seconds.

Example: user → `scribe`; bots → Aria (leader, smart), Ollie (timer, stupid), Rex (angle-checker, smart).

---

## Quiz Simulation

Pre-generated at Phase III entry using the real quiz length.

| Tier | Correct answers | Accuracy range |
|---|---|---|
| Smart | 15–17 of 20 | 75%–85% |
| Stupid | 5–8 of 20 | 25%–40% |

The Leader panel's distribution chart draws from all four answer sheets (user + 3 bots), making the
chart live and realistic.

---

## Discussion Scripts

All timings are `t+` seconds after Phase III chat becomes active.
Messages inject via `sendChat(text)` (learner bots) or `teacherSend(text)` (teacher bot — `isTeacher: true`).

---

### Leader Bot — Aria (Smart)

| t+ | Trigger | Message |
|---|---|---|
| 30 s | Entry | "Right, let's keep this tight. I'll walk us through each question — speak up if you disagree with the majority answer." |
| 60 s | Question 1 | Fires `onNextQuestion`; posts: "Question 1 — does anyone have a different answer to the majority here?" |
| Every ~90 s | Advance | Fires `onNextQuestion`; posts: "Question [N] — any dissenting views?" |
| Every 20 s | Participation Pulse | Fires pulse; posts: "[System] Leader pulse confirmed — Active." |
| t+60 | Prompter | Posts: "@Scribe, have you captured the key point for Q[current]?" |
| User silent 60 s | Stall | Posts: "I'm not hearing from everyone — [userRole], what's your take on this one?" |

---

### Leader Bot — Finn (Stupid)

| t+ | Trigger | Message |
|---|---|---|
| 15 s | Entry | "ok everyone ready? let's start" |
| 45 s | Question 1 | Fires `onNextQuestion`; posts: "next one" |
| Every ~45 s | Advance (too fast) | Fires `onNextQuestion`; posts: "moving on" |
| 80 s | Late pulse | Fires pulse; posts: "[System] Leader pulse confirmed — Active." |
| t+120 | Prompter | Posts: "anyone? lol" |
| User silent 90 s | Stall | Posts: "hello?" |

---

### Timer Bot — Conrad (Smart)

| t+ | Trigger | Message |
|---|---|---|
| 20 s | Entry | "Timer here. I'll divide the session evenly and keep you posted." |
| 0 s | Session start | "[Timer] Time Status — Full session started." |
| 50% elapsed | Midpoint | "Halfway through — good progress so far." |
| 75% elapsed | Warning | "⚠ 25% time remaining — Scribe, please start drafting the final answer." |
| 90% elapsed | Alert | "⚠ [TIMER ALERT] The group is stalling — time to MOVE ON!" |
| Every 30 s | Time Status Pulse | Fires pulse; posts: "[Timer] Time Status — [X min] remaining." |

---

### Timer Bot — Ollie (Stupid)

| t+ | Trigger | Message |
|---|---|---|
| 45 s | Entry | "oh right, I'm the timer... let me start that now" |
| 60% elapsed | Late midpoint | "wait are we halfway? I think so" |
| 85% elapsed | Late warning | "wait how much time do we have left? I think it's running out" |
| 95% elapsed | Alert | "⚠ [TIMER ALERT] The group is stalling — time to MOVE ON!" |
| 60 s, 150 s | Two pulses only | "[Timer] Time Status — [X min] remaining." |

---

### Scribe Bot — Petra (Smart)

| t+ | Trigger | Message |
|---|---|---|
| 25 s | Entry | "Scribe ready. I'll capture key points as we go and draft the final solution." |
| After q2, q4, q6... | Capture | "✎ Capturing: [brief summary of majority answer for that question]." |
| 70% elapsed | Draft notice | "My draft is shaping up — I'll trigger the Final Solution on the Leader's signal." |
| After q18 or 90% elapsed | Final Phase | Fires `onTriggerFinalPhase(draft)`; draft = "Based on our discussion: [compiled consensus answers]." |

---

### Scribe Bot — Mila (Stupid)

| t+ | Trigger | Message |
|---|---|---|
| 60 s | Entry | "I'll try to keep notes" |
| q3, q9, q15 | Sporadic captures | "✎ Capturing: ok" / "✎ Adding: yeah I agree" / "✎ noted: I think so" |
| 95% elapsed | Final Phase (very late) | Fires `onTriggerFinalPhase(draft)`; draft = "here's what I have: [incomplete, 3-question list only]." |

---

### Angle Checker Bot — Rex (Smart)

| t+ | Trigger | Message |
|---|---|---|
| 35 s | Entry | "Angle Checker in position. I'll flag it if I think we're all agreeing too fast." |
| After q3, q7, q12, q17 | Counter-perspective | "Hold on — Q[N]: I answered [alt] not [majority]. The scenario specifies [X] which changes the interpretation." |
| 60 s | Triad button 1 | "◈ ALTERNATIVE PERSPECTIVE: Have we considered the opposite conclusion?" |
| 120 s | Triad button 2 | "◈ DEVIL'S ADVOCATE: If we're wrong, what would that look like?" |
| 180 s | Triad button 3 | "◈ BLIND SPOT CHECK: What are we assuming that we haven't verified?" |
| Every 30 s | Perspective Pulse | Fires pulse; posts: "[Angle Checker] ◈ Perspective Pulse — actively monitoring for logic gaps." |

---

### Angle Checker Bot — Bea (Stupid)

| t+ | Trigger | Message |
|---|---|---|
| 90 s | Entry | "angle checker here, all looks good to me!" |
| After each question | Agreement | "yeah I agree with you all" / "same answer as everyone else!" / "makes sense to me" *(rotates)* |
| 180 s | Triad button 1 only | "◈ hmm I guess I should check... nope, we're all good." |
| 90 s | One pulse only | "[Angle Checker] ◈ Perspective Pulse — actively monitoring for logic gaps." |

---

### Teacher Bot — Mr. van der Berg (Phase III)

| Trigger | Message |
|---|---|
| Phase III entry (t+0) | "Welcome to the cooperative discussion phase. Each role player — please ensure you are prepared. Leader, you may begin when the group is ready." |
| User inactive 120 s | "I notice you've been quiet — remember, your role as [role] requires active participation." |
| User inactive 240 s | "[displayName], please engage with your group. This is your cooperative task." |
| User is Leader, no question advance in 150 s | "Leader — the group is waiting for you to move to the next question." |
| User is Timer, no time status in 120 s | "Timer — the group needs a time check. Please post your current time status." |
| User is Scribe, notebook empty after 180 s | "Scribe — don't forget to capture key insights from the chat into your notebook." |
| User is Angle Checker, triad not started after 180 s | "Angle Checker — you haven't activated your Anti-Groupthink Triad yet. Don't let the group fall into consensus bias." |
| Scribe triggers Final Phase | "Good work, Scribe. Everyone please review the draft and confirm your final answer." |
| User types "help me" / "help" | *See Part 3 — Teacher Bot Help System (Phase III context)* |

---

---

# PART 3 — TEACHER BOT HELP SYSTEM

---

## Overview

When a user types `help me`, `help`, or `?` in **any** chat input surface, Mr. van der Berg intercepts
the message before it posts and instead injects a targeted help response. The user's "help" message
is still shown in the chat as normal; the teacher's response arrives 2–4 seconds later.

The detection logic reads `window.location.pathname` + a shared `currentPhase` ref (for `/task` routes)
+ the user's `userRole` (for Phase III) to select the correct help script.

---

## Help Script Routing Table

| Route | Internal state | Help script |
|---|---|---|
| `/home` | — | HomeCrossroads help |
| `/attendence` | — | Attendance + register help |
| `/learningtask` | — | Quest Path help |
| `/task` | `phase === 1` | Challenge / Reflection help |
| `/task` | `phase === 2`, `tab === 'resources'` | Resource Hub help |
| `/task` | `phase === 2`, `tab === 'quiz'` | Blind Quiz help |
| `/task` | `phase === 3`, `role === 'leader'` | Phase III Leader help |
| `/task` | `phase === 3`, `role === 'timer'` | Phase III Timer help |
| `/task` | `phase === 3`, `role === 'scribe'` | Phase III Scribe help |
| `/task` | `phase === 3`, `role === 'angle-checker'` | Phase III Angle Checker help |
| `/task` | `phase === 3`, `role === 'learner'` | Phase III General Learner help |
| `/task` | `phase === 4` | Recalibration Quiz help |
| `/task` | `phase === 5` | Final Submission help |
| `/subjects` | — | Curriculum Navigator help |
| `/social` | — | Messages / Social help |
| `/shop` | — | Shop help |

---

## Help Scripts

> All scripts are posted by `Mr. van der Berg` via `teacherSend(text)`, 2–4 s after the user's message.

---

### HomeCrossroads (`/home`)

> "Happy to help, [displayName]! Here's what everything does on this screen:
> The large portal in the centre takes you directly to your current Learning Task — tap it to continue
> where you left off.
> The four tiles below give you access to: ATTENDANCE (check in and view your timetable), MY SUBJECTS
> (see all subjects and your progress), MESSAGES (chat with classmates and your teacher), and SHOP
> (spend your Gold on themes and items).
> Tap the portal whenever you're ready to begin your next learning step!"

---

### Attendance / Register (`/attendence`)

> "Of course — here's what this screen offers:
> The CHECK IN button at the top logs your attendance for today and adds to your check-in streak.
> The TIMETABLE section shows your schedule for the rest of the day — tap any row with an amber
> highlight to see details about an upcoming assessment.
> The CLASS CHAT below lets you communicate with your classmates and me during register.
> The ticker at the very top scrolls school-wide announcements — tap it to read the full message.
> When you're ready to begin the lesson, tap GO TO LESSON."

---

### Quest Path (`/learningtask`)

> "This is your Quest Path for [subject]. Here's how to read it:
> Each circle represents one step of your Learning Task. A glowing circle is your current active step.
> A ✓ means you've completed it. A locked circle means you need to finish the step before it first.
> Tap your active step to see what it's about, then press START LEARNING TASK → to enter the task.
> Complete all steps to earn bonus Gold. You're doing well — keep going!"

---

### Phase I — Challenge & Reflection (`/task`, phase 1)

> "You're in the Challenge phase — the starting point of every Learning Task.
> First, read or watch the scenario in the Challenge panel carefully. It presents a real-world problem
> that you'll be working toward solving throughout the task.
> Then answer the four questions in the Response panel:
> 1. What is the core problem?
> 2. What are the criteria for a good solution?
> 3. What is your initial solution?
> 4. On reflection, is that really the best approach?
> Each answer needs at least 10 characters to unlock the next step — take your time. There are no wrong
> answers here; this phase is about structuring your own thinking before you see the content."

---

### Phase II — Resource Hub (`/task`, phase 2, resources tab)

> "You're in the Content phase. The Resource Hub gives you everything you need to solve the Challenge.
> Watch the video and read through the PDF — they reveal the specific skills and knowledge you'll need.
> Take notes if it helps; the quiz comes right after.
> When you feel ready, switch to the QUIZ tab. You don't have to read everything perfectly on the
> first pass — the group discussion later will help fill in the gaps."

---

### Phase II — Blind Quiz (`/task`, phase 2, quiz tab)

> "You're in the Blind Quiz. Here's what to know:
> Read each question carefully and choose your best answer. The answer options are deliberately shuffled
> between questions and attempts — so focus on the concept, not the position (A/B/C/D).
> Once you submit, no marks are shown — that's intentional. Your answers will be compared with your
> group's answers in the discussion phase, which is where the real learning happens.
> Use the BACK button to revisit a question. Commit to your best thinking and press SUBMIT when done."

---

### Phase III — Leader (`/task`, phase 3, role: leader)

> "As the Leader, you drive the group discussion. Here's your checklist:
> Press NEXT QUESTION to push each question to the group one at a time — the distribution chart
> shows how everyone answered. Focus discussion on the questions where the group is most split.
> Click the PARTICIPATION PULSE every 20 seconds to maintain your Active status. If you miss it, you
> move to 'Inactive' in the system.
> Use the PROMPTER icons to directly call on a teammate by name.
> Once you've worked through all 20 questions, signal the Scribe to write up the group's final solution."

---

### Phase III — Timer (`/task`, phase 3, role: timer)

> "As the Timer, you manage the group's most valuable resource — time. Here's what to do:
> Your countdown is private — only you can see it, and that's by design. Group anxiety about time
> disrupts discussion.
> Use DIVIDE TIME to split the session evenly across all questions and the final solution phase.
> Post a TIME STATUS update every 30 seconds to keep the group informed without revealing the exact
> remaining time.
> When the group is clearly stalling on a question, press MOVE ON ALERT — that's your authority as
> Timer and the group is counting on you to use it."

---

### Phase III — Scribe (`/task`, phase 3, role: scribe)

> "As the Scribe, you are the group's memory and voice. Here's your flow:
> Watch the chat carefully. When someone makes a key point, tap the ✎ Capture icon next to that
> message to add it to your Notebook sidebar.
> In the Notebook, drag points into a logical sequence using the ▲▼ handles.
> When you have enough captured material, start typing the Final Solution in the draft area below
> the Notebook.
> Once the Leader signals it's time, press the FINAL SOLUTION trigger — everyone's screen will
> expand to show your draft for collective review. Don't wait too long — the group is depending on you."

---

### Phase III — Angle Checker (`/task`, phase 3, role: angle-checker)

> "As the Angle Checker, your job is healthy skepticism — not agreement.
> You have three Anti-Groupthink buttons. You must use all three before the session ends:
> ◈ ALTERNATIVE PERSPECTIVE — is there a completely different conclusion the data supports?
> ◈ DEVIL'S ADVOCATE — if we're wrong, what would that look like?
> ◈ BLIND SPOT CHECK — what are we assuming without verifying?
> Press the PERSPECTIVE PULSE every 30 seconds to signal you're actively watching the logic.
> Even if you personally agree with the group's answer, push back anyway — that's your role, and the
> system tracks whether you used your full triad."

---

### Phase III — General Learner (`/task`, phase 3, role: learner)

> "As a General Learner, here's how you contribute in the discussion:
> As the Leader advances each question, you'll see the distribution chart showing how the whole group
> answered. Compare it to your own answer.
> For every question, press either KEEP MY ANSWER (you're still confident) or I WANT TO CHANGE
> (the group discussion shifted your thinking).
> There is no penalty for changing — this phase is specifically designed to help you refine your
> thinking through social reasoning. Your Keep/Change decisions are carried forward into the
> recalibration quiz, where you can see your own growth."

---

### Phase IV — Recalibration Quiz (`/task`, phase 4)

> "You're in the Recalibration Quiz — a second attempt at the same questions from Phase II.
> The questions and answer options have been reshuffled — so don't try to remember positions, focus
> on the concepts you now understand better after the group discussion.
> You'll notice some questions show your Phase III intent (Keep / Change) as a visual hint — use that
> to anchor your decision.
> Your goal is to score higher than Phase II. Most learners do, because the group discussion fills
> in gaps that solo study misses. Give it your best."

---

### Phase V — Final Submission (`/task`, phase 5)

> "You've made it to the Final Submission — well done!
> Choose your submission type: VIDEO, PDF, or DOCUMENT, then drag your file into the upload zone.
> Add any comments you want me to see about your process or reasoning.
> Your submission should address the original Challenge scenario using the strategy your group
> refined in the discussion phase. You don't need a perfect answer — show your thinking.
> Press SUBMIT when you're ready. Your journey through this Learning Task will be recorded."

---

### Curriculum Navigator (`/subjects`)

> "This is your Subjects page — your overview of everything you're working on.
> Each subject card shows: the subject name, a progress bar for your current Learning Task, and the
> step count. The percentage shows how far through the full task you are.
> Tap a subject card to go directly to that subject's Quest Path. The IT subject card will show your
> live progress from the database.
> Use this page to check which subject needs attention before the next lesson."

---

### Social / Messages (`/social`)

> "This is your Messages hub. Here's how it works:
> Your conversations are listed on the left. Tap any row to open the thread in the right panel.
> To start a new 1:1 chat: tap + NEW CHAT and select a classmate from the contact list.
> To create a group chat: tap + NEW GROUP and select multiple people.
> Type your message and press Enter or the Send button to send. Unread messages show a badge count
> on the conversation row.
> You can also start a conversation with me directly through this screen if you have a question
> outside of class time."

---

### Shop (`/shop`)

> "Welcome to the Shop! Here's how it works:
> Use the filter tabs at the top to browse by category: Themes, Soundtracks, Color Schemes, Sprites.
> Your Gold balance is shown at the top right — you earn Gold by completing Learning Task steps.
> Tap BUY next to any item you can afford. The Gold is deducted immediately.
> After purchasing, tap EQUIP to make the item active. Active themes and colour schemes change the
> look of the whole app.
> Sprite and soundtrack items are tied to specific pages — check the item description to see where
> it appears."

---

---

# DATA STRUCTURES

```typescript
// src/lib/botEngine.ts

type Role = 'leader' | 'timer' | 'scribe' | 'angle-checker' | 'learner'
type Tier = 'smart' | 'stupid'

// ── Phase III bots ─────────────────────────────────────────────────────────

interface Phase3Bot {
  name: string
  role: Exclude<Role, 'learner'>
  tier: Tier
  quizAccuracy: number     // 0–1; used to pre-generate answers[]
  answers: boolean[]       // length = quiz.length; true = correct
}

interface BotContext {
  userRole: Role
  userName: string
  sendChat: (text: string) => void
  teacherSend: (text: string) => void
  onNextQuestion: () => void                      // Leader bot only
  onTriggerFinalPhase: (draft: string) => void   // Scribe bot only
  getState: () => BotState
}

interface BotState {
  currentQuestion: number       // 0 = not started
  notebookSize: number          // items captured by scribe
  triadUsed: number             // angle checker triad buttons pressed
  userLastActionAt: number      // Date.now() of last user action
  phaseElapsedMs: number        // ms since Phase III started
  sessionDurationMs: number     // total configured session length
  currentPhaseTab?: string      // 'resources' | 'quiz' (for Phase II help)
}

interface Phase3Session {
  bots: Phase3Bot[]
  start(ctx: BotContext): void
  stop(): void                   // clears all intervals/timeouts on unmount
}

// ── Register class bots ────────────────────────────────────────────────────

interface RegisterBot {
  name: string
  personality: 'enthusiastic' | 'organised' | 'laid-back' | 'quiet'
}

interface RegisterBotContext {
  displayName: string
  sendRegisterChat: (text: string) => void   // posts to register class chat as this bot
  teacherSend: (text: string) => void
  getCheckedIn: () => boolean                // whether the user has checked in
}

interface RegisterSession {
  start(ctx: RegisterBotContext): void
  stop(): void
}

// ── Teacher help system ────────────────────────────────────────────────────

type HelpContext =
  | { route: '/home' }
  | { route: '/attendence' }
  | { route: '/learningtask' }
  | { route: '/subjects' }
  | { route: '/social' }
  | { route: '/shop' }
  | { route: '/task'; phase: 1 }
  | { route: '/task'; phase: 2; tab: 'resources' | 'quiz' }
  | { route: '/task'; phase: 3; role: Role }
  | { route: '/task'; phase: 4 }
  | { route: '/task'; phase: 5 }

function resolveHelpContext(
  pathname: string,
  phase: number,
  tab: string,
  role: Role
): HelpContext { /* ... */ }

function getHelpScript(ctx: HelpContext, displayName: string): string { /* ... */ }
```

---

# IMPLEMENTATION PLAN

## Phase III Bots (existing scope — implement last)

### Step 1 — Create `src/lib/botEngine.ts`
- Define `PHASE3_BOT_ROSTER` (8 bots, no answers yet).
- `generateAnswers(accuracy, total)` — shuffles array to hit target accuracy.
- `assignPhase3Bots(userRole, quizLength)` — picks 3 bots (one per remaining role, random tier), generates answer sheets.
- `createPhase3Session(bots)` → returns `Phase3Session` with `start` / `stop`.
- Scripts implemented as `setTimeout` + `setInterval` chains inside `start`.

### Step 2 — Modify `LearningTaskUI.tsx` (Phase III wiring)
- On Phase III entry, call `assignPhase3Bots(userRole, quiz.length)` instead of `DEV_GROUP`.
- Replace hardcoded `MOCK_TEAM` strip with bot names + role labels.
- Pass `sendChat`, `teacherSend`, `onNextQuestion`, `onTriggerFinalPhase`, `getState` into `session.start()`.
- Call `session.stop()` on Phase III exit.
- Wire Leader bot answer sheets into the distribution chart.

### Step 3 — `teacherSend` helper
- `sendTeacherChat(text)` injects messages with `{ isTeacher: true }` under `"Mr. van der Berg"`.

### Step 4 — Inactivity tracker
- Add `userLastActionAt` ref; update on every `sendChat` call and role-panel button press.

### Step 5 — Distribution chart wiring
- Replace mock distribution data with a function counting correct/incorrect per question across all 4 answer sheets.

---

## Register Class Bots (new scope)

### Step 6 — Add `createRegisterSession` to `src/lib/botEngine.ts`
- Define `REGISTER_BOT_ROSTER` (4 bots).
- `createRegisterSession()` → returns `RegisterSession` with `start` / `stop`.
- Scripts are `setTimeout` chains keyed to `t+` timings.

### Step 7 — Modify `AttendenceUI.tsx`
- On mount, call `createRegisterSession().start(ctx)`.
- Wire `sendRegisterChat` as the bot's post function — same mutation used by the real chat.
- Call `session.stop()` on unmount.
- Pass `getCheckedIn: () => entryStore.checkedIn` into the context.

---

## Teacher Help System (new scope)

### Step 8 — Add `resolveHelpContext` + `getHelpScript` to `src/lib/botEngine.ts`
- `resolveHelpContext` reads `pathname`, phase state, tab state, user role.
- `getHelpScript` returns the correct script string with `[displayName]` interpolated.

### Step 9 — Wire help trigger into all chat inputs
- In `AttendenceUI.tsx` class chat: check if input matches `/(^|\s)(help me|help|\?)(\s|$)/i` before posting; if so, call `handleTeacherHelp()` which fires `teacherSend(getHelpScript(...))` after 2–4 s.
- In `TeacherChatBar.tsx` (learner→teacher 1:1): same intercept pattern.
- In `LearningTaskUI.tsx` Phase III chat: same intercept, with Phase III role context.

---

## Files to Create / Modify

| File | Action | Notes |
|---|---|---|
| `src/lib/botEngine.ts` | **Create** | All bot data, Phase III engine, register engine, help system |
| `src/pages/LearningTaskUI.tsx` | **Modify** | Wire Phase III bots; replace DEV_GROUP; add teacherSend; add help intercept |
| `src/pages/AttendenceUI.tsx` | **Modify** | Wire register session on mount; wire class chat help intercept |
| `src/components/TeacherChatBar.tsx` | **Modify** | Wire help intercept for 1:1 teacher chat on lesson routes |

No backend changes. No new DB tables. No GraphQL changes.
