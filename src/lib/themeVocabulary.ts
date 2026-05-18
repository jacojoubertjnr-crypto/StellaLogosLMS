// Parsed shape used by components (functions derived from raw templates)
export interface ThemeVocab {
  currencyLabel: string
  actionVerbStart: string
  actionVerbContinue: string
  taskNumberLabel: (current: number, total: number) => string
  taskCompleteTitle: string
  taskCompleteBody: string
  taskDescSuffix: string
  stepFallbackTitle: (n: number) => string
  tileAttendance: string
  tileSubjects: string
  tileMessages: string
  tileShop: string
  attendancePageTitle: string
  attendanceCheckInLabel: string
  attendanceCheckedInLabel: string
  attendanceReturnLabel: string
  subjectsPageTitle: string
  subjectsCountLabel: string
  subjectsReturnLabel: string
  messagesPageTitle: string
  messagesReturnLabel: string
  shopPageTitle: string
}

// Raw shape of each JSON file in public/assets/themeVocabulary/
export interface RawVocab {
  currencyLabel: string
  actionVerbStart: string
  actionVerbContinue: string
  taskNumberTemplate: string
  taskCompleteTitle: string
  taskCompleteBody: string
  taskDescSuffix: string
  stepFallbackTemplate: string
  stepTitles: Record<string, string>
  tileAttendance: string
  tileSubjects: string
  tileMessages: string
  tileShop: string
  attendancePageTitle: string
  attendanceCheckInLabel: string
  attendanceCheckedInLabel: string
  attendanceReturnLabel: string
  subjectsPageTitle: string
  subjectsCountLabel: string
  subjectsReturnLabel: string
  messagesPageTitle: string
  messagesReturnLabel: string
  shopPageTitle: string
}

export function parseRawVocab(raw: RawVocab): ThemeVocab {
  return {
    currencyLabel:      raw.currencyLabel,
    actionVerbStart:    raw.actionVerbStart,
    actionVerbContinue: raw.actionVerbContinue,
    taskNumberLabel:    (c, t) => raw.taskNumberTemplate
                          .replace('{current}', String(c))
                          .replace('{total}', String(t)),
    taskCompleteTitle:  raw.taskCompleteTitle,
    taskCompleteBody:   raw.taskCompleteBody,
    taskDescSuffix:     raw.taskDescSuffix,
    stepFallbackTitle:  (n) => raw.stepTitles?.[String(n)]
                          ?? raw.stepFallbackTemplate.replace('{n}', String(n)),
    tileAttendance:          raw.tileAttendance,
    tileSubjects:             raw.tileSubjects,
    tileMessages:            raw.tileMessages,
    tileShop:                raw.tileShop,
    attendancePageTitle:     raw.attendancePageTitle,
    attendanceCheckInLabel:  raw.attendanceCheckInLabel,
    attendanceCheckedInLabel: raw.attendanceCheckedInLabel,
    attendanceReturnLabel:   raw.attendanceReturnLabel,
    subjectsPageTitle:        raw.subjectsPageTitle,
    subjectsCountLabel:    raw.subjectsCountLabel,
    subjectsReturnLabel:      raw.subjectsReturnLabel,
    messagesPageTitle:        raw.messagesPageTitle,
    messagesReturnLabel:      raw.messagesReturnLabel,
    shopPageTitle:            raw.shopPageTitle,
  }
}

// Hardcoded safety-net fallback — matches default.json exactly.
// Used only for the instant before the JSON file loads.
export const FALLBACK_VOCAB: ThemeVocab = parseRawVocab({
  currencyLabel: 'PTS',
  actionVerbStart: 'START',
  actionVerbContinue: 'CONTINUE',
  taskNumberTemplate: 'LEARNING TASK {current} OF {total}',
  taskCompleteTitle: 'ALL TASKS COMPLETE!',
  taskCompleteBody: 'You have completed all learning tasks.\nCheck back for new tasks.',
  taskDescSuffix: 'advance your progress',
  stepFallbackTemplate: 'LEARNING TASK {n}',
  stepTitles: {},
  tileAttendance: 'Attendance',
  tileSubjects: 'My Subjects',
  tileMessages: 'Messages',
  tileShop: 'Shop',
  attendancePageTitle: 'ATTENDANCE',
  attendanceCheckInLabel: 'SIGN IN',
  attendanceCheckedInLabel: 'SIGNED IN',
  attendanceReturnLabel: 'RETURN TO HOME',
  subjectsPageTitle: 'MY SUBJECTS',
  subjectsCountLabel: 'SUBJECTS',
  subjectsReturnLabel: 'RETURN TO HOME',
  messagesPageTitle: 'MESSAGES',
  messagesReturnLabel: 'RETURN TO HOME',
  shopPageTitle: 'SHOP',
})
