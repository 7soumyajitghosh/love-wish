import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

// Animated intro: counter preloader that slides away when the gallery is ready.
export function Preloader({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(0)

  useEffect(() => {
    let v = 0
    const id = setInterval(() => {
      v = Math.min(100, v + 4 + Math.random() * 9)
      setN(Math.floor(v))
      if (v >= 100) {
        clearInterval(id)
        setTimeout(onDone, 350)
      }
    }, 70)
    return () => clearInterval(id)
  }, [onDone])

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ink text-paper"
      exit={{ y: '-100%' }}
      transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
      role="status"
      aria-label="Loading gallery"
    >
      <p className="font-display text-sm uppercase tracking-[0.4em] text-paper/60">Kinetic</p>
      <p className="font-display mt-2 text-8xl font-bold tabular-nums">{n}</p>
      <div className="mt-4 h-px w-48 bg-paper/20">
        <div className="h-full bg-accent transition-all" style={{ width: `${n}%` }} />
      </div>
    </motion.div>
  )
}
