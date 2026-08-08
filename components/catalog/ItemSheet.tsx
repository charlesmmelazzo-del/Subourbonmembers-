'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Heart, ListPlus, Share2, StickyNote, X,
} from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase/client'
import { populatedSpecs, extraSpecs } from '@/lib/catalog'
import { useScrollLock } from '@/lib/useScrollLock'
import { shortDate } from '@/lib/format'
import { DiamondRule } from '@/components/ui/Logo'
import { iconForKind } from './kindIcon'
import { RecommendedWith } from './RecommendedWith'
import { TastingNoteEditor } from './TastingNoteEditor'
import { AddToListDialog } from './AddToListDialog'
import { ShareDialog } from './ShareDialog'
import type { CatalogItemFull, TastingNote } from '@/lib/types'

type Props = {
  item: CatalogItemFull
  memberId: string
  isFavorite: boolean
  onToggleFavorite: (on: boolean) => void
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
  position?: { index: number; total: number }
  /** Jump the sheet to another bottle, from the recommendation rail. */
  onOpenItem?: (id: string) => void
}

export function ItemSheet({
  item, memberId, isFavorite, onToggleFavorite, onClose, onPrev, onNext, position, onOpenItem,
}: Props) {
  const [note, setNote] = useState<TastingNote | null>(null)
  const [orderDates, setOrderDates] = useState<string[]>([])
  const [panel, setPanel] = useState<'note' | 'list' | 'share' | null>(null)
  const [busy, setBusy] = useState(false)

  // Per-item member state. Refetched whenever prev/next changes the item.
  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    Promise.all([
      supabase
        .from('tasting_notes')
        .select('*')
        .eq('member_id', memberId)
        .eq('item_id', item.id)
        .maybeSingle(),
      supabase
        .from('sales_transactions')
        .select('transacted_at')
        .eq('member_id', memberId)
        .eq('item_id', item.id)
        .order('transacted_at', { ascending: false }),
    ]).then(([noteRes, salesRes]) => {
      if (cancelled) return
      setNote((noteRes.data as TastingNote) ?? null)
      setOrderDates((salesRes.data ?? []).map((r) => r.transacted_at as string))
    })

    // Engagement tracking — what the admin panel reports on.
    supabase.from('member_activity').insert({
      member_id: memberId,
      kind: 'view_spirit',
      entity_type: 'catalog_item',
      entity_id: item.id,
    } as never).then(() => {})

    return () => { cancelled = true }
  }, [item.id, memberId])

  useScrollLock()

  // Keyboard: escape closes, arrows flip through the filtered list.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (panel) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev?.()
      if (e.key === 'ArrowRight') onNext?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onPrev, onNext, panel])

  async function toggleFavorite() {
    setBusy(true)
    const supabase = createClient()
    const next = !isFavorite
    onToggleFavorite(next)
    if (next) {
      await supabase.from('favorites').insert({ member_id: memberId, item_id: item.id } as never)
    } else {
      await supabase.from('favorites').delete()
        .eq('member_id', memberId).eq('item_id', item.id)
    }
    setBusy(false)
  }

  const specs = populatedSpecs(item.category, item.subcategory, item.specs)
  const extras = extraSpecs(item.category, item.subcategory, item.specs)
  const images = item.media?.filter((m) => m.kind === 'image') ?? []
  const videos = item.media?.filter((m) => m.kind === 'youtube') ?? []
  const Placeholder = iconForKind(item.kind)

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-ink/85 backdrop-blur-sm"
      />

      {/*
        Sheet — bottom sheet on mobile, centered panel on desktop.
        Centering is done by this flex wrapper rather than -translate-x-1/2:
        Framer Motion writes an inline `transform` for its animation, which
        would silently override a Tailwind translate class and leave the panel
        offset by half its size.
      */}
      <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={item.name}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.4 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 120 || info.velocity.y > 600) onClose()
          }}
          initial={{ opacity: 0, y: 40, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.985 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-ink-line bg-ink-raised shadow-vault sm:max-h-[88dvh] sm:w-[min(46rem,100%)] sm:rounded-2xl"
        >
        {/* Drag handle, mobile only */}
        <div className="flex justify-center pt-2 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-ink-line" />
        </div>

        {/* Controls */}
        <div className="absolute right-3 top-3 z-10 flex gap-1.5">
          {position && (
            <span className="hidden rounded-full bg-ink/70 px-2.5 py-1 text-[10px] text-cream-muted backdrop-blur sm:block">
              {position.index} / {position.total}
            </span>
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full bg-ink/70 p-1.5 text-cream backdrop-blur transition-colors hover:text-gold"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {onPrev && (
          <button
            onClick={onPrev}
            aria-label="Previous bottle"
            className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-ink/70 p-2 text-cream backdrop-blur transition-colors hover:text-gold sm:block"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {onNext && (
          <button
            onClick={onNext}
            aria-label="Next bottle"
            className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-ink/70 p-2 text-cream backdrop-blur transition-colors hover:text-gold sm:block"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {/* ---- Hero ---- */}
          <div className="relative h-44 shrink-0 bg-vault sm:h-56">
            {item.hero_image_url ? (
              <Image
                src={item.hero_image_url}
                alt=""
                fill
                sizes="736px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Placeholder className="h-14 w-14 text-gold/20" strokeWidth={0.7} />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink-raised via-ink-raised/50 to-transparent" />
          </div>

          <div className="relative -mt-14 px-5 pb-8 sm:px-8">
            {/* ---- Title ---- */}
            <p className="label">
              {item.category}
              {item.subcategory && ` · ${item.subcategory}`}
              {item.status === 'eightysixed' && ' · No longer stocked'}
            </p>
            <h2 className="mt-2 font-display text-2xl leading-tight sm:text-3xl">{item.name}</h2>
            {item.producer && (
              <p className="mt-1.5 text-sm text-cream/70">{item.producer.name}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-cream-muted">
              {item.abv && <span>{item.abv}% ABV · {(item.abv * 2).toFixed(0)}°</span>}
              {item.age_statement && <span>{item.age_statement}</span>}
              {item.vintage && <span>{item.vintage}</span>}
              {(item.region || item.country) && (
                <span>{[item.region, item.country].filter(Boolean).join(', ')}</span>
              )}
            </div>

            {/* ---- Member actions ---- */}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={toggleFavorite}
                disabled={busy}
                className={clsx(
                  'btn flex-1 gap-2 border sm:flex-none',
                  isFavorite
                    ? 'border-gold bg-gold/15 text-gold-bright'
                    : 'border-ink-line text-cream hover:border-gold/50'
                )}
              >
                <Heart className={clsx('h-4 w-4', isFavorite && 'fill-current')} />
                {isFavorite ? 'Favorited' : 'Favorite'}
              </button>
              <button onClick={() => setPanel('note')} className="btn-ghost flex-1 sm:flex-none">
                <StickyNote className="h-4 w-4" />
                {note ? 'Edit note' : 'Add note'}
              </button>
              <button onClick={() => setPanel('list')} className="btn-ghost flex-1 sm:flex-none">
                <ListPlus className="h-4 w-4" />
                List
              </button>
              <button onClick={() => setPanel('share')} className="btn-ghost flex-1 sm:flex-none">
                <Share2 className="h-4 w-4" />
                Share
              </button>
            </div>

            {/* ---- Description ---- */}
            {item.description && (
              <p className="mt-6 text-[15px] leading-relaxed text-cream/85">{item.description}</p>
            )}

            {item.tasting_notes && (
              <div className="mt-5 rounded-lg border-l-2 border-gold/50 bg-gold/[0.04] px-4 py-3">
                <p className="label mb-1.5">House notes</p>
                <p className="text-sm leading-relaxed italic text-cream/80">
                  {item.tasting_notes}
                </p>
              </div>
            )}

            {/* ---- Your note ---- */}
            {note && (
              <div className="mt-5 card p-4">
                <div className="flex items-center justify-between">
                  <p className="label">Your note</p>
                  {note.rating && (
                    <span className="text-xs text-gold">
                      {'●'.repeat(note.rating)}
                      <span className="text-ink-line">{'●'.repeat(5 - note.rating)}</span>
                    </span>
                  )}
                </div>
                <dl className="mt-3 space-y-1.5 text-sm">
                  {note.nose && <NoteLine label="Nose" value={note.nose} />}
                  {note.palate && <NoteLine label="Palate" value={note.palate} />}
                  {note.finish && <NoteLine label="Finish" value={note.finish} />}
                  {note.body && <NoteLine label="Notes" value={note.body} />}
                </dl>
              </div>
            )}

            {/* ---- Order history ---- */}
            {orderDates.length > 0 && (
              <div className="mt-5">
                <DiamondRule className="mb-4" />
                <p className="label mb-2">
                  You have ordered this {orderDates.length}{' '}
                  {orderDates.length === 1 ? 'time' : 'times'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {orderDates.slice(0, 24).map((d, i) => (
                    <span
                      key={`${d}-${i}`}
                      className="rounded border border-ink-line px-2 py-0.5 text-[11px] text-cream-muted"
                    >
                      {shortDate(d)}
                    </span>
                  ))}
                  {orderDates.length > 24 && (
                    <span className="px-2 py-0.5 text-[11px] text-cream-muted">
                      +{orderDates.length - 24} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ---- Technical ---- */}
            {(specs.length > 0 || extras.length > 0) && (
              <div className="mt-7">
                <DiamondRule className="mb-5" />
                <p className="label mb-4">Technical</p>
                <dl className="space-y-0">
                  {[...specs, ...extras.map((e) => ({ ...e, format: 'text' as const, hint: undefined }))].map(
                    (spec) => (
                      <div
                        key={spec.key}
                        className={clsx(
                          'border-b border-ink-line/60 py-2.5',
                          spec.format === 'prose'
                            ? 'block'
                            : 'grid grid-cols-[9.5rem_1fr] gap-4 sm:grid-cols-[11rem_1fr]'
                        )}
                      >
                        <dt className="text-xs uppercase tracking-[0.12em] text-cream-muted">
                          {spec.label}
                          {'hint' in spec && spec.hint && (
                            <span className="ml-1 hidden normal-case tracking-normal opacity-50 sm:inline">
                              ({spec.hint})
                            </span>
                          )}
                        </dt>
                        <dd
                          className={clsx(
                            'text-sm text-cream/90',
                            spec.format === 'prose' && 'mt-1.5 leading-relaxed'
                          )}
                        >
                          {spec.value}
                        </dd>
                      </div>
                    )
                  )}
                </dl>
              </div>
            )}

            {/* ---- Producer ---- */}
            {item.producer && (
              <div className="mt-7">
                <DiamondRule className="mb-5" />
                <p className="label mb-3">The producer</p>
                <h3 className="font-display text-lg">{item.producer.name}</h3>
                <p className="mt-1 text-xs text-cream-muted">
                  {[item.producer.region, item.producer.country].filter(Boolean).join(', ')}
                  {item.producer.founded_year && ` · est. ${item.producer.founded_year}`}
                </p>
                {item.producer.description && (
                  <p className="mt-3 text-sm leading-relaxed text-cream/80">
                    {item.producer.description}
                  </p>
                )}
                {item.producer.website && (
                  <a
                    href={item.producer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs text-gold hover:text-gold-bright"
                  >
                    {item.producer.website.replace(/^https?:\/\//, '')} ↗
                  </a>
                )}
              </div>
            )}

            {/* ---- Drink this next ---- */}
            {onOpenItem && <RecommendedWith itemId={item.id} onOpenItem={onOpenItem} />}

            {/* ---- Media ---- */}
            {(images.length > 0 || videos.length > 0) && (
              <div className="mt-7">
                <DiamondRule className="mb-5" />
                <p className="label mb-3">More</p>
                <div className="space-y-4">
                  {videos.map((v) => (
                    <figure key={v.id}>
                      <div className="aspect-video overflow-hidden rounded-lg border border-ink-line">
                        <iframe
                          src={toEmbedUrl(v.url)}
                          title={v.caption ?? 'Video'}
                          allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                          allowFullScreen
                          loading="lazy"
                          className="h-full w-full"
                        />
                      </div>
                      {v.caption && (
                        <figcaption className="mt-2 text-xs text-cream-muted">{v.caption}</figcaption>
                      )}
                    </figure>
                  ))}
                  {images.map((img) => (
                    <figure key={img.id}>
                      <div className="relative aspect-video overflow-hidden rounded-lg border border-ink-line">
                        <Image src={img.url} alt={img.caption ?? ''} fill sizes="736px" className="object-cover" />
                      </div>
                      {img.caption && (
                        <figcaption className="mt-2 text-xs text-cream-muted">{img.caption}</figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        </motion.div>
      </div>

      {/* ---- Sub-panels ---- */}
      {panel === 'note' && (
        <TastingNoteEditor
          item={item}
          memberId={memberId}
          existing={note}
          onSaved={(saved) => { setNote(saved); setPanel(null) }}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === 'list' && (
        <AddToListDialog item={item} memberId={memberId} onClose={() => setPanel(null)} />
      )}
      {panel === 'share' && (
        <ShareDialog
          memberId={memberId}
          entityType="item"
          entityId={item.id}
          label={item.name}
          onClose={() => setPanel(null)}
        />
      )}
    </>
  )
}

function NoteLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[4rem_1fr] gap-3">
      <dt className="text-xs uppercase tracking-wider text-cream-muted">{label}</dt>
      <dd className="text-cream/85">{value}</dd>
    </div>
  )
}

/** Accepts watch, youtu.be, or embed URLs and returns an embeddable one. */
function toEmbedUrl(url: string): string {
  const id =
    url.match(/[?&]v=([\w-]{11})/)?.[1] ??
    url.match(/youtu\.be\/([\w-]{11})/)?.[1] ??
    url.match(/embed\/([\w-]{11})/)?.[1]
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : url
}
