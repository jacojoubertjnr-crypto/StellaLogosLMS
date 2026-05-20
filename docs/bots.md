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

| # | Name | Role | Tier | Quiz Accuracy | Personality |
|---|---|---|---|---|---|
| 1 | AriaBOT | Leader | Smart | 82% | Decisive, organised, keeps discussion on track |
| 2 | FinnBOT | Leader | Stupid | 33% | Well-meaning but uncertain, advances questions too fast |
| 3 | ConradBOT | Timer | Smart | 78% | Punctual, clear alerts, good pace management |
| 4 | OllieBOT | Timer | Stupid | 30% | Forgetful, late warnings, misses pulses |
| 5 | PetraBOT | Scribe | Smart | 80% | Accurate captures, clear draft, triggers Final Solution well |
| 6 | MilaBOT | Scribe | Stupid | 28% | Disorganised, captures wrong things, slow to finalise |
| 7 | RexBOT | Angle Checker | Smart | 85% | Genuine contrarian, raises real alternative perspectives |
| 8 | BeaBOT | Angle Checker | Stupid | 25% | Superficial, agrees with group, trivial challenges |

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
| `/task` | `phase === 3`, `role === 'angle-checker'` | Phase III Angle Checker help |
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

The bot **dialogue is fully scripted** (hardcoded strings — see scripts in this document).
Do **NOT** call the Anthropic API for scripted bot chat messages.

The Anthropic API (`claude-sonnet-4-6`) is used **only** in the global Teacher Help Widget (`TeacherHelpWidget.tsx`). Every message the learner types to Mr. Bot goes through the API with a strict safety system prompt — not a hardcoded reply.

**Architecture — browser → Vite proxy → Express → Anthropic:**
The browser never calls the Anthropic API directly (CORS blocks it). All calls go:
`TeacherHelpWidget` → `POST /teacher-help` (Vite proxy) → Express endpoint (`backend/src/index.ts`) → `https://api.anthropic.com/v1/messages`

The API key lives in `backend/.env` only — never in client code or `.env.local`. The Express endpoint is JWT-gated (reads `Authorization: Bearer <token>` and calls `verifyToken`).

**Dev note:** Curro Holdings corporate network uses SSL inspection (MITM). The backend has `NODE_TLS_REJECT_UNAUTHORIZED=0` guarded by `NODE_ENV !== 'production'` to allow outbound HTTPS in dev.

**Cost note:** Sonnet 4.6 costs ~$0.003 per response at 300 tokens. A typical session = 2–5 help queries = < $0.02/session.

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

