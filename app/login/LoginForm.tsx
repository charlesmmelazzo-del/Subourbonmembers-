'use client'

import { useState } from 'react'
import { Loader2, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Mode = 'password' | 'link'

export function LoginForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const supabase = createClient()

    if (mode === 'link') {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      setBusy(false)
      if (error) setError(error.message)
      else setSent(true)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'That email and password do not match.'
          : error.message
      )
      return
    }
    // A full load, not router.push: the server decides where this account
    // belongs (staff land on the admin panel) and it needs the session cookie
    // the client just set.
    window.location.assign(
      next && next.startsWith('/')
        ? `/auth/landing?next=${encodeURIComponent(next)}`
        : '/auth/landing'
    )
  }

  if (sent) {
    return (
      <div className="card p-6 text-center">
        <Mail className="mx-auto h-6 w-6 text-gold" />
        <p className="mt-4 font-display text-lg">Check your email</p>
        <p className="mt-2 text-sm leading-relaxed text-cream-muted">
          We sent a sign-in link to <span className="text-cream">{email}</span>. It is good
          for one hour.
        </p>
        <button
          onClick={() => { setSent(false); setMode('password') }}
          className="mt-5 text-xs text-gold hover:text-gold-bright"
        >
          Use a password instead
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="email" className="label mb-2 block">Email</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          placeholder="you@example.com"
        />
      </div>

      {mode === 'password' && (
        <div>
          <label htmlFor="password" className="label mb-2 block">Password</label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="••••••••"
          />
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-400">{error}</p>
      )}

      <button type="submit" disabled={busy} className="btn-gold w-full">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {mode === 'password' ? 'Sign in' : 'Email me a link'}
      </button>

      <button
        type="button"
        onClick={() => { setMode(mode === 'password' ? 'link' : 'password'); setError(null) }}
        className="w-full text-center text-xs text-cream-muted transition-colors hover:text-gold"
      >
        {mode === 'password' ? 'Email me a sign-in link instead' : 'Use a password instead'}
      </button>
    </form>
  )
}
