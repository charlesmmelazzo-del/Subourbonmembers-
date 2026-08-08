'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import {
  CalendarDays, ConciergeBell, Flag, Gauge, MessageSquare, Package,
  Ruler, Users, Wine, ArrowLeft, Menu, X,
} from 'lucide-react'
import { useState } from 'react'
import { LogoMark } from '@/components/ui/Logo'
import { displayName, type Profile } from '@/lib/types'

type Badges = {
  messages: number
  requests: number
  fittings: number
  events: number
  flags: number
}

export function AdminNav({ profile, badges }: { profile: Profile; badges: Badges }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const groups: Array<{ heading: string; items: Array<{ href: string; label: string; icon: typeof Gauge; badge?: number }> }> = [
    {
      heading: 'Overview',
      items: [{ href: '/admin', label: 'Dashboard', icon: Gauge }],
    },
    {
      heading: 'Members',
      items: [
        { href: '/admin/members', label: 'All members', icon: Users },
        { href: '/admin/flags', label: 'Flags', icon: Flag, badge: badges.flags },
        { href: '/admin/messages', label: 'Message centre', icon: MessageSquare, badge: badges.messages },
      ],
    },
    {
      heading: 'Service',
      items: [
        { href: '/admin/requests', label: 'Locker requests', icon: Package, badge: badges.requests },
        { href: '/admin/fittings', label: 'Fittings', icon: Ruler, badge: badges.fittings },
      ],
    },
    {
      heading: 'Programme',
      items: [
        { href: '/admin/catalog', label: 'Menu', icon: Wine },
        { href: '/admin/events', label: 'Events', icon: CalendarDays, badge: badges.events },
      ],
    },
  ]

  const active = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  const body = (
    <>
      <div className="mb-6 flex items-center gap-3 px-2">
        <LogoMark size={26} />
        <div>
          <p className="font-display text-sm leading-none">Subourbon</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-gold">Admin</p>
        </div>
      </div>

      <div className="flex-1 space-y-5">
        {groups.map((group) => (
          <div key={group.heading}>
            <p className="label px-3 pb-1.5">{group.heading}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={clsx(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      active(item.href)
                        ? 'bg-gold/10 text-gold-bright'
                        : 'text-cream/70 hover:bg-ink-card hover:text-cream'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" strokeWidth={active(item.href) ? 2 : 1.5} />
                    <span className="flex-1">{item.label}</span>
                    {!!item.badge && (
                      <span className="rounded-full bg-gold px-1.5 text-[10px] font-medium text-ink">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-1 border-t border-ink-line/60 pt-4">
        <Link
          href="/concierge"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-cream/70 transition-colors hover:bg-ink-card hover:text-cream"
        >
          <ConciergeBell className="h-4 w-4" strokeWidth={1.5} />
          Concierge view
        </Link>
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-cream/70 transition-colors hover:bg-ink-card hover:text-cream"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          Back to the portal
        </Link>
        <p className="px-3 pt-2 text-[11px] text-cream-muted">
          {displayName(profile)} · {profile.role}
        </p>
      </div>
    </>
  )

  return (
    <>
      <nav className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-ink-line/60 bg-ink-raised/40 px-3 py-5 lg:flex">
        {body}
      </nav>

      <div className="flex items-center justify-between border-b border-ink-line/60 px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2.5">
          <LogoMark size={20} />
          <span className="text-[10px] uppercase tracking-[0.18em] text-gold">Admin</span>
        </div>
        <button onClick={() => setOpen(!open)} aria-label="Menu" className="text-cream">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="flex flex-col border-b border-ink-line/60 bg-ink-raised px-3 py-5 lg:hidden">
          {body}
        </div>
      )}
    </>
  )
}
