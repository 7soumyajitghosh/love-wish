import { CATEGORIES, TECHS } from '../data/sites'

export type SortKey = 'top' | 'new' | 'az'

export interface Filters {
  query: string
  category: string
  tech: string
  style: 'All' | 'Dark' | 'Light'
  sort: SortKey
}

export const EMPTY_FILTERS: Filters = { query: '', category: 'All', tech: 'All', style: 'All', sort: 'top' }

export function FilterBar({
  filters,
  onChange,
  resultCount,
}: {
  filters: Filters
  onChange: (f: Filters) => void
  resultCount: number
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })
  return (
    <div className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-5 py-3">
        <input
          value={filters.query}
          onChange={(e) => set({ query: e.target.value })}
          placeholder="Search the gallery…"
          className="min-w-[180px] flex-1 rounded-full border border-line bg-card px-4 py-2 text-sm outline-none placeholder:text-muted focus:border-accent"
        />
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Category">
          {['All', ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => set({ category: c })}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                filters.category === c ? 'bg-ink text-paper' : 'border border-line bg-card text-ink hover:border-ink'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <select
          value={filters.tech}
          onChange={(e) => set({ tech: e.target.value })}
          aria-label="Tech"
          className="rounded-full border border-line bg-card px-3 py-1.5 text-xs font-medium outline-none focus:border-accent"
        >
          {['All', ...TECHS].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <div className="flex overflow-hidden rounded-full border border-line text-xs font-medium" role="group" aria-label="Style">
          {(['All', 'Dark', 'Light'] as const).map((s) => (
            <button
              key={s}
              onClick={() => set({ style: s })}
              className={`px-3 py-1.5 transition-colors ${filters.style === s ? 'bg-ink text-paper' : 'bg-card hover:bg-line/60'}`}
            >
              {s}
            </button>
          ))}
        </div>
        <select
          value={filters.sort}
          onChange={(e) => set({ sort: e.target.value as SortKey })}
          aria-label="Sort"
          className="rounded-full border border-line bg-card px-3 py-1.5 text-xs font-medium outline-none focus:border-accent"
        >
          <option value="top">Top liked</option>
          <option value="new">Newest</option>
          <option value="az">A–Z</option>
        </select>
        <span className="ml-auto text-xs tabular-nums text-muted" aria-live="polite">
          {resultCount} site{resultCount === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  )
}
