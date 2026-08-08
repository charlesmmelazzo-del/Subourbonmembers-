'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DiamondRule } from '@/components/ui/Logo'
import { TileRail, type RailEntry } from './TileRail'
import type { CatalogItem } from '@/lib/types'

type Reason = { item_id: string; source: 'staff' | 'favorites'; note: string | null }

/**
 * "If you like this one" — staff pairings first, then bottles in the same
 * category that get favorited alongside this one. Renders nothing at all when
 * there is nothing to say, rather than an empty heading.
 */
export function RecommendedWith({
  itemId, onOpenItem,
}: {
  itemId: string
  onOpenItem: (id: string) => void
}) {
  const [entries, setEntries] = useState<RailEntry[] | null>(null)

  useEffect(() => {
    let cancelled = false
    setEntries(null)
    const supabase = createClient()

    async function load() {
      const { data: reasons, error } = await supabase.rpc('recommended_with', {
        target: itemId,
        want: 10,
      })
      if (cancelled || error || !reasons?.length) {
        if (!cancelled) setEntries([])
        return
      }

      const rows = reasons as Reason[]
      const { data: items } = await supabase
        .from('catalog_items')
        .select('*')
        .in('id', rows.map((r) => r.item_id))

      if (cancelled) return
      const byId = new Map((items ?? []).map((i) => [i.id as string, i as CatalogItem]))
      // The rpc already ranked these; preserve its order rather than the
      // order Postgres happened to return the rows in.
      setEntries(
        rows.flatMap<RailEntry>((r) => {
          const item = byId.get(r.item_id)
          if (!item) return []
          return [{ item, caption: r.note ?? captionFor(r.source) }]
        })
      )
    }

    load()
    return () => { cancelled = true }
  }, [itemId])

  if (!entries?.length) return null

  return (
    <div className="mt-7">
      <DiamondRule className="mb-5" />
      {/*
        Pulled out to the sheet's edges so the row scrolls edge to edge, with
        the gutter handed to the rail instead — the first tile still lines up
        with the copy above it.
      */}
      <div className="-mx-5 sm:-mx-8">
        <TileRail
          title="If you like this"
          subtitle="Pairings from the bar, and what members favorite alongside it."
          entries={entries}
          favorites={EMPTY}
          ratedIds={{}}
          ordered={EMPTY}
          onOpenItem={onOpenItem}
          gutter="px-5 sm:px-8"
        />
      </div>
    </div>
  )
}

/** Personal state is already shown on the sheet itself; the rail stays plain. */
const EMPTY = new Set<string>()

function captionFor(source: Reason['source']): string {
  return source === 'staff' ? 'Paired by the bar.' : 'Favorited alongside this one.'
}
