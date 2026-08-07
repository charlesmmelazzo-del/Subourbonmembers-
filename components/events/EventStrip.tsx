import Link from 'next/link'
import Image from 'next/image'
import clsx from 'clsx'
import { CalendarDays } from 'lucide-react'
import { EVENT_STYLES, seatsLeft } from '@/lib/events'
import { whenLabel } from '@/lib/format'
import type { EventRow } from '@/lib/types'

/** Horizontal scroller of upcoming events. Used on the member home page. */
export function EventStrip({
  events, seatsTaken, className,
}: {
  events: EventRow[]
  seatsTaken: Map<string, number>
  className?: string
}) {
  if (!events.length) {
    return (
      <div className={clsx('card px-6 py-10 text-center', className)}>
        <CalendarDays className="mx-auto h-6 w-6 text-gold/40" strokeWidth={1.2} />
        <p className="mt-3 text-sm text-cream-muted">Nothing on the books in the next two weeks.</p>
      </div>
    )
  }

  return (
    <div className={clsx('no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2', className)}>
      {events.map((event) => {
        const style = EVENT_STYLES[event.kind]
        const left = seatsLeft(event, seatsTaken.get(event.id) ?? 0)

        return (
          <Link
            key={event.id}
            href={`/events?event=${event.id}`}
            className={clsx(
              'group relative w-64 shrink-0 snap-start overflow-hidden rounded-xl border bg-ink-card transition-colors',
              'border-ink-line hover:border-gold/45'
            )}
          >
            <div className="relative h-28 bg-vault">
              {event.hero_image_url && (
                <Image
                  src={event.hero_image_url}
                  alt=""
                  fill
                  sizes="256px"
                  className="object-cover opacity-70 transition-transform duration-700 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink-card to-transparent" />
              <span
                className={clsx(
                  'absolute left-3 top-3 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider',
                  style.chip
                )}
              >
                {style.label}
              </span>
            </div>

            <div className="p-3.5">
              <p className="text-[11px] text-gold">{whenLabel(event.starts_at)}</p>
              <p className="mt-1 line-clamp-2 font-display text-[15px] leading-tight">
                {event.title}
              </p>
              {event.summary && (
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-cream-muted">
                  {event.summary}
                </p>
              )}
              {left !== null && (
                <p className="mt-2 text-[11px] text-cream-muted">
                  {left === 0 ? 'Fully booked' : `${left} of ${event.capacity} left`}
                </p>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
