'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CopyPlus, Loader2, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { Dialog } from '@/components/ui/Dialog'
import { createClient } from '@/lib/supabase/client'
import { longDate, mondayOf, toDate } from '@/lib/format'
import { KIND_RAILS } from '@/components/catalog/kindIcon'
import { ItemPicker } from './ItemPicker'
import type { CatalogItem, StaffPick } from '@/lib/types'

const DAY = 86_400_000

/**
 * The weekly staff picks board. `week_of` is always a Monday, so writing next
 * week's rows is what "changing the picks" means — this week's stay put.
 */
export function StaffPicksEditor({
  catalog, onClose,
}: {
  catalog: CatalogItem[]
  onClose: () => void
}) {
  const weeks = useMemo(
    () => [
      { key: mondayOf(), label: 'This week' },
      { key: mondayOf(new Date(Date.now() + 7 * DAY)), label: 'Next week' },
    ],
    []
  )

  const [week, setWeek] = useState(weeks[0].key)
  const [picks, setPicks] = useState<StaffPick[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const byId = useMemo(() => new Map(catalog.map((i) => [i.id, i])), [catalog])

  const load = useCallback(async (forWeek: string) => {
    const { data, error: err } = await createClient()
      .from('staff_picks')
      .select('*')
      .eq('week_of', forWeek)
      .order('sort_order')
    // Even on failure the editor has to leave the loading state, or the
    // spinner sits there under the error message forever.
    setError(err ? 'Could not load the board.' : null)
    setPicks((data ?? []) as StaffPick[])
  }, [])

  useEffect(() => {
    setPicks(null)
    load(week)
  }, [week, load])

  async function add(item: CatalogItem) {
    setBusy(true)
    setError(null)
    const { data, error: err } = await createClient()
      .from('staff_picks')
      .insert({
        item_id: item.id,
        week_of: week,
        sort_order: picks?.length ?? 0,
      } as never)
      .select('*')
      .single()
    setBusy(false)
    if (err || !data) {
      setError('That did not save.')
      return
    }
    setPicks((prev) => [...(prev ?? []), data as StaffPick])
  }

  async function remove(pick: StaffPick) {
    setPicks((prev) => (prev ?? []).filter((p) => p.id !== pick.id))
    await createClient().from('staff_picks').delete().eq('id', pick.id)
  }

  async function saveBlurb(pick: StaffPick, blurb: string) {
    const trimmed = blurb.trim()
    if (trimmed === (pick.blurb ?? '')) return
    setPicks((prev) =>
      (prev ?? []).map((p) => (p.id === pick.id ? { ...p, blurb: trimmed || null } : p))
    )
    await createClient()
      .from('staff_picks')
      .update({ blurb: trimmed || null })
      .eq('id', pick.id)
  }

  /** Carry the previous week's board forward as a starting point. */
  async function copyPreviousWeek() {
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const previous = mondayOf(new Date(toDate(week).getTime() - 6 * DAY))
    const { data: source } = await supabase
      .from('staff_picks')
      .select('item_id, blurb, sort_order')
      .eq('week_of', previous)
      .order('sort_order')

    if (!source?.length) {
      setBusy(false)
      setError('Nothing on the previous week to copy.')
      return
    }

    const { data, error: err } = await supabase
      .from('staff_picks')
      .insert(source.map((row) => ({ ...row, week_of: week })) as never)
      .select('*')
    setBusy(false)
    if (err) {
      setError('Could not copy that board over.')
      return
    }
    setPicks((prev) => [...(prev ?? []), ...((data ?? []) as StaffPick[])])
  }

  const grouped = KIND_RAILS.map(({ kind, title }) => ({
    kind,
    title,
    rows: (picks ?? []).filter((p) => byId.get(p.item_id)?.kind === kind),
  }))
  // A pick whose bottle is no longer in the catalog list still needs a way out.
  const orphans = (picks ?? []).filter((p) => !byId.has(p.item_id))
  const chosen = new Set((picks ?? []).map((p) => p.item_id))

  return (
    <Dialog
      title="Staff picks"
      description={`The board members see under Staff Picks. ${longDate(week)} onward.`}
      onClose={onClose}
      wide
    >
      <div className="space-y-5">
        <div className="flex gap-2">
          {weeks.map((w) => (
            <button
              key={w.key}
              onClick={() => setWeek(w.key)}
              className={clsx(
                'rounded-full border px-3.5 py-1.5 text-xs transition-colors',
                week === w.key
                  ? 'border-gold bg-gold/10 text-gold-bright'
                  : 'border-ink-line text-cream-muted hover:border-gold/40 hover:text-cream'
              )}
            >
              {w.label}
            </button>
          ))}
        </div>

        {picks === null ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-cream-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading the board…
          </div>
        ) : (
          <>
            {picks.length === 0 && (
              <div className="card px-5 py-8 text-center">
                <p className="text-sm text-cream-muted">Nothing picked for this week yet.</p>
                <button
                  onClick={copyPreviousWeek}
                  disabled={busy}
                  className="btn-ghost mx-auto mt-3"
                >
                  <CopyPlus className="h-4 w-4" />
                  Copy the previous week
                </button>
              </div>
            )}

            {grouped
              .filter((g) => g.rows.length > 0)
              .map((group) => (
                <div key={group.kind}>
                  <p className="label mb-2">{group.title}</p>
                  <ul className="space-y-2">
                    {group.rows.map((pick) => (
                      <PickRow
                        key={pick.id}
                        pick={pick}
                        name={byId.get(pick.item_id)?.name ?? 'Unknown bottle'}
                        detail={
                          byId.get(pick.item_id)?.subcategory ??
                          byId.get(pick.item_id)?.category ??
                          ''
                        }
                        onBlurb={(v) => saveBlurb(pick, v)}
                        onRemove={() => remove(pick)}
                      />
                    ))}
                  </ul>
                </div>
              ))}

            {orphans.length > 0 && (
              <div>
                <p className="label mb-2">No longer in the catalog</p>
                <ul className="space-y-2">
                  {orphans.map((pick) => (
                    <PickRow
                      key={pick.id}
                      pick={pick}
                      name="Removed bottle"
                      detail="Members will not see this pick."
                      onBlurb={(v) => saveBlurb(pick, v)}
                      onRemove={() => remove(pick)}
                    />
                  ))}
                </ul>
              </div>
            )}

            <div className="border-t border-ink-line pt-5">
              <p className="label mb-2">Add a pick</p>
              <ItemPicker
                catalog={catalog}
                exclude={chosen}
                placeholder="Search the catalog by name or category"
                onPick={add}
              />
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </Dialog>
  )
}

function PickRow({
  pick, name, detail, onBlurb, onRemove,
}: {
  pick: StaffPick
  name: string
  detail: string
  onBlurb: (value: string) => void
  onRemove: () => void
}) {
  const [blurb, setBlurb] = useState(pick.blurb ?? '')

  return (
    <li className="card p-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-cream">{name}</p>
          <p className="truncate text-[11px] text-cream-muted">{detail}</p>
        </div>
        <button
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          className="shrink-0 rounded-lg p-1.5 text-cream-muted transition-colors hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <input
        value={blurb}
        onChange={(e) => setBlurb(e.target.value)}
        onBlur={() => onBlurb(blurb)}
        placeholder="One line on why — members see this under the tile."
        className="input mt-2 text-[13px]"
      />
    </li>
  )
}
