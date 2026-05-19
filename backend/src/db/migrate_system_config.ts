import 'dotenv/config';
import { pool } from './client.js';

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_config (
      id                    INT PRIMARY KEY DEFAULT 1,
      lt_ontime_pts         INT NOT NULL DEFAULT 250,
      lt_late_pts           INT NOT NULL DEFAULT 200,
      theme_cost            INT NOT NULL DEFAULT 1000,
      alt_bg_cost           INT NOT NULL DEFAULT 250,
      static_sprite_cost    INT NOT NULL DEFAULT 250,
      moving_sprite_cost    INT NOT NULL DEFAULT 300,
      clickable_sprite_cost INT NOT NULL DEFAULT 350,
      CONSTRAINT single_row CHECK (id = 1)
    );
  `);

  await pool.query(`
    INSERT INTO system_config (id)
    VALUES (1)
    ON CONFLICT (id) DO NOTHING;
  `);

  console.log('✓ system_config migration complete');
  await pool.end();
}

migrate().catch(err => { console.error('Migration failed:', err.message); process.exit(1); });
