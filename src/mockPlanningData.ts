// ─────────────────────────────────────────────────────────────────────────────
// Mock teacher planning data — replaced by a live learning task designer.
// 10-day academic cycle; IT classes get 9 periods/cycle, Robotics gets 3.
// ─────────────────────────────────────────────────────────────────────────────

export const IT10A_ID = '0ea79886-ae3f-4da9-92a6-c55521d02cd9' // real DB id

// ─── Class registry ───────────────────────────────────────────────────────────

export interface ClassConfig {
  id: string
  shortName: string
  fullName: string
  subject: string
  grade: number
  color: string          // hex – used for tinted rows and legend dots
  periodsPerCycle: number
}

export const TEACHER_CLASSES: ClassConfig[] = [
  { id: IT10A_ID,   shortName: 'IT 10A', fullName: 'IT Grade 10 Group A', subject: 'Information Technology', grade: 10, color: '#4ade80', periodsPerCycle: 9 },
  { id: 'mock-10b', shortName: 'IT 10B', fullName: 'IT Grade 10 Group B', subject: 'Information Technology', grade: 10, color: '#60a5fa', periodsPerCycle: 9 },
  { id: 'mock-11a', shortName: 'IT 11A', fullName: 'IT Grade 11 Group A', subject: 'Information Technology', grade: 11, color: '#fb923c', periodsPerCycle: 9 },
  { id: 'mock-11b', shortName: 'IT 11B', fullName: 'IT Grade 11 Group B', subject: 'Information Technology', grade: 11, color: '#a78bfa', periodsPerCycle: 9 },
  { id: 'mock-12a', shortName: 'IT 12A', fullName: 'IT Grade 12 Group A', subject: 'Information Technology', grade: 12, color: '#f43f5e', periodsPerCycle: 9 },
  { id: 'mock-12b', shortName: 'IT 12B', fullName: 'IT Grade 12 Group B', subject: 'Information Technology', grade: 12, color: '#e879f9', periodsPerCycle: 9 },
  { id: 'mock-r9',  shortName: 'ROB 9',  fullName: 'Robotics Grade 9',    subject: 'Robotics & Coding',     grade: 9,  color: '#22d3ee', periodsPerCycle: 3 },
]

export function classById(id: string): ClassConfig | undefined {
  return TEACHER_CLASSES.find(c => c.id === id)
}

// ─── 10-day timetable ─────────────────────────────────────────────────────────

export interface TimetableSlot {
  classId: string
  period: number
  time: string
  taskNumber: number
  taskTopic: string
  step: number
  totalSteps: number
  periodInStep: number
  periodsForStep: number
}

// Key: cycle day 1–10  (Day 1 = first Monday of the cycle)
// Period times: P1 07:30, P2 08:15, P3 09:00, break, P4 10:15, P5 11:00, P6 11:45, lunch, P7 13:15
const T: Record<number, string> = {
  1: '07:30–08:15', 2: '08:15–09:00', 3: '09:00–09:45',
  4: '10:15–11:00', 5: '11:00–11:45', 6: '11:45–12:30',
  7: '13:15–14:00',
}

function slot(classId: string, period: number, taskNumber: number, taskTopic: string, step: number, totalSteps: number, periodInStep: number, periodsForStep: number): TimetableSlot {
  return { classId, period, time: T[period], taskNumber, taskTopic, step, totalSteps, periodInStep, periodsForStep }
}

