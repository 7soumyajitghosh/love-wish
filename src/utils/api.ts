// Backend client — same-origin /api. Fails soft so the gallery
// still works fully offline as a static site.
import type { Site } from '../data/sites'

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p
  } catch {
    return fallback
  }
}

export const fetchSites = (): Promise<Site[]> =>
  safe(
    fetch('/api/sites')
      .then((r) => r.json())
      .then((d) => d.sites as Site[]),
    [],
  )

export const likeSite = (id: string): Promise<number | null> =>
  safe(
    fetch(`/api/sites/${encodeURIComponent(id)}/like`, { method: 'POST' })
      .then((r) => r.json())
      .then((d) => d.likes as number),
    null,
  )

export type NewSite = {
  title: string
  url: string
  description: string
  category: string
  style: 'Dark' | 'Light'
  tech: string[]
}

export const submitSite = (body: NewSite): Promise<{ site: Site } | null> =>
  safe(
    fetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(async (r) => {
      if (!r.ok) throw new Error(await r.text())
      return r.json()
    }),
    null,
  )

export const recordVisit = (): Promise<number | null> =>
  safe(
    fetch('/api/visits')
      .then((r) => r.json())
      .then((d) => d.visits as number),
    null,
  )
