-- ============================================================
-- Stella Logos — PostgreSQL Schema
-- Run once against your Supabase project:
--   psql $DATABASE_URL -f src/db/schema.sql
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- A. INSTITUTIONAL CORE
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT          NOT NULL UNIQUE,
  password_hash TEXT          NOT NULL,
  display_name  TEXT          NOT NULL,
  role          TEXT          NOT NULL CHECK (role IN ('Admin', 'Teacher', 'Learner')),
  points_balance INTEGER       NOT NULL DEFAULT 0,
  paid_status   BOOLEAN       NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Administrative "Home Room" groupings
CREATE TABLE IF NOT EXISTS register_classes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  grade       INTEGER     NOT NULL,
  teacher_id  UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subject-specific quest containers (e.g. Grade 10 IT - Group A)
CREATE TABLE IF NOT EXISTS academic_classes (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL,
  subject             TEXT        NOT NULL,
  register_class_id   UUID        REFERENCES register_classes(id) ON DELETE CASCADE,
  teacher_id          UUID        REFERENCES users(id) ON DELETE SET NULL,
  total_steps         INTEGER     NOT NULL DEFAULT 7,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bridge: links a Learner to both their admin and academic contexts
CREATE TABLE IF NOT EXISTS enrollments (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  register_class_id   UUID        NOT NULL REFERENCES register_classes(id) ON DELETE CASCADE,
  academic_class_id   UUID        NOT NULL REFERENCES academic_classes(id) ON DELETE CASCADE,
  enrolled_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (learner_id, academic_class_id)
);

-- ============================================================
-- B. MARKER SYSTEM (Quest State)
-- ============================================================

-- Tracks each learner's live position on the quest path
CREATE TABLE IF NOT EXISTS learner_progress (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  academic_class_id UUID        NOT NULL REFERENCES academic_classes(id) ON DELETE CASCADE,
  current_step      INTEGER     NOT NULL DEFAULT 0,
  is_locked         BOOLEAN     NOT NULL DEFAULT false,  -- Wait-State guard
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (learner_id, academic_class_id)
);

-- xAPI-compliant activity log; populated automatically by trigger below
CREATE TABLE IF NOT EXISTS activity_logs (
  id          BIGSERIAL   PRIMARY KEY,
  learner_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id    UUID        REFERENCES academic_classes(id) ON DELETE SET NULL,
  statement   JSONB       NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_learner ON activity_logs(learner_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_recorded ON activity_logs(recorded_at DESC);

-- ============================================================
-- C. ECONOMY & IDENTITY INJECTION
-- ============================================================

CREATE TABLE IF NOT EXISTS shop_items (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  description   TEXT,
  item_type     TEXT        NOT NULL CHECK (item_type IN ('Badge', 'Avatar', 'Theme')),
  asset_path    TEXT        NOT NULL,  -- path injected into CSS variables
  cost          INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learner_inventory (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id     UUID        NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  is_active   BOOLEAN     NOT NULL DEFAULT false,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (learner_id, item_id)
);

-- Partial index: near-instant skin lookup for active items only
CREATE INDEX IF NOT EXISTS idx_inventory_active
  ON learner_inventory(learner_id)
  WHERE is_active = true;

-- ============================================================
-- D. CONVERSATIONS & MESSAGES (Social UI + Theater Mode nudges)
-- ============================================================

CREATE TABLE IF NOT EXISTS conversations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type       TEXT        NOT NULL CHECK (type IN ('individual', 'group')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);

CREATE TABLE IF NOT EXISTS group_chat_metadata (
  conversation_id UUID NOT NULL PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  created_by      UUID NOT NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id              BIGSERIAL   PRIMARY KEY,
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT        NOT NULL,
  context_link    TEXT,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, sent_at ASC);

CREATE TABLE IF NOT EXISTS message_read_status (
  message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

-- ============================================================
-- I. LEARNING TASK GROUPS (Phase III cooperative learning)
-- ============================================================

CREATE TABLE IF NOT EXISTS task_groups (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_class_id UUID        NOT NULL REFERENCES academic_classes(id) ON DELETE CASCADE,
  conversation_id   UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  session_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_group_members (
  group_id   UUID NOT NULL REFERENCES task_groups(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('Leader', 'Timer', 'Scribe', 'AngleChecker')),
  PRIMARY KEY (group_id, learner_id)
);

-- ============================================================
-- G. SHOP — extend shop_items with display columns
-- (ALTER IF NOT EXISTS so this is safe to re-run)
-- ============================================================

ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS tag                  TEXT NOT NULL DEFAULT '';
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS scope                TEXT NOT NULL DEFAULT '';
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS theme_compatibility  TEXT NOT NULL DEFAULT 'all';
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS subtype              TEXT;

-- Unique name so the seed can use ON CONFLICT (name) DO NOTHING
ALTER TABLE shop_items DROP CONSTRAINT IF EXISTS shop_items_name_key;
ALTER TABLE shop_items ADD  CONSTRAINT shop_items_name_key UNIQUE (name);

-- Widen item_type to all 7 reward categories
ALTER TABLE shop_items DROP CONSTRAINT IF EXISTS shop_items_item_type_check;
ALTER TABLE shop_items ADD  CONSTRAINT shop_items_item_type_check
  CHECK (item_type IN (
    'Theme', 'Soundtrack', 'Interactive Sprite',
    'Color Scheme', 'Alternate Background', 'Animated Sprite', 'Static Sprite'
  ));

-- ============================================================
-- H. REGISTER PERIOD (Roll call, Group Chat, Notice Board)
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

-- ============================================================
-- E. AUTOMATION: xAPI trigger on Marker movement
-- ============================================================

CREATE OR REPLACE FUNCTION log_marker_movement()
RETURNS TRIGGER AS $$
DECLARE
  actor_email TEXT;
BEGIN
  -- Only fire when CurrentStep actually changes
  IF NEW.current_step = OLD.current_step THEN
    RETURN NEW;
  END IF;

  SELECT email INTO actor_email FROM users WHERE id = NEW.learner_id;

  INSERT INTO activity_logs (learner_id, class_id, statement)
  VALUES (
    NEW.learner_id,
    NEW.academic_class_id,
    jsonb_build_object(
      'version', '1.0.3',
      'actor',   jsonb_build_object(
                   'objectType', 'Agent',
                   'mbox', 'mailto:' || actor_email
                 ),
      'verb',    jsonb_build_object(
                   'id',      'http://adlnet.gov/expapi/verbs/progressed',
                   'display', jsonb_build_object('en-US', 'progressed')
                 ),
      'object',  jsonb_build_object(
                   'objectType', 'Activity',
                   'id',         'stella-logos://class/' || NEW.academic_class_id || '/step/' || NEW.current_step
                 ),
      'result',  jsonb_build_object(
                   'extensions', jsonb_build_object(
                     'stella-logos://step', NEW.current_step
                   )
                 ),
      'timestamp', now()
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_marker_movement ON learner_progress;
CREATE TRIGGER trg_marker_movement
  AFTER UPDATE ON learner_progress
  FOR EACH ROW EXECUTE FUNCTION log_marker_movement();

-- ============================================================
-- F. ROW-LEVEL SECURITY (PaidStatus paywall)
-- ============================================================

ALTER TABLE academic_classes ENABLE ROW LEVEL SECURITY;

-- Only paid learners (or teachers/admins) can read academic class data
CREATE POLICY paid_learners_only ON academic_classes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = current_setting('app.current_user_id', true)::uuid
        AND (u.paid_status = true OR u.role IN ('Teacher', 'Admin'))
    )
  );
