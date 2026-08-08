'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { ItemCard } from './ItemCard'
import type { CatalogItem } from '@/lib/types'

export type RailEntry = {
  item: CatalogItem
  /** One line under the tile explaining why it is here. */
  caption?: string | null
}

type Props = {
  title: string
  subtitle?: string
  entries: RailEntry[]
  favorites: Set<string>
  ratedIds: Record<string, number | null>
  ordered: Set<string>
  onOpenItem: (id: string) => void
  /**
   * Horizontal padding for the header and the scroll track. The track needs
   * its own rather than inheriting a parent's, so the first tile starts at the
   * text margin but the row still scrolls edge to edge.
   */
  gutter?: string
}

/**
 * A single horizontally scrolling row of tiles. Scroll-snapped for touch, with
 * arrows for anyone on a mouse — a trackpad-only rail strands desktop users.
 */
export function TileRail({
  title, subtitle, entries, favorites, ratedIds, ordered, onOpenItem,
  gutter = 'px-5 sm:px-7',
}: Props) {
  const track = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: true })

  const measure = useCallback(() => {
    const el = track.current
    if (!el) return
    // 4px of slack: sub-pixel widths mean scrollLeft rarely hits the exact end.
    setEdges({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    })
  }, [])

  useEffect(() => {
    measure()
    const el = track.current
    if (!el) return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [measure, entries])

  const nudge = (direction: 1 | -1) => {
    const el = track.current
    if (!el) return
    el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.8, 200), behavior: 'smooth' })
  }

  if (entries.length === 0) return null

  // Reserve the caption slot for the whole rail or none of it, so the tiles
  // stay on one baseline instead of stepping up and down the row.
  const captioned = entries.some((e) => e.caption)

  return (
    <section className="py-4">
      <div className={clsx('flex items-end justify-between gap-4', gutter)}>
        <div className="min-w-0">
          <h3 className="font-display text-xl leading-tight sm:text-2xl">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-cream-muted">{subtitle}</p>}
        </div>
        {/* Nothing to scroll: two dead arrows are worse than none. */}
        {!(edges.start && edges.end) && (
          <div className="hidden shrink-0 gap-1 sm:flex">
            <RailButton direction="left" disabled={edges.start} onClick={() => nudge(-1)} />
            <RailButton direction="right" disabled={edges.end} onClick={() => nudge(1)} />
          </div>
        )}
      </div>

      <div
        ref={track}
        onScroll={measure}
        className={clsx(
          'no-scrollbar mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1',
          gutter
        )}
      >
        {entries.map(({ item, caption }, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: Math.min(i, 8) * 0.045,
              duration: 0.35,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="flex w-36 shrink-0 snap-start flex-col sm:w-44"
          >
            {/*
              The track stretches its children to a common height. Giving the
              card a flex-1 box of its own is what lets every tile line up
              while the caption keeps its own fixed slot underneath.
            */}
            <div className="flex min-h-0 flex-1 flex-col">
              <ItemCard
                item={item}
                isFavorite={favorites.has(item.id)}
                rating={ratedIds[item.id] ?? null}
                hasOrdered={ordered.has(item.id)}
                onOpen={() => onOpenItem(item.id)}
              />
            </div>
            {captioned && (
              <p className="mt-1.5 line-clamp-2 h-[1.9rem] text-[11px] leading-snug text-cream-muted">
                {caption}
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function RailButton({
  direction, disabled, onClick,
}: {
  direction: 'left' | 'right'
  disabled: boolean
  onClick: () => void
}) {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'left' ? 'Scroll back' : 'Scroll forward'}
      className={clsx(
        'rounded-full border border-ink-line p-1.5 transition-colors',
        disabled
          ? 'cursor-default text-ink-line'
          : 'text-cream-muted hover:border-gold/50 hover:text-gold'
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}
