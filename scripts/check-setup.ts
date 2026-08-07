/**
 * Verifies a Supabase project is ready before you seed it.
 *
 *   npm run check
 *
 * Checks the three environment variables, the connection, that both migrations
 * ran, and that row-level security is actually switched on. Prints exactly
 * which step to go back to when something is missing.
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })
config({ path: '.env' })

const PASS = '[32m✓[0m'
const FAIL = '[31m✗[0m'
const WARN = '[33m![0m'

let failed = false

function ok(label: string, detail = '') {
  console.log(`  ${PASS} ${label}${detail ? `  ${detail}` : ''}`)
}
function bad(label: string, fix: string) {
  console.log(`  ${FAIL} ${label}`)
  console.log(`      → ${fix}`)
  failed = true
}
function warn(label: string, detail: string) {
  console.log(`  ${WARN} ${label}`)
  console.log(`      ${detail}`)
}

// Tables 0001_init.sql creates. If any are missing, the migration didn't finish.
const EXPECTED_TABLES = [
  'profiles', 'co_members', 'member_activity', 'visits', 'sales_imports',
  'sales_transactions', 'member_flags', 'member_chits', 'producers',
  'catalog_items', 'catalog_media', 'favorites', 'member_lists',
  'member_list_items', 'tasting_notes', 'shares', 'events', 'event_media',
  'event_reservations', 'event_requests', 'message_threads', 'messages',
  'lockers', 'locker_items', 'product_requests', 'fittings', 'fitting_items',
  'notifications', 'app_settings',
]

async function main() {
  console.log('\nChecking your Supabase setup\n')

  // --- Step 1: environment ------------------------------------------------
  console.log('Environment variables')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    bad('NEXT_PUBLIC_SUPABASE_URL is not set', 'Copy .env.example to .env.local and fill it in.')
  } else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) {
    bad(
      `NEXT_PUBLIC_SUPABASE_URL looks wrong: ${url}`,
      'It should look like https://abcdefgh.supabase.co — Project Settings → API → Project URL.'
    )
  } else {
    ok('NEXT_PUBLIC_SUPABASE_URL', url)
  }

  if (!anon) {
    bad('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set', 'Project Settings → API → anon / public key.')
  } else if (anon.length < 40) {
    bad('NEXT_PUBLIC_SUPABASE_ANON_KEY looks too short', 'Copy the whole key — they are long.')
  } else {
    ok('NEXT_PUBLIC_SUPABASE_ANON_KEY', `${anon.slice(0, 12)}…`)
  }

  if (!service) {
    bad(
      'SUPABASE_SERVICE_ROLE_KEY is not set',
      'Project Settings → API → service_role key. Needed to seed and to invite members.'
    )
  } else if (service === anon) {
    bad(
      'SUPABASE_SERVICE_ROLE_KEY is the same as the anon key',
      'You copied the wrong one. The service_role key is the second, hidden key on that page.'
    )
  } else {
    ok('SUPABASE_SERVICE_ROLE_KEY', `${service.slice(0, 12)}…`)
  }

  if (failed) {
    console.log('\nFix the above, then run this again.\n')
    process.exit(1)
  }

  // --- Step 2: connection -------------------------------------------------
  console.log('\nConnection')
  const db = createClient(url!, service!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error: pingError } = await db.from('profiles').select('id').limit(1)

  if (pingError) {
    if (/relation .* does not exist|Could not find the table/i.test(pingError.message)) {
      bad(
        'Connected, but the tables are not there',
        'Run supabase/migrations/0001_init.sql in the SQL editor.'
      )
      console.log('\nStop here and run the migrations.\n')
      process.exit(1)
    }
    bad(`Could not reach the database: ${pingError.message}`, 'Check the URL and the service_role key.')
    process.exit(1)
  }
  ok('Connected and authenticated')

  // --- Step 3: schema -----------------------------------------------------
  console.log('\nSchema — migration 0001_init.sql')
  const missing: string[] = []
  for (const table of EXPECTED_TABLES) {
    const { error } = await db.from(table).select('*', { head: true, count: 'exact' }).limit(0)
    if (error && /does not exist|Could not find the table/i.test(error.message)) {
      missing.push(table)
    }
  }

  if (missing.length > 0) {
    bad(
      `${missing.length} of ${EXPECTED_TABLES.length} tables are missing`,
      `Re-run 0001_init.sql. Missing: ${missing.slice(0, 6).join(', ')}${missing.length > 6 ? '…' : ''}`
    )
  } else {
    ok(`All ${EXPECTED_TABLES.length} tables present`)
  }

  // --- Step 4: data -------------------------------------------------------
  // Counted before the security check, because the security check needs to
  // know whether there is anything there to leak.
  console.log('\nData')
  const [{ count: members }, { count: bottles }, { count: events }] = await Promise.all([
    db.from('profiles').select('id', { count: 'exact', head: true }),
    db.from('catalog_items').select('id', { count: 'exact', head: true }),
    db.from('events').select('id', { count: 'exact', head: true }),
  ])

  if ((members ?? 0) === 0) {
    warn('No members yet', 'Run `npm run seed` to load the demo membership.')
  } else {
    ok('Seeded', `${members} profiles · ${bottles} bottles · ${events} events`)
  }

  // --- Step 5: RLS --------------------------------------------------------
  // A signed-out client must not be able to read profiles. Postgres enforces
  // this by returning an empty set, not an error — so an empty result is only
  // meaningful when we know the table actually has rows in it.
  console.log('\nSecurity — migration 0002_rls.sql')
  const anonDb = createClient(url!, anon!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: leaked, error: rlsError } = await anonDb.from('profiles').select('id').limit(1)
  const leakedCount = leaked?.length ?? 0

  if (leakedCount > 0) {
    bad(
      'Row-level security is NOT protecting your member data',
      'A signed-out visitor can read your members. Run supabase/migrations/0002_rls.sql.'
    )
  } else if (rlsError && /permission denied|row-level security/i.test(rlsError.message)) {
    ok('Row-level security is on — signed-out visitors are blocked')
  } else if (rlsError) {
    warn(`Unexpected response while testing security: ${rlsError.message}`, 'Worth a look.')
  } else if ((members ?? 0) > 0) {
    // Service role sees rows, the public key sees none. That is RLS working.
    ok(
      'Row-level security is on',
      `— ${members} profiles exist, a signed-out visitor sees 0`
    )
  } else {
    warn(
      'Cannot confirm row-level security yet — there is no data to protect',
      'Run `npm run seed`, then run this again for a real answer.'
    )
  }

  // --- Summary ------------------------------------------------------------
  console.log(
    failed
      ? '\nSomething needs fixing — see the arrows above.\n'
      : '\nReady. Run `npm run seed` if you have not, then `npm run dev`.\n'
  )
  process.exit(failed ? 1 : 0)
}

main().catch((err) => {
  console.error('\nCheck failed unexpectedly:', err.message)
  process.exit(1)
})
