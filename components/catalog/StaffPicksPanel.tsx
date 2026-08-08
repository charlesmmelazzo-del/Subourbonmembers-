'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { mondayOf, shortDate } from '@/lib/format'
import { BottomSheet } from './BottomSheet'
import { KIND_RAILS } from './kindIcon'
import { TileRail, type RailEntry } from './TileRail'
import type { CatalogItem, CatalogItemFull } from '@/lib/types'

type PickRow = { item_id: string; blurb: string | null; sort_order: number }

type Props = {
  items: CatalogItemFull[]
  favorites: Set<string>
  ratedIds: Record<string, number | null>
  ordered: Set<string>
  onOpenItem: (id: string) => void
  onClose: () => void
  takesEscape: boolean
}

/** This week's board, as set by a manager in the admin panel. */
export function StaffPicksPanel({
  items, favorites, ratedIds, ordered, onOpenItem, onClose, takesEscape,
}: Props) {
  const week = useMemo(() => mondayOf(), [])
  const [rows, setRows] = useState<PickRow[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    createClient()
      .from('staff_picks')
      .select('item_id, blurb, sort_order')
      .eq('week_of', week)
      .order('sort_order')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setFailed(true)
        else setRows((data ?? []) as PickRow[])
      })
    return () => { cancelled = true }
  }, [week])

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i as CatalogItem])), [items])

  const rails = useMemo(() => {
    if (!rows) return []
    return KIND_RAILS.map(({ kind, title, subtitle }) => ({
      kind,
      title,
      subtitle,
      entries: rows.flatMap<RailEntry>((row) => {
        const item = byId.get(row.item_id)
        // A pick on a bottle that has since been 86'd simply drops off the
        // board rather than rendering an empty tile.
        if (!item || item.kind !== kind) return []
        return [{ item, caption: row.blurb }]
      }),
    })).filter((rail) => rail.entries.length > 0)
  }, [rows, byId])

  return (
    <BottomSheet
      label="Staff Picks"
      eyebrow={`Week of ${shortDate(week)}`}
      title="Staff Picks"
      blurb="What the bar team is pouring this week. Changes every Monday."
      onClose={onClose}
      takesEscape={takesEscape}
    >
      {rows === null && !failed && (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-cream-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking the board…
        </div>
      )}

      {failed && (
        <p className="px-5 py-20 text-center text-sm text-cream-muted sm:px-7">
          Could not load this week&apos;s picks. Try again in a moment.
        </p>
      )}

      {rows !== null && !failed && rails.length === 0 && (
        <div className="px-5 py-20 text-center sm:px-7">
          <p className="font-display text-lg">The board is empty this week.</p>
          <p className="mt-2 text-sm text-cream-muted">Ask a manager what they are drinking.</p>
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
