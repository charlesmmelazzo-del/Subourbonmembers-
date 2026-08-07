'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Loader2, Pencil, Plus, Users } from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase/client'
import { EVENT_STYLES } from '@/lib/events'
import { longDate, money, relative, shortDate, timeOfDay } from '@/lib/format'
import { EventForm } from './EventForm'
import type { EventRow, RequestStatus } from '@/lib/types'
import type { EventRequestRow } from '@/app/(staff)/admin/events/page'

export function EventAdmin({
  events, requests, seatsTaken,
}: {
  events: EventRow[]
  requests: EventRequestRow[]
  seatsTaken: Record<string, number>
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'upcoming' | 'past' | 'requests'>('upcoming')
  const [editing, setEditing] = useState<Partial<EventRow> | null>(null)
  const [notifying, setNotifying] = useState<string | null>(null)

  const now = new Date()
  const upcoming = events.filter((e) => new Date(e.starts_at) >= now).reverse()
  const past = events.filter((e) => new Date(e.starts_at) < now)
  const openRequests = requests.filter((r) => ['pending', 'reviewing'].includes(r.status))

  /** Fan a "this week" notice out to every active member. */
  async function notifyAll(event: EventRow) {
    setNotifying(event.id)
    const supabase = createClient()
    const { data: members } = await supabase
      .from('profiles')
      .select('id, tier')
      .eq('role', 'member')
      .eq('status', 'active')

    const eligible = (members ?? []).filter(
      (m) => !event.tier_required || m.tier === event.tier_required
    )

    for (let i = 0; i < eligible.length; i += 200) {
      await supabase.from('notifications').insert(
        eligible.slice(i, i + 200).map((m) => ({
          member_id: m.id as string,
          kind: 'event_week',
          title: 'Coming up at Subourbon',
          body: `${event.title} — ${longDate(event.starts_at)}.`,
          link: `/events?event=${event.id}`,
          channel: 'in_app',
          event_id: event.id,
          sent_at: new Date().toISOString(),
        })) as never
      )
    }

    setNotifying(null)
    router.refresh()
  }

  async function setRequestStatus(id: string, status: RequestStatus) {
    await createClient()
      .from('event_requests')
      .update({
        status,
        resolved_at: ['approved', 'declined'].includes(status) ? new Date().toISOString() : null,
      })
      .eq('id', id)
    router.refresh()
  }

  const list = tab === 'upcoming' ? upcoming : past

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">What&apos;s on</p>
          <h1 className="mt-1.5 font-display text-3xl sm:text-4xl">Events</h1>
        </div>
        <button
          onClick={() => setEditing({ kind: 'tasting', status: 'published', requires_reservation: true })}
          className="btn-gold px-3"
        >
          <Plus className="h-4 w-4" />
          New event
        </button>
      </header>

      <div className="mb-5 flex flex-wrap gap-2">
        {([
          ['upcoming', `Upcoming (${upcoming.length})`],
          ['requests', `Date requests (${openRequests.length})`],
          ['past', `Past (${past.length})`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={clsx(
              'rounded-full border px-3.5 py-1.5 text-xs transition-colors',
              tab === key
                ? 'border-gold bg-gold/10 text-gold-bright'
                : 'border-ink-line text-cream-muted hover:border-gold/40'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'requests' ? (
        <ul className="space-y-3">
          {requests.length === 0 && (
            <li className="card px-6 py-16 text-center text-sm text-cream-muted">
              No private date requests.
            </li>
          )}
          {requests.map((r) => (
            <li key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-cream">
                    {r.occasion ?? 'Private event'} · {r.guest_count ?? '?'} guests
                  </p>
                  <p className="mt-0.5 text-xs text-cream-muted">
                    <Link
                      href={`/admin/members/${r.member?.id}`}
                      className="hover:text-gold-bright"
                    >
                      {r.member?.first_name} {r.member?.last_name}
                    </Link>
                    <span className="opacity-60"> · asked {relative(r.created_at)}</span>
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-ink-line px-2 py-0.5 text-[10px] uppercase tracking-wider text-cream-muted">
                  {r.status}
                </span>
              </div>

              <dl className="mt-3 space-y-1 text-xs">
                <Row label="Preferred" value={longDate(r.requested_date)} />
                {r.alt_date && <Row label="Alternate" value={longDate(r.alt_date)} />}
                {r.start_time && (
                  <Row label="Time" value={`${r.start_time.slice(0, 5)} – ${r.end_time?.slice(0, 5)}`} />
                )}
              </dl>

              {r.notes && (
                <p className="mt-2.5 text-sm leading-relaxed text-cream/75">{r.notes}</p>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {(['reviewing', 'approved', 'declined'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setRequestStatus(r.id, s)}
                    disabled={r.status === s}
                    className={clsx(
                      'rounded-full border px-2.5 py-1 text-[11px] capitalize transition-colors',
                      r.status === s
                        ? 'border-gold bg-gold/15 text-gold-bright'
                        : 'border-ink-line text-cream-muted hover:border-gold/40 hover:text-cream'
                    )}
                  >
                    {s}
                  </button>
                ))}
                <Link
                  href={`/admin/messages?thread=${r.thread_id ?? ''}`}
                  className="ml-auto text-[11px] text-gold hover:text-gold-bright"
                >
                  Open the conversation →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-2">
          {list.length === 0 && (
            <li className="card px-6 py-16 text-center text-sm text-cream-muted">
              Nothing here.
            </li>
          )}
          {list.map((e) => {
            const style = EVENT_STYLES[e.kind]
            const taken = seatsTaken[e.id] ?? 0
            return (
              <li key={e.id} className="card group flex items-center gap-4 p-4">
                <div className="w-12 shrink-0 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-cream-muted">
                    {shortDate(e.starts_at).split(' ')[0]}
                  </p>
                  <p className="font-display text-xl leading-none">
                    {new Date(e.starts_at).getDate()}
                  </p>
                </div>

                <div className="min-w-0 flex-1">
                  <span className={clsx('inline-block rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider', style.chip)}>
                    {style.label}
                  </span>
                  <p className="mt-1 truncate text-sm text-cream">{e.title}</p>
                  <p className="truncate text-[11px] text-cream-muted">
                    {timeOfDay(e.starts_at)}
                    {e.capacity && ` · ${taken}/${e.capacity} booked`}
                    {e.ticket_price_cents && ` · ${money(e.ticket_price_cents)}`}
                    {e.status !== 'published' && ` · ${e.status}`}
                  </p>
                </div>

                <div className="flex shrink-0 gap-1">
                  {tab === 'upcoming' && (
                    <button
                      onClick={() => notifyAll(e)}
                      disabled={notifying === e.id}
                      aria-label={`Notify members about ${e.title}`}
                      className="rounded-lg p-2 text-cream-muted transition-colors hover:text-gold"
                      title="Send a notice to every member"
                    >
                      {notifying === e.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Bell className="h-3.5 w-3.5" />}
                    </button>
                  )}
                  <button
                    onClick={() => setEditing(e)}
                    aria-label={`Edit ${e.title}`}
                    className="rounded-lg p-2 text-cream-muted transition-colors hover:text-gold"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {editing && (
        <EventForm
          event={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh() }}
        />
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-2">
      <dt className="text-cream-muted">{label}</dt>
      <dd className="text-cream/85">{value}</dd>
    </div>
  )
}
