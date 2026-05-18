# Learning Task Creator — As-Built Documentation

> **Status:** ✅ FULLY COMPLETE — Both HQL and General templates are fully wired end-to-end (frontend + backend + edit mode + file upload).
> **Routes:** `/task-creator` (new task) · `/task-creator/:taskId` (edit — loads full draft from DB) · `/task-manager` (task list)

---

## Entry point: Template Selector

`LearningTaskCreator.tsx` opens with a full-screen template selection screen before any editing state is initialised. Teacher chooses one of two templates.

| Template | Component | Description |
|---|---|---|
| **HQL** (Highest Quality Learning) | `LearningTaskCreator.tsx` (HQL wizard path) | Dynamic block-based steps; structured pedagogical flow |
| **GENERAL** | `GeneralTaskCreator.tsx` | Freeform block builder; any order, any combination |

Both templates show a training video placeholder and description on the selector card. "USE THIS TEMPLATE ▶" button enters the creator. Both creators have a "◂ CHANGE TEMPLATE" button that returns to the selector without resetting state.

**Rules-of-hooks note:** `template` state is declared first in `LearningTaskCreator`, before all other hooks. Early returns for `template === null` (selector) and `template === 'general'` (GeneralTaskCreator) come *after* all hooks.

---

## HQL Task Creator (`LearningTaskCreator.tsx`)

### Architecture

The HQL creator is a **dynamic block-based wizard**. An ORIENTATION step (step 0) captures task metadata. Beyond that, the teacher controls how many content steps exist, what type each step is, and which blocks appear inside each step. Everything is persisted to PostgreSQL and fully reloadable in edit mode.

### Exported symbols

```typescript
export const STEP_LABELS: string[]           // ['ORIENTATION','CHALLENGE','REFLECTION','CONTENT','QUIZ','DISCUSSION','ASSIGNMENT']
export const BLOCK_META: Record<HqlBlockType, { icon, label, color }>
export type  HqlBlockType                    // 'VIDEO'|'DOCUMENT'|'AUDIO'|'TEXT'|'REFLECTION'|'QUIZ'|'DISCUSSION'|'ASSIGNMENT'
export interface HqlBlock                    // { id, stepNumber, blockType, position, title, timeMin, ... type-specific fields }
export interface TaskDraft                   // see shape below
export interface ReflectionQuestion          // { id, text, checked, timeMin }
export interface ParsedQuestion              // { number, text, options: { letter, text, isCorrect }[], correctIndex }
export interface AllowedFormats              // { video, audio, pdf, image }
export interface RawBlock                    // DB row shape returned by hqlBlocks query
export function parseQuiz(raw: string): ParsedQuestion[]
export function rowsToStepBlocks(rows: RawBlock[], stepCount?: number): HqlBlock[][]
```

### TaskDraft shape

```typescript
export interface TaskDraft {
  title: string
  subject: string
  grade: string
  stepLabels: string[]       // ordered content step type labels; drives step count
  stepBlocks: HqlBlock[][]   // index 0 unused; index 1..N = blocks for that content step
}
```

`stepLabels` is the **single source of truth** for how many content steps exist. All step rendering, navigation, save, and load logic derives step count from `stepLabels.length`. There are no hardcoded `[1…6]` loops.

### ORIENTATION step (step 0)

| Field | Source |
|---|---|
| Task title | Free text input |
| Subject | Dropdown — `teacherClasses` GraphQL query |
| Grade | Dropdown — `teacherClasses` GraphQL query |
| Task count badge | Live `taskCount` GraphQL query |

### Content steps

Default step sequence on a new task: CHALLENGE → REFLECTION → CONTENT → QUIZ → DISCUSSION → ASSIGNMENT.

#### Adding a step

The step navigator bar has a **+ button** at the right end. Clicking it opens an animated picker showing the 6 available step types with icons and descriptions. Selecting a type:
- Appends the label to `stepLabels`
- Appends an empty `[]` to `stepBlocks`
- Navigates the wizard to the new step

#### Deleting a step

Each `StepBlockBuilder` renders a **🗑 DELETE STEP** button. Clicking it:
- Shows `window.confirm` if the step has any blocks (data-loss warning)
- Filters out the label and block array at that index
- Clamps the active step pointer if it was on or past the deleted step

### Block system

#### Step palettes

Each step type has a curated palette of block types the teacher can add:

| Step type | Available block types |
|---|---|
| CHALLENGE | VIDEO, DOCUMENT, TEXT |
| REFLECTION | REFLECTION |
| CONTENT | VIDEO, DOCUMENT, AUDIO, TEXT |
| QUIZ | QUIZ |
| DISCUSSION | DISCUSSION, TEXT |
| ASSIGNMENT | ASSIGNMENT, DOCUMENT |

