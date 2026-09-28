import { motion } from 'framer-motion'
import type { Site } from '../data/sites'

const line = {
  hidden: { y: '110%' },
  show: (i: number) => ({
    y: '0%',
    transition: { delay: 0.15 + i * 0.12, duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
  }),
}

export function Hero({ count, totalLikes }: { count: number; totalLikes: number }) {
  return (
    <header className="relative overflow-hidden border-b border-line">
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-14 md:pt-20">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-card px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted"
        >
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
          A showcase of websites in motion
        </motion.p>
        <h1 className="font-display text-[13vw] font-bold leading-[0.95] tracking-tight md:text-[7.5rem]">
          {['Websites', 'that move', 'people.'].map((text, i) => (
            <span key={text} className="reveal-mask">
              <motion.span custom={i} variants={line} initial="hidden" animate="show">
                {i === 1 ? <em className="not-italic text-accent">{text}</em> : text}
              </motion.span>
            </span>
          ))}
        </h1>
        <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="max-w-xl text-base leading-relaxed text-muted md:text-lg"
          >
            KINETIC curates the web&apos;s most animated experiences — every entry ships with a living
            thumbnail. Browse the gallery, like what moves you, submit your own.
          </motion.p>
          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85, duration: 0.6 }}
            className="flex gap-8 font-display"
          >
            <Stat value={String(count)} label="sites" />
            <Stat value={totalLikes.toLocaleString()} label="likes" />
            <Stat value="60fps" label="thumbnails" />
          </motion.dl>
        </div>
      </div>
    </header>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="text-3xl font-bold">{value}</dd>
      <dd className="text-xs uppercase tracking-[0.2em] text-muted">{label}</dd>
    </div>
  )
}

export function Marquee({ items }: { items: Pick<Site, 'title' | 'hue'>[] }) {
  const row = [...items, ...items]
  return (
    <div className="overflow-hidden border-b border-line bg-coal py-3 text-paper" aria-hidden>
      <div className="animate-marquee flex w-max items-center gap-8 whitespace-nowrap font-display text-sm uppercase tracking-[0.25em]">
        {row.map((s, i) => (
          <span key={`${s.title}-${i}`} className="flex items-center gap-8">
            {s.title}
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: `hsl(${s.hue}, 85%, 60%)` }} />
          </span>
        ))}
      </div>
    </div>
  )
}
