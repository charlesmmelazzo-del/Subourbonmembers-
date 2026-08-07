import { requireStaff } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { EventAdmin } from '@/components/admin/EventAdmin'
import type { EventRequest, EventRow } from '@/lib/types'

export const metadata = { title: 'Events' }

export type EventRequestRow = EventRequest & {
  member: { id: string; first_name: string; last_name: string; tier: string } | null
}

export default async function EventsAdminPage() {
  await requireStaff()
  const supabase = createClient()

  const [{ data: events }, { data: requests }, { data: reservations }] = await Promise.all([
    supabase.from('events').select('*').order('starts_at', { ascending: false }).limit(200),
    supabase
      .from('event_requests')
      .select('*, member:profiles(id, first_name, last_name, tier)')
      .order('requested_date'),
    supabase
      .from('event_reservations')
      .select('event_id, seats')
      .eq('status', 'confirmed'),
  ])

  const seats: Record<string, number> = {}
  for (const r of reservations ?? []) {
    seats[r.event_id as string] = (seats[r.event_id as string] ?? 0) + (r.seats as number)
  }

  return (
    <EventAdmin
      events={(events ?? []) as EventRow[]}
      requests={(requests ?? []) as unknown as EventRequestRow[]}
      seatsTaken={seats}
    />
  )
}
