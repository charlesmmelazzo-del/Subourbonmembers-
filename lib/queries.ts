import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { quarterOf } from '@/lib/format'
import { defaultMenuTree, menuTreeFromNodes, type MenuTree } from '@/lib/menu'
import type {
  CatalogItemFull, CatalogKind, EventRow, MenuNode, Profile, SalesTransaction,
} from '@/lib/types'

/**
 * Shared server-side reads. Anything a member and a manager both need to see
 * lives here so the two views cannot drift apart.
 */

const ITEM_SELECT = `
  *,
  producer:producers(*),
  media:catalog_media(*)
`

export async function getCatalogItem(id: string): Promise<CatalogItemFull | null> {
  const supabase = createClient()
  const { data } = await supabase.from('catalog_items').select(ITEM_SELECT).eq('id', id).single()
  return (data as unknown as CatalogItemFull) ?? null
}

export type CatalogFilters = {
  kind?: CatalogKind
  category?: string
  subcategory?: string
  search?: string
  /** Show the 86 list instead of what is actually on the backbar. */
  eightysixed?: boolean
  limit?: number
}

export async function listCatalog(filters: CatalogFilters = {}): Promise<CatalogItemFull[]> {
  const supabase = createClient()
  let q = supabase
    .from('catalog_items')
    .select(ITEM_SELECT)
    .order('name')
    .limit(filters.limit ?? 500)

  // 86'd bottles never appear in normal browse or search — only in the 86 list.
  q = filters.eightysixed
    ? q.eq('status', 'eightysixed')
    : q.eq('status', 'active')

  if (filters.kind) q = q.eq('kind', filters.kind)
  if (filters.category) q = q.eq('category', filters.category)
  if (filters.subcategory) q = q.eq('subcategory', filters.subcategory)
  if (filters.search) {
    const term = `%${filters.search.replace(/[%_]/g, '')}%`
    q = q.or(`name.ilike.${term},description.ilike.${term},region.ilike.${term}`)
  }

  const { data } = await q
  return (data as unknown as CatalogItemFull[]) ?? []
}

/**
 * The menu's shape. Falls back to the compiled-in taxonomy whenever the table
 * is missing or empty, so a project part-way through its migrations still
 * renders a menu instead of an empty page.
 */
export async function getMenuTree(includeHidden = false): Promise<MenuTree> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('menu_nodes')
    .select('*')
    .order('sort_order')

  if (error || !data?.length) return defaultMenuTree()
  return menuTreeFromNodes(data as MenuNode[], includeHidden)
}

/** Every date a member ordered a given bottle, newest first. */
export async function orderDatesFor(memberId: string, itemId: string): Promise<string[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('sales_transactions')
    .select('transacted_at')
    .eq('member_id', memberId)
    .eq('item_id', itemId)
    .order('transacted_at', { ascending: false })
  return (data ?? []).map((r) => r.transacted_at as string)
}

/** The member's own state across the whole catalog, in two queries. */
export async function getMemberCatalogState(memberId: string) {
  const supabase = createClient()
  const [{ data: favorites }, { data: notes }, { data: ordered }] = await Promise.all([
    supabase.from('favorites').select('item_id').eq('member_id', memberId),
    supabase.from('tasting_notes').select('item_id, rating').eq('member_id', memberId),
    supabase
      .from('sales_transactions')
      .select('item_id')
      .eq('member_id', memberId)
      .not('item_id', 'is', null),
  ])

  return {
    favoriteIds: new Set((favorites ?? []).map((f) => f.item_id as string)),
    noteByItem: new Map(
      (notes ?? []).map((n) => [n.item_id as string, n.rating as number | null])
    ),
    orderedIds: new Set((ordered ?? []).map((o) => o.item_id as string)),
  }
}

// ---------------------------------------------------------------------------
// Spend
// ---------------------------------------------------------------------------

export type QuarterSpend = { quarter: string; cents: number; visits: number }

/** Lifetime spend grouped by calendar quarter, oldest first. */
export function groupSpendByQuarter(rows: Pick<SalesTransaction, 'transacted_at' | 'total_cents'>[]): QuarterSpend[] {
  const buckets = new Map<string, { cents: number; days: Set<string> }>()

  for (const row of rows) {
    const q = quarterOf(row.transacted_at)
    const bucket = buckets.get(q) ?? { cents: 0, days: new Set<string>() }
    bucket.cents += row.total_cents
    bucket.days.add(row.transacted_at.slice(0, 10))
    buckets.set(q, bucket)
  }

  return [...buckets.entries()]
    .map(([quarter, b]) => ({ quarter, cents: b.cents, visits: b.days.size }))
    .sort((a, b) => a.quarter.localeCompare(b.quarter))
}

