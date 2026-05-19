import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { typeDefs } from './schema/typeDefs.js';
import { resolvers, type ApolloContext } from './schema/resolvers.js';
import { verifyToken } from './auth/jwt.js';
import { pool } from './db/client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const THEMES_DIR  = path.join(__dirname, '..', '..', 'public', 'assets', 'themes');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(THEMES_DIR,  { recursive: true });

// ── Theme asset manifest ──────────────────────────────────────────────────────
// Maps assetKey → { relPath (from theme root), specText }

const ASSET_MANIFEST: Record<string, { relPath: string; specText: string }> = {
  // UI-wide
  banner_top:      { relPath: 'banner_top.png',                         specText: 'banner_top.png — Full-width banner strip displayed at the top of every page. Size: 1920×96 px. Style: decorative top edge with theme motifs, transparent bottom edge.' },
  frame_main:      { relPath: 'frame_main.png',                         specText: 'frame_main.png — 9-slice decorative frame for content panels. Size: 512×512 px. Transparent center (at least 256×256). Opaque border of ~32 px on each side.' },
  btn_primary:     { relPath: 'btn_primary.png',                        specText: 'btn_primary.png — 9-slice primary button texture (long). Size: 384×96 px. Transparent center. ~24 px cap on each end. Used for LOGIN, SUBMIT, BACK, and all wide action buttons.' },
  btn_primary_sq:  { relPath: 'btn_primary_sq.png',                     specText: 'btn_primary_sq.png — 9-slice square button texture. Size: 128×128 px. Used for home-page tile grid (Attendance, Subjects, Messages, Shop). If omitted, tiles fall back to btn_primary.png.' },
  input_box:       { relPath: 'input_box.png',                          specText: 'input_box.png — Single-line input field frame. Size: 512×64 px. 9-slice with transparent center.' },
  ambient_sprite:  { relPath: 'ambient_sprite.png',                     specText: 'ambient_sprite.png — Tall decorative sprite (e.g. banner, statue) placed on page edges. Size: 320×640 px. Transparent background.' },
  // Music
  music_theme:     { relPath: 'music/theme.wav',                        specText: 'theme.wav — Background music for this theme. Looping WAV file. Recommended: 1–3 minutes, seamless loop point.' },
  // Page backgrounds
  bg_login:        { relPath: 'login/background.png',                   specText: 'login/background.png — Login page background. Full-screen: 1920×1080 px. Should be atmospheric and immersive.' },
  bg_home:         { relPath: 'home/background.png',                    specText: 'home/background.png — Home hub page background. Full-screen: 1920×1080 px.' },
  bg_learningTask: { relPath: 'learningTask/background.png',            specText: 'learningTask/background.png — Learning task / quest page background. Full-screen: 1920×1080 px.' },
  bg_attendence:   { relPath: 'attendence/background.png',              specText: 'attendence/background.png — Attendance / register page background. Full-screen: 1920×1080 px.' },
  bg_mySubjects:   { relPath: 'mySubjects/background.png',              specText: 'mySubjects/background.png — Subjects / curriculum page background. Full-screen: 1920×1080 px.' },
  bg_messages:     { relPath: 'messages/background.png',                specText: 'messages/background.png — Messaging / social page background. Full-screen: 1920×1080 px.' },
  bg_shop:         { relPath: 'shop/background.png',                    specText: 'shop/background.png — Shop / marketplace page background. Full-screen: 1920×1080 px.' },
  // Subject detail frame
  subject_detail:  { relPath: 'mySubjects/subject.png',                 specText: 'mySubjects/subject.png — Decorative frame shown behind subject detail popup. Size: 900×700 px. Content text is layered on top — keep the central reading area clear, decorate only the borders/corners.' },
  // Login sprites
  torch_1:         { relPath: 'login/torch_flicker/frame_1.png',        specText: 'torch_flicker/frame_1.png — First frame of the torch flicker animation (left/right torches on login screen). Size: 80×160 px. Transparent background.' },
  torch_2:         { relPath: 'login/torch_flicker/frame_2.png',        specText: 'torch_flicker/frame_2.png — Second frame of torch flicker. Size: 80×160 px.' },
  torch_3:         { relPath: 'login/torch_flicker/frame_3.png',        specText: 'torch_flicker/frame_3.png — Third frame of torch flicker. Size: 80×160 px.' },
  dove_1:          { relPath: 'login/dove/frame_1.png',                  specText: 'dove/frame_1.png — First frame of the dove idle animation on the login screen. Size: 80×80 px. Transparent background.' },
  dove_2:          { relPath: 'login/dove/frame_2.png',                  specText: 'dove/frame_2.png — Second frame of dove idle. Size: 80×80 px.' },
  dove_3:          { relPath: 'login/dove/frame_3.png',                  specText: 'dove/frame_3.png — Third frame of dove idle. Size: 80×80 px.' },
  dove_clicked:    { relPath: 'login/dove/clicked.png',                  specText: 'dove/clicked.png — Dove reaction frame shown when the user clicks it. Size: 80×80 px.' },
  // Home sprites
  rabbit_1:        { relPath: 'home/rabbit/frame_1.png',                 specText: 'rabbit/frame_1.png — First frame of the home page mascot idle animation. Size: 96×96 px. Transparent background.' },
  rabbit_2:        { relPath: 'home/rabbit/frame_2.png',                 specText: 'rabbit/frame_2.png — Second frame of mascot idle. Size: 96×96 px.' },
  rabbit_3:        { relPath: 'home/rabbit/frame_3.png',                 specText: 'rabbit/frame_3.png — Third frame of mascot idle. Size: 96×96 px.' },
  rabbit_clicked:  { relPath: 'home/rabbit/clicked.png',                 specText: 'rabbit/clicked.png — Mascot reaction frame shown on click. Size: 96×96 px.' },
  cloud_drift:     { relPath: 'home/cloud_drift.png',                    specText: 'cloud_drift.png — Horizontally drifting ambient sprite on the home page (e.g. cloud, spaceship, bird flock). Size: 320×80 px. Transparent background.' },
  // Attendance sprites
  fireplace_1:     { relPath: 'attendence/fireplace/frame_1.png',        specText: 'fireplace/frame_1.png — First frame of the attendance page ambient animation (e.g. fire, reactor, fountain). Size: 128×160 px. Transparent background.' },
  fireplace_2:     { relPath: 'attendence/fireplace/frame_2.png',        specText: 'fireplace/frame_2.png — Second frame. Size: 128×160 px.' },
  fireplace_3:     { relPath: 'attendence/fireplace/frame_3.png',        specText: 'fireplace/frame_3.png — Third frame. Size: 128×160 px.' },
  fireplace_4:     { relPath: 'attendence/fireplace/frame_4.png',        specText: 'fireplace/frame_4.png — Fourth frame. Size: 128×160 px.' },
};

