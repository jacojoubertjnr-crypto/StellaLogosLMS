import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from './client.js';

const SALT_ROUNDS = 10;

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const users = [
      {
        email: 'admin@stellalogos.dev',
        password: 'admin1234',
        displayName: 'Admin',
        role: 'Admin',
        paidStatus: true,
      },
      {
        email: 'teacher@stellalogos.dev',
        password: 'teacher1234',
        displayName: 'Ms. Joubert',
        role: 'Teacher',
        paidStatus: true,
      },
      {
        email: 'vanderberg@stellalogos.dev',
        password: 'teacher1234',
        displayName: 'Mr. Bot BOT',
        role: 'Teacher',
        paidStatus: true,
      },
      {
        email: 'learner@stellalogos.dev',
        password: 'learner1234',
        displayName: 'Aria BOT',
        role: 'Learner',
        paidStatus: true,
      },
      {
        email: 'learner2@stellalogos.dev',
        password: 'learner1234',
        displayName: 'Conrad BOT',
        role: 'Learner',
        paidStatus: true,
      },
      {
        email: 'learner3@stellalogos.dev',
        password: 'learner1234',
        displayName: 'Petra BOT',
        role: 'Learner',
        paidStatus: true,
      },
      {
        email: 'learner4@stellalogos.dev',
        password: 'learner1234',
        displayName: 'Rex BOT',
        role: 'Learner',
        paidStatus: true,
      },
      {
        email: 'testlearner@stellalogos.dev',
        password: 'learner1234',
        displayName: 'testLearner',
        role: 'Learner',
        paidStatus: true,
      },
    ];

    for (const u of users) {
      const hash = await bcrypt.hash(u.password, SALT_ROUNDS);
      await client.query(
        `INSERT INTO users (email, password_hash, display_name, role, paid_status)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           display_name  = EXCLUDED.display_name,
           role          = EXCLUDED.role,
           paid_status   = EXCLUDED.paid_status`,
        [u.email, hash, u.displayName, u.role, u.paidStatus],
      );
      console.log(`✓ ${u.role.padEnd(7)}  ${u.email}  /  ${u.password}`);
    }

    // Rebuild classes from scratch each seed to avoid duplicates on re-runs
    await client.query(`DELETE FROM learner_progress`);
    await client.query(`DELETE FROM enrollments`);
    await client.query(`DELETE FROM academic_classes`);
    await client.query(`DELETE FROM register_classes`);

    const { rows: [teacherBot] } = await client.query(
      `SELECT id FROM users WHERE email = 'vanderberg@stellalogos.dev'`,
    );
    const { rows: [regClass] } = await client.query(
      `INSERT INTO register_classes (name, grade, teacher_id) VALUES ('Grade 10 A', 10, $1) RETURNING id`,
      [teacherBot.id],
    );
    const { rows: [acClass] } = await client.query(
      `INSERT INTO academic_classes (name, subject, register_class_id, teacher_id, total_steps)
       VALUES ('IT Grade 10 - Group A', 'Information Technology', $1, $2, 6)
       RETURNING id`,
      [regClass.id, teacherBot.id],
    );
    // Enroll all 4 bot learners at step 0 — fresh start for the learning task
    const devLearners = [
      { email: 'learner@stellalogos.dev',      step: 0, locked: false },
      { email: 'learner2@stellalogos.dev',     step: 0, locked: false },
      { email: 'learner3@stellalogos.dev',     step: 0, locked: false },
      { email: 'learner4@stellalogos.dev',     step: 0, locked: false },
      { email: 'testlearner@stellalogos.dev',  step: 0, locked: false },
    ];
    for (const dl of devLearners) {
      const { rows: [lr] } = await client.query(`SELECT id FROM users WHERE email = $1`, [dl.email]);
      await client.query(
        `INSERT INTO enrollments (learner_id, register_class_id, academic_class_id) VALUES ($1, $2, $3)`,
        [lr.id, regClass.id, acClass.id],
      );
      await client.query(
        `INSERT INTO learner_progress (learner_id, academic_class_id, current_step, is_locked) VALUES ($1, $2, $3, $4)`,
        [lr.id, acClass.id, dl.step, dl.locked],
      );
    }
    console.log(`✓ Class    IT Grade 10 - Group A  (6 steps)`);
    console.log(`✓ 5 learners enrolled at step 0 (Aria/Conrad/Petra/Rex + testLearner)`);

    // ── Shop catalog (rebuild from scratch each seed) ───────────────────────
    await client.query(`DELETE FROM learner_inventory`);
    await client.query(`DELETE FROM shop_items`);

    // scope field = page key ('login','home','attendence','subjects','messages','shop','global')
    // Only items backed by real asset files/folders are listed here.
    // Colour schemes are an exception — they have no folders but are valid as CSS-only skins.
    const shopItems = [

      // ── GLOBAL THEME (1) ──────────────────────────────────────────────────
      { name: 'Medieval Realm', item_type: 'Theme', cost: 10000, tag: 'THEME · GLOBAL', scope: 'global', theme: 'medieval', subtype: null,
        description: 'Stone banners, candlelit halls, and parchment tones across all six UI pages. Backgrounds, panels, and borders all take on a full medieval identity.' },

      // ── MEDIEVAL SPRITES — real asset folders only (4) ───────────────────
      { name: 'Torch Flicker', item_type: 'Static Sprite',      cost: 300, tag: 'SPRITE · STATIC · LOGIN',        scope: 'login',      theme: 'medieval', subtype: 'static',
        asset_path: '/assets/themes/medieval/login/sprites/stationary/torch_flicker/frame_1.png',
        description: 'A wall-mounted stone torch flickers in the corner of the login screen. Non-interactive decoration.' },
      { name: 'Dove',          item_type: 'Interactive Sprite', cost: 700, tag: 'SPRITE · CLICKABLE · LOGIN',      scope: 'login',      theme: 'medieval', subtype: 'interactive',
        asset_path: '/assets/themes/medieval/login/sprites/moving/dove/frame_1.png',
        description: 'A dove drifts across the login screen. Click it before it flies away to earn a small point bonus.' },
      { name: 'Rabbit',        item_type: 'Interactive Sprite', cost: 700, tag: 'SPRITE · CLICKABLE · HOME',       scope: 'home',       theme: 'medieval', subtype: 'interactive',
        asset_path: '/assets/themes/medieval/home/sprites/moving/rabbit/frame_1.png',
        description: 'A rabbit scurries across the home screen. Click it before it vanishes to earn bonus points.' },
      { name: 'Fireplace',     item_type: 'Static Sprite',      cost: 300, tag: 'SPRITE · STATIC · ATTENDANCE',   scope: 'attendence', theme: 'medieval', subtype: 'static',
        asset_path: '/assets/themes/medieval/attendence/sprites/stationary/fireplace/frame_1.png',
        description: 'A stone fireplace crackles softly in the corner of the attendance screen. Non-interactive.' },

      // ── MEDIEVAL SOUNDTRACK — real file: medieval/music/theme.wav (1) ────
      { name: 'Tavern Ambience', item_type: 'Soundtrack', cost: 1200, tag: 'SOUNDTRACK · MEDIEVAL', scope: 'global', theme: 'medieval', subtype: null,
        description: 'Crackling fire, distant lute, and low tavern murmur replace the default menu soundscape.' },

      // ── MEDIEVAL ALTERNATE BACKGROUNDS (3) ───────────────────────────────
      { name: 'Peaceful Grounds',   item_type: 'Alternate Background', cost: 250, tag: 'ALT BG · HOME',     scope: 'home',       theme: 'medieval', subtype: null,
        asset_path: '/assets/themes/medieval/bg_home_withoutRabbit.png',
        description: 'A quieter view of the castle grounds — the home screen background without the roaming rabbit. Same stone walls, calmer mood.' },
      { name: 'Library of Scrolls', item_type: 'Alternate Background', cost: 250, tag: 'ALT BG · SUBJECTS', scope: 'mySubjects', theme: 'medieval', subtype: null,
        asset_path: '/assets/themes/medieval/mySubjects/library1.png',
        description: 'Warm candlelight fills a hall of ancient scrolls and leather-bound tomes. An alternate view of the royal library.' },
      { name: 'Hall of Tomes',      item_type: 'Alternate Background', cost: 250, tag: 'ALT BG · SUBJECTS', scope: 'mySubjects', theme: 'medieval', subtype: null,
        asset_path: '/assets/themes/medieval/mySubjects/library2.png',
        description: 'Towering shelves of enchanted tomes stretch into shadow. A grander, more mysterious take on the royal library.' },

      // ── DEFAULT COLOUR SCHEMES — CSS-only skins, no asset folder needed (3)
      { name: 'Crimson Court', item_type: 'Color Scheme', cost: 500, tag: 'COLOUR SCHEME · DEFAULT', scope: 'global', theme: 'default', subtype: null,
        description: 'Deep crimson and burnished copper replace the default blue accent palette across all interface elements.' },
      { name: 'Emerald Isle',  item_type: 'Color Scheme', cost: 500, tag: 'COLOUR SCHEME · DEFAULT', scope: 'global', theme: 'default', subtype: null,
        description: 'Forest green and silver replace the default blue. A cool natural palette that softens the interface without losing contrast.' },
      { name: 'Midnight Blue', item_type: 'Color Scheme', cost: 500, tag: 'COLOUR SCHEME · DEFAULT', scope: 'global', theme: 'default', subtype: null,
        description: 'Deep navy and ice blue deepen the default palette into a midnight aesthetic — crisp contrast, dark depth.' },
    ];

    for (const item of shopItems) {
      await client.query(
        `INSERT INTO shop_items (name, description, item_type, asset_path, cost, tag, scope, theme_compatibility, subtype)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [item.name, item.description, item.item_type, (item as any).asset_path ?? '', item.cost, item.tag, item.scope, item.theme, item.subtype],
      );
    }
    console.log(`✓ Shop     ${shopItems.length} catalog items`);

    // Give all learners starter inventory — Medieval Realm active + Tavern Ambience owned
    const { rows: learnerRows } = await client.query(
      `SELECT id FROM users WHERE role = 'Learner'`,
    );
    for (const learnerRow of learnerRows) {
      const starterItems = [
        { name: 'Medieval Realm',  is_active: true  },
        { name: 'Tavern Ambience', is_active: false },
        { name: 'Fireplace',       is_active: true  },
      ];
      for (const si of starterItems) {
        const { rows: [itemRow] } = await client.query(
          `SELECT id FROM shop_items WHERE name = $1`, [si.name],
        );
        if (itemRow) {
          await client.query(
            `INSERT INTO learner_inventory (learner_id, item_id, is_active) VALUES ($1, $2, $3)`,
            [learnerRow.id, itemRow.id, si.is_active],
          );
        }
      }
    }
    console.log(`✓ Inventory starter items granted to all learners`);

    // ── Seed register entries (attendance) ────────────────────────────────────
    await client.query(`DELETE FROM register_entries`);
    await client.query(`DELETE FROM register_chat_messages`);
    await client.query(`DELETE FROM notices`);

    const attendanceData = [
      { email: 'learner@stellalogos.dev',  status: 'present' },
      { email: 'learner2@stellalogos.dev', status: 'present' },
      { email: 'learner3@stellalogos.dev', status: 'late'    },
      { email: 'learner4@stellalogos.dev', status: 'absent'  },
    ];
    for (const a of attendanceData) {
      const { rows: [lr] } = await client.query(`SELECT id FROM users WHERE email = $1`, [a.email]);
      await client.query(
        `INSERT INTO register_entries (register_class_id, learner_id, status)
         VALUES ($1, $2, $3)
         ON CONFLICT (register_class_id, learner_id, date) DO NOTHING`,
        [regClass.id, lr.id, a.status],
      );
    }
    console.log(`✓ Attendance 4 learners marked for today`);

    // Seed register chat messages
    const { rows: [learner1chat] } = await client.query(`SELECT id FROM users WHERE email = 'learner@stellalogos.dev'`);
    await client.query(
      `INSERT INTO register_chat_messages (register_class_id, sender_id, body) VALUES
         ($1, $2, 'Good morning everyone!'),
         ($1, $3, 'Morning Mr. Bot!'),
         ($1, $2, 'Please remember to submit your assignment by Friday.')`,
      [regClass.id, teacherBot.id, learner1chat.id],
    );
    console.log(`✓ Register chat 3 seed messages`);

    // Seed a pinned notice
    await client.query(
      `INSERT INTO notices (register_class_id, teacher_id, body, pinned) VALUES ($1, $2, $3, $4)`,
      [regClass.id, teacherBot.id, 'Assignment due Friday — submit via the Quest screen.', true],
    );
    await client.query(
      `INSERT INTO notices (register_class_id, teacher_id, body, pinned) VALUES ($1, $2, $3, $4)`,
      [regClass.id, teacherBot.id, 'Well done to everyone who completed Step 1 this week!', false],
    );
    console.log(`✓ Notices    2 seeded (1 pinned)`);

    // ── Seed conversations & messages ──────────────────────────────────────────
    // Clear messaging tables so re-runs stay clean (cascade handles read_status)
    await client.query(`DELETE FROM task_group_members`);
    await client.query(`DELETE FROM task_groups`);
    await client.query(`DELETE FROM messages`);
    await client.query(`DELETE FROM group_chat_metadata`);
    await client.query(`DELETE FROM conversation_participants`);
    await client.query(`DELETE FROM conversations`);

    const { rows: [learner1] } = await client.query(`SELECT id FROM users WHERE email = 'learner@stellalogos.dev'`);
    const { rows: [learner2] } = await client.query(`SELECT id FROM users WHERE email = 'learner2@stellalogos.dev'`);
    const { rows: [learner3] } = await client.query(`SELECT id FROM users WHERE email = 'learner3@stellalogos.dev'`);
    const { rows: [learner4] } = await client.query(`SELECT id FROM users WHERE email = 'learner4@stellalogos.dev'`);
    const { rows: [testLearner] } = await client.query(`SELECT id FROM users WHERE email = 'testlearner@stellalogos.dev'`);

    // 1:1: Mr. Bot BOT ↔ Aria BOT
    const { rows: [conv1] } = await client.query(
      `INSERT INTO conversations (type) VALUES ('individual') RETURNING id`,
    );
    await client.query(
      `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1,$2),($1,$3)`,
      [conv1.id, teacherBot.id, learner1.id],
    );
    await client.query(
      `INSERT INTO messages (conversation_id, sender_id, content) VALUES
         ($1, $2, 'Welcome to the quest! Let me know if you get stuck.'),
         ($1, $3, 'Thanks Mr. Bot! Step 1 looks intense.'),
         ($1, $2, 'That''s the challenge — structure your thinking first.')`,
      [conv1.id, teacherBot.id, learner1.id],
    );

    // 1:1: Mr. Bot BOT ↔ Conrad BOT
    const { rows: [conv2] } = await client.query(
      `INSERT INTO conversations (type) VALUES ('individual') RETURNING id`,
    );
    await client.query(
      `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1,$2),($1,$3)`,
      [conv2.id, teacherBot.id, learner2.id],
    );
    await client.query(
      `INSERT INTO messages (conversation_id, sender_id, content) VALUES
         ($1, $2, 'Good progress today. Ready to lead the group discussion?'),
         ($1, $3, 'Yes sir. I''ve already studied all the resources.')`,
      [conv2.id, teacherBot.id, learner2.id],
    );

    // Group chat: "IT Study Group" — teacher bot + all 4 bot learners
    const { rows: [conv3] } = await client.query(
      `INSERT INTO conversations (type) VALUES ('group') RETURNING id`,
    );
    await client.query(
      `INSERT INTO group_chat_metadata (conversation_id, name, created_by) VALUES ($1, $2, $3)`,
      [conv3.id, 'IT Study Group', teacherBot.id],
    );
    for (const uid of [teacherBot.id, learner1.id, learner2.id, learner3.id, learner4.id, testLearner.id]) {
      await client.query(
        `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2)`,
        [conv3.id, uid],
      );
    }
    await client.query(
      `INSERT INTO messages (conversation_id, sender_id, content) VALUES
         ($1, $2, 'Welcome to the IT Study Group everyone!'),
         ($1, $3, 'Hey all — can someone explain the content section?'),
         ($1, $4, 'I can help — check the resources in Step 3.'),
         ($1, $2, 'Good collaboration. That''s the cooperative learning spirit.')`,
      [conv3.id, teacherBot.id, learner1.id, learner2.id],
    );

    console.log(`✓ Messages  3 seeded conversations (2 direct, 1 group)`);

    await client.query('COMMIT');
    console.log('\nSeed complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed — rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
