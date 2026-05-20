// All Anthropic API calls go through /teacher-help on our Express backend.
// The API key lives in backend/.env — never in the browser.

const PAGE_CONTEXTS: Record<string, string> = {
  home:           'The student is on the Home screen. They can tap the portal to go to their current Learning Task, or use the tiles to access Attendance, My Subjects, Messages, and the Shop.',
  attendence:     'The student is on the Attendance / Register screen. They can check in, view their timetable (with assessment due dates), read class chat, and access announcements via the ticker at the top.',
  learningtask:   'The student is on the Quest Path screen showing their step-by-step progress through a Learning Task. Completed steps are ticked; the active step is glowing; locked steps must be unlocked by completing earlier ones.',
  subjects:       'The student is on the My Subjects screen showing all enrolled subjects with progress bars for each active Learning Task.',
  social:         'The student is on the Messages screen. They can read and send 1:1 and group chat messages with classmates and their teacher.',
  shop:           'The student is on the Shop screen. They can browse and purchase themes, colour schemes, sprites, and soundtracks using their Gold balance earned from completing task steps.',
  learningTask_phase1: 'The student is in Phase I of the Learning Task — the Metacognitive Scaffold / Challenge phase. They must read the scenario and answer four reflection questions (core problem, criteria, solution, self-audit) before continuing.',
  learningTask_phase2_resources: 'The student is in Phase II of the Learning Task on the Resource Hub tab. They should watch the video and read the PDF before attempting the quiz.',
  learningTask_phase2_quiz: 'The student is in Phase II of the Learning Task on the Blind Quiz tab. They should answer all 20 questions and submit. No marks are shown immediately — results are revealed in the group discussion.',
  learningTask_phase3: 'The student is in Phase III — the Cooperative Group Discussion. They have been assigned a role (Leader, Timer, Scribe, or Angle Checker). The group must discuss all 20 quiz questions and produce a collaborative final solution.',
  learningTask_phase4: 'The student is in Phase IV — the Recalibration Quiz. This is a second attempt at the quiz after the group discussion. The questions and options are reshuffled. Their Phase III Keep/Change decisions are shown as hints.',
  learningTask_phase5: 'The student is in Phase V — the Final Submission. They must upload a video, PDF, or document that addresses the original challenge scenario using the strategy their group developed.',
}

export function getPageContext(pathname: string, phase?: number, tab?: string): string {
  if (pathname === '/task' && phase !== undefined) {
    if (phase === 1) return PAGE_CONTEXTS['learningTask_phase1']
    if (phase === 2 && tab === 'resources') return PAGE_CONTEXTS['learningTask_phase2_resources']
    if (phase === 2) return PAGE_CONTEXTS['learningTask_phase2_quiz']
    if (phase === 3) return PAGE_CONTEXTS['learningTask_phase3']
    if (phase === 4) return PAGE_CONTEXTS['learningTask_phase4']
    if (phase === 5) return PAGE_CONTEXTS['learningTask_phase5']
  }
  const key = pathname.replace('/', '') || 'home'
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
