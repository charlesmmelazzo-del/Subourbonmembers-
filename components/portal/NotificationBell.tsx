'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { relative } from '@/lib/format'
import type { Notification } from '@/lib/types'

export function NotificationBell({ notifications }: { notifications: Notification[] }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(notifications)
  const router = useRouter()
  const unread = items.filter((n) => !n.read_at).length

  async function markAllRead() {
    const ids = items.filter((n) => !n.read_at).map((n) => n.id)
    if (!ids.length) return
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
    await createClient()
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', ids)
    router.refresh()
  }

  async function dismiss(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id))
    await createClient()
      .from('notifications')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', id)
  }

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) markAllRead() }}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-cream/70 transition-colors hover:bg-ink-card hover:text-gold"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.5} />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-gold ring-2 ring-ink" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="card absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden shadow-vault"
            >
              <div className="flex items-center justify-between border-b border-ink-line px-4 py-3">
                <p className="label">Notifications</p>
                <button onClick={() => setOpen(false)} className="text-cream-muted hover:text-cream">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-cream-muted">
                  Nothing new. We will let you know.
                </p>
              ) : (
                <ul className="max-h-96 divide-y divide-ink-line overflow-y-auto">
                  {items.map((n) => (
                    <li key={n.id} className="group relative">
                      <Link
                        href={n.link ?? '#'}
                        onClick={() => setOpen(false)}
                        className="block px-4 py-3 pr-9 transition-colors hover:bg-ink-raised"
                      >
                        <p className="text-sm text-cream">{n.title}</p>
                        {n.body && (
                          <p className="mt-0.5 text-xs leading-relaxed text-cream-muted">{n.body}</p>
                        )}
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-cream-muted/70">
                          {relative(n.created_at)}
                        </p>
                      </Link>
                      <button
                        onClick={() => dismiss(n.id)}
                        aria-label="Dismiss"
                        className="absolute right-3 top-3 text-cream-muted opacity-0 transition-opacity hover:text-cream group-hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
