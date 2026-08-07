'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

export function AccountForm({ profile }: { profile: Profile }) {
  const router = useRouter()
  const [form, setForm] = useState({
    first_name: profile.first_name,
    last_name: profile.last_name,
    phone: profile.phone ?? '',
    address_line1: profile.address_line1 ?? '',
    address_line2: profile.address_line2 ?? '',
    city: profile.city ?? '',
    state: profile.state ?? '',
    postal_code: profile.postal_code ?? '',
    birthday: profile.birthday ?? '',
    preferences: profile.preferences ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
    setSaved(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    const { error } = await createClient()
      .from('profiles')
      .update({
        ...form,
        phone: form.phone || null,
        address_line1: form.address_line1 || null,
        address_line2: form.address_line2 || null,
        city: form.city || null,
        state: form.state || null,
        postal_code: form.postal_code || null,
        birthday: form.birthday || null,
        preferences: form.preferences || null,
      })
      .eq('id', profile.id)

    setBusy(false)
    if (error) {
      setError('That did not save. Try again, or tell us in the message centre.')
      return
    }
    setSaved(true)
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" value={form.first_name} onChange={set('first_name')} required />
        <Field label="Last name" value={form.last_name} onChange={set('last_name')} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" value={form.phone} onChange={set('phone')} type="tel" placeholder="(630) 555-0100" />
        <Field label="Birthday" value={form.birthday} onChange={set('birthday')} type="date" />
      </div>

      <div>
        <label className="label mb-2 block">Email</label>
        <input value={profile.email} disabled className="input opacity-60" />
        <p className="mt-1.5 text-[11px] text-cream-muted">
          To change your email, message a manager.
        </p>
      </div>

      <Field label="Address" value={form.address_line1} onChange={set('address_line1')} />
      <Field label="Apartment, suite" value={form.address_line2} onChange={set('address_line2')} />

      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
        <Field label="City" value={form.city} onChange={set('city')} />
        <Field label="State" value={form.state} onChange={set('state')} />
        <Field label="ZIP" value={form.postal_code} onChange={set('postal_code')} />
      </div>

      <div>
        <label htmlFor="prefs" className="label mb-2 block">What we should know</label>
        <textarea
          id="prefs"
          rows={4}
          value={form.preferences}
          onChange={set('preferences')}
          placeholder="How you like to drink, allergies, where you like to sit, anything that helps us look after you."
          className="input resize-none leading-relaxed"
        />
        <p className="mt-1.5 text-[11px] text-cream-muted">
          Staff can see this when you are in. It is how they know to bring you the right
          thing without asking.
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="btn-gold">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-gold">
            <Check className="h-4 w-4" />
            Saved
          </span>
        )}
      </div>
    </form>
  )
}

function Field({
  label, value, onChange, type = 'text', required, placeholder,
}: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
  required?: boolean
  placeholder?: string
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div>
      <label htmlFor={id} className="label mb-2 block">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="input"
      />
    </div>
  )
}
