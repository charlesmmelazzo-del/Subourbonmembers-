'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import {
  Home, Wine, CalendarDays, Lock, MessageSquare, User,
  ShieldCheck, ConciergeBell, Heart,
} from 'lucide-react'
import { LogoMark, LogoTypeface } from '@/components/ui/Logo'
import { displayName, initials, isStaff, type Profile } from '@/lib/types'

type Item = {
  href: string
  label: string
  icon: typeof Home
  badge?: number
  /** Shown in the mobile tab bar. Only five fit comfortably. */
  primary?: boolean
}

export function PortalNav({
  profile,
  unreadMessages,
  unreadShares,
}: {
  profile: Profile
  unreadMessages: number
  unreadShares: number
}) {
  const pathname = usePathname()

  const items: Item[] = [
    { href: '/', label: 'Tonight', icon: Home, primary: true },
    { href: '/spirits', label: 'Menu', icon: Wine, primary: true },
    { href: '/events', label: 'Calendar', icon: CalendarDays, primary: true },
    { href: '/locker', label: 'My Locker', icon: Lock, primary: true },
    { href: '/collection', label: 'My Collection', icon: Heart, badge: unreadShares },
    { href: '/messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages, primary: true },
    { href: '/account', label: 'Membership', icon: User },
  ]

  const active = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <>
      {/* ---- Desktop rail ---- */}
      <nav className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-ink-line/60 bg-ink-raised/40 px-4 py-6 lg:flex">
        <Link href="/" className="mb-8 flex flex-col items-start gap-3 px-2">
          <LogoMark size={30} />
          <LogoTypeface width={150} />
        </Link>

        <ul className="flex-1 space-y-1">
          {items.map((item) => (
            <li key={item.href}>
              <NavLink item={item} active={active(item.href)} />
            </li>
          ))}
        </ul>

        {isStaff(profile.role) && (
          <div className="mb-4 space-y-1 border-t border-ink-line/60 pt-4">
            <p className="label px-3 pb-2">Staff</p>
            <NavLink
              item={{ href: '/concierge', label: 'Concierge', icon: ConciergeBell }}
              active={active('/concierge')}
            />
            <NavLink
              item={{ href: '/admin', label: 'Admin Panel', icon: ShieldCheck }}
              active={active('/admin')}
            />
          </div>
        )}

        <MemberChip profile={profile} />
      </nav>

      {/* ---- Mobile top bar ---- */}
      <div className="flex items-center justify-between border-b border-ink-line/60 px-4 py-3 lg:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark size={22} />
          <LogoTypeface width={110} />
        </Link>
        <Link
          href="/account"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-gold/40 text-[11px] text-gold"
        >
          {initials(profile)}
        </Link>
      </div>

      {/* ---- Mobile tab bar ---- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-line/60 bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="grid grid-cols-5">
          {items.filter((i) => i.primary).map((item) => {
            const on = active(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    'relative flex flex-col items-center gap-1 py-2.5 text-[10px] transition-colors',
                    on ? 'text-gold' : 'text-cream-muted'
                  )}
                >
                  <item.icon className="h-5 w-5" strokeWidth={on ? 2 : 1.5} />
                  {item.label}
                  {!!item.badge && (
                    <span className="absolute right-[22%] top-1.5 h-1.5 w-1.5 rounded-full bg-gold" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}

function NavLink({ item, active }: { item: Item; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={clsx(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-base',
        active
          ? 'bg-gold/10 text-gold-bright'
          : 'text-cream/70 hover:bg-ink-card hover:text-cream'
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2 : 1.5} />
      <span className="flex-1">{item.label}</span>
      {!!item.badge && (
        <span className="rounded-full bg-gold px-1.5 text-[10px] font-medium text-ink">
          {item.badge}
        </span>
      )}
    </Link>
  )
}

function MemberChip({ profile }: { profile: Profile }) {
  const tierLabel =
    profile.tier === 'senior' ? 'Senior Member'
    : profile.tier === 'comember' ? 'Co-Member'
    : 'Junior Member'

  return (
    <div className="flex items-center gap-3 rounded-lg border border-ink-line bg-ink-card px-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/40 text-[11px] text-gold">
        {initials(profile)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-cream">{displayName(profile)}</p>
        <p className="truncate text-[11px] text-cream-muted">{tierLabel}</p>
      </div>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="text-[10px] uppercase tracking-wider text-cream-muted hover:text-gold"
        >
          Out
        </button>
      </form>
    </div>
  )
}
