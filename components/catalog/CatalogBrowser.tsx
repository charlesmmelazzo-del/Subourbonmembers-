'use client'

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Heart, Search, Sparkles, Star, StickyNote, X } from 'lucide-react'
import clsx from 'clsx'
import { groupForKind, taxonFor } from '@/lib/catalog'
import { CategoryPanel } from './CategoryPanel'
import { DealersChoicePanel } from './DealersChoicePanel'
import { ItemCard } from './ItemCard'
import { ItemSheet } from './ItemSheet'
import { MenuAccordion } from './MenuAccordion'
import { StaffPicksPanel } from './StaffPicksPanel'
import type { CatalogItemFull } from '@/lib/types'

type Props = {
  items: CatalogItemFull[]
  memberId: string
  favoriteIds: string[]
  ratedIds: Record<string, number | null>
  orderedIds: string[]
  initialItemId?: string
  initialCategory?: string
  initialSubcategory?: string
  /** Present when the URL asked for the whole category rather than one branch. */
  initialShowAll?: boolean
  initialQuery?: string
  eightysixed?: boolean
}

type Filter = 'all' | 'favorites' | 'noted' | 'ordered'

/** Which category the slide-up panel is showing. `subcategory: null` = all of it. */
type Selection = { category: string; subcategory: string | null }

/** Only one slide-up at a time — they all occupy the same layer. */
type Board = 'dealers' | 'staff' | null