#### Block types

| Type | Icon | Colour | Key fields |
|---|---|---|---|
| `VIDEO` | 🎬 | blue | file picker, title, timeMin |
| `DOCUMENT` | 📄 | gold | file picker, title, timeMin |
| `AUDIO` | 🎵 | purple | file picker, title, timeMin |
| `TEXT` | 📝 | white dim | title, textContent (body), timeMin |
| `REFLECTION` | 🪞 | teal | preset question pool — see below |
| `QUIZ` | ❓ | amber | paste-to-parse textarea (`parseQuiz`), timeMin |
| `DISCUSSION` | 💬 | violet | discussion prompt, timeMin |
| `ASSIGNMENT` | ✏ | green | instructions, allowedFormats toggles |

#### REFLECTION block — preset questions

8 preset meta-learning questions. **First 4 are checked by default** (in this order):
1. What is the core problem being presented in this challenge?
2. What is your initial proposed solution?
3. What steps will you follow to create your solution?
4. What criteria would a successful solution need to meet?

Questions 5–8 are unchecked by default:
5. What assumptions are you making in your solution?
6. What information would change your answer?
7. Is this the best possible solution, or are there other approaches worth considering?
8. What is the biggest risk in your proposed solution?

Each question has an inline text editor (double-click to edit) and a `timeMin` spinner. Teachers can check/uncheck any question.

#### QUIZ block — paste-to-parse format

```
1. Question text here
A. Wrong option
B. Correct option**
C. Wrong option
D. Wrong option

2. Next question...
```

- Questions: `^\d+[\.\)]\s`
- Options: `^[A-Da-d][\.\)]\s`
- Correct answer: trailing `**` on the option line
- `parseQuiz()` returns `ParsedQuestion[]`; shared by both HQL and General creators

#### `BlockForm` component

Opens as an inline panel when a block type is selected from the palette. Fields vary by `blockType`. Props:

```typescript
interface BlockFormProps {
  blockType: HqlBlockType
  stepNumber: number
  existingCount: number      // used to set default position
  onAdd: (block: HqlBlock) => void
  onCancel: () => void
  onPickFile: (field: string) => void
  initialBlock?: HqlBlock    // if set: edit mode — form pre-populated; button reads "SAVE CHANGES ✓"
}
```

#### BlockCard — per-block actions

