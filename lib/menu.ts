import { MENU_GROUPS, TAXONOMY } from '@/lib/catalog'
import type { CatalogKind, MenuNode } from '@/lib/types'

/**
 * The menu's shape, as the browser consumes it.
 *
 * Built from the `menu_nodes` table when there is one, and from the hardcoded
 * TAXONOMY when there is not — a project that has not run 0005 yet, or a table
 * somebody emptied, still gets a menu rather than a blank page.
 */
export type MenuTree = MenuTreeSection[]

export type MenuTreeSection = {
  key: string
  title: string
  blurb?: string
  /** Which kinds this section claims, for a category the tree does not list. */
  kinds: CatalogKind[]
  categories: MenuTreeCategory[]
}

export type MenuTreeCategory = {
  name: string
  blurb?: string
  kind: CatalogKind
  subcategories: string[]
}

/** The shape compiled into the app, used as seed and as fallback. */
export function defaultMenuTree(): MenuTree {
  return MENU_GROUPS.map((group) => ({
    key: group.key,
    title: group.title,
    blurb: group.blurb,
    kinds: group.kinds,
    categories: TAXONOMY.filter((t) => group.kinds.includes(t.kind)).map((t) => ({
      name: t.category,
      blurb: t.blurb,
      kind: t.kind,
      subcategories: t.subcategories ?? [],
    })),
  }))
}

/**
 * Folds the flat `menu_nodes` rows into the tree. Hidden nodes are dropped
 * here rather than filtered in the query, so the admin editor can ask for
 * everything and the portal can ask for the same rows and get the menu.
 */
export function menuTreeFromNodes(nodes: MenuNode[], includeHidden = false): MenuTree {
  const visible = includeHidden ? nodes : nodes.filter((n) => !n.is_hidden)
  const byParent = new Map<string | null, MenuNode[]>()
  for (const node of visible) {
    const key = node.parent_id
    byParent.set(key, [...(byParent.get(key) ?? []), node])
  }
  const childrenOf = (id: string | null) =>
    (byParent.get(id) ?? []).sort((a, b) => a.sort_order - b.sort_order)

  return childrenOf(null)
    .filter((n) => n.level === 'section')
    .map((section) => ({
      key: section.id,
      title: section.name,
      blurb: section.blurb ?? undefined,
      kinds: section.kinds ?? [],
      categories: childrenOf(section.id)
        .filter((n) => n.level === 'category')
        .map((category) => ({
          name: category.name,
          blurb: category.blurb ?? undefined,
          kind: category.kind ?? 'spirit',
          subcategories: childrenOf(category.id)
            .filter((n) => n.level === 'subcategory')
            .map((n) => n.name),
        })),
    }))
}

/** Which section a kind belongs to, for categories the tree does not list. */
export function sectionForKind(tree: MenuTree, kind: CatalogKind): MenuTreeSection | undefined {
  return tree.find((s) => s.kinds.includes(kind))
}

/** Flat category list in menu order — what the admin bottle form offers. */
export function categoryNames(tree: MenuTree): string[] {
  return tree.flatMap((s) => s.categories.map((c) => c.name))
}

export function categoryIn(tree: MenuTree, name: string): MenuTreeCategory | undefined {
  for (const section of tree) {
    const found = section.categories.find((c) => c.name === name)
    if (found) return found
  }
  return undefined
}
