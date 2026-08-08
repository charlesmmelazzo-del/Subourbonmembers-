'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import { ItemCard } from './ItemCard'
import type { CatalogItemFull } from '@/lib/types'

type Props = {
  title: string
  eyebrow: string
  blurb?: string
  items: CatalogItemFull[]
  favorites: Set<string>
  ratedIds: Record<string, number | null>
  ordered: Set<string>
  onOpenItem: (id: string) => void
  onClose: () => void
  takesEscape: boolean
}

/** Everything in the chosen category, as tiles. */
export function CategoryPanel({
  title, eyebrow, blurb, items, favorites, ratedIds, ordered, onOpenItem, onClose, takesEscape,
}: Props) {
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.producer?.name.toLowerCase().includes(q) ||
        item.region?.toLowerCase().includes(q)
    )
  }, [items, query])

  return (
    <BottomSheet
      label={title}
      eyebrow={eyebrow}
      title={title}
      blurb={blurb}
      onClose={onClose}
      takesEscape={takesEscape}
      toolbar={
        items.length > 8 ? (
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${items.length} in ${title}…`}
              className="input pl-9"
              type="search"
            />
          </div>
        ) : undefined
      }
    >
      <div className="px-5 sm:px-7">
        {visible.length === 0 ? (
          <p className="py-16 text-center text-sm text-cream-muted">
            Nothing matches “{query}” in here.
          </p>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          >
            {visible.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  // Only the first screenful is worth staggering; past that it
                  // reads as lag rather than choreography.
                  delay: Math.min(i, 10) * 0.03,
                  duration: 0.32,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <ItemCard
                  item={item}
                  isFavorite={favorites.has(item.id)}
                  rating={ratedIds[item.id] ?? null}
                  hasOrdered={ordered.has(item.id)}
                  onOpen={() => onOpenItem(item.id)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </BottomSheet>
  )
}
