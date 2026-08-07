'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Archive, ClipboardList, Lock, Package, Plus, Ruler, Wine,
} from 'lucide-react'
import clsx from 'clsx'
import { shortDate, money } from '@/lib/format'
import { DiamondRule } from '@/components/ui/Logo'
import { AddBottleDialog } from './AddBottleDialog'
import { RequestProductDialog } from './RequestProductDialog'
import { RequestFittingDialog } from './RequestFittingDialog'
import { REQUEST_STATUS, FITTING_STATUS } from './status'
import { createClient } from '@/lib/supabase/client'
import type { Fitting, Locker, ProductRequest, Profile } from '@/lib/types'
import type { LockerItemWithBottle } from '@/app/(portal)/locker/page'

type Props = {
  profile: Profile
  locker: Locker | null
  items: LockerItemWithBottle[]
  requests: Array<Omit<ProductRequest, 'staff_notes'>>
  fittings: Array<Omit<Fitting, 'pre_notes'>>
}

export function LockerView({ profile, locker, items, requests, fittings }: Props) {
  const router = useRouter()
  const [dialog, setDialog] = useState<'add' | 'request' | 'fitting' | null>(null)
  const [showRemoved, setShowRemoved] = useState(false)

  const current = items.filter((i) => i.status === 'in_locker')
  const past = items.filter((i) => i.status === 'removed')
  const openRequests = requests.filter((r) => !['added', 'cancelled'].includes(r.status))
  const openFittings = fittings.filter((f) => ['requested', 'scheduled'].includes(f.status))

  async function removeItem(id: string) {
    await createClient()
      .from('locker_items')
      .update({ status: 'removed', removed_on: new Date().toISOString().slice(0, 10) })
      .eq('id', id)
    router.refresh()
  }

  if (!locker) {
    return (
      <div className="mx-auto max-w-2xl">
        <header className="mb-6">
          <p className="label">Yours in the vault</p>
          <h1 className="mt-1.5 font-display text-3xl sm:text-4xl">My Locker</h1>
        </header>
        <div className="card px-6 py-14 text-center">
          <Lock className="mx-auto h-7 w-7 text-gold/40" strokeWidth={1.2} />
          <p className="mt-4 font-display text-lg">No locker yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-cream-muted">
            Lockers are part of senior membership. If you would like one, send us a message
            and we will find you a space.
          </p>
          <Link href="/messages" className="btn-gold mt-5 inline-flex">Ask about a locker</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Yours in the vault</p>
          <h1 className="mt-1.5 font-display text-3xl sm:text-4xl">
            Locker {locker.locker_number}
          </h1>
          {locker.location && (
            <p className="mt-1 text-sm text-cream-muted">{locker.location}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setDialog('add')} className="btn-gold px-3">
            <Plus className="h-4 w-4" />
            Add a bottle
          </button>
          <button onClick={() => setDialog('request')} className="btn-ghost px-3">
            <Package className="h-4 w-4" />
            Request
          </button>
          <button onClick={() => setDialog('fitting')} className="btn-ghost px-3">
            <Ruler className="h-4 w-4" />
            Fitting
          </button>
        </div>
      </header>

      {/* ---- Open requests ---- */}
      {(openRequests.length > 0 || openFittings.length > 0) && (
        <section className="mb-8 space-y-2">
          {openRequests.map((r) => {
            const s = REQUEST_STATUS[r.status]
            return (
              <div key={r.id} className={clsx('card flex items-start gap-3 p-4', s.border)}>
                <Package className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-cream">{r.requested_name}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-cream-muted">{s.member}</p>
                  {r.quoted_price_cents && (
                    <p className="mt-1 text-xs text-gold">
                      Quoted at {money(r.quoted_price_cents)}
                    </p>
                  )}
                </div>
                <span className={clsx('shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider', s.chip)}>
                  {s.label}
                </span>
              </div>
            )
          })}

          {openFittings.map((f) => {
            const s = FITTING_STATUS[f.status]
            return (
              <div key={f.id} className={clsx('card flex items-start gap-3 p-4', s.border)}>
                <Ruler className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-cream">
                    Fitting{f.spirit_category ? ` · ${f.spirit_category}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-cream-muted">
                    {f.scheduled_at
                      ? `Booked for ${shortDate(f.scheduled_at)}. We will see you then.`
                      : 'Requested. A manager is finding a time that works.'}
                  </p>
                </div>
                <span className={clsx('shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider', s.chip)}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </section>
      )}

      {/* ---- In the locker ---- */}
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl">In your locker</h2>
          <span className="text-xs text-cream-muted">{current.length} bottles</span>
        </div>

        {current.length === 0 ? (
          <div className="card mt-4 px-6 py-12 text-center text-sm text-cream-muted">
            Empty right now. Add a bottle, or ask us to source one.
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {current.map((li) => (
              <li key={li.id} className="card group flex items-center gap-3 p-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-ink-line bg-vault">
                  <Wine className="h-5 w-5 text-gold/50" strokeWidth={1.2} />
                </div>
                <div className="min-w-0 flex-1">
                  {li.item ? (
                    <Link
                      href={`/spirits?item=${li.item.id}`}
                      className="line-clamp-1 text-sm text-cream hover:text-gold-bright"
                    >
                      {li.item.name}
                    </Link>
                  ) : (
                    <p className="line-clamp-1 text-sm text-cream">{li.custom_name}</p>
                  )}
                  <p className="truncate text-[11px] text-cream-muted">
                    {li.item?.subcategory ?? li.item?.category ?? li.custom_description ?? 'Your own bottle'}
                    {' · since '}{shortDate(li.added_on)}
                  </p>
                  {li.fill_percent !== null && (
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-ink-line">
                      <div
                        className="h-full rounded-full bg-gold-gradient"
                        style={{ width: `${li.fill_percent}%` }}
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeItem(li.id)}
                  className="shrink-0 text-[10px] uppercase tracking-wider text-cream-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- History ---- */}
      {past.length > 0 && (
        <section className="mt-10">
          <DiamondRule className="mb-6" />
          <button
            onClick={() => setShowRemoved(!showRemoved)}
            className="flex items-center gap-2 font-display text-xl text-cream hover:text-gold"
          >
            <Archive className="h-4 w-4" />
            Previously in your locker
            <span className="text-xs text-cream-muted">({past.length})</span>
          </button>

          {showRemoved && (
            <ul className="mt-4 space-y-1.5">
              {past.map((li) => (
                <li
                  key={li.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-ink-line px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    {li.item ? (
                      <Link
                        href={`/spirits?item=${li.item.id}`}
                        className="line-clamp-1 text-sm text-cream/80 hover:text-gold-bright"
                      >
                        {li.item.name}
                      </Link>
                    ) : (
                      <p className="line-clamp-1 text-sm text-cream/80">{li.custom_name}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-[11px] text-cream-muted">
                    {shortDate(li.added_on)} – {shortDate(li.removed_on)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ---- Past fittings ---- */}
      {fittings.some((f) => f.status === 'completed') && (
        <section className="mt-10">
          <DiamondRule className="mb-6" />
          <h2 className="flex items-center gap-2 font-display text-xl">
            <ClipboardList className="h-4 w-4" />
            Your fittings
          </h2>
          <ul className="mt-4 space-y-2">
            {fittings.filter((f) => f.status === 'completed').map((f) => (
              <li key={f.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-cream">{f.occasion ?? 'Fitting'}</p>
                    <p className="mt-0.5 text-xs text-cream-muted">
                      {f.spirit_category}
                      {f.flavor_profile && ` · ${f.flavor_profile}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-cream-muted">
                    {shortDate(f.completed_at)}
                  </span>
                </div>
                {f.post_notes && (
                  <p className="mt-2.5 text-sm leading-relaxed text-cream/75">{f.post_notes}</p>
                )}
                {f.feedback_body ? (
                  <p className="mt-2.5 border-l-2 border-gold/40 pl-3 text-sm italic text-cream/70">
                    Your feedback: “{f.feedback_body}”
                  </p>
                ) : (
                  <Link
                    href={`/locker/fitting/${f.id}`}
                    className="mt-2.5 inline-block text-xs text-gold hover:text-gold-bright"
                  >
                    Leave feedback →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {dialog === 'add' && (
        <AddBottleDialog lockerId={locker.id} onClose={() => setDialog(null)} />
      )}
      {dialog === 'request' && (
        <RequestProductDialog
          memberId={profile.id}
          lockerId={locker.id}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'fitting' && (
        <RequestFittingDialog memberId={profile.id} onClose={() => setDialog(null)} />
      )}
    </div>
  )
}
