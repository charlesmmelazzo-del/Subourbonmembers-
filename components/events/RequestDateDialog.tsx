'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { Dialog } from '@/components/ui/Dialog'
import { createClient } from '@/lib/supabase/client'
import { dayKey } from '@/lib/events'

const OCCASIONS = [
  'Birthday', 'Anniversary', 'Wedding reception', 'Corporate dinner',
  'Retirement', 'Holiday party', 'Something else',
]

export function RequestDateDialog({
  memberId, date, takenDays, onClose,
}: {
  memberId: string
  date: Date
  takenDays: Set<string>
  onClose: () => void
}) {
  const router = useRouter()
  const [requestedDate, setRequestedDate] = useState(dayKey(date))
  const [altDate, setAltDate] = useState('')
  const [occasion, setOccasion] = useState(OCCASIONS[0])
  const [guests, setGuests] = useState('')
  const [start, setStart] = useState('18:00')
  const [end, setEnd] = useState('23:00')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const conflict = takenDays.has(requestedDate)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const supabase = createClient()

    // The request becomes a message thread too, so it lands in the same
    // inbox as everything else the member has asked us.
    const { data: thread } = await supabase
      .from('message_threads')
      .insert({
        member_id: memberId,
        subject: `Private event request — ${format(new Date(`${requestedDate}T12:00`), 'MMMM d')}`,
        kind: 'event_request',
      } as never)
      .select('id')
      .single()

    const { error: reqError } = await supabase.from('event_requests').insert({
      member_id: memberId,
      requested_date: requestedDate,
      alt_date: altDate || null,
      occasion,
      guest_count: guests ? Number(guests) : null,
      start_time: `${start}:00`,
      end_time: `${end}:00`,
      notes: notes.trim() || null,
      thread_id: thread?.id ?? null,
    } as never)

    if (reqError) {
      setBusy(false)
      setError('That did not send. Try again, or message us directly.')
      return
    }

    if (thread) {
      await supabase.from('messages').insert({
        thread_id: thread.id,
        sender_id: memberId,
        sender_role: 'member',
        body:
          `I would like to request ${format(new Date(`${requestedDate}T12:00`), 'EEEE, MMMM d')}` +
          ` for a ${occasion.toLowerCase()}${guests ? `, around ${guests} guests` : ''}, ` +
          `${start}–${end}.` + (notes.trim() ? `\n\n${notes.trim()}` : ''),
      } as never)
    }

    setBusy(false)
    setDone(true)
    setTimeout(() => { onClose(); router.refresh() }, 1400)
  }

  if (done) {
    return (
      <Dialog title="Request sent" onClose={onClose}>
        <div className="py-6 text-center">
          <Check className="mx-auto h-8 w-8 text-gold" />
          <p className="mt-3 text-sm leading-relaxed text-cream-muted">
            We have it. A manager will come back to you in the message centre — usually
            within a day.
          </p>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog
      title="Request a private date"
      description="Tell us what you have in mind and we will come back with availability and pricing."
      onClose={onClose}
      footer={
        <button form="date-request" type="submit" disabled={busy} className="btn-gold w-full">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Send request
        </button>
      }
    >
      <form id="date-request" onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="req-date" className="label mb-2 block">Preferred date</label>
            <input
              id="req-date"
              type="date"
              required
              value={requestedDate}
              min={dayKey(new Date())}
              onChange={(e) => setRequestedDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="alt-date" className="label mb-2 block">Second choice</label>
            <input
              id="alt-date"
              type="date"
              value={altDate}
              min={dayKey(new Date())}
              onChange={(e) => setAltDate(e.target.value)}
              className="input"
            />
          </div>
        </div>

        {conflict && (
          <p className="rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-xs leading-relaxed text-cream/80">
            Something is already on the calendar that day. We will still look — sometimes it
            can be moved.
          </p>
        )}

        <div>
          <label htmlFor="occasion" className="label mb-2 block">Occasion</label>
          <select
            id="occasion"
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            className="input"
          >
            {OCCASIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="guests" className="label mb-2 block">Guests</label>
            <input
              id="guests"
              type="number"
              min={1}
              max={200}
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              placeholder="40"
              className="input"
            />
          </div>
          <div>
            <label htmlFor="start" className="label mb-2 block">From</label>
            <input id="start" type="time" value={start} onChange={(e) => setStart(e.target.value)} className="input" />
          </div>
          <div>
            <label htmlFor="end" className="label mb-2 block">Until</label>
            <input id="end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="input" />
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="label mb-2 block">Anything else</label>
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Which rooms you want, food, whether you need the vault open, anything at all."
            className="input resize-none leading-relaxed"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>
    </Dialog>
  )
}
