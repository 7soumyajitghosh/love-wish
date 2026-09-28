import { useEffect, useRef } from 'react'
import { mulberry32, drawHeart, prefersReducedMotion } from '../../utils/helpers'

type Branch = {
  x: number; y: number; angle: number; len: number; width: number;
  depth: number; birth: number; children: Branch[];
  leaf?: { x: number; y: number; s: number; ph: number; bright: boolean };
}

function buildTree(seed: number): { branches: Branch[]; roots: Branch[] } {
  const rnd = mulberry32(seed)
  const branches: Branch[] = []
  const roots: Branch[] = []

  const grow = (x: number, y: number, angle: number, len: number, width: number, depth: number, birth: number): Branch => {
    const b: Branch = { x, y, angle, len, width, depth, birth, children: [] }
    if (depth <= 0) {
      const ex = x + Math.cos(angle) * len
      const ey = y + Math.sin(angle) * len
      b.leaf = { x: ex, y: ey, s: 9 + rnd() * 12, ph: rnd() * Math.PI * 2, bright: rnd() < 0.12 }
      return b
    }
    const n = depth > 2 ? 2 + (rnd() < 0.5 ? 1 : 0) : 2
    for (let i = 0; i < n; i++) {
      const spread = 0.35 + rnd() * 0.5
      const dir = i === 0 ? -spread : spread + (rnd() - 0.5) * 0.3
      const nl = len * (0.62 + rnd() * 0.18)
      const ex = x + Math.cos(angle) * len
      const ey = y + Math.sin(angle) * len
      b.children.push(grow(ex, ey, angle + dir, nl, width * 0.66, depth - 1, birth + 0.06 + rnd() * 0.05))
    }
    // occasional middle shoot
    if (depth > 1 && rnd() < 0.4) {
      const ex = x + Math.cos(angle) * len
      const ey = y + Math.sin(angle) * len
      b.children.push(grow(ex, ey, angle + (rnd() - 0.5) * 0.4, len * 0.7, width * 0.6, depth - 1, birth + 0.08))
    }
    return b
  }

  // 3 main limbs for a heart-like silhouette
  const angles = [-Math.PI / 2 - 0.42, -Math.PI / 2, -Math.PI / 2 + 0.42]
  angles.forEach((a, i) => {
    branches.push(grow(0, 0, a, 86 - i * 6, 13, 4, 0.28 + i * 0.03))
  })

  for (let i = 0; i < 7; i++) {
    const a = Math.PI / 2 + (i / 6 - 0.5) * 1.6
    roots.push(grow(0, 0, a, 34 + rnd() * 26, 5, 2, 0.02 + i * 0.015))
  }
  return { branches, roots }
}

/**
 * Procedural Heart Tree. growth 0..1.
 * 0-0.15 roots, 0.15-0.32 trunk, 0.32-0.55 main branches,
 * 0.55-0.7 twigs, 0.7-0.85 buds, 0.85-1 heart leaves + bloom glow.
 */
