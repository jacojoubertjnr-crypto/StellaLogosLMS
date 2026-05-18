-- Points ledger: immutable record of every delta to a learner's balance
CREATE TABLE IF NOT EXISTS points_ledger (
  id          BIGSERIAL   PRIMARY KEY,
  learner_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta       INTEGER     NOT NULL,
  reason      TEXT        NOT NULL,
  meta        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_points_ledger_learner
  ON points_ledger (learner_id, created_at DESC);
