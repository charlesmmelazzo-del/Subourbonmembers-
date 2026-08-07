/**
 * Sets the password on the three test logins and shows what's inside each.
 *
 *   npm run logins                    # uses the default password
 *   npm run logins -- 'MyPassword1!'  # sets your own
 *
 * These three accounts are created by `npm run seed` like any other member, so
 * they survive re-seeding. This script only sets their password and reports —
 * it never renames anything.
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })
config({ path: '.env' })

const PASS = '[32m✓[0m'
const FAIL = '[31m✗[0m'
const DIM = '[2m'
const BOLD = '[1m'
const GOLD = '[33m'
const OFF = '[0m'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.argv[2] ?? 'SubourbonTest2026!'

if (!url || !service) {
  console.error('\nRun `npm run check` first — the environment is not set up.\n')
  process.exit(1)
}
if (password.length < 8) {
  console.error('\nSupabase requires a password of at least 8 characters.\n')
  process.exit(1)
}

const db = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const ACCOUNTS = [
  { email: 'admin@subourbon.bar', role: 'Admin', note: 'Admin panel, concierge view, and the member portal.' },
  { email: 'senior@subourbon.bar', role: 'Senior member', note: 'Locker, co-members, private event requests.' },
  { email: 'junior@subourbon.bar', role: 'Junior member', note: 'No locker, no private bookings — that is the tier.' },
] as const

async function findUser(email: string): Promise<string | null> {
  for (let page = 1; page <= 20; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 200 })
    const hit = data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (hit) return hit.id
    if (!data || data.users.length < 200) break
  }
  return null
}

/** A one-line description of what's waiting inside a member account. */
async function describe(memberId: string): Promise<string> {
  const [
    { count: orders }, { count: visits }, { count: favorites }, { count: notes },
    { data: locker }, { count: coMembers }, { count: requests },
    { count: fittings }, { count: threads }, { count: bookings },
  ] = await Promise.all([
    db.from('sales_transactions').select('id', { count: 'exact', head: true }).eq('member_id', memberId),
    db.from('visits').select('id', { count: 'exact', head: true }).eq('member_id', memberId),
    db.from('favorites').select('item_id', { count: 'exact', head: true }).eq('member_id', memberId),
    db.from('tasting_notes').select('id', { count: 'exact', head: true }).eq('member_id', memberId),
    db.from('lockers').select('locker_number').eq('member_id', memberId).maybeSingle(),
    db.from('co_members').select('id', { count: 'exact', head: true }).eq('senior_member_id', memberId).neq('status', 'removed'),
    db.from('product_requests').select('id', { count: 'exact', head: true }).eq('member_id', memberId),
    db.from('fittings').select('id', { count: 'exact', head: true }).eq('member_id', memberId),
    db.from('message_threads').select('id', { count: 'exact', head: true }).eq('member_id', memberId),
    db.from('event_reservations').select('id', { count: 'exact', head: true }).eq('member_id', memberId),
  ])

  const bits: string[] = []
  if (orders) bits.push(`${orders} orders`)
  if (visits) bits.push(`${visits} visits`)
  if (favorites) bits.push(`${favorites} favorites`)
  if (notes) bits.push(`${notes} notes`)
  if (bookings) bits.push(`${bookings} bookings`)
  if (locker) bits.push(`locker ${locker.locker_number}`)
  if (coMembers) bits.push(`${coMembers} co-members`)
  if (requests) bits.push(`${requests} requests`)
  if (fittings) bits.push(`${fittings} fittings`)
  if (threads) bits.push(`${threads} threads`)
  return bits.length ? bits.join(' · ') : 'no history yet'
}

async function main() {
  console.log('\nSetting the password on your three test logins\n')

  const found: Array<{ email: string; role: string; note: string; name: string; has: string }> = []
  let missing = false

  for (const account of ACCOUNTS) {
    const id = await findUser(account.email)

    if (!id) {
      console.log(`  ${FAIL} ${account.email} does not exist`)
      missing = true
      continue
    }

    const { error } = await db.auth.admin.updateUserById(id, { password, email_confirm: true })
    if (error) {
      console.log(`  ${FAIL} ${account.email}: ${error.message}`)
      missing = true
      continue
    }

    const { data: profile } = await db
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', id)
      .maybeSingle()

    console.log(`  ${PASS} ${account.email}`)
    found.push({
      ...account,
      name: profile ? `${profile.first_name} ${profile.last_name}` : '—',
      has: await describe(id),
    })
  }

  if (missing) {
    console.log(`\n${DIM}Missing accounts are created by the seed. Run \`npm run seed\` first.${OFF}\n`)
    if (!found.length) process.exit(1)
  }

  console.log(`\n${BOLD}Sign in with any of these${OFF}`)
  console.log(`${DIM}Password for all three:${OFF} ${GOLD}${password}${OFF}\n`)

  for (const a of found) {
    console.log(`  ${BOLD}${a.email}${OFF}`)
    console.log(`  ${DIM}${a.role} · ${a.name}${OFF}`)
    console.log(`  ${DIM}${a.has}${OFF}`)
    console.log(`  ${DIM}${a.note}${OFF}\n`)
  }

  console.log(`${DIM}Re-run after any re-seed. To set your own password:${OFF}`)
  console.log(`${DIM}  npm run logins -- 'YourPassword'${OFF}\n`)
}

main().catch((err) => {
  console.error(`\nFailed: ${err.message}\n`)
  process.exit(1)
})
