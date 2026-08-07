import { format, formatDistanceToNowStrict, isToday, isTomorrow, isThisYear } from 'date-fns'

export function money(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '—'
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  })
}

export function shortDate(input: string | Date | null | undefined): string {
  if (!input) return '—'
  const d = typeof input === 'string' ? new Date(input) : input
  return format(d, isThisYear(d) ? 'MMM d' : 'MMM d, yyyy')
}

export function longDate(input: string | Date | null | undefined): string {
  if (!input) return '—'
  const d = typeof input === 'string' ? new Date(input) : input
  return format(d, 'EEEE, MMMM d, yyyy')
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
