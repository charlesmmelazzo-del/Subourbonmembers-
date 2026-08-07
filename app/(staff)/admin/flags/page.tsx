import Link from 'next/link'
import { Flag, Star } from 'lucide-react'
import clsx from 'clsx'
import { requireStaff } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { relative, shortDate } from '@/lib/format'
import { ResolveFlag } from '@/components/admin/ResolveFlag'

export const metadata = { title: 'Flags' }

type FlagRow = {
  id: string
  severity: string
  note: string
  created_at: string
  resolved_at: string | null
  member: { id: string; first_name: string; last_name: string; vip: boolean } | null
}

export default async function FlagsPage({
  searchParams,
}: {
  searchParams: { view?: string }
}) {
  const staff = await requireStaff()
  const supabase = createClient()
  const showResolved = searchParams.view === 'resolved'

  let query = supabase
    .from('member_flags')
    .select('id, severity, note, created_at, resolved_at, member:profiles(id, first_name, last_name, vip)')
    .order('created_at', { ascending: false })

  query = showResolved ? query.not('resolved_at', 'is', null) : query.is('resolved_at', null)

  const { data } = await query
  const flags = (data ?? []) as unknown as FlagRow[]

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">For management to resolve</p>
          <h1 className="mt-1.5 font-display text-3xl sm:text-4xl">Flags</h1>
        </div>
        <div className="flex gap-1.5">
          <Link
            href="/admin/flags"
            className={clsx(
              'rounded-full border px-3.5 py-1.5 text-xs transition-colors',
              !showResolved
                ? 'border-gold bg-gold/10 text-gold-bright'
                : 'border-ink-line text-cream-muted hover:border-gold/40'
            )}
          >
            Open
          </Link>
          <Link
            href="/admin/flags?view=resolved"
            className={clsx(
              'rounded-full border px-3.5 py-1.5 text-xs transition-colors',
              showResolved
                ? 'border-gold bg-gold/10 text-gold-bright'
                : 'border-ink-line text-cream-muted hover:border-gold/40'
            )}
          >
            Resolved
          </Link>
        </div>
      </header>

      {flags.length === 0 ? (
        <div className="card px-6 py-16 text-center text-sm text-cream-muted">
          {showResolved ? 'Nothing resolved yet.' : 'Nothing flagged. Good.'}
        </div>
      ) : (
        <ul className="space-y-2">
          {flags.map((f) => (
            <li
              key={f.id}
              className={clsx(
                'card flex items-start gap-3 p-4',
                !f.resolved_at && f.severity === 'urgent' && 'border-red-500/40 bg-red-500/[0.04]',
                !f.resolved_at && f.severity === 'attention' && 'border-gold/30'
              )}
            >
              <Flag
                className={clsx(
                  'mt-0.5 h-4 w-4 shrink-0',
                  f.severity === 'urgent' ? 'text-red-400'
                  : f.severity === 'attention' ? 'text-gold'
                  : 'text-cream-muted'
                )}
              />

              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm text-cream">
                  {f.member?.vip && <Star className="h-3 w-3 fill-gold text-gold" />}
                  <Link
                    href={`/admin/members/${f.member?.id}`}
                    className="hover:text-gold-bright"
                  >
                    {f.member?.first_name} {f.member?.last_name}
                  </Link>
                </p>
                <p className="mt-1 text-sm leading-relaxed text-cream/85">{f.note}</p>
                <p className="mt-1.5 text-[10px] uppercase tracking-wider text-cream-muted">
                  {f.severity} · raised {relative(f.created_at)}
                  {f.resolved_at && ` · resolved ${shortDate(f.resolved_at)}`}
                </p>
              </div>

              {!f.resolved_at && <ResolveFlag flagId={f.id} staffId={staff.id} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
