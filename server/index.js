// ─────────────────────────────────────────────
//  Love Universe backend
//  Express API + static host for the built frontend.
//  Run: npm run server   (serves http://localhost:3001)
// ─────────────────────────────────────────────
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { createStore } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3001);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'love-admin';
const DATA_DIR = path.join(__dirname, 'data');
const DIST_DIR = path.join(__dirname, '..', 'dist');

const notesStore = createStore(path.join(DATA_DIR, 'notes.json'), []);
const visitsStore = createStore(path.join(DATA_DIR, 'visits.json'), { count: 0 });
const CONFIG_PATH = path.join(DATA_DIR, 'love.json');

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return null;
  }
}

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '32kb' }));

// ── simple in-memory rate limit for posting notes (8 per IP / 10 min) ──
const buckets = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const hits = (buckets.get(ip) || []).filter((t) => now - t < windowMs);
  if (hits.length >= 8) return true;
  hits.push(now);
  buckets.set(ip, hits);
  return false;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Whole love story content, editable without touching code.
app.get('/api/config', (_req, res) => {
  const cfg = readConfig();
  if (!cfg) return res.status(500).json({ error: 'love.json missing' });
  res.json(cfg);
});

// Update story content (owner only). Header: x-admin-token: <ADMIN_TOKEN>
app.put('/api/config', (req, res) => {
  if (req.headers['x-admin-token'] !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const body = req.body;
  if (!body || typeof body !== 'object' || !body.loverName || !body.partnerName) {
    return res.status(400).json({ error: 'config must include loverName and partnerName' });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(body, null, 2));
  res.json({ ok: true });
});

// ── Love-notes wall (guestbook) ──
app.get('/api/notes', (_req, res) => {
  const all = notesStore.read();
  res.json({ notes: all.slice(-100).reverse() });
});

app.post('/api/notes', (req, res) => {
  const ip = req.ip || 'unknown';
  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'too many notes — try again later' });
  }
  const name = String(req.body?.name ?? '').trim().slice(0, 40);
  const message = String(req.body?.message ?? '').trim().slice(0, 500);
  if (!name || !message) {
    return res.status(400).json({ error: 'name and message are required' });
  }
  const all = notesStore.read();
  const note = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    message,
    at: new Date().toISOString(),
  };
  all.push(note);
  notesStore.write(all.slice(-500));
  res.status(201).json({ note });
});

// ── Visit counter ("this story has been opened N times") ──
app.get('/api/visits', (_req, res) => {
  const data = visitsStore.read();
  data.count = (Number(data.count) || 0) + 1;
  visitsStore.write(data);
  res.json({ visits: data.count });
});

// ── Serve the built frontend (vite build → dist/) ──
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, { maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.status(200).json({
      ok: true,
      message: 'Backend is running. Build the frontend with `npm run build` to serve the site here.',
    });
  });
}

app.listen(PORT, () => {
  console.log(`love-universe backend listening on :${PORT}`);
});
