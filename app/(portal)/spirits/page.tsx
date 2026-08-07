import { requireProfile } from '@/lib/auth'
import { listCatalog, getMemberCatalogState } from '@/lib/queries'
import { CatalogBrowser } from '@/components/catalog/CatalogBrowser'

export const metadata = { title: 'The List' }

export default async function SpiritsPage({
  searchParams,
}: {
  searchParams: { category?: string; sub?: string; q?: string; item?: string; view?: string }
}) {
  const profile = await requireProfile()
  const eightysixed = searchParams.view === '86'

  const [items, state] = await Promise.all([
    listCatalog({
      category: searchParams.category,
      subcategory: searchParams.sub,
      search: searchParams.q,
      eightysixed,
    }),
    getMemberCatalogState(profile.id),
  ])

  return (
    <CatalogBrowser
      items={items}
      memberId={profile.id}
      favoriteIds={[...state.favoriteIds]}
      ratedIds={Object.fromEntries(state.noteByItem)}
      orderedIds={[...state.orderedIds]}
      initialItemId={searchParams.item}
      eightysixed={eightysixed}
    />
  )
}
