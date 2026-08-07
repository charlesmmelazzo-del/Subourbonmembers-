import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/auth'
import { isStaff, type MemberTier } from '@/lib/types'

/**
 * Creates a membership and sends the invitation. Needs the service role to
 * create the auth user, so it lives here rather than in the browser.
 */
export async function POST(request: NextRequest) {
  const staff = await getProfile()
  if (!staff || !isStaff(staff.role)) {
    return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  }

  const body = (await request.json()) as Record<string, string>
  const email = body.email?.trim().toLowerCase()

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'That does not look like an email address.' }, { status: 400 })
  }
  if (!body.first_name?.trim() || !body.last_name?.trim()) {
    return NextResponse.json({ error: 'A first and last name are required.' }, { status: 400 })
  }

  const supabase = createClient()
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'A membership already exists for that email.' },
      { status: 409 }
    )
  }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on this deploy.' },
      { status: 501 }
    )
  }

  const tier = (body.tier === 'senior' ? 'senior' : 'junior') as MemberTier

  const { data: created, error: authError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      first_name: body.first_name.trim(),
      last_name: body.last_name.trim(),
      tier,
    },
    redirectTo: `${request.nextUrl.origin}/auth/callback?next=/account`,
  })

  if (authError || !created.user) {
    return NextResponse.json(
      { error: authError?.message ?? 'Could not send the invitation.' },
      { status: 500 }
    )
  }

  const memberId = created.user.id
  const prefix = tier === 'senior' ? 'SR' : 'JR'

  // The auth trigger creates a bare profile; fill in the rest here.
  const { error: profileError } = await admin
    .from('profiles')
    .update({
      first_name: body.first_name.trim(),
      last_name: body.last_name.trim(),
      phone: body.phone?.trim() || null,
      address_line1: body.address_line1?.trim() || null,
      city: body.city?.trim() || null,
      state: body.state?.trim() || null,
      postal_code: body.postal_code?.trim() || null,
      tier,
      role: 'member',
      status: 'active',
      member_since: body.member_since || new Date().toISOString().slice(0, 10),
      member_number: `${prefix}-${memberId.slice(0, 6).toUpperCase()}`,
      preferences: body.preferences?.trim() || null,
    })
    .eq('id', memberId)

  if (profileError) {
    return NextResponse.json({ error: 'Member created, but the profile did not save.' }, { status: 500 })
  }

  if (body.locker_number?.trim()) {
    await admin.from('lockers').insert({
      member_id: memberId,
      locker_number: body.locker_number.trim(),
      location: 'The Vault',
    } as never)
  }

  return NextResponse.json({ id: memberId })
}
