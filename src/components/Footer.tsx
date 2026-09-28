export function Footer({ visits }: { visits: number | null }) {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8">
        <p className="font-display text-lg font-bold tracking-tight">
          KINETIC<span className="text-accent">.</span>
        </p>
        <p className="text-sm text-muted">
          A showcase of websites in motion — every thumbnail rendered live on canvas.
        </p>
        <p className="rounded-full border border-line bg-card px-4 py-1.5 text-xs font-medium tabular-nums text-muted" aria-live="polite">
          {visits === null ? 'counting visits…' : `${visits.toLocaleString()} visits`}
        </p>
      </div>
    </footer>
  )
}
