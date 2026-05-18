// ─────────────────────────────────────────────────────────────────────────────
// Mock learner state — used by LearnerHome while real data layer is wired up.
// Replace each field with a live store/query when the corresponding phase ships.
// ─────────────────────────────────────────────────────────────────────────────

export const mockLearnerState = {
  // CurrencyCounter [The Gold Pouch]
  gold: 1500,

  // PrimaryAction [The Great Portal] — timetable-driven, hardcoded for now
  primaryAction: {
    questLabel: 'LT1 · INTRO TO JAVA',
    classLabel: 'IT · Grade 10',
    currentStep: 0,
    totalSteps: 5,
  },

  // AttendanceModule [The Town Square]
  attendance: {
    streakDays: 12,
    checkedInToday: false,
  },
}

// AttendanceModule [The Tavern] — daily register, timetable, roster, class chat
export const mockAttendance = {
  streakDays: 12,
  checkedInToday: false,
  notices: [
    { id: 1, author: 'Admin Office',      role: 'Administration',   message: 'Grade 10 school photos will be taken on Wednesday. All learners must be in full, clean school uniform. Hair must be neat and tidy. Learners not in correct uniform will not be photographed.', time: '07:45' },
    { id: 2, author: 'Mr. Joubert',       role: 'Sports',           message: 'Tennis players — please meet Mr. Joubert in the QUAD during first break today. This applies to anyone who signed up for the inter-school fixture on Friday.', time: '07:50' },
    { id: 3, author: 'Sports Department', role: 'Sports & Culture', message: 'Rugby practice this afternoon is moved to 15:30 due to the field being remarked this morning. All players must be on the back field by 15:25. Please bring both jerseys.', time: '08:05' },
    { id: 4, author: 'Admin Office',      role: 'Administration',   message: 'The school library will be closed Thursday and Friday for stock-taking and maintenance. All borrowed books must be returned by Wednesday afternoon to avoid an overdue mark on your account.', time: '08:15' },
    { id: 5, author: 'Mrs. van Wyk',      role: 'Culture',          message: 'Auditions for the Winter Concert will be held in the Music Room on Thursday at lunch. Any learner in any grade is welcome to audition — singing, instruments, and spoken word all accepted.', time: '08:20' },
    { id: 6, author: 'Sports Department', role: 'Sports & Culture', message: 'Netball girls: the bus for Saturday\'s tournament departs at 07:00 sharp from the main gate. Bring your kit, a packed lunch, and a signed indemnity form. No form, no travel.', time: '08:30' },
    { id: 7, author: 'Admin Office',      role: 'Administration',   message: 'A lost water bottle (blue Hydro Flask, name label "K. Smit") was handed in at reception. Please collect before the end of the school day or it will be placed in the lost property box.', time: '08:35' },
    { id: 8, author: 'Mr. Steyn',         role: 'Pastoral',         message: 'The Grade 10 camp information evening for parents will be held in the school hall on Tuesday at 18:30. Learners do not need to attend — this session is for parents and guardians only.', time: '08:40' },
    { id: 9, author: 'Admin Office',      role: 'Administration',   message: 'Reminder: the tuck shop will be closed on Friday due to a staff training day. Learners are encouraged to bring a packed lunch. The water dispensers in the foyer will remain available.', time: '08:50' },
    { id: 10, author: 'Ms. Johnson',     role: 'English Home Language',  message: 'Comprehension and language section test on Friday. Covers Chapters 4–6 of the prescribed reader. Ensure you have read all three chapters and reviewed your class notes.', time: '09:05' },
  ],
  timetable: [
    { period: 1, time: '08:00–08:45', subject: 'Information Technology',   teacher: 'Mr. van der Berg',room: 'Computer Lab 1', status: 'current'  },
    { period: 2, time: '08:45–09:30', subject: 'English Home Language',    teacher: 'Ms. Johnson',     room: 'B102',           status: 'upcoming' },
    { period: 3, time: '09:30–10:15', subject: 'Mathematics',              teacher: 'Mr. Smith',       room: 'A204',           status: 'upcoming' },
    { period: 4, time: '10:30–11:15', subject: 'Geography',                teacher: 'Mrs. Naidoo',     room: 'C305',           status: 'upcoming' },
    { period: 5, time: '11:15–12:00', subject: 'Afrikaans FAL',            teacher: 'Mnr. Botha',      room: 'A101',           status: 'upcoming' },
    { period: 6, time: '13:00–13:45', subject: 'Life Orientation',         teacher: 'Ms. Peters',      room: 'Hall',           status: 'upcoming' },
    { period: 7, time: '13:45–14:30', subject: 'CAT',                      teacher: 'Ms. Fourie',      room: 'Computer Lab 2', status: 'upcoming' },
  ] as { period: number; time: string; subject: string; teacher: string; room: string; status: 'done' | 'current' | 'upcoming' }[],
  roster: [
    { id: '1',  name: 'Aimee Botha',      present: true  },
    { id: '2',  name: 'Brendan Cloete',   present: true  },
    { id: '3',  name: 'Carla de Wet',     present: false },
    { id: '4',  name: 'Daniel Erasmus',   present: true  },
    { id: '5',  name: 'Emma Fourie',      present: true  },
    { id: '6',  name: 'Francois Goosen',  present: false },
    { id: '7',  name: 'Gina Heyman',      present: true  },
    { id: '8',  name: 'Hugo Isaacs',      present: true  },
    { id: '9',  name: 'Ingrid Joubert',   present: true  },
    { id: '10', name: 'Jacques Kotze',    present: false },
    { id: '11', name: 'Karen Louw',       present: true  },
    { id: '12', name: 'Liam Meyer',       present: true  },
  ],
  chat: [
    { id: 1,  author: 'Mr. van der Berg', message: 'Good morning 10B. Quick reminders before the day starts — please read the notice board if you have not already.', time: '07:48', isTeacher: true  },
    { id: 2,  author: 'Mr. van der Berg', message: 'Photo day is Wednesday. Full uniform, neat hair. No exceptions — learners not in uniform will not be photographed.', time: '07:49', isTeacher: true  },
    { id: 3,  author: 'Aimee B.',         message: 'Sir does our tie have to be on properly or can it be loosened?',                                  time: '07:51', isTeacher: false },
    { id: 4,  author: 'Mr. van der Berg', message: 'Properly. Collar button closed, tie up. It is a school photo.',                                  time: '07:52', isTeacher: true  },
    { id: 5,  author: 'Mr. van der Berg', message: 'Also — the library closes Thursday and Friday for stock-taking. Return any borrowed books by Wednesday afternoon.', time: '07:53', isTeacher: true  },
    { id: 6,  author: 'Hugo I.',          message: 'I have a library book but I forgot it at home today.',                                           time: '07:55', isTeacher: false },
    { id: 7,  author: 'Mr. van der Berg', message: 'Hugo bring it tomorrow morning at the latest. Wednesday afternoon is the cut-off.',              time: '07:56', isTeacher: true  },
    { id: 8,  author: 'Ingrid J.',        message: 'Sir are you going to the tennis thing at break today?',                                          time: '07:58', isTeacher: false },
    { id: 9,  author: 'Mr. van der Berg', message: 'That is for Mr. Joubert\'s tennis group. If you signed up for the Friday fixture, be at the QUAD at first break.', time: '07:59', isTeacher: true  },
    { id: 10, author: 'Brendan C.',       message: 'I signed up, see you there Ingrid 🎾',                                                          time: '08:00', isTeacher: false },
    { id: 11, author: 'Mr. van der Berg', message: 'Rugby players — practice is moved to 15:30 today. Back field. Both jerseys.',                    time: '08:01', isTeacher: true  },
    { id: 12, author: 'Daniel E.',        message: 'Sir what about those of us who have rugby AND tennis today?',                                    time: '08:02', isTeacher: false },
    { id: 13, author: 'Mr. van der Berg', message: 'Tennis is at first break, rugby is after school — no conflict. You can do both.',                time: '08:03', isTeacher: true  },
    { id: 14, author: 'Gina H.',          message: 'Anyone going to the concert auditions on Thursday? I am thinking of auditioning.',               time: '08:04', isTeacher: false },
    { id: 15, author: 'Karen L.',         message: 'Me too! What are you doing?',                                                                   time: '08:05', isTeacher: false },
    { id: 16, author: 'Mr. van der Berg', message: 'Good initiative. Music Room, Thursday lunch. Any grade, any act.',                               time: '08:06', isTeacher: true  },
    { id: 17, author: 'Liam M.',          message: 'Sir the tuck shop is closed Friday right?',                                                     time: '08:07', isTeacher: false },
    { id: 18, author: 'Mr. van der Berg', message: 'Correct — staff training day. Bring a packed lunch on Friday. Water dispensers in the foyer will be open.', time: '08:08', isTeacher: true  },
  ],
}

