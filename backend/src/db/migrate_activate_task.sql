-- Adds active task tracking columns to academic_classes.
-- Safe to re-run.
ALTER TABLE academic_classes
  ADD COLUMN IF NOT EXISTS active_task_id           UUID        REFERENCES learning_tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS active_task_format        TEXT,
  ADD COLUMN IF NOT EXISTS active_task_enabled_steps JSONB,
  ADD COLUMN IF NOT EXISTS active_task_due_date       DATE;

CREATE INDEX IF NOT EXISTS idx_academic_classes_active_task
  ON academic_classes (active_task_id)
  WHERE active_task_id IS NOT NULL;
