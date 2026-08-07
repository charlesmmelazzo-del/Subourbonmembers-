import type { EventKind, EventRow } from '@/lib/types'

export const EVENT_STYLES: Record<
  EventKind,
  { label: string; dot: string; chip: string; border: string }
> = {
  tasting: {
    label: 'Tasting',
    dot: 'bg-gold',
    chip: 'bg-gold/12 text-gold-bright',
    border: 'border-gold/40',
  },
  concert: {
    label: 'Concert',
    dot: 'bg-[#8fa8c8]',
    chip: 'bg-[#8fa8c8]/12 text-[#a9c0dc]',
    border: 'border-[#8fa8c8]/40',
  },
  private_closure: {
    label: 'Private — closed',
    dot: 'bg-[#a3736b]',
    chip: 'bg-[#a3736b]/12 text-[#c19a92]',
    border: 'border-[#a3736b]/40',
  },
  general: {
    label: 'Event',
    dot: 'bg-cream/50',
    chip: 'bg-cream/10 text-cream/80',
    border: 'border-cream/25',
  },
}

/** Tastings and concerts take bookings; a private closure never does. */
export function isBookable(event: EventRow): boolean {
  return event.requires_reservation && event.kind !== 'private_closure'
}

export function seatsLeft(event: EventRow, taken: number): number | null {
  if (!event.capacity) return null
  return Math.max(0, event.capacity - taken)
}

export function priceLabel(event: EventRow): string | null {
  if (!event.ticket_price_cents) return null
  return `$${(event.ticket_price_cents / 100).toFixed(0)} per ticket`
}

/** Local YYYY-MM-DD, so events don't drift a day near midnight UTC. */
export function dayKey(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

export function groupByDay(events: EventRow[]): Map<string, EventRow[]> {
  const map = new Map<string, EventRow[]>()
  for (const e of events) {
    const key = dayKey(e.starts_at)
    map.set(key, [...(map.get(key) ?? []), e])
  }
  return map
}
