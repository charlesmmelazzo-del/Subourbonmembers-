import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/auth'

const MAX_CO_MEMBERS = 3

/**
 * Invites a co-member. Needs the service role to create the auth user and
 * send the invitation, so it cannot live in the browser. The senior member's
 * ownership and their three-slot limit are both re-checked here rather than
 * trusted from the client.
 */
export async function POST(request: NextRequest) {
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { seniorId, email, name } = await request.json()

  const isOwner = seniorId === profile.id && profile.tier === 'senior'
  const isStaff = profile.role === 'manager' || profile.role === 'admin'
  if (!isOwner && !isStaff) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'That does not look like an email address.' }, { status: 400 })
  }

  const supabase = createClient()
  const { count } = await supabase
    .from('co_members')
    .select('id', { count: 'exact', head: true })
    .eq('senior_member_id', seniorId)
    .neq('status', 'removed')

  if ((count ?? 0) >= MAX_CO_MEMBERS) {
    return NextResponse.json(
      { error: 'You already have three co-members. Remove one first.' },
      { status: 409 }
    )
  }

  const { data: existing } = await supabase
    .from('co_members')
    .select('id')
    .eq('senior_member_id', seniorId)
    .eq('invited_email', email.toLowerCase())
    .neq('status', 'removed')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'That person is already on your account.' }, { status: 409 })
  }

  const { data: coMember, error: insertError } = await supabase
    .from('co_members')
    .insert({
      senior_member_id: seniorId,
      invited_email: email.toLowerCase(),
      invited_name: name || null,
    } as never)
    .select('id')
    .single()

  if (insertError || !coMember) {
    return NextResponse.json({ error: 'Could not create the invitation.' }, { status: 500 })
  }

  // Send the invite. If email is not configured yet the co-member row still
  // exists, so a manager can resend from the admin panel.
  try {
    const admin = createAdminClient()
    const [first, ...rest] = (name ?? '').split(' ')
    await admin.auth.admin.inviteUserByEmail(email.toLowerCase(), {
      data: {
        first_name: first ?? '',
        last_name: rest.join(' '),
        tier: 'comember',
        linked_senior_id: seniorId,
        co_member_id: coMember.id,
      },
      redirectTo: `${request.nextUrl.origin}/auth/callback?next=/account`,
    })
  } catch {
    return NextResponse.json(
      { id: coMember.id, warning: 'Invitation saved, but the email did not send.' },
      { status: 200 }
    )
  }

  return NextResponse.json({ id: coMember.id })
}

export async function DELETE(request: NextRequest) {
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = createClient()

  // RLS restricts this to the owning senior member or staff, so a stray id
  // from another account simply matches no rows.
  const { data: row } = await supabase
    .from('co_members')
    .select('profile_id')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase
    .from('co_members')
    .update({ status: 'removed', removed_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Could not remove.' }, { status: 500 })

  // Detach the co-member's profile so they lose access to the locker.
  if (row?.profile_id) {
    await supabase
      .from('profiles')
      .update({ linked_senior_id: null, status: 'removed' })
      .eq('id', row.profile_id)
  }

  return NextResponse.json({ ok: true })
}
