import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Site } from './data/sites'
import { useSites } from './hooks/useSites'
import { Cursor } from './components/Cursor'
import { Navbar } from './components/Navbar'
import { Preloader } from './components/Preloader'
import { Hero, Marquee } from './components/Hero'
import { EMPTY_FILTERS, FilterBar, type Filters } from './components/FilterBar'
import { SiteCard } from './components/SiteCard'
import { SiteModal } from './components/SiteModal'
import { SubmitForm } from './components/SubmitForm'
import { Footer } from './components/Footer'

export default function App() {
  const { sites, likedIds, toggleLike, submit, visits } = useSites()
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [openSite, setOpenSite] = useState<Site | null>(null)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [ready, setReady] = useState(false)

  const visible = useMemo(() => {
    const q = filters.query.trim().toLowerCase()
    const out = sites.filter((s) => {
      if (filters.category !== 'All' && s.category !== filters.category) return false
      if (filters.tech !== 'All' && !s.tech.includes(filters.tech)) return false
      if (filters.style !== 'All' && s.style !== filters.style) return false
      if (q && !`${s.title} ${s.description} ${s.category} ${s.tech.join(' ')}`.toLowerCase().includes(q)) return false
      return true
    })
    switch (filters.sort) {
      case 'new':
        out.sort((a, b) => b.year - a.year || b.likes - a.likes)
        break
      case 'az':
        out.sort((a, b) => a.title.localeCompare(b.title))
        break
      default:
        out.sort((a, b) => b.likes - a.likes)
    }
    return out
  }, [sites, filters])

  const totalLikes = useMemo(() => sites.reduce((n, s) => n + s.likes, 0), [sites])

  return (
    <div id="top" className="grain min-h-screen bg-paper text-ink">
      <AnimatePresence>{!ready && <Preloader onDone={() => setReady(true)} />}</AnimatePresence>
      <Cursor />
      <Navbar onSubmit={() => setSubmitOpen(true)} count={sites.length} />
      <Hero count={sites.length} totalLikes={totalLikes} />
      <Marquee items={sites.slice(0, 8)} />
      <FilterBar filters={filters} onChange={setFilters} resultCount={visible.length} />

      <main id="gallery" className="mx-auto max-w-7xl scroll-mt-32 px-5 py-10">
        {visible.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-card px-6 py-20 text-center">
            <p className="font-display text-2xl font-bold">Nothing moves here yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              No sites match these filters. Loosen a filter — or submit the first site that fits.
            </p>
            <button
              onClick={() => setSubmitOpen(true)}
              className="mt-6 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white"
            >
              Submit a site
            </button>
          </div>
        ) : (
          <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {visible.map((site, i) => (
                <SiteCard
                  key={site.id}
                  site={site}
                  index={i}
                  liked={likedIds.has(site.id)}
                  onLike={toggleLike}
                  onOpen={setOpenSite}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      <section id="submit" className="scroll-mt-16 border-t border-line bg-coal text-paper">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-5 py-14">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              Know a site that moves?
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-paper/70">
              Nominate it for the gallery. Community picks get a living thumbnail generated on the spot.
            </p>
          </div>
          <button
            onClick={() => setSubmitOpen(true)}
            className="rounded-full bg-accent px-8 py-3.5 font-display text-sm font-bold uppercase tracking-[0.14em] text-white transition-transform hover:scale-105"
            data-hover
          >
            Submit a site
          </button>
        </div>
      </section>

      <Footer visits={visits} />

      <SiteModal
        site={openSite}
        liked={openSite ? likedIds.has(openSite.id) : false}
        onLike={toggleLike}
        onClose={() => setOpenSite(null)}
      />
      <SubmitForm open={submitOpen} onClose={() => setSubmitOpen(false)} onSubmit={submit} />
    </div>
  )
}