// Future timetables — index 0 = tomorrow, 1 = day after, etc. (school days only, no weekends)
export const mockFutureTimetables: { period: number; time: string; subject: string; teacher: string; room: string }[][] = [
  // School day +1 (Thursday)
  [
    { period: 1, time: '08:00–08:45', subject: 'English Home Language',  teacher: 'Ms. Johnson',      room: 'B102'           },
    { period: 2, time: '08:45–09:30', subject: 'Afrikaans FAL',          teacher: 'Mnr. Botha',       room: 'A101'           },
    { period: 3, time: '09:30–10:15', subject: 'Mathematics',            teacher: 'Mr. Smith',        room: 'A204'           },
    { period: 4, time: '10:30–11:15', subject: 'Information Technology', teacher: 'Mr. van der Berg', room: 'Computer Lab 1' },
    { period: 5, time: '11:15–12:00', subject: 'Life Orientation',       teacher: 'Ms. Peters',       room: 'Hall'           },
    { period: 6, time: '13:00–13:45', subject: 'Geography',              teacher: 'Mrs. Naidoo',      room: 'C305'           },
    { period: 7, time: '13:45–14:30', subject: 'CAT',                    teacher: 'Ms. Fourie',       room: 'Computer Lab 2' },
  ],
  // School day +2 (Friday)
  [
    { period: 1, time: '08:00–08:45', subject: 'Mathematics',            teacher: 'Mr. Smith',        room: 'A204'           },
    { period: 2, time: '08:45–09:30', subject: 'CAT',                    teacher: 'Ms. Fourie',       room: 'Computer Lab 2' },
    { period: 3, time: '09:30–10:15', subject: 'English Home Language',  teacher: 'Ms. Johnson',      room: 'B102'           },
    { period: 4, time: '10:30–11:15', subject: 'Afrikaans FAL',          teacher: 'Mnr. Botha',       room: 'A101'           },
    { period: 5, time: '11:15–12:00', subject: 'Information Technology', teacher: 'Mr. van der Berg', room: 'Computer Lab 1' },
    { period: 6, time: '13:00–13:45', subject: 'Geography',              teacher: 'Mrs. Naidoo',      room: 'C305'           },
    { period: 7, time: '13:45–14:30', subject: 'Life Orientation',       teacher: 'Ms. Peters',       room: 'Hall'           },
  ],
  // School day +3 (Monday)
  [
    { period: 1, time: '08:00–08:45', subject: 'Geography',              teacher: 'Mrs. Naidoo',      room: 'C305'           },
    { period: 2, time: '08:45–09:30', subject: 'Mathematics',            teacher: 'Mr. Smith',        room: 'A204'           },
    { period: 3, time: '09:30–10:15', subject: 'Afrikaans FAL',          teacher: 'Mnr. Botha',       room: 'A101'           },
    { period: 4, time: '10:30–11:15', subject: 'English Home Language',  teacher: 'Ms. Johnson',      room: 'B102'           },
    { period: 5, time: '11:15–12:00', subject: 'CAT',                    teacher: 'Ms. Fourie',       room: 'Computer Lab 2' },
    { period: 6, time: '13:00–13:45', subject: 'Information Technology', teacher: 'Mr. van der Berg', room: 'Computer Lab 1' },
    { period: 7, time: '13:45–14:30', subject: 'Life Orientation',       teacher: 'Ms. Peters',       room: 'Hall'           },
  ],
  // School day +4 (Tuesday) — Academic Day 8
  [
    { period: 1, time: '08:00–08:45', subject: 'Life Orientation',       teacher: 'Ms. Peters',       room: 'Hall'           },
    { period: 2, time: '08:45–09:30', subject: 'Information Technology', teacher: 'Mr. van der Berg', room: 'Computer Lab 1' },
    { period: 3, time: '09:30–10:15', subject: 'Geography',              teacher: 'Mrs. Naidoo',      room: 'C305'           },
    { period: 4, time: '10:30–11:15', subject: 'Mathematics',            teacher: 'Mr. Smith',        room: 'A204'           },
    { period: 5, time: '11:15–12:00', subject: 'English Home Language',  teacher: 'Ms. Johnson',      room: 'B102'           },
    { period: 6, time: '13:00–13:45', subject: 'CAT',                    teacher: 'Ms. Fourie',       room: 'Computer Lab 2' },
    { period: 7, time: '13:45–14:30', subject: 'Afrikaans FAL',          teacher: 'Mnr. Botha',       room: 'A101'           },
  ],
  // School day +5 (Wednesday) — Academic Day 9
  [
    { period: 1, time: '08:00–08:45', subject: 'CAT',                    teacher: 'Ms. Fourie',       room: 'Computer Lab 2' },
    { period: 2, time: '08:45–09:30', subject: 'Geography',              teacher: 'Mrs. Naidoo',      room: 'C305'           },
    { period: 3, time: '09:30–10:15', subject: 'Life Orientation',       teacher: 'Ms. Peters',       room: 'Hall'           },
    { period: 4, time: '10:30–11:15', subject: 'Afrikaans FAL',          teacher: 'Mnr. Botha',       room: 'A101'           },
    { period: 5, time: '11:15–12:00', subject: 'Mathematics',            teacher: 'Mr. Smith',        room: 'A204'           },
    { period: 6, time: '13:00–13:45', subject: 'English Home Language',  teacher: 'Ms. Johnson',      room: 'B102'           },
    { period: 7, time: '13:45–14:30', subject: 'Information Technology', teacher: 'Mr. van der Berg', room: 'Computer Lab 1' },
  ],
  // School day +6 (Thursday) — Academic Day 10
  [
    { period: 1, time: '08:00–08:45', subject: 'Afrikaans FAL',          teacher: 'Mnr. Botha',       room: 'A101'           },
    { period: 2, time: '08:45–09:30', subject: 'English Home Language',  teacher: 'Ms. Johnson',      room: 'B102'           },
    { period: 3, time: '09:30–10:15', subject: 'CAT',                    teacher: 'Ms. Fourie',       room: 'Computer Lab 2' },
    { period: 4, time: '10:30–11:15', subject: 'Life Orientation',       teacher: 'Ms. Peters',       room: 'Hall'           },
    { period: 5, time: '11:15–12:00', subject: 'Geography',              teacher: 'Mrs. Naidoo',      room: 'C305'           },
    { period: 6, time: '13:00–13:45', subject: 'Information Technology', teacher: 'Mr. van der Berg', room: 'Computer Lab 1' },
    { period: 7, time: '13:45–14:30', subject: 'Mathematics',            teacher: 'Mr. Smith',        room: 'A204'           },
  ],
  // School day +7 (Friday) — Academic Day 1 (next cycle)
  [
    { period: 1, time: '08:00–08:45', subject: 'Mathematics',            teacher: 'Mr. Smith',        room: 'A204'           },
    { period: 2, time: '08:45–09:30', subject: 'Information Technology', teacher: 'Mr. van der Berg', room: 'Computer Lab 1' },
    { period: 3, time: '09:30–10:15', subject: 'English Home Language',  teacher: 'Ms. Johnson',      room: 'B102'           },
    { period: 4, time: '10:30–11:15', subject: 'Geography',              teacher: 'Mrs. Naidoo',      room: 'C305'           },
    { period: 5, time: '11:15–12:00', subject: 'Afrikaans FAL',          teacher: 'Mnr. Botha',       room: 'A101'           },
    { period: 6, time: '13:00–13:45', subject: 'Life Orientation',       teacher: 'Ms. Peters',       room: 'Hall'           },
    { period: 7, time: '13:45–14:30', subject: 'CAT',                    teacher: 'Ms. Fourie',       room: 'Computer Lab 2' },
  ],
  // School day +8 (Monday) — Academic Day 2 (next cycle)
  [
    { period: 1, time: '08:00–08:45', subject: 'English Home Language',  teacher: 'Ms. Johnson',      room: 'B102'           },
    { period: 2, time: '08:45–09:30', subject: 'Afrikaans FAL',          teacher: 'Mnr. Botha',       room: 'A101'           },
    { period: 3, time: '09:30–10:15', subject: 'Mathematics',            teacher: 'Mr. Smith',        room: 'A204'           },
    { period: 4, time: '10:30–11:15', subject: 'CAT',                    teacher: 'Ms. Fourie',       room: 'Computer Lab 2' },
    { period: 5, time: '11:15–12:00', subject: 'Geography',              teacher: 'Mrs. Naidoo',      room: 'C305'           },
    { period: 6, time: '13:00–13:45', subject: 'Information Technology', teacher: 'Mr. van der Berg', room: 'Computer Lab 1' },
    { period: 7, time: '13:45–14:30', subject: 'Life Orientation',       teacher: 'Ms. Peters',       room: 'Hall'           },
  ],
  // School day +9 (Tuesday) — Academic Day 3 (next cycle)
  [
    { period: 1, time: '08:00–08:45', subject: 'Geography',              teacher: 'Mrs. Naidoo',      room: 'C305'           },
    { period: 2, time: '08:45–09:30', subject: 'Life Orientation',       teacher: 'Ms. Peters',       room: 'Hall'           },
    { period: 3, time: '09:30–10:15', subject: 'Information Technology', teacher: 'Mr. van der Berg', room: 'Computer Lab 1' },
    { period: 4, time: '10:30–11:15', subject: 'Mathematics',            teacher: 'Mr. Smith',        room: 'A204'           },
    { period: 5, time: '11:15–12:00', subject: 'CAT',                    teacher: 'Ms. Fourie',       room: 'Computer Lab 2' },
    { period: 6, time: '13:00–13:45', subject: 'Afrikaans FAL',          teacher: 'Mnr. Botha',       room: 'A101'           },
    { period: 7, time: '13:45–14:30', subject: 'English Home Language',  teacher: 'Ms. Johnson',      room: 'B102'           },
  ],
]

