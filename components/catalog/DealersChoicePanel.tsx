'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BottomSheet } from './BottomSheet'
import { KIND_RAILS } from './kindIcon'
import { TileRail, type RailEntry } from './TileRail'
import type { CatalogItem, CatalogItemFull, CatalogKind } from '@/lib/types'

type Suggestion = {
  item_id: string
  kind: CatalogKind
  untried: boolean
  seed_item_id: string | null
  basis: 'peers' | 'popular'
}

type Props = {
  /** The whole active menu, already in memory — the rpc returns ids only. */
  items: CatalogItemFull[]
  favorites: Set<string>
  ratedIds: Record<string, number | null>
  ordered: Set<string>
  onOpenItem: (id: string) => void
  onClose: () => void
  takesEscape: boolean
}

/**
 * One to three suggestions per kind, from `dealers_choice()`: things favorited
 * by members who share your favorites, weighted toward what you have never
 * had. See supabase/migrations/0004_recommendations.sql.
 */
export function DealersChoicePanel({
  items, favorites, ratedIds, ordered, onOpenItem, onClose, takesEscape,
}: Props) {
  const [rows, setRows] = useState<Suggestion[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    createClient()
      .rpc('dealers_choice', { per_kind: 3 })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setFailed(true)
        else setRows((data ?? []) as Suggestion[])
      })
    return () => { cancelled = true }
  }, [])

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i as CatalogItem])), [items])

  const rails = useMemo(() => {
    if (!rows) return []
    return KIND_RAILS.map(({ kind, title, subtitle }) => ({
      kind,
      title,
      subtitle,
      entries: rows
        .filter((r) => r.kind === kind)
        .flatMap<RailEntry>((r) => {
          const item = byId.get(r.item_id)
          if (!item) return []
          return [{ item, caption: reasonFor(r, byId) }]
        }),
    })).filter((rail) => rail.entries.length > 0)
  }, [rows, byId])

  return (
    <BottomSheet
      label="Dealer's Choice"
      eyebrow="Picked for you"
      title="Dealer's Choice"
      blurb="Built from what you have favorited, and what members with the same taste favorited next."
      onClose={onClose}
      takesEscape={takesEscape}
    >
      {rows === null && !failed && (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-cream-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Reading the room…
        </div>
      )}

      {failed && (
        <p className="px-5 py-20 text-center text-sm text-cream-muted sm:px-7">
          Could not work that out just now. Try again in a moment.
        </p>
      )}

      {rows !== null && !failed && rails.length === 0 && (
        <div className="px-5 py-20 text-center sm:px-7">
          <p className="font-display text-lg">Nothing to go on yet.</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-cream-muted">
            Favorite a few things on the menu and this fills itself in — the more
            you mark, the sharper it gets.
          </p>
        </div>
      )}

      {rails.map((rail) => (
        <TileRail
          key={rail.kind}
          title={rail.title}
          subtitle={rail.subtitle}
          entries={rail.entries}
          favorites={favorites}
          ratedIds={ratedIds}
          ordered={ordered}
          onOpenItem={onOpenItem}
        />
      ))}
    </BottomSheet>
  )
}

/** The one-line "why this" under a tile. Two lines of a narrow tile, at most. */
function reasonFor(row: Suggestion, byId: Map<string, CatalogItem>): string {
  const seed = row.seed_item_id ? byId.get(row.seed_item_id) : null
  const why = row.basis === 'peers' && seed
    ? `You favorited ${seed.name}.`
    : 'Favorited across the room.'
  return row.untried ? `New to you. ${why}` : why
}
