'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, Plus, Trash2, UserCheck } from 'lucide-react'
import clsx from 'clsx'
import { shortDate } from '@/lib/format'
import type { CoMember } from '@/lib/types'

const MAX_CO_MEMBERS = 3

export function CoMemberManager({
  seniorId, coMembers,
}: {
  seniorId: string
  coMembers: CoMember[]
}) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const slotsLeft = MAX_CO_MEMBERS - coMembers.length

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    // Goes through an API route: creating the auth user and sending the invite
    // email both need the service role, which must never reach the browser.
    const res = await fetch('/api/co-members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seniorId, email: email.trim(), name: name.trim() }),
    })

    setBusy(false)
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: null }))
      setError(error ?? 'That invitation did not send. Try again.')
      return
    }

    setName('')
    setEmail('')
    setAdding(false)
    router.refresh()
  }

  async function remove(id: string) {
    setBusy(true)
    await fetch(`/api/co-members?id=${id}`, { method: 'DELETE' })
    setBusy(false)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {coMembers.length === 0 && !adding && (
        <div className="card px-5 py-8 text-center text-sm text-cream-muted">
          No co-members yet. You can add up to three.
        </div>
      )}

      {coMembers.map((co) => (
        <div key={co.id} className="card group flex items-center gap-3 p-4">
          <span
            className={clsx(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
              co.status === 'accepted'
                ? 'border-gold/45 text-gold'
                : 'border-ink-line text-cream-muted'
            )}
          >
            {co.status === 'accepted' ? <UserCheck className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-cream">{co.invited_name ?? co.invited_email}</p>
            <p className="truncate text-xs text-cream-muted">
              {co.invited_email}
              {' · '}
              {co.status === 'accepted'
                ? `joined ${shortDate(co.accepted_at)}`
                : `invited ${shortDate(co.invited_at)}, not accepted yet`}
            </p>
          </div>

          <button
            onClick={() => remove(co.id)}
            disabled={busy}
            aria-label={`Remove ${co.invited_name ?? co.invited_email}`}
            className="shrink-0 rounded-lg p-2 text-cream-muted transition-colors hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      {adding ? (
        <form onSubmit={invite} className="card space-y-4 p-4">
          <div>
            <label htmlFor="co-name" className="label mb-2 block">Their name</label>
            <input
              id="co-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="co-email" className="label mb-2 block">Their email</label>
            <input
              id="co-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="them@example.com"
            />
            <p className="mt-1.5 text-[11px] leading-relaxed text-cream-muted">
              They will get an email inviting them to set up their own sign-in, linked to
              your membership.
            </p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={() => setAdding(false)} className="btn-ghost flex-1">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="btn-gold flex-1">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Send invitation
            </button>
          </div>
        </form>
      ) : (
        slotsLeft > 0 && (
          <button onClick={() => setAdding(true)} className="btn-ghost w-full">
            <Plus className="h-4 w-4" />
            Add a co-member · {slotsLeft} {slotsLeft === 1 ? 'slot' : 'slots'} left
          </button>
        )
      )}
    </div>
  )
}
