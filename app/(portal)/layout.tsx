import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PortalNav } from '@/components/portal/PortalNav'
import { NotificationBell } from '@/components/portal/NotificationBell'
import type { Notification } from '@/lib/types'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile()
  const supabase = createClient()

  const [{ data: notifications }, { count: unreadMessages }, { count: unreadShares }] =
    await Promise.all([
      supabase
        .from('notifications')
        .select('*')
        .eq('member_id', profile.id)
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('message_threads')
        .select('id', { count: 'exact', head: true })
        .eq('member_id', profile.id)
        .eq('unread_for_member', true),
      supabase
        .from('shares')
        .select('id', { count: 'exact', head: true })
        .eq('to_member_id', profile.id)
        .is('read_at', null),
    ])

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <PortalNav
        profile={profile}
        unreadMessages={unreadMessages ?? 0}
        unreadShares={unreadShares ?? 0}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-3 border-b border-ink-line/60 bg-ink/85 px-4 backdrop-blur lg:px-8">
          <NotificationBell notifications={(notifications ?? []) as Notification[]} />
        </header>

        {/* pb accounts for the fixed mobile tab bar. */}
        <main className="flex-1 px-4 pb-28 pt-6 lg:px-8 lg:pb-16">{children}</main>
      </div>
    </div>
  )
}
