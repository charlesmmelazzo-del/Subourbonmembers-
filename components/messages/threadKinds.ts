import type { ThreadKind } from '@/lib/types'

export const THREAD_LABELS: Record<ThreadKind, string> = {
  general: 'Message',
  event_request: 'Private event',
  locker_request: 'Locker request',
  fitting: 'Fitting',
  system: 'Notice',
}
