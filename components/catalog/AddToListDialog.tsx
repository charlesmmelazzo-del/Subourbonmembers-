'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, Plus } from 'lucide-react'
import clsx from 'clsx'
import { Dialog } from '@/components/ui/Dialog'
import { createClient } from '@/lib/supabase/client'
import type { CatalogItemFull, MemberList } from '@/lib/types'

export function AddToListDialog({
  item, memberId, onClose,
}: {
  item: CatalogItemFull
  memberId: string
  onClose: () => void
}) {
  const [lists, setLists] = useState<MemberList[]>([])
  const [inLists, setInLists] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('member_lists').select('*').eq('member_id', memberId).order('updated_at', { ascending: false }),
      supabase.from('member_list_items').select('list_id').eq('item_id', item.id),
    ]).then(([listRes, memberRes]) => {
      setLists((listRes.data as MemberList[]) ?? [])
      setInLists(new Set((memberRes.data ?? []).map((r) => r.list_id as string)))
      setLoading(false)
    })
  }, [memberId, item.id])

  async function toggle(listId: string) {
    const supabase = createClient()
    const has = inLists.has(listId)
    setInLists((prev) => {
      const next = new Set(prev)
      has ? next.delete(listId) : next.add(listId)
      return next
    })
    if (has) {
      await supabase.from('member_list_items').delete()
        .eq('list_id', listId).eq('item_id', item.id)
    } else {
      await supabase.from('member_list_items')
        .insert({ list_id: listId, item_id: item.id } as never)
    }
  }

  async function createList() {
    const name = newName.trim()
    if (!name) return
    setCreating(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('member_lists')
      .insert({ member_id: memberId, name } as never)
      .select()
      .single()

    if (data) {
      const list = data as MemberList
      await supabase.from('member_list_items')
        .insert({ list_id: list.id, item_id: item.id } as never)
      setLists((prev) => [list, ...prev])
      setInLists((prev) => new Set(prev).add(list.id))
      setNewName('')
    }
    setCreating(false)
  }

  return (
    <Dialog
      title="Add to a list"
      description={item.name}
      onClose={onClose}
      footer={<button onClick={onClose} className="btn-gold w-full">Done</button>}
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-gold" />
        </div>
      ) : (
        <div className="space-y-4">
          {lists.length > 0 && (
            <ul className="space-y-1.5">
              {lists.map((list) => {
                const on = inLists.has(list.id)
                return (
                  <li key={list.id}>
                    <button
                      onClick={() => toggle(list.id)}
                      className={clsx(
                        'flex w-full items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors',
                        on
                          ? 'border-gold/50 bg-gold/10'
                          : 'border-ink-line hover:border-gold/30'
                      )}
                    >
                      <span
                        className={clsx(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                          on ? 'border-gold bg-gold text-ink' : 'border-ink-line'
                        )}
                      >
                        {on && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-cream">{list.name}</span>
                        {list.description && (
                          <span className="block truncate text-xs text-cream-muted">
                            {list.description}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="border-t border-ink-line pt-4">
            <label className="label mb-2 block">New list</label>
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createList()}
                placeholder="Favorite Ryes"
                className="input"
              />
              <button
                onClick={createList}
                disabled={creating || !newName.trim()}
                className="btn-gold shrink-0 px-3"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  )
}
