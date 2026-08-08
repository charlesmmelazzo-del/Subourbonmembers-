/**
 * Verifies a Supabase project is ready before you seed it.
 *
 *   npm run check
 *
 * Checks the three environment variables, the connection, that the migrations
 * ran, that row-level security is actually switched on, and that the demo data
 * — including cocktails, staff picks and the two recommendation functions —
 * is really there. Prints exactly which step to go back to when something is
 * missing.
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { mondayOf } from '../lib/format'

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

// Every table, kept next to the migration that creates it, so a missing one
// names the file to go back and run rather than a generic "re-run 0001".
const TABLES_BY_MIGRATION: Array<[migration: string, tables: string[]]> = [
  ['0001_init.sql', [
    'profiles', 'co_members', 'member_activity', 'visits', 'sales_imports',
    'sales_transactions', 'member_flags', 'member_chits', 'producers',
    'catalog_items', 'catalog_media', 'favorites', 'member_lists',
    'member_list_items', 'tasting_notes', 'shares', 'events', 'event_media',
    'event_reservations', 'event_requests', 'message_threads', 'messages',
    'lockers', 'locker_items', 'product_requests', 'fittings', 'fitting_items',
    'notifications', 'app_settings',
  ]],
  ['0004_recommendations.sql', ['item_recommendations', 'staff_picks']],
]

const EXPECTED_TABLES = TABLES_BY_MIGRATION.flatMap(([, tables]) => tables)

const MIGRATION_FOR = new Map(
  TABLES_BY_MIGRATION.flatMap(([migration, tables]) =>
    tables.map((t) => [t, migration] as const)
  )
)

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
  console.log('\nSchema')
  const missing: string[] = []
  for (const table of EXPECTED_TABLES) {
    // Deliberately not a `head: true` count. PostgREST answers a HEAD against
    // a table it has never heard of with a bodyless 200, so supabase-js hands
    // back `error: null` and every missing table looks present — which made
    // this check pass on a half-run migration, the one thing it exists to
    // catch. Asking for a row surfaces the real error.
    const { error } = await db.from(table).select('*').limit(1)
    if (error && /does not exist|Could not find the table/i.test(error.message)) {
      missing.push(table)
    }
  }

  if (missing.length > 0) {
    const byMigration = new Map<string, string[]>()
    for (const table of missing) {
      const file = MIGRATION_FOR.get(table) ?? '0001_init.sql'
      byMigration.set(file, [...(byMigration.get(file) ?? []), table])
    }
    bad(
      `${missing.length} of ${EXPECTED_TABLES.length} tables are missing`,
      [...byMigration]
        .map(([file, tables]) => `Run ${file} — missing ${tables.join(', ')}`)
        .join('\n      → ')
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

  // --- Step 6: recommendations -------------------------------------------
  // 0003 and 0004 are easy to skip, and the symptom is quiet: the menu still
  // works, the two boards just say they could not load. Check them by name.
  console.log('\nRecommendations — migrations 0003 & 0004')

  const [{ count: cocktails }, { count: pairings }, { data: picks }] = await Promise.all([
    db.from('catalog_items').select('id', { count: 'exact', head: true }).eq('kind', 'cocktail'),
    db.from('item_recommendations').select('item_id', { count: 'exact', head: true }),
    db.from('staff_picks').select('week_of'),
  ])

  if ((bottles ?? 0) === 0) {
    warn('Nothing in the catalog to check', 'Run `npm run seed` first.')
  } else if ((cocktails ?? 0) === 0) {
    warn(
      'No cocktails in the catalog',
      'Run 0003_cocktails.sql, let it commit, then re-run `npm run seed`.'
    )
  } else {
    ok('Cocktails', `${cocktails} on the menu`)
  }

  const thisWeek = mondayOf()
  const picksThisWeek = (picks ?? []).filter((p) => p.week_of === thisWeek).length
  if (picks === null) {
    bad('staff_picks is not readable', 'Run supabase/migrations/0004_recommendations.sql.')
  } else if (picksThisWeek === 0) {
    warn(
      `No staff picks for the week of ${thisWeek}`,
      (picks.length > 0
        ? `${picks.length} pick(s) exist for other weeks. `
        : '') + 'Set this week\'s board in the admin panel, or re-run `npm run seed`.'
    )
  } else {
    ok('Staff picks', `${picksThisWeek} for the week of ${thisWeek}`)
  }

  if ((pairings ?? 0) === 0) {
    warn('No curated pairings', 'Optional — members still get co-favorited suggestions.')
  } else {
    ok('Curated pairings', `${pairings}`)
  }

  // The two functions are the part most likely to be missing, and the only
  // part that cannot be spotted by looking at a table. Call them.
  //
  // dealers_choice() reads auth.uid(), which is null under the service key, so
  // this exercises its "what the room favors" fallback rather than a real
  // member's matches. That is enough to prove it exists and runs.
  const { error: dcError } = await db.rpc('dealers_choice', { per_kind: 3 })
  if (dcError) {
    bad(
      `dealers_choice() failed: ${dcError.message}`,
      'Run supabase/migrations/0004_recommendations.sql.'
    )
  } else {
    ok('dealers_choice() runs')
  }

  const { data: sample } = await db
    .from('catalog_items')
    .select('id')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (sample) {
    const { error: rwError } = await db.rpc('recommended_with', { target: sample.id, want: 5 })
    if (rwError) {
      bad(
        `recommended_with() failed: ${rwError.message}`,
        'Run supabase/migrations/0004_recommendations.sql.'
      )
    } else {
      ok('recommended_with() runs')
    }
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
