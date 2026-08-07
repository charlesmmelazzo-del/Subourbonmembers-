import { requireStaff } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireStaff()
  const supabase = createClient()

  const [
    { count: unreadThreads },
    { count: openRequests },
    { count: openFittings },
    { count: openEventRequests },
    { count: openFlags },
  ] = await Promise.all([
    supabase.from('message_threads').select('id', { count: 'exact', head: true }).eq('unread_for_staff', true),
    supabase.from('product_requests').select('id', { count: 'exact', head: true }).not('status', 'in', '("added","cancelled")'),
    supabase.from('fittings').select('id', { count: 'exact', head: true }).in('status', ['requested', 'scheduled']),
    supabase.from('event_requests').select('id', { count: 'exact', head: true }).in('status', ['pending', 'reviewing']),
    supabase.from('member_flags').select('id', { count: 'exact', head: true }).is('resolved_at', null),
  ])

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <AdminNav
        profile={profile}
        badges={{
          messages: unreadThreads ?? 0,
          requests: openRequests ?? 0,
          fittings: openFittings ?? 0,
          events: openEventRequests ?? 0,
          flags: openFlags ?? 0,
        }}
      />
      <main className="min-w-0 flex-1 px-4 pb-16 pt-6 lg:px-8">{children}</main>
    </div>
  )
}
