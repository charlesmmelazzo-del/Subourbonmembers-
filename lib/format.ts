import { format, formatDistanceToNowStrict, isToday, isTomorrow, isThisYear } from 'date-fns'

export function money(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '—'
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  })
}

/**
 * Parses a value into a Date, treating a bare `YYYY-MM-DD` as a local calendar
 * date rather than UTC midnight.
 *
 * `new Date('2026-08-03')` is UTC midnight, which renders as August 2nd
 * anywhere west of Greenwich — and every plain `date` column we have (staff
 * pick weeks, visit days, birthdays, renewal dates) is a calendar date with no
 * timezone to it. Timestamps still carry a `T` and fall through untouched.
 */
export function toDate(input: string | Date): Date {
  if (input instanceof Date) return input
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input)
  return plain
    ? new Date(Number(plain[1]), Number(plain[2]) - 1, Number(plain[3]))
    : new Date(input)
}

export function shortDate(input: string | Date | null | undefined): string {
  if (!input) return '—'
  const d = toDate(input)
  return format(d, isThisYear(d) ? 'MMM d' : 'MMM d, yyyy')
}

export function longDate(input: string | Date | null | undefined): string {
  if (!input) return '—'
  return format(toDate(input), 'EEEE, MMMM d, yyyy')
}

export function timeOfDay(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input
  return format(d, 'h:mm a').replace(':00', '')
}

/** "Tonight", "Tomorrow", or a date — for calendar and notification copy. */
export function whenLabel(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input
  if (isToday(d)) return `Tonight, ${timeOfDay(d)}`
  if (isTomorrow(d)) return `Tomorrow, ${timeOfDay(d)}`
  return `${format(d, 'EEE, MMM d')} · ${timeOfDay(d)}`
}

export function relative(input: string | Date | null | undefined): string {
  if (!input) return 'never'
  const d = typeof input === 'string' ? new Date(input) : input
  return `${formatDistanceToNowStrict(d)} ago`
}

/**
 * The Monday a date belongs to, as `YYYY-MM-DD`. Matches the `week_of()`
 * function in the database, which is what staff_picks.week_of is keyed on.
 */
export function mondayOf(input: string | Date = new Date()): string {
  const d = new Date(toDate(input))
  const shift = (d.getDay() + 6) % 7 // Sunday is 0; the bar's week starts Monday
  d.setDate(d.getDate() - shift)
  return format(d, 'yyyy-MM-dd')
}

/** Calendar quarter key, e.g. "2026 Q3". */
export function quarterOf(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input
  return `${d.getFullYear()} Q${Math.floor(d.getMonth() / 3) + 1}`
}

export function phoneHref(phone: string | null | undefined): string | undefined {
  if (!phone) return undefined
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 10 ? `tel:+1${digits.slice(-10)}` : undefined
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`
}
