'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, Inbox, ListMusic, Search, Share2, StickyNote, Wine } from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase/client'
import { shortDate, pluralize } from '@/lib/format'
import { ShareDialog } from './ShareDialog'
import type { MemberList, TastingNote } from '@/lib/types'
import type { CollectionItem } from '@/app/(portal)/collection/page'

type Tab = 'favorites' | 'lists' | 'notes' | 'ordered' | 'shared'

type Props = {
  memberId: string
  initialTab?: string
  favorites: Array<{ created_at: string; item: CollectionItem | null }>
  notes: Array<TastingNote & { item: CollectionItem | null }>
  lists: Array<MemberList & { entries: Array<{ item: CollectionItem | null }> }>
  shares: Array<{
    id: string
    entity_type: string
    entity_id: string
    message: string | null
    created_at: string
    read_at: string | null
    from: { id: string; first_name: string; last_name: string }
  }>
  ordered: Array<{ item: CollectionItem; times: number; last: string }>
}

export function CollectionTabs({
  memberId, initialTab, favorites, notes, lists, shares, ordered,
}: Props) {
  const [tab, setTab] = useState<Tab>((initialTab as Tab) ?? 'favorites')
  const [query, setQuery] = useState('')
  const [sharingList, setSharingList] = useState<MemberList | null>(null)

  // Mark shares read the moment the member looks at them.
  useEffect(() => {
    if (tab !== 'shared') return
    const unread = shares.filter((s) => !s.read_at).map((s) => s.id)
    if (!unread.length) return
    createClient()
      .from('shares')
      .update({ read_at: new Date().toISOString() })
      .in('id', unread)
      .then(() => {})
  }, [tab, shares])

  const q = query.trim().toLowerCase()
  const match = (item: CollectionItem | null) =>
    !q ||
    !!item &&
      (item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.subcategory?.toLowerCase().includes(q) ||
        item.region?.toLowerCase().includes(q))

  const filtered = useMemo(
    () => ({
      favorites: favorites.filter((f) => match(f.item)),
      notes: notes.filter(
        (n) =>
          match(n.item) ||
          [n.nose, n.palate, n.finish, n.body].some((v) => v?.toLowerCase().includes(q))
      ),
      ordered: ordered.filter((o) => match(o.item)),
      lists: lists.filter(
        (l) => !q || l.name.toLowerCase().includes(q) || l.entries.some((e) => match(e.item))
      ),
      shares: shares.filter(
        (s) => !q || `${s.from.first_name} ${s.from.last_name}`.toLowerCase().includes(q)
      ),
    }),
    [favorites, notes, ordered, lists, shares, q] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const tabs: Array<{ key: Tab; label: string; icon: typeof Heart; count: number }> = [
    { key: 'favorites', label: 'Favorites', icon: Heart, count: favorites.length },
    { key: 'lists', label: 'My Lists', icon: ListMusic, count: lists.length },
    { key: 'notes', label: 'Notes', icon: StickyNote, count: notes.length },
    { key: 'ordered', label: "I've Ordered", icon: Wine, count: ordered.length },
    { key: 'shared', label: 'Shared With Me', icon: Inbox, count: shares.length },
  ]

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <p className="label">Yours alone</p>
        <h1 className="mt-1.5 font-display text-3xl sm:text-4xl">My Collection</h1>
      </header>

      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              'flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs transition-colors',
              tab === t.key
                ? 'border-gold bg-gold/10 text-gold-bright'
                : 'border-ink-line text-cream-muted hover:border-gold/40 hover:text-cream'
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            <span className="opacity-60">{t.count}</span>
          </button>
        ))}
      </div>

      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your collection — including the words inside your notes"
          className="input pl-9"
          type="search"
        />
      </div>

      {tab === 'favorites' && (
        <ItemGrid items={filtered.favorites.map((f) => f.item)} empty="Nothing favorited yet." />
      )}

      {tab === 'ordered' && (
        <ItemGrid
          items={filtered.ordered.map((o) => o.item)}
          meta={filtered.ordered.map((o) => `${pluralize(o.times, 'time')} · last ${shortDate(o.last)}`)}
          empty="No order history yet. It arrives with the sales import."
        />
      )}

      {tab === 'notes' && (
        <div className="space-y-3">
          {filtered.notes.length === 0 && <Empty text="No tasting notes yet." />}
          {filtered.notes.map((n) => (
            <Link
              key={n.id}
              href={n.item ? `/spirits?item=${n.item.id}` : '#'}
              className="card block p-4 transition-colors hover:border-gold/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-base">{n.item?.name ?? 'Removed bottle'}</p>
                  <p className="text-[10px] uppercase tracking-wider text-cream-muted">
                    {n.item?.subcategory ?? n.item?.category}
                  </p>
                </div>
                {n.rating && (
                  <span className="shrink-0 text-xs text-gold">
                    {'●'.repeat(n.rating)}
                    <span className="text-ink-line">{'●'.repeat(5 - n.rating)}</span>
                  </span>
                )}
              </div>
              <div className="mt-2.5 space-y-1 text-sm text-cream/80">
                {n.nose && <p><span className="text-cream-muted">Nose · </span>{n.nose}</p>}
                {n.palate && <p><span className="text-cream-muted">Palate · </span>{n.palate}</p>}
                {n.finish && <p><span className="text-cream-muted">Finish · </span>{n.finish}</p>}
                {n.body && <p className="italic text-cream/70">{n.body}</p>}
              </div>
              <p className="mt-2 text-[10px] uppercase tracking-wider text-cream-muted/70">
                {shortDate(n.updated_at)}
              </p>
            </Link>
          ))}
        </div>
      )}

      {tab === 'lists' && (
        <div className="space-y-4">
          {filtered.lists.length === 0 && (
            <Empty text="No lists yet. Open any bottle and tap List to start one." />
          )}
          {filtered.lists.map((list) => (
            <section key={list.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg">{list.name}</h2>
                  <p className="text-xs text-cream-muted">
                    {pluralize(list.entries.length, 'bottle')}
                    {list.description && ` · ${list.description}`}
                  </p>
                </div>
                <button
                  onClick={() => setSharingList(list)}
                  className="btn-ghost shrink-0 px-2.5 py-1.5 text-xs"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Share
                </button>
              </div>
              <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
                {list.entries.map(({ item }) =>
                  item ? (
                    <Link
                      key={item.id}
                      href={`/spirits?item=${item.id}`}
                      className="w-28 shrink-0 rounded-lg border border-ink-line bg-ink-raised p-2 transition-colors hover:border-gold/40"
                    >
                      <p className="line-clamp-3 text-xs leading-tight text-cream">{item.name}</p>
                      <p className="mt-1 text-[9px] uppercase tracking-wider text-cream-muted">
                        {item.subcategory ?? item.category}
                      </p>
                    </Link>
                  ) : null
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {tab === 'shared' && (
        <div className="space-y-3">
          {filtered.shares.length === 0 && <Empty text="Nothing shared with you yet." />}
          {filtered.shares.map((s) => (
            <Link
              key={s.id}
              href={
                s.entity_type === 'item' ? `/spirits?item=${s.entity_id}` : `/collection?tab=lists`
              }
              className={clsx(
                'card block p-4 transition-colors hover:border-gold/40',
                !s.read_at && 'border-gold/30 bg-gold/[0.03]'
              )}
            >
              <p className="text-sm text-cream">
                <span className="text-gold">
                  {s.from.first_name} {s.from.last_name}
                </span>{' '}
                shared {s.entity_type === 'item' ? 'a bottle' : s.entity_type === 'list' ? 'a list' : 'a note'} with you
              </p>
              {s.message && (
                <p className="mt-1.5 text-sm italic leading-relaxed text-cream/75">“{s.message}”</p>
              )}
              <p className="mt-2 text-[10px] uppercase tracking-wider text-cream-muted/70">
                {shortDate(s.created_at)}
              </p>
            </Link>
          ))}
        </div>
      )}

      {sharingList && (
        <ShareDialog
          memberId={memberId}
          entityType="list"
          entityId={sharingList.id}
          label={sharingList.name}
          onClose={() => setSharingList(null)}
        />
      )}
    </div>
  )
}

function ItemGrid({
  items, meta, empty,
}: {
  items: Array<CollectionItem | null>
  meta?: string[]
  empty: string
}) {
  const rows = items.filter(Boolean) as CollectionItem[]
  if (!rows.length) return <Empty text={empty} />

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {rows.map((item, i) => (
        <Link
          key={item.id}
          href={`/spirits?item=${item.id}`}
          className="group overflow-hidden rounded-xl border border-ink-line bg-ink-card transition-colors hover:border-gold/45"
        >
          <div className="relative aspect-[3/4] bg-vault">
            {item.hero_image_url ? (
              <Image
                src={item.hero_image_url}
                alt=""
                fill
                sizes="(max-width:640px) 45vw, 22vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Wine className="h-9 w-9 text-gold/20" strokeWidth={0.8} />
              </div>
            )}
            {item.status === 'eightysixed' && (
              <span className="absolute left-2 top-2 rounded bg-ink/80 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-cream-muted">
                86&apos;d
              </span>
            )}
          </div>
          <div className="p-3">
            <p className="line-clamp-2 font-display text-sm leading-tight">{item.name}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-cream-muted">
              {item.subcategory ?? item.category}
            </p>
            {meta?.[i] && <p className="mt-1 text-[11px] text-gold/70">{meta[i]}</p>}
          </div>
        </Link>
      ))}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="card px-6 py-16 text-center">
      <p className="text-sm text-cream-muted">{text}</p>
    </div>
  )
}
