-- Migration: dynamic step count for HQL tasks
-- Run: psql postgresql://postgres:1234@localhost:5432/stella_logos -f src/db/migrate_dynamic_steps.sql

-- Relax step_number constraint to allow more than 6 steps
ALTER TABLE task_step_blocks DROP CONSTRAINT IF EXISTS task_step_blocks_step_number_check;
ALTER TABLE task_step_blocks ADD CONSTRAINT task_step_blocks_step_number_check CHECK (step_number >= 1);

-- Add step_labels column to learning_tasks (default = standard 6 HQL steps)
ALTER TABLE learning_tasks
  ADD COLUMN IF NOT EXISTS step_labels JSONB NOT NULL
  DEFAULT '["CHALLENGE","REFLECTION","CONTENT","QUIZ","DISCUSSION","ASSIGNMENT"]';
