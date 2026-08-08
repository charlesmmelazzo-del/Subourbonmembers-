'use client'

import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import type { CatalogItem } from '@/lib/types'

/**
 * Search-and-add over the catalog. Used anywhere staff point at a bottle they
 * are not currently editing — staff picks, curated pairings.
 */
export function ItemPicker({
  catalog, exclude, placeholder, onPick,
}: {
  catalog: CatalogItem[]
  /** Ids already on the list, plus the item being edited. */
  exclude: Set<string>
  placeholder: string
  onPick: (item: CatalogItem) => void
}) {
  const [query, setQuery] = useState('')

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return catalog
      .filter(
        (i) =>
          !exclude.has(i.id) &&
          i.status !== 'archived' &&
          (i.name.toLowerCase().includes(q) ||
            i.category.toLowerCase().includes(q) ||
            i.subcategory?.toLowerCase().includes(q))
      )
      .slice(0, 8)
  }, [catalog, exclude, query])

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="input pl-9"
          type="search"
        />
      </div>

      {query.trim().length >= 2 && (
        <ul className="mt-2 space-y-1">
          {matches.length === 0 ? (
            <li className="px-1 py-2 text-xs text-cream-muted">Nothing by that name.</li>
          ) : (
            matches.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => { onPick(item); setQuery('') }}
                  className="flex w-full items-center gap-2.5 rounded-lg border border-ink-line px-3 py-2 text-left transition-colors hover:border-gold/40"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0 text-gold" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-cream">{item.name}</span>
                    <span className="block truncate text-[11px] text-cream-muted">
                      {item.subcategory ?? item.category}
                      {item.status !== 'active' && ` · ${item.status}`}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