export const CYCLE_TIMETABLE: Record<number, TimetableSlot[]> = {
  1: [
    slot(IT10A_ID,   1, 1, 'Data Representation & Binary',     3, 7, 1, 2),
    slot('mock-10b', 2, 1, 'Data Representation & Binary',     4, 7, 1, 1),
    slot('mock-11a', 4, 1, 'Algorithms & Pseudocode',          2, 6, 1, 2),
    slot('mock-11b', 5, 1, 'Algorithms & Pseudocode',          2, 6, 1, 2),
    slot('mock-12a', 6, 1, 'OOP: Inheritance & Polymorphism',  3, 5, 1, 1),
    slot('mock-12b', 7, 1, 'OOP: Inheritance & Polymorphism',  2, 5, 2, 2),
  ],
  2: [
    slot(IT10A_ID,   1, 1, 'Data Representation & Binary',     3, 7, 2, 2),
    slot('mock-10b', 3, 1, 'Data Representation & Binary',     5, 7, 1, 2),
    slot('mock-11a', 4, 1, 'Algorithms & Pseudocode',          2, 6, 2, 2),
    slot('mock-11b', 5, 1, 'Algorithms & Pseudocode',          3, 6, 1, 1),
    slot('mock-r9',  6, 1, 'Introduction to Robotics',         2, 4, 1, 2),
    slot('mock-12a', 7, 1, 'OOP: Inheritance & Polymorphism',  4, 5, 1, 2),
  ],
  3: [
    slot(IT10A_ID,   2, 1, 'Data Representation & Binary',     4, 7, 1, 1),
    slot('mock-10b', 3, 1, 'Data Representation & Binary',     5, 7, 2, 2),
    slot('mock-12b', 4, 1, 'OOP: Inheritance & Polymorphism',  3, 5, 1, 1),
    slot('mock-11a', 5, 1, 'Algorithms & Pseudocode',          3, 6, 1, 2),
    slot('mock-11b', 6, 1, 'Algorithms & Pseudocode',          4, 6, 1, 2),
    slot('mock-12a', 7, 1, 'OOP: Inheritance & Polymorphism',  4, 5, 2, 2),
  ],
  4: [
    slot(IT10A_ID,   1, 1, 'Data Representation & Binary',     5, 7, 1, 2),
    slot('mock-10b', 2, 1, 'Data Representation & Binary',     6, 7, 1, 2),
    slot('mock-r9',  3, 1, 'Introduction to Robotics',         2, 4, 2, 2),
    slot('mock-11a', 5, 1, 'Algorithms & Pseudocode',          3, 6, 2, 2),
    slot('mock-11b', 6, 1, 'Algorithms & Pseudocode',          4, 6, 2, 2),
    slot('mock-12b', 7, 2, 'OOP: Exception Handling',          1, 4, 1, 2),
  ],
  5: [
    slot(IT10A_ID,   1, 1, 'Data Representation & Binary',     5, 7, 2, 2),
    slot('mock-10b', 2, 1, 'Data Representation & Binary',     6, 7, 2, 2),
    slot('mock-11a', 3, 1, 'Algorithms & Pseudocode',          4, 6, 1, 1),
    slot('mock-11b', 5, 1, 'Algorithms & Pseudocode',          5, 6, 1, 2),
    slot('mock-12a', 6, 2, 'OOP: Exception Handling',          1, 4, 1, 1),
    slot('mock-12b', 7, 2, 'OOP: Exception Handling',          1, 4, 2, 2),
  ],
  6: [
    slot(IT10A_ID,   2, 1, 'Data Representation & Binary',     6, 7, 1, 2),
    slot('mock-10b', 3, 1, 'Data Representation & Binary',     7, 7, 1, 2),
    slot('mock-11a', 4, 1, 'Algorithms & Pseudocode',          4, 6, 2, 2), // IT12A off Day 6 in old mock; here IT12A is present
    slot('mock-11b', 5, 1, 'Algorithms & Pseudocode',          5, 6, 2, 2),
    slot('mock-12a', 6, 2, 'OOP: Exception Handling',          2, 4, 1, 2),
    slot('mock-r9',  7, 1, 'Introduction to Robotics',         3, 4, 1, 1),
  ],
  7: [
    slot(IT10A_ID,   1, 1, 'Data Representation & Binary',     6, 7, 2, 2),
    slot('mock-10b', 2, 1, 'Data Representation & Binary',     7, 7, 2, 2),
    slot('mock-11a', 4, 1, 'Algorithms & Pseudocode',          5, 6, 1, 2),
    slot('mock-11b', 5, 1, 'Algorithms & Pseudocode',          6, 6, 1, 2),
    slot('mock-12a', 6, 2, 'OOP: Exception Handling',          2, 4, 2, 2),
    slot('mock-12b', 7, 2, 'OOP: Exception Handling',          2, 4, 1, 2),
  ],
  8: [
    slot(IT10A_ID,   1, 1, 'Data Representation & Binary',     7, 7, 1, 2),
    slot('mock-11a', 3, 1, 'Algorithms & Pseudocode',          5, 6, 2, 2),
    slot('mock-11b', 4, 1, 'Algorithms & Pseudocode',          6, 6, 2, 2),
    slot('mock-12a', 5, 2, 'OOP: Exception Handling',          3, 4, 1, 1),
    slot('mock-12b', 6, 2, 'OOP: Exception Handling',          2, 4, 2, 2),
    slot('mock-10b', 7, 2, 'Logic & Boolean Algebra',          1, 5, 1, 2),
  ],
  9: [
    slot(IT10A_ID,   2, 1, 'Data Representation & Binary',     7, 7, 2, 2),
    slot('mock-11a', 3, 1, 'Algorithms & Pseudocode',          6, 6, 1, 1),
    slot('mock-11b', 5, 2, 'Flowcharts & Trace Tables',        1, 4, 1, 2),
    slot('mock-12a', 6, 2, 'OOP: Exception Handling',          4, 4, 1, 1),
    slot('mock-12b', 7, 2, 'OOP: Exception Handling',          3, 4, 1, 2),
    slot('mock-10b', 4, 2, 'Logic & Boolean Algebra',          1, 5, 2, 2),
  ],
  10: [
    slot('mock-10b', 1, 2, 'Logic & Boolean Algebra',          2, 5, 1, 1),
    slot('mock-11a', 2, 2, 'Flowcharts & Trace Tables',        1, 4, 1, 2),
    slot('mock-11b', 3, 2, 'Flowcharts & Trace Tables',        1, 4, 2, 2),
    slot('mock-12a', 5, 2, 'OOP: Exception Handling',          4, 4, 1, 1), // same as D9 — second presentation of this step for a different group
    slot('mock-12b', 6, 2, 'OOP: Exception Handling',          3, 4, 2, 2),
    // IT10A has 9 periods — skip Day 10
  ],
}

