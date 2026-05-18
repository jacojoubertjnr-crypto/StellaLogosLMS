-- Staffroom tables — safe to re-run (IF NOT EXISTS / ON CONFLICT DO NOTHING)

CREATE TABLE IF NOT EXISTS staff_messages (
  id              BIGSERIAL   PRIMARY KEY,
  sender_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body            TEXT        NOT NULL,
  is_speaker_post BOOLEAN     NOT NULL DEFAULT false,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_staff_messages_sent ON staff_messages(sent_at ASC);

CREATE TABLE IF NOT EXISTS announcements (
  id           BIGSERIAL   PRIMARY KEY,
  created_by   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body         TEXT        NOT NULL,
  target       TEXT        NOT NULL DEFAULT 'all',
  pinned       BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at DESC);

CREATE TABLE IF NOT EXISTS staffroom_state (
  id                 INT  PRIMARY KEY DEFAULT 1,
  current_speaker_id UUID REFERENCES users(id) ON DELETE SET NULL,
  CHECK (id = 1)
);
INSERT INTO staffroom_state (id) VALUES (1) ON CONFLICT DO NOTHING;
