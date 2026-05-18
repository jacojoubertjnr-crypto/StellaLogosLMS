## Stella Logos: Data Vault Design Brief
Technical Architecture for a State-Driven "Learning Quest" Ecosystem

1. Architectural Philosophy
The Stella Logos Database Segment is engineered to support a "State-Driven" UI where the platform functions as an Educational OS. It utilizes a Dual-Track Data Strategy: decoupling Operational State (the mechanical "where" of a student) from the Analytical Narrative (the pedagogical "why" and "how").

Primary Engine: PostgreSQL (Reliability & Relational Integrity)

Cache Layer: Redis (High-velocity "Theater Mode" performance)

Standardization: xAPI + LTI 1.3 (Institutional Portability)

2. Core Database Schema
A. Institutional Core (Hierarchy)
These tables manage the transition from administrative data to classroom-specific activities.

Users: Manages global identity, roles (Admin/Teacher/Learner), and the PointsBalance for the virtual economy.

Register_Classes: Administrative "Home Room" groupings for school-level reporting.

Academic_Classes: Subject-specific quest containers (e.g., Grade 10 IT - Group A).

Enrollments: The bridge linking a Learner to both their administrative and academic contexts.

B. The Marker System (Quest State)
This is the engine of the "Learning Quest."

Learner_Progress: Tracks the granular CurrentStep (the coordinate).

Wait-State Guard: An is_locked boolean that prevents students from advancing until the teacher triggers a "Release" event.

Activity_Logs: A dedicated table storing JSONB blobs. A database trigger automatically converts every "Marker" movement into an xAPI-compliant statement.

C. Economy & Identity Injection
Shop_Items: Defines the pixel-art assets (Skins, Badges, Themes) and their costs.

Learner_Inventory: Tracks ownership. The IsActive flag determines which asset's metadata is injected into the Frontend CSS variables to "skin" the UI.

D. Conversations & Messages (Phase 9 — built)
The messaging system uses a conversation-based model supporting both 1:1 and group chats. Migration: `backend/src/db/migrate_messages.sql`.

- `conversations` — Container for a chat thread. `type` is `'individual'` or `'group'`. All messages belong to a conversation.

- `conversation_participants` — Bridge table: `(conversation_id, user_id)` composite PK. Determines who can see a conversation. Indexed on `user_id` for fast "my conversations" lookups.

- `group_chat_metadata` — Name + creator for group conversations. Only exists for rows where `conversations.type = 'group'`.

- `messages` — All messages regardless of chat type. `conversation_id FK`, `sender_id FK`, `content TEXT`, `context_link TEXT` (optional deep-link e.g. `task://class/{id}/step/{n}`). Indexed `(conversation_id, sent_at ASC)`.

- `message_read_status` — Read receipts. `(message_id, user_id)` composite PK. Inserted in batch when a user opens a conversation (`markConversationRead` mutation). Unread count is a subquery on messages where no receipt exists.

The `findOrCreateIndividualConversation` helper (resolvers.ts) ensures no duplicate 1:1 conversations are created — used by `sendToTeacher`, `sendToLearner`, `sendBroadcast`, and `createConversation`.

E. Register Period (Phase 5 — built)
Three tables support the morning register session. Migration: `backend/src/db/migrate_register.sql`.

- `register_entries` — Roll call record per learner per day. `(register_class_id, learner_id, date)` is UNIQUE, so re-marking uses an upsert (`ON CONFLICT DO UPDATE`). Status values: `present`, `late`, `absent`.

- `register_chat_messages` — Class-wide group chat thread keyed by `register_class_id` (no `receiver_id` — all learners in the class see all messages). Indexed on `(register_class_id, sent_at DESC)` for fast recent-message queries.

- `notices` — Notice board entries. Teacher posts notices; each can be pinned (`pinned BOOLEAN`). Pinned notices sort first. Keyed by `register_class_id` and authored by `teacher_id`.

F. Learning Task Groups (Phase 5b DB layer — built)
Two tables support the Phase III cooperative learning grouping system. Groups are linked to a conversation so members can chat during the session.

- `task_groups` — One group per academic class per session date. `conversation_id FK` links the group to a shared group conversation automatically created on `createTaskGroup`.

