import Link from 'next/link'
import { AlertTriangle, CalendarDays, Package, Ruler, Users, Wine } from 'lucide-react'
import { requireStaff } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { money, relative, shortDate, whenLabel } from '@/lib/format'
import { groupSpendByQuarter } from '@/lib/queries'
import { DiamondRule } from '@/components/ui/Logo'
import type { SalesTransaction } from '@/lib/types'

export const metadata = { title: 'Admin' }

export default async function AdminDashboard() {
  const profile = await requireStaff()
  const supabase = createClient()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekOut = new Date(todayStart.getTime() + 7 * 86_400_000)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86_400_000)

  const [
    { count: memberCount },
    { count: seniorCount },
    { data: recentSales },
    { data: todayEvents },
    { data: weekEvents },
    { data: openFlags },
    { data: openRequests },
    { data: dueFittings },
    { data: unreadThreads },
    { count: activeBottles },
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'member').eq('status', 'active'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('tier', 'senior').eq('status', 'active'),
    supabase
      .from('sales_transactions')
      .select('transacted_at, total_cents')
      .gte('transacted_at', ninetyDaysAgo.toISOString()),
    supabase
      .from('events')
      .select('*')
      .gte('starts_at', todayStart.toISOString())
      .lt('starts_at', new Date(todayStart.getTime() + 86_400_000).toISOString())
      .eq('status', 'published'),
    supabase
      .from('events')
      .select('*')
      .gte('starts_at', todayStart.toISOString())
      .lte('starts_at', weekOut.toISOString())
      .eq('status', 'published')
      .order('starts_at'),
    supabase
      .from('member_flags')
      .select('*, member:profiles(id, first_name, last_name)')
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('product_requests')
      .select('*, member:profiles(id, first_name, last_name)')
      .not('status', 'in', '("added","cancelled")')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('fittings')
      .select('*, member:profiles(id, first_name, last_name)')
      .in('status', ['requested', 'scheduled'])
      .order('scheduled_at', { nullsFirst: false })
      .limit(5),
    supabase
      .from('message_threads')
      .select('*, member:profiles(id, first_name, last_name)')
      .eq('unread_for_staff', true)
      .order('last_message_at', { ascending: false })
      .limit(5),
    supabase.from('catalog_items').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ])

  const quarters = groupSpendByQuarter((recentSales ?? []) as SalesTransaction[])
  const ninetyDaySpend = (recentSales ?? []).reduce((s, r) => s + (r.total_cents as number), 0)

  type WithMember<T> = T & { member: { id: string; first_name: string; last_name: string } | null }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-7">
        <p className="label">Good to see you</p>
        <h1 className="mt-1.5 font-display text-3xl sm:text-4xl">{profile.first_name}</h1>
      </header>

      {/* ---- Today ---- */}
      {(todayEvents?.length || dueFittings?.some((f) => f.scheduled_at && new Date(f.scheduled_at).toDateString() === now.toDateString())) ? (
        <section className="mb-8 rounded-xl border border-gold/30 bg-gold/5 p-5">
          <p className="label text-gold">Today</p>
          <ul className="mt-3 space-y-2 text-sm">
            {(todayEvents ?? []).map((e) => (
              <li key={e.id} className="flex items-baseline gap-3">
                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-gold" />
                <span className="font-display text-base">{e.title}</span>
                <span className="text-xs text-cream-muted">{whenLabel(e.starts_at as string)}</span>
              </li>
            ))}
            {(dueFittings ?? [])
              .filter((f) => f.scheduled_at && new Date(f.scheduled_at as string).toDateString() === now.toDateString())
              .map((f) => {
                const row = f as WithMember<typeof f>
                return (
                  <li key={f.id} className="flex items-baseline gap-3">
                    <Ruler className="h-3.5 w-3.5 shrink-0 text-gold" />
                    <span>
                      Fitting — {row.member?.first_name} {row.member?.last_name}
                    </span>
                    <span className="text-xs text-cream-muted">
                      {whenLabel(f.scheduled_at as string)}
                    </span>
                  </li>
                )
              })}
          </ul>
        </section>
      ) : null}

      {/* ---- Numbers ---- */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active members" value={memberCount ?? 0} detail={`${seniorCount ?? 0} senior`} href="/admin/members" icon={Users} />
        <Stat label="90-day revenue" value={money(ninetyDaySpend)} detail="from member checks" icon={Wine} />
        <Stat label="On the backbar" value={activeBottles ?? 0} detail="bottles listed" href="/admin/catalog" icon={Wine} />
        <Stat label="This week" value={weekEvents?.length ?? 0} detail="events scheduled" href="/admin/events" icon={CalendarDays} />
      </section>

      {/* ---- Revenue by quarter ---- */}
      {quarters.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-xl">Member revenue by quarter</h2>
          <div className="card mt-4 p-5">
            <div className="flex items-end gap-2 sm:gap-4">
              {quarters.map((q) => {
                const max = Math.max(...quarters.map((x) => x.cents))
                return (
                  <div key={q.quarter} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-[10px] text-cream-muted">{money(q.cents)}</span>
                    <div
                      className="w-full rounded-t bg-gold-gradient"
                      style={{ height: `${Math.max(6, (q.cents / max) * 120)}px` }}
                    />
                    <span className="text-[10px] uppercase tracking-wider text-cream-muted">
                      {q.quarter.split(' ')[1]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <DiamondRule className="my-9" />

      {/* ---- Needs attention ---- */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Open flags" href="/admin/flags" icon={AlertTriangle}>
          {(openFlags ?? []).length === 0 && <Empty text="Nothing flagged." />}
          {((openFlags ?? []) as WithMember<{ id: string; note: string; severity: string; created_at: string }>[]).map((f) => (
            <Link
              key={f.id}
              href={`/admin/members/${f.member?.id}`}
              className="block border-b border-ink-line/60 px-4 py-3 last:border-0 hover:bg-ink-raised"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm text-cream">
                  {f.member?.first_name} {f.member?.last_name}
                </p>
                <span className={severityClass(f.severity)}>{f.severity}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-cream-muted">{f.note}</p>
            </Link>
          ))}
        </Panel>

        <Panel title="Unread messages" href="/admin/messages" icon={Users}>
          {(unreadThreads ?? []).length === 0 && <Empty text="Inbox clear." />}
          {((unreadThreads ?? []) as WithMember<{ id: string; subject: string; last_message_at: string }>[]).map((t) => (
            <Link
              key={t.id}
              href={`/admin/messages?thread=${t.id}`}
              className="block border-b border-ink-line/60 px-4 py-3 last:border-0 hover:bg-ink-raised"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-sm text-cream">{t.subject}</p>
                <span className="shrink-0 text-[10px] text-cream-muted">
                  {relative(t.last_message_at)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-cream-muted">
                {t.member?.first_name} {t.member?.last_name}
              </p>
            </Link>
          ))}
        </Panel>

        <Panel title="Locker requests" href="/admin/requests" icon={Package}>
          {(openRequests ?? []).length === 0 && <Empty text="Nothing outstanding." />}
          {((openRequests ?? []) as WithMember<{ id: string; requested_name: string; status: string; created_at: string }>[]).map((r) => (
            <Link
              key={r.id}
              href="/admin/requests"
              className="block border-b border-ink-line/60 px-4 py-3 last:border-0 hover:bg-ink-raised"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-sm text-cream">{r.requested_name}</p>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-gold">
                  {r.status}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-cream-muted">
                {r.member?.first_name} {r.member?.last_name} · {shortDate(r.created_at)}
              </p>
            </Link>
          ))}
        </Panel>

        <Panel title="Fittings" href="/admin/fittings" icon={Ruler}>
          {(dueFittings ?? []).length === 0 && <Empty text="None on the board." />}
          {((dueFittings ?? []) as WithMember<{ id: string; status: string; scheduled_at: string | null; spirit_category: string | null }>[]).map((f) => (
            <Link
              key={f.id}
              href="/admin/fittings"
              className="block border-b border-ink-line/60 px-4 py-3 last:border-0 hover:bg-ink-raised"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-sm text-cream">
                  {f.member?.first_name} {f.member?.last_name}
                </p>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-gold">
                  {f.status}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-cream-muted">
                {f.spirit_category ?? 'Open category'}
                {f.scheduled_at && ` · ${shortDate(f.scheduled_at)}`}
              </p>
            </Link>
          ))}
        </Panel>
      </div>
    </div>
  )
}

function severityClass(severity: string) {
  const base = 'shrink-0 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider'
  if (severity === 'urgent') return `${base} bg-red-500/15 text-red-300`
  if (severity === 'attention') return `${base} bg-gold/15 text-gold-bright`
  return `${base} bg-cream/10 text-cream-muted`
}

function Stat({
  label, value, detail, href, icon: Icon,
}: {
  label: string
  value: string | number
  detail: string
  href?: string
  icon: typeof Users
}) {
  const inner = (
    <div className="card h-full p-4 transition-colors hover:border-gold/35">
      <Icon className="h-4 w-4 text-gold" strokeWidth={1.5} />
      <p className="mt-3 font-display text-2xl leading-none">{value}</p>
      <p className="mt-1.5 text-xs text-cream">{label}</p>
      <p className="text-[11px] text-cream-muted">{detail}</p>
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

function Panel({
  title, href, icon: Icon, children,
}: {
  title: string
  href: string
  icon: typeof Users
  children: React.ReactNode
}) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-line px-4 py-3">
        <h2 className="flex items-center gap-2 font-display text-base">
          <Icon className="h-4 w-4 text-gold" strokeWidth={1.5} />
          {title}
        </h2>
        <Link href={href} className="text-xs text-gold hover:text-gold-bright">See all</Link>
      </div>
      <div>{children}</div>
    </section>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="px-4 py-8 text-center text-sm text-cream-muted">{text}</p>
}
