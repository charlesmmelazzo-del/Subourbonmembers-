import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { CollectionTabs } from '@/components/catalog/CollectionTabs'
import type { CatalogItem, MemberList, TastingNote } from '@/lib/types'

export const metadata = { title: 'My Collection' }

export type CollectionItem = Pick<
  CatalogItem,
  'id' | 'name' | 'category' | 'subcategory' | 'region' | 'abv' | 'hero_image_url' | 'status'
>

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: { tab?: string }
}) {
  const profile = await requireProfile()
  const supabase = createClient()

  const [
    { data: favorites },
    { data: notes },
    { data: lists },
    { data: shares },
    { data: ordered },
  ] = await Promise.all([
    supabase
      .from('favorites')
      .select('created_at, item:catalog_items(id, name, category, subcategory, region, abv, hero_image_url, status)')
      .eq('member_id', profile.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('tasting_notes')
      .select('*, item:catalog_items(id, name, category, subcategory, region, abv, hero_image_url, status)')
      .eq('member_id', profile.id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('member_lists')
      .select('*, entries:member_list_items(item:catalog_items(id, name, category, subcategory, region, abv, hero_image_url, status))')
      .eq('member_id', profile.id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('shares')
      .select('*, from:profiles!shares_from_member_id_fkey(id, first_name, last_name)')
      .eq('to_member_id', profile.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('sales_transactions')
      .select('transacted_at, item:catalog_items(id, name, category, subcategory, region, abv, hero_image_url, status)')
      .eq('member_id', profile.id)
      .not('item_id', 'is', null)
      .order('transacted_at', { ascending: false })
      .limit(400),
  ])

  // Collapse the order history into one row per bottle, with a count.
  const orderMap = new Map<string, { item: CollectionItem; times: number; last: string }>()
  for (const row of (ordered ?? []) as unknown as Array<{ transacted_at: string; item: CollectionItem | null }>) {
    if (!row.item) continue
    const entry = orderMap.get(row.item.id)
    if (entry) entry.times += 1
    else orderMap.set(row.item.id, { item: row.item, times: 1, last: row.transacted_at })
  }

  return (
    <CollectionTabs
      memberId={profile.id}
      initialTab={searchParams.tab}
      favorites={(favorites ?? []) as unknown as Array<{ created_at: string; item: CollectionItem | null }>}
      notes={(notes ?? []) as unknown as Array<TastingNote & { item: CollectionItem | null }>}
      lists={(lists ?? []) as unknown as Array<MemberList & { entries: Array<{ item: CollectionItem | null }> }>}
      shares={(shares ?? []) as unknown as Array<{
        id: string
        entity_type: string
        entity_id: string
        message: string | null
        created_at: string
        read_at: string | null
        from: { id: string; first_name: string; last_name: string }
      }>}
      ordered={[...orderMap.values()].sort((a, b) => b.times - a.times)}
    />
  )
}
