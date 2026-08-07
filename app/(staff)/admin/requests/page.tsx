import { requireStaff } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { RequestBoard } from '@/components/admin/RequestBoard'
import type { ProductRequest } from '@/lib/types'

export const metadata = { title: 'Locker requests' }

export type RequestRow = ProductRequest & {
  member: { id: string; first_name: string; last_name: string; tier: string; vip: boolean } | null
}

export default async function RequestsPage() {
  const staff = await requireStaff()
  const supabase = createClient()

  const { data } = await supabase
    .from('product_requests')
    .select('*, member:profiles(id, first_name, last_name, tier, vip)')
    .order('created_at', { ascending: false })

  return <RequestBoard staff={staff} requests={(data ?? []) as unknown as RequestRow[]} />
}
