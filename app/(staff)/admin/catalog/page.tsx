import { requireStaff } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getMenuTree } from '@/lib/queries'
import { CatalogAdmin } from '@/components/admin/CatalogAdmin'
import type { CatalogItem, Producer } from '@/lib/types'

export const metadata = { title: 'Menu' }

export default async function CatalogAdminPage() {
  await requireStaff()
  const supabase = createClient()

  // Hidden entries included: staff still need to file bottles into a category
  // they have not shown members yet.
  const [{ data: items }, { data: producers }, menu] = await Promise.all([
    supabase
      .from('catalog_items')
      .select('*')
      .order('category')
      .order('name'),
    supabase.from('producers').select('*').order('name'),
    getMenuTree(true),
  ])

  return (
    <CatalogAdmin
      items={(items ?? []) as CatalogItem[]}
      producers={(producers ?? []) as Producer[]}
      menu={menu}
    />
  )
}
