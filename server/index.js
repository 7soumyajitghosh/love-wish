// ─────────────────────────────────────────────
//  KINETIC gallery backend
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
const DATA_DIR = path.join(__dirname, 'data');
const DIST_DIR = path.join(__dirname, '..', 'dist');

const SEED_PATH = path.join(DATA_DIR, 'seed.json');
const SITES_PATH = path.join(DATA_DIR, 'sites.json');

// Runtime DB starts as a copy of the tracked seed; likes/submissions persist here.
if (!fs.existsSync(SITES_PATH) && fs.existsSync(SEED_PATH)) {
  fs.copyFileSync(SEED_PATH, SITES_PATH);
}
const sitesStore = createStore(SITES_PATH, []);
const visitsStore = createStore(path.join(DATA_DIR, 'visits.json'), { count: 0 });

const VARIANTS = ['waves', 'orbs', 'grid', 'bars', 'dots', 'rings'];
const CATEGORIES = ['Portfolio', 'Studio', '3D', 'AI', 'E-commerce', 'Music', 'Typography', 'SaaS'];

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '32kb' }));

// ── rate limits (per IP) ──
const buckets = new Map();
function rateLimited(ip, key, max, windowMs) {
  const now = Date.now();
  const k = `${ip}:${key}`;
  const hits = (buckets.get(k) || []).filter((t) => now - t < windowMs);
  if (hits.length >= max) return true;
  hits.push(now);
  buckets.set(k, hits);
  return false;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ── Gallery ──
app.get('/api/sites', (_req, res) => {
  res.json({ sites: sitesStore.read() });
});

app.post('/api/sites', (req, res) => {
  const ip = req.ip || 'unknown';
  if (rateLimited(ip, 'submit', 5, 60 * 60 * 1000)) {
    return res.status(429).json({ error: 'too many submissions — try again later' });
  }
  const title = String(req.body?.title ?? '').trim().slice(0, 60);
  const url = String(req.body?.url ?? '').trim().slice(0, 200);
  const description = String(req.body?.description ?? '').trim().slice(0, 300);
  const category = String(req.body?.category ?? '');
  const style = String(req.body?.style ?? '');
  const tech = Array.isArray(req.body?.tech) ? req.body.tech.map(String).slice(0, 3) : [];
  if (!title || !description) {
    return res.status(400).json({ error: 'title and description are required' });
  }
  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'unknown category' });
  }
  if (style !== 'Dark' && style !== 'Light') {
    return res.status(400).json({ error: 'style must be Dark or Light' });
  }
  const all = sitesStore.read();
  const n = all.length;
  const site = {
    id: `community-${Date.now().toString(36)}`,
    title,
    description,
    url,
    category,
    style,
    tech: tech.length > 0 ? tech : ['CSS'],
    year: new Date().getFullYear(),
    hue: (n * 47) % 360,
    variant: VARIANTS[n % VARIANTS.length],
    likes: 0,
    badge: 'Community',
  };
  all.unshift(site);
  sitesStore.write(all.slice(0, 500));
  res.status(201).json({ site });
});

app.post('/api/sites/:id/like', (req, res) => {
  const ip = req.ip || 'unknown';
  if (rateLimited(ip, 'like', 60, 60 * 1000)) {
    return res.status(429).json({ error: 'slow down a little' });
  }
  const all = sitesStore.read();
  const site = all.find((s) => s.id === req.params.id);
  if (!site) return res.status(404).json({ error: 'unknown site' });
  site.likes = (Number(site.likes) || 0) + 1;
  sitesStore.write(all);
  res.json({ likes: site.likes });
});

// ── Visit counter ──
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
      message: 'Backend is running. Build the frontend with `npm run build` to serve the gallery here.',
    });
  });
}

app.listen(PORT, () => {
  console.log(`kinetic gallery backend listening on :${PORT}`);
});
