/**
 * Seeds a Supabase project with the demo membership, backbar, and calendar.
 *
 *   npm run seed
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 * Safe to re-run: it clears the seeded tables first. It does NOT touch auth
 * users that it did not create (staff and members are matched by email).
 */

import { config } from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { PRODUCERS } from './seed-data/producers'
import { CATALOG } from './seed-data/catalog'
import { MEMBERS, STAFF, type SeedMember } from './seed-data/members'
import { EVENTS } from './seed-data/events'

config({ path: '.env.local' })
config({ path: '.env' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? 'subourbon-demo-2026'

if (!url || !serviceKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Copy .env.example to .env.local and fill both in.'
  )
  process.exit(1)
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ---------------------------------------------------------------------------
// Deterministic RNG, so re-seeding produces the same demo every time.
// ---------------------------------------------------------------------------

let rngState = 0x2f6e2b1
function rand(): number {
  rngState ^= rngState << 13
  rngState ^= rngState >>> 17
  rngState ^= rngState << 5
  return ((rngState >>> 0) % 100000) / 100000
}
const randInt = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1))
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]
const chance = (p: number) => rand() < p
function sample<T>(xs: readonly T[], n: number): T[] {
  const pool = [...xs]
  const out: T[] = []
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0])
  return out
}

const DAY = 86_400_000
const now = new Date()
const iso = (d: Date) => d.toISOString()
const dateOnly = (d: Date) => d.toISOString().slice(0, 10)
const offsetDays = (n: number) => new Date(now.getTime() + n * DAY)

function log(step: string, detail = '') {
  console.log(`  ${step.padEnd(28)} ${detail}`)
}

// ---------------------------------------------------------------------------
// Auth users
// ---------------------------------------------------------------------------

/** Creates the auth user if absent; returns the id either way. */
async function ensureUser(
  client: SupabaseClient,
  email: string,
  meta: Record<string, unknown>
): Promise<string> {
  const { data: created, error } = await client.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: meta,
  })

  if (!error && created.user) return created.user.id

  // Already registered — find them. listUsers is paginated, so walk it.
  for (let page = 1; page <= 20; page++) {
    const { data } = await client.auth.admin.listUsers({ page, perPage: 200 })
    const hit = data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (hit) return hit.id
    if (!data || data.users.length < 200) break
  }

  throw new Error(`Could not create or find auth user for ${email}: ${error?.message}`)
}

// ---------------------------------------------------------------------------
// Wipe
// ---------------------------------------------------------------------------

/**
 * Child tables first so foreign keys never block a delete. Each entry names a
 * NOT NULL column to filter on — PostgREST refuses an unfiltered DELETE, and
 * the two composite-key tables have no `id` to use.
 */
const SEEDED_TABLES: Array<[table: string, notNullColumn: string]> = [
  ['fitting_items', 'id'],
  ['fittings', 'id'],
  ['product_requests', 'id'],
  ['locker_items', 'id'],
  ['lockers', 'id'],
  ['messages', 'id'],
  ['message_threads', 'id'],
  ['event_requests', 'id'],
  ['event_reservations', 'id'],
  ['event_media', 'id'],
  ['events', 'id'],
  ['notifications', 'id'],
  ['shares', 'id'],
  ['tasting_notes', 'id'],
  ['member_list_items', 'list_id'],
  ['member_lists', 'id'],
  ['favorites', 'member_id'],
  ['sales_transactions', 'id'],
  ['sales_imports', 'id'],
  ['visits', 'id'],
  ['member_activity', 'id'],
  ['member_chits', 'id'],
  ['member_flags', 'id'],
  ['catalog_media', 'id'],
  ['catalog_items', 'id'],
  ['producers', 'id'],
  ['co_members', 'id'],
]

