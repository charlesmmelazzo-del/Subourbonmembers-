'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import { money } from '@/lib/format'
import { BottomSheet } from './BottomSheet'
import { LuckyDice } from './LuckyDice'
import { iconForKind } from './kindIcon'
import type { CatalogItem, CatalogItemFull, CatalogKind } from '@/lib/types'

type Pool = 'anything' | CatalogKind

const POOLS: Array<{ key: Pool; label: string }> = [
  { key: 'anything', label: 'Anything' },
  { key: 'cocktail', label: 'Cocktails' },
  { key: 'spirit', label: 'Spirit' },
  { key: 'beer', label: 'Beer' },
  { key: 'wine', label: 'Wine' },
]

/** Untried bottles are four times as likely to come up as ones you've had. */
const NEW_TO_YOU_WEIGHT = 4

type Props = {
  items: CatalogItemFull[]
  favorites: Set<string>
  ratedIds: Record<string, number | null>
  ordered: Set<string>
  onOpenItem: (id: string) => void
  onClose: () => void
  takesEscape: boolean
}

export function LuckyPanel({
  items, favorites, ratedIds, ordered, onOpenItem, onClose, takesEscape,
}: Props) {
  const [pool, setPool] = useState<Pool>('anything')
  const [state, setState] = useState<'idle' | 'rolling' | 'settled'>('idle')
  const [won, setWon] = useState<CatalogItem | null>(null)
  const [pending, setPending] = useState<CatalogItem | null>(null)

  // Slider bounds come from the menu itself, rounded out to whole dollars.
  const ceiling = useMemo(() => {
    const top = Math.max(...items.map((i) => i.price_cents ?? 0), 0)
    return Math.max(Math.ceil(top / 500) * 500, 500)
  }, [items])
  const [maxCents, setMaxCents] = useState(ceiling)

  const anyPrice = maxCents >= ceiling

  const candidates = useMemo(() => {
    return items.filter((item) => {
      if (pool !== 'anything' && item.kind !== pool) return false
      if (anyPrice) return true
      // A bottle with no price on file can't be held to a price cap, so it
      // only turns up when the cap is off.
      return item.price_cents !== null && item.price_cents <= maxCents
    })
  }, [items, pool, maxCents, anyPrice])

  const untriedCount = useMemo(
    () => candidates.filter((i) => isUntried(i.id, favorites, ratedIds, ordered)).length,
    [candidates, favorites, ratedIds, ordered]
  )

  function roll() {
    if (candidates.length === 0) return
    // The pick happens now; the die is just the wait. Choosing up front means
    // the roll can never land on nothing.
    setPending(draw(candidates, favorites, ratedIds, ordered, won?.id))
    setWon(null)
    setState('rolling')
  }

  function settled() {
    setWon(pending)
    setState('settled')
  }

  return (
    <BottomSheet
      label="I'm Feeling Lucky"
      eyebrow="Let the bar decide"
      title="I'm Feeling Lucky"
      blurb="Pick a lane, set a ceiling, roll. Things you have never had come up more often."
      onClose={onClose}
      takesEscape={takesEscape}
      className="sm:w-[min(36rem,100%)]"
    >
      <div className="px-5 sm:px-7">
        {/* ---- What to roll for ---- */}
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {POOLS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setPool(key); setState('idle'); setWon(null) }}
              className={clsx(
                'shrink-0 rounded-full border px-3.5 py-1.5 text-xs transition-colors',
                pool === key
                  ? 'border-gold bg-gold/10 text-gold-bright'
                  : 'border-ink-line text-cream-muted hover:border-gold/40 hover:text-cream'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ---- Price ceiling ---- */}
        <div className="mt-5">
          <div className="flex items-baseline justify-between">
            <label htmlFor="lucky-price" className="label">
              Price ceiling
            </label>
            <span className="text-sm text-cream">
              {anyPrice ? 'Any price' : `Up to ${money(maxCents)}`}
            </span>
          </div>
          <input
            id="lucky-price"
            type="range"
            min={500}
            max={ceiling}
            step={100}
            value={maxCents}
            onChange={(e) => { setMaxCents(Number(e.target.value)); setState('idle'); setWon(null) }}
            className="mt-2 w-full accent-gold"
          />
        </div>

        <p className="mt-3 text-center text-[11px] text-cream-muted">
          {candidates.length === 0
            ? 'Nothing matches that. Loosen the price, or pick another lane.'
            : `${candidates.length} in the running · ${untriedCount} you have never had`}
        </p>

        {/* ---- The die ---- */}
        <div className="mt-5 flex justify-center">
          <LuckyDice
            state={state}
            onRoll={roll}
            onSettled={settled}
            disabled={candidates.length === 0}
          />
        </div>

        {/* ---- What came up ---- */}
        <AnimatePresence mode="wait">
          {won && state === 'settled' && (
            <motion.div
              key={won.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="mb-2 mt-5"
            >
              <Result
                item={won}
                untried={isUntried(won.id, favorites, ratedIds, ordered)}
                onOpen={() => onOpenItem(won.id)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BottomSheet>
  )
}

function Result({
  item, untried, onOpen,
}: {
  item: CatalogItem
  untried: boolean
  onOpen: () => void
}) {
  const Placeholder = iconForKind(item.kind)

  return (
    <button
      onClick={onOpen}
      className="group flex w-full items-stretch gap-4 overflow-hidden rounded-xl border border-gold/40 bg-gold/[0.05] text-left transition-colors hover:border-gold/70"
    >
      <span className="relative w-24 shrink-0 bg-vault sm:w-28">
        {item.hero_image_url ? (
          <Image
            src={item.hero_image_url}
            alt=""
            fill
            sizes="112px"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <span className="grid h-full place-items-center">
            <Placeholder className="h-8 w-8 text-gold/25" strokeWidth={0.9} />
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1 py-3.5 pr-4">
        <span className="label block">
          {item.subcategory ?? item.category}
          {untried && ' · New to you'}
        </span>
        <span className="mt-1 block font-display text-lg leading-tight text-cream group-hover:text-gold-bright">
          {item.name}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 text-xs text-cream-muted">
          {item.abv && <span>{item.abv}%</span>}
          {item.region && <span className="truncate">{item.region}</span>}
          {item.price_cents !== null && <span>{money(item.price_cents)}</span>}
        </span>
        <span className="mt-2 block text-[11px] text-gold/80">Tap for the full sheet →</span>
      </span>
    </button>
  )
}

function isUntried(
  id: string,
  favorites: Set<string>,
  ratedIds: Record<string, number | null>,
  ordered: Set<string>
): boolean {
  return !favorites.has(id) && !(id in ratedIds) && !ordered.has(id)
}

/**
 * Weighted random draw. Never-tried items carry more weight, so they come up
 * more often without ever being the only thing that can — which is what makes
 * it a roll rather than a recommendation.
 */
function draw(
  pool: CatalogItem[],
  favorites: Set<string>,
  ratedIds: Record<string, number | null>,
  ordered: Set<string>,
  avoidId?: string
): CatalogItem {
  // Rolling the same bottle twice running feels broken, so drop the previous
  // result — unless it is the only thing left.
  const eligible = pool.length > 1 && avoidId
    ? pool.filter((i) => i.id !== avoidId)
    : pool

  const weights = eligible.map((i) =>
    isUntried(i.id, favorites, ratedIds, ordered) ? NEW_TO_YOU_WEIGHT : 1
  )
  const total = weights.reduce((a, b) => a + b, 0)

  let ticket = Math.random() * total
  for (let i = 0; i < eligible.length; i += 1) {
    ticket -= weights[i]
    if (ticket <= 0) return eligible[i]
  }
  return eligible[eligible.length - 1]
}
