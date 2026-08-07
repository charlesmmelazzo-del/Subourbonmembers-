import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { listEvents, seatsTakenByEvent } from '@/lib/queries'
import { EventCalendar } from '@/components/events/EventCalendar'

export const metadata = { title: 'Calendar' }

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { event?: string; month?: string }
}) {
  const profile = await requireProfile()
  const supabase = createClient()

  // Pull a wide window so month-to-month paging is instant.
  const anchor = searchParams.month ? new Date(`${searchParams.month}-01T12:00:00`) : new Date()
  const from = new Date(anchor.getFullYear(), anchor.getMonth() - 2, 1)
  const to = new Date(anchor.getFullYear(), anchor.getMonth() + 4, 0)

  const events = await listEvents(from, to)
  const [seats, { data: myReservations }] = await Promise.all([
    seatsTakenByEvent(events.map((e) => e.id)),
    supabase
      .from('event_reservations')
      .select('event_id, seats, status')
      .eq('member_id', profile.id)
      .eq('status', 'confirmed'),
  ])

  return (
    <EventCalendar
      profile={profile}
      events={events}
      seatsTaken={Object.fromEntries(seats)}
      myReservations={Object.fromEntries(
        (myReservations ?? []).map((r) => [r.event_id, r.seats])
      )}
      initialEventId={searchParams.event}
      initialMonth={anchor.toISOString().slice(0, 7)}
    />
  )
}
