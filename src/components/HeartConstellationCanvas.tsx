import { useEffect, useRef } from 'react'
import { mulberry32, drawHeart, prefersReducedMotion } from '../utils/helpers'

export type LanternPos = { x: number; y: number }

type Props = {
  /** 0..1 — awakening progress across the six stages */
  growth: number
  /** 0..1 — ignition aura once fully awake */
  bloom?: number
  /** lantern position in 0..1 coords (interactive mode) */
  lantern?: LanternPos | null
  gathering?: boolean
  interactive?: boolean
  onCollect?: () => void
}

type Star = { x: number; y: number; birth: number; size: number; ph: number; bright: boolean }
type Mote = { x: number; y: number; vx: number; vy: number; r: number; ph: number }

// Classic heart curve, lobes up (canvas y grows downward, so flip).
function heartCurve(n: number) {
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2
    pts.push({
      x: 16 * Math.pow(Math.sin(t), 3),
      y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
    })
  }
  return pts
}

/**
 * The Heart Constellation — a sleeping pattern of stars in the shape of a
 * heart, woken progressively by gathered starlight. Replaces the Heart Tree:
 *  First Spark → Outline → Inner Weave → Full Weave → Heartbeat Core → Ignition.
 */
export default function HeartConstellationCanvas({
  growth, bloom = 0, lantern = null, gathering = false, interactive = false, onCollect,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const gRef = useRef(growth)
  const bRef = useRef(bloom)
  const lRef = useRef(lantern)
  const gatherRef = useRef(gathering)
  const interactRef = useRef(interactive)
  gRef.current = growth
  bRef.current = bloom
  lRef.current = lantern
  gatherRef.current = gathering
  interactRef.current = interactive
  const cbRef = useRef(onCollect)
  cbRef.current = onCollect

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    const reduced = prefersReducedMotion()
    const DPR = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0, h = 0, raf = 0, t = 0
    const rnd = mulberry32(21)

    const N = 26
    const curve = heartCurve(N)
    const stars: Star[] = curve.map((p, i) => ({
      x: p.x, y: p.y,
      birth: i === 0 ? 0.04 : 0.1 + (i / (N - 1)) * 0.72,
      size: 1.6 + rnd() * 1.8 + (i % 6 === 0 ? 1.4 : 0),
      ph: rnd() * Math.PI * 2,
      bright: i % 6 === 0,
    }))

    type Ember = { x: number; y: number; vy: number; r: number; ph: number }
    const embers: Ember[] = reduced ? [] : Array.from({ length: 34 }, () => ({
      x: Math.random(), y: Math.random(), vy: 0.0008 + Math.random() * 0.002,
      r: 1 + Math.random() * 2, ph: Math.random() * 7,
    }))

    const motes: Mote[] = Array.from({ length: reduced ? 12 : 44 }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0009, vy: (Math.random() - 0.5) * 0.0009,
      r: 1 + Math.random() * 2.2, ph: Math.random() * 7,
    }))

    const resize = () => {
      const r = canvas.parentElement!.getBoundingClientRect()
      w = r.width; h = r.height
      canvas.width = w * DPR; canvas.height = h * DPR
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px'
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3))

    const frame = () => {
      t += 0.016
      const g = gRef.current
      const bl = bRef.current
      ctx.clearRect(0, 0, w, h)
      const cx = w / 2
      const cy = h * 0.42
      const S = Math.min(w, h) * 0.30
      const px = (i: number) => cx + (stars[i].x / 16) * S
      const py = (i: number) => cy + (stars[i].y / 16) * S * 0.95
      const lit = (i: number) => ease((g - stars[i].birth) / 0.1)

      // faint sleeping guide while mostly dark
      if (g < 0.5 && !reduced) {
        ctx.save()
        ctx.globalAlpha = 0.05 + 0.02 * Math.sin(t * 0.8)
        ctx.strokeStyle = '#b48cff'
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let i = 0; i <= N; i++) {
          const k = curve[i % N]
          const X = cx + (k.x / 16) * S, Y = cy + (k.y / 16) * S * 0.95
          if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y)
        }
        ctx.stroke()
        ctx.restore()
      }

      // web links between lit neighbors
      ctx.save()
      ctx.lineWidth = 1
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N
        const a = Math.min(lit(i), lit(j))
        if (a <= 0) continue
        ctx.strokeStyle = `rgba(255,143,163,${0.28 * a})`
        ctx.shadowColor = 'rgba(255,80,130,0.6)'
        ctx.shadowBlur = 6
        ctx.beginPath()
        ctx.moveTo(px(i), py(i))
        ctx.lineTo(px(j), py(j))
        ctx.stroke()
      }
      ctx.restore()

      // spokes from the core once the weave begins
      if (g > 0.5) {
        ctx.save()
        for (let i = 0; i < N; i += 3) {
          const a = lit(i) * 0.14
          if (a <= 0) continue
          ctx.strokeStyle = `rgba(232,178,106,${a})`
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.lineTo(px(i), py(i))
          ctx.stroke()
        }
        ctx.restore()
      }

      // stars
      for (let i = 0; i < N; i++) {
        const L = lit(i)
        if (L <= 0) continue
        const s = stars[i]
        const tw = 0.55 + 0.45 * Math.sin(t * 2.2 + s.ph)
        ctx.save()
        ctx.globalAlpha = L * (0.5 + 0.5 * tw)
        ctx.fillStyle = s.bright ? '#ffe9c9' : '#ffc9d8'
        ctx.shadowColor = s.bright ? '#e8b26a' : '#ff2e63'
        ctx.shadowBlur = 10 + bl * 26 + (s.bright ? 10 : 0)
        ctx.beginPath()
        ctx.arc(px(i), py(i), s.size * (0.6 + 0.4 * L) * (1 + bl * 0.3), 0, Math.PI * 2)
        ctx.fill()
        if (s.bright && L > 0.7) {
          ctx.shadowBlur = 0
          ctx.strokeStyle = 'rgba(255,240,220,0.7)'
          ctx.lineWidth = 1
          const R = s.size * 3.2
          ctx.beginPath()
          ctx.moveTo(px(i) - R, py(i)); ctx.lineTo(px(i) + R, py(i))
          ctx.moveTo(px(i), py(i) - R); ctx.lineTo(px(i), py(i) + R)
          ctx.stroke()
        }
        ctx.restore()
      }

      // heartbeat core
      const coreT = ease((g - 0.6) / 0.22)
      if (coreT > 0) {
        const beat = 1 + 0.12 * Math.sin(t * 3.2) + bl * 0.2
        const R = (10 + bl * 26) * coreT * beat
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 3)
        grad.addColorStop(0, `rgba(255,120,160,${0.75 * coreT})`)
        grad.addColorStop(0.4, `rgba(201,24,74,${0.3 * coreT})`)
        grad.addColorStop(1, 'rgba(201,24,74,0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(cx, cy, R * 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.save()
        ctx.globalAlpha = coreT
        ctx.fillStyle = '#ffd6dd'
        ctx.shadowColor = '#ff2e63'
        ctx.shadowBlur = 18 + bl * 30
        drawHeart(ctx, cx, cy - R * 0.4, R * 1.5 * beat, 0)
        ctx.restore()
      }

      // ignition aura
      if (bl > 0) {
        const ag = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.55)
        ag.addColorStop(0, `rgba(255,110,150,${0.2 * bl})`)
        ag.addColorStop(1, 'rgba(255,110,150,0)')
        ctx.fillStyle = ag
        ctx.fillRect(0, 0, w, h)
      }

      // rising embers once ignited
      for (const e of embers) {
        if (bl <= 0.05) break
        e.y -= e.vy * (1 + bl * 2)
        e.x += Math.sin(t * 1.4 + e.ph) * 0.0005
        if (e.y < -0.03) { e.y = 1.03; e.x = 0.2 + Math.random() * 0.6 }
        ctx.fillStyle = `rgba(255,190,200,${0.5 * bl})`
        ctx.beginPath()
        ctx.arc(e.x * w, e.y * h, e.r, 0, Math.PI * 2)
        ctx.fill()
      }

      // drifting star-motes, attracted to the lantern while gathering
      const L = lRef.current
      const active = interactRef.current && gatherRef.current && L && !reduced
      for (const m of motes) {
        if (!reduced) {
          m.x += m.vx + Math.sin(t * 0.9 + m.ph) * 0.0002
          m.y += m.vy
          if (m.x < -0.03) m.x = 1.03
          if (m.x > 1.03) m.x = -0.03
          if (m.y < -0.03) m.y = 1.03
          if (m.y > 1.03) m.y = -0.03
        }
        let collected = false
        if (active && L) {
          const dx = L.x - m.x, dy = L.y - m.y
          const d2 = dx * dx + dy * dy
          if (d2 < 0.0625) {
            const d = Math.max(0.008, Math.sqrt(d2))
            m.x += (dx / d) * 0.012
            m.y += (dy / d) * 0.012
            if (d2 < 0.00045) {
              collected = true
              m.x = Math.random()
              m.y = Math.random()
              m.vx = (Math.random() - 0.5) * 0.0009
              m.vy = (Math.random() - 0.5) * 0.0009
              cbRef.current?.()
            }
          }
        }
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.8 + m.ph))
        ctx.fillStyle = collected
          ? 'rgba(255,255,255,0.95)'
          : `rgba(200,180,255,${0.35 * tw + 0.15})`
        ctx.beginPath()
        ctx.arc(m.x * w, m.y * h, collected ? m.r + 2 : m.r, 0, Math.PI * 2)
        ctx.fill()
      }

      // lantern glow marker
      if (L && interactRef.current) {
        const lx = L.x * w, ly = L.y * h
        const gg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 60)
        gg.addColorStop(0, `rgba(255,230,170,${gatherRef.current ? 0.35 : 0.18})`)
        gg.addColorStop(1, 'rgba(255,230,170,0)')
        ctx.fillStyle = gg
        ctx.beginPath()
        ctx.arc(lx, ly, 60, 0, Math.PI * 2)
        ctx.fill()
      }

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={ref} className="h-full w-full" />
}