// ─── Term plan ────────────────────────────────────────────────────────────────

export interface TaskStep {
  stepNum: number
  description: string
  periodsAllocated: number
}

export interface TaskAssessment {
  type: string    // 'Practical' | 'Test' | 'Project' | 'Exam'
  marks: number
  termWeight: string  // e.g. '25% of term mark'
}

export interface LearningTaskPlan {
  taskNumber: number
  topic: string
  startCycleDay: number   // approximate cycle day the task begins
  steps: TaskStep[]
  assessment?: TaskAssessment
}

// Shared task plans per grade (both groups follow the same plan)
const GR10_TASKS: LearningTaskPlan[] = [
  {
    taskNumber: 1, topic: 'Data Representation & Binary', startCycleDay: 1,
    steps: [
      { stepNum: 1, description: 'Number systems: binary, octal, hex — conversion methods',  periodsAllocated: 2 },
      { stepNum: 2, description: 'Binary arithmetic: addition and two\'s complement subtraction', periodsAllocated: 2 },
      { stepNum: 3, description: 'Encoding: ASCII, Unicode, data units (bit → TB)',            periodsAllocated: 2 },
      { stepNum: 4, description: 'Data compression: lossy vs lossless, run-length encoding',  periodsAllocated: 1 },
      { stepNum: 5, description: 'Error detection: parity bits and check digits',             periodsAllocated: 2 },
      { stepNum: 6, description: 'Review and concept mapping',                                periodsAllocated: 2 },
      { stepNum: 7, description: 'Practical assessment preparation and submission',           periodsAllocated: 2 },
    ],
    assessment: { type: 'Practical', marks: 50, termWeight: '15% of term mark' },
  },
  {
    taskNumber: 2, topic: 'Logic & Boolean Algebra', startCycleDay: 8,
    steps: [
      { stepNum: 1, description: 'Boolean operators: AND, OR, NOT — truth tables',           periodsAllocated: 2 },
      { stepNum: 2, description: 'Logic gates: symbols, circuits, combinations',             periodsAllocated: 2 },
      { stepNum: 3, description: 'Simplification using Boolean laws',                        periodsAllocated: 2 },
      { stepNum: 4, description: 'Karnaugh maps (introduction)',                             periodsAllocated: 1 },
      { stepNum: 5, description: 'Practical: circuit design and truth table verification',   periodsAllocated: 2 },
    ],
    assessment: { type: 'Test', marks: 40, termWeight: '10% of term mark' },
  },
  {
    taskNumber: 3, topic: 'Hardware & Systems Software', startCycleDay: 14,
    steps: [
      { stepNum: 1, description: 'CPU architecture: ALU, CU, registers, buses',             periodsAllocated: 2 },
      { stepNum: 2, description: 'Memory hierarchy: cache, RAM, ROM, secondary storage',    periodsAllocated: 2 },
      { stepNum: 3, description: 'Operating systems: functions, types, interfaces',          periodsAllocated: 2 },
      { stepNum: 4, description: 'File management and utilities',                            periodsAllocated: 1 },
    ],
    assessment: { type: 'Test', marks: 60, termWeight: '15% of term mark — formal written test' },
  },
]