// Assessment schedule — repeats every 10-day academic cycle
// Key: `${academicDay}-${period}` → { label for timetable column, taskId into mockLearningTaskDetails }
export const mockAssessmentSchedule: Record<string, { label: string; taskId: string }> = {
  '5-1':  { label: 'IT Practical Submission',   taskId: 'it-practical-1'    },
  '6-6':  { label: 'Geography Map Work Due',     taskId: 'geo-mapwork-1'     },
  '7-1':  { label: 'Mathematics Test',           taskId: 'math-test-1'       },
  '8-1':  { label: 'LO Presentation',            taskId: 'lo-presentation-1' },
  '9-1':  { label: 'CAT Practical',              taskId: 'cat-practical-1'   },
  '9-6':  { label: 'English Comprehension Test', taskId: 'eng-comp-1'        },
  '10-1': { label: 'Afrikaans Opstel Due',        taskId: 'afr-opstel-1'     },
}

export interface LearningTaskDetail {
  title: string
  subject: string
  description: string
  instructions: string[]
  submissionType: string
  totalMarks: number
  completed: boolean
}

export const mockLearningTaskDetails: Record<string, LearningTaskDetail> = {
  'it-practical-1': {
    title: 'Learning Task 16 · Practical Assessment',
    subject: 'Information Technology',
    description: 'Complete the practical programming assessment covering For Loops and iteration structures. Write a Java program that demonstrates loop control, nested loops, and loop-based data processing using the scenarios provided on the assessment sheet.',
    instructions: [
      'Open your IDE and create a new Java project named "LT16_Practical".',
      'Implement all three programming tasks as described in the assessment sheet.',
      'Each task must include inline comments explaining your logic.',
      'Test your program using the provided sample input data before submitting.',
      'Export your project folder as a single .zip file.',
      'Submit via the portal — deadline is 14:00 on the due date. No late submissions.',
    ],
    submissionType: 'Digital — .zip file via the learner portal',
    totalMarks: 50,
    completed: false,
  },
  'geo-mapwork-1': {
    title: 'Learning Task 14 · Map Work Portfolio',
    subject: 'Geography',
    description: 'Compile and submit your Map Work portfolio covering topographic map reading, cross-sections, and settlement patterns from Learning Tasks 12–14. All annotations must be completed in ink.',
    instructions: [
      'Ensure all map exercises from LT12, LT13, and LT14 are included.',
      'All annotations must be written in ink — pencil work will not be marked.',
      'Each map must be labelled with your name, class, and task number.',
      'Arrange the portfolio in task order and secure with a clip or staple.',
      'Hand in physically to Mrs. Naidoo by end of school on the due date.',
    ],
    submissionType: 'Physical — hand in to Mrs. Naidoo',
    totalMarks: 40,
    completed: false,
  },
  'math-test-1': {
    title: 'Learning Task 7 · Quadratic Equations Test',
    subject: 'Mathematics',
    description: 'Written test covering Chapter 6 (Quadratic Equations) and Chapter 7 (Surds and Indices). A formula sheet will be provided. Section A is calculator-free; Section B permits a scientific calculator.',
    instructions: [
      'Revise all examples and exercises from Chapters 6 and 7 in your textbook.',
      'Review your class notes, especially the factorisation methods covered in LT6.',
      'Bring a pencil, pen, ruler, and scientific calculator.',
      'No programmable calculators or cell phones allowed during the test.',
      'The test is written during Period 1 — be in your seat before the bell.',
    ],
    submissionType: 'Written — in class during Period 1',
    totalMarks: 60,
    completed: false,
  },
  'lo-presentation-1': {
    title: 'Learning Task 3 · Career Choices Presentation',
    subject: 'Life Orientation',
    description: 'Each learner delivers a 5-minute oral presentation on their chosen career path. You must cover the required qualifications, job responsibilities, growth prospects, and how the career aligns with your personal values.',
    instructions: [
      'Your presentation must be exactly 5 minutes — you will be stopped if you exceed the limit.',
      'Prepare a visual aid: a poster, printed slides, or a display board.',
      'Cover: career description, entry requirements, daily responsibilities, and personal motivation.',
      'Dress code for presentations is smart casual.',
      'Arrive early — presentation order is drawn by lot at the start of the period.',
    ],
    submissionType: 'Oral — in class during Period 6',
    totalMarks: 30,
    completed: false,
  },
  'cat-practical-1': {
    title: 'Learning Task 9 · Database Queries Practical',
    subject: 'Computer Application Technology',
    description: 'Practical assessment on Microsoft Access database queries. You will create, modify, and run queries on a provided database to answer a set of business information questions.',
    instructions: [
      'Log in to your computer and open the provided database file from the shared drive.',
      'Do not modify the existing tables — only create new queries.',
      'Save each query with the name specified in the assessment sheet.',
      'Answer all interpretation questions in the answer booklet provided.',
      'Submit both the .accdb file (via the portal) and the physical answer booklet.',
    ],
    submissionType: 'Digital (.accdb via portal) + Physical answer booklet',
    totalMarks: 45,
    completed: false,
  },
  'eng-comp-1': {
    title: 'Learning Task 11 · Comprehension & Language Test',
    subject: 'English Home Language',
    description: 'Written test covering comprehension strategies and language structures from Chapters 4–6 of the prescribed reader. The test includes an unseen passage, questions on the prescribed text, and a language section.',
    instructions: [
      'Read Chapters 4, 5, and 6 of the prescribed reader before the test.',
      'Review figurative language, inference, and contextual vocabulary from class notes.',
      'The test has three sections: Unseen Comprehension, Prescribed Text, and Language.',
      'Write in full sentences unless instructed otherwise.',
      'Bring a blue or black pen — no correction fluid allowed.',
    ],
    submissionType: 'Written — in class during Period 5',
    totalMarks: 50,
    completed: false,
  },
  'afr-opstel-1': {
    title: 'Learning Task 4 · Opstel: \'n Onvergeetlike Dag',
    subject: 'Afrikaans FAL',
    description: 'Skryf \'n opstel van minstens 350 woorde oor die onderwerp "\'n Onvergeetlike Dag". Jou opstel moet \'n duidelike inleiding, liggaam en slot hê. Handgeskrewe kopieë word nie aanvaar nie — gebruik die portaal.',
    instructions: [
      'Minimum 350 woorde — tel jou woorde voor jy indien.',
      'Die opstel moet \'n inleiding, drie liggaamsalineas, en \'n slot hê.',
      'Gebruik beskrywende taal en ten minste twee stilistiese middele (bv. vergelyking, personifikasie).',
      'Tik jou opstel in Microsoft Word of Google Docs.',
      'Dien in as \'n .pdf via die portaal voor die sperdatum.',
      'Handgeskrewe werk word nie gemerk nie.',
    ],
    submissionType: 'Digital — .pdf via die leerderportaal',
    totalMarks: 40,
    completed: false,
  },
}

