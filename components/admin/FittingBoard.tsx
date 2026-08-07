'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Calendar, Check, Loader2, Star } from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase/client'
import { longDate, relative, shortDate } from '@/lib/format'
import { FITTING_STATUS } from '@/components/locker/status'
import type { FittingStatus, Profile } from '@/lib/types'
import type { FittingRow } from '@/app/(staff)/admin/fittings/page'

const COLUMNS: Array<{ status: FittingStatus; label: string }> = [
  { status: 'requested', label: 'Needs scheduling' },
  { status: 'scheduled', label: 'Booked' },
  { status: 'completed', label: 'Completed' },
]

export function FittingBoard({
  staff, fittings,
}: {
  staff: Profile
  fittings: FittingRow[]
}) {
  const [column, setColumn] = useState<FittingStatus>('requested')
  const visible = fittings.filter((f) => f.status === column)

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <p className="label">An hour with a member</p>
        <h1 className="mt-1.5 font-display text-3xl sm:text-4xl">Fittings</h1>
      </header>

      <div className="mb-5 flex flex-wrap gap-2">
        {COLUMNS.map((col) => {
          const count = fittings.filter((f) => f.status === col.status).length
          return (
            <button
              key={col.status}
              onClick={() => setColumn(col.status)}
              className={clsx(
                'rounded-full border px-3.5 py-1.5 text-xs transition-colors',
                column === col.status
                  ? 'border-gold bg-gold/10 text-gold-bright'
                  : 'border-ink-line text-cream-muted hover:border-gold/40'
              )}
            >
              {col.label}
              <span className="ml-1.5 opacity-60">{count}</span>
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <div className="card px-6 py-16 text-center text-sm text-cream-muted">
          Nothing in this column.
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((f) => <FittingCard key={f.id} fitting={f} staffId={staff.id} />)}
        </ul>
      )}
    </div>
  )
}

function FittingCard({ fitting, staffId }: { fitting: FittingRow; staffId: string }) {
  const router = useRouter()
  const [when, setWhen] = useState(
    fitting.scheduled_at ? fitting.scheduled_at.slice(0, 16) : ''
  )
  const [pre, setPre] = useState(fitting.pre_notes ?? '')
  const [post, setPost] = useState(fitting.post_notes ?? '')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const style = FITTING_STATUS[fitting.status]

  async function saveNotes() {
    setBusy(true)
    await createClient()
      .from('fittings')
      .update({ pre_notes: pre.trim() || null, post_notes: post.trim() || null })
      .eq('id', fitting.id)
    setBusy(false)
    setSaved(true)
    router.refresh()
  }

  async function schedule() {
    if (!when) return
    setBusy(true)
    const supabase = createClient()
    const at = new Date(when).toISOString()

    await supabase
      .from('fittings')
      .update({ status: 'scheduled', scheduled_at: at })
      .eq('id', fitting.id)

    await supabase.from('notifications').insert({
      member_id: fitting.member_id,
      kind: 'fitting',
      title: 'Your fitting is booked',
      body: `${longDate(at)} at ${format(new Date(at), 'h:mm a')}. We will see you then.`,
      link: '/locker',
      sent_at: new Date().toISOString(),
    } as never)

    setBusy(false)
    router.refresh()
  }

  async function complete() {
    setBusy(true)
    const supabase = createClient()
    await supabase
      .from('fittings')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        post_notes: post.trim() || null,
      })
      .eq('id', fitting.id)

    await supabase.from('notifications').insert({
      member_id: fitting.member_id,
      kind: 'fitting',
      title: 'Your fitting is complete',
      body: 'Everything we sourced is in your locker. We would love to hear how it went.',
      link: `/locker/fitting/${fitting.id}`,
      sent_at: new Date().toISOString(),
    } as never)

    setBusy(false)
    router.refresh()
  }

  return (
    <li className={clsx('card p-4', style.border)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm text-cream">
            {fitting.member?.vip && <Star className="h-3 w-3 fill-gold text-gold" />}
            <Link href={`/admin/members/${fitting.member?.id}`} className="hover:text-gold-bright">
              {fitting.member?.first_name} {fitting.member?.last_name}
            </Link>
          </p>
          <p className="mt-0.5 text-xs text-cream-muted">
            {fitting.occasion ?? 'No particular occasion'}
            <span className="opacity-60"> · asked {relative(fitting.requested_at)}</span>
          </p>
        </div>
        <span className={clsx('shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider', style.chip)}>
          {style.label}
        </span>
      </div>

      <dl className="mt-3 space-y-1 text-xs">
        {fitting.flavor_profile && (
          <div className="grid grid-cols-[6rem_1fr] gap-2">
            <dt className="text-cream-muted">Profile</dt>
            <dd className="text-cream/85">{fitting.flavor_profile}</dd>
          </div>
        )}
        {fitting.spirit_category && (
          <div className="grid grid-cols-[6rem_1fr] gap-2">
            <dt className="text-cream-muted">Category</dt>
            <dd className="text-cream/85">{fitting.spirit_category}</dd>
          </div>
        )}
      </dl>

      {/* ---- Their availability ---- */}
      {fitting.status === 'requested' && fitting.availability?.length > 0 && (
        <div className="mt-3">
          <p className="label mb-1.5">They are free</p>
          <div className="flex flex-wrap gap-1.5">
            {fitting.availability.map((slot) => (
              <span
                key={slot.date}
                className="rounded border border-ink-line px-2 py-0.5 text-[11px] text-cream-muted"
              >
                {shortDate(slot.date)} · {slot.windows.join(', ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ---- Staff notes ---- */}
      <div className="mt-4 space-y-2.5 rounded-lg border border-ink-line bg-ink p-3">
        <p className="label">Staff only</p>
        <textarea
          value={pre}
          onChange={(e) => { setPre(e.target.value); setSaved(false) }}
          rows={2}
          placeholder="Before the fitting — what to pour, what they have already tried, what to hold back."
          className="input resize-none text-xs"
        />
        {(fitting.status === 'scheduled' || fitting.status === 'completed') && (
          <textarea
            value={post}
            onChange={(e) => { setPost(e.target.value); setSaved(false) }}
            rows={2}
            placeholder="After — what landed, what they passed on, what to order."
            className="input resize-none text-xs"
          />
        )}
        <button onClick={saveNotes} disabled={busy} className="btn-ghost px-3 py-1.5 text-xs">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5 text-gold" /> : 'Save notes'}
        </button>
      </div>

      {/* ---- Actions ---- */}
      {fitting.status === 'requested' && (
        <div className="mt-3 flex gap-2">
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="input"
          />
          <button onClick={schedule} disabled={busy || !when} className="btn-gold shrink-0 px-3">
            <Calendar className="h-4 w-4" />
            Book it
          </button>
        </div>
      )}

      {fitting.status === 'scheduled' && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-gold">
            {longDate(fitting.scheduled_at)} · {fitting.scheduled_at && format(new Date(fitting.scheduled_at), 'h:mm a')}
          </p>
          <button onClick={complete} disabled={busy} className="btn-gold px-3">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Mark complete
          </button>
        </div>
      )}

      {fitting.status === 'completed' && fitting.feedback_body && (
        <div className="mt-3 border-l-2 border-gold/40 pl-3">
          <p className="text-xs italic text-cream/75">
            {fitting.feedback_rating && `${fitting.feedback_rating}/5 — `}
            “{fitting.feedback_body}”
          </p>
        </div>
      )}
    </li>
  )
}
