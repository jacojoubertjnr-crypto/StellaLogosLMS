-- ============================================================
-- Stella Logos — Messages Migration (Phase 9)
-- Run against an existing stella_logos database to upgrade the
-- old thread_id/receiver_id messages table to the full
-- conversation-based schema.
--
-- Usage (from project root):
--   $env:PGPASSWORD = "1234"
--   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" `
--       -U postgres -d stella_logos `
--       -f backend/src/db/migrate_messages.sql
-- ============================================================

-- 1. Drop old messages table (CASCADE removes its index too).
--    Safe: no real data was persisted in the old structure.
DROP TABLE IF EXISTS messages CASCADE;

-- 2. Drop stale tables from any previous partial run of this migration.
DROP TABLE IF EXISTS message_read_status CASCADE;
DROP TABLE IF EXISTS task_group_members  CASCADE;
DROP TABLE IF EXISTS task_groups         CASCADE;
DROP TABLE IF EXISTS group_chat_metadata CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations       CASCADE;

-- ============================================================
-- Conversation tables
-- ============================================================

CREATE TABLE conversations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type       TEXT        NOT NULL CHECK (type IN ('individual', 'group')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX idx_conv_participants_user ON conversation_participants(user_id);

CREATE TABLE group_chat_metadata (
  conversation_id UUID NOT NULL PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  created_by      UUID NOT NULL REFERENCES users(id)
);

-- ============================================================
-- Messages (now linked to a conversation, not a raw thread_id)
-- ============================================================

CREATE TABLE messages (
  id              BIGSERIAL   PRIMARY KEY,
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT        NOT NULL,
  context_link    TEXT,                  -- optional deep-link e.g. "task://class/{id}/step/{n}"
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, sent_at ASC);

-- ============================================================
-- Read receipts
-- ============================================================

CREATE TABLE message_read_status (
  message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

-- ============================================================
-- Learning task groups (Phase III cooperative learning)
-- ============================================================

CREATE TABLE task_groups (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_class_id UUID        NOT NULL REFERENCES academic_classes(id) ON DELETE CASCADE,
  conversation_id   UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  session_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE task_group_members (
  group_id   UUID NOT NULL REFERENCES task_groups(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('Leader', 'Timer', 'Scribe', 'AngleChecker', 'Learner')),
  PRIMARY KEY (group_id, learner_id)
);
