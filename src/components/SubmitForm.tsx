import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CATEGORIES, TECHS } from '../data/sites'
import type { NewSite } from '../utils/api'

const ALL_TECH = [...TECHS]

export function SubmitForm({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (b: NewSite) => Promise<boolean> }) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string>(CATEGORIES[0])
  const [style, setStyle] = useState<'Dark' | 'Light'>('Dark')
  const [tech, setTech] = useState<string[]>(['CSS'])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggleTech = (t: string) =>
    setTech((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t].slice(0, 3)))

  const valid = title.trim().length >= 2 && description.trim().length >= 10 && tech.length > 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || saving) return
    setSaving(true)
    setError('')
    try {
      await onSubmit({ title: title.trim(), url: url.trim(), description: description.trim(), category, style, tech })
      setTitle('')
      setUrl('')
      setDescription('')
      onClose()
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Submit a site"
        >
          <motion.form
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
            className="max-h-[92vh] w-full max-w-xl overflow-auto rounded-t-3xl bg-paper p-6 sm:rounded-3xl md:p-8"
          >
            <h2 className="font-display text-2xl font-bold tracking-tight">Submit a site in motion</h2>
            <p className="mt-1 text-sm text-muted">Nominate an animated website. The gallery takes it from there.</p>
            <div className="mt-5 space-y-4">
              <label className="block text-sm font-medium">
                Title
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Neon Cartography"
                  className="mt-1 w-full rounded-xl border border-line bg-card px-4 py-2.5 outline-none placeholder:text-muted focus:border-accent"
                />
              </label>
              <label className="block text-sm font-medium">
                URL <span className="font-normal text-muted">(optional)</span>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://…"
                  inputMode="url"
                  className="mt-1 w-full rounded-xl border border-line bg-card px-4 py-2.5 outline-none placeholder:text-muted focus:border-accent"
                />
              </label>
              <label className="block text-sm font-medium">
                Why it moves you
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What makes its motion special? (min 10 characters)"
                  rows={3}
                  className="mt-1 w-full resize-none rounded-xl border border-line bg-card px-4 py-2.5 outline-none placeholder:text-muted focus:border-accent"
                />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium">
                  Category
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2.5 outline-none focus:border-accent"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <fieldset className="text-sm font-medium">
                  <legend>Style</legend>
                  <div className="mt-1 flex overflow-hidden rounded-xl border border-line">
                    {(['Dark', 'Light'] as const).map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setStyle(s)}
                        className={`flex-1 py-2.5 transition-colors ${style === s ? 'bg-ink text-paper' : 'bg-card'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
              <fieldset className="text-sm font-medium">
                <legend>Motion stack <span className="font-normal text-muted">(up to 3)</span></legend>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ALL_TECH.map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => toggleTech(t)}
                      aria-pressed={tech.includes(t)}
                      className={`rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                        tech.includes(t) ? 'bg-accent text-white' : 'border border-line bg-card hover:border-ink'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </fieldset>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-full border border-line bg-card py-2.5 text-sm font-semibold hover:border-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!valid || saving}
                  className="flex-1 rounded-full bg-accent py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
                >
                  {saving ? 'Submitting…' : 'Submit site'}
                </button>
              </div>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
