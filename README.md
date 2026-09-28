# 💗 Our Love Universe

A premium, fully animated, cinematic interactive love story — **not a scrolling website**, but a living romantic universe.

`START → Flying Love Seed → Seed lands → Watering → Roots → Trunk → Branches → Twigs → Buds → ❤️ Leaves → Full Bloom → Strong Wind → Hearts Fly Away → Memories → Why You → Love Letter → Night Sky → Heartbeat → Final Journey → I LOVE YOU → Heart Storm → Finale`

## ✨ Key rules (as requested)

- **Tree growth is interaction-driven, never scroll-driven.** Drag the watering can over the soil; each full watering advances one growth stage. Scrolling/wheel only moves between already-completed scenes.
- **Real procedural animation, no video, no pop-in SVG.** The Heart Tree is drawn progressively on canvas with organic easing, sway, pollen, light and heart leaves.
- **Watering visibly matters:** curved droplet trajectories, soil darkening, seed glow, moisture meter, growth lock during animation.
- **Cinematic transitions:** fades, heart-zooms, flying-heart scene bridges, letterbox bars, film grain, vignette.
- **Mobile-first touch:** drag can, tap memories, hold-to-water button, press-and-hold heartbeat.
- **Audio starts only after user gesture.** Synthesized WebAudio (no files needed): chimes, water, heartbeat, envelope, generative melody. `🎵 Play Our Song` / mute controls included.
- **Personalize without touching logic:** edit only `src/loveConfig.ts` (names, dates, memories, reasons, letter, finale, colors).
- **Reduced motion respected**, responsive, canvas DPR-capped for smoothness.

## 🚀 Run

```bash
npm install
npm run dev
```

Then open the printed local URL (default `http://localhost:5173`).

Build with `npm run build` and preview with `npm run preview`.

## 💌 Backend (Express API + static host)

`server/` holds a small Express backend (ESM, zero native deps, JSON-file storage):

| Endpoint | Description |
|---|---|
| `GET /api/health` | liveness check |
| `GET /api/config` | whole story content as JSON (mirrors `loveConfig.ts`) |
| `PUT /api/config` | update story content — owner only (`x-admin-token` header = `ADMIN_TOKEN`) |
| `GET /api/notes` | love-notes wall, newest first |
| `POST /api/notes` | leave a note `{name, message}` (validated + rate-limited) |
| `GET /api/visits` | increments + returns the visit counter |

Run it together with the site:

```bash
npm install
npm run build    # frontend → dist/
npm run server   # serves API + site on http://localhost:3001
```

Set `ADMIN_TOKEN` env var to protect story edits. The finale scene includes a
“Leave a love note 💌” wall and a visit counter, both powered by this API —
and both degrade gracefully when the site is served statically without it.

## 🌍 Deploy (permanent live URL)

One-command options (builds `dist/`, then starts `server/index.js`):

- **Render:** import the repo — `render.yaml` is included (Docker, free plan, `/api/health` check).
- **Railway / Fly.io / any Docker host:** `Dockerfile` is included (`EXPOSE 3001`).
- **VPS:** `npm install && npm run build`, then run `npm start` behind nginx/Caddy with `PORT` + `ADMIN_TOKEN` set.

## 🗂 Structure

```
src/
  loveConfig.ts            ← personalize everything here
  App.tsx                  ← cinematic scene machine (14 scenes)
  components/
    Starfield.tsx          ← living ambient universe canvas
    HeartTreeCanvas.tsx    ← procedural interactive Heart Tree
  hooks/hooks.ts           ← reduced-motion, cursor glow
  utils/helpers.ts         ← seeded RNG, heart drawing, synth sound engine
  index.css / main.tsx
```

Edit `src/loveConfig.ts` to make it yours. No animation code lives there.
