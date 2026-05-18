ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS tag TEXT NOT NULL DEFAULT '';
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT '';
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS theme_compatibility TEXT NOT NULL DEFAULT 'all';
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS subtype TEXT;
ALTER TABLE shop_items DROP CONSTRAINT IF EXISTS shop_items_name_key;
ALTER TABLE shop_items ADD CONSTRAINT shop_items_name_key UNIQUE (name);
ALTER TABLE shop_items DROP CONSTRAINT IF EXISTS shop_items_item_type_check;
ALTER TABLE shop_items ADD CONSTRAINT shop_items_item_type_check
  CHECK (item_type IN (
    'Theme', 'Soundtrack', 'Interactive Sprite',
    'Color Scheme', 'Alternate Background', 'Animated Sprite', 'Static Sprite'
  ));