const GR11_TASKS: LearningTaskPlan[] = [
  {
    taskNumber: 1, topic: 'Algorithms & Pseudocode', startCycleDay: 1,
    steps: [
      { stepNum: 1, description: 'Algorithm concepts: input/output, sequences, conditions',  periodsAllocated: 2 },
      { stepNum: 2, description: 'Pseudocode: standard notation and structure',              periodsAllocated: 2 },
      { stepNum: 3, description: 'Selection structures: IF-THEN-ELSE, CASE',                periodsAllocated: 2 },
      { stepNum: 4, description: 'Iteration: WHILE, FOR, DO-WHILE',                         periodsAllocated: 2 },
      { stepNum: 5, description: 'Nested structures and combined logic',                    periodsAllocated: 2 },
      { stepNum: 6, description: 'Practical: algorithm design for given scenarios',         periodsAllocated: 1 },
    ],
    assessment: { type: 'Practical', marks: 50, termWeight: '15% of term mark' },
  },
  {
    taskNumber: 2, topic: 'Flowcharts & Trace Tables', startCycleDay: 8,
    steps: [
      { stepNum: 1, description: 'Standard flowchart symbols and conventions',              periodsAllocated: 2 },
      { stepNum: 2, description: 'Drawing flowcharts for algorithms from Task 1',           periodsAllocated: 2 },
      { stepNum: 3, description: 'Trace tables: manual execution of algorithms',            periodsAllocated: 2 },
      { stepNum: 4, description: 'Desk-checking: identifying logic errors',                 periodsAllocated: 2 },
    ],
    assessment: { type: 'Test', marks: 50, termWeight: '15% of term mark' },
  },
  {
    taskNumber: 3, topic: 'Delphi Programming — Fundamentals', startCycleDay: 14,
    steps: [
      { stepNum: 1, description: 'IDE overview: forms, components, event model',            periodsAllocated: 1 },
      { stepNum: 2, description: 'Variables, data types, assignment',                       periodsAllocated: 2 },
      { stepNum: 3, description: 'Input/output: edit boxes, labels, showmessage',           periodsAllocated: 2 },
      { stepNum: 4, description: 'Control structures: if-then-else, case',                 periodsAllocated: 2 },
      { stepNum: 5, description: 'Loops: for, while, repeat-until',                        periodsAllocated: 2 },
    ],
    assessment: { type: 'Practical', marks: 60, termWeight: '20% of term mark' },
  },
]

