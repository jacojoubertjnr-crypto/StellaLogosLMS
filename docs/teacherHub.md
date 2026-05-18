# Teacher Hub — Design & Implementation Guide

> **Status:** ✅ FULLY COMPLETE — all steps implemented and wired to live DB.
> **Depends on:** Existing `TeacherDashboard`, `TeacherRegisterUI`, `SocialUI`, `HomeCrossroads` (reference pattern).

---

## Overview

Teachers currently land directly on the Teacher Dashboard (class dashboard) after login. This phase inserts a proper
hub page between login and the Teacher Dashboard — mirroring the learner's `HomeCrossroads` — so the teacher
experience feels like entering a school building rather than being teleported straight into a classroom.

The hub gives the teacher five destinations, plus a new **Staffroom** space for whole-staff communication
and school-wide announcements.

---

## Routing Changes

| Route | Before | After |
|---|---|---|
| `/home` (teacher) | `TeacherDashboard` (Teacher Dashboard) directly | New `TeacherHub` page |
| `/teacherDashboard` | Does not exist | `TeacherDashboard` (Teacher Dashboard) moved here |
| `/staffroom` | Does not exist | New `StaffroomUI` page |

`HomePage.tsx` already role-switches between `HomeCrossroads` and `TeacherDashboard`. After this phase it
will render `TeacherHub` for teachers instead. `TeacherDashboard` moves to its own route `/teacherDashboard`.

---

## Teacher Hub Page — `TeacherHub.tsx`

Route: `/home` (teacher/admin role only, via `HomePage.tsx` role switch)

### Layout

Mirrors `HomeCrossroads` exactly in structure:

```
┌─────────────────────────────────────────────┐
│  Banner / AppHeader                         │
├─────────────────────────────────────────────┤
│                                             │
│   ┌─────────────────────────────────────┐  │
│   │  LIVE LESSON  (primary portal btn)  │  │
│   │  Themed label  ·  class + step      │  │
│   └─────────────────────────────────────┘  │
│                                             │
│   ┌──────────┐  ┌──────────┐               │
│   │ STAFFROOM│  │ REGISTER │               │
│   └──────────┘  └──────────┘               │
│   ┌──────────┐  ┌──────────┐               │
│   │ MESSAGES │  │  CLASSES │               │
│   └──────────┘  └──────────┘               │
│                                             │
└─────────────────────────────────────────────┘
```

### Tiles

| Tile | Route | Notes |
|---|---|---|
| LIVE LESSON (portal) | `/teacherDashboard` (or `/task?classId=X&step=Y`) | Primary action; shows teacher's current active class |
| STAFFROOM | `/staffroom` | New page — see below |
| REGISTER CLASS | `/register` | Existing `TeacherRegisterUI` |
| MESSAGES | `/social` | Existing `SocialUI` |
| ACADEMIC CLASSES | `/teacherDashboard` | Existing `TeacherDashboard` (renamed route) |

### Data needed
- Teacher's current academic class (for the portal label) — already available via `teacherClasses` query.
- No new GraphQL needed for the hub itself.

---

## Staffroom Page — `StaffroomUI.tsx`

Route: `/staffroom`

The staffroom simulates the physical school staffroom: a shared space for all teachers to communicate,
hear from the principal, and post school-wide notices.

### Layout

Three collapsible sections using the same `SmartContainer` accordion pattern as `AttendenceUI`:

```
┌──────────────────────────────────────────────────────────┐
│  📢 SPEAKER  [always visible even when collapsed]        │
│  ┌──────────────────────────────────────────────────┐   │
│  │  🎙 Mrs. Joubert  [PODIUM ACTIVE]                │   │
│  │  "Please ensure your Phase II content uploads... │   │
│  │  [scrollable speaker message stream]             │   │
│  └──────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────┤
│  💬 STAFF CHAT  [collapsible]                            │
│  [roster strip — all staff with presence dots]           │
│  [scrollable chat messages]                              │
│  [message input + SEND]                                  │
├──────────────────────────────────────────────────────────┤
│  📋 ANNOUNCEMENTS  [collapsible]                         │
│  [NEW ANNOUNCEMENT form — see below]                     │
│  [list of all announcements, newest first]               │
└──────────────────────────────────────────────────────────┘
```

