import Link from 'next/link'
import { Upload, UserPlus } from 'lucide-react'
import { requireStaff } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { MemberTable } from '@/components/admin/MemberTable'
import type { Profile } from '@/lib/types'

export const metadata = { title: 'Members' }

export type MemberRow = Profile & {
  lifetime_cents: number
  visit_count: number
  last_visit: string | null
  open_flags: number
}

export default async function MembersPage() {
  await requireStaff()
  const supabase = createClient()

  const [{ data: profiles }, { data: sales }, { data: visits }, { data: flags }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('role', 'member')
        .neq('status', 'removed')
        .order('last_name'),
      supabase.from('sales_transactions').select('member_id, total_cents'),
      supabase.from('visits').select('member_id, visited_on'),
      supabase.from('member_flags').select('member_id').is('resolved_at', null),
    ])

  // Aggregate in memory: a few thousand rows is far cheaper than a round trip
  // per member, and this page is staff-only so the payload is not a concern.
  const spend = new Map<string, number>()
  for (const s of sales ?? []) {
    spend.set(s.member_id as string, (spend.get(s.member_id as string) ?? 0) + (s.total_cents as number))
  }

  const visitAgg = new Map<string, { count: number; last: string }>()
  for (const v of visits ?? []) {
    const id = v.member_id as string
    const day = v.visited_on as string
    const cur = visitAgg.get(id)
    if (!cur) visitAgg.set(id, { count: 1, last: day })
    else {
      cur.count += 1
      if (day > cur.last) cur.last = day
    }
  }

  const flagAgg = new Map<string, number>()
  for (const f of flags ?? []) {
    flagAgg.set(f.member_id as string, (flagAgg.get(f.member_id as string) ?? 0) + 1)
  }

  const rows: MemberRow[] = ((profiles ?? []) as Profile[]).map((p) => ({
    ...p,
    lifetime_cents: spend.get(p.id) ?? 0,
    visit_count: visitAgg.get(p.id)?.count ?? 0,
    last_visit: visitAgg.get(p.id)?.last ?? null,
    open_flags: flagAgg.get(p.id) ?? 0,
  }))

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">The membership</p>
          <h1 className="mt-1.5 font-display text-3xl sm:text-4xl">Members</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/members/import" className="btn-ghost px-3">
            <Upload className="h-4 w-4" />
            Import sales data
          </Link>
          <Link href="/admin/members/new" className="btn-gold px-3">
            <UserPlus className="h-4 w-4" />
            Add member
          </Link>
        </div>
      </header>

      <MemberTable rows={rows} />
    </div>
  )
}