export function CatalogBrowser({
  items, memberId, favoriteIds, ratedIds, orderedIds,
  initialItemId, initialCategory, initialSubcategory, initialShowAll, initialQuery,
  eightysixed,
}: Props) {
  const router = useRouter()

  const [query, setQuery] = useState(initialQuery ?? '')
  const deferredQuery = useDeferredValue(query)
  const [filter, setFilter] = useState<Filter>('all')
  const [expanded, setExpanded] = useState<string | null>(initialCategory ?? null)
  const [selection, setSelection] = useState<Selection | null>(() => {
    if (!initialCategory) return null
    if (initialSubcategory) return { category: initialCategory, subcategory: initialSubcategory }
    return initialShowAll ? { category: initialCategory, subcategory: null } : null
  })
  const [board, setBoard] = useState<Board>(null)
  const [favorites, setFavorites] = useState(new Set(favoriteIds))
  const [openId, setOpenId] = useState<string | null>(initialItemId ?? null)

  const ordered = useMemo(() => new Set(orderedIds), [orderedIds])

  // Searching or filtering means you no longer want the menu's shape — you want
  // the matches. The accordion steps aside for a flat grid.
  const searching = deferredQuery.trim().length > 0 || filter !== 'all'
  const browsing = searching || eightysixed

  // Everything filters client-side: the whole menu is a few hundred rows and
  // instant response matters more here than payload size.
  const results = useMemo(() => {
    if (!browsing) return []
    const q = deferredQuery.trim().toLowerCase()
    return items.filter((item) => {
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
  }, [browsing, items, deferredQuery, filter, favorites, ratedIds, ordered])

  const panelItems = useMemo(() => {
    if (!selection) return []
    return items.filter(
      (item) =>
        item.category === selection.category &&
        (selection.subcategory === null || item.subcategory === selection.subcategory)
    )
  }, [items, selection])

  // Prev/next in the item sheet walks whatever list you opened it from.
  const context = selection ? panelItems : results
  const openIndex = context.findIndex((i) => i.id === openId)
  const openItem = openIndex >= 0 ? context[openIndex] : items.find((i) => i.id === openId) ?? null

  // Keep the URL shareable without re-running the server query on every keystroke.
  useEffect(() => {
    const next = new URLSearchParams()
    const category = selection?.category ?? expanded
    if (category) next.set('category', category)
    if (selection?.subcategory) next.set('sub', selection.subcategory)
    else if (selection) next.set('all', '1')
    if (query) next.set('q', query)
    if (openId) next.set('item', openId)
    if (eightysixed) next.set('view', '86')
    const qs = next.toString()
    window.history.replaceState(null, '', qs ? `/spirits?${qs}` : '/spirits')
  }, [expanded, selection, query, openId, eightysixed])

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
      const next = context[openIndex + delta]
      if (next) setOpenId(next.id)
    },
    [openIndex, context]
  )

  const sectionCount = useMemo(
    () => new Set(items.map((i) => groupForKind(i.kind)?.key ?? i.kind)).size,
    [items]
  )
  const selectedTaxon = selection ? taxonFor(selection.category) : undefined

  return (
    <div className="mx-auto max-w-5xl">
      {/* ---- Header ---- */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="label">{eightysixed ? 'No longer stocked' : 'The backbar'}</p>
          <h1 className="mt-1.5 font-display text-3xl sm:text-4xl">
            {eightysixed ? 'The 86 List' : 'Menu'}
          </h1>
          {!eightysixed && (
            <p className="mt-1.5 text-sm text-cream-muted">
              {items.length} {items.length === 1 ? 'pour' : 'pours'} across {sectionCount}{' '}
              {sectionCount === 1 ? 'list' : 'lists'}. Open a category to look inside.
            </p>
          )}
        </div>
        <button
          onClick={() => router.push(eightysixed ? '/spirits' : '/spirits?view=86')}
          className="shrink-0 text-xs text-cream-muted transition-colors hover:text-gold"
        >
          {eightysixed ? 'Back to the menu' : 'View 86 list'}
        </button>
      </div>

      {/* ---- Search + personal filters ---- */}
      <div className="sticky top-14 z-20 -mx-4 mb-5 border-b border-ink-line/60 bg-ink/90 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <div className="relative">
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

        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {([
            ['all', 'The menu', null],
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

      {/* ---- The two boards ---- */}
      <div className="mb-5 grid gap-2 sm:grid-cols-2">
        <BoardButton
          icon={Sparkles}
          title="Dealer's Choice"
          detail="Picked from what you already like."
          onClick={() => setBoard('dealers')}
        />
        <BoardButton
          icon={Star}
          title="Staff Picks"
          detail="What the bar team is pouring this week."
          onClick={() => setBoard('staff')}
        />
      </div>

      {/* ---- Body: the menu, or search results ---- */}
      {browsing ? (
        <>
          <p className="mb-3 text-xs text-cream-muted">
            {results.length} {results.length === 1 ? 'result' : 'results'}
          </p>
          {results.length === 0 ? (
            <EmptyState filtered={filter !== 'all'} />
          ) : (
            <motion.div layout className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {results.map((item) => (
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
        </>
      ) : items.length === 0 ? (
        <EmptyState filtered={false} />
      ) : (
        <MenuAccordion
          items={items}
          expanded={expanded}
          onToggle={(category) =>
            setExpanded((prev) => (prev === category ? null : category))
          }
          // Deliberately does not touch `expanded`: a category with no
          // subcategories opens its panel straight from the header, and
          // marking it expanded would leave it lit up with nothing under it.
          onSelect={(category, subcategory) => setSelection({ category, subcategory })}
        />
      )}

      <AnimatePresence>
        {board === 'dealers' && (
          <DealersChoicePanel
            key="dealers"
            items={items}
            favorites={favorites}
            ratedIds={ratedIds}
            ordered={ordered}
            onOpenItem={setOpenId}
            onClose={() => setBoard(null)}
            takesEscape={!openItem}
          />
        )}
        {board === 'staff' && (
          <StaffPicksPanel
            key="staff"
            items={items}
            favorites={favorites}
            ratedIds={ratedIds}
            ordered={ordered}
            onOpenItem={setOpenId}
            onClose={() => setBoard(null)}
            takesEscape={!openItem}
          />
        )}
      </AnimatePresence>

      {/* ---- Category panel ---- */}
      <AnimatePresence>
        {selection && (
          <CategoryPanel
            key={`${selection.category}:${selection.subcategory ?? '*'}`}
            title={selection.subcategory ?? selection.category}
            eyebrow={selection.subcategory ? selection.category : 'The backbar'}
            blurb={selection.subcategory ? undefined : selectedTaxon?.blurb}
            items={panelItems}
            favorites={favorites}
            ratedIds={ratedIds}
            ordered={ordered}
            onOpenItem={setOpenId}
            onClose={() => setSelection(null)}
            takesEscape={!openItem}
          />
        )}
      </AnimatePresence>

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
            onNext={openIndex >= 0 && openIndex < context.length - 1 ? () => step(1) : undefined}
            position={openIndex >= 0 ? { index: openIndex + 1, total: context.length } : undefined}
            onOpenItem={setOpenId}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function BoardButton({
  icon: Icon, title, detail, onClick,
}: {
  icon: typeof Sparkles
  title: string
  detail: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3.5 rounded-xl border border-gold/25 bg-gradient-to-r from-gold/[0.07] to-transparent px-4 py-3.5 text-left transition-colors duration-base hover:border-gold/60 hover:from-gold/[0.12]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/30 text-gold transition-colors group-hover:border-gold/60 group-hover:text-gold-bright">
        <Icon className="h-4 w-4" strokeWidth={1.5} />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-lg leading-tight text-cream group-hover:text-gold-bright">
          {title}
        </span>
        <span className="mt-0.5 block text-xs text-cream-muted">{detail}</span>
      </span>
    </button>
  )
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="card px-6 py-16 text-center">
      <p className="font-display text-lg">Nothing here.</p>
      <p className="mt-2 text-sm text-cream-muted">
        {filtered
          ? 'Try clearing the filter, or start favouriting things.'
          : 'Try a different search, or a different category.'}
      </p>
    </div>
  )
}