---

### Section 1 — Speaker Channel

The Speaker Channel is a **separate, elevated chat stream** at the top of the staffroom. Only the
teacher or admin who currently holds the podium can post to it. All staff can read it.

#### Podium state
- One row in a `staffroom_state` DB table holds `current_speaker_id UUID` (nullable).
- When `null`: banner reads "No active speaker — podium is open."
- When set: banner shows the speaker's name + role + a gold 🎙 badge.

#### Who can assign the podium?
- Admin role only can click **GIVE PODIUM** and select a staff member from a dropdown.
- The current speaker can click **RELEASE PODIUM** to clear the slot.
- Admin can also force-clear the podium.

#### Speaker messages
- The speaker posts via a dedicated input below the speaker stream (hidden for non-speakers).
- Messages stored in `staff_messages` with `is_speaker_post = true`.
- The speaker stream shows only `is_speaker_post = true` messages, ordered ascending.
- The main Staff Chat shows ALL messages (including speaker posts, which appear with a 🎙 prefix).

---

### Section 2 — Staff Chat

Global chat visible and writable by all teaching staff and admin.

- Roster strip at top: all staff members with coloured presence dots (same pattern as `TeacherRegisterUI`).
- Scrollable message thread, newest at bottom.
- Enter-to-send input.
- Messages stored in `staff_messages` with `is_speaker_post = false`.
- 5 s polling.

---

### Section 3 — Announcements

Any teacher can create an announcement. All teachers always see all announcements.
Relevant announcements also appear in the learner's `TeacherTicker` in `AttendenceUI`.

#### Create form (collapsible, sits above the list)

```
┌─────────────────────────────────────────────┐
│  NEW ANNOUNCEMENT                           │
│  ┌─────────────────────────────────────┐   │
│  │ [announcement body — textarea]      │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  TARGET:  [ ALL LEARNERS ]  [ SELECT GRADES]│
│  (if SELECT GRADES):                        │
│  □ Grade 8  □ Grade 9  □ Grade 10          │
│  □ Grade 11  □ Grade 12                    │
│                                             │
│  [ POST ANNOUNCEMENT ]                      │
└─────────────────────────────────────────────┘
```

#### Announcement list

- Ordered: pinned first (📌), then newest-first.
- Each card shows: teacher name, timestamp, target badge (ALL / Gr 8,10), body.
- Any teacher can pin/unpin their own announcements.
- Admin can pin/unpin/delete any announcement.
- Clicking a learner-grade badge filters the visible list (UI only, not a query).

#### Learner visibility
- Announcements targeting `'all'` or matching the learner's grade appear in `TeacherTicker`.
- `TeacherTicker` currently reads from `notices` (register-class scoped). After this phase it
  reads from `announcements` (school-wide) instead — or both, merged.

---

## Database

### New tables

```sql
-- Global staff chat messages
CREATE TABLE IF NOT EXISTS staff_messages (
  id              BIGSERIAL   PRIMARY KEY,
  sender_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body            TEXT        NOT NULL,
  is_speaker_post BOOLEAN     NOT NULL DEFAULT false,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_staff_messages_sent ON staff_messages(sent_at ASC);

-- School-wide announcements (visible to all staff; filtered subset to learners)
CREATE TABLE IF NOT EXISTS announcements (
  id           BIGSERIAL   PRIMARY KEY,
  created_by   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body         TEXT        NOT NULL,
  target       TEXT        NOT NULL DEFAULT 'all',
    -- 'all' or comma-separated grade strings: '8,9,10'
  pinned       BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at DESC);

-- Single-row staffroom state (podium)
CREATE TABLE IF NOT EXISTS staffroom_state (
  id                 INT  PRIMARY KEY DEFAULT 1,
  current_speaker_id UUID REFERENCES users(id) ON DELETE SET NULL,
  CHECK (id = 1)     -- enforces single-row
);
INSERT INTO staffroom_state (id) VALUES (1) ON CONFLICT DO NOTHING;
```

