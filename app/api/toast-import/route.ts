import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/auth'
import { isStaff } from '@/lib/types'

export const maxDuration = 60

/**
 * Ingests a Toast sales CSV.
 *
 * Toast's export column names vary by report and by account, so rather than
 * demanding an exact schema we look for the first header that contains any of
 * a set of keywords. Rows that cannot be tied to a member are skipped and
 * counted rather than failing the whole import.
 */

const COLUMN_HINTS = {
  email: ['email', 'e-mail', 'guest email', 'customer email'],
  phone: ['phone', 'mobile', 'telephone'],
  name: ['customer', 'guest name', 'guest', 'name'],
  item: ['menu item', 'item name', 'item', 'product'],
  category: ['sales category', 'menu group', 'category', 'group'],
  amount: ['net sales', 'net price', 'amount', 'total', 'price', 'net amount'],
  quantity: ['qty', 'quantity', 'item qty'],
  date: ['opened', 'date', 'business date', 'paid date', 'closed'],
  check: ['check id', 'check #', 'check number', 'order id', 'guid'],
} as const

function findColumn(headers: string[], hints: readonly string[]): string | null {
  const lowered = headers.map((h) => [h, h.toLowerCase().trim()] as const)
  // Exact-ish match first, then substring, so "Item" beats "Item Discount".
  for (const hint of hints) {
    const exact = lowered.find(([, l]) => l === hint)
    if (exact) return exact[0]
  }
  for (const hint of hints) {
    const partial = lowered.find(([, l]) => l.includes(hint))
    if (partial) return partial[0]
  }
  return null
}

function parseMoney(raw: string | undefined): number {
  if (!raw) return 0
  const cleaned = raw.replace(/[^0-9.-]/g, '')
  const value = Number.parseFloat(cleaned)
  return Number.isFinite(value) ? Math.round(value * 100) : 0
}

function normalizePhone(raw: string | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  return digits.length >= 10 ? digits.slice(-10) : null
}

