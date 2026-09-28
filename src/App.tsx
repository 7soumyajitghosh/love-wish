import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Starfield from './components/Starfield'
import HeartTreeCanvas from './components/HeartTreeCanvas'
import Guestbook from './components/Guestbook'
import { loveConfig as C } from './loveConfig'
import { sound, drawHeart } from './utils/helpers'
import { useCursorGlow, useReducedMotion } from './hooks/hooks'

const SCENES = [
  'opening', 'seed', 'grow', 'bloom', 'wind', 'memories',
  'whyyou', 'letter', 'night', 'heartbeat', 'journey',
  'confession', 'storm', 'finale',
] as const
type Scene = (typeof SCENES)[number]

const GROWTH_TARGETS = [0.16, 0.32, 0.55, 0.72, 0.9, 1.0]

function GlassButton({ children, onClick, className = '' }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`glass glow-btn rounded-full px-8 py-3.5 text-sm tracking-[0.25em] uppercase text-warmwhite no-select ${className}`}
    >
      {children}
    </motion.button>
  )
}

// ── Water droplets overlay ──
function WaterOverlay({ pouring, fromX, fromY, toX, toY, onDrop }: {
  pouring: boolean; fromX: number; fromY: number; toX: number; toY: number; onDrop: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const pourRef = useRef(pouring)
  pourRef.current = pouring
  const geomRef = useRef({ fromX, fromY, toX, toY })
  geomRef.current = { fromX, fromY, toX, toY }
  const cbRef = useRef(onDrop)
  cbRef.current = onDrop

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    let w = 0, h = 0, raf = 0
    const DPR = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      const r = canvas.parentElement!.getBoundingClientRect()
      w = r.width; h = r.height
      canvas.width = w * DPR; canvas.height = h * DPR
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)
    type D = { x: number; y: number; vx: number; vy: number; r: number }
    let drops: D[] = []
    const frame = () => {
      ctx.clearRect(0, 0, w, h)
      const g = geomRef.current
      const fx = g.fromX * w, fy = g.fromY * h, tx = g.toX * w, ty = g.toY * h
      if (pourRef.current && drops.length < 160) {
        for (let i = 0; i < 3; i++) {
          drops.push({ x: fx + (Math.random() - 0.5) * 8, y: fy, vx: (tx - fx) * 0.015 + (Math.random() - 0.5) * 1.2, vy: 1 + Math.random() * 1.5, r: 1.5 + Math.random() * 2.5 })
        }
        if (Math.random() < 0.1) sound.water()
      }
      drops = drops.filter((d) => d.y < h + 20)
      for (const d of drops) {
        d.vy += 0.12
        d.x += d.vx
        d.y += d.vy
        ctx.fillStyle = 'rgba(140,210,255,0.85)'
        ctx.shadowColor = '#7cc7ff'
        ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.ellipse(d.x, d.y, d.r * 0.7, d.r, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        const dx = d.x - tx, dy = d.y - ty
        if (dx * dx + dy * dy < 900) {
          d.y = h + 30
          cbRef.current()
        }
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" />
}

// ── Flying hearts burst overlay (wind / storm) ──
function HeartsBurst({ count = 120, wind = 1, seed = 1 }: { count?: number; wind?: number; seed?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    const DPR = Math.min(window.devicePixelRatio || 1, 2)
    let w = window.innerWidth, h = window.innerHeight, raf = 0
    canvas.width = w * DPR; canvas.height = h * DPR
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    let rnd = seed * 1000 + 7
    const rand = () => { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647 }
    type H = { x: number; y: number; s: number; vx: number; vy: number; ph: number; a: number }
    const hearts: H[] = Array.from({ length: count }, () => ({
      x: rand() * w, y: h * 0.3 + rand() * h * 0.7,
      s: 8 + rand() * 22, vx: (0.6 + rand() * 2.2) * wind, vy: -(0.4 + rand() * 1.6),
      ph: rand() * 7, a: 0.5 + rand() * 0.5,
    }))
    let t = 0
    const frame = () => {
      t += 0.016
      ctx.clearRect(0, 0, w, h)
      for (const p of hearts) {
        p.x += p.vx + Math.sin(t * 1.5 + p.ph) * 0.8
        p.y += p.vy
        if (p.y < -40) { p.y = h + 40; p.x = Math.random() * w * 0.6 }
        if (p.x > w + 40) p.x = -40
        ctx.save()
        ctx.globalAlpha = p.a
        ctx.fillStyle = p.s > 20 ? '#ff6b9d' : '#ff8fa3'
        ctx.shadowColor = '#ff2e63'
        ctx.shadowBlur = 12
        drawHeart(ctx, p.x, p.y, p.s, Math.sin(t * 2 + p.ph) * 0.3)
        ctx.restore()
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    const onR = () => {
      w = window.innerWidth; h = window.innerHeight
      canvas.width = w * DPR; canvas.height = h * DPR
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    }
    window.addEventListener('resize', onR)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onR) }
  }, [count, wind, seed])
  return <canvas ref={ref} className="pointer-events-none fixed inset-0" />
}

export default function App() {
  useCursorGlow()
  const reduced = useReducedMotion()
  const [scene, setScene] = useState<Scene>('opening')
  const [unlocked, setUnlocked] = useState(0)
  const [audioOn, setAudioOn] = useState(false)
  const [songOn, setSongOn] = useState(false)

  // opening sequence
  const [openStep, setOpenStep] = useState(0)
  // seed flight
  const [seedLanded, setSeedLanded] = useState(false)
  // growth
  const [waters, setWaters] = useState(0)
  const [growth, setGrowth] = useState(0.02)
  const [moisture, setMoisture] = useState(0)
  const [locked, setLocked] = useState(false)
  const [pouring, setPouring] = useState(false)
  const [can, setCan] = useState({ x: 0.78, y: 0.3 })
  const [bloom, setBloom] = useState(0)
  const [soilDark, setSoilDark] = useState(0)
  const dragging = useRef(false)
  const pourHold = useRef(false)

  // memories
  const [activeMemory, setActiveMemory] = useState<string | null>(null)
  // why you
  const [foundReasons, setFoundReasons] = useState<number[]>([])
  // letter
  const [envelopeOpen, setEnvelopeOpen] = useState(false)
  const [letterLines, setLetterLines] = useState(0)
  // heartbeat
  const [holding, setHolding] = useState(false)
  const [holdPower, setHoldPower] = useState(0)
  const [heartRevealed, setHeartRevealed] = useState(false)
  // confession / storm
  const [stormPhase, setStormPhase] = useState(0)

  const sceneIdx = SCENES.indexOf(scene)

  const go = useCallback((s: Scene) => {
    setScene(s)
    setUnlocked((u) => Math.max(u, SCENES.indexOf(s)))
    sound.chime()
    window.scrollTo(0, 0)
  }, [])

  const next = useCallback(() => {
    const i = Math.min(SCENES.length - 1, SCENES.indexOf(scene) + 1)
    go(SCENES[i])
  }, [scene, go])

  // wheel / swipe only navigates unlocked scenes (never drives growth)
  useEffect(() => {
    let cool = false
    const onWheel = (e: WheelEvent) => {
      if (cool) return
      if (Math.abs(e.deltaY) < 24) return
      const i = SCENES.indexOf(scene)
      if (e.deltaY > 0 && i < unlocked) { cool = true; setScene(SCENES[i + 1]); setTimeout(() => (cool = false), 1200) }
      else if (e.deltaY < 0 && i > 0) { cool = true; setScene(SCENES[i - 1]); setTimeout(() => (cool = false), 1200) }
    }
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => window.removeEventListener('wheel', onWheel)
  }, [scene, unlocked])

  // opening auto-steps
  useEffect(() => {
    if (scene !== 'opening') return
    const d = reduced ? 500 : 2200
    const t1 = setTimeout(() => setOpenStep(1), 1200)
    const t2 = setTimeout(() => setOpenStep(2), 1200 + d)
    const t3 = setTimeout(() => setOpenStep(3), 1200 + d * 2)
    const t4 = setTimeout(() => setOpenStep(4), 1200 + d * 2 + 1800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [scene, reduced])

  // seed flight → landing
  useEffect(() => {
    if (scene !== 'seed') return
    setSeedLanded(false)
    const t = setTimeout(() => { setSeedLanded(true); sound.pop() }, reduced ? 1200 : 5200)
    return () => clearTimeout(t)
  }, [scene, reduced])

  // growth tween helper
  const tweenGrowth = (from: number, to: number) => {
    setLocked(true)
    const start = performance.now()
    const dur = reduced ? 600 : 2600
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / dur)
      const e = 1 - Math.pow(1 - k, 3)
      setGrowth(from + (to - from) * e)
      if (k < 1) requestAnimationFrame(step)
      else setLocked(false)
    }
    requestAnimationFrame(step)
  }

  const moistureRef = useRef(0)
  const advancingRef = useRef(false)

  const handleDrop = useCallback(() => {
    if (locked || advancingRef.current) {
      setSoilDark((s) => Math.min(1, s + 0.002))
      return
    }
    setSoilDark((s) => Math.min(1, s + 0.004))
    moistureRef.current = Math.min(100, moistureRef.current + 1.6)
    setMoisture(moistureRef.current)
    if (moistureRef.current >= 100 && waters < GROWTH_TARGETS.length) {
      advancingRef.current = true
      const target = GROWTH_TARGETS[waters]
      const from = growth
      const done = waters + 1
      moistureRef.current = 0
      setMoisture(0)
      setWaters((w) => w + 1)
      tweenGrowth(from, target)
      sound.chime()
      setTimeout(() => { advancingRef.current = false }, reduced ? 700 : 2800)
      if (done >= GROWTH_TARGETS.length) {
        setTimeout(() => go('bloom'), reduced ? 800 : 3200)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, waters, growth, reduced, go])

  // bloom ramp
  useEffect(() => {
    if (scene !== 'bloom') return
    setBloom(0)
    if (reduced) { setBloom(1); return }
    const start = performance.now()
    let raf = 0
    const f = (now: number) => {
      const k = Math.min(1, (now - start) / 5000)
      setBloom(k)
      if (k < 1) raf = requestAnimationFrame(f)
    }
    raf = requestAnimationFrame(f)
    const t = setTimeout(() => {}, 9000)
    return () => { cancelAnimationFrame(raf); clearTimeout(t) }
  }, [scene, reduced])

  // letter typewriter
  useEffect(() => {
    if (!envelopeOpen) return
    setLetterLines(0)
    const total = C.letter.lines.length
    let i = 0
    const id = setInterval(() => {
      i++
      setLetterLines(i)
      if (i >= total) clearInterval(id)
    }, reduced ? 60 : 420)
    return () => clearInterval(id)
  }, [envelopeOpen, reduced])

  // heartbeat hold
  useEffect(() => {
    let raf = 0
    if (holding) {
      sound.startHeartbeat()
      const f = () => {
        setHoldPower((p) => {
          const np = Math.min(1, p + 0.012)
          if (np >= 1) setHeartRevealed(true)
          return np
        })
        raf = requestAnimationFrame(f)
      }
      raf = requestAnimationFrame(f)
    } else {
      sound.stopHeartbeat()
      setHoldPower((p) => Math.max(0, p - 0.02))
    }
    return () => cancelAnimationFrame(raf)
  }, [holding])

  // ambient song: gentle generative pad
  useEffect(() => {
    if (!songOn || !audioOn) return
    const notes = [261.6, 329.6, 392, 523.25, 440, 392]
    let i = 0
    const id = setInterval(() => {
      if (!sound.enabled) return
      // soft arpeggio via private tone access — use chime-like calls
      sound.pop()
      i = (i + 1) % notes.length
    }, 2600)
    return () => clearInterval(id)
  }, [songOn, audioOn])

  const toggleAudio = () => {
    const on = !audioOn
    setAudioOn(on)
    sound.setEnabled(on)
    if (on) sound.chime()
  }

  const overSoil = useMemo(() => {
    const dx = can.x - 0.5, dy = can.y - 0.72
    return dx * dx + dy * dy < 0.035
  }, [can])

  useEffect(() => {
    setPouring(overSoil && !locked && (dragging.current || pourHold.current))
  }, [overSoil, locked])

  // pointer drag for watering can
  const onCanPointerDown = (e: React.PointerEvent) => {
    dragging.current = true
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onStagePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setCan({
      x: Math.min(0.95, Math.max(0.05, (e.clientX - r.left) / r.width)),
      y: Math.min(0.9, Math.max(0.05, (e.clientY - r.top) / r.height)),
    })
  }
  const onStagePointerUp = () => { dragging.current = false; pourHold.current = false; setPouring(false) }

  const stageCaption = waters < C.growthStages.length ? C.growthStages[waters] : C.growthStages[C.growthStages.length - 1]

  return (
    <div className="cine-vignette film-grain relative h-full w-full overflow-hidden bg-abyss">
      <Starfield intensity={scene === 'night' ? 1.6 : 1} wind={scene === 'wind' || scene === 'storm' ? 3 : 1} />
      {(scene === 'wind' || scene === 'storm') && <HeartsBurst count={scene === 'storm' ? 320 : 140} wind={scene === 'storm' ? 1.4 : 2.6} seed={3} />}

      {/* letterbox */}
      <div className="letterbox-top" style={{ transform: scene === 'opening' ? 'scaleY(1)' : 'scaleY(0.35)' }} />
      <div className="letterbox-bottom" style={{ transform: scene === 'opening' ? 'scaleY(1)' : 'scaleY(0.35)' }} />

      {/* audio controls */}
      <div className="fixed right-4 top-4 z-[60] flex gap-2">
        <button onClick={toggleAudio} className="glass rounded-full px-4 py-2 text-xs tracking-widest uppercase">
          {audioOn ? '🔇 Mute' : '🎵 Play Our Song'}
        </button>
        {audioOn && (
          <button onClick={() => setSongOn((s) => !s)} className="glass rounded-full px-4 py-2 text-xs tracking-widest uppercase">
            {songOn ? '⏸ Pause melody' : '▶ Melody'}
          </button>
        )}
      </div>

      {/* scene dots (only unlocked) */}
      {scene !== 'opening' && (
        <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 gap-1.5">
          {SCENES.map((s, i) => (
            <button
              key={s}
              disabled={i > unlocked}
              onClick={() => i <= unlocked && setScene(s)}
              className={`h-1.5 rounded-full transition-all ${i === sceneIdx ? 'w-8 bg-rosepink' : i <= unlocked ? 'w-3 bg-white/40 hover:bg-white/70' : 'w-3 bg-white/10'}`}
              aria-label={s}
            />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── 1. OPENING ── */}
        {scene === 'opening' && (
          <motion.div key="opening" className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black px-6 text-center"
            exit={{ opacity: 0, scale: 1.15, filter: 'blur(8px)' }} transition={{ duration: 1.4 }}>
            <AnimatePresence>
              {openStep === 1 && (
                <motion.p key="l1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 2 }}
                  className="font-serif-cine text-2xl italic text-warmwhite/90 md:text-4xl">{C.opening.line1}</motion.p>
              )}
              {openStep === 2 && (
                <motion.p key="l2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 2 }}
                  className="font-serif-cine text-2xl italic text-rosepink text-glow-pink md:text-4xl">{C.opening.line2}</motion.p>
              )}
              {openStep >= 3 && (
                <motion.div key="l3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 2 }} className="flex flex-col items-center gap-8">
                  <p className="font-script text-5xl text-warmwhite text-glow-warm md:text-7xl">{C.opening.line3} ❤️</p>
                  <p className="text-xs uppercase tracking-[0.4em] text-white/50">{C.loverName} × {C.partnerName}</p>
                  {openStep >= 4 && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }}>
                      <GlassButton onClick={() => { setAudioOn(true); sound.setEnabled(true); go('seed') }}>✨ Begin Our Story ✨</GlassButton>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            {/* single glowing particle at start */}
            {openStep === 0 && (
              <motion.div className="h-2 w-2 rounded-full bg-rosepink"
                style={{ boxShadow: '0 0 30px 10px rgba(255,143,163,.7)' }}
                animate={{ scale: [1, 1.6, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
            )}
          </motion.div>
        )}

        {/* ── 2. SEED ── */}
        {scene === 'seed' && (
          <motion.div key="seed" className="absolute inset-0 z-10 flex flex-col items-center justify-end pb-24"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.1 }} transition={{ duration: 1.2 }}>
            <div className="pointer-events-none absolute left-1/2 top-[16%] -translate-x-1/2 text-center">
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 1.5 }}
                className="font-serif-cine text-xl italic text-warmwhite/90 md:text-3xl">{C.seed.line1}</motion.p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2, duration: 1.5 }}
                className="font-serif-cine text-2xl italic text-rosepink md:text-4xl">{C.seed.line2}</motion.p>
            </div>
            {/* flying seed */}
            {!seedLanded ? (
              <motion.div className="absolute left-0 top-[38%] text-5xl"
                style={{ filter: 'drop-shadow(0 0 18px #ff8fa3)' }}
                animate={reduced ? { x: '42vw', y: '22vh', rotate: 10 } : { x: ['0vw', '25vw', '45vw', '42vw'], y: ['0vh', '6vh', '-4vh', '22vh'], rotate: [0, 14, -10, 8] }}
                transition={{ duration: reduced ? 1 : 5, ease: 'easeInOut' }}>
                💗
                <motion.div className="absolute -left-10 top-1/2 h-px w-10 bg-gradient-to-l from-rosepink to-transparent" />
              </motion.div>
            ) : (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute left-1/2 top-[60%] -translate-x-1/2 text-4xl"
                style={{ filter: 'drop-shadow(0 0 22px #ff5d8f)' }}>
                💗
                <motion.div className="absolute -inset-6 rounded-full border border-rosepink/40"
                  animate={{ scale: [1, 1.4], opacity: [0.7, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />
              </motion.div>
            )}
            {/* soil patch */}
            <div className="absolute bottom-[16%] left-1/2 h-10 w-64 -translate-x-1/2 rounded-[50%] bg-gradient-to-b from-[#5b2a1e] to-[#241016] opacity-90"
              style={{ boxShadow: '0 0 40px rgba(201,24,74,.35)' }} />
            {seedLanded && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="z-10 flex flex-col items-center gap-4">
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">the seed has found its home</p>
                <GlassButton onClick={() => go('grow')}>Tend to it 🌱</GlassButton>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── 3. GROW (watering + tree) ── */}
        {scene === 'grow' && (
          <motion.div key="grow" className="absolute inset-0 z-10"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}
            onPointerMove={onStagePointerMove} onPointerUp={onStagePointerUp} onPointerLeave={onStagePointerUp}>
            <div className="absolute left-1/2 top-[9%] w-full max-w-2xl -translate-x-1/2 px-6 text-center">
              <p className="font-serif-cine text-2xl italic text-warmwhite md:text-3xl">{C.seed.wateringPrompt}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.3em] text-white/50">{locked ? `growing ${stageCaption.name}…` : stageCaption.caption}</p>
              <p className="mt-1 text-[11px] text-white/40">{C.seed.wateringHint}</p>
              {/* moisture meter */}
              <div className="mx-auto mt-3 h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-sky-300 to-rosepink transition-all" style={{ width: `${moisture}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-center gap-2 text-xs text-white/60">
                {C.growthStages.map((s, i) => (
                  <span key={s.name} className={`rounded-full px-2 py-0.5 ${i < waters ? 'bg-crimson/60 text-white' : i === waters ? 'bg-white/15 text-rosepink' : 'bg-white/5'}`}>
                    {i < waters ? '❤️' : '·'} {s.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-[8%] top-[26%]">
              <HeartTreeCanvas growth={growth} bloom={0} windAmp={1} />
              <WaterOverlay pouring={pouring} fromX={can.x} fromY={can.y + 0.04} toX={0.5} toY={0.62} onDrop={handleDrop} />
              {/* soil darkness overlay */}
              <div className="pointer-events-none absolute bottom-[6%] left-1/2 h-12 w-72 -translate-x-1/2 rounded-[50%] bg-black transition-opacity"
                style={{ opacity: soilDark * 0.45 }} />
              {/* watering can */}
              <motion.div
                className="touch-none-all absolute z-20 cursor-grab touch-none select-none text-5xl md:text-6xl"
                style={{ left: `calc(${can.x * 100}% - 28px)`, top: `calc(${can.y * 100}% - 28px)`, filter: 'drop-shadow(0 0 16px rgba(140,210,255,.8))' }}
                onPointerDown={onCanPointerDown}
                animate={pouring ? { rotate: [0, -18, -18], x: [0, 0] } : { rotate: 0 }}
                whileHover={{ scale: 1.1 }}>
                🚰
                {overSoil && !locked && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] tracking-widest text-sky-200">POURING 💧</div>}
              </motion.div>
            </div>

            {/* mobile pour button */}
            <div className="absolute bottom-[24%] left-1/2 z-20 -translate-x-1/2 md:hidden">
              <button
                onPointerDown={() => { pourHold.current = true; setCan({ x: 0.5, y: 0.42 }); setPouring(true) }}
                onPointerUp={() => { pourHold.current = false; setPouring(false) }}
                className="glass rounded-full px-6 py-3 text-sm">💧 Hold to water</button>
            </div>

            {locked && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.6, repeat: Infinity }}
                  className="font-script text-5xl text-rosepink text-glow-pink">growing…</motion.p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── 4. BLOOM ── */}
        {scene === 'bloom' && (
          <motion.div key="bloom" className="absolute inset-0 z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-x-0 bottom-[4%] top-[14%]">
              <HeartTreeCanvas growth={1} bloom={bloom} windAmp={0.4} />
            </div>
            <div className="absolute left-1/2 top-[10%] w-full max-w-2xl -translate-x-1/2 px-6 text-center">
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 1.5 }}
                className="font-serif-cine text-2xl italic md:text-4xl">{C.bloom.line1}</motion.p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: bloom > 0.5 ? 1 : 0 }} transition={{ duration: 1.5 }}
                className="font-serif-cine mt-3 text-xl italic text-rosepink md:text-2xl">{C.bloom.line2} {C.bloom.line3}</motion.p>
              {bloom > 0.85 && (
                <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
                  <GlassButton onClick={() => go('wind')}>Let the wind carry it 🍃</GlassButton>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── 5. WIND ── */}
        {scene === 'wind' && (
          <motion.div key="wind" className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.p className="font-serif-cine max-w-2xl text-2xl italic md:text-4xl"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5 }}>
              The heart leaves begin to detach —<br />
              <span className="text-rosepink">but love never disappears. It travels.</span>
            </motion.p>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }} className="mt-8">
              <GlassButton onClick={() => go('memories')}>Follow the hearts 💕</GlassButton>
            </motion.div>
          </motion.div>
        )}

        {/* ── 6. MEMORIES ── */}
        {scene === 'memories' && (
          <motion.div key="memories" className="absolute inset-0 z-10 overflow-hidden px-4 pb-24 pt-20"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="text-center font-serif-cine text-2xl italic md:text-3xl">A world made of <span className="text-rosepink">us</span></p>
            <p className="mt-1 text-center text-xs uppercase tracking-[0.3em] text-white/50">touch a memory to hold it closer</p>
            <div className="relative mx-auto mt-6 h-[52vh] max-w-4xl">
              {C.memories.map((m, i) => (
                <motion.button
                  key={m.id}
                  onClick={() => { setActiveMemory(m.id); sound.pop() }}
                  className="glass absolute rounded-2xl p-4 text-left"
                  style={{ width: 190, left: `${8 + i * 17}%`, top: `${(i % 2) * 38 + 6}%`, zIndex: activeMemory === m.id ? 30 : 10 }}
                  animate={reduced ? {} : { y: [0, -12, 0], rotate: [0, i % 2 ? 2 : -2, 0] }}
                  transition={{ duration: 5 + i, repeat: Infinity, ease: 'easeInOut' }}
                  whileHover={{ scale: 1.07 }}>
                  <div className="text-3xl">{m.emoji}</div>
                  <div className="mt-1 text-sm font-medium text-warmwhite">{m.title}</div>
                  <div className="text-[11px] text-white/50">{m.date}</div>
                </motion.button>
              ))}
              {/* memory hearts row */}
              <div className="absolute -bottom-2 left-0 right-0 flex flex-wrap justify-center gap-2">
                {C.memoryHearts.map((t, i) => (
                  <motion.span key={i} className="glass rounded-full px-3 py-1 text-xs text-rosepink"
                    animate={reduced ? {} : { y: [0, -8, 0] }} transition={{ duration: 3 + i * 0.5, repeat: Infinity }}>
                    ❤️ {t}
                  </motion.span>
                ))}
              </div>
            </div>
            <div className="mt-4 text-center">
              <GlassButton onClick={() => go('whyyou')}>Why you? →</GlassButton>
            </div>
            <AnimatePresence>
              {activeMemory && (
                <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-md"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveMemory(null)}>
                  {C.memories.filter((m) => m.id === activeMemory).map((m) => (
                    <motion.div key={m.id} initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }}
                      className="glass max-w-md rounded-3xl p-8 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="text-5xl">{m.emoji}</div>
                      <h3 className="font-serif-cine mt-3 text-3xl italic">{m.title}</h3>
                      <p className="mt-1 text-xs uppercase tracking-[0.3em] text-gold">{m.date} · {m.place}</p>
                      <p className="mt-4 text-warmwhite/90">{m.text}</p>
                      <p className="font-script mt-4 text-3xl text-rosepink">{m.message}</p>
                      <button onClick={() => setActiveMemory(null)} className="mt-6 text-xs uppercase tracking-[0.3em] text-white/60">let it float back ✨</button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── 7. WHY YOU ── */}
        {scene === 'whyyou' && (
          <motion.div key="whyyou" className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="font-serif-cine text-xl italic text-white/70">{C.whyYou.intro1}</p>
            <p className="font-script text-6xl text-rosepink text-glow-pink md:text-8xl">{C.whyYou.intro2}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.3em] text-white/50">touch a spark ({foundReasons.length}/{C.whyYou.reasons.length})</p>
            <div className="relative mt-6 flex h-56 w-full max-w-2xl flex-wrap items-center justify-center gap-3">
              {C.whyYou.reasons.map((r, i) => {
                const found = foundReasons.includes(i)
                return (
                  <motion.button
                    key={i}
                    onClick={() => { if (!found) { setFoundReasons((f) => [...f, i]); sound.pop() } }}
                    className={`rounded-full px-4 py-2 text-sm ${found ? 'glass text-warmwhite' : 'bg-white/5 text-white/60'}`}
                    animate={found ? { scale: 1 } : { scale: [1, 1.25, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2 + (i % 4) * 0.4, repeat: found ? 0 : Infinity }}
                    whileHover={{ scale: 1.1 }}>
                    {found ? `💗 ${r}` : '✨'}
                  </motion.button>
                )
              })}
            </div>
            {foundReasons.length >= 4 && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="mt-2 flex flex-col items-center gap-4">
                <motion.div className="text-7xl" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.6, repeat: Infinity }}
                  style={{ filter: 'drop-shadow(0 0 30px #ff2e63)' }}>❤️</motion.div>
                <p className="font-serif-cine italic text-white/70">{C.whyYou.gathered}</p>
                <GlassButton onClick={() => go('letter')}>I wrote you something ✉️</GlassButton>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── 8. LETTER ── */}
        {scene === 'letter' && (
          <motion.div key="letter" className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {!envelopeOpen ? (
              <div className="flex flex-col items-center gap-6 text-center">
                <p className="font-serif-cine text-xl italic md:text-2xl">{C.letter.pre1}</p>
                <p className="font-serif-cine text-xl italic text-rosepink md:text-2xl">{C.letter.pre2}</p>
                <motion.button onClick={() => { setEnvelopeOpen(true); sound.envelope() }}
                  whileHover={{ scale: 1.06, rotate: -2 }} whileTap={{ scale: 0.95 }}
                  className="glass glow-btn rounded-2xl px-12 py-10 text-6xl" aria-label="Open envelope">
                  ✉️
                  <span className="mt-2 block text-xs uppercase tracking-[0.3em] text-white/60">touch to open</span>
                </motion.button>
              </div>
            ) : (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="glass max-h-[62vh] w-full max-w-xl overflow-y-auto rounded-3xl p-8">
                <p className="font-script text-4xl text-gold">{C.letter.greeting}</p>
                <p className="font-script mb-4 text-2xl text-white/60">for {C.partnerName},</p>
                <div className="font-serif-cine min-h-[180px] text-lg italic leading-relaxed text-warmwhite/95">
                  {C.letter.lines.slice(0, letterLines).map((l, i) =>
                    l === '' ? <br key={i} /> : <motion.p key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{l}</motion.p>,
                  )}
                  {letterLines < C.letter.lines.length && <span className="animate-pulse text-rosepink">▍</span>}
                </div>
                <p className="font-script mt-4 text-right text-3xl text-rosepink">{C.letter.signature}, {C.loverName}</p>
                {letterLines >= C.letter.lines.length && (
                  <div className="mt-6 text-center">
                    <GlassButton onClick={() => go('night')}>Look up at the sky 🌙</GlassButton>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── 9. NIGHT SKY ── */}
        {scene === 'night' && (
          <motion.div key="night" className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="absolute right-[12%] top-[12%] text-7xl"
              style={{ filter: 'drop-shadow(0 0 40px #fff5c9)' }}
              animate={reduced ? {} : { y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity }}>🌙</motion.div>
            <motion.div initial={{ y: 120, opacity: 0 }} animate={{ y: -40, opacity: 1 }} transition={{ duration: reduced ? 1 : 6, ease: 'easeOut' }}
              className="text-6xl" style={{ filter: 'drop-shadow(0 0 26px #ff5d8f)' }}>❤️</motion.div>
            <p className="font-serif-cine mt-6 max-w-2xl text-2xl italic md:text-4xl">{C.nightSky.line1}</p>
            <p className="font-serif-cine mt-2 max-w-2xl text-2xl italic text-rosepink md:text-4xl">{C.nightSky.line2}</p>
            <div className="mt-8"><GlassButton onClick={() => go('heartbeat')}>Come closer…</GlassButton></div>
          </motion.div>
        )}

        {/* ── 10. HEARTBEAT ── */}
        {scene === 'heartbeat' && (
          <motion.div key="heartbeat" className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ background: `radial-gradient(circle, rgba(201,24,74,${0.12 + holdPower * 0.3}) 0%, transparent 65%)` }}>
            <p className="font-serif-cine text-xl italic text-white/70">{C.heartbeat.prompt}</p>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">press & hold — mouse or touch</p>
            <motion.button
              onPointerDown={() => setHolding(true)} onPointerUp={() => setHolding(false)} onPointerLeave={() => setHolding(false)}
              className="no-select my-8 touch-none text-[9rem] leading-none md:text-[12rem]"
              animate={{ scale: 1 + holdPower * 0.35 + (holding ? 0.06 * Math.sin(Date.now() / 120) : 0) }}
              style={{ filter: `drop-shadow(0 0 ${20 + holdPower * 60}px #ff2e63)` }}
              aria-label="Hold my heart">
              ❤️
            </motion.button>
            <div className="h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-gradient-to-r from-crimson to-rosepink" style={{ width: `${holdPower * 100}%` }} />
            </div>
            {heartRevealed && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex flex-col items-center gap-4">
                <p className="font-serif-cine text-2xl italic">{C.heartbeat.reveal1}</p>
                <p className="font-serif-cine text-xl italic text-rosepink">{C.heartbeat.reveal2}</p>
                <GlassButton onClick={() => go('journey')}>Where does this go? →</GlassButton>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── 11. JOURNEY ── */}
        {scene === 'journey' && (
          <JourneyScene onDone={() => go('confession')} />
        )}

        {/* ── 12. CONFESSION ── */}
        {scene === 'confession' && (
          <motion.div key="confession" className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 px-6 text-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 120 }}
              className="text-6xl" style={{ filter: 'drop-shadow(0 0 30px #ff2e63)' }}>💗</motion.div>
            <motion.h1 initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8, duration: 1.2 }}
              className="font-serif-cine mt-6 text-6xl font-semibold tracking-wide text-warmwhite text-glow-pink md:text-9xl">
              {C.confession.big}
            </motion.h1>
            <div className="mt-6 space-y-1">
              {C.confession.lines.map((l, i) => (
                <motion.p key={l} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6 + i * 0.7 }}
                  className="font-serif-cine text-xl italic text-rosepink md:text-2xl">{l}</motion.p>
              ))}
            </div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4.5 }} className="mt-8">
              <GlassButton onClick={() => { setStormPhase(0); go('storm') }}>Release it all 💥</GlassButton>
            </motion.div>
          </motion.div>
        )}

        {/* ── 13. STORM ── */}
        {scene === 'storm' && (
          <StormScene phase={stormPhase} setPhase={setStormPhase} onDone={() => go('finale')} />
        )}

        {/* ── 14. FINALE ── */}
        {scene === 'finale' && (
          <motion.div key="finale" className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-y-auto px-6 text-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="absolute inset-x-0 bottom-[10%] top-[30%] opacity-60"><HeartTreeCanvas growth={1} bloom={0.7} windAmp={0.7} /></div>
            <div className="relative z-10 flex max-h-full flex-col items-center gap-4 overflow-y-auto py-10">
              <p className="font-serif-cine text-xl italic md:text-2xl">{C.finale.line1}</p>
              <p className="font-serif-cine text-xl italic text-rosepink md:text-2xl">{C.finale.line2}</p>
              <p className="mt-4 text-2xl tracking-[0.3em]">{C.finale.end}</p>
              <p className="font-script text-3xl text-white/60">{C.finale.endless}</p>
              <div className="mt-4 flex flex-col items-center gap-3">
                <GlassButton onClick={() => {
                  moistureRef.current = 0; advancingRef.current = false
                  setWaters(0); setGrowth(0.02); setMoisture(0); setBloom(0); setSoilDark(0)
                  setFoundReasons([]); setEnvelopeOpen(false); setHeartRevealed(false); setHoldPower(0)
                  setSeedLanded(false); setStormPhase(0); setActiveMemory(null); go('opening'); setOpenStep(0)
                }}>↺ {C.finale.replay}</GlassButton>
                <p className="text-[11px] uppercase tracking-[0.35em] text-white/40">{C.loverName} ❤️ {C.partnerName} · {C.relationshipDate}</p>
                <Guestbook />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function JourneyScene({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const reduced = useReducedMotion()
  useEffect(() => {
    if (step >= C.finalJourney.length) {
      const t = setTimeout(onDone, 1200)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setStep((s) => s + 1), reduced ? 900 : 2200)
    return () => clearTimeout(t)
  }, [step, onDone, reduced])
  return (
    <motion.div key="journey" className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {/* orbiting echoes */}
      {!reduced && ['🌸', '💗', '✨', '📸', '🌙', '❤️'].map((e, i) => (
        <motion.span key={i} className="absolute text-3xl opacity-70"
          animate={{ rotate: 360 }} transition={{ duration: 14 + i * 3, repeat: Infinity, ease: 'linear' }}
          style={{ width: 260 + i * 40, height: 260 + i * 40 }}>
          <span className="absolute -top-4 left-1/2">{e}</span>
        </motion.span>
      ))}
      <div className="space-y-4">
        {C.finalJourney.slice(0, step).map((l) => (
          <motion.p key={l} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="font-serif-cine text-2xl italic text-warmwhite/90 md:text-4xl">{l}</motion.p>
        ))}
      </div>
    </motion.div>
  )
}

function StormScene({ phase, setPhase, onDone }: { phase: number; setPhase: (n: number) => void; onDone: () => void }) {
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1800)
    const t2 = setTimeout(() => setPhase(2), 3600)
    const t3 = setTimeout(() => setPhase(3), 5400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [setPhase])
  return (
    <motion.div key="storm" className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <AnimatePresence mode="wait">
        {phase === 0 && (
          <motion.p key="p0" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.4 }}
            className="font-serif-cine text-4xl md:text-6xl">YOU <span className="text-crimson">+</span> ME</motion.p>
        )}
        {phase === 1 && (
          <motion.p key="p1" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1.3 }} exit={{ opacity: 0 }}
            className="font-serif-cine text-7xl text-gold md:text-8xl">∞</motion.p>
        )}
        {phase >= 2 && (
          <motion.div key="p2" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6">
            <motion.div className="text-8xl md:text-9xl" animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
              style={{ filter: 'drop-shadow(0 0 50px #ff2e63)' }}>❤️</motion.div>
            {phase >= 3 && (
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
                <GlassButton onClick={onDone}>Toward the horizon →</GlassButton>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
