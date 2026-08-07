'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { Heart, StickyNote, Wine } from 'lucide-react'
import clsx from 'clsx'
import type { CatalogItemFull } from '@/lib/types'

export function ItemCard({
  item, isFavorite, rating, hasOrdered, onOpen,
}: {
  item: CatalogItemFull
  isFavorite: boolean
  rating: number | null
  hasOrdered: boolean
  onOpen: () => void
}) {
  return (
    <motion.button
      layout
      onClick={onOpen}
      className="group relative overflow-hidden rounded-xl border border-ink-line bg-ink-card text-left transition-colors duration-base hover:border-gold/45"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-vault">
        {item.hero_image_url ? (
          <Image
            src={item.hero_image_url}
            alt=""
            fill
            sizes="(max-width:640px) 45vw, (max-width:1280px) 30vw, 22vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Wine className="h-10 w-10 text-gold/20" strokeWidth={0.8} />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink-card via-ink-card/60 to-transparent" />

        {/* Personal state, top right */}
        <div className="absolute right-2 top-2 flex flex-col items-end gap-1.5">
          {isFavorite && (
            <span className="rounded-full bg-ink/75 p-1.5 backdrop-blur">
              <Heart className="h-3 w-3 fill-gold text-gold" />
            </span>
          )}
          {rating !== null && (
            <span className="rounded-full bg-ink/75 p-1.5 backdrop-blur">
              <StickyNote className="h-3 w-3 text-gold" />
            </span>
          )}
        </div>

        {item.status === 'eightysixed' && (
          <span className="absolute left-2 top-2 rounded bg-ink/80 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-cream-muted backdrop-blur">
            86'd
          </span>
        )}
      </div>

      <div className="relative -mt-8 p-3">
        <p className="line-clamp-2 font-display text-[15px] leading-tight text-cream">
          {item.name}
        </p>
        <p className="mt-1 truncate text-[10px] uppercase tracking-[0.14em] text-cream-muted">
          {item.subcategory ?? item.category}
        </p>
        <p className="mt-1.5 flex items-center gap-2 text-[11px] text-cream-muted">
          {item.abv && <span>{item.abv}%</span>}
          {item.region && <span className="truncate">{item.region}</span>}
        </p>
        {hasOrdered && (
          <p className={clsx(
            'mt-1.5 text-[10px] uppercase tracking-wider text-gold/70'
          )}>
            You&apos;ve had this
          </p>
        )}
      </div>
    </motion.button>
  )
}
