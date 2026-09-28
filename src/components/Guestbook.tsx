import { useEffect, useState } from 'react'
import { fetchNotes, postNote, recordVisit, type Note } from '../utils/api'

// Love-notes wall + visit counter, shown in the finale.
// Fully backend-optional: silently degrades when served statically.
export default function Guestbook() {
  const [notes, setNotes] = useState<Note[]>([])
  const [visits, setVisits] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [hint, setHint] = useState('')

  useEffect(() => {
    let alive = true
    recordVisit().then((v) => alive && v != null && setVisits(v))
    fetchNotes().then((n) => alive && n && setNotes(n))
    return () => { alive = false }
  }, [])

  const submit = async () => {
    if (!name.trim() || !message.trim() || sending) return
    setSending(true)
    setHint('')
    const res = await postNote(name.trim(), message.trim())
    setSending(false)
    if (res?.note) {
      setNotes((n) => [res.note, ...n].slice(0, 100))
      setMessage('')
      setHint('Your footprint joined the morning 🌅')
    } else {
      setHint('Could not reach the backend — the morning heard you anyway ☀')
    }
  }

  return (
    <div className="glass w-full max-w-md rounded-3xl p-5 text-left">
      <p className="text-center font-serif-cine text-xl italic text-warmwhite">
        Leave a footprint in the morning 🌅
      </p>
      {visits != null && (
        <p className="mt-1 text-center text-[11px] uppercase tracking-[0.3em] text-white/40">
          this morning has been woken {visits} {visits === 1 ? 'time' : 'times'}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name, early bird"
          maxLength={40}
          className="w-28 rounded-full bg-white/10 px-3 py-2 text-sm text-warmwhite placeholder-white/30 outline-none focus:bg-white/15"
        />
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Say it before the coffee cools…"
          maxLength={500}
          className="flex-1 rounded-full bg-white/10 px-3 py-2 text-sm text-warmwhite placeholder-white/30 outline-none focus:bg-white/15"
        />
        <button
          onClick={submit}
          disabled={sending}
          className="rounded-full bg-crimson/70 px-4 py-2 text-sm text-white transition hover:bg-crimson disabled:opacity-50"
        >
          {sending ? '…' : '✦'}
        </button>
      </div>
      {hint && <p className="mt-2 text-center text-xs text-rosepink">{hint}</p>}
      {notes.length > 0 && (
        <ul className="mt-3 max-h-44 space-y-2 overflow-y-auto pr-1">
          {notes.map((n) => (
            <li key={n.id} className="rounded-2xl bg-white/5 px-3 py-2">
              <p className="text-sm text-warmwhite/90">{n.message}</p>
              <p className="mt-0.5 text-[11px] text-gold">— {n.name}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
