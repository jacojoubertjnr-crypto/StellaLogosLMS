-- ============================================================
-- Stella Logos — Learning Task Tables
-- Phase 5d: Task Designer backend
-- Run: psql postgresql://postgres:1234@localhost:5432/stella_logos -f src/db/migrate_learning_tasks.sql
-- Safe to re-run (IF NOT EXISTS everywhere).
-- ============================================================

-- Main task record — one row per learning task (HQL or General template)
CREATE TABLE IF NOT EXISTS learning_tasks (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT        NOT NULL,
  subject         TEXT        NOT NULL,
  grade           TEXT        NOT NULL,
  template_type   TEXT        NOT NULL CHECK (template_type IN ('hql', 'general')),
  total_time_min  INTEGER     NOT NULL DEFAULT 0,
  created_by      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  published       BOOLEAN     NOT NULL DEFAULT false,
  -- base upload folder relative to backend/uploads/  e.g. tasks/abc-uuid
  folder_path     TEXT        NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learning_tasks_created_by ON learning_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_learning_tasks_published  ON learning_tasks(published);

-- HQL template: one row per step (0=Orientation … 6=Assignment)
CREATE TABLE IF NOT EXISTS task_steps (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id                  UUID        NOT NULL REFERENCES learning_tasks(id) ON DELETE CASCADE,
  step_number              INTEGER     NOT NULL CHECK (step_number BETWEEN 0 AND 6),
  -- Step 1 (Challenge)
  challenge_video_path     TEXT,        -- relative path under folder_path
  challenge_pdf_path       TEXT,
  challenge_time_min       INTEGER,
  -- Step 2 (Reflection)
  reflection_questions     JSONB,       -- [{id, text, checked, timeMin}]
  -- Step 4 (Quiz)
  quiz_raw                 TEXT,
  quiz_time_min            INTEGER,
  -- Step 5 (Discussion)
  discussion_time_min      INTEGER,
  -- Step 6 (Assignment)
  assignment_instructions  TEXT,
  allowed_formats          JSONB,       -- {video, audio, pdf, image}
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, step_number)
);

-- HQL Step 3 content resources (videos, audio, PDFs added by teacher)
CREATE TABLE IF NOT EXISTS task_resources (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID        NOT NULL REFERENCES learning_tasks(id) ON DELETE CASCADE,
  step_number     INTEGER     NOT NULL DEFAULT 3,
  resource_type   TEXT        NOT NULL CHECK (resource_type IN ('video', 'audio', 'pdf')),
  label           TEXT        NOT NULL,
  original_name   TEXT        NOT NULL,    -- original filename as uploaded
  file_path       TEXT        NOT NULL,    -- relative path under folder_path
  time_min        INTEGER     NOT NULL DEFAULT 0,
  position        INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_resources_task ON task_resources(task_id);

-- Quiz questions parsed from quiz_raw and stored for analytics/display
CREATE TABLE IF NOT EXISTS task_quiz_questions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID        NOT NULL REFERENCES learning_tasks(id) ON DELETE CASCADE,
  step_number     INTEGER     NOT NULL DEFAULT 4,
  question_number INTEGER     NOT NULL,
  text            TEXT        NOT NULL,
  options         JSONB       NOT NULL,    -- [{letter, text, isCorrect}]
  correct_index   INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_quiz_task ON task_quiz_questions(task_id);

-- General template blocks — one row per block, in order
CREATE TABLE IF NOT EXISTS task_blocks (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID        NOT NULL REFERENCES learning_tasks(id) ON DELETE CASCADE,
  block_type      TEXT        NOT NULL CHECK (block_type IN ('video','document','quiz','assignment','discussion','note','embed')),
  position        INTEGER     NOT NULL,
  title           TEXT        NOT NULL DEFAULT '',
  time_min        INTEGER     NOT NULL DEFAULT 0,
  -- All type-specific scalar fields stored as JSONB for flexibility
  data            JSONB       NOT NULL DEFAULT '{}',
  -- Uploaded file path (for video/document blocks)
  file_path       TEXT,
  original_name   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_blocks_task ON task_blocks(task_id, position);
