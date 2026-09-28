import { useEffect, useRef } from 'react'
import type { ThumbVariant } from '../data/sites'

interface Props {
  variant: ThumbVariant
  hue: number
  title: string
  animated?: boolean
}

// Generative animated thumbnail — one living canvas per motion archetype.
export function ThumbCanvas({ variant, hue, title, animated = true }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const state = useRef({ visible: true, raf: 0 })

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = 480
    const H = 360
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = W * dpr
    canvas.height = H * dpr

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const shouldAnimate = animated && !reduceMotion

    const io = new IntersectionObserver(
      (entries) => {
        state.current.visible = entries[0]?.isIntersecting ?? true
      },
      { threshold: 0.05 },
    )
    io.observe(canvas)

    const bg = (t: number) => {
      const g = ctx.createLinearGradient(0, 0, W, H)
      g.addColorStop(0, `hsl(${hue}, 45%, 12%)`)
      g.addColorStop(1, `hsl(${(hue + 40) % 360}, 55%, 22%)`)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
      // faint drifting glow
      const gx = W / 2 + Math.cos(t * 0.4) * 60
      const gy = H / 2 + Math.sin(t * 0.3) * 50
      const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, 220)
      glow.addColorStop(0, `hsla(${(hue + 60) % 360}, 90%, 60%, 0.35)`)
      glow.addColorStop(1, 'transparent')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, W, H)
    }

    const stroke = (light: number, alpha: number, width: number) => {
      ctx.strokeStyle = `hsla(${hue}, 85%, ${light}%, ${alpha})`
      ctx.lineWidth = width
    }

    const draw = (t: number) => {
      ctx.save()
      ctx.scale(dpr, dpr)
      bg(t)
      ctx.lineCap = 'round'

      if (variant === 'waves') {
        for (let row = 0; row < 7; row++) {
          ctx.beginPath()
          stroke(62 + row * 3, 0.85, 2.5)
          for (let x = 0; x <= W; x += 6) {
            const y = H / 2 + Math.sin(x * 0.02 + t * (1 + row * 0.12) + row) * (28 + row * 7)
            if (x === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.stroke()
        }
      } else if (variant === 'orbs') {
        for (let i = 0; i < 9; i++) {
          const ox = W / 2 + Math.cos(t * (0.3 + i * 0.07) + i * 2.1) * (60 + i * 14)
          const oy = H / 2 + Math.sin(t * (0.4 + i * 0.05) + i * 1.3) * (45 + i * 10)
          const r = 12 + ((i * 37) % 26)
          const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, r)
          g.addColorStop(0, `hsla(${(hue + i * 14) % 360}, 90%, 68%, 0.9)`)
          g.addColorStop(1, 'transparent')
          ctx.fillStyle = g
          ctx.beginPath()
          ctx.arc(ox, oy, r, 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (variant === 'grid') {
        const step = 34
        for (let gx = step / 2; gx < W; gx += step) {
          for (let gy = step / 2; gy < H; gy += step) {
            const d = Math.hypot(gx - W / 2, gy - H / 2)
            const pulse = (Math.sin(d * 0.03 - t * 2.4) + 1) / 2
            ctx.fillStyle = `hsla(${hue}, 80%, ${55 + pulse * 20}%, ${0.25 + pulse * 0.65})`
            ctx.beginPath()
            ctx.arc(gx, gy, 1.5 + pulse * 3.4, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      } else if (variant === 'bars') {
        const n = 28
        const bw = W / n
        for (let i = 0; i < n; i++) {
          const v = (Math.sin(i * 0.7 + t * 3) * 0.5 + 0.5) * (Math.sin(i * 0.23 - t * 1.7) * 0.5 + 0.5)
          const h = 20 + v * (H - 60)
          ctx.fillStyle = `hsla(${(hue + i * 4) % 360}, 85%, 60%, 0.9)`
          const x = i * bw + bw * 0.2
          ctx.beginPath()
          ctx.roundRect(x, H - h - 14, bw * 0.6, h, 4)
          ctx.fill()
        }
      } else if (variant === 'dots') {
        // deterministic pseudo-random field (seeded by index, animated by time)
        for (let i = 0; i < 130; i++) {
          const px = ((i * 97) % W + t * (8 + ((i * 13) % 22))) % W
          const py = ((i * 61) % H + Math.sin(t + i) * 8 + H) % H
          const tw = (Math.sin(t * 2 + i * 1.7) + 1) / 2
          ctx.fillStyle = `hsla(${hue}, 70%, ${60 + tw * 25}%, ${0.3 + tw * 0.6})`
          ctx.beginPath()
          ctx.arc(px, py, 0.8 + tw * 2.2, 0, Math.PI * 2)
          ctx.fill()
        }
      } else {
        // rings
        for (let i = 0; i < 6; i++) {
          ctx.beginPath()
          stroke(60 + i * 4, 0.8, 2)
          ctx.setLineDash([10 + i * 6, 8 + i * 4])
          ctx.lineDashOffset = -t * (20 + i * 12)
          ctx.arc(W / 2, H / 2, 26 + i * 26, 0, Math.PI * 2)
          ctx.stroke()
          ctx.setLineDash([])
        }
      }
      ctx.restore()
    }

    if (!shouldAnimate) {
      draw(1.2)
      return () => io.disconnect()
    }

    const start = performance.now()
    const frame = (now: number) => {
      if (state.current.visible) draw((now - start) / 1000)
      state.current.raf = requestAnimationFrame(frame)
    }
    state.current.raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(state.current.raf)
      io.disconnect()
    }
  }, [variant, hue, animated])

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={`Animated preview for ${title}`}
      className="h-full w-full"
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}