const PORT = Number(process.env.PORT ?? 4000);

// ── Multer storage: files land in uploads/tasks/[taskId]/[folder]/ ────────────

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const taskId = (req.query.taskId as string) || 'unknown';
    const folder = (req.query.folder as string) || 'misc';
    const dest = path.join(UPLOADS_DIR, 'tasks', taskId, folder);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename(_req, file, cb) {
    // Sanitize: replace spaces with underscores, keep extension
    const safe = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._\-]/g, '');
    cb(null, safe);
  },
});

const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

// ── Theme multer storage ───────────────────────────────────────────────────────

const themeStorage = multer.diskStorage({
  destination(req, _file, cb) {
    const { themeName, assetKey } = req.query as { themeName: string; assetKey: string };
    const spec = ASSET_MANIFEST[assetKey];
    if (!spec) { cb(new Error(`Unknown asset key: ${assetKey}`), ''); return; }
    const dest = path.join(THEMES_DIR, themeName, path.dirname(spec.relPath));
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename(req, _file, cb) {
    const { assetKey } = req.query as { assetKey: string };
    const spec = ASSET_MANIFEST[assetKey];
    cb(null, path.basename(spec.relPath));
  },
});

const themeUpload = multer({ storage: themeStorage, limits: { fileSize: 50 * 1024 * 1024 } });

// ── Theme sprites.json templates ──────────────────────────────────────────────

const LOGIN_SPRITES_JSON = {
  sprites: [
    { id: 'torch_flicker', frames: ['frame_1.png','frame_2.png','frame_3.png'], frameDuration: 200, width: 80, height: 160 },
    { id: 'dove',          frames: ['frame_1.png','frame_2.png','frame_3.png'], frameDuration: 150, width: 80,  height: 80, clickFrame: 'clicked.png' },
  ],
};

const ATTENDENCE_SPRITES_JSON = {
  sprites: [
    { id: 'fireplace', frames: ['frame_1.png','frame_2.png','frame_3.png','frame_4.png'], frameDuration: 150, width: 128, height: 160 },
  ],
};

// ── Apollo setup ──────────────────────────────────────────────────────────────

const apollo = new ApolloServer<ApolloContext>({ typeDefs, resolvers });
await apollo.start();

// ── Express app ───────────────────────────────────────────────────────────────

const app = express();
app.use(cors({ origin: '*' }));

// Serve uploaded files as static assets at /uploads/*
app.use('/uploads', express.static(UPLOADS_DIR));

// File upload endpoint  POST /upload?taskId=<uuid>&folder=<step-folder>
// Returns: { path: "tasks/<taskId>/<folder>/<filename>" }
app.post(
  '/upload',
  upload.single('file'),
  (req: express.Request, res: express.Response) => {
    if (!req.file) {
      res.status(400).json({ error: 'No file received' });
      return;
    }
    const taskId = (req.query.taskId as string) || 'unknown';
    const folder = (req.query.folder as string) || 'misc';
    const relPath = `tasks/${taskId}/${folder}/${req.file.filename}`;
    res.json({ path: relPath, originalName: req.file.originalname });
  },
);

// ── Theme REST endpoints ───────────────────────────────────────────────────────

// Helper: verify Admin JWT from Authorization header
function requireAdminRest(req: express.Request, res: express.Response): { userId: string } | null {
  const header = (req.headers.authorization as string) ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const user = token ? verifyToken(token) : null;
  if (!user || user.role !== 'Admin') {
    res.status(401).json({ error: 'Admin access required' });
    return null;
  }
  return user;
}

// POST /theme/init  body: { name, displayName, colorPrimary, colorSecondary, colorAccent, colorText, colorBgOverlay }
app.post('/theme/init', express.json(), async (req: express.Request, res: express.Response) => {
  if (!requireAdminRest(req, res)) return;
  const { name, displayName, colorPrimary, colorSecondary, colorAccent, colorText, colorBgOverlay } = req.body as {
    name: string; displayName: string; colorPrimary: string; colorSecondary: string;
    colorAccent: string; colorText: string; colorBgOverlay: string;
  };
  if (!name || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
    res.status(400).json({ error: 'Invalid theme name. Use letters, digits, _ or - only, must start with a letter.' });
    return;
  }
  // Create all expected subfolders
  const subfolders = ['login/torch_flicker','login/dove','home/rabbit','attendence/fireplace','music','learningTask','mySubjects','messages','shop'];
  for (const sub of subfolders) fs.mkdirSync(path.join(THEMES_DIR, name, sub), { recursive: true });

  await pool.query(
    `INSERT INTO custom_themes (name, display_name, color_primary, color_secondary, color_accent, color_text, color_bg_overlay)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (name) DO UPDATE SET
       display_name     = EXCLUDED.display_name,
       color_primary    = EXCLUDED.color_primary,
       color_secondary  = EXCLUDED.color_secondary,
       color_accent     = EXCLUDED.color_accent,
       color_text       = EXCLUDED.color_text,
       color_bg_overlay = EXCLUDED.color_bg_overlay,
       status           = 'draft'`,
    [name, displayName, colorPrimary ?? '#FFD700', colorSecondary ?? '#C0A840',
     colorAccent ?? '#FF8C00', colorText ?? '#FFFFFF', colorBgOverlay ?? 'rgba(0,0,0,0.55)'],
  );
  res.json({ ok: true, name });
});

// POST /upload/theme-asset?themeName=X&assetKey=Y  (multipart/form-data)
app.post(
  '/upload/theme-asset',
  themeUpload.single('file'),
  (req: express.Request, res: express.Response) => {
    if (!requireAdminRest(req, res)) return;
    if (!req.file) { res.status(400).json({ error: 'No file received' }); return; }
    const { assetKey } = req.query as { assetKey: string };
    // Remove any spec .txt that was there for this asset
    const spec = ASSET_MANIFEST[assetKey];
    if (spec) {
      const txtPath = path.join(THEMES_DIR, req.query.themeName as string, spec.relPath + '.txt');
      try { fs.unlinkSync(txtPath); } catch { /* was not there */ }
    }
    res.json({ ok: true, assetKey });
  },
);

// POST /theme/skip-asset  body: { themeName, assetKey }
app.post('/theme/skip-asset', express.json(), (req: express.Request, res: express.Response) => {
  if (!requireAdminRest(req, res)) return;
  const { themeName, assetKey } = req.body as { themeName: string; assetKey: string };
  const spec = ASSET_MANIFEST[assetKey];
  if (!spec) { res.status(400).json({ error: 'Unknown asset key' }); return; }
  const dest = path.join(THEMES_DIR, themeName, path.dirname(spec.relPath));
  fs.mkdirSync(dest, { recursive: true });
  // Write spec .txt explaining what the file should be
  fs.writeFileSync(path.join(dest, path.basename(spec.relPath) + '.txt'), spec.specText, 'utf8');
  res.json({ ok: true, assetKey });
});

// GET /theme/asset-status/:themeName
app.get('/theme/asset-status/:themeName', (req: express.Request, res: express.Response) => {
  if (!requireAdminRest(req, res)) return;
  const { themeName } = req.params;
  const status: Record<string, 'uploaded' | 'skipped' | 'pending'> = {};
  for (const [key, spec] of Object.entries(ASSET_MANIFEST)) {
    const fullPath = path.join(THEMES_DIR, themeName, spec.relPath);
    const txtPath  = fullPath + '.txt';
    if (fs.existsSync(fullPath)) status[key] = 'uploaded';
    else if (fs.existsSync(txtPath)) status[key] = 'skipped';
    else status[key] = 'pending';
  }
  res.json(status);
});

// POST /theme/finalize  body: { themeName, spritePositions? }
app.post('/theme/finalize', express.json(), async (req: express.Request, res: express.Response) => {
  if (!requireAdminRest(req, res)) return;
  const { themeName, spritePositions } = req.body as {
    themeName: string;
    spritePositions?: Record<string, { x: number; y: number }>;
  };
  const themeRoot = path.join(THEMES_DIR, themeName);

  // Merge admin-placed positions into sprite manifests
  const loginPos    = spritePositions?.['login_static']     ?? { x: 15, y: 55 };
  const attendPos   = spritePositions?.['attendence_static'] ?? { x: 12, y: 72 };

  const loginSpritesJson = {
    sprites: [
      { ...LOGIN_SPRITES_JSON.sprites[0], x: loginPos.x, y: loginPos.y },
      { ...LOGIN_SPRITES_JSON.sprites[1] },
    ],
  };
  const attendenceSpritesJson = {
    sprites: [
      { ...ATTENDENCE_SPRITES_JSON.sprites[0], x: attendPos.x, y: attendPos.y },
    ],
  };

  // Generate sprites.json files
  fs.writeFileSync(path.join(themeRoot, 'login', 'sprites.json'),     JSON.stringify(loginSpritesJson, null, 2), 'utf8');
  fs.writeFileSync(path.join(themeRoot, 'attendence', 'sprites.json'), JSON.stringify(attendenceSpritesJson, null, 2), 'utf8');

  // Fetch display name from DB
  const { rows } = await pool.query(`SELECT display_name FROM custom_themes WHERE name = $1`, [themeName]);
  if (!rows[0]) { res.status(404).json({ error: 'Theme not found' }); return; }
  const displayName = rows[0].display_name as string;

  // Insert shop item (upsert by name)
  const assetPath = `themes/${themeName}`;
  const { rows: itemRows } = await pool.query(
    `INSERT INTO shop_items (name, description, item_type, asset_path, cost, tag, scope, theme_compatibility)
     VALUES ($1, $2, 'Theme', $3, 500, 'theme', 'global', 'all')
     ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, asset_path = EXCLUDED.asset_path
     RETURNING id`,
    [displayName, `${displayName} theme for Stella Logos`, assetPath],
  );
  const shopItemId = itemRows[0].id as string;

  // Activate theme
  await pool.query(
    `UPDATE custom_themes SET status = 'active', shop_item_id = $1 WHERE name = $2`,
    [shopItemId, themeName],
  );
  res.json({ ok: true, shopItemId });
});

// Analytics export  GET /analytics/export?classId=<uuid>&format=csv|json
app.get('/analytics/export', async (req: express.Request, res: express.Response) => {
  const authHeader = (req.headers.authorization as string) ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const user = token ? verifyToken(token) : null;
  if (!user || (user.role !== 'Teacher' && user.role !== 'Admin')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const classId = req.query.classId as string;
  const format = (req.query.format as string) ?? 'json';
  if (!classId) { res.status(400).json({ error: 'classId required' }); return; }

  const { rows } = await pool.query(
    `SELECT u.email, u.display_name, al.statement, al.recorded_at
       FROM activity_logs al
       JOIN users u ON u.id = al.learner_id
      WHERE al.class_id = $1
      ORDER BY al.recorded_at ASC`,
    [classId],
  );

  if (format === 'csv') {
    const lines = ['email,display_name,verb,object_id,recorded_at'];
    for (const r of rows) {
      const stmt = typeof r.statement === 'object' ? r.statement : JSON.parse(r.statement);
      const verb = stmt?.verb?.display?.['en-US'] ?? stmt?.verb?.id ?? '';
      const obj  = stmt?.object?.id ?? '';
      lines.push(`"${r.email}","${r.display_name}","${verb}","${obj}","${r.recorded_at.toISOString()}"`);
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="activity_${classId}.csv"`);
    res.send(lines.join('\n'));
  } else {
    res.json(rows.map(r => ({
      email: r.email,
      displayName: r.display_name,
      statement: typeof r.statement === 'object' ? r.statement : JSON.parse(r.statement),
      recordedAt: r.recorded_at.toISOString(),
    })));
  }
});

// GraphQL endpoint
app.use(
  '/graphql',
  express.json(),
  expressMiddleware(apollo, {
    context: async ({ req }) => {
      const authHeader = (req.headers.authorization as string) ?? '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      const user = token ? verifyToken(token) : null;
      return { user };
    },
  }),
);

const httpServer = createServer(app);
httpServer.listen(PORT, () => {
  console.log(`🚀 Stella Logos GraphQL ready at http://localhost:${PORT}/graphql`);
  console.log(`📁 File uploads at http://localhost:${PORT}/upload`);
  console.log(`📂 Static uploads at http://localhost:${PORT}/uploads/`);
});
