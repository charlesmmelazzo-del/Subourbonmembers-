import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { AccountForm } from '@/components/account/AccountForm'
import { CoMemberManager } from '@/components/account/CoMemberManager'
import { DiamondRule } from '@/components/ui/Logo'
import { longDate } from '@/lib/format'
import type { CoMember } from '@/lib/types'

export const metadata = { title: 'Membership' }

export default async function AccountPage() {
  const profile = await requireProfile()
  const supabase = createClient()

  const [{ data: coMembers }, { data: senior }] = await Promise.all([
    profile.tier === 'senior'
      ? supabase
          .from('co_members')
          .select('*')
          .eq('senior_member_id', profile.id)
          .neq('status', 'removed')
          .order('invited_at')
      : { data: [] },
    profile.linked_senior_id
      ? supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', profile.linked_senior_id)
          .maybeSingle()
      : { data: null },
  ])

  const tierLabel =
    profile.tier === 'senior' ? 'Senior Member'
    : profile.tier === 'comember' ? 'Co-Member'
    : 'Junior Member'

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-7">
        <p className="label">Your account</p>
        <h1 className="mt-1.5 font-display text-3xl sm:text-4xl">Membership</h1>
      </header>

      <section className="card p-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Detail label="Tier" value={tierLabel} />
          <Detail label="Member number" value={profile.member_number ?? '—'} />
          <Detail label="Member since" value={longDate(profile.member_since)} />
          <Detail
            label="Renews"
            value={profile.renewal_date ? longDate(profile.renewal_date) : '—'}
          />
          {senior && (
            <Detail
              label="Under"
              value={`${senior.first_name} ${senior.last_name}`}
            />
          )}
        </dl>
      </section>

      <DiamondRule className="my-8" />

      <section>
        <h2 className="mb-1 font-display text-xl">Your details</h2>
        <p className="mb-5 text-sm text-cream-muted">
          Keep these current so we can reach you about events and your locker.
        </p>
        <AccountForm profile={profile} />
      </section>

      {profile.tier === 'senior' && (
        <>
          <DiamondRule className="my-8" />
          <section>
            <h2 className="mb-1 font-display text-xl">Your co-members</h2>
            <p className="mb-5 text-sm leading-relaxed text-cream-muted">
              Senior membership includes three co-members. They get their own sign-in,
              share your locker, and can book alongside you. Add or remove them whenever
              you like.
            </p>
            <CoMemberManager
              seniorId={profile.id}
              coMembers={(coMembers ?? []) as CoMember[]}
            />
          </section>
        </>
      )}

      <DiamondRule className="my-8" />

      <form action="/auth/signout" method="post">
        <button type="submit" className="btn-ghost w-full sm:w-auto">Sign out</button>
      </form>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="mt-1 text-sm text-cream">{value}</dd>
    </div>
  )
}
