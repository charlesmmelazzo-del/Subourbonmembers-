'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Star } from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase/client'
import { money, relative, shortDate } from '@/lib/format'
import { REQUEST_STATUS } from '@/components/locker/status'
import type { Profile, ProductRequestStatus } from '@/lib/types'
import type { RequestRow } from '@/app/(staff)/admin/requests/page'

const FLOW: ProductRequestStatus[] = ['pending', 'quoted', 'ordered', 'received', 'added']

export function RequestBoard({
  staff, requests,
}: {
  staff: Profile
  requests: RequestRow[]
}) {
  const [showClosed, setShowClosed] = useState(false)

  const open = requests.filter((r) => !['added', 'cancelled'].includes(r.status))
  const closed = requests.filter((r) => ['added', 'cancelled'].includes(r.status))
  const visible = showClosed ? closed : open

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Sourcing for members</p>
          <h1 className="mt-1.5 font-display text-3xl sm:text-4xl">Locker requests</h1>
        </div>
        <div className="flex gap-1.5">
          {([[false, `Open (${open.length})`], [true, `Closed (${closed.length})`]] as const).map(
            ([key, label]) => (
              <button
                key={String(key)}
                onClick={() => setShowClosed(key)}
                className={clsx(
                  'rounded-full border px-3.5 py-1.5 text-xs transition-colors',
                  showClosed === key
                    ? 'border-gold bg-gold/10 text-gold-bright'
                    : 'border-ink-line text-cream-muted hover:border-gold/40'
                )}
              >
                {label}
              </button>
            )
          )}
        </div>
      </header>

      {visible.length === 0 ? (
        <div className="card px-6 py-16 text-center text-sm text-cream-muted">
          {showClosed ? 'Nothing closed yet.' : 'Nothing outstanding. Good.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((r) => (
            <RequestCard key={r.id} request={r} staffId={staff.id} />
          ))}
        </ul>
      )}
    </div>
  )
}

function RequestCard({ request, staffId }: { request: RequestRow; staffId: string }) {
  const router = useRouter()
  const [notes, setNotes] = useState(request.staff_notes ?? '')
  const [price, setPrice] = useState(
    request.quoted_price_cents ? (request.quoted_price_cents / 100).toString() : ''
  )
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const style = REQUEST_STATUS[request.status]
  const stepIndex = FLOW.indexOf(request.status)

  async function advance(status: ProductRequestStatus) {
    setBusy(true)
    const supabase = createClient()
    await supabase
      .from('product_requests')
      .update({
        status,
        fulfilled_at: ['received', 'added'].includes(status) ? new Date().toISOString() : null,
        cancelled_at: status === 'cancelled' ? new Date().toISOString() : null,
      })
      .eq('id', request.id)

    // Tell the member, and say something useful rather than "status updated".
    await supabase.from('notifications').insert({
      member_id: request.member_id,
      kind: 'request',
      title:
        status === 'added'
          ? 'Your bottle is in your locker'
          : `Locker request — ${REQUEST_STATUS[status].label.toLowerCase()}`,
      body: `${request.requested_name}. ${REQUEST_STATUS[status].member}`,
      link: '/locker',
      sent_at: new Date().toISOString(),
    } as never)

    setBusy(false)
    router.refresh()
  }

  async function saveDetails() {
    setBusy(true)
    await createClient()
      .from('product_requests')
      .update({
        staff_notes: notes.trim() || null,
        quoted_price_cents: price ? Math.round(Number(price) * 100) : null,
      })
      .eq('id', request.id)
    setBusy(false)
    setSaved(true)
    router.refresh()
  }

  return (
    <li className={clsx('card p-4', style.border)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-cream">{request.requested_name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-cream-muted">
            {request.member?.vip && <Star className="h-2.5 w-2.5 fill-gold text-gold" />}
            <Link
              href={`/admin/members/${request.member?.id}`}
              className="hover:text-gold-bright"
            >
              {request.member?.first_name} {request.member?.last_name}
            </Link>
            <span className="opacity-60">· asked {relative(request.created_at)}</span>
          </p>
        </div>
        <span className={clsx('shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider', style.chip)}>
          {style.label}
        </span>
      </div>

      {request.description && (
        <p className="mt-2.5 text-sm leading-relaxed text-cream/75">{request.description}</p>
      )}

      {/* ---- Staff-only working area ---- */}
      <div className="mt-4 space-y-3 rounded-lg border border-ink-line bg-ink p-3">
        <p className="label">Staff only — the member never sees this</p>

        <div className="flex gap-2">
          <input
            value={price}
            onChange={(e) => { setPrice(e.target.value); setSaved(false) }}
            placeholder="Quoted price"
            type="number"
            step="0.01"
            className="input w-36"
          />
          <input
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setSaved(false) }}
            placeholder="Where you are sourcing it, what to tell them, anything else."
            className="input"
          />
          <button onClick={saveDetails} disabled={busy} className="btn-ghost shrink-0 px-3">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4 text-gold" /> : 'Save'}
          </button>
        </div>
      </div>

      {/* ---- Status flow ---- */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {FLOW.map((status, i) => (
          <button
            key={status}
            onClick={() => advance(status)}
            disabled={busy || status === request.status}
            className={clsx(
              'rounded-full border px-2.5 py-1 text-[11px] transition-colors disabled:opacity-100',
              status === request.status
                ? 'border-gold bg-gold/15 text-gold-bright'
                : i < stepIndex
                  ? 'border-ink-line text-cream-muted/50'
                  : 'border-ink-line text-cream-muted hover:border-gold/40 hover:text-cream'
            )}
          >
            {REQUEST_STATUS[status].label}
          </button>
        ))}
        {request.status !== 'cancelled' && (
          <button
            onClick={() => advance('cancelled')}
            disabled={busy}
            className="ml-auto rounded-full border border-ink-line px-2.5 py-1 text-[11px] text-cream-muted transition-colors hover:border-red-500/50 hover:text-red-400"
          >
            Cancel
          </button>
        )}
      </div>

      {request.quoted_price_cents && (
        <p className="mt-2 text-[11px] text-cream-muted">
          Quoted at {money(request.quoted_price_cents)}
          {request.fulfilled_at && ` · fulfilled ${shortDate(request.fulfilled_at)}`}
        </p>
      )}
    </li>
  )
}
