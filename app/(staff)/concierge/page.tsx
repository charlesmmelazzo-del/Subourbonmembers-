import { requireStaff } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getMemberDossier } from '@/lib/queries'
import { ConciergeView } from '@/components/concierge/ConciergeView'
import type { Profile } from '@/lib/types'

export const metadata = { title: 'Concierge' }

export type ConciergeMember = Pick<
  Profile,
  'id' | 'first_name' | 'last_name' | 'tier' | 'vip' | 'member_number' | 'phone' | 'email'
>

export default async function ConciergePage({
  searchParams,
}: {
  searchParams: { member?: string }
}) {
  const staff = await requireStaff()
  const supabase = createClient()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [{ data: members }, { data: todayEvents }, { data: todayFittings }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, tier, vip, member_number, phone, email')
      .eq('role', 'member')
      .eq('status', 'active')
      .order('last_name'),
    supabase
      .from('events')
      .select('id, title, starts_at, kind')
      .gte('starts_at', todayStart.toISOString())
      .lt('starts_at', new Date(todayStart.getTime() + 86_400_000).toISOString())
      .eq('status', 'published'),
    supabase
      .from('fittings')
      .select('id, scheduled_at, spirit_category, member:profiles(id, first_name, last_name)')
      .eq('status', 'scheduled')
      .gte('scheduled_at', todayStart.toISOString())
      .lt('scheduled_at', new Date(todayStart.getTime() + 86_400_000).toISOString()),
  ])

  const dossier = searchParams.member ? await getMemberDossier(searchParams.member) : null

  return (
    <ConciergeView
      staff={staff}
      members={(members ?? []) as ConciergeMember[]}
      dossier={dossier?.profile ? dossier : null}
      todayEvents={(todayEvents ?? []) as Array<{ id: string; title: string; starts_at: string; kind: string }>}
      todayFittings={
        (todayFittings ?? []) as unknown as Array<{
          id: string
          scheduled_at: string
          spirit_category: string | null
          member: { id: string; first_name: string; last_name: string } | null
        }>
      }
    />
  )
}
