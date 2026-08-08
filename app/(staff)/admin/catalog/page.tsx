import { requireStaff } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { CatalogAdmin } from '@/components/admin/CatalogAdmin'
import type { CatalogItem, Producer } from '@/lib/types'

export const metadata = { title: 'Menu' }

export default async function CatalogAdminPage() {
  await requireStaff()
  const supabase = createClient()

  const [{ data: items }, { data: producers }] = await Promise.all([
    supabase
      .from('catalog_items')
      .select('*')
      .order('category')
      .order('name'),
    supabase.from('producers').select('*').order('name'),
  ])

  return (
    <CatalogAdmin
      items={(items ?? []) as CatalogItem[]}
      producers={(producers ?? []) as Producer[]}
    />
  )
}
