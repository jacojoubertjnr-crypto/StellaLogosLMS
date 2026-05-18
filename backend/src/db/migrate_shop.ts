import 'dotenv/config';
import { pool } from './client.js';

async function migrate() {
  await pool.query(`
    ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS tag                 TEXT NOT NULL DEFAULT '';
    ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS scope               TEXT NOT NULL DEFAULT '';
    ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS theme_compatibility TEXT NOT NULL DEFAULT 'all';
    ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS subtype             TEXT;
  `);

  await pool.query(`ALTER TABLE shop_items DROP CONSTRAINT IF EXISTS shop_items_name_key`);
  await pool.query(`ALTER TABLE shop_items ADD CONSTRAINT shop_items_name_key UNIQUE (name)`);

  await pool.query(`ALTER TABLE shop_items DROP CONSTRAINT IF EXISTS shop_items_item_type_check`);
  await pool.query(`
    ALTER TABLE shop_items ADD CONSTRAINT shop_items_item_type_check
      CHECK (item_type IN (
        'Theme', 'Soundtrack', 'Interactive Sprite',
        'Color Scheme', 'Alternate Background', 'Animated Sprite', 'Static Sprite'
      ))
  `);

  console.log('✓ shop_items migration complete');
  await pool.end();
}

migrate().catch(err => { console.error('Migration failed:', err.message); process.exit(1); });
