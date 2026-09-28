import { motion } from 'framer-motion'
import type { Site } from '../data/sites'
import { ThumbCanvas } from './ThumbCanvas'

interface Props {
  site: Site
  liked: boolean
  onLike: (id: string) => void
  onOpen: (site: Site) => void
  index: number
}

export function SiteCard({ site, liked, onLike, onOpen, index }: Props) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay: (index % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-card"
    >
      <button
        onClick={() => onOpen(site)}
        className="thumb-zoom relative block aspect-[4/3] w-full overflow-hidden text-left"
        aria-label={`Open ${site.title}`}
        data-hover
      >
        <ThumbCanvas variant={site.variant} hue={site.hue} title={site.title} />
        <span className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-white backdrop-blur">
          {site.category}
        </span>
        {site.badge && (
          <span className="absolute right-3 top-3 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
            {site.badge}
          </span>
        )}
      </button>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-semibold leading-tight">
            <button onClick={() => onOpen(site)} className="text-left hover:text-accent" data-hover>
              {site.title}
            </button>
          </h3>
          <LikeButton liked={liked} count={site.likes} onClick={() => onLike(site.id)} label={site.title} />
        </div>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted">{site.description}</p>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2 text-[11px] font-medium">
          {site.tech.map((t) => (
            <span key={t} className="rounded-full border border-line px-2.5 py-0.5 text-muted">
              {t}
            </span>
          ))}
          <span className="ml-auto tabular-nums text-muted">
            {site.style} · {site.year}
          </span>
        </div>
      </div>
    </motion.article>
  )
}

export function LikeButton({
  liked,
  count,
  onClick,
  label,
}: {
  liked: boolean
  count: number
  onClick: () => void
  label: string
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={onClick}
      aria-pressed={liked}
      aria-label={liked ? `Unlike ${label}` : `Like ${label}`}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors ${
        liked ? 'border-accent bg-accent text-white' : 'border-line bg-paper text-ink hover:border-accent hover:text-accent'
      }`}
    >
      <motion.svg
        key={liked ? 'on' : 'off'}
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill={liked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2.4"
        aria-hidden
      >
        <path d="M12 21s-7.5-4.9-10-9.3C.4 8.6 2.3 5 5.7 5c2 0 3.4 1.1 4.3 2.6h4c.9-1.5 2.3-2.6 4.3-2.6 3.4 0 5.3 3.6 3.7 6.7C19.5 16.1 12 21 12 21z" transform="scale(0.92) translate(1,0)" />
      </motion.svg>
      {count.toLocaleString()}
    </motion.button>
  )
}
