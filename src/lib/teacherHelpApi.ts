// All Anthropic API calls go through /teacher-help on our Express backend.
// The API key lives in backend/.env — never in the browser.

const PAGE_CONTEXTS: Record<string, string> = {
  home: `The student is on the Home screen (HomeCrossroads).
The large glowing portal in the centre is the PRIMARY ACTION — tapping it takes them directly to their current Learning Task at the step they left off.
Below it are four tiles: ATTENDANCE (check in, view timetable, class chat), MY SUBJECTS (all subjects with progress bars), MESSAGES (1:1 and group chat with classmates and teacher), and SHOP (spend Gold on themes and cosmetic items).
In the top-right header: their Gold balance and a LOGOUT button. Top-left: their name and avatar.
If they want to start or continue a learning task, they tap the portal. If they want to check today's timetable or mark attendance, they tap ATTENDANCE.`,

  attendence: `The student is on the Attendance and Register screen.
At the very top is a scrolling TICKER BAR showing school-wide announcements — tapping it opens the full announcement.
Below that is a CHECK IN button with their current streak. They must tap this to log their attendance for today.
The TIMETABLE section shows their full schedule for today and the next several school days. They can tap the ◀ ▶ arrows to navigate days. Any row with an amber highlight has an assessment due — tapping that row opens a Task Detail popup showing the subject, due date, and a HAND IN ASSIGNMENT button.
Below the timetable is CLASS CHAT — a group thread with their classmates and teacher. They can type and press Enter to send.
At the bottom of the timetable section is a GO TO LESSON button that takes them straight to the Learning Task.`,

  learningtask: `The student is on the Quest Path screen for their current subject.
Each circle on the path represents one step of the Learning Task. A glowing pulsing circle is the step they should work on next. A circle with a tick is already complete. A locked circle means they must finish earlier steps first.
Tapping their active step opens a panel on the right showing the step title and description. From there they press START LEARNING TASK to enter the actual task.
Completing all steps earns bonus Gold. The header shows a BACK button to return to the Home screen.`,

  subjects: `The student is on the My Subjects screen showing all their enrolled subjects.
Each subject card shows: the subject name and grade, a progress bar for their current Learning Task, and the step count (e.g. Step 2 of 6). The percentage shows how far through the full task they are.
Tapping a subject card navigates to the Quest Path for that subject.
The IT subject card reflects live progress from the database. Other subjects may show placeholder data.`,

  social: `The student is on the Messages screen.
The left panel lists all their conversations with an unread badge count. Tapping a conversation opens the message thread on the right.
To start a new 1:1 chat: tap the + NEW CHAT button and pick a classmate from the contact list.
To create a group chat: tap + NEW GROUP and select multiple contacts. The group name is auto-generated.
Type a message in the input at the bottom and press Enter or SEND to send it. Messages from the student's own account appear on the right in gold; others appear on the left in blue.`,

  shop: `The student is on the Shop screen.
Their Gold balance is shown at the top — they earn Gold by completing Learning Task steps (10 pts per step, 50 bonus on quest completion).
The shop is organised by theme — they select a theme first using the theme selector row at the top, then browse category tabs: BACKGROUNDS (page background previews, included with the theme), ALT BACKGROUNDS (purchasable alternate backgrounds), SPRITES (animated characters), SOUNDTRACKS, and COLOUR SCHEMES.
To buy an item: tap BUY. Gold is deducted immediately. Then tap EQUIP to make it active. Active themes and colour schemes change the look of the whole app. Sprites appear on specific pages (shown in the item description).`,

  learningTask_phase1: `The student is in Phase I of the Learning Task — the Metacognitive Scaffold (Challenge and Reflection phase).
The top panel shows the CHALLENGE SCENARIO — a real-world problem they will work toward solving throughout the entire task. They should read it carefully before answering.
Below that are four mandatory reflection questions they must answer IN THEIR OWN WORDS before they can proceed:
1. What is the CORE PROBLEM? (identify the main issue in the scenario)
2. What are the CRITERIA for a good solution? (what would make an answer correct or useful?)
3. What is their INITIAL SOLUTION? (their best attempt at an answer right now, before seeing the content)
4. SELF-AUDIT — on reflection, is their solution actually the best approach? What could they improve?
Each answer needs at least 10 characters typed before the NEXT button unlocks. There are no wrong answers in this phase — the goal is to capture honest thinking before the content influences them. Their answers become their "Member Solution" card visible to the group in Phase III.`,

  learningTask_phase2_resources: `The student is in Phase II of the Learning Task on the RESOURCE HUB tab.
This tab has two resource tiles: a VIDEO tile and a DOCUMENT (PDF) tile. They should engage with both before attempting the quiz.
The video covers the key concepts needed to solve the Challenge. The PDF provides supporting material and detail.
When they feel ready, they should click the QUIZ tab at the top (or the GO TO QUIZ button at the bottom) to attempt the blind quiz. They do not need to memorise everything perfectly — the group discussion in Phase III will fill in any gaps.`,

  learningTask_phase2_quiz: `The student is in Phase II of the Learning Task on the BLIND QUIZ tab.
The quiz has 20 questions shown one at a time. They choose one answer per question and use the BACK and NEXT buttons to navigate. A dot strip at the top shows which questions they have answered.
IMPORTANT: after submitting, no marks are shown. This is intentional — it is called a "blind quiz" because seeing their score now would bias their thinking in the group discussion. Their answers will be compared with their groupmates' answers in Phase III, where the real learning happens through discussion.
They should commit to their best thinking and press SUBMIT when all 20 questions are answered. The answer options are shuffled — focus on the concept, not the position (A/B/C/D).`,

  learningTask_phase3_leader: `The student is in Phase III (Cooperative Group Discussion) as the LEADER.
As Leader, they control the pace of the discussion. Their responsibilities:
— NEXT QUESTION button: press this to push the current question to the group one at a time. The DISTRIBUTION CHART on their panel shows how every group member answered that question — focus discussion on questions where the group is most split.
— PARTICIPATION PULSE: a button they must click every 20 seconds to maintain "Active" status in the system. Missing it changes their status to "Inactive."
— PROMPTER icons: small buttons with each member's name. Clicking one sends a direct prompt in the chat asking that person for their input — useful for quiet members.
— Once all 20 questions have been discussed, they signal the Scribe to write up the group's final solution.
The group chat runs in the right panel. They can also type messages there at any time.`,

  learningTask_phase3_timer: `The student is in Phase III (Cooperative Group Discussion) as the TIMER.
As Timer, they manage the group's time. Their tools:
— Private countdown: only they can see the exact remaining time. This is intentional — showing countdown to everyone creates anxiety and disrupts discussion.
— DIVIDE TIME button: splits the remaining session time evenly across the remaining questions, giving a suggested time-per-question.
— TIME STATUS pulse: a button they press every 30 seconds to post a time update in the chat — but without revealing the exact remaining time.
— MOVE ON ALERT: a button that posts a group alert when the group is clearly stalling on one question. This is their authority as Timer — the group depends on them to call it.
The group chat is in the right panel. They should watch the clock and keep the group progressing.`,

  learningTask_phase3_scribe: `The student is in Phase III (Cooperative Group Discussion) as the SCRIBE.
As Scribe, they are the group's memory and writer. Their workflow:
— CAPTURE: a small ✎ icon appears next to each chat message. Clicking it adds that message to their NOTEBOOK (the draft panel below the chat). They should capture key insights as the discussion progresses.
— NOTEBOOK reordering: once captured, they can drag points up or down using the ▲▼ handles to arrange them into a logical order.
— GROUP DRAFT SOLUTION: below the notebook is a text area where they build the final written solution. They can also click the ADD TO DRAFT button on any member's solution card.
— SUBMIT FINAL SOLUTION button: when the draft is ready (minimum 20 characters), this triggers the Final Solution phase — everyone's screen shows the draft for collective review.
They should not wait too long — the group is depending on them to produce a final answer before time runs out.`,

  learningTask_phase3_anglechecker: `The student is in Phase III (Cooperative Group Discussion) as the ANGLE CHECKER.
As Angle Checker, their job is constructive skepticism — NOT agreement. Even if they personally agree with the group, they must push back.
Their tools:
— ANTI-GROUPTHINK TRIAD: three buttons they MUST use at least once each before the session ends:
  ◈ ALTERNATIVE PERSPECTIVE — is there a completely different conclusion the evidence supports?
  ◈ DEVIL'S ADVOCATE — if the group is wrong, what would that look like?
  ◈ BLIND SPOT CHECK — what is the group assuming without verifying?
— PERSPECTIVE PULSE: a button they press every 30 seconds to signal they are actively monitoring the group's logic.
The system tracks whether they used all three triad buttons. Skipping them means their Angle Checker role is incomplete. Even trivial challenges count — the habit of questioning is the goal.`,

  learningTask_phase3_learner: `The student is in Phase III (Cooperative Group Discussion) as a GENERAL LEARNER.
As a General Learner, they observe the discussion and make decisions about their own quiz answers:
— As the Leader advances each question, they see the DISTRIBUTION CHART showing how everyone in the group answered it.
— For each question they press either KEEP MY ANSWER (still confident in their original answer) or I WANT TO CHANGE (the discussion shifted their thinking).
— There is no penalty for changing. This phase is designed to help them revise their thinking through social reasoning.
— Their Keep/Change decisions are carried forward into Phase IV (the Recalibration Quiz) as visual hints.
They should participate in the group chat and share their perspective, even as a General Learner.`,

  learningTask_phase3: `The student is in Phase III — the Cooperative Group Discussion.
They have been assigned one of four roles: Leader, Timer, Scribe, or Angle Checker. Each role has specific tools and responsibilities shown in the left panel.
The group chat is in the right panel. The challenge scenario and member solutions are shown below.
If they need role-specific help, they should tell Mr. Bot which role they have been assigned.`,

  learningTask_phase4: `The student is in Phase IV — the Recalibration Quiz.
This is a second attempt at the exact same 20 questions from Phase II, after the group discussion has (hopefully) improved their understanding.
Key differences from Phase II: the questions and answer options have been reshuffled (do not rely on remembered positions — think about the concept). Some questions show a small hint icon indicating their Phase III Keep/Change decision — use this as an anchor for their revised thinking.
Most students score higher in Phase IV than Phase II because the group discussion fills in gaps that solo study misses. They should answer based on what they now understand, not what they guessed the first time.`,

  learningTask_phase5: `The student is in Phase V — the Final Submission.
This is the last step of the Learning Task. They submit a final artifact that demonstrates their understanding of the original Challenge scenario.
Steps: choose a submission type (VIDEO, PDF, or DOCUMENT), then drag their file into the upload drop zone. They can add comments explaining their reasoning or process.
Their submission should address the original Challenge scenario using the strategy their group developed and refined during the cooperative discussion. It does not need to be perfect — it should show their thinking.
Pressing SUBMIT completes the Learning Task, awards their completion Gold, and records their journey in the system.`,
}