/** Loose bottle-name match: lowercase, drop punctuation and size suffixes. */
function normalizeItemName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b\d+\s?(ml|oz|cl|l)\b/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function POST(request: NextRequest) {
  const profile = await getProfile()
  if (!profile || !isStaff(profile.role)) {
    return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  }

  const { filename, rows } = (await request.json()) as {
    filename: string
    rows: Record<string, string>[]
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows to import.' }, { status: 400 })
  }

  const headers = Object.keys(rows[0])
  const col = {
    email: findColumn(headers, COLUMN_HINTS.email),
    phone: findColumn(headers, COLUMN_HINTS.phone),
    name: findColumn(headers, COLUMN_HINTS.name),
    item: findColumn(headers, COLUMN_HINTS.item),
    category: findColumn(headers, COLUMN_HINTS.category),
    amount: findColumn(headers, COLUMN_HINTS.amount),
    quantity: findColumn(headers, COLUMN_HINTS.quantity),
    date: findColumn(headers, COLUMN_HINTS.date),
    check: findColumn(headers, COLUMN_HINTS.check),
  }

  if (!col.item || !col.amount) {
    return NextResponse.json(
      { error: 'Could not find an item column and an amount column in that file.' },
      { status: 400 }
    )
  }
  if (!col.email && !col.phone && !col.name) {
    return NextResponse.json(
      { error: 'No customer column found — we need an email, phone, or name to match members.' },
      { status: 400 }
    )
  }

  const supabase = createClient()

  // --- Build lookup tables -------------------------------------------------
  const [{ data: members }, { data: catalog }] = await Promise.all([
    supabase.from('profiles').select('id, email, phone, first_name, last_name').eq('role', 'member'),
    supabase.from('catalog_items').select('id, name'),
  ])

  const byEmail = new Map<string, string>()
  const byPhone = new Map<string, string>()
  const byName = new Map<string, string>()
  for (const m of members ?? []) {
    byEmail.set((m.email as string).toLowerCase(), m.id as string)
    const phone = normalizePhone(m.phone as string)
    if (phone) byPhone.set(phone, m.id as string)
    byName.set(`${m.first_name} ${m.last_name}`.toLowerCase().trim(), m.id as string)
  }

  const itemByName = new Map<string, string>()
  for (const c of catalog ?? []) {
    itemByName.set(normalizeItemName(c.name as string), c.id as string)
  }

  // --- Create the import record -------------------------------------------
  const { data: importRow, error: importError } = await supabase
    .from('sales_imports')
    .insert({ filename, imported_by: profile.id, row_count: rows.length } as never)
    .select('id')
    .single()

  if (importError || !importRow) {
    return NextResponse.json({ error: 'Could not start the import.' }, { status: 500 })
  }

  // --- Transform -----------------------------------------------------------
  const transactions: Array<Record<string, unknown>> = []
  const visitDays = new Set<string>()
  const matchedMembers = new Set<string>()
  const unmatchedNames = new Set<string>()
  let matchedItems = 0
  let skipped = 0

  for (const row of rows) {
    const memberId =
      (col.email && byEmail.get((row[col.email] ?? '').toLowerCase().trim())) ||
      (col.phone && byPhone.get(normalizePhone(row[col.phone]) ?? '')) ||
      (col.name && byName.get((row[col.name] ?? '').toLowerCase().trim())) ||
      null

    if (!memberId) { skipped++; continue }

    const itemName = (row[col.item] ?? '').trim()
    if (!itemName) { skipped++; continue }

    const rawDate = col.date ? row[col.date] : undefined
    const parsed = rawDate ? new Date(rawDate) : new Date()
    const transactedAt = Number.isNaN(parsed.getTime()) ? new Date() : parsed

    const itemId = itemByName.get(normalizeItemName(itemName)) ?? null
    if (itemId) matchedItems++
    else unmatchedNames.add(itemName)

    const total = parseMoney(row[col.amount])
    const quantity = col.quantity ? Number.parseFloat(row[col.quantity]) || 1 : 1

    matchedMembers.add(memberId)
    visitDays.add(`${memberId}|${transactedAt.toISOString().slice(0, 10)}`)

    transactions.push({
      member_id: memberId,
      import_id: importRow.id,
      toast_check_id: col.check ? row[col.check] || null : null,
      transacted_at: transactedAt.toISOString(),
      item_name: itemName,
      item_category: col.category ? row[col.category] || null : null,
      item_id: itemId,
      quantity,
      unit_price_cents: quantity > 0 ? Math.round(total / quantity) : total,
      total_cents: total,
    })
  }

  // --- Write ---------------------------------------------------------------
  let imported = 0
  for (let i = 0; i < transactions.length; i += 500) {
    const chunk = transactions.slice(i, i + 500)
    const { error } = await supabase
      .from('sales_transactions')
      .upsert(chunk as never, {
        onConflict: 'member_id,toast_check_id,item_name,transacted_at',
        ignoreDuplicates: true,
      })
    if (!error) imported += chunk.length
  }

  const visits = [...visitDays].map((key) => {
    const [member_id, visited_on] = key.split('|')
    return { member_id, visited_on, source: 'toast' }
  })
  for (let i = 0; i < visits.length; i += 500) {
    await supabase
      .from('visits')
      .upsert(visits.slice(i, i + 500) as never, {
        onConflict: 'member_id,visited_on',
        ignoreDuplicates: true,
      })
  }

  await supabase
    .from('sales_imports')
    .update({ matched_count: imported, skipped_count: skipped } as never)
    .eq('id', importRow.id)

  return NextResponse.json({
    imported,
    matchedMembers: matchedMembers.size,
    matchedItems,
    skipped,
    unmatchedNames: [...unmatchedNames].slice(0, 60),
  })
}
