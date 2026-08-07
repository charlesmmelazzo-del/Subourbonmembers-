import { NextResponse, type NextRequest } from 'next/server'
import { getProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { isStaff } from '@/lib/types'

/**
 * Where a sign-in lands. Staff open on the admin panel — that is their working
 * surface — and members open on the portal.
 *
 * The role only exists server-side, after the session cookie is set, so every
 * way in (password form, magic link, and hitting /login while already signed
 * in) routes through here rather than each guessing at a destination. Staff can
 * still reach the portal from the admin nav; this only decides the first page.
 */
export async function GET(request: NextRequest) {
  // Redirect off nextUrl, never `request.url`: behind Railway's proxy that one
  // carries the internal origin, and the browser is sent to localhost.
  const redirectTo = (path: string, search = '') => {
    const url = request.nextUrl.clone()
    url.pathname = path
    url.search = search
    return NextResponse.redirect(url)
  }

  const next = request.nextUrl.searchParams.get('next')
  const profile = await getProfile()

  // A session with no usable profile has to lose the session, not just get
  // pointed at /login: middleware sends anyone still holding a cookie straight
  // back here, and the two would bounce off each other forever.
  if (!profile || profile.status === 'removed') {
    await createClient().auth.signOut()
    return redirectTo('/login', profile ? '?reason=inactive' : '')
  }

  // An explicit destination — a deep link the member was bounced off — wins.
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    const [pathname, search] = next.split('?')
    return redirectTo(pathname, search ? `?${search}` : '')
  }

  return redirectTo(isStaff(profile.role) ? '/admin' : '/')
}
