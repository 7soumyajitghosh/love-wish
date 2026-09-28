import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../../utils/helpers'

type P = {
  x: number; y: number; r: number; vy: number; vx: number;
  tw: number; ts: number; hue: number; depth: number;
}

/** Global living background: stars, dust, fog drift, wind. Always alive. */
export default function Starfield({ intensity = 1, wind = 1 }: { intensity?: number; wind?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    let w = 0, h = 0, raf = 0
    const reduced = prefersReducedMotion()
    const DPR = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      w = window.innerWidth; h = window.innerHeight
      canvas.width = w * DPR; canvas.height = h * DPR
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px'
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const N = reduced ? 40 : Math.floor(140 * intensity)
    const parts: P[] = Array.from({ length: N }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 0.5 + Math.random() * 2.2,
      vy: -0.05 - Math.random() * 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      tw: Math.random() * Math.PI * 2,
      ts: 0.005 + Math.random() * 0.02,
      hue: Math.random() < 0.7 ? 340 + Math.random() * 20 : 35 + Math.random() * 15,
      depth: 0.3 + Math.random() * 0.7,
    }))

    let t = 0
    const draw = () => {
      t += 0.01
      ctx.clearRect(0, 0, w, h)

      // deep gradient
      const g = ctx.createRadialGradient(w / 2, h * 0.75, 0, w / 2, h * 0.55, Math.max(w, h) * 0.9)
      g.addColorStop(0, '#1a0714')
      g.addColorStop(0.45, '#0a0410')
      g.addColorStop(1, '#050308')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)

      // distant glow horizon
      const hg = ctx.createRadialGradient(w / 2, h * 1.05, 0, w / 2, h * 1.05, w * 0.6)
      hg.addColorStop(0, 'rgba(201,24,74,0.16)')
      hg.addColorStop(1, 'rgba(201,24,74,0)')
      ctx.fillStyle = hg
      ctx.fillRect(0, 0, w, h)

      // drifting fog bands
      if (!reduced) {
        ctx.save()
        ctx.globalAlpha = 0.05
        for (let i = 0; i < 3; i++) {
          const fy = h * (0.3 + i * 0.22) + Math.sin(t * (0.6 + i * 0.2) + i * 2) * 18
          const fg = ctx.createLinearGradient(0, fy - 60, 0, fy + 60)
          fg.addColorStop(0, 'rgba(255,143,163,0)')
          fg.addColorStop(0.5, 'rgba(255,143,163,0.5)')
          fg.addColorStop(1, 'rgba(255,143,163,0)')
          ctx.fillStyle = fg
          ctx.fillRect(0, fy - 60, w, 120)
        }
        ctx.restore()
      }

      for (const p of parts) {
        p.tw += p.ts
        p.x += (p.vx + wind * 0.25) * p.depth
        p.y += p.vy * p.depth
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w }
        if (p.x > w + 10) p.x = -10
        if (p.x < -10) p.x = w + 10
        const a = 0.25 + Math.abs(Math.sin(p.tw)) * 0.65
        ctx.beginPath()
        ctx.fillStyle = `hsla(${p.hue},85%,75%,${a})`
        ctx.shadowColor = `hsla(${p.hue},90%,65%,0.9)`
        ctx.shadowBlur = 8 * p.depth
        ctx.arc(p.x, p.y, p.r * p.depth, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [intensity, wind])

  return <canvas ref={ref} className="fixed inset-0 -z-10" aria-hidden />
}
