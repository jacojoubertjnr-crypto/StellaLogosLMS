-- Migration: flexible per-step blocks for HQL learning tasks
-- Run: psql postgresql://postgres:1234@localhost:5432/stella_logos -f src/db/migrate_hql_step_blocks.sql

CREATE TABLE IF NOT EXISTS task_step_blocks (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID        NOT NULL REFERENCES learning_tasks(id) ON DELETE CASCADE,
  step_number   INT         NOT NULL CHECK (step_number BETWEEN 1 AND 6),
  block_type    TEXT        NOT NULL,   -- VIDEO|DOCUMENT|AUDIO|TEXT|REFLECTION|QUIZ|DISCUSSION|ASSIGNMENT
  position      INT         NOT NULL DEFAULT 0,
  title         TEXT,
  time_min      INT         NOT NULL DEFAULT 0,
  text_content  TEXT,                   -- TEXT note body / ASSIGNMENT instructions / DISCUSSION prompt
  file_path     TEXT,                   -- VIDEO / DOCUMENT / AUDIO
  original_name TEXT,
  data          JSONB,                  -- REFLECTION:{questions} QUIZ:{quizRaw,questions} ASSIGNMENT:{allowedFormats}
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_step_blocks_task_step_pos
  ON task_step_blocks (task_id, step_number, position);