- `task_group_members` — `(group_id, learner_id, role)` composite PK. Role is enforced by a CHECK constraint: `'Leader'`, `'Timer'`, `'Scribe'`, `'AngleChecker'`, `'Learner'`. Each member is also added to the group conversation as a participant.

G. Economy Ledger (Phase 6 — built)
Immutable record of every points delta across the platform. Migration: `backend/src/db/migrate_ledger.sql`.

- `points_ledger` — `(id BIGSERIAL, learner_id UUID, delta INT, reason TEXT, meta JSONB, created_at TIMESTAMPTZ)`. Indexed on `(learner_id, created_at DESC)`. Reasons: `'step_complete'`, `'quest_bonus'`, `'purchase'`. `meta` carries item name for purchases.

Every balance-changing operation (advanceStep, purchaseItem) inserts a ledger row in the same transaction as the balance update — they cannot diverge.

H. Learning Tasks (Phase 5d — built)
Two tables store task definitions and their content blocks. Migrations: `migrate_learning_tasks.sql`, `migrate_hql_step_blocks.sql`, `migrate_dynamic_steps.sql`.

- `learning_tasks` — `(id UUID, title, subject, grade, template_type, total_time_min, step_labels JSONB, published BOOLEAN, created_by UUID, created_at)`. `step_labels` is the ordered array of step type names (e.g. `["CHALLENGE","REFLECTION","CONTENT","QUIZ","DISCUSSION","ASSIGNMENT"]`) and is the single source of truth for step count.

- `task_step_blocks` — Blocks for HQL tasks: `(id UUID, task_id, step_number, block_type, position, title, time_min, text_content, file_path, original_name, data JSONB)`. `step_number` is `>= 1` (relaxed from initial CHECK after `migrate_dynamic_steps.sql`). FK `ON DELETE CASCADE` — deleting a task removes all its blocks.

- `task_blocks` — Blocks for General tasks: same shape as `task_step_blocks` but without `step_number` (blocks are ordered by `position` only).

`academic_classes` has four columns added by `migrate_activate_task.sql` for the active task overlay shown on class cards: `active_task_id UUID`, `active_format TEXT`, `active_due_date DATE`, `active_enabled_steps JSONB`.

I. LTI 1.3 (Phase 7 — built, protocol pending)
Four tables support grade passback and SSO with external LMS platforms. Migration: `backend/src/db/migrate_lti.sql`.

- `lti_platforms` — Registered external platforms (Canvas, Moodle, etc.): issuer URL, client_id, OIDC endpoints, JWKS endpoint.
- `lti_deployments` — Each platform can deploy the tool multiple times; `(platform_id, deployment_id)` is UNIQUE.
- `lti_user_links` — Maps a platform user (`sub` claim) to a local Stella Logos user. `(platform_id, platform_user_id)` is UNIQUE.
- `lti_grade_passback` — AGS (Assignment and Grade Services) records: normalised score (0.00–1.00), `resource_link_id`, `synced_at` timestamp for tracking when the grade was sent back to the platform.

Indexes: `idx_lti_grade_passback_user` on `local_user_id`, `idx_lti_grade_passback_resource` on `(platform_id, resource_link_id)`, `idx_lti_user_links_local` on `local_user_id`.

3. Operational Logic & Data Flow

**Live class sync:** Teacher dashboard, group chat, and staffroom use Apollo polling (4–10 s intervals) rather than WebSockets. For the class sizes Stella Logos targets, polling is simpler and sufficient.

**Redis caching (optional):** `backend/src/lib/cache.ts` wraps an `ioredis` client with graceful fallback. If Redis is unreachable at startup, all cache calls silently no-op and the app works identically. When Redis is running, the following queries are cached:
- `teacherClasses` → `tc:<userId>` (TTL 30 s)
- `myConversations` → `convs:<userId>` (TTL 5 s)
- `conversationMessages` → `msgs:<convId>:<userId>:<limit>:<offset>` (TTL 4 s)

Write mutations immediately invalidate affected keys via `cacheDel` / `cacheDelPattern`.

**Atomic transactions:** All purchase events are wrapped in `BEGIN/COMMIT/ROLLBACK`. Points deduction, inventory grant, and ledger insert happen together — if any step fails, all roll back.