Each saved block renders as a `BlockCard` with:
- **Sequence badge** (#1, #2 …) — distinguishes multiple blocks of the same type
- **✎ Edit** (gold) — reopens `BlockForm` pre-populated with `initialBlock`; "SAVE CHANGES ✓" replaces the block in-place using its `id`
- **⇄ Move** — animated step-picker panel opens; selecting a target step removes the block from the current step and appends it to the end of the target step's list
- **✕ Delete** — removes the block immediately from state

---

## Backend — HQL template (fully wired)

### Database tables

#### `learning_tasks`

```sql
id             UUID PRIMARY KEY DEFAULT gen_random_uuid()
title          TEXT NOT NULL
subject        TEXT NOT NULL
grade          TEXT NOT NULL
template_type  TEXT NOT NULL DEFAULT 'hql'
total_time_min INT  NOT NULL DEFAULT 0
step_labels    JSONB NOT NULL DEFAULT '["CHALLENGE","REFLECTION","CONTENT","QUIZ","DISCUSSION","ASSIGNMENT"]'
published      BOOLEAN NOT NULL DEFAULT false
created_by     UUID REFERENCES users(id)
created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
```

#### `task_step_blocks`

```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
task_id       UUID NOT NULL REFERENCES learning_tasks(id) ON DELETE CASCADE
step_number   INT  NOT NULL CHECK (step_number >= 1)     -- no upper bound (dynamic step count)
block_type    TEXT NOT NULL                               -- VIDEO|DOCUMENT|AUDIO|TEXT|REFLECTION|QUIZ|DISCUSSION|ASSIGNMENT
position      INT  NOT NULL DEFAULT 0
title         TEXT
time_min      INT  NOT NULL DEFAULT 0
text_content  TEXT                                        -- TEXT body / ASSIGNMENT instructions / DISCUSSION prompt
file_path     TEXT                                        -- VIDEO / DOCUMENT / AUDIO
original_name TEXT
data          JSONB                                       -- REFLECTION:{questions} QUIZ:{quizRaw,questions} ASSIGNMENT:{allowedFormats}
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Migrations:**
- `migrate_hql_step_blocks.sql` — creates the table and index
- `migrate_dynamic_steps.sql` — relaxes the `step_number` CHECK from `BETWEEN 1 AND 6` to `>= 1`; adds `step_labels JSONB` column to `learning_tasks`

### GraphQL schema additions

```graphql
type LearningTask {
  id: ID!
  title: String!
  subject: String!
  grade: String!
  templateType: String!
  totalTimeMin: Int!
  published: Boolean!
  folderPath: String!
  createdAt: String!
  updatedAt: String!
  quizQuestionCount: Int!
  blockCount: Int!
  stepLabels: [String!]!   # added for dynamic steps
}

input HqlTaskInput {
  id: ID                   # pre-generated UUID from frontend
  title: String!
  subject: String!
  grade: String!
  stepLabels: [String!]!   # dynamic step order
  blocks: [HqlBlockInput!]!
}

type Query {
  myTasks: [LearningTask!]!
  taskCount: Int!
  taskById(id: ID!): LearningTask
  hqlBlocks(taskId: ID!): String!   # returns flat block rows as JSON string
}

type Mutation {
  saveHqlTask(input: HqlTaskInput!, publish: Boolean): LearningTask!
  publishTask(id: ID!): LearningTask!
  deleteTask(id: ID!): Boolean!
}
```

### Save flow (`saveHqlTask`)

1. `INSERT INTO learning_tasks … ON CONFLICT (id) DO UPDATE SET …` — upserts the task row including `step_labels`
2. `DELETE FROM task_step_blocks WHERE task_id = $1` — wipes old blocks
3. Batch `INSERT INTO task_step_blocks …` — inserts every block from `input.blocks`; `data` column receives type-specific JSONB

### Load flow (edit mode)

1. `taskById(id)` — loads metadata: title, subject, grade, stepLabels, published
2. `hqlBlocks(taskId)` — loads flat block rows as JSON string
3. `rowsToStepBlocks(rows, stepCount)` — groups rows into `HqlBlock[][]` indexed by `step_number`; returns array of length `stepCount + 1` (index 0 unused)
4. `useEffect` populates full `TaskDraft` state; sets `template = 'hql'`; bypasses template selector

---

## Edit mode (`/task-creator/:taskId`)

- `useParams<{ taskId?: string }>()` reads the URL param
- `taskIdRef` is initialised from the URL param (new tasks use `crypto.randomUUID()`)
- `template` is pre-set to `'hql'` if `taskId` is present — skips the selector
- A `LOAD_HQL_TASK` query (combining `taskById` + `hqlBlocks` into one `useQuery`) fetches on mount
- The `useEffect` dependency is the query `data` object; it only runs when data is available

---

## General Task Creator (`GeneralTaskCreator.tsx`)

### Exported symbols

```typescript
export type GeneralBlockType = 'video' | 'document' | 'quiz' | 'assignment' | 'discussion' | 'note' | 'embed'
export const BLOCK_META: Record<GeneralBlockType, { icon, label, color }>
export interface GeneralBlock    // all block fields (see below)
export interface GeneralDraft    // { title, subject, grade, blocks }
```

### GeneralBlock shape

```typescript
interface GeneralBlock {
  id: string; type: GeneralBlockType; title: string; timeMin: number
  videoName: string; videoDescription: string
  documentName: string; documentDescription: string
  quizRaw: string; quizTimeMin: number
  assignmentInstructions: string; allowedFormats: AllowedFormats
  discussionPrompt: string
  noteText: string
  embedUrl: string; embedDescription: string; embedHeightPx: number
}
```

### Block types

| Type | Icon | Colour | Time counted? | Key fields |
|---|---|---|---|---|
| `video` | 🎬 | blue | ✓ | videoName (file picker), videoDescription |
| `document` | 📄 | gold | ✓ | documentName (file picker), documentDescription |
| `quiz` | ❓ | amber | ✓ | quizRaw (same HQL parse format), quizTimeMin |
| `assignment` | ✏ | green | ✓ | assignmentInstructions, allowedFormats |
| `discussion` | 💬 | purple | ✓ | discussionPrompt |
| `note` | 📋 | white dim | ✗ | noteText |
| `embed` | 🌐 | teal | ✓ | embedUrl, embedDescription, embedHeightPx |

### WEB EMBED block

- iframe has **no `sandbox` attribute** — deliberately removed so online compilers (Run button, form submissions) work. Teachers are assumed to link trusted tools.
- **Info modal** auto-shown when a new embed block is added. Lists known-good tools: JDoodle, OnlineGDB, Programiz, CodePen, JSFiddle, Scratch, Blockly.
- **Lazy preview**: iframe only renders after "▶ LOAD PREVIEW" is clicked. URL change resets loaded state.
- **Height presets**: S=400px / M=560px / L=720px / XL=920px + fine-tune number input.
- **"🔗 OPEN IN TAB"**: `window.open(url, '_blank', 'noopener')` — fallback for sites that block embedding.

### Block accordion behaviour

All blocks start collapsed. Auto-expands when title is empty. ▲/▼ reorder (disabled at boundaries). ✕ removes immediately.

### Backend status ✅ FULLY WIRED

- `saveGeneralTask(input: GeneralTaskInput!, publish: Boolean): LearningTask!` — upserts task row, deletes old blocks, batch-inserts new blocks into `task_blocks`
- `generalBlocks(taskId: ID!): String!` — returns all block rows as JSON string for edit mode
- Edit mode: `/task-creator/:taskId?template=general` — fetches `taskById` + `generalBlocks`; populates full draft state from DB
- File upload: `fileStoreRef` Map holds pending `File` objects; `doSave()` uploads all pending files via `POST /upload?taskId&folder` before calling the GraphQL mutation; returned `path` is written into block state
- SAVE DRAFT and PUBLISH both call `saveGeneralTask` with `publish: false` / `publish: true` respectively

---

## Task Preview Modal (`TaskPreviewModal.tsx`)

Full-screen overlay showing a read-only learner-perspective view of the current draft. Does not modify draft state.

### Props (discriminated union)

```typescript
type PreviewProps =
  | { template: 'hql'; draft: TaskDraft; onClose: () => void }
  | { template: 'general'; draft: GeneralDraft; onClose: () => void }
```

### HQL preview

Dynamic tab strip: ORIENTATION + one tab per entry in `draft.stepLabels`. Navigation by tab click or PREV/NEXT footer. Footer shows `{step + 1} / {draft.stepLabels.length + 1}`.

Each tab renders via `HqlStepPreview` which receives `stepNumber` and the corresponding `HqlBlock[]`. Block rendering uses `BLOCK_META` imported from `LearningTaskCreator.tsx`.

- ORIENTATION: title, subject/grade badges, HQL intro text, step-type chips from `stepLabels`
- VIDEO/DOCUMENT/AUDIO: file card with type icon, name, time pill
- TEXT: rendered text body
- REFLECTION: each checked question as a read-only card with empty text-box placeholder
- QUIZ: fully rendered MCQ — correct answer highlighted green (teacher preview privilege)
- DISCUSSION: discussion prompt + phase cards
- ASSIGNMENT: instructions + allowed format chips

Unsaved/empty fields show faded placeholder text.

### General preview

Scrollable list of `GeneralBlockPreview` cards. Each card shows type header bar (coloured left border) + learner-facing body. Embed blocks show URL + "Preview loads when task is active" note (iframe not loaded in preview).

---

## Task Manager (`LearningTaskManager.tsx`)

Route: `/task-manager`

- `myTasks` GraphQL query — live task list (mock data removed)
- Grade filter tabs + search bar
- "+ NEW TASK" → `/task-creator` (fresh UUID generated on mount)
- EDIT → `/task-creator/${task.id}` (edit mode — full draft load from DB)
- DELETE → `deleteTask` mutation (cascades to all blocks)
- PUBLISH toggle → `publishTask` mutation

---

## Pending work

### General task creator backend

```graphql
saveGeneralTask(input: GeneralTaskInput!, publish: Boolean): LearningTask!
```

General task blocks will be stored in `task_step_blocks` with `step_number = 0` (freeform; no concept of steps). The `data JSONB` column holds all type-specific fields.

### File upload ✅ COMPLETE

End-to-end file upload is fully wired in both the HQL and General creators:

- **Backend:** `POST /upload?taskId=<uuid>&folder=<step-label>` — Multer stores files at `backend/uploads/tasks/<taskId>/<folder>/<filename>`; returns `{ path, originalName }`. Files are served statically at `/uploads/*`.
- **Frontend:** `fileStoreRef` is a `Map<string, File>` keyed by block ID. `onPickFile` stores the `File` object in the map (no immediate upload). `doSave()` iterates the map, uploads each pending file, and writes the returned `path` into block state before calling the GraphQL save mutation.
- **DB:** `file_path` in `task_step_blocks` / `task_blocks` stores the relative path `tasks/<taskId>/<folder>/<filename>`. Learners access files via the `/uploads/` static route.
- **Vite proxy:** `/upload` and `/uploads` are proxied to `http://localhost:4000` in `vite.config.ts`.

### Wire planning hub to live data

`TeacherPlanningHub` timetable/term/year tabs currently use mock data. Once tasks have a DB-backed schedule concept, these can be wired to live queries.

### Activate task mutation

`handleActivate` in `TeacherClassesOverview.tsx` currently logs to console. A real mutation (defining format, enabled steps, due date) needs to be designed and wired.
