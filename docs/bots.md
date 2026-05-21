# Stella Logos — Bot System Design

> **Status:** Core implementation complete.
> **Scope:** Three independent systems — Register Class, Phase III Cooperative Discussion, and Teacher Help.
> All bot logic is frontend-only. No DB reads/writes. Bots reset on every session entry.

---

## Overview

Three bot systems serve different moments in the learner journey:

| System | Where | Purpose |
|---|---|---|
| **Register Class Bots** | `AttendenceUI` — Class Chat | Simulate a live register class so the chat never feels empty |
| **Cooperative Bots** | `LearningTaskUI` — Phases I, II, and III | Give solo users a full group experience across all task phases |
| **Teacher Bot (global)** | Every page — persistent help widget at top of screen | Always-on, context-aware help; voice-capable; uses Anthropic API |

---

## Core Principles

- **No persistence.** All bot state resets on every page mount.
- **Always positive.** Bots support the user, never frustrate or obstruct. Even "stupid" tier bots eventually do their job.
- **Teacher bot is always active.** It runs independently of everything else. Every page, every route, any time the learner needs guidance.
- **Help is context-aware.** When the user types `help me` or `help`, or taps the help widget, the teacher bot detects the current route and phase and responds with targeted guidance.
- **Natural pacing.** Register bots use realistic morning rhythms. Cooperative bots follow the pedagogical flow.
- **Educational content only.** All bot messages — scripted and API-generated — must remain within the scope of the LMS and the current learning task. No exceptions.
- **Child-safe language.** The system is used by school learners (young teenagers). All bot dialogue must be age-appropriate: no slang that could be misread, no aggressive language, no references to content outside of school or the current task. "Stupid" tier bots are confused and slow, not rude.

---

## Content Safety Rules

These rules apply to every bot message in the system — scripted dialogue, API responses, and register chat.

