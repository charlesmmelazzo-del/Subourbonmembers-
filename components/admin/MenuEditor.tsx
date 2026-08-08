'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChevronDown, ChevronUp, Eye, EyeOff, Loader2, Pencil, Plus, RotateCcw, Trash2,
} from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase/client'
import { MENU_GROUPS, TAXONOMY } from '@/lib/catalog'
import type { CatalogKind, MenuLevel, MenuNode } from '@/lib/types'

const KINDS: CatalogKind[] = ['cocktail', 'spirit', 'beer', 'wine']

/**
 * The menu's shape, editable.
 *
 * Every level does the same four things — rename, reorder, hide, remove — so
 * this renders one row component three deep rather than three editors.
 *
 * Renaming goes through `rename_menu_node()`: a category name is the value
 * sitting on every bottle filed under it, and moving one without the other
 * empties the category out.
 */
export function MenuEditor({ counts }: { counts: Record<string, number> }) {
  const [nodes, setNodes] = useState<MenuNode[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error: err } = await createClient()
      .from('menu_nodes')
      .select('*')
      .order('sort_order')
    if (err) {
      setError(
        /does not exist|schema cache/i.test(err.message)
          ? 'The menu_nodes table is not there yet — run 0005_menu_taxonomy.sql.'
          : 'Could not load the menu.'
      )
      setNodes([])
      return
    }
    setError(null)
    setNodes((data ?? []) as MenuNode[])
  }, [])

  useEffect(() => { load() }, [load])

  const childrenOf = useCallback(
    (parent: string | null, level: MenuLevel) =>
      (nodes ?? [])
        .filter((n) => n.parent_id === parent && n.level === level)
        .sort((a, b) => a.sort_order - b.sort_order),
    [nodes]
  )

  const sections = useMemo(() => childrenOf(null, 'section'), [childrenOf])

  async function patch(id: string, changes: Partial<MenuNode>) {
    setNodes((prev) => (prev ?? []).map((n) => (n.id === id ? { ...n, ...changes } : n)))
    const { error: err } = await createClient()
      .from('menu_nodes')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (err) { setError('That change did not save.'); load() }
  }

  async function rename(node: MenuNode, name: string) {
    const trimmed = name.trim()
    if (!trimmed || trimmed === node.name) return
    setBusy(true)
    setError(null)
    const { error: err } = await createClient().rpc('rename_menu_node', {
      node: node.id,
      new_name: trimmed,
    })
    setBusy(false)
    if (err) {
      setError(
        /duplicate key/i.test(err.message)
          ? `Another ${node.level} is already called “${trimmed}”.`
          : 'That rename did not save.'
      )
      return
    }
    if (node.level !== 'section') {
      setNotice(`Renamed to “${trimmed}” — every bottle filed under it moved too.`)
    }
    load()
  }

  /** Reordering rewrites the whole sibling run, which keeps sort_order tidy. */
  async function move(node: MenuNode, delta: -1 | 1) {
    const siblings = childrenOf(node.parent_id, node.level)
    const from = siblings.findIndex((n) => n.id === node.id)
    const to = from + delta
    if (to < 0 || to >= siblings.length) return

    const reordered = [...siblings]
    ;[reordered[from], reordered[to]] = [reordered[to], reordered[from]]

    setNodes((prev) =>
      (prev ?? []).map((n) => {
        const at = reordered.findIndex((r) => r.id === n.id)
        return at >= 0 ? { ...n, sort_order: at } : n
      })
    )

    const supabase = createClient()
    const results = await Promise.all(
      reordered.map((n, i) =>
        supabase.from('menu_nodes').update({ sort_order: i }).eq('id', n.id)
      )
    )
    if (results.some((r) => r.error)) { setError('The new order did not save.'); load() }
  }

  async function add(parent: MenuNode | null, level: MenuLevel) {
    const siblings = childrenOf(parent?.id ?? null, level)
    const row: Record<string, unknown> = {
      parent_id: parent?.id ?? null,
      level,
      name: level === 'section' ? 'New section' : level === 'category' ? 'New category' : 'New subcategory',
      sort_order: siblings.length,
      is_hidden: true, // Born hidden, so a half-named row never reaches members.
    }
    if (level === 'category') row.kind = parent?.kinds?.[0] ?? 'spirit'
    if (level === 'section') row.kinds = ['spirit']

    setBusy(true)
    const { error: err } = await createClient().from('menu_nodes').insert(row as never)
    setBusy(false)
    if (err) {
      setError(/duplicate key/i.test(err.message) ? 'Rename the last new row first.' : 'Could not add that.')
      return
    }
    setNotice('Added, and hidden until you unhide it.')
    load()
  }

  async function remove(node: MenuNode) {
    const inUse = counts[node.name] ?? 0
    if (inUse > 0) {
      setError(
        `“${node.name}” still has ${inUse} bottle${inUse === 1 ? '' : 's'} filed under it. ` +
          'Move them first, or hide this instead of deleting it.'
      )
      return
    }
    const kids = (nodes ?? []).filter((n) => n.parent_id === node.id)
    if (kids.length > 0) {
      setError(`“${node.name}” still has ${kids.length} entries under it.`)
      return
    }
    setBusy(true)
    await createClient().from('menu_nodes').delete().eq('id', node.id)
    setBusy(false)
    load()
  }

  /** Rebuilds the tree from lib/catalog.ts — the shape compiled into the app. */
  async function resetToDefaults() {
    setBusy(true)
    setError(null)
    const supabase = createClient()
    await supabase.from('menu_nodes').delete().not('id', 'is', null)

    for (const [s, group] of MENU_GROUPS.entries()) {
      const { data: section, error: sErr } = await supabase
        .from('menu_nodes')
        .insert({
          parent_id: null, level: 'section', name: group.title,
          blurb: group.blurb ?? null, kinds: group.kinds, sort_order: s, is_hidden: false,
        } as never)
        .select('id')
        .single()
      if (sErr || !section) { setError('Could not rebuild the menu.'); setBusy(false); return }

      const categories = TAXONOMY.filter((t) => group.kinds.includes(t.kind))
      for (const [c, taxon] of categories.entries()) {
        const { data: category } = await supabase
          .from('menu_nodes')
          .insert({
            parent_id: section.id, level: 'category', name: taxon.category,
            blurb: taxon.blurb ?? null, kind: taxon.kind, sort_order: c, is_hidden: false,
          } as never)
          .select('id')
          .single()
        if (!category || !taxon.subcategories?.length) continue

        await supabase.from('menu_nodes').insert(
          taxon.subcategories.map((name, i) => ({
            parent_id: category.id, level: 'subcategory', name,
            sort_order: i, is_hidden: false,
          })) as never
        )
      }
    }
    setBusy(false)
    setNotice('Rebuilt from the shape shipped with the app.')
    load()
  }

  if (nodes === null) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-cream-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading the menu…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">The backbar</p>
          <h1 className="mt-1.5 font-display text-3xl sm:text-4xl">Menu layout</h1>
          <p className="mt-1.5 max-w-xl text-sm text-cream-muted">
            The order members see, top to bottom. Renaming a category or subcategory
            moves every bottle filed under it too.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => add(null, 'section')} disabled={busy} className="btn-ghost px-3">
            <Plus className="h-4 w-4" />
            Section
          </button>
          <button onClick={resetToDefaults} disabled={busy} className="btn-ghost px-3">
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </header>

      {error && (
        <p className="mb-4 rounded-lg border border-red-400/40 bg-red-400/5 px-4 py-2.5 text-sm text-red-300">
          {error}
        </p>
      )}
      {notice && !error && (
        <p className="mb-4 rounded-lg border border-gold/30 bg-gold/5 px-4 py-2.5 text-sm text-gold-bright">
          {notice}
        </p>
      )}

      {sections.length === 0 ? (
        <div className="card px-6 py-16 text-center">
          <p className="font-display text-lg">No menu layout yet.</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-cream-muted">
            Members are seeing the layout built into the app. Press Reset to load that
            same shape here, then edit it.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((section, si) => (
            <div key={section.id} className="card p-3 sm:p-4">
              <Row
                node={section}
                index={si}
                last={si === sections.length - 1}
                count={counts[section.name] ?? 0}
                busy={busy}
                onMove={move}
                onRename={rename}
                onPatch={patch}
                onRemove={remove}
              />

              <div className="mt-2 space-y-1.5 border-l border-ink-line pl-3 sm:pl-4">
                {childrenOf(section.id, 'category').map((category, ci, arr) => (
                  <div key={category.id}>
                    <Row
                      node={category}
                      index={ci}
                      last={ci === arr.length - 1}
                      count={counts[category.name] ?? 0}
                      busy={busy}
                      onMove={move}
                      onRename={rename}
                      onPatch={patch}
                      onRemove={remove}
                    />
                    <div className="ml-3 mt-1 space-y-1 border-l border-ink-line/60 pl-3">
                      {childrenOf(category.id, 'subcategory').map((sub, xi, subs) => (
                        <Row
                          key={sub.id}
                          node={sub}
                          index={xi}
                          last={xi === subs.length - 1}
                          count={counts[sub.name] ?? 0}
                          busy={busy}
                          onMove={move}
                          onRename={rename}
                          onPatch={patch}
                          onRemove={remove}
                        />
                      ))}
                      <button
                        onClick={() => add(category, 'subcategory')}
                        disabled={busy}
                        className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-cream-muted transition-colors hover:text-gold"
                      >
                        <Plus className="h-3 w-3" />
                        Subcategory
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => add(section, 'category')}
                  disabled={busy}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-cream-muted transition-colors hover:text-gold"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Category
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Row({
  node, index, last, count, busy, onMove, onRename, onPatch, onRemove,
}: {
  node: MenuNode
  index: number
  last: boolean
  count: number
  busy: boolean
  onMove: (node: MenuNode, delta: -1 | 1) => void
  onRename: (node: MenuNode, name: string) => void
  onPatch: (id: string, changes: Partial<MenuNode>) => void
  onRemove: (node: MenuNode) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(node.name)
  const [blurb, setBlurb] = useState(node.blurb ?? '')

  useEffect(() => { setDraft(node.name); setBlurb(node.blurb ?? '') }, [node.name, node.blurb])

  const isSection = node.level === 'section'

  return (
    <div
      className={clsx(
        'group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-ink-raised/60',
        node.is_hidden && 'opacity-50'
      )}
    >
      <div className="flex shrink-0 flex-col">
        <button
          onClick={() => onMove(node, -1)}
          disabled={index === 0 || busy}
          aria-label={`Move ${node.name} up`}
          className="text-cream-muted transition-colors hover:text-gold disabled:opacity-20"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onMove(node, 1)}
          disabled={last || busy}
          aria-label={`Move ${node.name} down`}
          className="text-cream-muted transition-colors hover:text-gold disabled:opacity-20"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="space-y-1.5">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { onRename(node, draft); setEditing(false) }
                if (e.key === 'Escape') { setDraft(node.name); setEditing(false) }
              }}
              onBlur={() => { onRename(node, draft); setEditing(false) }}
              className="input text-sm"
            />
            {isSection || node.level === 'category' ? (
              <input
                value={blurb}
                onChange={(e) => setBlurb(e.target.value)}
                onBlur={() => onPatch(node.id, { blurb: blurb.trim() || null })}
                placeholder="One line under the heading — optional."
                className="input text-[12px]"
              />
            ) : null}
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex w-full items-baseline gap-2 text-left"
          >
            <span
              className={clsx(
                'truncate',
                isSection
                  ? 'font-display text-lg text-cream'
                  : node.level === 'category'
                    ? 'text-sm text-cream'
                    : 'text-[13px] text-cream/75'
              )}
            >
              {node.name}
            </span>
            {node.blurb && (
              <span className="truncate text-[11px] italic text-cream-muted">{node.blurb}</span>
            )}
            <Pencil className="h-3 w-3 shrink-0 text-cream-muted opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        )}
      </div>

      {node.level === 'category' && (
        <select
          value={node.kind ?? 'spirit'}
          onChange={(e) => onPatch(node.id, { kind: e.target.value as CatalogKind })}
          aria-label={`Kind for ${node.name}`}
          className="shrink-0 rounded border border-ink-line bg-ink-raised px-1.5 py-0.5 text-[11px] text-cream-muted"
        >
          {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      )}

      {count > 0 && (
        <span className="shrink-0 text-[11px] tabular-nums text-cream-muted">{count}</span>
      )}

      <button
        onClick={() => onPatch(node.id, { is_hidden: !node.is_hidden })}
        aria-label={node.is_hidden ? `Show ${node.name}` : `Hide ${node.name}`}
        className="shrink-0 rounded p-1 text-cream-muted transition-colors hover:text-gold"
      >
        {node.is_hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
      <button
        onClick={() => onRemove(node)}
        aria-label={`Delete ${node.name}`}
        className="shrink-0 rounded p-1 text-cream-muted transition-colors hover:text-red-400"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