// Teacher timetable — mock plan until the learning task designer ships.
// Each lesson slot shows which task/step is planned, and how many periods that step spans.
// Key: 1 = Monday … 5 = Friday.

export interface TeacherLesson {
  period: number
  time: string
  classId: string        // real DB id → /teacherDashboard?classId=X; 'mock-*' for placeholder classes
  className: string      // short display label, e.g. "IT GR 10 A"
  subject: string
  taskNumber: number
  taskTopic: string
  step: number
  totalSteps: number
  periodInStep: number   // which period of this step (1-based)
  periodsForStep: number // total periods allocated to this step
}

const IT10A = '0ea79886-ae3f-4da9-92a6-c55521d02cd9' // real DB class

export const mockTeacherTimetable: Record<number, TeacherLesson[]> = {
  1: [ // Monday
    { period: 2, time: '08:45–09:30', classId: IT10A,      className: 'IT GR 10 A', subject: 'Information Technology', taskNumber: 1, taskTopic: 'Data Representation & Binary',       step: 3, totalSteps: 7, periodInStep: 1, periodsForStep: 2 },
    { period: 5, time: '11:15–12:00', classId: 'mock-11a', className: 'IT GR 11 A', subject: 'Information Technology', taskNumber: 2, taskTopic: 'Problem Solving & Algorithms',        step: 4, totalSteps: 6, periodInStep: 1, periodsForStep: 1 },
  ],
  2: [ // Tuesday
    { period: 1, time: '08:00–08:45', classId: 'mock-10b', className: 'IT GR 10 B', subject: 'Information Technology', taskNumber: 1, taskTopic: 'Data Representation & Binary',       step: 4, totalSteps: 7, periodInStep: 1, periodsForStep: 1 },
    { period: 4, time: '10:30–11:15', classId: 'mock-12a', className: 'IT GR 12 A', subject: 'Information Technology', taskNumber: 3, taskTopic: 'OOP: Inheritance & Polymorphism',    step: 2, totalSteps: 5, periodInStep: 1, periodsForStep: 2 },
  ],
  3: [ // Wednesday
    { period: 2, time: '08:45–09:30', classId: 'mock-12a', className: 'IT GR 12 A', subject: 'Information Technology', taskNumber: 3, taskTopic: 'OOP: Inheritance & Polymorphism',    step: 2, totalSteps: 5, periodInStep: 2, periodsForStep: 2 },
    { period: 4, time: '10:30–11:15', classId: IT10A,      className: 'IT GR 10 A', subject: 'Information Technology', taskNumber: 1, taskTopic: 'Data Representation & Binary',       step: 3, totalSteps: 7, periodInStep: 2, periodsForStep: 2 },
  ],
  4: [ // Thursday
    { period: 3, time: '09:30–10:15', classId: 'mock-10b', className: 'IT GR 10 B', subject: 'Information Technology', taskNumber: 1, taskTopic: 'Data Representation & Binary',       step: 5, totalSteps: 7, periodInStep: 1, periodsForStep: 2 },
    { period: 6, time: '13:00–13:45', classId: 'mock-11a', className: 'IT GR 11 A', subject: 'Information Technology', taskNumber: 2, taskTopic: 'Problem Solving & Algorithms',        step: 5, totalSteps: 6, periodInStep: 1, periodsForStep: 2 },
  ],
  5: [ // Friday
    { period: 3, time: '09:30–10:15', classId: 'mock-12a', className: 'IT GR 12 A', subject: 'Information Technology', taskNumber: 3, taskTopic: 'OOP: Inheritance & Polymorphism',    step: 3, totalSteps: 5, periodInStep: 1, periodsForStep: 1 },
    { period: 5, time: '11:15–12:00', classId: IT10A,      className: 'IT GR 10 A', subject: 'Information Technology', taskNumber: 1, taskTopic: 'Data Representation & Binary',       step: 4, totalSteps: 7, periodInStep: 1, periodsForStep: 1 },
  ],
}