1. **On-topic only.** Bot messages must relate to the LMS, the current learning task, or school life. No pop culture references, no politics, no social commentary beyond what's in the curriculum.
2. **No bad language.** Zero tolerance. Scripts are pre-written and reviewed. API calls use a strict system prompt that instructs Mr. Bot to refuse any off-topic or inappropriate response.
3. **Age-appropriate tone.** Write for a 13–16 year old school context. Friendly, direct, occasionally light-hearted (e.g. Daan's dry humour), but always school-appropriate.
4. **No personal opinions on non-academic topics.** Bots may express academic opinions ("I think the answer is B because...") but must not comment on social issues, religion, politics, or personal lifestyle.
5. **Constructive framing.** "Stupid" tier bots are characterised by academic confusion, forgetfulness, and lack of rigor — never meanness, bullying, or discouraging language toward the user.
6. **API safety net.** The system prompt sent to the Anthropic API for all teacher bot calls includes a hard refusal instruction: if the user's message is off-topic, Mr. Bot redirects gently back to the task without elaborating on the off-topic content.

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

| # | Name | Role (display) | Internal key | Tier | Quiz Accuracy | Personality |
|---|---|---|---|---|---|---|
| 1 | AriaBOT | Participation Checker | `leader` | Smart | 82% | Decisive, organised, holds the floor accountable |
| 2 | FinnBOT | Participation Checker | `leader` | Stupid | 33% | Well-meaning but disorganised, advances questions too fast |
| 3 | ConradBOT | Timer | `timer` | Smart | 78% | Punctual, clear alerts, good pace management |
| 4 | OllieBOT | Timer | `timer` | Stupid | 30% | Forgetful, late warnings, misses pulses |
| 5 | PetraBOT | Scribe | `scribe` | Smart | 80% | Captures real chat messages, cycles categories, builds coherent notes |
| 6 | MilaBOT | Scribe | `scribe` | Stupid | 28% | Captures random messages slowly, always marks as suggestion |
| 7 | RexBOT | Discussion Checker | `angle-checker` | Smart | 85% | Deploys all 3 structural vector prompts; monitors solution, steps, quality |
| 8 | BeaBOT | Discussion Checker | `angle-checker` | Stupid | 25% | Agrees with everything, perfunctory checks, rarely useful |

### Teacher Bot

| Name | Appears in | Function |
|---|---|---|
| Mr. Bot | **Every page** — global help widget (top of screen) | Always-on help responder; context-aware for every page and Phase III role; powered by Anthropic API |

The teacher bot widget is a **persistent collapsible chat panel** rendered in `ProtectedLayout`, visible on all routes when the user is logged in as a Learner. It is separate from the 1:1 `TeacherChatBar` (the real teacher's channel). The widget is powered exclusively by the Anthropic API (`claude-sonnet-4-6`) via the Express `/teacher-help` proxy — no scripted responses. The widget shows an unread badge count when a reply arrives while the panel is closed.

**Context awareness:** `taskContextStore` (Zustand) holds `phase`, `tab`, and `role`. `LearningTaskUI` writes these on every state change. The widget reads them and passes them to `getPageContext()` in `teacherHelpApi.ts`, which returns a detailed UI description for the current screen — including role-specific Phase III guidance (leader, timer, scribe, angle-checker, learner).

**Voice:** Deferred — Web Speech API TTS was removed. Will be re-implemented as a proper paid feature when budget allows.

---

---

# PART 1 — REGISTER CLASS BOT SYSTEM

---

## Trigger

Register Class bots activate when the learner opens `AttendenceUI` (`/attendence`). All timings are
relative to page mount (`t+` = seconds after mount). The teacher bot posts first; learner bots follow.

---

## Register Class — Teacher Bot Script (Mr. Bot)

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

If the user's message contains a question mark, the teacher bot (`Mr. Bot`) also has a 40%
chance of responding with a subject-relevant nudge after a 8–15 s delay:

> "Good question, [displayName]. Check your timetable for the details, or tap GO TO LESSON when
> you're ready to begin today's task."

---

---

# PART 2 — COOPERATIVE BOTS (Phases I, II, and III)

Cooperative bots are **only active during the Learning Task** (`/task` route). They have no presence on any other page. They communicate via text chat only — no voice.

---

## Role Assignment Algorithm

1. On Phase III entry, randomly assign the user one of four roles: `leader`, `timer`, `scribe`, `angle-checker`.
2. Remaining three roles each get one bot — independent 50/50 smart/stupid coin flip per role.
3. Teacher bot activates at `t+0`.
4. Each role bot self-introduces within the first 90 seconds.

Example: user → `scribe`; bots → Aria (leader, smart), Ollie (timer, stupid), Rex (angle-checker, smart).

---

## Phase I — Metacognitive Scaffold (Bots answer the reflection questions)

Before Phase III begins, each bot must have answered the four metacognitive reflection questions so their "Member Solution" card is populated:

1. **Core problem** — what is the main problem in the challenge?
2. **Criteria** — what makes a good solution?
3. **Solution** — what is their proposed solution?
4. **Audit** — step-by-step reasoning / method

Answers are **scripted** per tier. Smart tier answers are academically sound, well-phrased, and logically structured. Stupid tier answers are vague, incomplete, or misidentify the problem.

Bot metacog answers are generated when bots are assigned at Phase III entry (they simulate having worked through Phase I independently). They populate the `botMetacog[role]` map that drives the Member Solutions cards.

---

## Phase II — Quiz Simulation (Bots answer the quiz)

Pre-generated at Phase III entry using the real quiz length.

| Tier | Correct answers | Accuracy range |
|---|---|---|
| Smart | 15–17 of 20 | 75%–85% |
| Stupid | 5–8 of 20 | 25%–40% |

The Leader panel's distribution chart draws from all four answer sheets (user + 3 bots), making the chart live and realistic.

**Quiz Review (Phase III discussion):** When the leader advances to a question, the bots comment on it in chat according to their role. Smart bots give reasoned responses; stupid bots guess or agree with the majority without justification. Scripts for each question comment are generic ("I thought the answer was B because the scenario mentions X") — they don't need to know the real correct answer, only whether their pre-generated answer matched the majority.

---

## Discussion Scripts

All timings are `t+` seconds after Phase III chat becomes active.
Messages inject via `sendChat(text)` (learner bots) or `teacherSend(text)` (teacher bot — `isTeacher: true`).

---

### Participation Checker Bot — Aria (Smart) / Finn (Stupid)

| t+ | Bot | Message |
|---|---|---|
| 60 s | AriaBOT | "Let's go. Speak up if you disagree with anyone." |
| 120 s | AriaBOT | Fires `advanceQuestion`; posts: "Q1 — any different answers?" |
| Every 150 s | AriaBOT | Advance check — if user hasn't decided, posts `"[userName], Q[N] decision?"` then advances |
| Every 120 s | AriaBOT | `[Participation Checker] active` *(pulse — no extra text)* |
| 130 s | AriaBOT | `@Scribe, Q[N] captured?` |
| Every 120 s | AriaBOT | If a participant hasn't spoken: `"[name] — haven't heard from you."` |
| 45 s | FinnBOT | "ok let's start" |
| 90 s | FinnBOT | Fires `advanceQuestion`; posts: "ok Q1" |
| Every 90 s | FinnBOT | Advance check — if user hasn't decided, posts `"[userName]? still waiting"` then advances |
| 150 s | FinnBOT | `[Participation Checker] active` |
| 210 s | FinnBOT | "anyone here?" |
| Every 150 s | FinnBOT | If a participant hasn't spoken: `"[name]? you good?"` |

**Target Lock Hook** — When the human Participation Checker clicks a member name button in `LeaderCompact`, the system fires a hardcoded prompt message into chat, then locks the chat input for all other users until the targeted person responds. A 45 s auto-timeout releases the lock and logs a system message if no response arrives.

---

### Timer Bot — Conrad (Smart) / Ollie (Stupid)

| t+ | Bot | Message |
|---|---|---|
| 5 s | ConradBOT | `[Timer] active` *(session-start pulse)* |
| 45 s | ConradBOT | "Timer here. I'll keep you posted." |
| 50% elapsed | ConradBOT | "Halfway through." |
| 75% elapsed | ConradBOT | "⚠ 25% left. Scribe, start the draft." |
| 90% elapsed | ConradBOT | "⚠ MOVE ON." |
| Every 120 s | ConradBOT | `[Timer] N min left.` |
| 90 s | OllieBOT | "oh wait, I'm the timer lol" |
| 60% elapsed | OllieBOT | "are we halfway maybe?" |
| 85% elapsed | OllieBOT | "wait how much time is left??" |
| 95% elapsed | OllieBOT | "⚠ MOVE ON" |
| 120 s, 300 s | OllieBOT | `[Timer] N min left.` |

---

### Scribe Bot — Petra (Smart) / Mila (Stupid)

The scribe bot reads the **live chat** via the `getChat` callback and calls `captureNote(category, author, body)` to actually populate the `scribeNotes` state in the UI — not just post a chat string.

| t+ | Bot | Behaviour |
|---|---|---|
| 50 s | PetraBOT | "Scribe ready. Capturing key points." |
| Every 180 s | PetraBOT | Reads live chat; finds most recent uncaptured human message (non-bot, non-`[` prefix, length > 15); calls `captureNote(category, author, body)` cycling `suggestion → steps → questions`; posts `✎ Captured [category] from [author]: "[excerpt…]"` |
| 70% elapsed | PetraBOT | "Draft coming together." |
| 90% elapsed or q18 | PetraBOT | Fires `triggerFinalPhase(draft)`; posts `✎ Final draft ready — please review.` |
| 120 s | MilaBOT | "I'll try to take notes" |
| Every 300 s | MilaBOT | Reads live chat; finds random uncaptured human message; calls `captureNote('suggestion', author, body)`; posts `✎ noted` |
| 95% elapsed | MilaBOT | Fires `triggerFinalPhase(draft)`; posts `"here's my notes, sorry if incomplete"` |

---

### Discussion Checker Bot — Rex (Smart) / Bea (Stupid)

The bot sends the **exact** gate strings the UI checks in `dcVectorsComplete` so the Participation Checker's "TRIGGER FINAL COMPILATION" button unlocks when the bot plays this role.

| t+ | Bot | Message |
|---|---|---|
| 70 s | RexBOT | "Discussion Checker in. Watching for solution, steps, and quality check." |
| 360 s | RexBOT | `💬 Discussion Checker: We need to talk about the solution first.` |
| 780 s | RexBOT | `💬 Discussion Checker: We need to talk about the steps.` |
| 1260 s | RexBOT | `💬 Discussion Checker: We need to talk about how we will know if this solution is the best.` |
| 1680 s | RexBOT | "Solution, steps, quality check — all covered?" |
| Every 120 s | RexBOT | `[Discussion Checker] active` |
| 150 s | BeaBOT | "discussion checker here — all good!" |
| 300 s | BeaBOT | "checked... we're good I think" |
| 180 s | BeaBOT | `[Discussion Checker] active` |
| Every 180 s | BeaBOT | "yeah same" / "agree" / "makes sense" *(rotates)* |

---

### Teacher Bot — Mr. Bot (Phase III)

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

When a user types `help me`, `help`, or `?` in **any** chat input surface, Mr. Bot intercepts
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
| `/task` | `phase === 3`, `role === 'angle-checker'` | Phase III Discussion Checker help |
| `/task` | `phase === 3`, `role === 'learner'` | Phase III General Learner help |
| `/task` | `phase === 4` | Recalibration Quiz help |
| `/task` | `phase === 5` | Final Submission help |
| `/subjects` | — | Curriculum Navigator help |
| `/social` | — | Messages / Social help |
| `/shop` | — | Shop help |

---

## Help Scripts

> All scripts are posted by `Mr. Bot` via `teacherSend(text)`, 2–4 s after the user's message.

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

### Phase III — Participation Checker (`/task`, phase 3, role: leader)

> "As the Participation Checker, you drive the group discussion. Here's your checklist:
> Press NEXT QUESTION to push each question to the group one at a time — the distribution chart
> shows how everyone answered. Focus on questions where the group is most split.
> Click a member's name button to target them directly — this locks the chat for everyone else until
> that person responds (or the 45-second timeout fires).
> Click PARTICIPATION PULSE periodically to log your active status.
> Once all three Discussion Checker vectors are confirmed, the TRIGGER FINAL COMPILATION button
> unlocks — press it to move the group to the final review phase."

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

> "As the Scribe, you are the group's memory. Here's your workflow:
> Every chat message has a ✎ icon next to it. Click it to capture that message into the group notes.
> You'll be asked to categorise it as a SUGGESTION, STEP, or QUESTION — choose the one that best
> describes what was said.
> The Group Notes panel organises captured messages under those three headings automatically.
> Keep capturing as the discussion progresses — these notes become the group's meeting minutes.
> When the Participation Checker triggers Final Compilation, your notes will be visible to everyone."

---

### Phase III — Discussion Checker (`/task`, phase 3, role: angle-checker)

> "As the Discussion Checker, your job is to ensure the group covers all three structural vectors
> before submitting the final solution.
> Your HUD shows three checkboxes — the group must address each one:
> ◈ Vector 1: The Solution — a concrete plan or answer
> ◈ Vector 2: The Execution Steps — a step-by-step roadmap
> ◈ Vector 3: Quality Evaluation — how the group knows this is the best solution
> Use the three prompt buttons to redirect the group when a vector is missing. You must click all
> three at least once — the Participation Checker cannot trigger Final Compilation until all three
> are deployed.
> Press the DISCUSSION PULSE regularly to log that you are actively monitoring."

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

// ── Metacognitive answers (Phase I simulation) ────────────────────────────

interface BotMetacog {
  coreProblem: string    // what is the core problem?
  criteria: string       // what makes a good solution?
  solution: string       // proposed solution
  audit: string          // step-by-step reasoning
}

// ── Phase III bots ─────────────────────────────────────────────────────────

interface Phase3Bot {
  name: string
  role: Exclude<Role, 'learner'>
  tier: Tier
  quizAccuracy: number     // 0–1; used to pre-generate answers[]
  answers: boolean[]       // length = quiz.length; true = correct
  metacog: BotMetacog      // pre-generated Phase I answers
}

interface BotContext {
  userRole: Role
  userName: string
  sendChat: (botName: string, text: string) => void
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
}

interface Phase3Session {
  bots: Phase3Bot[]
  start(ctx: BotContext): void
  stop(): void                   // clears all intervals/timeouts on unmount
}

// ── Register class bots ────────────────────────────────────────────────────

interface RegisterBotContext {
  displayName: string
  sendRegisterChat: (botName: string, text: string) => void
  teacherSend: (text: string) => void
  getCheckedIn: () => boolean
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
```

---

## Phase I — Scripted Metacog Answers (per tier)

These are generic answers that work for any IT learning task. Smart tier answers are structured and thoughtful; stupid tier answers are vague or miss the point. They populate the Member Solutions cards in Phase III.

### Smart tier (applies to Aria, Conrad, Petra, Rex)
```
coreProblem: "The core problem is identifying the most efficient algorithm for the given scenario and understanding how it handles edge cases."
criteria: "A good solution should work correctly for all inputs, use appropriate data structures, be readable, and run within a reasonable time complexity."
solution: "I would use a loop-based approach with a conditional check at each step, keeping track of state in a variable. This avoids unnecessary recursion and is easy to trace."
audit: "Step 1: Define the input and expected output. Step 2: Identify any edge cases. Step 3: Write pseudocode. Step 4: Implement and trace through with a sample input. Step 5: Check output."
```

### Stupid tier (applies to Finn, Ollie, Mila, Bea)
```
coreProblem: "The problem is getting the program to work properly."
criteria: "It should give the right answer."
solution: "I would try different things until it works. Maybe use an if statement."
audit: "I'm not totally sure of the steps but I think you just code it and test it."
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
- `sendTeacherChat(text)` injects messages with `{ isTeacher: true }` under `"Mr. Bot"`.

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
| `src/lib/botEngine.ts` | **Create/expand** | All bot data, Phase I–III engine, register engine, help routing |
| `src/lib/teacherHelpApi.ts` | **Create** | Anthropic API call + safety system prompt; used only for help widget |
| `src/components/TeacherHelpWidget.tsx` | **Create** | Global persistent chat panel; collapsible; voice toggle; unread badge |
| `src/pages/LearningTaskUI.tsx` | **Modify** | Wire cooperative bots; metacog answers; Phase III chat; distribution chart |
| `src/pages/AttendenceUI.tsx` | **Modify** | Wire register session on mount; wire class chat help intercept |
| `src/App.tsx` / `ProtectedLayout.tsx` | **Modify** | Mount `TeacherHelpWidget` globally (visible on all protected routes) |

No backend changes. No new DB tables. No GraphQL changes.


---

## Anthropic API Integration

> **Important:** The original design called for fully scripted bot chat messages. This has since been upgraded — see **Part 2b** for the current AI-powered implementation. The `/teacher-help` endpoint for Mr. Bot was already API-driven; cooperative bot chat and metacog are now also API-driven via a separate `/bot-message` endpoint.

The Anthropic API (`claude-sonnet-4-6`) is now used for **two** purposes:
1. **Global Teacher Help Widget** — `TeacherHelpWidget.tsx` → `POST /teacher-help` proxy
2. **Cooperative Discussion Bots** — `callBotMessage()` in `LearningTaskUI.tsx` → `POST /bot-message` proxy (see Part 2b)

**Architecture — browser → Vite proxy → Express → Anthropic:**
The browser never calls the Anthropic API directly (CORS blocks it). All calls go:
`TeacherHelpWidget` → `POST /teacher-help` (Vite proxy) → Express endpoint (`backend/src/index.ts`) → `https://api.anthropic.com/v1/messages`

The API key lives in `backend/.env` only — never in client code or `.env.local`. The Express endpoint is JWT-gated (reads `Authorization: Bearer <token>` and calls `verifyToken`).

**Dev note:** Curro Holdings corporate network uses SSL inspection (MITM). The backend has `NODE_TLS_REJECT_UNAUTHORIZED=0` guarded by `NODE_ENV !== 'production'` to allow outbound HTTPS in dev.

**Cost note:** Sonnet 4.6 costs ~$0.003 per response at 300 tokens. A typical session = 2–5 help queries = < $0.02/session.

---

---

---

# PART 2b — AI-POWERED COOPERATIVE BOT ENHANCEMENTS

> **Status:** Implemented and active. Supersedes the scripted metacog and chat fallbacks documented in Part 2 wherever `aiBotsEnabled` is `true` (DevBotToggle is ON).

---

## Overview

When AI bots are enabled, cooperative bots no longer use hardcoded dialogue for either their Phase I reflection answers or their Phase III discussion responses. Both are generated live by the Anthropic API via a backend proxy endpoint.

---

## `/bot-message` Endpoint

```
POST /bot-message
Authorization: Bearer <sl_token>
Content-Type: application/json
```

**Request body:**

```typescript
{
  type:          'metacog' | 'chat'
  botName:       string                    // e.g. 'AriaBOT'
  botRole:       'leader' | 'timer' | 'scribe' | 'angle-checker'
  botTier:       'smart' | 'stupid'
  challenge?:    string                    // full RLC text
  userName?:     string
  userMetacog?:  { problem, criteria, solution, audit }
  botOwnMetacog?: { problem, criteria, solution, audit }
  chatHistory?:  { author: string; body: string }[]   // last 20 messages
  userMessage?:  string
  participants?: string[]                  // all names in the session
}
```

**Response:**

```typescript
{ reply: string; usage?: { inputTokens: number; outputTokens: number } }
```

- `type: 'metacog'` — returns a JSON string `{ problem, criteria, solution, audit }`. Code-fence stripping applied server-side before returning.
- `type: 'chat'` — returns a plain conversational reply (1–3 sentences).

---

## Metacog Generation — AI with Quality Calibration

### When it fires

A `useEffect` on `subPhase === 'cooperative'` (Phase3b mount) fires `callBotMessage({ type: 'metacog' })` for **all 4 bot roles simultaneously**. This happens as soon as the Phase3b component mounts — before the lobby roster fills — giving 10–20+ seconds of AI generation time before the user can click START.

Previous design fired at lobby role-selection (too late — race condition where AI call hadn't returned before user clicked START). Fixed by moving to Phase3b mount.

### Quality calibration

The learner's own metacog answers are passed as `userMetacog`. The backend includes a **QUALITY CALIBRATION** block in the system prompt:

| Bot tier | Instruction |
|---|---|
| `smart` | Answer 10–25% sharper than the learner. More structured, more precise. Not genius-level — learner should see improvement without feeling outclassed. Match approximate length or go slightly longer. |
| `stupid` | Answer similar to or worse than the learner. Vaguer, less complete, may misidentify the problem. Personality (scattered, forgetful, etc.) degrades quality. Match length or go shorter. |

### Fallback

If the AI call fails or returns unparseable JSON, the component falls back to `BOT_METACOG` scripted answers. These have been updated to reference the drone rescue challenge (not the old school board presentation scenario).

### JSON extraction

Claude sometimes wraps JSON in markdown code fences despite instructions. The frontend uses `/\{[\s\S]*\}/` regex to extract the object from anywhere in the response. The backend also strips ` ```json ``` ` fences before sending the reply.

---

## Chat Responses — AI-Powered

When the user sends a message, the responding bot's `callBotMessage({ type: 'chat' })` call includes:

- **`challenge`** — the full RLC text (drone rescue scenario)
- **`botOwnMetacog`** — the bot's own prior Phase I reflection (AI-generated or fallback)
- **`userMetacog`** — the learner's Phase I answers
- **`chatHistory`** — last 20 messages for context
- **`participants`** — all session member names (for the leader's floor management check)

The bot's persona (character, role, tier) is set via the system prompt. Responses are capped at 1–3 sentences. If the AI call fails, falls back to `getBotP3bResponse()` scripted template.

---

## Leader Floor Management

When a bot playing the **Leader role** generates a chat response, the backend computes:

```typescript
const speakersSeen = new Set(chatHistory.map(m => m.author))
const silent = participants.filter(p => !speakersSeen.has(p))
```

If any participant hasn't spoken yet, the leader's system prompt gains a **FLOOR MANAGEMENT — HIGHEST PRIORITY** block:

> "The following participant(s) have NOT yet spoken: [names]. Your response MUST be to pause the discussion and directly invite the first silent participant to share. Do NOT respond to the content of the last message."

This gives the leader a concrete, pedagogically correct moderation behaviour — they pause dominant talkers and invite silent members before engaging with content.

---

## Discussion Startup Ceremony

Phase3b has a `chatStartState: 'waiting-leader' | 'waiting-timer' | 'active'` state machine that structures the opening sequence.

### States

| State | Chat display | Who acts |
|---|---|---|
| `waiting-leader` | Blank — "AWAITING LEADER TO OPEN THE DISCUSSION" | User (if leader) clicks START; bot (if leader) auto-fires after 2.5 s |
| `waiting-timer` | Messages visible + amber "◷ WAITING FOR TIMER TO START" banner | User (if timer) clicks START SESSION; bot (if timer) auto-fires after 3.5 s |
| `active` | Normal discussion — input enabled | Mr. Bot welcome fires; `startBotSession` proactive engine starts |

### Leader start sequence

1. Leader sends participation ping: "Session is open. Everyone — please confirm you are ready."
2. Bot members (timer, scribe, angle-checker) respond with staggered ready pings (smart/stupid variants)
3. `chatStartState` → `'waiting-timer'`

### Timer start sequence

1. Timer sends: "Clock started. Discussion is open — let's go."
2. `chatStartState` → `'active'`

### Input gating

The chat `<input>` is `disabled` with `cursor: not-allowed` and a greyed placeholder until `chatStartState === 'active'`. The SEND button also becomes inert. `handleSend` is guarded: bot replies only fire when `chatStartState === 'active'`.

### Lobby chat cleanliness

The lobby roster fill animation no longer calls `addBotMsg` — bot join announcements are visual-only in the roster panel. The `chat` array starts empty every session.

---

## Dynamic RLC

`rlcText` is fetched on `LearningTaskUI` mount from `/assets/learning-tasks/LearningTask1/RLC/rlc.txt`. This text is:
- Shown to the learner in Phase I and in the Phase3b RLC reminder panel
- Passed as `challenge` to every `callBotMessage` call
- Stored in `public/assets/learning-tasks/LearningTask1/RLC/rlc.txt` — teachers edit this via the Task Creator's CHALLENGE step RLC textarea

The current live challenge is the **drone rescue / Java programming / 2004 tsunami scenario**.

---

## Voice (Deferred)

Web Speech API TTS was implemented and then removed. The quality of the browser-native voices was unsatisfactory. This feature will be re-implemented using a proper paid TTS service when budget allows. All Mr. Bot responses are currently text-only.

---
Data Structures
```typescript
// src/lib/botEngine.ts

type Role = 'leader' | 'timer' | 'scribe' | 'angle-checker' | 'learner'
type Tier = 'smart' | 'stupid'

interface Phase3Bot {
  name: string
  role: Exclude<Role, 'learner'>
  tier: Tier
  quizAccuracy: number   // 0–1
  answers: boolean[]     // pre-generated; length = quiz.length
}

interface BotContext {
  userRole: Role
  userName: string
  sendChat: (text: string) => void
  teacherSend: (text: string) => void
  onNextQuestion: () => void
  onTriggerFinalPhase: (draft: string) => void
  getState: () => BotState
}

interface BotState {
  currentQuestion: number
  notebookSize: number
  triadUsed: number
  userLastActionAt: number       // Date.now() of last user action
  phaseElapsedMs: number
  sessionDurationMs: number
  currentPhaseTab?: 'resources' | 'quiz'
}

interface Phase3Session {
  bots: Phase3Bot[]
  start(ctx: BotContext): void
  stop(): void   // clears ALL intervals and timeouts — must be called on unmount
}

interface RegisterBotContext {
  displayName: string
  sendRegisterChat: (botName: string, text: string) => void
  teacherSend: (text: string) => void
  getCheckedIn: () => boolean
}

interface RegisterSession {
  start(ctx: RegisterBotContext): void
  stop(): void
}

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
```
---
Bot Rosters
Register Class Bots
```typescript
const REGISTER_BOT_ROSTER = [
  { name: 'Thabo Dlamini',  personality: 'enthusiastic' },
  { name: 'Keisha Naidoo',  personality: 'organised'    },
  { name: 'Daan van Zyl',   personality: 'laid-back'    },
  { name: 'Nomsa Sithole',  personality: 'quiet'        },
]
```
Phase III Bots
```typescript
const PHASE3_BOT_ROSTER = [
  { name: 'Aria',   role: 'leader',        tier: 'smart',  quizAccuracy: 0.82 },
  { name: 'Finn',   role: 'leader',        tier: 'stupid', quizAccuracy: 0.33 },
  { name: 'Conrad', role: 'timer',         tier: 'smart',  quizAccuracy: 0.78 },
  { name: 'Ollie',  role: 'timer',         tier: 'stupid', quizAccuracy: 0.30 },
  { name: 'Petra',  role: 'scribe',        tier: 'smart',  quizAccuracy: 0.80 },
  { name: 'Mila',   role: 'scribe',        tier: 'stupid', quizAccuracy: 0.28 },
  { name: 'Rex',    role: 'angle-checker', tier: 'smart',  quizAccuracy: 0.85 },
  { name: 'Bea',    role: 'angle-checker', tier: 'stupid', quizAccuracy: 0.25 },
]
```
Answer generation:
```typescript
function generateAnswers(accuracy: number, total: number): boolean[] {
  const correct = Math.round(accuracy * total)
  const answers = Array(total).fill(false)
  const indices = [...Array(total).keys()].sort(() => Math.random() - 0.5)
  indices.slice(0, correct).forEach(i => (answers[i] = true))
  return answers
}
```
Bot assignment (called on Phase III entry):
```typescript
function assignPhase3Bots(userRole: Role, quizLength: number): Phase3Bot[] {
  const allRoles: Exclude<Role, 'learner'>[] = ['leader', 'timer', 'scribe', 'angle-checker']
  const botRoles = allRoles.filter(r => r !== userRole)
  return botRoles.map(role => {
    const tier: Tier = Math.random() < 0.5 ? 'smart' : 'stupid'
    const template = PHASE3_BOT_ROSTER.find(b => b.role === role && b.tier === tier)!
    return { ...template, answers: generateAnswers(template.quizAccuracy, quizLength) }
  })
}
```
---
Register Class Scripts
All timings are milliseconds after page mount.
Use `setTimeout` chains stored in a handles array for clean `stop()`.
`ctx.sendRegisterChat(botName, message)` posts as that bot.
`ctx.teacherSend(message)` posts as Mr. Bot.
Teacher Bot (Register)
```typescript
t(5000,  () => ctx.teacherSend("Good morning, class. Please check in using the check-in button at the top when you're ready. Have a great day."))
t(90000, () => ctx.teacherSend("A reminder: check the assessment column in your timetable for any tasks that are due today or this week."))
t(180000,() => { if (!ctx.getCheckedIn()) ctx.teacherSend(`I notice you haven't checked in yet, ${ctx.displayName}. Please tap the check-in button at the top of the page.`) })
t(300000,() => ctx.teacherSend("We'll be moving to lessons shortly. Make sure you know which period you're in and have everything you need."))
```
Thabo Dlamini
```typescript
t(12000,  () => ctx.sendRegisterChat('Thabo Dlamini', 'Morning everyone 👋'))
t(35000,  () => ctx.sendRegisterChat('Thabo Dlamini', 'Morning sir! Ready for another day'))
t(120000, () => ctx.sendRegisterChat('Thabo Dlamini', 'anyone finish the IT assignment? I was up late trying to sort out my algorithm'))
t(240000, () => ctx.sendRegisterChat('Thabo Dlamini', "at least it's Friday... wait, it's not is it 😩"))
```
Keisha Naidoo
```typescript
t(25000,  () => ctx.sendRegisterChat('Keisha Naidoo', "Morning! Don't forget to check in 😊"))
t(70000,  () => ctx.sendRegisterChat('Keisha Naidoo', 'Thabo I finished it last night — the trick is to trace through the loop step by step before you code it'))
t(150000, () => ctx.sendRegisterChat('Keisha Naidoo', "Also check the timetable — there's an assessment column that shows what's due. Tap the row for details."))
t(210000, () => ctx.sendRegisterChat('Keisha Naidoo', "Sir already posted an announcement about today's lesson. Make sure you check the ticker at the top."))
```
Daan van Zyl
```typescript
t(50000,  () => ctx.sendRegisterChat('Daan van Zyl', 'morning... I think. barely awake'))
t(100000, () => ctx.sendRegisterChat('Daan van Zyl', 'trace through the loop 💀 I just vibed with it and hoped for the best'))
t(180000, () => ctx.sendRegisterChat('Daan van Zyl', 'why does register have to be first thing. give us 10 minutes to become human first'))
t(270000, () => ctx.sendRegisterChat('Daan van Zyl', 'ok actually checking my timetable now. oh great, double period. excellent.'))
```
Nomsa Sithole
```typescript
t(90000,  () => ctx.sendRegisterChat('Nomsa Sithole', 'Morning. Checked in.'))
t(170000, () => ctx.sendRegisterChat('Nomsa Sithole', 'The loop made sense once I drew it out. Flow diagrams help.'))
t(240000, () => ctx.sendRegisterChat('Nomsa Sithole', 'The timetable shows what period the IT lesson is. Worth checking.'))
```
Responses to User Posts in Register Chat
Wire this to the chat's onMessage event (filtering out bot messages):
```typescript
const GENERIC_REPLIES = [
  'haha yeah', 'same honestly', 'good point',
  "didn't think of it that way", 'lol true', 'that makes sense',
  'I was wondering the same thing', "ask sir, he'll know",
  'check the timetable for that'
]

function onUserRegisterMessage(text: string) {
  // Pick a random bot; Nomsa only included on 30% roll
  const candidates = ['Thabo Dlamini', 'Keisha Naidoo', 'Daan van Zyl']
  if (Math.random() < 0.3) candidates.push('Nomsa Sithole')
  const bot = candidates[Math.floor(Math.random() * candidates.length)]
  const reply = GENERIC_REPLIES[Math.floor(Math.random() * GENERIC_REPLIES.length)]
  const delay = 2000 + Math.random() * 4000
  setTimeout(() => ctx.sendRegisterChat(bot, reply), delay)

  // 40% chance teacher responds if message contains a question
  if (text.includes('?') && Math.random() < 0.4) {
    const teacherDelay = 8000 + Math.random() * 7000
    setTimeout(() => ctx.teacherSend(
      `Good question, ${ctx.displayName}. Check your timetable for the details, or tap GO TO LESSON when you're ready to begin today's task.`
    ), teacherDelay)
  }
}
```
---
Phase III Scripts
All timings are `t+` ms after Phase III chat becomes active.
Scripts use `setTimeout` + `setInterval`. Store ALL handles. Clear ALL in `stop()`.
Add a `stopped` boolean flag — check it inside every callback before posting.
Leader Bot — Aria (Smart)
```typescript
t(30000,  () => send('Right, let\'s keep this tight. I\'ll walk us through each question — speak up if you disagree with the majority answer.'))
t(60000,  () => { ctx.onNextQuestion(); send('Question 1 — does anyone have a different answer to the majority here?') })

// Advance loop: questions 2–20, every ~90s
let q = 2
const advanceInterval = setInterval(() => {
  if (stopped || q > 20) { clearInterval(advanceInterval); return }
  ctx.onNextQuestion()
  send(`Question ${q} — any dissenting views?`)
  q++
}, 90000)

// Participation pulse every 20s
setInterval(() => send('[System] Leader pulse confirmed — Active.'), 20000)

// Prompter at t+60s
t(60000, () => send(`@Scribe, have you captured the key point for Q${ctx.getState().currentQuestion}?`))

// Inactivity check: poll every 10s, fire once if user silent 60s
setInterval(() => {
  if (Date.now() - ctx.getState().userLastActionAt > 60000)
    send(`I'm not hearing from everyone — ${ctx.userRole}, what's your take on this one?`)
}, 10000)
```
Leader Bot — Finn (Stupid)
```typescript
t(15000, () => send('ok everyone ready? let\'s start'))
t(45000, () => { ctx.onNextQuestion(); send('next one') })

// Advance loop every ~45s (too fast)
let q = 2
const advanceInterval = setInterval(() => {
  if (stopped || q > 20) { clearInterval(advanceInterval); return }
  ctx.onNextQuestion(); send('moving on'); q++
}, 45000)

t(80000,  () => send('[System] Leader pulse confirmed — Active.'))
t(120000, () => send('anyone? lol'))

// Inactivity 90s
setInterval(() => {
  if (Date.now() - ctx.getState().userLastActionAt > 90000) send('hello?')
}, 10000)
```
Timer Bot — Conrad (Smart)
```typescript
t(0,      () => send('[Timer] Time Status — Full session started.'))
t(20000,  () => send("Timer here. I'll divide the session evenly and keep you posted."))

// Elapsed-based messages — check via polling every 5s
setInterval(() => {
  const { phaseElapsedMs, sessionDurationMs } = ctx.getState()
  const pct = phaseElapsedMs / sessionDurationMs
  if (pct >= 0.5  && !firedHalf)   { firedHalf = true;  send('Halfway through — good progress so far.') }
  if (pct >= 0.75 && !fired75)     { fired75 = true;    send('⚠ 25% time remaining — Scribe, please start drafting the final answer.') }
  if (pct >= 0.9  && !fired90)     { fired90 = true;    send('⚠ [TIMER ALERT] The group is stalling — time to MOVE ON!') }
}, 5000)

// Time status pulse every 30s
setInterval(() => {
  const remaining = Math.ceil((ctx.getState().sessionDurationMs - ctx.getState().phaseElapsedMs) / 60000)
  send(`[Timer] Time Status — ${remaining} min remaining.`)
}, 30000)
```
Timer Bot — Ollie (Stupid)
```typescript
t(45000, () => send("oh right, I'm the timer... let me start that now"))

// Two pulses only
t(60000,  () => { const r = Math.ceil((ctx.getState().sessionDurationMs - ctx.getState().phaseElapsedMs) / 60000); send(`[Timer] Time Status — ${r} min remaining.`) })
t(150000, () => { const r = Math.ceil((ctx.getState().sessionDurationMs - ctx.getState().phaseElapsedMs) / 60000); send(`[Timer] Time Status — ${r} min remaining.`) })

setInterval(() => {
  const pct = ctx.getState().phaseElapsedMs / ctx.getState().sessionDurationMs
  if (pct >= 0.6 && !firedHalf)  { firedHalf = true;  send('wait are we halfway? I think so') }
  if (pct >= 0.85 && !fired85)   { fired85 = true;    send("wait how much time do we have left? I think it's running out") }
  if (pct >= 0.95 && !fired95)   { fired95 = true;    send('⚠ [TIMER ALERT] The group is stalling — time to MOVE ON!') }
}, 5000)
```
Scribe Bot — Petra (Smart)
```typescript
t(25000, () => send("Scribe ready. I'll capture key points as we go and draft the final solution."))

// Capture after even questions (2, 4, 6...)
// Wire to onNextQuestion event: if currentQuestion % 2 === 0, post capture

t(0, () => {
  // Poll for even questions
  let lastCaptured = 0
  setInterval(() => {
    const q = ctx.getState().currentQuestion
    if (q % 2 === 0 && q !== lastCaptured && q > 0) {
      lastCaptured = q
      send(`✎ Capturing: key point for Q${q} noted.`)
    }
  }, 3000)
})

// 70% elapsed
setInterval(() => {
  const pct = ctx.getState().phaseElapsedMs / ctx.getState().sessionDurationMs
  if (pct >= 0.7 && !fired70) {
    fired70 = true
    send("My draft is shaping up — I'll trigger the Final Solution on the Leader's signal.")
  }
  if ((ctx.getState().currentQuestion >= 18 || pct >= 0.9) && !firedFinal) {
    firedFinal = true
    ctx.onTriggerFinalPhase('Based on our discussion: [compiled consensus answers].')
  }
}, 5000)
```
Scribe Bot — Mila (Stupid)
```typescript
t(60000, () => send("I'll try to keep notes"))

// Sporadic captures at q3, q9, q15
const milaNotes = ['✎ Capturing: ok', '✎ Adding: yeah I agree', '✎ noted: I think so']
let noteIndex = 0
setInterval(() => {
  const q = ctx.getState().currentQuestion
  if ([3, 9, 15].includes(q) && !capturedQuestions.has(q)) {
    capturedQuestions.add(q)
    send(milaNotes[noteIndex++ % milaNotes.length])
  }
  if (ctx.getState().phaseElapsedMs / ctx.getState().sessionDurationMs >= 0.95 && !firedFinal) {
    firedFinal = true
    ctx.onTriggerFinalPhase("here's what I have: [incomplete, 3-question list only].")
  }
}, 3000)
```
Angle Checker — Rex (Smart)
```typescript
t(35000,  () => send("Angle Checker in position. I'll flag it if I think we're all agreeing too fast."))
t(60000,  () => send('◈ ALTERNATIVE PERSPECTIVE: Have we considered the opposite conclusion?'))
t(120000, () => send("◈ DEVIL'S ADVOCATE: If we're wrong, what would that look like?"))
t(180000, () => send("◈ BLIND SPOT CHECK: What are we assuming that we haven't verified?"))

// Counter-perspectives after q3, q7, q12, q17
setInterval(() => {
  const q = ctx.getState().currentQuestion
  if ([3, 7, 12, 17].includes(q) && !challenged.has(q)) {
    challenged.add(q)
    send(`Hold on — Q${q}: I answered differently. The scenario wording changes the interpretation.`)
  }
}, 3000)

// Perspective pulse every 30s
setInterval(() => send('[Angle Checker] ◈ Perspective Pulse — actively monitoring for logic gaps.'), 30000)
```
Angle Checker — Bea (Stupid)
```typescript
t(90000, () => send('angle checker here, all looks good to me!'))
t(180000,() => send('◈ hmm I guess I should check... nope, we\'re all good.'))
t(90000, () => send('[Angle Checker] ◈ Perspective Pulse — actively monitoring for logic gaps.'))

// After each question (rotate agreements)
const beaAgreements = ['yeah I agree with you all', 'same answer as everyone else!', 'makes sense to me']
let beaIdx = 0
setInterval(() => {
  const q = ctx.getState().currentQuestion
  if (q !== lastQ && q > 0) {
    lastQ = q
    send(beaAgreements[beaIdx++ % beaAgreements.length])
  }
}, 3000)
```
Teacher Bot — Mr. Bot (Phase III)
```typescript
t(0, () => ctx.teacherSend('Welcome to the cooperative discussion phase. Each role player — please ensure you are prepared. Leader, you may begin when the group is ready.'))

// Inactivity checks (poll every 10s)
setInterval(() => {
  const idle = Date.now() - ctx.getState().userLastActionAt
  if (idle > 240000 && !fired240) { fired240 = true; ctx.teacherSend(`${ctx.userName}, please engage with your group. This is your cooperative task.`) }
  else if (idle > 120000 && !fired120) { fired120 = true; ctx.teacherSend(`I notice you've been quiet — remember, your role as ${ctx.userRole} requires active participation.`) }
}, 10000)

// Role-specific nudges:
// Leader: poll for question advance stall
// Timer: poll for time status gap
// Scribe: check notebookSize after 180s
// Angle Checker: check triadUsed after 180s
// (implement as one-shot timers that check the relevant state field)
```
---
Teacher Help System
Trigger Detection (all chat inputs)
```typescript
const HELP_PATTERN = /(^|\s)(help me|help|\?)(\s|$)/i

function handleChatSubmit(input: string) {
  postMessage(input)  // always show user's message

  if (HELP_PATTERN.test(input)) {
    const helpCtx = resolveHelpContext(pathname, phase, tab, userRole)
    const script = getHelpScript(helpCtx, displayName)
    const delay = 2000 + Math.random() * 2000

    setTimeout(async () => {
      const reply = await callTeacherHelpApi(script, input, displayName)
      teacherSend(reply)
      // If teacher voice is enabled: pass reply through Google Cloud TTS → play audio
    }, delay)
  }
}
```
Help Context Resolver
```typescript
function resolveHelpContext(pathname: string, phase: number, tab: string, role: Role): HelpContext {
  switch (pathname) {
    case '/home':          return { route: '/home' }
    case '/attendence':    return { route: '/attendence' }
    case '/learningtask':  return { route: '/learningtask' }
    case '/subjects':      return { route: '/subjects' }
    case '/social':        return { route: '/social' }
    case '/shop':          return { route: '/shop' }
    case '/task':
      if (phase === 1) return { route: '/task', phase: 1 }
      if (phase === 2) return { route: '/task', phase: 2, tab: tab as 'resources' | 'quiz' }
      if (phase === 3) return { route: '/task', phase: 3, role }
      if (phase === 4) return { route: '/task', phase: 4 }
      if (phase === 5) return { route: '/task', phase: 5 }
  }
  return { route: '/home' }
}
```
Help Script Map
Store all help scripts as a Record in `botEngine.ts`, keyed as follows.
The full script text for each key is in the Stella Logos Bot System Design document (Part 3).
```typescript
const HELP_SCRIPTS: Record<string, string> = {
  'home':             `...`,   // HomeCrossroads help
  'attendence':       `...`,   // Attendance / Register help
  'learningtask':     `...`,   // Quest Path help
  'task-phase1':      `...`,   // Challenge & Reflection help
  'task-phase2-resources': `...`,
  'task-phase2-quiz': `...`,
  'task-phase3-leader':        `...`,
  'task-phase3-timer':         `...`,
  'task-phase3-scribe':        `...`,
  'task-phase3-angle-checker': `...`,
  'task-phase3-learner':       `...`,
  'task-phase4':      `...`,
  'task-phase5':      `...`,
  'subjects':         `...`,
  'social':           `...`,
  'shop':             `...`,
}

function getHelpScript(ctx: HelpContext, displayName: string): string {
  let key = ctx.route.replace('/', '')
  if (ctx.route === '/task') {
    key += `-phase${ctx.phase}`
    if ('tab' in ctx) key += `-${ctx.tab}`
    if ('role' in ctx) key += `-${ctx.role}`
  }
  return (HELP_SCRIPTS[key] || HELP_SCRIPTS['home']).replace(/\[displayName\]/g, displayName)
}
```
---
Wiring Summary
AttendenceUI.tsx
```typescript
useEffect(() => {
  const session = createRegisterSession()
  session.start({
    displayName: user.displayName,
    sendRegisterChat: (botName, text) => addChatMessage({ sender: botName, text, isBot: true }),
    teacherSend: (text) => addChatMessage({ sender: 'Mr. Bot', text, isTeacher: true }),
    getCheckedIn: () => checkedIn,
  })
  return () => session.stop()
}, [])
```
LearningTaskUI.tsx (Phase III entry)
```typescript
useEffect(() => {
  if (currentPhase !== 3) return
  const bots = assignPhase3Bots(userRole, quiz.length)
  const session = createPhase3Session(bots)
  session.start({
    userRole,
    userName: user.displayName,
    sendChat: (text) => addChatMessage({ text, isBot: true, sender: botName }),
    teacherSend: (text) => addChatMessage({ text, isTeacher: true, sender: 'Mr. Bot' }),
    onNextQuestion: () => dispatch({ type: 'ADVANCE_QUESTION' }),
    onTriggerFinalPhase: (draft) => dispatch({ type: 'TRIGGER_FINAL', payload: draft }),
    getState: () => ({
      currentQuestion: state.currentQuestion,
      notebookSize: state.notebook.length,
      triadUsed: state.triadUsed,
      userLastActionAt: state.userLastActionAt,
      phaseElapsedMs: Date.now() - state.phaseStartTime,
      sessionDurationMs: state.sessionDurationMs,
    })
  })
  return () => session.stop()
}, [currentPhase])
```
TeacherChatBar.tsx
```typescript
function handleSubmit(input: string) {
  postMessage(input)
  if (HELP_PATTERN.test(input)) {
    const ctx = resolveHelpContext(pathname, phase, tab, userRole)
    const script = getHelpScript(ctx, user.displayName)
    setTimeout(async () => {
      const reply = await callTeacherHelpApi(script, input, user.displayName)
      teacherSend(reply)
      playTeacherVoice(reply)   // Google Cloud TTS — teacher voice only
    }, 2000 + Math.random() * 2000)
  }
}
```
---

# Critical Rules for Implementation

1. **`stop()` must be airtight.** Store every `setTimeout` and `setInterval` handle in a `handles: ReturnType<typeof setTimeout>[]` array. In `stop()`: `handles.forEach(clearTimeout)`. Stale timers posting after unmount will cause ghost messages.

2. **`stopped` flag.** Set `stopped = true` in `stop()`. Check `if (stopped) return` at the top of every timer callback before calling `sendChat` or `teacherSend`.

3. **Nomsa's 30% rule.** In the register chat response pool, only add Nomsa to the candidate array if `Math.random() < 0.3`.

4. **Smart/Stupid is decided fresh each Phase III session.** Never cache tier assignment between sessions. `assignPhase3Bots` runs on every Phase III entry.

5. **Anthropic API for teacher help widget only.** All scripted bot messages use hardcoded strings. Only `callTeacherHelpApi` in `teacherHelpApi.ts` calls the Anthropic API.

6. **Voice is teacher only.** Only Mr. Bot's responses trigger `window.speechSynthesis.speak()`. All student/learner bot messages are text only.

7. **Content safety always applies.** No scripted bot message may contain language or references outside the school/task context. The Anthropic API system prompt includes a hard safety instruction that overrides the model's default behaviour. If the API returns an off-topic or inappropriate response (detectable by tone-checking the start of the reply), fall back to the generic redirect: *"Let's keep focused on your learning task, [name]. What would you like help with?"*

8. **`aiBotsEnabled` gates the teacher help widget API calls.** When the `devStore.aiBotsEnabled` flag is `false`, the widget still renders and Mr. Bot can receive messages, but instead of calling the API it posts a scripted placeholder: *"[Dev mode — AI bots disabled. Enable via the DEV toggle bottom-left to activate live responses.]"*

## bots update
see the discussion I had below with an AI. I want to rename the roles, instead of leader - participation checker, timer remains timer, scribe stays scribe, angle checker becomes discussion checker. The text explains changes to the scribe and angle checker (now discussion checker) roles.

Stella Logos Cooperative Learning System: Software Design Specification
This document establishes the pedagogical philosophy, interface components, state mechanics, and database validation constraints for the synchronous learning phase of the platform. It provides the implementation directives for your AI programmer.

1. Core Pedagogical Philosophy
The platform utilizes user interface constraints to move learners from unstructured problem spaces to rigorous, systematic solutions through structured collaboration.

Intrapersonal (Navigating Ambiguity): Real life is unstructured. The system forces individual learners to establish a personal analytic framework to systematically break a raw problem down into core definitions, metrics, and actionable variables before receiving formal instruction.

Interpersonal (High-Accountability Architecture): Traditional online group work fails due to social loafing, passive participants, and conversational drift. The platform solves this by locking the synchronous workspace into four narrow, tool-constrained operational profiles. The group cannot advance or submit its work unless each role actively fulfills its strict technical objectives.

2. Global Integration Notes (Updates to Existing Modules)
While the Participation Checker and Timer workflows are already structurally established in your system, the following operational logic parameters must be integrated into their codebeds:

Participation Checker: Gatekeeping & Technical Fallbacks
The Target Lock Hook: When the Participation Checker clicks an individual’s avatar row to challenge them (e.g., “@Thabo, what is your input on this question?”), the system fires a global state lock event. The chat input text fields for all other active group members immediately transit to a disabled (read-only) state. The chat room remains completely frozen until the targeted student transmits a message block to the stream.

The Automated AI Bot Fallback: If the chat remains locked by a target challenge for longer than 45 seconds (indicating a user disconnect, hardware failure, or severe technical difficulty), a system timeout occurs. The platform strips the role from the unresponsive user, opens a persistent system notification panel ("System: User Thabo disconnected. Auto-Bot assigned to role"), and an AI Bot immediately takes over that role script for the remainder of the live session to keep the workspace from soft-locking.

Timer: Session Ignition Gate
The Start Discussion Constraint: When Phase III initializes, the entire team chat room is set to an inactive, read-only buffer state. The countdown engines do not tick, and text fields are locked. The entire live cooperative discussion session is programmatically queued until the Timer explicitly triggers the global canvas state event by clicking the [Start Discussion] button.

3. Module Specification: The Notes Keeper
Core Mandate
Aggregates unstructured raw strings from the live streaming conversation window, organizes those components textually on an optimization workspace canvas without manual typing, and compiles the team's official output text for final database entry.

Interface & UI Functionality
Dual-Panel Workspace UI: * Left Panel: Active, scrolling real-time chat stream component.

Right Panel: The Notes Keeper’s private drafting canvas (The Compilation Dashboard).

The Message Capture Hook (Event Handler): On the Left Panel, hovering over any discrete user message block attaches an overlay button labeled [Capture Message to Scrapbook]. On-Click Execution: The system copies the string payload (message body + author's unique user ID) and appends it as an isolated, draggable block element ("Logic Card") into the Scribe's private Right Panel canvas.

The Drag-and-Drop Ordering Engine: The Right Panel container manages the captured elements via a fluid vertical layout array. The Notes Keeper can drag, drop, shift, stack, and prioritize cards to sort user statements into a logical order.

The Global Viewport State Event (Final Assembly Mode):

Trigger: The Participation Checker executes the global state transformation [Trigger Final Compilation Mode].

System Action: A structural UI update forces the Notes Keeper’s compilation panel to render globally across all team member monitors side-by-side with the chat stream.

Permissions Logic: The Notes Keeper retains exclusive write and edit permissions on this shared output canvas. Other users are locked to a Read-Only state—watching the Notes Keeper synthesize, rephrase, and finalize the structured layout document live.

Submission Gatekeeper: The Notes Keeper viewport renders a unique terminal [Submit Group Solution] validation endpoint button which closes the cooperative phase.

Execution Examples (System Interactions)
Step 1: Capture Phase * Chat Stream (Left Panel): [Thabo]: We should make sure the speaker directly looks at the audience members in the eye.

Notes Keeper Action: Hovers over Thabo's text, clicks [Capture].

Scrapbook Canvas (Right Panel): A movable visual card populates containing text: "Thabo: We should make sure the speaker directly looks at the audience members in the eye."

Step 2: Sorting Phase

The Notes Keeper captures strings from Sarah and Chris, then physically drags Sarah's card to position #1, Thabo's card to position #2, and Chris's card to position #3 to form a coherent presentation delivery checklist.

Step 3: Global Compilation Phase

All Peer Monitors Transition: Screen splits 50/50. Everyone sees the Notes Keeper live-typing into the final solution textbox: "Based on team debate, our strategy focuses on maintaining high audience eye contact [Thabo] and structuring clear transitions [Sarah]..."

4. Module Specification: The Discussion Checker
Core Mandate
Monitors the real-time group dialogue stream to prevent topic drift, ensuring that the team systematically addresses three structural vectors required to construct a valid final plan: The Solution, The Execution Steps, and The Evaluation / Quality Audit.

Interface & UI Functionality
The Dynamic Structural Target HUD: A persistent side-panel widget rendered exclusively inside the Discussion Checker’s dashboard. It contains three visual state checkboxes tracking conversational completeness:

[ ] Vector 1: The Solution

[ ] Vector 2: The Execution Steps

[ ] Vector 3: The Evaluation / Quality Audit

Direct Conversational Prompt Buttons: Three explicit, high-visibility action buttons mapped directly to the tracking HUD. When clicked, these buttons inject a hardcoded, highly visible system-styled structural prompt into the public chat stream to redirect the team:

Button 1: [Prompt: Define Solution]

System Action: Broadcasts public chat message: 💬 Discussion Checker: We need to talk about the solution first. What is our concrete plan or answer?

Button 2: [Prompt: Track Steps]

System Action: Broadcasts public chat message: 💬 Discussion Checker: We need to talk about the steps on how to get to the solution. What is our step-by-step roadmap?

Button 3: [Prompt: Audit Best Fit]

System Action: Broadcasts public chat message: 💬 Discussion Checker: We need to talk about how we will know if this solution is the best possible solution. How are we checking its quality?

The Discussion Pulse (Attention Loop): A prominent button labeled [Confirm Discussion Check] governed by an active frontend countdown ticker that locks and refreshes every 30 seconds. The Discussion Checker is system-mandated to click this button within every 30-second window to prove active presence. On-Click Execution: Resets the countdown and pushes an automated status log directly to the room text stream: System: Discussion Checker is actively monitoring dialogue alignment parameters.

Backend Database Validation Logic: The SQL backend tracks the invocation metrics for all three Direct Conversational Prompt Buttons during Phase III. The system throws a validation block and completely prevents the group from submitting their final work or advancing to the next phase if the database logs reveal that the Discussion Checker has failed to deploy all three prompts (Define Solution, Track Steps, and Audit Best Fit) at least once prior to the final compilation mode trigger.

AI Bot Fallback Script & Dialogue Corpus
If the designated human student fails to click the Discussion Pulse button within the 30-second window or triggers a system disconnect, the AI Bot immediately assumes the Discussion Checker profile.

The programmer must hook the backend LLM engine to scan the incoming chat logs for semantic gaps regarding the three vectors and use the following structural behavioral scripts to drive the team:

Prompt 1 script: When the group is debating abstract ideas without selecting a concrete answer
AI Bot System Output Context: Inject when chat stream lacks structural conclusion markers.

AI Bot Live Chat Output Example: > "💬 Discussion Checker (Bot): Team, let's focus. We need to talk about the solution first. What is our concrete plan or answer to this challenge?"

Prompt 2 script: When the group selects an answer but ignores the execution roadmap
AI Bot System Output Context: Inject when an answer is decided but no processing verbs or sequenced indices are appearing in the chat logs.

AI Bot Live Chat Output Example: > "💬 Discussion Checker (Bot): We have an answer, but we need to talk about the steps on how to get to the solution. What is our step-by-step roadmap to make this happen?"

Prompt 3 script: When the group has steps but fails to critique the viability or rubric parameters
AI Bot System Output Context: Inject before the compilation phase to force reflective evaluation.

AI Bot Live Chat Output Example: > "💬 Discussion Checker (Bot): Before we wrap this up, we need to talk about how we will know if this solution is the best possible solution. What criteria are we using to check our quality?"