async function wipe() {
  for (const [table, column] of SEEDED_TABLES) {
    const { error } = await db.from(table).delete().not(column, 'is', null)
    if (error) throw new Error(`Could not clear ${table}: ${error.message}`)
  }
  log('cleared', `${SEEDED_TABLES.length} tables`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('\nSeeding Subourbon members portal\n')

  await wipe()

  // --- Staff ---------------------------------------------------------------
  const staffIds: Record<string, string> = {}
  for (const s of STAFF) {
    const id = await ensureUser(db, s.email, {
      first_name: s.first_name,
      last_name: s.last_name,
    })
    staffIds[s.email] = id
    await db.from('profiles').upsert({
      id,
      email: s.email,
      first_name: s.first_name,
      last_name: s.last_name,
      phone: s.phone,
      role: s.role,
      tier: 'senior',
      status: 'active',
      member_since: '2023-01-01',
      member_number: `S-${Object.keys(staffIds).length.toString().padStart(3, '0')}`,
    })
  }
  const adminId = staffIds[STAFF[0].email]
  const managerIds = STAFF.filter((s) => s.role === 'manager').map((s) => staffIds[s.email])
  log('staff', `${STAFF.length} accounts`)

  // --- Members -------------------------------------------------------------
  const memberIds: string[] = []
  for (const [i, m] of MEMBERS.entries()) {
    const id = await ensureUser(db, m.email, {
      first_name: m.first_name,
      last_name: m.last_name,
      tier: m.tier,
    })
    memberIds.push(id)
    await db.from('profiles').upsert({
      id,
      email: m.email,
      first_name: m.first_name,
      last_name: m.last_name,
      phone: m.phone,
      address_line1: m.address_line1,
      city: m.city,
      state: m.state,
      postal_code: m.postal_code,
      role: 'member',
      tier: m.tier,
      status: 'active',
      member_number: `${m.tier === 'senior' ? 'SR' : 'JR'}-${(i + 1).toString().padStart(3, '0')}`,
      member_since: m.member_since,
      renewal_date: dateOnly(
        new Date(new Date(m.member_since).setFullYear(now.getFullYear() + 1))
      ),
      birthday: m.birthday,
      vip: m.vip ?? false,
      preferences: m.preferences ?? null,
      last_seen_at: iso(offsetDays(-randInt(0, 40))),
    })
  }
  log('members', `${MEMBERS.length} profiles`)

  // --- Co-members ----------------------------------------------------------
  let coCount = 0
  for (const [i, m] of MEMBERS.entries()) {
    for (const co of m.co_members ?? []) {
      const [first, ...rest] = co.name.split(' ')
      const row: Record<string, unknown> = {
        senior_member_id: memberIds[i],
        invited_email: co.email,
        invited_name: co.name,
        status: co.accepted ? 'accepted' : 'invited',
        invited_at: iso(offsetDays(-randInt(30, 400))),
      }

      if (co.accepted) {
        const coId = await ensureUser(db, co.email, {
          first_name: first,
          last_name: rest.join(' '),
          tier: 'comember',
        })
        await db.from('profiles').upsert({
          id: coId,
          email: co.email,
          first_name: first,
          last_name: rest.join(' '),
          role: 'member',
          tier: 'comember',
          status: 'active',
          member_since: m.member_since,
          linked_senior_id: memberIds[i],
        })
        row.profile_id = coId
        row.accepted_at = iso(offsetDays(-randInt(10, 300)))
      }

      await db.from('co_members').insert(row as never)
      coCount++
    }
  }
  log('co-members', `${coCount} invitations`)

  // --- Producers & catalog -------------------------------------------------
  const { data: producerRows } = await db
    .from('producers')
    .insert(PRODUCERS.map((p) => ({ ...p })) as never)
    .select('id, name')
  const producerByName = new Map((producerRows ?? []).map((p) => [p.name, p.id]))
  log('producers', `${producerRows?.length ?? 0}`)

  const itemRows = CATALOG.map((item) => ({
    kind: item.kind ?? 'spirit',
    category: item.category,
    subcategory: item.subcategory ?? null,
    name: item.name,
    producer_id: item.producer ? producerByName.get(item.producer) ?? null : null,
    country: item.country ?? null,
    region: item.region ?? null,
    abv: item.abv ?? null,
    proof: item.abv ? item.abv * 2 : null,
    age_statement: item.age_statement ?? null,
    vintage: item.vintage ?? null,
    description: item.description,
    tasting_notes: item.tasting_notes ?? null,
    status: item.status ?? 'active',
    price_cents: item.price_cents ?? null,
    specs: item.specs,
    eightysixed_at: item.status === 'eightysixed' ? iso(offsetDays(-randInt(30, 300))) : null,
    created_by: adminId,
  }))

  const { data: catalogRows, error: catErr } = await db
    .from('catalog_items')
    .insert(itemRows as never)
    .select('id, name, category, subcategory, status, price_cents')
  if (catErr) throw catErr
  const items = catalogRows ?? []
  const activeItems = items.filter((i) => i.status === 'active')
  log('catalog', `${items.length} items (${activeItems.length} active)`)

  // A couple of embedded videos, to prove the media system works.
  const mediaTargets = sample(activeItems, 6)
  await db.from('catalog_media').insert(
    mediaTargets.flatMap((item, n) => [
      {
        item_id: item.id,
        kind: 'youtube' as const,
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        caption: `Inside the distillery — ${item.name}`,
        sort_order: 0,
      },
      ...(n % 2 === 0
        ? [{
            item_id: item.id,
            kind: 'image' as const,
            url: '/images/space/subourbon-executive-bottles.jpg',
            caption: 'On the backbar',
            sort_order: 1,
          }]
        : []),
    ]) as never
  )

  // --- Visits & Toast sales ------------------------------------------------
  const { data: importRow } = await db
    .from('sales_imports')
    .insert({
      filename: 'toast_sales_export_seed.csv',
      imported_by: adminId,
      notes: 'Generated demo history — replace with a real Toast export.',
    } as never)
    .select('id')
    .single()

  const SPEND_PER_VISIT: Record<SeedMember['spend_band'], [number, number]> = {
    low: [3200, 8500],
    mid: [7000, 16000],
    high: [14000, 32000],
    whale: [28000, 75000],
  }

  const COCKTAILS = [
    'Old Fashioned', 'Daiquiri', 'Negroni', 'Manhattan', 'Martini',
    'Boulevardier', 'Sazerac', 'Paper Plane', 'Penicillin', 'Highball',
  ]

  const visits: Array<Record<string, unknown>> = []
  const sales: Array<Record<string, unknown>> = []

  for (const [i, m] of MEMBERS.entries()) {
    const memberId = memberIds[i]
    const joined = new Date(m.member_since)
    const monthsMember = Math.max(
      1,
      Math.round((now.getTime() - joined.getTime()) / (DAY * 30.4))
    )
    const visitCount = Math.min(220, Math.round(monthsMember * m.visit_rate))
    const seen = new Set<string>()

    for (let v = 0; v < visitCount; v++) {
      const daysAgo = randInt(0, Math.floor((now.getTime() - joined.getTime()) / DAY))
      const day = dateOnly(offsetDays(-daysAgo))
      if (seen.has(day)) continue
      seen.add(day)
      visits.push({ member_id: memberId, visited_on: day, source: 'toast' })

      // Two to five line items per visit.
      const checkId = `CHK-${memberId.slice(0, 6)}-${v}`
      const at = new Date(`${day}T${randInt(17, 22)}:${randInt(0, 59)}:00Z`)
      const [lo, hi] = SPEND_PER_VISIT[m.spend_band]
      const target = randInt(lo, hi)
      let spent = 0

      for (let line = 0; line < randInt(2, 5) && spent < target; line++) {
        const useBottle = chance(0.62)
        if (useBottle) {
          const item = pick(items)
          const price = item.price_cents ?? randInt(900, 2400)
          sales.push({
            member_id: memberId,
            import_id: importRow?.id ?? null,
            toast_check_id: checkId,
            transacted_at: iso(at),
            item_name: item.name,
            item_category: item.category,
            item_id: item.id,
            quantity: 1,
            unit_price_cents: price,
            total_cents: price,
          })
          spent += price
        } else {
          const price = randInt(1600, 2200)
          sales.push({
            member_id: memberId,
            import_id: importRow?.id ?? null,
            toast_check_id: checkId,
            transacted_at: iso(at),
            item_name: pick(COCKTAILS),
            item_category: 'Cocktails',
            item_id: null,
            quantity: 1,
            unit_price_cents: price,
            total_cents: price,
          })
          spent += price
        }
      }
    }
  }

  for (let i = 0; i < visits.length; i += 500) {
    await db.from('visits').insert(visits.slice(i, i + 500) as never)
  }
  for (let i = 0; i < sales.length; i += 500) {
    await db.from('sales_transactions').insert(sales.slice(i, i + 500) as never)
  }
  await db
    .from('sales_imports')
    .update({ row_count: sales.length, matched_count: sales.length } as never)
    .eq('id', importRow!.id)
  log('history', `${visits.length} visits, ${sales.length} line items`)

  // --- Favorites, lists, notes, shares -------------------------------------
  const favorites: Array<Record<string, unknown>> = []
  const notes: Array<Record<string, unknown>> = []
  const listRows: Array<Record<string, unknown>> = []

  const LIST_NAMES = [
    'Favorite Ryes', 'Locker Wishlist', 'Rainy Tuesday', 'Show These To Guests',
    'Agave Rabbit Hole', 'Bitter Things', 'For the Cabin', 'Never Again',
    'Anniversary Bottles', 'Highball Candidates',
  ]

  for (const [i, m] of MEMBERS.entries()) {
    const memberId = memberIds[i]
    const engagement = m.tier === 'senior' ? randInt(6, 22) : randInt(2, 10)

    for (const item of sample(activeItems, engagement)) {
      favorites.push({
        member_id: memberId,
        item_id: item.id,
        created_at: iso(offsetDays(-randInt(1, 500))),
      })
      if (chance(0.45)) {
        notes.push({
          member_id: memberId,
          item_id: item.id,
          rating: randInt(3, 5),
          nose: pick([
            'Bright citrus over something darker.',
            'Dusty, in a good way.',
            'Cooked fruit and a little smoke.',
            'Floral first, then grain.',
            'Sea air. Genuinely.',
          ]),
          palate: pick([
            'Rounder than the nose suggested.',
            'Sharp entry, long sweet middle.',
            'Oily texture, coats everything.',
            'More tannin than expected.',
            'Sweet, then abruptly not.',
          ]),
          finish: pick([
            'Goes on far longer than it should.',
            'Short and clean.',
            'Drying, faintly bitter, excellent.',
            'Warm and slow.',
          ]),
          body: chance(0.4) ? 'Would buy a bottle for the locker.' : null,
          created_at: iso(offsetDays(-randInt(1, 400))),
        })
      }
    }

    if (chance(m.tier === 'senior' ? 0.8 : 0.35)) {
      for (const name of sample(LIST_NAMES, randInt(1, 3))) {
        listRows.push({
          member_id: memberId,
          name,
          description: chance(0.5) ? 'Working list — reorder as I go.' : null,
        })
      }
    }
  }

  for (let i = 0; i < favorites.length; i += 500) {
    await db.from('favorites').insert(favorites.slice(i, i + 500) as never)
  }
  for (let i = 0; i < notes.length; i += 500) {
    await db.from('tasting_notes').insert(notes.slice(i, i + 500) as never)
  }
  const { data: createdLists } = await db
    .from('member_lists')
    .insert(listRows as never)
    .select('id, member_id')

  const listItems: Array<Record<string, unknown>> = []
  for (const list of createdLists ?? []) {
    sample(activeItems, randInt(3, 9)).forEach((item, order) => {
      listItems.push({ list_id: list.id, item_id: item.id, sort_order: order })
    })
  }
  for (let i = 0; i < listItems.length; i += 500) {
    await db.from('member_list_items').insert(listItems.slice(i, i + 500) as never)
  }
  log('tastes', `${favorites.length} favorites, ${notes.length} notes, ${createdLists?.length ?? 0} lists`)

  // Members sharing lists with each other.
  const shares: Array<Record<string, unknown>> = []
  for (const list of sample(createdLists ?? [], Math.min(24, (createdLists ?? []).length))) {
    for (const to of sample(memberIds.filter((id) => id !== list.member_id), randInt(1, 3))) {
      shares.push({
        from_member_id: list.member_id,
        to_member_id: to,
        entity_type: 'list',
        entity_id: list.id,
        message: pick([
          'Thought of you the second I made this.',
          'You will hate half of these. Tell me which half.',
          'Start at the bottom and work up.',
          null,
        ]),
        created_at: iso(offsetDays(-randInt(1, 120))),
        read_at: chance(0.5) ? iso(offsetDays(-randInt(0, 30))) : null,
      })
    }
  }
  await db.from('shares').insert(shares as never)
  log('shares', `${shares.length}`)

  // --- Events --------------------------------------------------------------
  const eventRows = EVENTS.map((e) => {
    const start = offsetDays(e.day_offset)
    start.setHours(e.start_hour, 0, 0, 0)
    const end = e.end_hour ? new Date(start) : null
    if (end && e.end_hour) end.setHours(e.end_hour, 0, 0, 0)
    return {
      title: e.title,
      slug: `${e.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${
        e.day_offset
      }`,
      kind: e.kind,
      status: 'published' as const,
      starts_at: iso(start),
      ends_at: end ? iso(end) : null,
      all_day: e.all_day ?? false,
      summary: e.summary,
      details: e.details ?? null,
      hero_image_url: e.hero ?? null,
      location: e.location ?? null,
      capacity: e.capacity ?? null,
      requires_reservation: e.requires_reservation ?? false,
      ticket_price_cents: e.ticket_price_cents ?? null,
      tier_required: e.tier_required ?? null,
      host_member_id: e.host_index !== undefined ? memberIds[e.host_index] : null,
      created_by: adminId,
    }
  })

  const { data: createdEvents, error: evErr } = await db
    .from('events')
    .insert(eventRows as never)
    .select('id, title, kind, capacity, ticket_price_cents, requires_reservation, starts_at, tier_required')
  if (evErr) throw evErr
  log('events', `${createdEvents?.length ?? 0}`)

  // Reservations — fill tastings and concerts partway.
  const reservations: Array<Record<string, unknown>> = []
  for (const ev of createdEvents ?? []) {
    if (!ev.requires_reservation || !ev.capacity) continue
    const eligible = ev.tier_required === 'senior'
      ? memberIds.filter((_, i) => MEMBERS[i].tier === 'senior')
      : memberIds
    const fillRate = ev.kind === 'concert' ? 0.55 : 0.7
    const taking = sample(eligible, Math.min(eligible.length, Math.round(ev.capacity * fillRate)))
    for (const memberId of taking) {
      const seats = ev.kind === 'concert' ? randInt(1, 2) : 1
      reservations.push({
        event_id: ev.id,
        member_id: memberId,
        status: 'confirmed',
        seats,
        amount_cents: (ev.ticket_price_cents ?? 0) * seats,
        created_at: iso(offsetDays(-randInt(1, 20))),
      })
    }
  }
  await db.from('events').select('id').limit(1) // keep the client warm
  for (let i = 0; i < reservations.length; i += 500) {
    await db.from('event_reservations').insert(reservations.slice(i, i + 500) as never)
  }
  log('reservations', `${reservations.length}`)

  // --- Lockers -------------------------------------------------------------
  const lockerRows = MEMBERS.map((m, i) =>
    m.locker
      ? {
          member_id: memberIds[i],
          locker_number: m.locker,
          location: m.locker.startsWith('A') ? 'The Vault — upper' : 'The Vault — lower',
          assigned_at: m.member_since,
        }
      : null
  ).filter(Boolean)

  const { data: createdLockers } = await db
    .from('lockers')
    .insert(lockerRows as never)
    .select('id, member_id, locker_number')

  const lockerItems: Array<Record<string, unknown>> = []
  for (const locker of createdLockers ?? []) {
    for (const item of sample(items, randInt(2, 6))) {
      const removed = chance(0.3)
      lockerItems.push({
        locker_id: locker.id,
        item_id: item.id,
        status: removed ? 'removed' : 'in_locker',
        fill_percent: removed ? 0 : randInt(10, 100),
        added_on: dateOnly(offsetDays(-randInt(30, 500))),
        removed_on: removed ? dateOnly(offsetDays(-randInt(1, 29))) : null,
      })
    }
    if (chance(0.35)) {
      lockerItems.push({
        locker_id: locker.id,
        custom_name: pick([
          'Gift bottle — unlabeled cask sample',
          'Distillery-only bottling from the trip',
          'Homemade limoncello (do not judge)',
          'Wedding bottle — do not open',
        ]),
        custom_description: 'Member-supplied. Not in the house catalog.',
        status: 'in_locker',
        fill_percent: randInt(40, 100),
        added_on: dateOnly(offsetDays(-randInt(10, 200))),
      })
    }
  }
  await db.from('locker_items').insert(lockerItems as never)
  log('lockers', `${createdLockers?.length ?? 0} lockers, ${lockerItems.length} bottles`)

  // --- Threads, requests, fittings, flags, chits ---------------------------
  await seedConversations({
    memberIds,
    managerIds,
    adminId,
    lockers: createdLockers ?? [],
    events: createdEvents ?? [],
    items,
  })

  console.log('\nDone.')
  console.log(`Sign in with any seeded email and password: ${DEMO_PASSWORD}`)
  console.log(`  admin    ${STAFF[0].email}`)
  console.log(`  manager  ${STAFF[1].email}`)
  console.log(`  senior   ${MEMBERS[0].email}`)
  console.log(`  junior   ${MEMBERS.find((m) => m.tier === 'junior')!.email}\n`)
}

// ---------------------------------------------------------------------------
// Messages, requests, fittings, staff notes
// ---------------------------------------------------------------------------

type ConvoArgs = {
  memberIds: string[]
  managerIds: string[]
  adminId: string
  lockers: Array<{ id: string; member_id: string; locker_number: string }>
  events: Array<{ id: string; title: string; starts_at: string }>
  items: Array<{ id: string; name: string; category: string }>
}

async function seedConversations(a: ConvoArgs) {
  const lockerByMember = new Map(a.lockers.map((l) => [l.member_id, l]))

  const threads: Array<Record<string, unknown>> = []
  const pending: Array<{ key: string; messages: Array<Record<string, unknown>> }> = []

  const openThread = (
    memberId: string,
    subject: string,
    kind: string,
    ageDays: number,
    convo: Array<['member' | 'staff', string, boolean?]>
  ) => {
    const key = `${memberId}:${subject}:${ageDays}`
    threads.push({
      member_id: memberId,
      subject,
      kind,
      created_at: iso(offsetDays(-ageDays)),
      last_message_at: iso(offsetDays(-ageDays + convo.length * 0.2)),
      unread_for_staff: convo[convo.length - 1][0] === 'member',
      unread_for_member: convo[convo.length - 1][0] === 'staff',
      __key: key,
    })
    pending.push({
      key,
      messages: convo.map(([who, body, staffNote], n) => ({
        sender_id: who === 'member' ? memberId : pick(a.managerIds),
        sender_role: who === 'member' ? 'member' : 'manager',
        body,
        is_staff_note: staffNote ?? false,
        created_at: iso(offsetDays(-ageDays + n * 0.2)),
      })),
    })
  }

  // General conversations.
  const GENERAL: Array<[string, Array<['member' | 'staff', string, boolean?]>]> = [
    ['Parking on Front St', [
      ['member', 'Is the lot behind the building ours after 6, or am I going to get towed again?'],
      ['staff', 'It is ours after 6pm on weekdays and all day Sunday. Sorry about last time — we covered that ticket.'],
      ['member', 'You did, and I have not forgotten it. Thank you.'],
    ]],
    ['Question about the Hampden', [
      ['member', 'Is the Hampden 8 the same batch you had in the spring? It tasted different on Tuesday.'],
      ['staff', 'Good ear. New batch landed three weeks ago — same marque, but a noticeably brighter one. Come in and we will pour them side by side while the old bottle lasts.'],
    ]],
    ['Dietary note for the supper', [
      ['member', 'Just flagging again that I am vegetarian for the founders room dinner.'],
      ['staff', 'Noted and on the kitchen sheet. Course four changes for you, everything else already works.'],
      ['staff', 'Flagged on the profile so it carries forward.', true],
    ]],
    ['Lost cardigan', [
      ['member', 'I think I left a grey cardigan on the back of a vault chair on Saturday.'],
      ['staff', 'We have it. Behind the bar with your name on it whenever you are next in.'],
    ]],
    ['Membership renewal', [
      ['member', 'When does my renewal come up, and can I move to senior at the same time?'],
      ['staff', 'Yours renews next month. Happy to move you up — I will put the difference on your next check rather than charging separately.'],
      ['member', 'Perfect. Do it.'],
    ]],
  ]

  for (const [subject, convo] of GENERAL) {
    openThread(pick(a.memberIds), subject, 'general', randInt(3, 45), convo)
  }

  const { data: threadRows } = await createThreads(threads)
  const threadIdByKey = new Map(
    (threadRows ?? []).map((t: { id: string; subject: string; member_id: string; created_at: string }) => [
      `${t.member_id}:${t.subject}`,
      t.id,
    ])
  )

  const messageRows = pending.flatMap((p) => {
    const [memberId, subject] = p.key.split(':')
    const threadId = threadIdByKey.get(`${memberId}:${subject}`)
    return threadId ? p.messages.map((m) => ({ ...m, thread_id: threadId })) : []
  })
  await db.from('messages').insert(messageRows as never)

  // --- Locker product requests --------------------------------------------
  const requestSpecs: Array<{
    memberIndex: number
    name: string
    description: string
    status: string
    quoted?: number
    staffNote?: string
  }> = [
    {
      memberIndex: 0, name: 'Hampden Estate LROK single cask',
      description: 'Anything single cask from Hampden, the higher the ester count the better. Budget is flexible.',
      status: 'ordered', quoted: 28000,
      staffNote: 'Distributor has one case allocated to us in October. He is good for it — do not offer the alternative.',
    },
    {
      memberIndex: 3, name: 'Fortaleza Still Strength Blanco',
      description: 'If any allocation comes through I would take two bottles.',
      status: 'quoted', quoted: 14500,
      staffNote: 'Allocation is one bottle, not two. Break that news gently.',
    },
    {
      memberIndex: 5, name: 'Amaro Sfumato — case',
      description: 'A full case for the locker if the pricing works.',
      status: 'added', quoted: 9600,
    },
    {
      memberIndex: 12, name: 'Wild agave — anything unusual',
      description: 'Tobalá, Tepeztate, Madrecuishe — whatever is genuinely rare. I trust your judgment entirely.',
      status: 'received', quoted: 32000,
      staffNote: 'Bought two Tepeztate and one Madrecuishe. Hold the third back for the fitting.',
    },
    {
      memberIndex: 10, name: 'Barrel-proof bourbon, single barrel pick',
      description: 'Would love to be part of a barrel pick if one comes up.',
      status: 'pending',
      staffNote: 'Four Roses pick is scheduled for next quarter — he is a natural for it.',
    },
    {
      memberIndex: 17, name: 'Vertical of Fortaleza Añejo',
      description: 'Trying to build a vertical. Any older bottlings you can source?',
      status: 'cancelled',
      staffNote: 'Nothing available at any sane price. Told her, she understood.',
    },
  ]

  const productRequests = requestSpecs.map((r) => ({
    member_id: a.memberIds[r.memberIndex],
    locker_id: lockerByMember.get(a.memberIds[r.memberIndex])?.id ?? null,
    requested_name: r.name,
    description: r.description,
    status: r.status,
    quoted_price_cents: r.quoted ?? null,
    staff_notes: r.staffNote ?? null,
    created_at: iso(offsetDays(-randInt(5, 90))),
    fulfilled_at: ['added', 'received'].includes(r.status) ? iso(offsetDays(-randInt(1, 20))) : null,
    cancelled_at: r.status === 'cancelled' ? iso(offsetDays(-randInt(1, 30))) : null,
  }))
  await db.from('product_requests').insert(productRequests as never)

  // --- Fittings ------------------------------------------------------------
  const fittingSpecs = [
    {
      memberIndex: 0, status: 'completed',
      occasion: 'Restocking the locker for autumn',
      flavor_profile: 'Funky, high ester, nothing polite',
      spirit_category: 'Rum',
      pre: 'Knows more than we do about Jamaica. Pour the Clairin — he has never had it.',
      post: 'Clairin Sajous was the hit, as suspected. Ordered two. Passed on the Barbados entirely.',
      rating: 5,
      feedback: 'Best hour I have spent in the place. The Clairin was a revelation and I would not have found it myself.',
    },
    {
      memberIndex: 5, status: 'completed',
      occasion: 'Anniversary gift for her husband',
      flavor_profile: 'Bitter, herbal, alpine',
      spirit_category: 'Amaro',
      pre: 'She is the amaro person, but this is for him. He drinks bourbon. Bridge the gap.',
      post: 'Braulio and Nonino both landed. Nonino especially — the grappa base did the bridging.',
      rating: 5,
      feedback: 'He has not stopped talking about the Nonino. Exactly right.',
    },
    {
      memberIndex: 12, status: 'scheduled',
      occasion: 'Just want to go deeper',
      flavor_profile: 'Mineral, wild, unpolished',
      spirit_category: 'Agave Spirits',
      pre: 'Hold back the Madrecuishe from the last order for this. He will pay whatever it costs.',
      scheduledIn: 6,
    },
    {
      memberIndex: 3, status: 'requested',
      occasion: 'Building a highball rotation for weeknights',
      flavor_profile: 'Light, clean, low ABV friendly',
      spirit_category: 'Shochu',
      },
    {
      memberIndex: 19, status: 'requested',
      occasion: 'Curious about shochu after reading the list',
      flavor_profile: 'Savoury and earthy',
      spirit_category: 'Shochu',
    },
  ]

  const fittings = fittingSpecs.map((f) => ({
    member_id: a.memberIds[f.memberIndex],
    status: f.status,
    occasion: f.occasion,
    flavor_profile: f.flavor_profile,
    spirit_category: f.spirit_category,
    availability: [
      { date: dateOnly(offsetDays(randInt(3, 10))), windows: ['evening'] },
      { date: dateOnly(offsetDays(randInt(11, 18))), windows: ['afternoon', 'evening'] },
    ],
    scheduled_at:
      f.status === 'scheduled'
        ? iso(offsetDays(f.scheduledIn ?? 6))
        : f.status === 'completed'
          ? iso(offsetDays(-randInt(20, 90)))
          : null,
    pre_notes: f.pre ?? null,
    post_notes: f.post ?? null,
    requested_at: iso(offsetDays(-randInt(10, 120))),
    completed_at: f.status === 'completed' ? iso(offsetDays(-randInt(5, 60))) : null,
    feedback_rating: f.rating ?? null,
    feedback_body: f.feedback ?? null,
    feedback_at: f.rating ? iso(offsetDays(-randInt(1, 40))) : null,
  }))
  await db.from('fittings').insert(fittings as never)

  // --- Private date requests ----------------------------------------------
  const eventRequests = [
    {
      memberIndex: 1, offset: 47, occasion: 'Wedding reception',
      guests: 80, status: 'approved',
      notes: 'Full space, evening. We will want the vault open for the whiskey people.',
    },
    {
      memberIndex: 15, offset: 62, occasion: '30th birthday',
      guests: 35, status: 'pending',
      notes: 'Main room only is fine. Cocktail service, light food, no seated dinner.',
    },
    {
      memberIndex: 7, offset: 88, occasion: 'Company holiday party',
      guests: 50, status: 'reviewing',
      notes: 'Flexible on the date, less flexible on the budget. Let us talk.',
    },
    {
      memberIndex: 10, offset: 25, occasion: 'Retirement dinner',
      guests: 14, status: 'declined',
      notes: 'Founders room if possible.',
    },
  ].map((r) => ({
    member_id: a.memberIds[r.memberIndex],
    requested_date: dateOnly(offsetDays(r.offset)),
    alt_date: dateOnly(offsetDays(r.offset + 7)),
    occasion: r.occasion,
    guest_count: r.guests,
    start_time: '18:00:00',
    end_time: '23:00:00',
    notes: r.notes,
    status: r.status,
    created_at: iso(offsetDays(-randInt(2, 30))),
  }))
  await db.from('event_requests').insert(eventRequests as never)

  // --- Flags and chits -----------------------------------------------------
  const flags = [
    {
      memberIndex: 30, severity: 'attention',
      note: 'Card on file declined twice last month. Needs a quiet word, not an email.',
    },
    {
      memberIndex: 2, severity: 'info',
      note: 'Prefers the vault seats. If they are gone, tell him before he sits down.',
    },
    {
      memberIndex: 24, severity: 'urgent',
      note: 'Complained about service on the 14th and has not been back since. Owner wants to call personally.',
    },
    {
      memberIndex: 11, severity: 'info',
      note: 'Gluten sensitive — kitchen has it, but confirm on every visit.',
    },
  ].map((f) => ({
    member_id: a.memberIds[f.memberIndex],
    severity: f.severity,
    note: f.note,
    created_by: pick(a.managerIds),
    created_at: iso(offsetDays(-randInt(2, 60))),
  }))
  await db.from('member_flags').insert(flags as never)

  const chits: Array<Record<string, unknown>> = []
  for (const [i, memberId] of a.memberIds.entries()) {
    if (!chance(0.55)) continue
    const kinds = ['preference', 'locker', 'bottle', 'note'] as const
    for (const kind of sample(kinds, randInt(1, 3))) {
      chits.push({
        member_id: memberId,
        kind,
        body: {
          preference: pick([
            'Always starts with something sparkling. Do not ask, just bring it.',
            'Hates crushed ice. Do not use it in anything for this table.',
            'Will say yes to any recommendation. Use that power responsibly.',
            'Prefers to sit at the bar even when a table is free.',
          ]),
          locker: pick([
            `Locker ${lockerByMember.get(memberId)?.locker_number ?? 'unassigned'} — key left at the host stand.`,
            'Asked us to keep two bottles back rather than pour them down.',
            'Locker is nearly full. Worth a conversation about a second one.',
          ]),
          bottle: pick([
            'Bought a full bottle of the Springbank for the locker on the last visit.',
            'Split a bottle of Fortaleza with another member — both accounts noted.',
            'Bottle purchase pending payment; do not chase, they always settle.',
          ]),
          note: pick([
            'Brings guests constantly. Worth the extra attention.',
            'Quiet, does not want to be chatted at. Read the room.',
            'Celebrates an anniversary here every year. Diary it.',
            'Knows the trade. Talks shop happily if you have time.',
          ]),
        }[kind],
        created_by: pick([...a.managerIds, a.adminId]),
        created_at: iso(offsetDays(-randInt(1, 300))),
      })
    }
  }
  await db.from('member_chits').insert(chits as never)

  // --- Notifications for the next event ------------------------------------
  const upcoming = a.events
    .filter((e) => new Date(e.starts_at) > now)
    .sort((x, y) => +new Date(x.starts_at) - +new Date(y.starts_at))[0]

  if (upcoming) {
    const notifications = sample(a.memberIds, 22).map((memberId) => ({
      member_id: memberId,
      kind: 'event_week',
      title: 'This week at Subourbon',
      body: `${upcoming.title} — ${new Date(upcoming.starts_at).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
      })}.`,
      link: `/events?event=${upcoming.id}`,
      channel: 'in_app',
      event_id: upcoming.id,
      sent_at: iso(offsetDays(-1)),
      read_at: chance(0.4) ? iso(offsetDays(-0.5)) : null,
      created_at: iso(offsetDays(-1)),
    }))
    await db.from('notifications').insert(notifications as never)
  }

  // --- Activity stream -----------------------------------------------------
  const activity: Array<Record<string, unknown>> = []
  for (const [i, memberId] of a.memberIds.entries()) {
    const volume = MEMBERS[i].tier === 'senior' ? randInt(20, 120) : randInt(4, 40)
    for (let n = 0; n < volume; n++) {
      const item = pick(a.items)
      activity.push({
        member_id: memberId,
        kind: pick(['view_spirit', 'view_spirit', 'view_spirit', 'search', 'favorite', 'open_calendar', 'open_locker', 'add_note']),
        entity_type: 'catalog_item',
        entity_id: item.id,
        created_at: iso(offsetDays(-randInt(0, 180))),
      })
    }
  }
  for (let i = 0; i < activity.length; i += 1000) {
    await db.from('member_activity').insert(activity.slice(i, i + 1000) as never)
  }

  log('conversations', `${threads.length} threads, ${productRequests.length} requests, ${fittings.length} fittings`)
  log('staff notes', `${flags.length} flags, ${chits.length} chits`)
  log('activity', `${activity.length} events`)
}

async function createThreads(threads: Array<Record<string, unknown>>) {
  const clean = threads.map(({ __key, ...rest }) => rest)
  return db.from('message_threads').insert(clean as never).select('id, subject, member_id, created_at')
}

main().catch((err) => {
  console.error('\nSeed failed:', err)
  process.exit(1)
})
