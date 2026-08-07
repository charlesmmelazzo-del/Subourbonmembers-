import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'

/**
 * The signed-in member's profile, or null. Cached per request so the many
 * server components that need it don't each hit the database.
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (data as Profile | null) ?? null
})

/** Profile or bounce to sign-in. */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  if (profile.status === 'removed') redirect('/login?reason=inactive')
  return profile
}

/** Manager or admin only. */
export async function requireStaff(): Promise<Profile> {
  const profile = await requireProfile()
  if (profile.role !== 'manager' && profile.role !== 'admin') redirect('/')
  return profile
}

/** Admin only — used for destructive and configuration routes. */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile()
  if (profile.role !== 'admin') redirect('/admin')
  return profile
}

/** Senior members and staff may request private dates and book senior events. */
export function canRequestPrivateEvents(profile: Profile): boolean {
  return profile.tier === 'senior' || profile.role !== 'member'
}

/** The membership whose locker and bottles this user shares. */
export function householdRoot(profile: Profile): string {
  return profile.linked_senior_id ?? profile.id
}
