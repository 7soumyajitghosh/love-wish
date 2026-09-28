# KINETIC — a showcase of websites in motion

An original gallery concept inspired by the great animation-website roundups:
a curated collection of fictional sites with **live generative preview thumbnails**
— every card moves, no video files shipped.

## ✨ What it does

- **Gallery grid** of 12 concept entries with canvas-painted animated thumbnails
  (waves, orbs, grids, bars, particles, rings — each card its own hue + motion)
- **Hover previews** — thumbnails zoom, arrow buttons slide in, titles tint
- **Filter bar** — full-text search + category + style (Dark/Light) + craft
  (GSAP, WebGL, Three.js, Canvas, CSS, Framer Motion)
- **Detail modal** per entry with tags and like button
- **Submit flow** — publish your own entry to the gallery (backend-validated)
- **Likes** with optimistic UI, persisted in the backend
- **Award-site chrome** — preloader counter, custom dot + trailing-ring cursor,
  marquee tickers, line-mask headline reveals, sticky blurred navbar, stats hero

## 🚀 Run

```bash
npm install
npm run build    # frontend → dist/
npm run server   # serves API + gallery on http://localhost:3001
```

Frontend-only dev: `npm run dev` (gallery falls back to bundled seed data).

## 💌 Backend (Express API + static host)

| Endpoint | Description |
|---|---|
| `GET /api/health` | liveness check |
| `GET /api/sites` | gallery entries (seed + community, with live like counts) |
| `POST /api/sites` | submit an entry (validated + rate-limited) |
| `POST /api/sites/:id/like` | like an entry (rate-limited) |
| `GET /api/visits` | visit counter for the footer |

Storage is JSON files under `server/data/` — `seed.json` is tracked,
`sites.json`/`visits.json` are runtime data and gitignored.

## 🗂 Structure

```
src/
  data/sites.ts              ← seed entries, categories, types
  utils/api.ts               ← backend client (fails soft offline)
  components/
    ThumbCanvas.tsx          ← generative animated thumbnails
    Chrome.tsx               ← cursor, preloader, marquee, nav, hero, footer
    SiteCard.tsx             ← gallery card
    Modals.tsx               ← detail + submit modals
  App.tsx                    ← filters, grid, likes, modals
server/
  index.js / store.js        ← Express API + static host
  data/seed.json             ← tracked seed entries
```

## 🌍 Deploy

- **Render:** `render.yaml` included (Docker, `/api/health` check).
- **Railway / Fly.io / any Docker host:** `Dockerfile` included (`EXPOSE 3001`).
