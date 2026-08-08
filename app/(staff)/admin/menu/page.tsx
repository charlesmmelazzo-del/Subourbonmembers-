import { requireStaff } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { MenuEditor } from '@/components/admin/MenuEditor'

export const metadata = { title: 'Menu layout' }

export default async function MenuLayoutPage() {
  await requireStaff()
  const supabase = createClient()

  // How many bottles sit under each name, so the editor can show its weight
  // and refuse to delete a category that is still holding something.
  const { data } = await supabase.from('catalog_items').select('category, subcategory')

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    const category = row.category as string
    counts[category] = (counts[category] ?? 0) + 1
    const sub = row.subcategory as string | null
    if (sub) counts[sub] = (counts[sub] ?? 0) + 1
  }

  return <MenuEditor counts={counts} />
}