const GR12_TASKS: LearningTaskPlan[] = [
  {
    taskNumber: 1, topic: 'OOP: Inheritance & Polymorphism', startCycleDay: 1,
    steps: [
      { stepNum: 1, description: 'Review: classes, objects, encapsulation, constructors',   periodsAllocated: 1 },
      { stepNum: 2, description: 'Inheritance: superclass, subclass, method overriding',    periodsAllocated: 2 },
      { stepNum: 3, description: 'Polymorphism: compile-time and runtime (virtual methods)',periodsAllocated: 2 },
      { stepNum: 4, description: 'Abstract classes and interfaces',                         periodsAllocated: 2 },
      { stepNum: 5, description: 'UML class diagrams and design patterns (introduction)',   periodsAllocated: 2 },
    ],
    assessment: { type: 'Practical', marks: 50, termWeight: '15% of term mark' },
  },
  {
    taskNumber: 2, topic: 'OOP: Exception Handling', startCycleDay: 7,
    steps: [
      { stepNum: 1, description: 'Runtime errors vs logic errors — classification',         periodsAllocated: 1 },
      { stepNum: 2, description: 'Try-except-finally blocks',                               periodsAllocated: 2 },
      { stepNum: 3, description: 'Custom exception classes',                                periodsAllocated: 2 },
      { stepNum: 4, description: 'Practical: robust program with full exception handling',  periodsAllocated: 2 },
    ],
    assessment: { type: 'Practical', marks: 60, termWeight: '20% of term mark' },
  },
  {
    taskNumber: 3, topic: 'File Handling & Data Structures', startCycleDay: 13,
    steps: [
      { stepNum: 1, description: 'Text files: read, write, append operations',             periodsAllocated: 2 },
      { stepNum: 2, description: 'Structured files: records and typed files',              periodsAllocated: 2 },
      { stepNum: 3, description: 'Arrays: 1D and 2D, sorting algorithms (bubble, insertion)', periodsAllocated: 2 },
      { stepNum: 4, description: 'Searching: linear and binary search',                    periodsAllocated: 2 },
    ],
    assessment: { type: 'Test', marks: 60, termWeight: '15% of term mark — formal written test' },
  },
]

const ROB9_TASKS: LearningTaskPlan[] = [
  {
    taskNumber: 1, topic: 'Introduction to Robotics', startCycleDay: 1,
    steps: [
      { stepNum: 1, description: 'What is a robot? Types and applications in society',     periodsAllocated: 1 },
      { stepNum: 2, description: 'Robot components: sensors, actuators, controllers',      periodsAllocated: 2 },
      { stepNum: 3, description: 'Introduction to Arduino: board overview and setup',      periodsAllocated: 2 },
      { stepNum: 4, description: 'First program: Blink sketch and pin control',            periodsAllocated: 1 },
    ],
    assessment: { type: 'Project', marks: 30, termWeight: '30% of term mark' },
  },
  {
    taskNumber: 2, topic: 'Sensors & Conditional Logic', startCycleDay: 8,
    steps: [
      { stepNum: 1, description: 'Digital vs analogue sensors — reading values',           periodsAllocated: 1 },
      { stepNum: 2, description: 'Distance sensor (ultrasonic): obstacle avoidance',       periodsAllocated: 2 },
      { stepNum: 3, description: 'Line following sensor: algorithm and calibration',       periodsAllocated: 2 },
    ],
    assessment: { type: 'Practical', marks: 30, termWeight: '30% of term mark' },
  },
]

