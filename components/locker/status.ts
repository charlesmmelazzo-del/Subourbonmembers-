import type { FittingStatus, ProductRequestStatus } from '@/lib/types'

type Style = {
  label: string
  chip: string
  border: string
  /** What the member reads. */
  member: string
  /** What staff reads on the board. */
  staff: string
}

export const REQUEST_STATUS: Record<ProductRequestStatus, Style> = {
  pending: {
    label: 'Received',
    chip: 'bg-cream/10 text-cream/80',
    border: 'border-ink-line',
    member: 'We have your request and are looking into what we can find.',
    staff: 'New — needs sourcing and a quote.',
  },
  quoted: {
    label: 'Quoted',
    chip: 'bg-gold/12 text-gold-bright',
    border: 'border-gold/30',
    member: 'We found it. Have a look at the price and let us know.',
    staff: 'Quote sent — waiting on the member.',
  },
  ordered: {
    label: 'Ordered',
    chip: 'bg-gold/12 text-gold-bright',
    border: 'border-gold/30',
    member: 'On order. We will let you know the moment it lands.',
    staff: 'Ordered from the distributor.',
  },
  received: {
    label: 'Arrived',
    chip: 'bg-[#8fa8c8]/12 text-[#a9c0dc]',
    border: 'border-[#8fa8c8]/30',
    member: 'It has arrived. We are getting it into your locker.',
    staff: 'In house — add it to the locker.',
  },
  added: {
    label: 'In your locker',
    chip: 'bg-gold/12 text-gold-bright',
    border: 'border-gold/25',
    member: 'It is in your locker and waiting for you.',
    staff: 'Complete.',
  },
  cancelled: {
    label: 'Cancelled',
    chip: 'bg-cream/8 text-cream-muted',
    border: 'border-ink-line',
    member: 'This one did not work out. Ask us and we will explain.',
    staff: 'Cancelled.',
  },
}

export const FITTING_STATUS: Record<FittingStatus, Style> = {
  requested: {
    label: 'Requested',
    chip: 'bg-cream/10 text-cream/80',
    border: 'border-ink-line',
    member: 'A manager is finding a time that works.',
    staff: 'Needs scheduling.',
  },
  scheduled: {
    label: 'Booked',
    chip: 'bg-gold/12 text-gold-bright',
    border: 'border-gold/30',
    member: 'Booked. We will see you then.',
    staff: 'Booked — prep notes before the day.',
  },
  completed: {
    label: 'Complete',
    chip: 'bg-[#8fa8c8]/12 text-[#a9c0dc]',
    border: 'border-[#8fa8c8]/25',
    member: 'Done. We would love to hear how it went.',
    staff: 'Complete.',
  },
  cancelled: {
    label: 'Cancelled',
    chip: 'bg-cream/8 text-cream-muted',
    border: 'border-ink-line',
    member: 'Cancelled.',
    staff: 'Cancelled.',
  },
}
