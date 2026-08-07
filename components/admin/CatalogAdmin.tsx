'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Pencil, Plus, RotateCcw, ScanLine, Search, Wine } from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES } from '@/lib/catalog'
import { money } from '@/lib/format'
import { BottleScanner } from './BottleScanner'
import { CatalogItemForm } from './CatalogItemForm'
import type { CatalogItem, Producer } from '@/lib/types'

type View = 'active' | 'eightysixed' | 'draft' | 'locker_only'

export function CatalogAdmin({
  items, producers,
}: {
  items: CatalogItem[]
  producers: Producer[]
}) {
  const router = useRouter()
  const [view, setView] = useState<View>('active')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [editing, setEditing] = useState<Partial<CatalogItem> | null>(null)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((i) => {
      if (i.status !== view) return false
      if (category && i.category !== category) return false
      if (!q) return true
      return (
        i.name.toLowerCase().includes(q) ||
        i.region?.toLowerCase().includes(q) ||
        i.barcode?.includes(q)
      )
    })
  }, [items, view, category, query])

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const i of items) map[i.status] = (map[i.status] ?? 0) + 1
    return map
  }, [items])

  async function setStatus(item: CatalogItem, status: CatalogItem['status']) {
    await createClient()
      .from('catalog_items')
      .update({
        status,
        eightysixed_at: status === 'eightysixed' ? new Date().toISOString() : null,
      })
      .eq('id', item.id)
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">The backbar</p>
          <h1 className="mt-1.5 font-display text-3xl sm:text-4xl">The List</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setScanning(true)} className="btn-gold px-3">
            <ScanLine className="h-4 w-4" />
            Scan a bottle
          </button>
          <button
            onClick={() => setEditing({ status: 'draft', kind: 'spirit', specs: {} })}
            className="btn-ghost px-3"
          >
            <Plus className="h-4 w-4" />
            Add by hand
          </button>
        </div>
      </header>

      {/* ---- Status tabs ---- */}
      <div className="mb-4 flex flex-wrap gap-2">
        {([
          ['active', 'On the backbar'],
          ['draft', 'Drafts'],
          ['eightysixed', "86'd"],
          ['locker_only', 'Locker only'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={clsx(
              'rounded-full border px-3.5 py-1.5 text-xs transition-colors',
              view === key
                ? 'border-gold bg-gold/10 text-gold-bright'
                : 'border-ink-line text-cream-muted hover:border-gold/40 hover:text-cream'
            )}
          >
            {label}
            <span className="ml-1.5 opacity-60">{counts[key] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[15rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, region, or barcode"
            className="input pl-9"
            type="search"
          />
        </div>
        <select
          value={category ?? ''}
          onChange={(e) => setCategory(e.target.value || null)}
          className="input w-auto"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <p className="mb-3 text-xs text-cream-muted">{visible.length} bottles</p>

      {visible.length === 0 ? (
        <div className="card px-6 py-16 text-center text-sm text-cream-muted">
          Nothing here. Scan a bottle to start.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {visible.map((item) => (
            <li
              key={item.id}
              className="card group flex items-center gap-3 p-3.5 transition-colors hover:border-gold/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ink-line bg-vault">
                <Wine className="h-4 w-4 text-gold/50" strokeWidth={1.2} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-cream">{item.name}</p>
                <p className="truncate text-[11px] text-cream-muted">
                  {item.subcategory ?? item.category}
                  {item.abv && ` · ${item.abv}%`}
                  {item.region && ` · ${item.region}`}
                  {Object.keys(item.specs ?? {}).length > 0 &&
                    ` · ${Object.keys(item.specs).length} specs`}
                </p>
              </div>

              <span className="hidden shrink-0 text-sm text-cream-muted sm:block">
                {money(item.price_cents)}
              </span>

              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => setEditing(item)}
                  aria-label={`Edit ${item.name}`}
                  className="rounded-lg p-2 text-cream-muted transition-colors hover:text-gold"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {item.status === 'eightysixed' ? (
                  <button
                    onClick={() => setStatus(item, 'active')}
                    aria-label={`Restore ${item.name}`}
                    className="rounded-lg p-2 text-cream-muted transition-colors hover:text-gold"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => setStatus(item, 'eightysixed')}
                    aria-label={`86 ${item.name}`}
                    className="rounded-lg p-2 text-cream-muted transition-colors hover:text-red-400"
                  >
                    <Ban className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {scanning && (
        <BottleScanner
          onClose={() => setScanning(false)}
          onDraft={(draft) => { setScanning(false); setEditing(draft) }}
        />
      )}

      {editing && (
        <CatalogItemForm
          item={editing}
          producers={producers}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh() }}
        />
      )}
    </div>
  )
}