**xAPI logging:** The `log_marker_movement()` PL/pgSQL trigger fires automatically on every `UPDATE` to `learner_progress.current_step`. No application code needs to call it. The resulting xAPI statements in `activity_logs` are queryable via:
- `activitySummary(academicClassId)` GraphQL query (per-learner step + event summary for teacher view)
- `GET /analytics/export?classId=<uuid>&format=csv|json` REST endpoint (full statement export; Teacher/Admin JWT required)

**Paywall guard:** Row-Level Security (RLS) enforced at DB level — unpaid learners are physically rejected from curriculum data regardless of what the frontend sends.

4. Optimization Strategy

**Partial indexing:** `learner_inventory` indexed on `is_active = true` for near-instant active skin lookup.

**Scalable messaging:** `messages` table uses `BIGSERIAL` keys with `(conversation_id, sent_at ASC)` composite index. `message_read_status` uses a `(message_id, user_id)` composite PK — unread count is a subquery, never a full scan.

**Asset lazy-loading:** Shop item metadata is cached in Apollo's in-memory cache; `myInventory` is fetched once per session by `ProtectedLayout` on Learner login.

5. Success Metrics for Data

**Zero-desync:** The "Marker" (UI step) and the xAPI statement in `activity_logs` are written in a single trigger — they cannot diverge.

**Integrity:** LTI 1.3 grade passback records are immutable rows with a `synced_at` timestamp; `points_ledger` rows are insert-only.

**LTI verifiability:** `lti_grade_passback.score` is stored as a normalised decimal (0.00–1.00) with the raw `resource_link_id` for cross-referencing against the platform's gradebook.

## AI Agent Prompts to Build the System
These prompts are designed for an LLM (like Gemini or Claude) acting as a Full-Stack Engineer. They are modular to prevent "context window" overflow and ensure precision.

Phase 1: Database Initialization (Supabase/PostgreSQL)
"Act as a Senior Data Engineer. I am building 'Stella Logos,' a gamified LMS. Generate the SQL DDL for a PostgreSQL database. The schema must include:

A Users table with UUIDs, roles (Admin, Teacher, Learner), and a PointsBalance (Integer).

A Register_Classes (administrative) and Academic_Classes (subject-based) hierarchy, linked by an Enrollments table.

A Learner_Progress table with a CurrentStep (Integer) and an is_locked (Boolean) 'Wait-State' guard.

An Activity_Logs table with a JSONB column for xAPI statements.

A Shop_Items and Learner_Inventory system where inventory items have an is_active boolean for UI skin injection.
Include primary keys, foreign keys, and unique constraints for enrollments."

Phase 2: Automation & Pedagogical Logic (Triggers)
"Write a PostgreSQL PL/pgSQL function and a trigger. Every time Learner_Progress.CurrentStep is updated, the function must automatically insert a new record into the Activity_Logs table. The record should format an xAPI-compliant JSONB object including the Actor (User Email), the Verb ('progressed'), and the Result (the new step number). Ensure the trigger only fires if the CurrentStep value actually changed."

Phase 3: The Economy Transaction (API Layer)
"Write a Node.js function using a PostgreSQL client (like pg or Supabase-js) to handle a 'Shop Purchase.' The function must be an Atomic Transaction:

Check if the user has enough PointsBalance.

Deduct the price of the item from the User table.

Add the item to the Learner_Inventory table.

Return an error and rollback if any step fails.
Also, provide a separate query to fetch the currently 'Active' skin for a user, using a partial index for speed."

Phase 4: Real-Time Sync Logic (Socket.io/Middleware)
"Act as a Backend Architect. Design a Socket.io event handler for 'Theater Mode.' When a student's CurrentStep updates in the database, the server should broadcast a message to a specific room (the AcademicClassID). The payload should contain the UserID and their new ProgressPercentage. Suggest a strategy to use Redis to buffer these updates so the main database isn't overwhelmed during a live class of 40 students."

Phase 5: The "Identity Injection" (Frontend/CSS)
"Act as a React/Tailwind expert. Create a ThemeContext using Zustand. This context should fetch the asset_path of a user's 'Active' inventory item from the database. Then, use that path to dynamically update CSS variables (e.g., --button-texture, --panel-border) across the entire app. Show how to implement 9-slice scaling in Tailwind to ensure these pixel-art assets scale crisply without distortion."