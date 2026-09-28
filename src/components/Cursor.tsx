import { useEffect, useState } from 'react'

export function Cursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 })
  const [hover, setHover] = useState(false)
  const [fine, setFine] = useState(false)

  useEffect(() => {
    setFine(window.matchMedia('(hover: hover) and (pointer: fine)').matches)
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    let raf = 0
    let target = { x: -100, y: -100 }
    let current = { x: -100, y: -100 }
    const onMove = (e: MouseEvent) => {
      target = { x: e.clientX, y: e.clientY }
      const el = document.elementFromPoint(e.clientX, e.clientY)
      setHover(!!el?.closest('a,button,[data-hover]'))
    }
    const loop = () => {
      current = { x: current.x + (target.x - current.x) * 0.2, y: current.y + (target.y - current.y) * 0.2 }
      setPos({ ...current })
      raf = requestAnimationFrame(loop)
    }
    window.addEventListener('mousemove', onMove)
    raf = requestAnimationFrame(loop)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  if (!fine) return null
  return (
    <>
      <div className="kinetic-cursor-dot" style={{ transform: `translate(${pos.x}px, ${pos.y}px) translate(-50%,-50%)` }} />
      <div
        className={`kinetic-cursor-ring${hover ? ' is-hover' : ''}`}
        style={{ transform: `translate(${pos.x}px, ${pos.y}px) translate(-50%,-50%)` }}
      />
    </>
  )
}
