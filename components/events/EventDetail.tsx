'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Check, Loader2, Lock, MapPin, Ticket, Users, X } from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase/client'
import { EVENT_STYLES, isBookable, priceLabel, seatsLeft } from '@/lib/events'
import { longDate, money, timeOfDay } from '@/lib/format'
import { DiamondRule } from '@/components/ui/Logo'
import type { EventRow, Profile } from '@/lib/types'

export function EventDetail({
  event, profile, seatsTaken, mySeats, onReserved, onCancelled, onClose,
}: {
  event: EventRow
  profile: Profile
  seatsTaken: number
  mySeats: number
  onReserved: (seats: number) => void
  onCancelled: () => void
  onClose: () => void
}) {
  const [seats, setSeats] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const style = EVENT_STYLES[event.kind]
  const left = seatsLeft(event, seatsTaken)
  const bookable = isBookable(event)
  const isConcert = event.kind === 'concert'
  const past = new Date(event.starts_at) < new Date()
  const seniorOnly = event.tier_required === 'senior' && profile.tier !== 'senior'

  async function reserve() {
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.from('event_reservations').insert({
      event_id: event.id,
      member_id: profile.id,
      seats,
      amount_cents: (event.ticket_price_cents ?? 0) * seats,
      status: 'confirmed',
    } as never)

    setBusy(false)
    if (error) {
      setError(
        error.code === '23505'
          ? 'You already have a booking for this one.'
          : 'That did not go through. Try again, or send us a message.'
      )
      return
    }
    onReserved(seats)
  }

  async function cancel() {
    setBusy(true)
    await createClient()
      .from('event_reservations')
      .delete()
      .eq('event_id', event.id)
      .eq('member_id', profile.id)
    setBusy(false)
    onCancelled()
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-ink/85 backdrop-blur-sm"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={event.title}
        initial={{ opacity: 0, y: 40, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.985 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-2xl border border-ink-line bg-ink-raised shadow-vault sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:max-h-[88dvh] sm:w-[min(38rem,calc(100vw-3rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full bg-ink/70 p-1.5 text-cream backdrop-blur transition-colors hover:text-gold"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="relative h-40 shrink-0 bg-vault sm:h-52">
            {event.hero_image_url && (
              <Image src={event.hero_image_url} alt="" fill sizes="608px" className="object-cover" priority />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink-raised via-ink-raised/40 to-transparent" />
          </div>

          <div className="relative -mt-12 px-5 pb-8 sm:px-7">
            <span
              className={clsx(
                'inline-block rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider',
                style.chip
              )}
            >
              {style.label}
            </span>

            <h2 className="mt-3 font-display text-2xl leading-tight sm:text-3xl">{event.title}</h2>

            <div className="mt-3 space-y-1.5 text-sm text-cream/80">
              <p>{longDate(event.starts_at)}</p>
              {!event.all_day && (
                <p className="text-cream-muted">
                  {timeOfDay(event.starts_at)}
                  {event.ends_at && ` – ${timeOfDay(event.ends_at)}`}
                </p>
              )}
              {event.location && (
                <p className="flex items-center gap-1.5 text-cream-muted">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.location}
                </p>
              )}
            </div>

            {event.summary && (
              <p className="mt-5 text-[15px] leading-relaxed text-cream/85">{event.summary}</p>
            )}
            {event.details && (
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-cream/75">
                {event.details.split('\n\n').map((para, i) => <p key={i}>{para}</p>)}
              </div>
            )}

            {/* ---- Booking ---- */}
            {bookable && !past && (
              <div className="mt-7">
                <DiamondRule className="mb-5" />

                <div className="card p-4">
                  <div className="flex items-center justify-between">
                    <p className="label">{isConcert ? 'Tickets' : 'Reserve a seat'}</p>
                    {left !== null && (
                      <p className={clsx('text-xs', left === 0 ? 'text-red-400' : 'text-cream-muted')}>
                        {left === 0 ? 'Fully booked' : `${left} of ${event.capacity} remaining`}
                      </p>
                    )}
                  </div>

                  {priceLabel(event) && (
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-gold">
                      <Ticket className="h-4 w-4" />
                      {priceLabel(event)}
                    </p>
                  )}

                  {seniorOnly ? (
                    <p className="mt-4 flex items-start gap-2 text-sm text-cream-muted">
                      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gold/60" />
                      This one is for senior members and their co-members.
                    </p>
                  ) : mySeats > 0 ? (
                    <div className="mt-4">
                      <p className="flex items-center gap-2 text-sm text-gold">
                        <Check className="h-4 w-4" />
                        You have {mySeats} {mySeats === 1 ? 'seat' : 'seats'}
                        {event.ticket_price_cents
                          ? ` · ${money(event.ticket_price_cents * mySeats)}`
                          : ''}
                      </p>
                      <button
                        onClick={cancel}
                        disabled={busy}
                        className="mt-3 text-xs text-cream-muted underline-offset-2 hover:text-red-400 hover:underline"
                      >
                        {busy ? 'Cancelling…' : 'Cancel my booking'}
                      </button>
                    </div>
                  ) : left === 0 ? (
                    <p className="mt-4 text-sm text-cream-muted">
                      This is full. Send us a message and we will add you to the waitlist.
                    </p>
                  ) : (
                    <div className="mt-4">
                      {isConcert && (
                        <div className="mb-3 flex items-center gap-3">
                          <span className="label">Seats</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4].map((n) => (
                              <button
                                key={n}
                                onClick={() => setSeats(n)}
                                disabled={left !== null && n > left}
                                className={clsx(
                                  'h-8 w-8 rounded-lg border text-sm transition-colors disabled:opacity-30',
                                  seats === n
                                    ? 'border-gold bg-gold/15 text-gold-bright'
                                    : 'border-ink-line text-cream-muted hover:border-gold/40'
                                )}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <button onClick={reserve} disabled={busy} className="btn-gold w-full">
                        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isConcert
                          ? `Buy ${seats} ${seats === 1 ? 'ticket' : 'tickets'}${
                              event.ticket_price_cents
                                ? ` · ${money(event.ticket_price_cents * seats)}`
                                : ''
                            }`
                          : 'Reserve my seat'}
                      </button>

                      {isConcert && !!event.ticket_price_cents && (
                        <p className="mt-2 text-center text-[11px] text-cream-muted">
                          Charged to your account on the night.
                        </p>
                      )}
                    </div>
                  )}

                  {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
                </div>
              </div>
            )}

            {event.kind === 'private_closure' && (
              <div className="mt-6 flex items-start gap-3 rounded-lg border border-[#a3736b]/30 bg-[#a3736b]/[0.06] px-4 py-3.5">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-[#c19a92]" />
                <p className="text-sm leading-relaxed text-cream/80">
                  The space is closed to general membership. Locker access can be arranged —
                  send us a message and we will sort it out.
                </p>
              </div>
            )}

            {past && (
              <p className="mt-6 text-sm text-cream-muted">This one has already happened.</p>
            )}
          </div>
        </div>
      </motion.div>
    </>
  )
}
