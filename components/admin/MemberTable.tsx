'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpDown, Flag, Search, Star } from 'lucide-react'
import clsx from 'clsx'
import { money, shortDate } from '@/lib/format'
import { displayName, initials } from '@/lib/types'
import type { MemberRow } from '@/app/(staff)/admin/members/page'

type SortKey = 'name' | 'spend' | 'visits' | 'since' | 'last'

export function MemberTable({ rows }: { rows: MemberRow[] }) {
  const [query, setQuery] = useState('')
  const [tier, setTier] = useState<'all' | 'senior' | 'junior' | 'comember'>('all')
  const [sort, setSort] = useState<SortKey>('name')
  const [desc, setDesc] = useState(false)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = rows.filter((r) => {
      if (tier !== 'all' && r.tier !== tier) return false
      if (!q) return true
      return (
        displayName(r).toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.phone?.includes(q) ||
        r.member_number?.toLowerCase().includes(q)
      )
    })

    const dir = desc ? -1 : 1
    return filtered.sort((a, b) => {
      switch (sort) {
        case 'spend': return (a.lifetime_cents - b.lifetime_cents) * dir
        case 'visits': return (a.visit_count - b.visit_count) * dir
        case 'since': return a.member_since.localeCompare(b.member_since) * dir
        case 'last': return (a.last_visit ?? '').localeCompare(b.last_visit ?? '') * dir
        default: return displayName(a).localeCompare(displayName(b)) * dir
      }
    })
  }, [rows, query, tier, sort, desc])

  function toggleSort(key: SortKey) {
    if (sort === key) setDesc(!desc)
    else { setSort(key); setDesc(key !== 'name') }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, phone, or member number"
            className="input pl-9"
            type="search"
          />
        </div>
        {(['all', 'senior', 'junior', 'comember'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTier(t)}
            className={clsx(
              'rounded-full border px-3 py-1.5 text-xs capitalize transition-colors',
              tier === t
                ? 'border-gold bg-gold/10 text-gold-bright'
                : 'border-ink-line text-cream-muted hover:border-gold/40 hover:text-cream'
            )}
          >
            {t === 'all' ? 'All' : t}
          </button>
        ))}
      </div>

      <p className="mb-3 text-xs text-cream-muted">{visible.length} members</p>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-ink-line lg:block">
        <table className="w-full text-sm">
          <thead className="border-b border-ink-line bg-ink-raised/60">
            <tr className="text-left">
              <Th onClick={() => toggleSort('name')} active={sort === 'name'}>Member</Th>
              <Th>Tier</Th>
              <Th onClick={() => toggleSort('since')} active={sort === 'since'}>Since</Th>
              <Th onClick={() => toggleSort('visits')} active={sort === 'visits'} right>Visits</Th>
              <Th onClick={() => toggleSort('last')} active={sort === 'last'}>Last in</Th>
              <Th onClick={() => toggleSort('spend')} active={sort === 'spend'} right>Lifetime</Th>
              <Th>Contact</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-line/60">
            {visible.map((m) => (
              <tr key={m.id} className="transition-colors hover:bg-ink-raised/50">
                <td className="px-4 py-3">
                  <Link href={`/admin/members/${m.id}`} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/35 text-[10px] text-gold">
                      {initials(m)}
                    </span>
                    <span>
                      <span className="flex items-center gap-1.5 text-cream hover:text-gold-bright">
                        {displayName(m)}
                        {m.vip && <Star className="h-3 w-3 fill-gold text-gold" />}
                        {m.open_flags > 0 && <Flag className="h-3 w-3 text-red-400" />}
                      </span>
                      <span className="block text-[11px] text-cream-muted">{m.member_number}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 capitalize text-cream-muted">{m.tier}</td>
                <td className="px-4 py-3 text-cream-muted">{shortDate(m.member_since)}</td>
                <td className="px-4 py-3 text-right text-cream-muted">{m.visit_count}</td>
                <td className="px-4 py-3 text-cream-muted">{shortDate(m.last_visit)}</td>
                <td className="px-4 py-3 text-right text-cream">{money(m.lifetime_cents)}</td>
                <td className="px-4 py-3 text-[11px] text-cream-muted">
                  <span className="block">{m.email}</span>
                  <span className="block">{m.phone}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-2 lg:hidden">
        {visible.map((m) => (
          <li key={m.id}>
            <Link href={`/admin/members/${m.id}`} className="card flex items-center gap-3 p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/35 text-[11px] text-gold">
                {initials(m)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm text-cream">
                  {displayName(m)}
                  {m.vip && <Star className="h-3 w-3 shrink-0 fill-gold text-gold" />}
                  {m.open_flags > 0 && <Flag className="h-3 w-3 shrink-0 text-red-400" />}
                </p>
                <p className="truncate text-[11px] capitalize text-cream-muted">
                  {m.tier} · {m.visit_count} visits · last {shortDate(m.last_visit)}
                </p>
              </div>
              <span className="shrink-0 text-sm text-cream">{money(m.lifetime_cents)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

function Th({
  children, onClick, active, right,
}: {
  children: React.ReactNode
  onClick?: () => void
  active?: boolean
  right?: boolean
}) {
  return (
    <th className={clsx('px-4 py-2.5 text-[10px] font-normal uppercase tracking-[0.14em]', right && 'text-right')}>
      {onClick ? (
        <button
          onClick={onClick}
          className={clsx(
            'inline-flex items-center gap-1 transition-colors',
            active ? 'text-gold' : 'text-cream-muted hover:text-cream'
          )}
        >
          {children}
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ) : (
        <span className="text-cream-muted">{children}</span>
      )}
    </th>
  )
}
