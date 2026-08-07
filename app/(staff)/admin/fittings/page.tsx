import { requireStaff } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { FittingBoard } from '@/components/admin/FittingBoard'
import type { Fitting } from '@/lib/types'

export const metadata = { title: 'Fittings' }

export type FittingRow = Fitting & {
  member: { id: string; first_name: string; last_name: string; tier: string; vip: boolean } | null
}

export default async function FittingsPage() {
  const staff = await requireStaff()
  const supabase = createClient()

  const { data } = await supabase
    .from('fittings')
    .select('*, member:profiles(id, first_name, last_name, tier, vip)')
    .order('requested_at', { ascending: false })

  return <FittingBoard staff={staff} fittings={(data ?? []) as unknown as FittingRow[]} />
}
