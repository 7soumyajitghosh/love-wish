import { useCallback, useEffect, useMemo, useState } from 'react'
import { SEED_SITES, type Site } from '../data/sites'
import { fetchSites, likeSite, recordVisit, submitSite, type NewSite } from '../utils/api'

const LIKES_KEY = 'kinetic:likes:v1'
const LOCAL_SITES_KEY = 'kinetic:local-sites:v1'

function readLikes(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(LIKES_KEY) ?? '{}') as Record<string, boolean>
  } catch {
    return {}
  }
}

function readLocalSites(): Site[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_SITES_KEY) ?? '[]') as Site[]
  } catch {
    return []
  }
}

const VARIANTS = ['waves', 'orbs', 'grid', 'bars', 'dots', 'rings'] as const

export function useSites() {
  const [sites, setSites] = useState<Site[]>(SEED_SITES)
  const [liked, setLiked] = useState<Record<string, boolean>>(readLikes)
  const [visits, setVisits] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchSites().then((remote) => {
      if (cancelled) return
      const local = readLocalSites()
      if (remote.length > 0) {
        // Remote is source of truth when available; keep local submissions on top.
        const remoteIds = new Set(remote.map((s) => s.id))
        setSites([...local.filter((s) => !remoteIds.has(s.id)), ...remote])
      } else {
        setSites([...local, ...SEED_SITES])
      }
      setLoaded(true)
    })
    recordVisit().then((v) => {
      if (!cancelled) setVisits(v)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const toggleLike = useCallback(
    async (id: string) => {
      const wasLiked = !!liked[id]
      const next = { ...liked, [id]: !wasLiked }
      setLiked(next)
      try {
        localStorage.setItem(LIKES_KEY, JSON.stringify(next))
      } catch {
        /* storage unavailable */
      }
      // Optimistic count bump; reconcile with backend when reachable.
      setSites((prev) => prev.map((s) => (s.id === id ? { ...s, likes: s.likes + (wasLiked ? -1 : 1) } : s)))
      if (!wasLiked) {
        const count = await likeSite(id)
        if (count !== null) {
          setSites((prev) => prev.map((s) => (s.id === id ? { ...s, likes: count } : s)))
        }
      }
    },
    [liked],
  )

  const submit = useCallback(async (body: NewSite): Promise<boolean> => {
    const res = await submitSite(body)
    if (res) {
      setSites((prev) => [res.site, ...prev])
      return true
    }
    // Offline fallback: keep the submission local so the idea is never lost.
    const fallback: Site = {
      id: `local-${Date.now()}`,
      title: body.title,
      description: body.description,
      category: body.category,
      style: body.style,
      tech: body.tech,
      year: new Date().getFullYear(),
      hue: Math.floor(Math.random() * 360),
      variant: VARIANTS[Math.floor(Math.random() * VARIANTS.length)],
      likes: 0,
      badge: 'Community',
    }
    setSites((prev) => [fallback, ...prev])
    try {
      localStorage.setItem(LOCAL_SITES_KEY, JSON.stringify([fallback, ...readLocalSites()]))
    } catch {
      /* storage unavailable */
    }
    return true
  }, [])

  const likedIds = useMemo(() => new Set(Object.keys(liked).filter((k) => liked[k])), [liked])

  return { sites, likedIds, toggleLike, submit, visits, loaded }
}
