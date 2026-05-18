-- ============================================================
-- Stella Logos — Register Period Migration (Phase 5)
-- Creates the three register-period tables if they don't exist.
-- Safe to re-run (all statements use IF NOT EXISTS).
--
-- Usage (from project root):
--   $env:PGPASSWORD = "1234"
--   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" `
--       -U postgres -d stella_logos `
--       -f backend/src/db/migrate_register.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS register_entries (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  register_class_id UUID        NOT NULL REFERENCES register_classes(id) ON DELETE CASCADE,
  learner_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date              DATE        NOT NULL DEFAULT CURRENT_DATE,
  status            TEXT        NOT NULL CHECK (status IN ('present', 'late', 'absent')),
  marked_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (register_class_id, learner_id, date)
);

CREATE TABLE IF NOT EXISTS register_chat_messages (
  id                BIGSERIAL   PRIMARY KEY,
  register_class_id UUID        NOT NULL REFERENCES register_classes(id) ON DELETE CASCADE,
  sender_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body              TEXT        NOT NULL,
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_register_chat_class ON register_chat_messages(register_class_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS notices (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  register_class_id UUID        NOT NULL REFERENCES register_classes(id) ON DELETE CASCADE,
  teacher_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body              TEXT        NOT NULL,
  pinned            BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
