'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { GripVertical, Loader2, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ItemPicker } from './ItemPicker'
import type { CatalogItem, ItemRecommendation } from '@/lib/types'

/**
 * Hand-curated "drink this next" links for one bottle. These outrank anything
 * `recommended_with()` works out from favorites, which is the point — the bar
 * gets the last word on what goes with what.
 *
 * Writes land immediately rather than on the parent form's save: these are
 * rows in their own table, and the bottle has to exist before it can be
 * pointed at.
 */
export function ItemRecommendations({
  itemId, catalog,
}: {
  itemId: string
  catalog: CatalogItem[]
}) {
  const [rows, setRows] = useState<ItemRecommendation[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const byId = useMemo(() => new Map(catalog.map((i) => [i.id, i])), [catalog])

  const load = useCallback(async () => {
    const { data, error: err } = await createClient()
      .from('item_recommendations')
      .select('*')
      .eq('item_id', itemId)
      .order('sort_order')
    if (err) setError('Could not load the pairings.')
    else setRows((data ?? []) as ItemRecommendation[])
  }, [itemId])

  useEffect(() => { load() }, [load])

  async function add(pick: CatalogItem) {
    setError(null)
    const row = {
      item_id: itemId,
      recommended_item_id: pick.id,
      sort_order: rows?.length ?? 0,
      note: null,
    }
    setRows((prev) => [...(prev ?? []), { ...row, created_by: null, created_at: '' }])
    const { error: err } = await createClient()
      .from('item_recommendations')
      .insert(row as never)
    if (err) {
      setError('That did not save.')
      load()
    }
  }

  async function remove(row: ItemRecommendation) {
    setRows((prev) => (prev ?? []).filter((r) => r.recommended_item_id !== row.recommended_item_id))
    await createClient()
      .from('item_recommendations')
      .delete()
      .eq('item_id', itemId)
      .eq('recommended_item_id', row.recommended_item_id)
  }

  async function saveNote(row: ItemRecommendation, note: string) {
    const trimmed = note.trim()
    if (trimmed === (row.note ?? '')) return
    setRows((prev) =>
      (prev ?? []).map((r) =>
        r.recommended_item_id === row.recommended_item_id ? { ...r, note: trimmed || null } : r
      )
    )
    await createClient()
      .from('item_recommendations')
      .update({ note: trimmed || null })
      .eq('item_id', itemId)
      .eq('recommended_item_id', row.recommended_item_id)
  }

  /** Moving a row rewrites every sort_order, which keeps them contiguous. */
  async function move(index: number, delta: number) {
    const next = [...(rows ?? [])]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setRows(next.map((r, i) => ({ ...r, sort_order: i })))

    const supabase = createClient()
    await Promise.all(
      next.map((r, i) =>
        supabase
          .from('item_recommendations')
          .update({ sort_order: i })
          .eq('item_id', itemId)
          .eq('recommended_item_id', r.recommended_item_id)
      )
    )
  }

  const chosen = new Set([itemId, ...(rows ?? []).map((r) => r.recommended_item_id)])

  return (
    <div className="border-t border-ink-line pt-5">
      <p className="label mb-1">Recommends</p>
      <p className="mb-4 text-[11px] text-cream-muted">
        Shown to members under &ldquo;If you like this&rdquo;, above anything the favorites
        maths comes up with. Saved as you go.
      </p>

      {rows === null ? (
        <div className="flex items-center gap-2 py-4 text-xs text-cream-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading…
        </div>
      ) : (
        <ul className="mb-4 space-y-2">
          {rows.length === 0 && (
            <li className="text-xs text-cream-muted">
              Nothing paired yet. Members will still see co-favorited bottles here.
            </li>
          )}
          {rows.map((row, i) => {
            const target = byId.get(row.recommended_item_id)
            return (
              <li key={row.recommended_item_id} className="card p-3">
                <div className="flex items-start gap-2">
                  <div className="flex shrink-0 flex-col text-cream-muted">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label="Move up"
                      className="px-1 leading-none transition-colors hover:text-gold disabled:opacity-25"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === rows.length - 1}
                      aria-label="Move down"
                      className="px-1 leading-none transition-colors hover:text-gold disabled:opacity-25"
                    >
                      ▼
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-cream">
                      {target?.name ?? 'Removed bottle'}
                    </p>
                    <p className="truncate text-[11px] text-cream-muted">
                      {target ? target.subcategory ?? target.category : 'No longer in the catalog'}
                      {target && target.status !== 'active' && ` · ${target.status}`}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(row)}
                    aria-label={`Remove ${target?.name ?? 'pairing'}`}
                    className="shrink-0 rounded-lg p-1.5 text-cream-muted transition-colors hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <NoteField row={row} onSave={(v) => saveNote(row, v)} />
              </li>
            )
          })}
        </ul>
      )}

      <ItemPicker
        catalog={catalog}
        exclude={chosen}
        placeholder="Pair with another bottle — search by name"
        onPick={add}
      />

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  )
}

function NoteField({
  row, onSave,
}: {
  row: ItemRecommendation
  onSave: (value: string) => void
}) {
  const [note, setNote] = useState(row.note ?? '')
  return (
    <div className="mt-2 flex items-center gap-2">
      <GripVertical className="h-3 w-3 shrink-0 text-ink-line" aria-hidden />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => onSave(note)}
        placeholder="Why — one line, shown under the tile."
        className="input text-[13px]"
      />
    </div>
  )
}
