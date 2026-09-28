import { useEffect, useState } from 'react'

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const fn = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener?.('change', fn)
    return () => mq.removeEventListener?.('change', fn)
  }, [])
  return reduced
}

export function useCursorGlow() {
  useEffect(() => {
    const el = document.createElement('div')
    el.className = 'cursor-glow'
    el.style.left = '-500px'
    document.body.appendChild(el)
    let raf = 0
    let tx = -500, ty = -500, x = tx, y = ty
    const onMove = (e: PointerEvent) => { tx = e.clientX; ty = e.clientY }
    window.addEventListener('pointermove', onMove)
    const loop = () => {
      x += (tx - x) * 0.08
      y += (ty - y) * 0.08
      el.style.left = x + 'px'
      el.style.top = y + 'px'
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      el.remove()
    }
  }, [])
}
