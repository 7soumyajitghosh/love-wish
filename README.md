# ✦ LUMEN — a universe, built by you

A premium, fully animated, cinematic interactive creation myth — **not a scrolling website**, but a living universe the visitor builds themselves.

`START → Falling Spark → Spark lands → Gather Starlight → First Spark → Outline → Inner Weave → Full Weave → Heartbeat Core → Ignition → Sparks Fly Away → Worlds → Why Anything? → The First Message → Night Sky → Pulse → Final Journey → IT WAS YOU. → Star Storm → Finale`

## ✨ Key rules (as requested)

- **Awakening is interaction-driven, never scroll-driven.** Drag the moon lantern through drifting sparks; each full meter of starlight awakens one constellation layer. Scrolling/wheel only moves between already-completed scenes.
- **Real procedural animation, no video, no pop-in SVG.** The Heart Constellation ignites progressively on canvas with organic easing, twinkle, web lines, a beating core and rising embers.
- **Gathering visibly matters:** nearby sparks stream into the lantern, the starlight meter fills, stages lock during each awakening.
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
| `GET /api/notes` | marks left on the universe, newest first |
| `POST /api/notes` | leave a mark `{name, message}` (validated + rate-limited) |
| `GET /api/visits` | increments + returns the visit counter |

Run it together with the site:

```bash
npm install
npm run build    # frontend → dist/
npm run server   # serves API + site on http://localhost:3001
```

Set `ADMIN_TOKEN` env var to protect story edits. The finale scene includes a
“Leave a mark on the universe 💫” wall and a visit counter, both powered by this API —
and both degrade gracefully when the site is served statically without it.

## 🌍 Deploy (permanent live URL)

One-command options (builds `dist/`, then starts `server/index.js`):

- **Render:** import the repo — `render.yaml` is included (Docker, free plan, `/api/health` check).
- **Railway / Fly.io / any Docker host:** `Dockerfile` is included (`EXPOSE 3001`).
- **VPS:** `npm install && npm run build`, then run `npm start` behind nginx/Caddy with `PORT` + `ADMIN_TOKEN` set.

## 🗂 Structure

```
src/
  loveConfig.ts            ← personalize the whole story here
  App.tsx                  ← cinematic scene machine (14 scenes)
  components/
    Starfield.tsx          ← living ambient universe canvas
    HeartConstellationCanvas.tsx ← procedural Heart Constellation + starlight gathering
  hooks/hooks.ts           ← reduced-motion, cursor glow
  utils/helpers.ts         ← seeded RNG, heart drawing, synth sound engine
  index.css / main.tsx
```

Edit `src/loveConfig.ts` to make it yours. No animation code lives there.
