import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Exchanges a magic-link / invite code for a session cookie. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next')
  // /auth/landing picks the destination once the session exists — staff open on
  // the admin panel, members on the portal.
  const safeNext =
    next && next.startsWith('/')
      ? `/auth/landing?next=${encodeURIComponent(next)}`
      : '/auth/landing'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?reason=invalid-link`)
  }

  const supabase = createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?reason=expired-link`)
  }

  return NextResponse.redirect(`${origin}${safeNext}`)
}