// CurriculumNavigator [The Royal Library] — learner's enrolled subjects
export const mockSubjects = [
  {
    id: 'it',
    name: 'Information Technology',
    currentTask: 'LT1 · Intro to Java',
    termProgress: 0,
    currentStep: 0,
    totalSteps: 5,
  },
  {
    id: 'cat',
    name: 'Computer Application Technology',
    currentTask: 'Learning Task 9 · Database Queries',
    termProgress: 78,
    currentStep: 5,
    totalSteps: 8,
  },
  {
    id: 'afr',
    name: 'Afrikaans FAL',
    currentTask: 'Learning Task 4 · Opstel',
    termProgress: 33,
    currentStep: 2,
    totalSteps: 6,
  },
  {
    id: 'eng',
    name: 'English Home Language',
    currentTask: 'Learning Task 11 · Comprehension Strategies',
    termProgress: 55,
    currentStep: 4,
    totalSteps: 6,
  },
  {
    id: 'lo',
    name: 'Life Orientation',
    currentTask: 'Learning Task 3 · Career Choices',
    termProgress: 20,
    currentStep: 1,
    totalSteps: 5,
  },
  {
    id: 'geo',
    name: 'Geography',
    currentTask: 'Learning Task 14 · Map Work',
    termProgress: 71,
    currentStep: 6,
    totalSteps: 9,
  },
  {
    id: 'math',
    name: 'Mathematics',
    currentTask: 'Learning Task 7 · Quadratic Equations',
    termProgress: 28,
    currentStep: 2,
    totalSteps: 8,
  },
]

