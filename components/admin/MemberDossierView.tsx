'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Check, Flag, Heart, Lock, Mail, MessageSquare, Package,
  Phone, Ruler, StickyNote, Star, Wine,
} from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase/client'
import { money, phoneHref, relative, shortDate, longDate, pluralize } from '@/lib/format'
import { displayName, initials, type Profile } from '@/lib/types'
import { REQUEST_STATUS, FITTING_STATUS } from '@/components/locker/status'
import { DiamondRule } from '@/components/ui/Logo'
import type { MemberDossier } from '@/lib/queries'

type Tab = 'overview' | 'taste' | 'locker' | 'notes' | 'messages'

/**
 * The full picture of one member. Shared by the admin panel and the concierge
 * view — `compact` drops the chrome the floor does not need.
 */
export function MemberDossierView({
  dossier, staff, compact,
}: {
  dossier: MemberDossier
  staff: Profile
  compact?: boolean
}) {
  const router = useRouter()
  const member = dossier.profile!
  const [tab, setTab] = useState<Tab>('overview')
  const [vip, setVip] = useState(member.vip)

  const openFlags = dossier.flags.filter((f) => !f.resolved_at)
  const locker = dossier.lockers[0] as
    | { id: string; locker_number: string; location: string | null; items: Array<{
        id: string; status: string; custom_name: string | null; fill_percent: number | null
        added_on: string; removed_on: string | null
        item: { id: string; name: string; category: string } | null
      }> }
    | undefined
  const lockerItems = locker?.items ?? []
  const openRequests = dossier.requests.filter(
    (r) => !['added', 'cancelled'].includes(r.status as string)
  )

  async function toggleVip() {
    const next = !vip
    setVip(next)
    await createClient().from('profiles').update({ vip: next }).eq('id', member.id)
    router.refresh()
  }

  return (
    <div>
      {/* ---- Identity ---- */}
      <header className="flex flex-wrap items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-gold/40 font-display text-lg text-gold">
          {initials(member)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl sm:text-3xl">{displayName(member)}</h1>
            {vip && (
              <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold-bright">
                <Star className="h-3 w-3 fill-current" />
                VIP
              </span>
            )}
            <span className="rounded-full border border-ink-line px-2 py-0.5 text-[10px] uppercase tracking-wider text-cream-muted">
              {member.tier}
            </span>
            {member.status !== 'active' && (
              <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-red-300">
                {member.status}
              </span>
            )}
          </div>

          <p className="mt-1.5 text-xs text-cream-muted">
            {member.member_number} · member since {longDate(member.member_since)}
            {member.birthday && ` · born ${shortDate(member.birthday)}`}
          </p>

          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            <a href={`mailto:${member.email}`} className="flex items-center gap-1.5 text-gold hover:text-gold-bright">
              <Mail className="h-3.5 w-3.5" />
              {member.email}
            </a>
            {member.phone && (
              <a href={phoneHref(member.phone)} className="flex items-center gap-1.5 text-gold hover:text-gold-bright">
                <Phone className="h-3.5 w-3.5" />
                {member.phone}
              </a>
            )}
          </div>

          {member.address_line1 && (
            <p className="mt-1.5 text-xs text-cream-muted">
              {[member.address_line1, member.address_line2, member.city, member.state, member.postal_code]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={toggleVip}
            className={clsx('btn px-3 text-xs', vip ? 'bg-gold text-ink' : 'btn-ghost')}
          >
            <Star className={clsx('h-3.5 w-3.5', vip && 'fill-current')} />
            {vip ? 'VIP' : 'Mark VIP'}
          </button>
        </div>
      </header>

      {/* ---- Flags ---- */}
      {openFlags.length > 0 && (
        <div className="mt-5 space-y-2">
          {openFlags.map((f) => (
            <div
              key={f.id as string}
              className={clsx(
                'flex items-start gap-3 rounded-lg border px-4 py-3',
                f.severity === 'urgent'
                  ? 'border-red-500/40 bg-red-500/[0.06]'
                  : 'border-gold/30 bg-gold/[0.04]'
              )}
            >
              <Flag className={clsx('mt-0.5 h-4 w-4 shrink-0', f.severity === 'urgent' ? 'text-red-400' : 'text-gold')} />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed text-cream/90">{f.note as string}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-cream-muted">
                  {f.severity as string} · {relative(f.created_at as string)}
                </p>
              </div>
              <ResolveFlagButton flagId={f.id as string} staffId={staff.id} />
            </div>
          ))}
        </div>
      )}

      {/* ---- Preferences ---- */}
      {member.preferences && (
        <div className="mt-5 rounded-lg border-l-2 border-gold/50 bg-gold/[0.04] px-4 py-3">
          <p className="label mb-1.5">In their words</p>
          <p className="text-sm leading-relaxed text-cream/85">{member.preferences}</p>
        </div>
      )}

      {/* ---- Money ---- */}
      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Lifetime" value={money(dossier.lifetimeSpendCents)} />
        <Stat label="Visits" value={dossier.visits.length} />
        <Stat label="Last in" value={shortDate(dossier.visits[0])} />
        <Stat
          label="Avg / visit"
          value={
            dossier.visits.length
              ? money(Math.round(dossier.lifetimeSpendCents / dossier.visits.length))
              : '—'
          }
        />
      </section>

      {/* ---- Tabs ---- */}
      <nav className="no-scrollbar mt-7 flex gap-2 overflow-x-auto border-b border-ink-line pb-3">
        {([
          ['overview', 'Overview'],
          ['taste', 'What they drink'],
          ['locker', 'Locker & requests'],
          ['notes', 'Chits & history'],
          ['messages', 'Messages'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={clsx(
              'shrink-0 rounded-full px-3.5 py-1.5 text-xs transition-colors',
              tab === key
                ? 'bg-gold/12 text-gold-bright'
                : 'text-cream-muted hover:text-cream'
            )}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {tab === 'overview' && <Overview dossier={dossier} compact={compact} />}
        {tab === 'taste' && <Taste dossier={dossier} />}
        {tab === 'locker' && (
          <LockerTab
            locker={locker}
            items={lockerItems}
            requests={dossier.requests}
            openRequests={openRequests}
            fittings={dossier.fittings}
          />
        )}
        {tab === 'notes' && <NotesTab dossier={dossier} staff={staff} />}
        {tab === 'messages' && <MessagesTab dossier={dossier} />}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function Overview({ dossier, compact }: { dossier: MemberDossier; compact?: boolean }) {
  const max = Math.max(1, ...dossier.spendByQuarter.map((q) => q.cents))

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 font-display text-lg">Spend by quarter</h2>
        {dossier.spendByQuarter.length === 0 ? (
          <p className="text-sm text-cream-muted">No sales history imported yet.</p>
        ) : (
          <div className="card p-4">
            <div className="flex items-end gap-2 sm:gap-3">
              {dossier.spendByQuarter.map((q) => (
                <div key={q.quarter} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[10px] text-cream-muted">{money(q.cents)}</span>
                  <div
                    className="w-full rounded-t bg-gold-gradient"
                    style={{ height: `${Math.max(4, (q.cents / max) * 100)}px` }}
                    title={`${q.quarter} — ${money(q.cents)} across ${pluralize(q.visits, 'visit')}`}
                  />
                  <span className="text-[9px] uppercase tracking-wider text-cream-muted">
                    {q.quarter.replace(' ', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg">Recent visits</h2>
        {dossier.visits.length === 0 ? (
          <p className="text-sm text-cream-muted">No visits recorded.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {dossier.visits.slice(0, compact ? 20 : 60).map((d) => (
              <span key={d} className="rounded border border-ink-line px-2 py-0.5 text-[11px] text-cream-muted">
                {shortDate(d)}
              </span>
            ))}
            {dossier.visits.length > (compact ? 20 : 60) && (
              <span className="px-2 py-0.5 text-[11px] text-cream-muted">
                +{dossier.visits.length - (compact ? 20 : 60)} more
              </span>
            )}
          </div>
        )}
      </section>

      {dossier.reservations.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg">Booked events</h2>
          <ul className="space-y-1.5">
            {(dossier.reservations as Array<{
              id: string; seats: number
              event: { id: string; title: string; starts_at: string } | null
            }>).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-ink-line px-3.5 py-2.5">
                <span className="min-w-0 truncate text-sm text-cream">{r.event?.title}</span>
                <span className="shrink-0 text-[11px] text-cream-muted">
                  {shortDate(r.event?.starts_at)} · {pluralize(r.seats, 'seat')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {dossier.coMembers.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg">Co-members</h2>
          <ul className="space-y-1.5">
            {(dossier.coMembers as Array<{
              id: string; invited_name: string | null; invited_email: string; status: string
            }>).map((co) => (
              <li key={co.id} className="flex items-center justify-between gap-3 rounded-lg border border-ink-line px-3.5 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-sm text-cream">
                    {co.invited_name ?? co.invited_email}
                  </span>
                  <span className="block truncate text-[11px] text-cream-muted">{co.invited_email}</span>
                </span>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-cream-muted">
                  {co.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Taste({ dossier }: { dossier: MemberDossier }) {
  const favorites = dossier.favorites as Array<{
    created_at: string
    item: { id: string; name: string; category: string; subcategory: string | null; status: string } | null
  }>
  const notes = dossier.notes as Array<{
    id: string; rating: number | null; nose: string | null; palate: string | null
    finish: string | null; body: string | null; updated_at: string
    item: { id: string; name: string; category: string; subcategory: string | null } | null
  }>

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 font-display text-lg">Ordered most often</h2>
        {dossier.top.length === 0 ? (
          <p className="text-sm text-cream-muted">No sales history yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {dossier.top.map((t) => (
              <li key={t.name} className="flex items-center justify-between gap-3 rounded-lg border border-ink-line px-3.5 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-sm text-cream">{t.name}</span>
                  <span className="block text-[11px] text-cream-muted">{t.category}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm text-cream">{t.times}×</span>
                  <span className="block text-[11px] text-cream-muted">{money(t.cents)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg">
          <Heart className="h-4 w-4 text-gold" />
          Favorites
          <span className="text-xs text-cream-muted">({favorites.length})</span>
        </h2>
        {favorites.length === 0 ? (
          <p className="text-sm text-cream-muted">Nothing favorited.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {favorites.map(({ item }) =>
              item ? (
                <Link
                  key={item.id}
                  href={`/spirits?item=${item.id}`}
                  className="rounded-full border border-ink-line px-2.5 py-1 text-[11px] text-cream/80 transition-colors hover:border-gold/40 hover:text-gold-bright"
                >
                  {item.name}
                  {item.status === 'eightysixed' && ' · 86'}
                </Link>
              ) : null
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg">
          <StickyNote className="h-4 w-4 text-gold" />
          Their tasting notes
          <span className="text-xs text-cream-muted">({notes.length})</span>
        </h2>
        {notes.length === 0 ? (
          <p className="text-sm text-cream-muted">No tasting notes.</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="card p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-cream">{n.item?.name}</p>
                  {n.rating && (
                    <span className="shrink-0 text-xs text-gold">
                      {'●'.repeat(n.rating)}
                      <span className="text-ink-line">{'●'.repeat(5 - n.rating)}</span>
                    </span>
                  )}
                </div>
                <div className="mt-1.5 space-y-0.5 text-xs text-cream/75">
                  {n.nose && <p><span className="text-cream-muted">Nose · </span>{n.nose}</p>}
                  {n.palate && <p><span className="text-cream-muted">Palate · </span>{n.palate}</p>}
                  {n.finish && <p><span className="text-cream-muted">Finish · </span>{n.finish}</p>}
                  {n.body && <p className="italic">{n.body}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function LockerTab({
  locker, items, requests, openRequests, fittings,
}: {
  locker?: { locker_number: string; location: string | null }
  items: Array<{
    id: string; status: string; custom_name: string | null; fill_percent: number | null
    added_on: string; removed_on: string | null
    item: { id: string; name: string; category: string } | null
  }>
  requests: MemberDossier['requests']
  openRequests: MemberDossier['requests']
  fittings: MemberDossier['fittings']
}) {
  const current = items.filter((i) => i.status === 'in_locker')
  const past = items.filter((i) => i.status === 'removed')

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg">
          <Lock className="h-4 w-4 text-gold" />
          {locker ? `Locker ${locker.locker_number}` : 'No locker assigned'}
          {locker?.location && (
            <span className="text-xs font-normal text-cream-muted">{locker.location}</span>
          )}
        </h2>

        {current.length === 0 ? (
          <p className="text-sm text-cream-muted">Nothing in the locker right now.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {current.map((li) => (
              <li key={li.id} className="flex items-center gap-3 rounded-lg border border-ink-line px-3.5 py-2.5">
                <Wine className="h-4 w-4 shrink-0 text-gold/50" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-cream">
                    {li.item?.name ?? li.custom_name}
                  </p>
                  <p className="text-[11px] text-cream-muted">
                    since {shortDate(li.added_on)}
                    {li.fill_percent !== null && ` · ${li.fill_percent}% full`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {past.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-cream-muted hover:text-gold">
              {past.length} previously in the locker
            </summary>
            <ul className="mt-2 space-y-1">
              {past.map((li) => (
                <li key={li.id} className="flex justify-between gap-3 text-xs text-cream-muted">
                  <span className="truncate">{li.item?.name ?? li.custom_name}</span>
                  <span className="shrink-0">{shortDate(li.added_on)} – {shortDate(li.removed_on)}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg">
          <Package className="h-4 w-4 text-gold" />
          Requests
          {openRequests.length > 0 && (
            <span className="rounded-full bg-gold px-1.5 text-[10px] text-ink">
              {openRequests.length} open
            </span>
          )}
        </h2>
        {requests.length === 0 ? (
          <p className="text-sm text-cream-muted">No requests.</p>
        ) : (
          <ul className="space-y-2">
            {(requests as Array<{
              id: string; requested_name: string; description: string | null; status: string
              quoted_price_cents: number | null; staff_notes: string | null
              created_at: string; fulfilled_at: string | null
            }>).map((r) => {
              const s = REQUEST_STATUS[r.status as keyof typeof REQUEST_STATUS]
              return (
                <li key={r.id} className={clsx('card p-3.5', s.border)}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-cream">{r.requested_name}</p>
                    <span className={clsx('shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider', s.chip)}>
                      {s.label}
                    </span>
                  </div>
                  {r.description && (
                    <p className="mt-1 text-xs leading-relaxed text-cream-muted">{r.description}</p>
                  )}
                  <p className="mt-1.5 text-[11px] text-cream-muted">
                    Asked {shortDate(r.created_at)}
                    {r.quoted_price_cents && ` · quoted ${money(r.quoted_price_cents)}`}
                    {r.fulfilled_at && ` · fulfilled ${shortDate(r.fulfilled_at)}`}
                  </p>
                  {r.staff_notes && (
                    <p className="mt-2 rounded border border-ink-line bg-ink px-2.5 py-2 text-xs italic leading-relaxed text-cream/70">
                      <span className="not-italic text-cream-muted">Staff only · </span>
                      {r.staff_notes}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg">
          <Ruler className="h-4 w-4 text-gold" />
          Fittings
        </h2>
        {fittings.length === 0 ? (
          <p className="text-sm text-cream-muted">No fittings yet.</p>
        ) : (
          <ul className="space-y-2">
            {(fittings as Array<{
              id: string; status: string; occasion: string | null; flavor_profile: string | null
              spirit_category: string | null; scheduled_at: string | null
              pre_notes: string | null; post_notes: string | null
              feedback_rating: number | null; feedback_body: string | null
              requested_at: string; completed_at: string | null
            }>).map((f) => {
              const s = FITTING_STATUS[f.status as keyof typeof FITTING_STATUS]
              return (
                <li key={f.id} className={clsx('card p-3.5', s.border)}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-cream">{f.occasion ?? 'Fitting'}</p>
                    <span className={clsx('shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider', s.chip)}>
                      {s.label}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-cream-muted">
                    {[f.spirit_category, f.flavor_profile].filter(Boolean).join(' · ')}
                    {f.scheduled_at && ` · ${shortDate(f.scheduled_at)}`}
                  </p>
                  {f.pre_notes && (
                    <p className="mt-2 rounded border border-ink-line bg-ink px-2.5 py-2 text-xs italic leading-relaxed text-cream/70">
                      <span className="not-italic text-cream-muted">Before · </span>
                      {f.pre_notes}
                    </p>
                  )}
                  {f.post_notes && (
                    <p className="mt-1.5 text-xs leading-relaxed text-cream/75">{f.post_notes}</p>
                  )}
                  {f.feedback_body && (
                    <p className="mt-2 border-l-2 border-gold/40 pl-2.5 text-xs italic text-cream/70">
                      {f.feedback_rating && `${f.feedback_rating}/5 — `}
                      “{f.feedback_body}”
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function NotesTab({ dossier, staff }: { dossier: MemberDossier; staff: Profile }) {
  const router = useRouter()
  const member = dossier.profile!
  const [chitBody, setChitBody] = useState('')
  const [chitKind, setChitKind] = useState('preference')
  const [flagNote, setFlagNote] = useState('')
  const [flagSeverity, setFlagSeverity] = useState('info')
  const [busy, setBusy] = useState(false)

  async function addChit() {
    if (!chitBody.trim()) return
    setBusy(true)
    await createClient().from('member_chits').insert({
      member_id: member.id,
      kind: chitKind,
      body: chitBody.trim(),
      created_by: staff.id,
    } as never)
    setChitBody('')
    setBusy(false)
    router.refresh()
  }

  async function addFlag() {
    if (!flagNote.trim()) return
    setBusy(true)
    await createClient().from('member_flags').insert({
      member_id: member.id,
      severity: flagSeverity,
      note: flagNote.trim(),
      created_by: staff.id,
    } as never)
    setFlagNote('')
    setBusy(false)
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 font-display text-lg">Log a chit</h2>
        <div className="card space-y-3 p-4">
          <div className="flex flex-wrap gap-1.5">
            {['preference', 'locker', 'bottle', 'note'].map((k) => (
              <button
                key={k}
                onClick={() => setChitKind(k)}
                className={clsx(
                  'rounded-full border px-3 py-1 text-xs capitalize transition-colors',
                  chitKind === k
                    ? 'border-gold bg-gold/10 text-gold-bright'
                    : 'border-ink-line text-cream-muted hover:border-gold/40'
                )}
              >
                {k}
              </button>
            ))}
          </div>
          <textarea
            value={chitBody}
            onChange={(e) => setChitBody(e.target.value)}
            rows={2}
            placeholder="Always starts with something sparkling. Do not ask, just bring it."
            className="input resize-none"
          />
          <button onClick={addChit} disabled={busy || !chitBody.trim()} className="btn-gold">
            Save chit
          </button>
        </div>

        <ul className="mt-4 space-y-2">
          {(dossier.chits as Array<{ id: string; kind: string; body: string; created_at: string }>).map((c) => (
            <li key={c.id} className="rounded-lg border border-ink-line px-3.5 py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[10px] uppercase tracking-wider text-gold">{c.kind}</span>
                <span className="text-[10px] text-cream-muted">{relative(c.created_at)}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-cream/85">{c.body}</p>
            </li>
          ))}
          {dossier.chits.length === 0 && (
            <li className="text-sm text-cream-muted">No chits logged yet.</li>
          )}
        </ul>
      </section>

      <DiamondRule />

      <section>
        <h2 className="mb-3 font-display text-lg">Raise a flag</h2>
        <div className="card space-y-3 p-4">
          <div className="flex gap-1.5">
            {['info', 'attention', 'urgent'].map((s) => (
              <button
                key={s}
                onClick={() => setFlagSeverity(s)}
                className={clsx(
                  'rounded-full border px-3 py-1 text-xs capitalize transition-colors',
                  flagSeverity === s
                    ? s === 'urgent'
                      ? 'border-red-500/60 bg-red-500/10 text-red-300'
                      : 'border-gold bg-gold/10 text-gold-bright'
                    : 'border-ink-line text-cream-muted hover:border-gold/40'
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <textarea
            value={flagNote}
            onChange={(e) => setFlagNote(e.target.value)}
            rows={2}
            placeholder="Something management should see and resolve."
            className="input resize-none"
          />
          <button onClick={addFlag} disabled={busy || !flagNote.trim()} className="btn-gold">
            Raise flag
          </button>
        </div>

        {dossier.flags.filter((f) => f.resolved_at).length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-cream-muted hover:text-gold">
              Resolved flags
            </summary>
            <ul className="mt-2 space-y-1.5">
              {(dossier.flags.filter((f) => f.resolved_at) as Array<{
                id: string; note: string; resolved_at: string
              }>).map((f) => (
                <li key={f.id} className="text-xs text-cream-muted">
                  {f.note} <span className="opacity-60">— resolved {shortDate(f.resolved_at)}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </div>
  )
}

function MessagesTab({ dossier }: { dossier: MemberDossier }) {
  const threads = dossier.threads as Array<{
    id: string; subject: string; kind: string; last_message_at: string
    unread_for_staff: boolean; is_open: boolean
  }>

  if (!threads.length) {
    return <p className="text-sm text-cream-muted">No messages from this member.</p>
  }

  return (
    <ul className="space-y-2">
      {threads.map((t) => (
        <li key={t.id}>
          <Link
            href={`/admin/messages?thread=${t.id}`}
            className={clsx(
              'card flex items-center gap-3 p-3.5 transition-colors hover:border-gold/40',
              t.unread_for_staff && 'border-gold/40 bg-gold/[0.03]'
            )}
          >
            <MessageSquare className="h-4 w-4 shrink-0 text-gold/60" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-cream">{t.subject}</p>
              <p className="text-[11px] uppercase tracking-wider text-cream-muted">
                {t.kind.replace('_', ' ')} · {relative(t.last_message_at)}
              </p>
            </div>
            {t.unread_for_staff && <span className="h-2 w-2 shrink-0 rounded-full bg-gold" />}
          </Link>
        </li>
      ))}
    </ul>
  )
}

function ResolveFlagButton({ flagId, staffId }: { flagId: string; staffId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  return (
    <button
      onClick={async () => {
        setBusy(true)
        await createClient()
          .from('member_flags')
          .update({ resolved_at: new Date().toISOString(), resolved_by: staffId })
          .eq('id', flagId)
        setBusy(false)
        router.refresh()
      }}
      disabled={busy}
      className="shrink-0 rounded-lg p-1.5 text-cream-muted transition-colors hover:text-gold"
      aria-label="Resolve flag"
    >
      <Check className="h-4 w-4" />
    </button>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-3.5">
      <p className="label">{label}</p>
      <p className="mt-1.5 font-display text-xl leading-none">{value}</p>
    </div>
  )
}