/** What this member actually drinks, ranked. */
export function topItems(
  rows: Pick<SalesTransaction, 'item_name' | 'item_category' | 'total_cents'>[],
  limit = 8
) {
  const counts = new Map<string, { name: string; category: string | null; times: number; cents: number }>()
  for (const row of rows) {
    const entry = counts.get(row.item_name) ?? {
      name: row.item_name,
      category: row.item_category,
      times: 0,
      cents: 0,
    }
    entry.times += 1
    entry.cents += row.total_cents
    counts.set(row.item_name, entry)
  }
  return [...counts.values()].sort((a, b) => b.times - a.times).slice(0, limit)
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export async function listEvents(from: Date, to: Date): Promise<EventRow[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('events')
    .select('*')
    .gte('starts_at', from.toISOString())
    .lte('starts_at', to.toISOString())
    .neq('status', 'cancelled')
    .order('starts_at')
  return (data as EventRow[]) ?? []
}

/** Confirmed seats per event, so the UI can show what is left. */
export async function seatsTakenByEvent(eventIds: string[]): Promise<Map<string, number>> {
  if (!eventIds.length) return new Map()
  const supabase = createClient()
  const { data } = await supabase
    .from('event_reservations')
    .select('event_id, seats')
    .in('event_id', eventIds)
    .eq('status', 'confirmed')

  const map = new Map<string, number>()
  for (const row of data ?? []) {
    map.set(row.event_id as string, (map.get(row.event_id as string) ?? 0) + (row.seats as number))
  }
  return map
}

// ---------------------------------------------------------------------------
// Member profile bundle — used by both concierge and admin
// ---------------------------------------------------------------------------

export async function getMemberDossier(memberId: string) {
  const supabase = createClient()

  const [
    { data: profile },
    { data: sales },
    { data: visits },
    { data: favorites },
    { data: notes },
    { data: flags },
    { data: chits },
    { data: lockers },
    { data: requests },
    { data: fittings },
    { data: threads },
    { data: reservations },
    { data: coMembers },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', memberId).single(),
    supabase
      .from('sales_transactions')
      .select('*')
      .eq('member_id', memberId)
      .order('transacted_at', { ascending: false }),
    supabase
      .from('visits')
      .select('visited_on')
      .eq('member_id', memberId)
      .order('visited_on', { ascending: false }),
    supabase
      .from('favorites')
      .select('created_at, item:catalog_items(id, name, category, subcategory, status)')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false }),
    supabase
      .from('tasting_notes')
      .select('*, item:catalog_items(id, name, category, subcategory)')
      .eq('member_id', memberId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('member_flags')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false }),
    supabase
      .from('member_chits')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false }),
    supabase.from('lockers').select('*, items:locker_items(*, item:catalog_items(id, name, category))').eq('member_id', memberId),
    supabase
      .from('product_requests')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false }),
    supabase
      .from('fittings')
      .select('*')
      .eq('member_id', memberId)
      .order('requested_at', { ascending: false }),
    supabase
      .from('message_threads')
      .select('*')
      .eq('member_id', memberId)
      .order('last_message_at', { ascending: false }),
    supabase
      .from('event_reservations')
      .select('*, event:events(id, title, starts_at, kind)')
      .eq('member_id', memberId)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false }),
    supabase.from('co_members').select('*').eq('senior_member_id', memberId).neq('status', 'removed'),
  ])

  const salesRows = (sales ?? []) as SalesTransaction[]

  return {
    profile: profile as Profile | null,
    sales: salesRows,
    spendByQuarter: groupSpendByQuarter(salesRows),
    lifetimeSpendCents: salesRows.reduce((sum, r) => sum + r.total_cents, 0),
    top: topItems(salesRows),
    visits: (visits ?? []).map((v) => v.visited_on as string),
    favorites: favorites ?? [],
    notes: notes ?? [],
    flags: flags ?? [],
    chits: chits ?? [],
    lockers: lockers ?? [],
    requests: requests ?? [],
    fittings: fittings ?? [],
    threads: threads ?? [],
    reservations: reservations ?? [],
    coMembers: coMembers ?? [],
  }
}

export type MemberDossier = Awaited<ReturnType<typeof getMemberDossier>>