// Exported term plans — keyed by classId (retained for timetable use)
export const TERM_PLANS: Record<string, LearningTaskPlan[]> = {
  [IT10A_ID]:   GR10_TASKS,
  'mock-10b':   GR10_TASKS,
  'mock-11a':   GR11_TASKS,
  'mock-11b':   GR11_TASKS,
  'mock-12a':   GR12_TASKS,
  'mock-12b':   GR12_TASKS,
  'mock-r9':    ROB9_TASKS,
}

// Term plans keyed by grade — one plan per grade regardless of number of classes
export interface GradeTermPlan {
  grade: number
  subject: string
  tasks: LearningTaskPlan[]
}

export const GRADE_TERM_PLANS: GradeTermPlan[] = [
  { grade: 9,  subject: 'Robotics & Coding',     tasks: ROB9_TASKS  },
  { grade: 10, subject: 'Information Technology', tasks: GR10_TASKS  },
  { grade: 11, subject: 'Information Technology', tasks: GR11_TASKS  },
  { grade: 12, subject: 'Information Technology', tasks: GR12_TASKS  },
]

// ─── Year plan ────────────────────────────────────────────────────────────────

export interface TermAssessment {
  name: string
  type: 'Practical' | 'Test' | 'Project' | 'Exam' | 'PAT'
  marks: number
  termContribution: number  // % of the term mark this piece contributes
}

export interface YearTerm {
  term: number
  topics: string[]
  assessments: TermAssessment[]
  yearContribution: number  // % of the final year mark
  hasExam: boolean
  examMark?: number
  notes?: string
}

export interface YearPlan {
  grade: number
  subject: string
  terms: YearTerm[]
  yearMarkNote: string
}

