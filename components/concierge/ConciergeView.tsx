'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CalendarDays, Ruler, Search, ShieldCheck, Star, X } from 'lucide-react'
import clsx from 'clsx'
import { LogoMark } from '@/components/ui/Logo'
import { MemberDossierView } from '@/components/admin/MemberDossierView'
import { ConciergeMessagePad } from './ConciergeMessagePad'
import { timeOfDay } from '@/lib/format'
import { displayName, initials, type Profile } from '@/lib/types'
import type { MemberDossier } from '@/lib/queries'
import type { ConciergeMember } from '@/app/(staff)/concierge/page'

/**
 * Floor view. One job: type a name, see everything, act on it. Deliberately
 * has no event or catalog management — that lives in the admin panel.
 */
export function ConciergeView({
  staff, members, dossier, todayEvents, todayFittings,
}: {
  staff: Profile
  members: ConciergeMember[]
  dossier: MemberDossier | null
  todayEvents: Array<{ id: string; title: string; starts_at: string; kind: string }>
  todayFittings: Array<{
    id: string
    scheduled_at: string
    spirit_category: string | null
    member: { id: string; first_name: string; last_name: string } | null
  }>
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return members
      .filter(
        (m) =>
          displayName(m).toLowerCase().includes(q) ||
          m.member_number?.toLowerCase().includes(q) ||
          m.phone?.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
          m.email.toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [members, query])

  return (
    <div className="min-h-dvh">
      {/* ---- Bar ---- */}
      <header className="sticky top-0 z-30 border-b border-ink-line/60 bg-ink/92 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <LogoMark size={22} />
          <span className="hidden text-[10px] uppercase tracking-[0.18em] text-gold sm:block">
            Concierge
          </span>
          <Link
            href="/admin"
            className="ml-auto flex items-center gap-1.5 text-xs text-cream-muted hover:text-gold"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        </div>

        <div className="mx-auto max-w-3xl px-4 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-cream-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a member's name…"
              className="input h-12 pl-11 pr-11 text-base"
              type="search"
              autoFocus={!dossier}
              // Big target: this gets used one-handed on a phone mid-service.
              autoComplete="off"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cream-muted hover:text-cream"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {matches.length > 0 && (
            <ul className="mt-2 overflow-hidden rounded-xl border border-ink-line bg-ink-raised shadow-vault">
              {matches.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => {
                      setQuery('')
                      router.push(`/concierge?member=${m.id}`)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-ink-card"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/35 text-[11px] text-gold">
                      {initials(m)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm text-cream">
                        {displayName(m)}
                        {m.vip && <Star className="h-3 w-3 fill-gold text-gold" />}
                      </span>
                      <span className="block truncate text-[11px] capitalize text-cream-muted">
                        {m.tier} · {m.member_number}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {dossier?.profile ? (
          <>
            <button
              onClick={() => router.push('/concierge')}
              className="mb-5 inline-flex items-center gap-2 text-xs text-cream-muted hover:text-gold"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Clear
            </button>

            <MemberDossierView dossier={dossier} staff={staff} compact />

            <div className="mt-8">
              <ConciergeMessagePad
                memberId={dossier.profile.id}
                memberName={displayName(dossier.profile)}
                staffId={staff.id}
                staffRole={staff.role}
                threads={
                  dossier.threads as Array<{
                    id: string; subject: string; kind: string; last_message_at: string
                    unread_for_staff: boolean
                  }>
                }
              />
            </div>
          </>
        ) : (
          <div className="space-y-7">
            {/* ---- Tonight ---- */}
            {(todayEvents.length > 0 || todayFittings.length > 0) && (
              <section className="rounded-xl border border-gold/30 bg-gold/5 p-4">
                <p className="label text-gold">Tonight</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {todayEvents.map((e) => (
                    <li key={e.id} className="flex items-baseline gap-2.5">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-gold" />
                      <span className="text-cream">{e.title}</span>
                      <span className="text-xs text-cream-muted">{timeOfDay(e.starts_at)}</span>
                    </li>
                  ))}
                  {todayFittings.map((f) => (
                    <li key={f.id} className="flex items-baseline gap-2.5">
                      <Ruler className="h-3.5 w-3.5 shrink-0 text-gold" />
                      <button
                        onClick={() => router.push(`/concierge?member=${f.member?.id}`)}
                        className="text-cream hover:text-gold-bright"
                      >
                        Fitting — {f.member?.first_name} {f.member?.last_name}
                      </button>
                      <span className="text-xs text-cream-muted">{timeOfDay(f.scheduled_at)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ---- VIPs, as a shortcut ---- */}
            <section>
              <p className="label mb-3">VIP members</p>
              <div className="flex flex-wrap gap-2">
                {members.filter((m) => m.vip).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => router.push(`/concierge?member=${m.id}`)}
                    className="flex items-center gap-2 rounded-full border border-gold/35 px-3 py-1.5 text-xs text-cream transition-colors hover:bg-gold/10"
                  >
                    <Star className="h-3 w-3 fill-gold text-gold" />
                    {displayName(m)}
                  </button>
                ))}
              </div>
            </section>

            <p className="pt-6 text-center text-sm text-cream-muted">
              Search a name above to pull up everything we know.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