### Migration file
`backend/src/db/migrate_staffroom.sql` — safe to re-run.

---

## GraphQL

### New types

```graphql
# ── Staffroom ──────────────────────────────────────────────────────────────

type StaffMessage {
  id: ID!
  senderId: ID!
  senderName: String!
  body: String!
  isSpeakerPost: Boolean!
  sentAt: String!
}

type Announcement {
  id: ID!
  createdBy: String!       # display name
  body: String!
  target: String!          # "all" or "8,9,10"
  pinned: Boolean!
  createdAt: String!
}

type StaffroomState {
  speakerId: ID
  speakerName: String
}
```

### New queries

```graphql
# Staff chat messages (limit most recent N)
staffMessages(limit: Int): [StaffMessage!]!

# Speaker stream only
speakerMessages(limit: Int): [StaffMessage!]!

# All announcements (staff view — no filter)
allAnnouncements: [Announcement!]!

# Learner view — filtered by grade
myAnnouncements: [Announcement!]!   # resolver checks user's grade against target

# Current podium state
staffroomState: StaffroomState!
```

### New mutations

```graphql
# Staff chat
sendStaffMessage(body: String!, isSpeakerPost: Boolean): StaffMessage!

# Announcements
createAnnouncement(body: String!, target: String!): Announcement!
pinAnnouncement(id: ID!, pinned: Boolean!): Announcement!
deleteAnnouncement(id: ID!): Boolean!

# Podium — admin only
assignPodium(userId: ID): StaffroomState!   # null userId = release
```

---

## Implementation Status

### Step 1 — DB migration ✅ DONE
`backend/src/db/migrate_staffroom.sql` created and applied. All 3 tables live in production DB.

### Step 2 — GraphQL ✅ DONE
All types, queries, and mutations added to `typeDefs.ts` and `resolvers.ts`.
- `staffMessages` / `speakerMessages` / `staffroomState` / `allAnnouncements` / `myAnnouncements` / `allStaff`
- `sendStaffMessage` / `createAnnouncement` / `pinAnnouncement` / `deleteAnnouncement` / `assignPodium`
- `myAnnouncements` filters by learner grade via `enrollments → register_classes` join; uses `string_to_array @> ARRAY` for CSV grade matching

### Step 3 — Teacher Hub ✅ DONE
`TeacherHome.tsx` (renamed from planned `TeacherHub.tsx`) — portal + 4 tiles + `TeacherPlanningHub` section.

### Step 4 — `StaffroomUI.tsx` ✅ DONE
Three **inline accordion** sections (not modal overlay — better for viewing multiple sections simultaneously):
- Speaker Channel / Staff Chat / Announcements
- `ExpandingCard` component: 52px collapsed bar, `AnimatePresence height 0→auto` expansion, rotating arrow
- All sections start collapsed; chat areas capped at `maxHeight: 280px` with internal scroll
- Centered layout using `theatrical-container` + `safe-zone`; `◂ HOME` back button at bottom
- Scroll fix: `height: calc(100vh - 52px)` + `marginTop: 52px` (not `minHeight`) — body overflow is hidden globally

### Step 5 — Routing ✅ DONE
All routes added; `AppHeader` banner map updated; all nav links updated.

### Step 6 — Learner `TeacherTicker` wiring ✅ DONE
`AttendenceUI.tsx` now queries `myAnnouncements` (30 s poll). Resolver filters by learner grade.
Pinned announcements appear with 📌 and a brighter left border. Empty state shows "No announcements at this time".

### Step 7 — Teacher Planning Hub ✅ DONE
`src/pages/TeacherPlanningHub.tsx` — 3-tab collapsible on `TeacherHome`:
- **TIMETABLE**: 10-day cycle, 7 color-coded classes, Task · Step · N/M per slot
  - Week navigation: clicking ◂/▸ auto-selects Monday of the destination week
  - Only one direction arrow shown: ◂ when on week 2, ▸ when on week 1
  - Mock data (`src/mockPlanningData.ts`) — no DB table for timetable schedule exists yet
