'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2, Search } from 'lucide-react'
import clsx from 'clsx'
import { Dialog } from '@/components/ui/Dialog'
import { createClient } from '@/lib/supabase/client'
import { displayName, initials, type Profile, type ShareEntity } from '@/lib/types'

/**
 * Share a bottle, a list, or a note with other members. Members can only see
 * other members by name here — no contact details are exposed.
 */
export function ShareDialog({
  memberId, entityType, entityId, label, onClose,
}: {
  memberId: string
  entityType: ShareEntity
  entityId: string
  label: string
  onClose: () => void
}) {
  const [members, setMembers] = useState<Profile[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    createClient()
      .from('profiles')
      .select('*')
      .eq('status', 'active')
      .neq('id', memberId)
      .order('first_name')
      .then(({ data }) => {
        setMembers((data as Profile[]) ?? [])
        setLoading(false)
      })
  }, [memberId])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return members.slice(0, 40)
    return members.filter((m) => displayName(m).toLowerCase().includes(q)).slice(0, 40)
  }, [members, query])

  async function share() {
    if (!selected.size) return
    setBusy(true)
    await createClient()
      .from('shares')
      .insert(
        [...selected].map((to) => ({
          from_member_id: memberId,
          to_member_id: to,
          entity_type: entityType,
          entity_id: entityId,
          message: message.trim() || null,
        })) as never
      )
    setBusy(false)
    setDone(true)
    setTimeout(onClose, 1100)
  }

  if (done) {
    return (
      <Dialog title="Shared" onClose={onClose}>
        <div className="py-6 text-center">
          <Check className="mx-auto h-8 w-8 text-gold" />
          <p className="mt-3 text-sm text-cream-muted">
            Sent to {selected.size} {selected.size === 1 ? 'member' : 'members'}.
          </p>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog
      title="Share with members"
      description={label}
      onClose={onClose}
      footer={
        <button onClick={share} disabled={busy || !selected.size} className="btn-gold w-full">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {selected.size
            ? `Share with ${selected.size} ${selected.size === 1 ? 'member' : 'members'}`
            : 'Choose someone'}
        </button>
      }
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members by name"
            className="input pl-9"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gold" />
          </div>
        ) : (
          <ul className="max-h-56 space-y-1 overflow-y-auto">
            {visible.map((m) => {
              const on = selected.has(m.id)
              return (
                <li key={m.id}>
                  <button
                    onClick={() =>
                      setSelected((prev) => {
                        const next = new Set(prev)
                        on ? next.delete(m.id) : next.add(m.id)
                        return next
                      })
                    }
                    className={clsx(
                      'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors',
                      on ? 'border-gold/50 bg-gold/10' : 'border-transparent hover:bg-ink-card'
                    )}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/35 text-[10px] text-gold">
                      {initials(m)}
                    </span>
                    <span className="flex-1 truncate text-sm text-cream">{displayName(m)}</span>
                    {on && <Check className="h-4 w-4 shrink-0 text-gold" />}
                  </button>
                </li>
              )
            })}
            {visible.length === 0 && (
              <li className="py-6 text-center text-sm text-cream-muted">No members match.</li>
            )}
          </ul>
        )}

        <div>
          <label className="label mb-2 block">Add a message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder="Optional."
            className="input resize-none"
          />
        </div>
      </div>
    </Dialog>
  )
}