export function getPageContext(pathname: string, phase?: number, tab?: string, role?: string): string {
  if (pathname === '/task') {
    if (!phase || phase === 0 || phase === 1) return PAGE_CONTEXTS['learningTask_phase1']
    if (phase === 2 && tab === 'resources') return PAGE_CONTEXTS['learningTask_phase2_resources']
    if (phase === 2) return PAGE_CONTEXTS['learningTask_phase2_quiz']
    if (phase === 3) {
      if (role === 'leader')        return PAGE_CONTEXTS['learningTask_phase3_leader']
      if (role === 'timer')         return PAGE_CONTEXTS['learningTask_phase3_timer']
      if (role === 'scribe')        return PAGE_CONTEXTS['learningTask_phase3_scribe']
      if (role === 'angle-checker') return PAGE_CONTEXTS['learningTask_phase3_anglechecker']
      if (role === 'learner')       return PAGE_CONTEXTS['learningTask_phase3_learner']
      return PAGE_CONTEXTS['learningTask_phase3']
    }
    if (phase === 4) return PAGE_CONTEXTS['learningTask_phase4']
    if (phase === 5) return PAGE_CONTEXTS['learningTask_phase5']
  }
  const key = pathname.replace(/^\//, '') || 'home'
  return PAGE_CONTEXTS[key] ?? PAGE_CONTEXTS['home']
}

export async function callTeacherHelpApi(
  pageContext: string,
  userMessage: string,
  displayName: string,
  jwtToken: string,
): Promise<string> {
  const response = await fetch('/teacher-help', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`,
    },
    body: JSON.stringify({ pageContext, userMessage, displayName }),
  })

  if (!response.ok) {
    throw new Error(`Proxy error ${response.status}`)
  }

  const data = await response.json() as { reply?: string }
  return data.reply || "I'm not sure about that — could you try rephrasing your question?"
}

export function speakTeacherReply(text: string): void {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-ZA'
  utterance.rate = 0.95
  utterance.pitch = 0.9
  window.speechSynthesis.speak(utterance)
}
