import { requireProfile, householdRoot } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { LockerView } from '@/components/locker/LockerView'
import type { Fitting, Locker, LockerItem, ProductRequest } from '@/lib/types'

export const metadata = { title: 'My Locker' }

export type LockerItemWithBottle = LockerItem & {
  item: {
    id: string
    name: string
    category: string
    subcategory: string | null
    abv: number | null
    hero_image_url: string | null
  } | null
}

export default async function LockerPage() {
  const profile = await requireProfile()
  const supabase = createClient()
  const rootId = householdRoot(profile)

  const { data: locker } = await supabase
    .from('lockers')
    .select('*')
    .eq('member_id', rootId)
    .maybeSingle()

  const [{ data: items }, { data: requests }, { data: fittings }] = await Promise.all([
    locker
      ? supabase
          .from('locker_items')
          .select('*, item:catalog_items(id, name, category, subcategory, abv, hero_image_url)')
          .eq('locker_id', locker.id)
          .order('added_on', { ascending: false })
      : { data: [] },
    supabase
      .from('product_requests')
      .select('*')
      .eq('member_id', profile.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('fittings')
      .select('*')
      .eq('member_id', profile.id)
      .order('requested_at', { ascending: false }),
  ])

  // staff_notes is staff-only. RLS is row-scoped, so strip the column here.
  const memberSafeRequests = ((requests ?? []) as ProductRequest[]).map(
    ({ staff_notes, ...rest }) => rest
  )
  const memberSafeFittings = ((fittings ?? []) as Fitting[]).map(
    ({ pre_notes, ...rest }) => rest
  )

  return (
    <LockerView
      profile={profile}
      locker={(locker as Locker | null) ?? null}
      items={(items ?? []) as unknown as LockerItemWithBottle[]}
      requests={memberSafeRequests}
      fittings={memberSafeFittings}
    />
  )
}
