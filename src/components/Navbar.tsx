import { useEffect, useState } from 'react'

// Sticky navbar: transparent over the hero, blurred once scrolled.
export function Navbar({ onSubmit, count }: { onSubmit: () => void; count: number }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8)
    fn()
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all ${
        scrolled ? 'bg-paper/85 shadow-[0_1px_0_#E8E0D2] backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <a href="#top" className="font-display text-xl font-bold tracking-tight" data-hover>
          KINETIC<span className="text-accent">.</span>
        </a>
        <nav className="hidden items-center gap-7 text-sm font-medium md:flex" aria-label="Sections">
          <a href="#gallery" className="text-ink/70 transition hover:text-accent">
            Gallery
          </a>
          <a href="#submit" className="text-ink/70 transition hover:text-accent">
            Submit
          </a>
          <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">
            {count} sites in motion
          </span>
        </nav>
        <button
          onClick={onSubmit}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-accent"
        >
          + Submit site
        </button>
      </div>
    </header>
  )
}
