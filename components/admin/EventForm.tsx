'use client'

import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { createClient } from '@/lib/supabase/client'
import { EVENT_STYLES } from '@/lib/events'
import type { EventKind, EventRow } from '@/lib/types'

const HERO_OPTIONS = [
  { label: 'None', value: '' },
  { label: 'The vault', value: '/images/space/subourbon-vault.jpg' },
  { label: 'The bar', value: '/images/space/subourbon-bar.jpg' },
  { label: 'Executive bottles', value: '/images/space/subourbon-executive-bottles.jpg' },
  { label: 'Founders room', value: '/images/space/subourbon-founders-wide.jpg' },
]

function toLocalInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function EventForm({
  event, onClose, onSaved,
}: {
  event: Partial<EventRow>
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    title: event.title ?? '',
    kind: (event.kind ?? 'tasting') as EventKind,
    status: event.status ?? 'published',
    starts_at: toLocalInput(event.starts_at) || toLocalInput(new Date().toISOString()),
    ends_at: toLocalInput(event.ends_at),
    all_day: event.all_day ?? false,
    summary: event.summary ?? '',
    details: event.details ?? '',
    location: event.location ?? '',
    capacity: event.capacity?.toString() ?? '',
    requires_reservation: event.requires_reservation ?? false,
    ticket_price: event.ticket_price_cents ? (event.ticket_price_cents / 100).toString() : '',
    tier_required: event.tier_required ?? '',
    hero_image_url: event.hero_image_url ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  async function save() {
    if (!form.title.trim() || !form.starts_at) {
      setError('A title and a start time are required.')
      return
    }
    setBusy(true)
    setError(null)

    const payload = {
      title: form.title.trim(),
      slug: form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
        + `-${Date.now().toString(36)}`,
      kind: form.kind,
      status: form.status,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      all_day: form.all_day,
      summary: form.summary.trim() || null,
      details: form.details.trim() || null,
      location: form.location.trim() || null,
      capacity: form.capacity ? Number(form.capacity) : null,
      requires_reservation: form.requires_reservation,
      ticket_price_cents: form.ticket_price ? Math.round(Number(form.ticket_price) * 100) : null,
      tier_required: form.tier_required || null,
      hero_image_url: form.hero_image_url || null,
    }

    const supabase = createClient()
    const { error } = event.id
      ? await supabase.from('events').update(payload as never).eq('id', event.id)
      : await supabase.from('events').insert({ ...payload, slug: payload.slug } as never)

    setBusy(false)
    if (error) {
      setError('That did not save. Check the fields and try again.')
      return
    }
    onSaved()
  }

  async function remove() {
    if (!event.id) return
    setBusy(true)
    await createClient().from('events').update({ status: 'cancelled' }).eq('id', event.id)
    setBusy(false)
    onSaved()
  }

  return (
    <Dialog
      title={event.id ? 'Edit event' : 'New event'}
      onClose={onClose}
      wide
      footer={
        <div className="flex gap-2">
          {event.id && (
            <button onClick={remove} disabled={busy} className="btn-ghost px-3 text-red-400">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={save} disabled={busy} className="btn-gold flex-1">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Save event
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="ev-title" className="label mb-2 block">Title</label>
          <input
            id="ev-title"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            className="input"
            placeholder="Agave Beyond Tequila"
          />
        </div>

        <div>
          <label className="label mb-2 block">Kind</label>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(EVENT_STYLES) as EventKind[]).map((k) => (
              <button
                key={k}
                onClick={() => {
                  set('kind', k)
                  if (k === 'private_closure') {
                    set('requires_reservation', false)
                    set('all_day', true)
                  }
                }}
                className={
                  form.kind === k
                    ? 'rounded-full border border-gold bg-gold/10 px-3 py-1 text-xs text-gold-bright'
                    : 'rounded-full border border-ink-line px-3 py-1 text-xs text-cream-muted hover:border-gold/40'
                }
              >
                {EVENT_STYLES[k].label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ev-start" className="label mb-2 block">Starts</label>
            <input
              id="ev-start"
              type="datetime-local"
              value={form.starts_at}
              onChange={(e) => set('starts_at', e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="ev-end" className="label mb-2 block">Ends</label>
            <input
              id="ev-end"
              type="datetime-local"
              value={form.ends_at}
              onChange={(e) => set('ends_at', e.target.value)}
              className="input"
            />
          </div>
        </div>

        <div>
          <label htmlFor="ev-summary" className="label mb-2 block">Summary</label>
          <input
            id="ev-summary"
            value={form.summary}
            onChange={(e) => set('summary', e.target.value)}
            className="input"
            placeholder="One line members see on the calendar."
          />
        </div>

        <div>
          <label htmlFor="ev-details" className="label mb-2 block">Details</label>
          <textarea
            id="ev-details"
            rows={4}
            value={form.details}
            onChange={(e) => set('details', e.target.value)}
            className="input resize-none leading-relaxed"
            placeholder="The full description. Blank lines become paragraphs."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ev-location" className="label mb-2 block">Location</label>
            <input
              id="ev-location"
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              className="input"
              placeholder="The Vault"
            />
          </div>
          <div>
            <label htmlFor="ev-hero" className="label mb-2 block">Image</label>
            <select
              id="ev-hero"
              value={form.hero_image_url}
              onChange={(e) => set('hero_image_url', e.target.value)}
              className="input"
            >
              {HERO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3 border-t border-ink-line pt-4">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-cream">
            <input
              type="checkbox"
              checked={form.requires_reservation}
              onChange={(e) => set('requires_reservation', e.target.checked)}
              className="h-4 w-4 accent-[#BBAF52]"
            />
            Members book a place
          </label>

          {form.requires_reservation && (
            <div className="grid grid-cols-2 gap-3 pl-7">
              <div>
                <label htmlFor="ev-cap" className="label mb-2 block">Capacity</label>
                <input
                  id="ev-cap"
                  type="number"
                  value={form.capacity}
                  onChange={(e) => set('capacity', e.target.value)}
                  className="input"
                  placeholder="30"
                />
              </div>
              <div>
                <label htmlFor="ev-price" className="label mb-2 block">Ticket ($)</label>
                <input
                  id="ev-price"
                  type="number"
                  step="0.01"
                  value={form.ticket_price}
                  onChange={(e) => set('ticket_price', e.target.value)}
                  className="input"
                  placeholder="Leave blank for free"
                />
              </div>
            </div>
          )}

          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-cream">
            <input
              type="checkbox"
              checked={form.tier_required === 'senior'}
              onChange={(e) => set('tier_required', e.target.checked ? 'senior' : '')}
              className="h-4 w-4 accent-[#BBAF52]"
            />
            Senior members only
          </label>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-cream">
            <input
              type="checkbox"
              checked={form.status === 'draft'}
              onChange={(e) => set('status', e.target.checked ? 'draft' : 'published')}
              className="h-4 w-4 accent-[#BBAF52]"
            />
            Keep as a draft — members will not see it
          </label>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </Dialog>
  )
}