export const YEAR_PLANS: YearPlan[] = [
  {
    grade: 10,
    subject: 'Information Technology',
    yearMarkNote: 'Year mark = average of Term 1–3 SBA (25%) + Term 2 mid-year exam (25%) + Term 4 end-of-year exam (50%)',
    terms: [
      {
        term: 1, hasExam: false, yearContribution: 10,
        topics: ['Data Representation & Binary', 'Logic & Boolean Algebra', 'Hardware & Systems Software'],
        assessments: [
          { name: 'LT1 Practical',            type: 'Practical', marks: 50,  termContribution: 30 },
          { name: 'LT2 Written Test',          type: 'Test',      marks: 40,  termContribution: 25 },
          { name: 'LT3 Systems Test',          type: 'Test',      marks: 60,  termContribution: 35 },
          { name: 'Classwork & Participation', type: 'Practical', marks: 30,  termContribution: 10 },
        ],
      },
      {
        term: 2, hasExam: true, examMark: 100, yearContribution: 25,
        topics: ['Networking Fundamentals', 'Internet & Web Technologies', 'Information Management'],
        assessments: [
          { name: 'LT4 Practical',             type: 'Practical', marks: 60,  termContribution: 30 },
          { name: 'LT5 Written Test',           type: 'Test',      marks: 50,  termContribution: 20 },
          { name: 'Mid-Year Exam',              type: 'Exam',      marks: 100, termContribution: 50 },
        ],
        notes: 'Mid-year exam covers Terms 1 & 2 work. Paper 1 (theory 2h) + Paper 2 (practical 2h).',
      },
      {
        term: 3, hasExam: false, yearContribution: 15,
        topics: ['Introduction to Programming (Delphi)', 'Problem Solving & Algorithms', 'Databases'],
        assessments: [
          { name: 'LT6 Practical',             type: 'Practical', marks: 60,  termContribution: 40 },
          { name: 'LT7 Written Test',           type: 'Test',      marks: 50,  termContribution: 30 },
          { name: 'PAT Phase 1 (Research)',     type: 'PAT',       marks: 30,  termContribution: 30 },
        ],
      },
      {
        term: 4, hasExam: true, examMark: 150, yearContribution: 50,
        topics: ['Revision: all T1–T3 topics', 'Exam preparation and past papers'],
        assessments: [
          { name: 'PAT Phase 2 (Solution)',     type: 'PAT',       marks: 60,  termContribution: 15 },
          { name: 'PAT Phase 3 (Presentation)', type: 'PAT',       marks: 30,  termContribution: 10 },
          { name: 'End-of-Year Exam',           type: 'Exam',      marks: 150, termContribution: 75 },
        ],
        notes: 'T4 is revision and exam. PAT (Practical Assessment Task) counts 25% of the year mark. End-of-year exam: Paper 1 theory (2h) + Paper 2 practical (3h).',
      },
    ],
  },
  {
    grade: 11,
    subject: 'Information Technology',
    yearMarkNote: 'Year mark = SBA (25%) + Mid-year exam (25%) + End-of-year exam (50%). PAT is separate.',
    terms: [
      {
        term: 1, hasExam: false, yearContribution: 10,
        topics: ['Algorithms & Pseudocode', 'Flowcharts & Trace Tables', 'Delphi Programming — Fundamentals'],
        assessments: [
          { name: 'LT1 Practical',             type: 'Practical', marks: 50,  termContribution: 30 },
          { name: 'LT2 Written Test',           type: 'Test',      marks: 50,  termContribution: 30 },
          { name: 'LT3 Practical',              type: 'Practical', marks: 60,  termContribution: 40 },
        ],
      },
      {
        term: 2, hasExam: true, examMark: 150, yearContribution: 25,
        topics: ['Delphi: Arrays & Sorting', 'Delphi: String Handling', 'Object-Oriented Concepts'],
        assessments: [
          { name: 'LT4 Practical',             type: 'Practical', marks: 60,  termContribution: 25 },
          { name: 'LT5 Written Test',           type: 'Test',      marks: 60,  termContribution: 25 },
          { name: 'Mid-Year Exam',              type: 'Exam',      marks: 150, termContribution: 50 },
        ],
        notes: 'Mid-year exam: Paper 1 theory (2.5h) + Paper 2 practical (2.5h). Covers all T1–T2 work.',
      },
      {
        term: 3, hasExam: false, yearContribution: 15,
        topics: ['OOP in Delphi', 'File Handling', 'Databases & SQL Queries'],
        assessments: [
          { name: 'LT6 Practical',             type: 'Practical', marks: 60,  termContribution: 35 },
          { name: 'LT7 Written Test',           type: 'Test',      marks: 60,  termContribution: 35 },
          { name: 'PAT Phase 1 (Research)',     type: 'PAT',       marks: 30,  termContribution: 30 },
        ],
      },
      {
        term: 4, hasExam: true, examMark: 200, yearContribution: 50,
        topics: ['Revision: T1–T3 all topics', 'Past paper practice', 'Exam technique'],
        assessments: [
          { name: 'PAT Phase 2 (Design)',       type: 'PAT',       marks: 60,  termContribution: 10 },
          { name: 'PAT Phase 3 (Solution)',      type: 'PAT',       marks: 90,  termContribution: 15 },
          { name: 'End-of-Year Exam',            type: 'Exam',      marks: 200, termContribution: 75 },
        ],
        notes: 'T4 is revision. PAT (Practical Assessment Task) is a major project across all terms. End-of-year exam: Paper 1 theory (3h) + Paper 2 practical (3h).',
      },
    ],
  },
  {
    grade: 12,
    subject: 'Information Technology',
    yearMarkNote: 'NSC: SBA = 25% of year mark; trial exam = informs readiness; final NSC exam = 75% of year mark.',
    terms: [
      {
        term: 1, hasExam: false, yearContribution: 8,
        topics: ['OOP: Inheritance & Polymorphism', 'OOP: Exception Handling', 'File Handling & Data Structures'],
        assessments: [
          { name: 'LT1 Practical (OOP)',        type: 'Practical', marks: 50,  termContribution: 30 },
          { name: 'LT2 Practical (Exceptions)', type: 'Practical', marks: 60,  termContribution: 35 },
          { name: 'LT3 Written Test',           type: 'Test',      marks: 60,  termContribution: 35 },
        ],
      },
      {
        term: 2, hasExam: true, examMark: 200, yearContribution: 17,
        topics: ['SQL & Databases: advanced queries', 'Networking: protocols and security', 'Social Implications'],
        assessments: [
          { name: 'LT4 Practical (SQL)',        type: 'Practical', marks: 60,  termContribution: 25 },
          { name: 'Mid-Year Trial Exam',         type: 'Exam',      marks: 200, termContribution: 50 },
          { name: 'PAT Phase 1 (Analysis)',      type: 'PAT',       marks: 40,  termContribution: 25 },
        ],
        notes: 'Trial exam covers all T1–T2 work. Paper 1 theory (3h, 150 marks) + Paper 2 practical (3h, 150 marks). Results used for mock ranking.',
      },
      {
        term: 3, hasExam: false, yearContribution: 0,
        topics: ['PAT development and completion', 'Full revision programme', 'Trial Exam 2 preparation'],
        assessments: [
          { name: 'PAT Phase 2 (Design)',       type: 'PAT',       marks: 60,  termContribution: 40 },
          { name: 'PAT Phase 3 (Solution)',      type: 'PAT',       marks: 90,  termContribution: 60 },
        ],
        notes: 'SBA mark (25%) is finalised at end of T3 and submitted to DBE. PAT forms a major part of the SBA.',
      },
      {
        term: 4, hasExam: true, examMark: 300, yearContribution: 75,
        topics: ['Final revision only — no new content', 'NSC examination'],
        assessments: [
          { name: 'NSC End-of-Year Exam',        type: 'Exam',      marks: 300, termContribution: 100 },
        ],
        notes: 'NSC exam: Paper 1 theory (3h, 150 marks) + Paper 2 practical (3h, 150 marks). This constitutes 75% of the final NSC year mark.',
      },
    ],
  },
  {
    grade: 9,
    subject: 'Robotics & Coding',
    yearMarkNote: 'Year mark = average of 3 terms × SBA (60%) + project portfolio (40%)',
    terms: [
      {
        term: 1, hasExam: false, yearContribution: 20,
        topics: ['Introduction to Robotics', 'Sensors & Conditional Logic'],
        assessments: [
          { name: 'LT1 Project (robot build)',  type: 'Project',   marks: 30,  termContribution: 40 },
          { name: 'LT2 Practical (sensors)',    type: 'Practical', marks: 30,  termContribution: 40 },
          { name: 'Lab journal',                type: 'Project',   marks: 20,  termContribution: 20 },
        ],
      },
      {
        term: 2, hasExam: false, yearContribution: 30,
        topics: ['Motor Control & Navigation', 'Block-Based Programming (Scratch)'],
        assessments: [
          { name: 'LT3 Practical (navigation)', type: 'Practical', marks: 30,  termContribution: 40 },
          { name: 'LT4 Coding project',         type: 'Project',   marks: 40,  termContribution: 40 },
          { name: 'Peer review',                type: 'Project',   marks: 20,  termContribution: 20 },
        ],
      },
      {
        term: 3, hasExam: false, yearContribution: 30,
        topics: ['Text-Based Programming (Python basics)', 'Final Robot Challenge'],
        assessments: [
          { name: 'LT5 Python practical',       type: 'Practical', marks: 40,  termContribution: 40 },
          { name: 'Robot Challenge showcase',   type: 'Project',   marks: 50,  termContribution: 50 },
          { name: 'Portfolio submission',       type: 'Project',   marks: 20,  termContribution: 10 },
        ],
      },
      {
        term: 4, hasExam: false, yearContribution: 20,
        topics: ['Revision and extension activities', 'Open maker challenges'],
        assessments: [
          { name: 'Portfolio final submission', type: 'Project',   marks: 50,  termContribution: 100 },
        ],
        notes: 'T4 is project-based — no formal exam. Extension challenges for high-ability learners.',
      },
    ],
  },
]
