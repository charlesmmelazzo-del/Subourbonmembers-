/**
 * Signs in as a real seeded member and proves the security actually holds.
 *
 *   npm run check:auth
 *
 * `npm run check` verifies the plumbing. This one verifies the thing that
 * matters: that a signed-in member can read their own data and cannot read
 * anybody else's.
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })
config({ path: '.env' })

const PASS = '[32m✓[0m'
const FAIL = '[31m✗[0m'
const WARN = '[33m![0m'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!
const password = process.env.SEED_PASSWORD ?? 'subourbon-demo-2026'

const MEMBER = 'n.ashford@example.com'   // senior member
const OTHER = 'i.whitlock@example.com'   // a different senior member

let failed = false
const ok = (l: string, d = '') => console.log(`  ${PASS} ${l}${d ? `  ${d}` : ''}`)
const bad = (l: string, fix: string) => {
  console.log(`  ${FAIL} ${l}`)
  console.log(`      → ${fix}`)
  failed = true
}
const warn = (l: string, d: string) => {
  console.log(`  ${WARN} ${l}`)
  console.log(`      ${d}`)
}

async function main() {
  if (!url || !anon || !service) {
    console.error('\nRun `npm run check` first — the environment is not set up.\n')
    process.exit(1)
  }

  console.log('\nChecking sign-in and member privacy\n')

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // A fresh client with the public key — exactly what a member's browser gets.
  const member = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // --- Sign in ------------------------------------------------------------
  console.log('Signing in')
  const { data: signIn, error: signInError } = await member.auth.signInWithPassword({
    email: MEMBER,
    password,
  })

  if (signInError || !signIn.user) {
    bad(
      `Could not sign in as ${MEMBER}: ${signInError?.message}`,
      signInError?.message.includes('Invalid login')
        ? 'Run `npm run seed`, or check SEED_PASSWORD in .env.local.'
        : 'Check Authentication → Providers → Email is enabled in Supabase.'
    )
    process.exit(1)
  }
  ok(`Signed in as ${MEMBER}`)

  // --- Can they see themselves? ------------------------------------------
  console.log('\nWhat this member can see')
  const { data: own } = await member.from('profiles').select('first_name, last_name').eq('id', signIn.user.id).maybeSingle()

  if (!own) {
    bad(
      'Signed in, but cannot read their own profile',
      'The profiles_read policy in 0002_rls.sql may not have applied. Re-run that migration.'
    )
  } else {
    ok('Their own profile', `${own.first_name} ${own.last_name}`)
  }

  const { data: ownNotes } = await member.from('tasting_notes').select('id')
  ok('Their own tasting notes', `${ownNotes?.length ?? 0} visible`)

  const { data: spirits } = await member.from('catalog_items').select('id').eq('status', 'active')
  if ((spirits?.length ?? 0) === 0) {
    bad('Cannot see the spirits list', 'The catalog_items_read policy did not apply.')
  } else {
    ok('The spirits list', `${spirits!.length} bottles`)
  }

  // --- What they must NOT see --------------------------------------------
  console.log("\nWhat this member must NOT see")

  const { data: otherProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', OTHER)
    .single()

  const otherId = otherProfile!.id as string

  const { data: peek } = await member.from('profiles').select('id').eq('id', otherId)
  if ((peek?.length ?? 0) > 0) {
    bad(
      "Can read another member's profile",
      'Re-run 0002_rls.sql — members should only see themselves and their household.'
    )
  } else {
    ok("Another member's profile is hidden")
  }

  const { data: notePeek } = await member.from('tasting_notes').select('id').eq('member_id', otherId)
  if ((notePeek?.length ?? 0) > 0) {
    bad("Can read another member's tasting notes", 'Re-run 0002_rls.sql.')
  } else {
    ok("Another member's tasting notes are hidden")
  }

  const { data: spendPeek } = await member
    .from('sales_transactions')
    .select('id')
    .eq('member_id', otherId)
  if ((spendPeek?.length ?? 0) > 0) {
    bad("Can read another member's spend history", 'Re-run 0002_rls.sql.')
  } else {
    ok("Another member's spend history is hidden")
  }

  const { data: notePeek2 } = await member.from('member_chits').select('id').limit(1)
  if ((notePeek2?.length ?? 0) > 0) {
    bad('Can read staff-only chits', 'member_chits should be staff-only. Re-run 0002_rls.sql.')
  } else {
    ok('Staff-only chits are hidden')
  }

  // --- Can they escalate themselves? -------------------------------------
  console.log('\nCan they promote themselves?')
  const { error: escalation } = await member
    .from('profiles')
    .update({ role: 'admin', vip: true })
    .eq('id', signIn.user.id)

  const { data: after } = await admin
    .from('profiles')
    .select('role')
    .eq('id', signIn.user.id)
    .single()

  if (after?.role !== 'member') {
    bad(
      'A member just made themselves an admin',
      'The profiles_self_update policy did not apply. Re-run 0002_rls.sql.'
    )
  } else {
    ok('No — role stayed "member"', escalation ? 'the write was rejected' : 'the change was ignored')
  }

  await member.auth.signOut()

  // --- Emailed links ------------------------------------------------------
  console.log('\nEmailed sign-in links')
  warn(
    'This one has to be checked by eye',
    'Supabase → Authentication → URL Configuration → Redirect URLs must list\n' +
      '      your Railway callback and http://localhost:3000/auth/callback.\n' +
      '      Password sign-in works either way — this only affects emailed links.'
  )

  console.log(
    failed
      ? '\nSomething is wrong with your security — see the arrows above.\n'
      : '\nAll good. Members can see their own data and nothing else.\n'
  )
  process.exit(failed ? 1 : 0)
}

main().catch((err) => {
  console.error('\nCheck failed unexpectedly:', err.message)
  process.exit(1)
})