- **TERM PLAN**: ✅ wired to live `myTasks` GraphQL query — tasks grouped by grade; published/draft badges; EDIT button → `/task-creator/:id`
  - `taskToLearningTaskPlan()` converter maps live `stepLabels[]` to `LearningTaskPlan` shape required by `TaskCard`
  - Grade tabs (GR 9 / GR 10 / GR 11 / GR 12) — tasks grouped by `task.grade` from DB
- **YEAR PLAN**: 4-term structure per grade; Gr 9–12 plans with exam flags and year mark formulas
  - Mock data — no DB table for curriculum-level year plan exists yet

### Step 8 — Task Activation Form ✅ DONE (fully wired)
`TeacherClassesOverview.tsx` — teacher can activate a learning task from any class card:
- **FORMAT** toggle: FULL LT (Challenge → Reflection → Content → Quiz → Discussion) or SHORTENED (Content → Quiz only)
- Live step preview list updates as format changes
- **INCLUDE FINAL ASSIGNMENT** toggle (default on): when off, Quiz is the terminal assessment and due date label reflects this
- Resulting `enabledSteps` array: `[1,2,3,4,5,6]` / `[1,2,3,4,5]` / `[3,4,6]` / `[3,4]`
- HQL step labels corrected to match `LearningTaskCreator.tsx`: CHALLENGE (1), REFLECTION (2), CONTENT (3), QUIZ (4), DISCUSSION (5), ASSIGNMENT (6)
- `handleActivate` fully wired to `activateTask(academicClassId, taskId, format, dueDate, enabledSteps)` GraphQL mutation
- Active task banner shown on class card after activation (title + due date); `activateTask` also invalidates the `tc:*` Redis cache key

---

## Files Created / Modified

| File | Status | Notes |
|---|---|---|
| `backend/src/db/migrate_staffroom.sql` | ✅ Done | 3 new tables, applied to DB |
| `backend/src/schema/typeDefs.ts` | ✅ Done | Staffroom types + queries + mutations |
| `backend/src/schema/resolvers.ts` | ✅ Done | All staffroom resolvers |
| `src/pages/TeacherHome.tsx` | ✅ Done | Hub: portal + tiles + TeacherPlanningHub |
| `src/pages/StaffroomUI.tsx` | ✅ Done | 3-section staffroom (inline accordion) |
| `src/pages/TeacherPlanningHub.tsx` | ✅ Done | 3-tab planning: timetable / term / year |
| `src/mockPlanningData.ts` | ✅ Done | 7 classes, 10-day cycle, term + year plans |
| `src/pages/HomePage.tsx` | ✅ Done | Renders `TeacherHome` for Teacher/Admin |
| `src/App.tsx` | ✅ Done | `/staffroom`, `/classes`, `/teacherDashboard` routes |
| `src/pages/TeacherRegisterUI.tsx` | ✅ Done | Nav updated → `/teacherDashboard` |
| `src/pages/TeacherDashboard.tsx` | ✅ Done | `?classId` param + "◂ MY CLASSES" back button |
| `src/pages/AttendenceUI.tsx` | ✅ Done | `myAnnouncements` wired into TeacherTicker (grade-filtered, 30 s poll) |
| `src/pages/StaffroomUI.tsx` | ✅ Updated | ExpandingCard accordion, collapsed start, scroll fix, centered layout, ◂ HOME |
| `src/pages/TeacherPlanningHub.tsx` | ✅ Updated | TERM PLAN wired to live `myTasks` query; `taskToLearningTaskPlan()` converter; grade grouping; EDIT button |
| `src/mockPlanningData.ts` | ✅ Updated | `GradeTermPlan` interface + `GRADE_TERM_PLANS` export (TIMETABLE + YEAR PLAN still use mock) |
| `src/pages/TeacherClassesOverview.tsx` | ✅ Updated | Task activation form fully wired to `activateTask` mutation; active task banner on class card |
| `src/pages/QuestScreen.tsx` | ✅ Updated | ◂ HOME button added to HeaderBar |
