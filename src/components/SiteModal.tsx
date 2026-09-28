import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Site } from '../data/sites'
import { ThumbCanvas } from './ThumbCanvas'
import { LikeButton } from './SiteCard'

interface Props {
  site: Site | null
  liked: boolean
  onLike: (id: string) => void
  onClose: () => void
}

export function SiteModal({ site, liked, onLike, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = site ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [site])

  return (
    <AnimatePresence>
      {site && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={site.title}
        >
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-t-3xl bg-paper sm:rounded-3xl"
          >
            <div className="relative aspect-[16/8] w-full overflow-hidden sm:rounded-t-3xl">
              <ThumbCanvas variant={site.variant} hue={site.hue} title={site.title} />
              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute right-4 top-4 rounded-full bg-black/55 px-4 py-1.5 text-sm font-medium text-white backdrop-blur hover:bg-black/75"
              >
                Close
              </button>
            </div>
            <div className="p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                <span className="rounded-full bg-ink px-3 py-1 text-paper">{site.category}</span>
                <span className="rounded-full border border-line px-3 py-1 text-muted">
                  {site.style} · {site.year}
                </span>
                {site.badge && <span className="rounded-full bg-accent px-3 py-1 text-white">{site.badge}</span>}
                <span className="ml-auto">
                  <LikeButton liked={liked} count={site.likes} onClick={() => onLike(site.id)} label={site.title} />
                </span>
              </div>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight md:text-4xl">{site.title}</h2>
              <p className="mt-3 max-w-2xl leading-relaxed text-muted">{site.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {site.tech.map((t) => (
                  <span key={t} className="rounded-full border border-line bg-card px-3.5 py-1.5 text-xs font-medium">
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-6 rounded-2xl border border-line bg-card p-4 text-sm text-muted">
                Motion notes — thumbnail archetype <strong className="text-ink">{site.variant}</strong> rendered live
                on canvas at hue <strong className="text-ink">{site.hue}°</strong>. Animation pauses off-screen and
                respects reduced-motion settings.
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
