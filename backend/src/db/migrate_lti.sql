-- LTI 1.3 compliant tables for platform registration, SSO, and grade passback.
-- Safe to re-run (all statements use IF NOT EXISTS).

-- ── Registered LTI 1.3 platforms (e.g. Canvas, Moodle, Google Classroom) ──────
CREATE TABLE IF NOT EXISTS lti_platforms (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,                         -- human label e.g. "Curro Canvas"
  issuer          TEXT        NOT NULL UNIQUE,                  -- platform iss claim (URL)
  client_id       TEXT        NOT NULL,                         -- OAuth 2.0 client_id
  auth_endpoint   TEXT        NOT NULL,                         -- OIDC auth request URL
  token_endpoint  TEXT        NOT NULL,                         -- OAuth 2.0 token URL
  jwks_endpoint   TEXT        NOT NULL,                         -- platform public key set URL
  enabled         BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Deployments: one platform can deploy the tool multiple times ──────────────
CREATE TABLE IF NOT EXISTS lti_deployments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id     UUID        NOT NULL REFERENCES lti_platforms(id) ON DELETE CASCADE,
  deployment_id   TEXT        NOT NULL,                         -- from LTI launch claim
  label           TEXT,                                         -- optional human label
  enabled         BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (platform_id, deployment_id)
);

-- ── SSO context: maps platform user to a local Stella Logos user ──────────────
CREATE TABLE IF NOT EXISTS lti_user_links (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id     UUID        NOT NULL REFERENCES lti_platforms(id) ON DELETE CASCADE,
  platform_user_id TEXT       NOT NULL,                         -- sub claim from launch
  local_user_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  linked_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (platform_id, platform_user_id)
);

-- ── Grade passback: AGS (Assignment and Grade Services) records ───────────────
CREATE TABLE IF NOT EXISTS lti_grade_passback (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id       UUID        NOT NULL REFERENCES lti_platforms(id) ON DELETE CASCADE,
  deployment_id     TEXT        NOT NULL,
  resource_link_id  TEXT        NOT NULL,                       -- LTI resource link
  local_user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score             NUMERIC(5,2),                               -- 0.00–1.00 normalised
  max_score         NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  comment           TEXT,
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at         TIMESTAMPTZ                                 -- when passback was sent to platform
);

CREATE INDEX IF NOT EXISTS idx_lti_grade_passback_user     ON lti_grade_passback(local_user_id);
CREATE INDEX IF NOT EXISTS idx_lti_grade_passback_resource ON lti_grade_passback(platform_id, resource_link_id);
CREATE INDEX IF NOT EXISTS idx_lti_user_links_local        ON lti_user_links(local_user_id);
