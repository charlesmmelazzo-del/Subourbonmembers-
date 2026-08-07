'use client'

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Heart, Search, SlidersHorizontal, StickyNote, X } from 'lucide-react'
import clsx from 'clsx'
import { TAXONOMY } from '@/lib/catalog'
import { ItemCard } from './ItemCard'
import { ItemSheet } from './ItemSheet'
import type { CatalogItemFull } from '@/lib/types'

type Props = {
  items: CatalogItemFull[]
  memberId: string
  favoriteIds: string[]
  ratedIds: Record<string, number | null>
  orderedIds: string[]
  initialItemId?: string
  eightysixed?: boolean
}

type Filter = 'all' | 'favorites' | 'noted' | 'ordered'

export function CatalogBrowser({
  items, memberId, favoriteIds, ratedIds, orderedIds, initialItemId, eightysixed,
}: Props) {
  const router = useRouter()
  const params = useSearchParams()

  const [query, setQuery] = useState(params.get('q') ?? '')
  const deferredQuery = useDeferredValue(query)
  const [category, setCategory] = useState<string | null>(params.get('category'))
  const [subcategory, setSubcategory] = useState<string | null>(params.get('sub'))
  const [filter, setFilter] = useState<Filter>('all')
  const [favorites, setFavorites] = useState(new Set(favoriteIds))
  const [openId, setOpenId] = useState<string | null>(initialItemId ?? null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const ordered = useMemo(() => new Set(orderedIds), [orderedIds])

  // Everything filters client-side: the whole list is a few hundred rows and
  // instant response matters more here than payload size.
  const visible = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    return items.filter((item) => {
      if (category && item.category !== category) return false
      if (subcategory && item.subcategory !== subcategory) return false
      if (filter === 'favorites' && !favorites.has(item.id)) return false
      if (filter === 'noted' && !(item.id in ratedIds)) return false
      if (filter === 'ordered' && !ordered.has(item.id)) return false
      if (!q) return true
      return (
        item.name.toLowerCase().includes(q) ||
        item.producer?.name.toLowerCase().includes(q) ||
        item.region?.toLowerCase().includes(q) ||
        item.country?.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.subcategory?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q)
      )
    })
  }, [items, deferredQuery, category, subcategory, filter, favorites, ratedIds, ordered])

  const openIndex = visible.findIndex((i) => i.id === openId)
  const openItem = openIndex >= 0 ? visible[openIndex] : items.find((i) => i.id === openId) ?? null

  // Keep the URL shareable without re-running the server query on every keystroke.
  useEffect(() => {
    const next = new URLSearchParams()
    if (category) next.set('category', category)
    if (subcategory) next.set('sub', subcategory)
    if (query) next.set('q', query)
    if (openId) next.set('item', openId)
    if (eightysixed) next.set('view', '86')
    const qs = next.toString()
    window.history.replaceState(null, '', qs ? `/spirits?${qs}` : '/spirits')
  }, [category, subcategory, query, openId, eightysixed])

  const toggleFavorite = useCallback((id: string, on: boolean) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      on ? next.add(id) : next.delete(id)
      return next
    })
  }, [])

  const step = useCallback(
    (delta: number) => {
      if (openIndex < 0) return
      const next = visible[openIndex + delta]
      if (next) setOpenId(next.id)
    },
    [openIndex, visible]
  )

  const activeTaxon = TAXONOMY.find((t) => t.category === category)

  return (
    <div className="mx-auto max-w-6xl">
      {/* ---- Header ---- */}
      <div className="mb-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="label">{eightysixed ? 'No longer stocked' : 'The backbar'}</p>
            <h1 className="mt-1.5 font-display text-3xl sm:text-4xl">
              {eightysixed ? 'The 86 List' : category ?? 'Everything'}
            </h1>
            {activeTaxon?.blurb && !eightysixed && (
              <p className="mt-1.5 text-sm italic text-cream-muted">{activeTaxon.blurb}</p>
            )}
          </div>
          <button
            onClick={() => router.push(eightysixed ? '/spirits' : '/spirits?view=86')}
            className="shrink-0 text-xs text-cream-muted transition-colors hover:text-gold"
          >
            {eightysixed ? 'Back to the list' : 'View 86 list'}
          </button>
        </div>
      </div>

      {/* ---- Search + filters ---- */}
      <div className="sticky top-14 z-20 -mx-4 mb-5 border-b border-ink-line/60 bg-ink/90 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, producer, region, or a word in the description…"
              className="input pl-9 pr-9"
              type="search"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-muted hover:text-cream"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            aria-expanded={filtersOpen}
            className={clsx(
              'btn-ghost shrink-0 px-3 lg:hidden',
              (category || filter !== 'all') && 'border-gold/50 text-gold'
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Personal filters */}
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {([
            ['all', 'All', null],
            ['favorites', 'Favorites', Heart],
            ['noted', 'My notes', StickyNote],
            ['ordered', "I've ordered", null],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setFilter(key as Filter)}
              className={clsx(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors',
                filter === key
                  ? 'border-gold bg-gold/10 text-gold-bright'
                  : 'border-ink-line text-cream-muted hover:border-gold/40 hover:text-cream'
              )}
            >
              {Icon && <Icon className="h-3 w-3" />}
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-8">
        {/* ---- Category rail ---- */}
        <aside
          className={clsx(
            'w-52 shrink-0 lg:block',
            filtersOpen ? 'block' : 'hidden'
          )}
        >
          <div className="lg:sticky lg:top-44">
            <button
              onClick={() => { setCategory(null); setSubcategory(null) }}
              className={clsx(
                'mb-1 w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors',
                !category ? 'bg-gold/10 text-gold-bright' : 'text-cream/70 hover:text-cream'
              )}
            >
              Everything
              <span className="ml-2 text-[11px] text-cream-muted">{items.length}</span>
            </button>

            {TAXONOMY.map((taxon) => {
              const count = items.filter((i) => i.category === taxon.category).length
              if (!count) return null
              const on = category === taxon.category
              return (
                <div key={taxon.category}>
                  <button
                    onClick={() => {
                      setCategory(on ? null : taxon.category)
                      setSubcategory(null)
                    }}
                    className={clsx(
                      'w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors',
                      on ? 'bg-gold/10 text-gold-bright' : 'text-cream/70 hover:text-cream'
                    )}
                  >
                    {taxon.category}
                    <span className="ml-2 text-[11px] text-cream-muted">{count}</span>
                  </button>

                  <AnimatePresence initial={false}>
                    {on && taxon.subcategories && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden pl-3"
                      >
                        {taxon.subcategories.map((sub) => {
                          const subCount = items.filter((i) => i.subcategory === sub).length
                          if (!subCount) return null
                          return (
                            <li key={sub}>
                              <button
                                onClick={() =>
                                  setSubcategory(subcategory === sub ? null : sub)
                                }
                                className={clsx(
                                  'w-full rounded-lg px-3 py-1 text-left text-[13px] transition-colors',
                                  subcategory === sub
                                    ? 'text-gold-bright'
                                    : 'text-cream-muted hover:text-cream'
                                )}
                              >
                                {sub}
                                <span className="ml-2 text-[10px] opacity-60">{subCount}</span>
                              </button>
                            </li>
                          )
                        })}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </aside>

        {/* ---- Grid ---- */}
        <div className="min-w-0 flex-1">
          <p className="mb-3 text-xs text-cream-muted">
            {visible.length} {visible.length === 1 ? 'bottle' : 'bottles'}
            {filter !== 'all' && ' in this filter'}
          </p>

          {visible.length === 0 ? (
            <div className="card px-6 py-16 text-center">
              <p className="font-display text-lg">Nothing here.</p>
              <p className="mt-2 text-sm text-cream-muted">
                {filter !== 'all'
                  ? 'Try clearing the filter, or start favouriting things.'
                  : 'Try a different search, or a different category.'}
              </p>
            </div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
            >
              {visible.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  isFavorite={favorites.has(item.id)}
                  rating={ratedIds[item.id] ?? null}
                  hasOrdered={ordered.has(item.id)}
                  onOpen={() => setOpenId(item.id)}
                />
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* ---- Detail sheet ---- */}
      <AnimatePresence>
        {openItem && (
          <ItemSheet
            key={openItem.id}
            item={openItem}
            memberId={memberId}
            isFavorite={favorites.has(openItem.id)}
            onToggleFavorite={(on) => toggleFavorite(openItem.id, on)}
            onClose={() => setOpenId(null)}
            onPrev={openIndex > 0 ? () => step(-1) : undefined}
            onNext={openIndex >= 0 && openIndex < visible.length - 1 ? () => step(1) : undefined}
            position={openIndex >= 0 ? { index: openIndex + 1, total: visible.length } : undefined}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
