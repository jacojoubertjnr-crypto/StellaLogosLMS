-- custom_themes: stores admin-created theme definitions
CREATE TABLE IF NOT EXISTS custom_themes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        UNIQUE NOT NULL,          -- slug / folder name (e.g. "spacePirate")
  display_name     TEXT        NOT NULL,                 -- shown in shop
  color_primary    TEXT        NOT NULL DEFAULT '#FFD700',
  color_secondary  TEXT        NOT NULL DEFAULT '#C0A840',
  color_accent     TEXT        NOT NULL DEFAULT '#FF8C00',
  color_text       TEXT        NOT NULL DEFAULT '#FFFFFF',
  color_bg_overlay TEXT        NOT NULL DEFAULT 'rgba(0,0,0,0.55)',
  status           TEXT        NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active')),
  shop_item_id     UUID        REFERENCES shop_items(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_themes_status ON custom_themes(status);