export default function HeartTreeCanvas({
  growth, bloom = 0, windAmp = 1, onLeafCount,
}: { growth: number; bloom?: number; windAmp?: number; onLeafCount?: (n: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const gRef = useRef(growth)
  const bloomRef = useRef(bloom)
  gRef.current = growth
  bloomRef.current = bloom

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    const reduced = prefersReducedMotion()
    const DPR = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0, h = 0, raf = 0, t = 0
    const { branches, roots } = buildTree(7)

    const resize = () => {
      const r = canvas.parentElement!.getBoundingClientRect()
      w = r.width; h = r.height
      canvas.width = w * DPR; canvas.height = h * DPR
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px'
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    // floating pollen
    const pollen = Array.from({ length: reduced ? 0 : 50 }, () => ({
      x: Math.random(), y: Math.random(), r: 1 + Math.random() * 2.5,
      ph: Math.random() * 7, sp: 0.0004 + Math.random() * 0.0012,
    }))

    const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3))

    const drawBranch = (b: Branch, ox: number, oy: number, g: number, isRoot: boolean) => {
      const local = ease((g - b.birth) / 0.22)
      if (local <= 0) return
      const sway = reduced ? 0 : Math.sin(t * 1.4 + b.birth * 20 + oy * 0.01) * 0.02 * windAmp * b.depth
      const a = b.angle + sway
      const ex = ox + Math.cos(a) * b.len * local
      const ey = oy + Math.sin(a) * b.len * local
      ctx.strokeStyle = isRoot ? '#5b2a1e' : '#4a1c22'
      ctx.lineCap = 'round'
      ctx.lineWidth = Math.max(1, b.width * local)
      ctx.shadowColor = 'rgba(201,24,74,0.35)'
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.moveTo(ox, oy)
      const mx = ox + Math.cos(a + 0.18) * b.len * local * 0.5
      const my = oy + Math.sin(a + 0.18) * b.len * local * 0.5
      ctx.quadraticCurveTo(mx, my, ex, ey)
      ctx.stroke()
      ctx.shadowBlur = 0
      if (local < 1) return
      for (const c of b.children) drawBranch(c, ex, ey, g, isRoot)
      if (b.leaf && !isRoot) {
        const lt = ease((g - (b.birth + 0.16)) / 0.12)
        if (lt > 0) {
          const L = b.leaf
          const swayL = reduced ? 0 : Math.sin(t * 2 + L.ph) * 3 * windAmp
          const pulse = 1 + Math.sin(t * 3 + L.ph) * 0.08 + bloomRef.current * 0.25
          ctx.save()
          ctx.globalAlpha = lt
          ctx.fillStyle = L.bright ? '#ffd6dd' : '#ff5d8f'
          ctx.shadowColor = '#ff2e63'
          ctx.shadowBlur = 10 + bloomRef.current * 26 + (L.bright ? 14 : 0)
          drawHeart(ctx, ex + swayL, ey + Math.cos(t * 1.6 + L.ph) * 2, L.s * lt * pulse, Math.sin(t + L.ph) * 0.25)
          ctx.restore()
        }
      } else if (b.depth === 1 && b.children.length === 0) {
        // buds on twig tips
        const bt = ease((g - (b.birth + 0.08)) / 0.1)
        if (bt > 0) {
          ctx.save()
          ctx.globalAlpha = bt
          ctx.fillStyle = '#ffc2d1'
          ctx.shadowColor = '#ff8fa3'
          ctx.shadowBlur = 12
          ctx.beginPath()
          ctx.arc(ex, ey, 3.2 * bt + 1, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
      }
    }

    let leafReport = 0
    const frame = () => {
      t += 0.016
      const g = gRef.current
      const bl = bloomRef.current
      ctx.clearRect(0, 0, w, h)
      const groundY = h * 0.82
      const cx = w / 2

      // soil
      const sg = ctx.createRadialGradient(cx, groundY, 0, cx, groundY, Math.min(w, h) * 0.4)
      sg.addColorStop(0, 'rgba(90,40,30,0.85)')
      sg.addColorStop(0.5, 'rgba(40,18,22,0.7)')
      sg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = sg
      ctx.beginPath()
      ctx.ellipse(cx, groundY + 8, Math.min(w * 0.32, 220), 26, 0, 0, Math.PI * 2)
      ctx.fill()

      // grass blades
      if (!reduced) {
        ctx.strokeStyle = 'rgba(120,200,140,0.25)'
        ctx.lineWidth = 1.5
        for (let i = 0; i < 26; i++) {
          const gx = cx - 200 + i * 16 + Math.sin(i * 3.7) * 6
          const sway = Math.sin(t * 1.8 + i) * 4 * windAmp
          ctx.beginPath()
          ctx.moveTo(gx, groundY + 14)
          ctx.quadraticCurveTo(gx + sway, groundY - 8, gx + sway * 1.6, groundY - 14 - (i % 5) * 3)
          ctx.stroke()
        }
      }

      // trunk base (grows 0.15-0.32)
      const trunkT = ease((g - 0.12) / 0.2)
      if (trunkT > 0) {
        const th = 150 * (h / 600) * trunkT
        const grad = ctx.createLinearGradient(cx, groundY, cx, groundY - th)
        grad.addColorStop(0, '#3d1420')
        grad.addColorStop(1, '#6b2233')
        ctx.strokeStyle = grad
        ctx.lineCap = 'round'
        ctx.lineWidth = 16 * trunkT + 2
        ctx.shadowColor = 'rgba(201,24,74,0.4)'
        ctx.shadowBlur = 12
        const sway = reduced ? 0 : Math.sin(t * 1.2) * 3 * windAmp
        ctx.beginPath()
        ctx.moveTo(cx, groundY)
        ctx.quadraticCurveTo(cx + sway * 0.4, groundY - th * 0.6, cx + sway, groundY - th)
        ctx.stroke()
        ctx.shadowBlur = 0
        const topX = cx + sway, topY = groundY - th
        for (const b of branches) drawBranch(b, topX, topY, g, false)
      }
      // roots
      for (const r of roots) drawBranch(r, cx, groundY + 4, Math.min(1, g * 1.4), true)

      // bloom aura
      if (bl > 0) {
        const ag = ctx.createRadialGradient(cx, groundY - 160, 0, cx, groundY - 160, 260)
        ag.addColorStop(0, `rgba(255,90,130,${0.22 * bl})`)
        ag.addColorStop(1, 'rgba(255,90,130,0)')
        ctx.fillStyle = ag
        ctx.fillRect(0, 0, w, h)
      }

      // pollen
      for (const p of pollen) {
        p.y -= p.sp
        p.x += Math.sin(t + p.ph) * 0.0006 * windAmp
        if (p.y < -0.05) { p.y = 1.05; p.x = Math.random() }
        ctx.fillStyle = `rgba(255,200,210,${0.35 + Math.sin(t * 2 + p.ph) * 0.2})`
        ctx.beginPath()
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2)
        ctx.fill()
      }

      if (++leafReport % 60 === 0) onLeafCount?.(Math.floor(g * 220))
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [windAmp])

  return <canvas ref={ref} className="h-full w-full" />
}
