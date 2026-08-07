'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import clsx from 'clsx'
import type { MemberTier } from '@/lib/types'

export function NewMemberForm() {
  const router = useRouter()
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    tier: 'junior' as MemberTier,
    member_since: new Date().toISOString().slice(0, 10),
    address_line1: '',
    city: '',
    state: 'IL',
    postal_code: '',
    locker_number: '',
    preferences: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    setBusy(false)
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: null }))
      setError(error ?? 'Could not create that membership.')
      return
    }
    const { id } = await res.json()
    router.push(`/admin/members/${id}`)
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" value={form.first_name} onChange={(v) => set('first_name', v)} required />
        <Field label="Last name" value={form.last_name} onChange={(v) => set('last_name', v)} required />
      </div>

      <Field label="Email" type="email" value={form.email} onChange={(v) => set('email', v)} required />
      <Field label="Phone" type="tel" value={form.phone} onChange={(v) => set('phone', v)} />

      <div>
        <p className="label mb-2">Tier</p>
        <div className="flex gap-1.5">
          {(['junior', 'senior'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set('tier', t)}
              className={clsx(
                'rounded-full border px-3.5 py-1.5 text-xs capitalize transition-colors',
                form.tier === t
                  ? 'border-gold bg-gold/10 text-gold-bright'
                  : 'border-ink-line text-cream-muted hover:border-gold/40'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Member since"
          type="date"
          value={form.member_since}
          onChange={(v) => set('member_since', v)}
        />
        <Field
          label="Locker number"
          value={form.locker_number}
          onChange={(v) => set('locker_number', v)}
        />
      </div>

      <Field label="Address" value={form.address_line1} onChange={(v) => set('address_line1', v)} />

      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
        <Field label="City" value={form.city} onChange={(v) => set('city', v)} />
        <Field label="State" value={form.state} onChange={(v) => set('state', v)} />
        <Field label="ZIP" value={form.postal_code} onChange={(v) => set('postal_code', v)} />
      </div>

      <div>
        <label htmlFor="prefs" className="label mb-2 block">What we should know</label>
        <textarea
          id="prefs"
          rows={3}
          value={form.preferences}
          onChange={(e) => set('preferences', e.target.value)}
          className="input resize-none leading-relaxed"
          placeholder="How they drink, allergies, anything staff should see on the floor."
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button type="submit" disabled={busy} className="btn-gold">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Create membership and send the invitation
      </button>
    </form>
  )
}

function Field({
  label, value, onChange, type = 'text', required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return (
    <div>
      <label htmlFor={id} className="label mb-2 block">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      />
    </div>
  )
}
