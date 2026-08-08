import { Beer, Grape, Martini, Wine } from 'lucide-react'
import type { CatalogKind } from '@/lib/types'

/** Placeholder mark for an item with no photography yet. */
export function iconForKind(kind: CatalogKind) {
  if (kind === 'cocktail') return Martini
  if (kind === 'beer') return Beer
  if (kind === 'wine') return Grape
  return Wine
}

/**
 * The four rails every recommendation board is grouped into, in serving order.
 * Kept here so Dealer's Choice and Staff Picks never drift apart.
 */
export const KIND_RAILS: Array<{ kind: CatalogKind; title: string; subtitle: string }> = [
  { kind: 'cocktail', title: 'Cocktails', subtitle: 'Made to order' },
  { kind: 'spirit', title: 'Spirits', subtitle: 'From the backbar' },
  { kind: 'beer', title: 'Beer', subtitle: 'Bottles and cans' },
  { kind: 'wine', title: 'Wine', subtitle: 'By the glass and the bottle' },
]
