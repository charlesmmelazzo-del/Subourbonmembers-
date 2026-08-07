'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addDays, format } from 'date-fns'
import { Check, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { Dialog } from '@/components/ui/Dialog'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES } from '@/lib/catalog'
import { dayKey } from '@/lib/events'

const WINDOWS = ['afternoon', 'evening', 'late'] as const

const FLAVOR_PROFILES = [
  'Bright and citrus forward',
  'Rich, sweet, oak driven',
  'Funky, wild, high ester',
  'Smoky and mineral',
  'Bitter and herbal',
  'Light, clean, low ABV',
  'Surprise me entirely',
]

/**
 * A fitting is a sit-down where staff pour against a member's taste and then
 * source bottles for their locker. This collects availability plus the three
 * questions the bar asks up front.
 */
export function RequestFittingDialog({
  memberId, onClose,
}: {
  memberId: string
  onClose: () => void
}) {
  const router = useRouter()
  const [availability, setAvailability] = useState<Record<string, string[]>>({})
  const [occasion, setOccasion] = useState('')
  const [flavor, setFlavor] = useState(FLAVOR_PROFILES[0])
  const [category, setCategory] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  // Two weeks out, starting tomorrow.
  const days = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1))
  const chosenCount = Object.values(availability).filter((w) => w.length > 0).length

  function toggle(day: Date, window: string) {
    const key = dayKey(day)
    setAvailability((prev) => {
      const current = prev[key] ?? []
      const next = current.includes(window)
        ? current.filter((w) => w !== window)
        : [...current, window]
      return { ...prev, [key]: next }
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const supabase = createClient()

    const { data: thread } = await supabase
      .from('message_threads')
      .insert({ member_id: memberId, subject: 'Fitting request', kind: 'fitting' } as never)
      .select('id')
      .single()

    await supabase.from('fittings').insert({
      member_id: memberId,
      occasion: occasion.trim() || null,
      flavor_profile: flavor,
      spirit_category: category || null,
      availability: Object.entries(availability)
        .filter(([, windows]) => windows.length > 0)
        .map(([date, windows]) => ({ date, windows })),
      thread_id: thread?.id ?? null,
    } as never)

    if (thread) {
      await supabase.from('messages').insert({
        thread_id: thread.id,
        sender_id: memberId,
        sender_role: 'member',
        body:
          `I would like to book a fitting.\n\n` +
          `Occasion: ${occasion.trim() || 'no particular occasion'}\n` +
          `Flavour profile: ${flavor}\n` +
          `Category: ${category || 'open to anything'}`,
      } as never)
    }

    setBusy(false)
    setDone(true)
    setTimeout(() => { onClose(); router.refresh() }, 1500)
  }

  if (done) {
    return (
      <Dialog title="Fitting requested" onClose={onClose}>
        <div className="py-6 text-center">
          <Check className="mx-auto h-8 w-8 text-gold" />
          <p className="mt-3 text-sm leading-relaxed text-cream-muted">
            A manager will look at your history and come back with a time. It will land in
            your messages and on your calendar.
          </p>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog
      title="Request a fitting"
      description="An hour with a manager, pouring against your taste, then we source what you liked."
      onClose={onClose}
      wide
      footer={
        <button
          form="fitting-request"
          type="submit"
          disabled={busy || chosenCount === 0}
          className="btn-gold w-full"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {chosenCount === 0 ? 'Pick when you are free' : 'Request a fitting'}
        </button>
      }
    >
      <form id="fitting-request" onSubmit={submit} className="space-y-6">
        {/* --- Questionnaire --- */}
        <div>
          <label htmlFor="fit-occasion" className="label mb-2 block">
            Are you looking for a specific occasion?
          </label>
          <input
            id="fit-occasion"
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            placeholder="A gift, restocking the locker, or nothing in particular"
            className="input"
          />
        </div>

        <div>
          <label htmlFor="fit-flavor" className="label mb-2 block">
            A particular flavour profile?
          </label>
          <select
            id="fit-flavor"
            value={flavor}
            onChange={(e) => setFlavor(e.target.value)}
            className="input"
          >
            {FLAVOR_PROFILES.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="fit-cat" className="label mb-2 block">
            A particular category?
          </label>
          <select
            id="fit-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input"
          >
            <option value="">No preference</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* --- Availability --- */}
        <div>
          <p className="label mb-1">When are you free?</p>
          <p className="mb-3 text-[11px] text-cream-muted">
            Choose as many as you can. More options, sooner we can book you.
          </p>

          <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {days.map((day) => {
              const key = dayKey(day)
              const chosen = availability[key] ?? []
              return (
                <div
                  key={key}
                  className={clsx(
                    'flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors',
                    chosen.length ? 'border-gold/40 bg-gold/[0.05]' : 'border-ink-line'
                  )}
                >
                  <div className="w-24 shrink-0">
                    <p className="text-xs text-cream">{format(day, 'EEE d MMM')}</p>
                  </div>
                  <div className="flex flex-1 gap-1.5">
                    {WINDOWS.map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => toggle(day, w)}
                        className={clsx(
                          'flex-1 rounded px-2 py-1 text-[11px] capitalize transition-colors',
                          chosen.includes(w)
                            ? 'bg-gold text-ink'
                            : 'border border-ink-line text-cream-muted hover:border-gold/40'
                        )}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </form>
    </Dialog>
  )
}
