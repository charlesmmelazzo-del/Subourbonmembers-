import { requireProfile } from '@/lib/auth'
import { listCatalog, getMemberCatalogState, getMenuTree } from '@/lib/queries'
import { CatalogBrowser } from '@/components/catalog/CatalogBrowser'

export const metadata = { title: 'Menu' }

export default async function SpiritsPage({
  searchParams,
}: {
  searchParams: {
    category?: string
    sub?: string
    all?: string
    q?: string
    item?: string
    view?: string
  }
}) {
  const profile = await requireProfile()
  const eightysixed = searchParams.view === '86'

  // The whole menu comes down in one go — the accordion needs every category
  // to draw itself, and the browser filters client-side from there.
  const [items, state, menu] = await Promise.all([
    listCatalog({ eightysixed }),
    getMemberCatalogState(profile.id),
    getMenuTree(),
  ])

  return (
    <CatalogBrowser
      items={items}
      menu={menu}
      memberId={profile.id}
      favoriteIds={[...state.favoriteIds]}
      ratedIds={Object.fromEntries(state.noteByItem)}
      orderedIds={[...state.orderedIds]}
      initialItemId={searchParams.item}
      initialCategory={searchParams.category}
      initialSubcategory={searchParams.sub}
      initialShowAll={searchParams.all === '1'}
      initialQuery={searchParams.q}
      eightysixed={eightysixed}
    />
  )
}
