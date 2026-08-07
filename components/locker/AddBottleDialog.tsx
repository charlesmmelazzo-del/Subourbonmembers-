'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Search, Wine } from 'lucide-react'
import clsx from 'clsx'
import { Dialog } from '@/components/ui/Dialog'
import { createClient } from '@/lib/supabase/client'

type Suggestion = {
  id: string
  name: string
  category: string
  subcategory: string | null
  status: string
}

/**
 * Adds a bottle to the locker. Typing suggests from the catalog — including
 * 86'd and locker-only bottles, since a member may well be storing something
 * we no longer pour — and anything not in the catalog can be entered by hand.
 */
export function AddBottleDialog({
  lockerId, onClose,
}: {
  lockerId: string
  onClose: () => void
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [chosen, setChosen] = useState<Suggestion | null>(null)
  const [manual, setManual] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [fill, setFill] = useState(100)
  const [busy, setBusy] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (chosen || manual) return
    const term = query.trim()
    if (term.length < 2) { setSuggestions([]); return }

    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const { data } = await createClient()
        .from('catalog_items')
        .select('id, name, category, subcategory, status')
        .ilike('name', `%${term.replace(/[%_]/g, '')}%`)
        .neq('status', 'draft')
        .order('name')
        .limit(8)
      setSuggestions((data as Suggestion[]) ?? [])
    }, 180)

    return () => clearTimeout(timer.current)
  }, [query, chosen, manual])

  async function save() {
    setBusy(true)
    await createClient().from('locker_items').insert({
      locker_id: lockerId,
      item_id: chosen?.id ?? null,
      custom_name: chosen ? null : customName.trim(),
      custom_description: chosen ? null : customDescription.trim() || null,
      fill_percent: fill,
    } as never)
    setBusy(false)
    onClose()
    router.refresh()
  }

  const canSave = chosen !== null || (manual && customName.trim().length > 1)

  return (
    <Dialog
      title="Add a bottle to your locker"
      description="Start typing and we will suggest from our list. Anything else, add it by hand."
      onClose={onClose}
      footer={
        <button onClick={save} disabled={busy || !canSave} className="btn-gold w-full">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Add to locker
        </button>
      }
    >
      <div className="space-y-5">
        {!manual && (
          <div>
            <label htmlFor="bottle-search" className="label mb-2 block">Bottle</label>
            {chosen ? (
              <div className="flex items-center gap-3 rounded-lg border border-gold/45 bg-gold/[0.06] px-3.5 py-3">
                <Wine className="h-4 w-4 shrink-0 text-gold" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-cream">{chosen.name}</p>
                  <p className="text-[11px] text-cream-muted">
                    {chosen.subcategory ?? chosen.category}
                    {chosen.status === 'eightysixed' && ' · no longer on the backbar'}
                  </p>
                </div>
                <button
                  onClick={() => { setChosen(null); setQuery('') }}
                  className="shrink-0 text-xs text-cream-muted hover:text-cream"
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-muted" />
                  <input
                    id="bottle-search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Springbank, Fortaleza, Hampden…"
                    className="input pl-9"
                    autoFocus
                  />
                </div>

                {suggestions.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {suggestions.map((s) => (
                      <li key={s.id}>
                        <button
                          onClick={() => setChosen(s)}
                          className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-ink-card"
                        >
                          <p className="text-sm text-cream">{s.name}</p>
                          <p className="text-[11px] text-cream-muted">
                            {s.subcategory ?? s.category}
                            {s.status === 'eightysixed' && " · 86'd"}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {query.trim().length >= 2 && suggestions.length === 0 && (
                  <p className="mt-2 text-xs text-cream-muted">
                    Nothing matches. Add it by hand below.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {!chosen && (
          <div className="border-t border-ink-line pt-4">
            <button
              onClick={() => setManual(!manual)}
              className={clsx(
                'text-xs transition-colors',
                manual ? 'text-gold' : 'text-cream-muted hover:text-gold'
              )}
            >
              {manual ? '← Search our list instead' : "Not on our list? Add it yourself →"}
            </button>

            {manual && (
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="custom-name" className="label mb-2 block">What is it</label>
                  <input
                    id="custom-name"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Distillery-only bottling from the trip"
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="custom-desc" className="label mb-2 block">A note about it</label>
                  <textarea
                    id="custom-desc"
                    rows={2}
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder="Optional — where it came from, what it is."
                    className="input resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <label htmlFor="fill" className="label mb-2 block">
            How full — {fill}%
          </label>
          <input
            id="fill"
            type="range"
            min={0}
            max={100}
            step={5}
            value={fill}
            onChange={(e) => setFill(Number(e.target.value))}
            className="w-full accent-[#BBAF52]"
          />
        </div>
      </div>
    </Dialog>
  )
}
