import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Exchanges a magic-link / invite code for a session cookie. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next')
  const safeNext = next && next.startsWith('/') ? next : '/'

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
