'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, EyeOff, Loader2, Search, Send, Star, User } from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase/client'
import { relative, shortDate } from '@/lib/format'
import { THREAD_LABELS } from '@/components/messages/threadKinds'
import type { Message, Profile, ThreadKind } from '@/lib/types'
import type { InboxThread } from '@/app/(staff)/admin/messages/page'

export function StaffInbox({
  staff, threads, activeThreadId, messages,
}: {
  staff: Profile
  threads: InboxThread[]
  activeThreadId?: string
  messages: Message[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [onlyUnread, setOnlyUnread] = useState(false)
  const [showList, setShowList] = useState(!activeThreadId)

  const q = query.trim().toLowerCase()
  const visible = threads.filter((t) => {
    if (onlyUnread && !t.unread_for_staff) return false
    if (!q) return true
    return (
      t.subject.toLowerCase().includes(q) ||
      `${t.member?.first_name} ${t.member?.last_name}`.toLowerCase().includes(q)
    )
  })

  const active = threads.find((t) => t.id === activeThreadId) ?? null

  useEffect(() => {
    if (!active?.unread_for_staff) return
    createClient()
      .from('message_threads')
      .update({ unread_for_staff: false })
      .eq('id', active.id)
      .then(() => router.refresh())
  }, [active?.id, active?.unread_for_staff]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-5">
        <p className="label">From members</p>
        <h1 className="mt-1.5 font-display text-3xl sm:text-4xl">Message centre</h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-[21rem_1fr]">
        <aside className={clsx('space-y-2', !showList && 'hidden lg:block')}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search subject or member"
              className="input pl-9"
              type="search"
            />
          </div>

          <button
            onClick={() => setOnlyUnread(!onlyUnread)}
            className={clsx(
              'w-full rounded-full border px-3 py-1.5 text-xs transition-colors',
              onlyUnread
                ? 'border-gold bg-gold/10 text-gold-bright'
                : 'border-ink-line text-cream-muted hover:border-gold/40'
            )}
          >
            {onlyUnread ? 'Showing unread only' : 'Show unread only'}
          </button>

          <ul className="space-y-1.5">
            {visible.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => { setShowList(false); router.push(`/admin/messages?thread=${t.id}`) }}
                  className={clsx(
                    'w-full rounded-lg border px-3.5 py-3 text-left transition-colors',
                    t.id === activeThreadId
                      ? 'border-gold/45 bg-gold/[0.06]'
                      : t.unread_for_staff
                        ? 'border-gold/25 hover:border-gold/40'
                        : 'border-ink-line hover:border-gold/25'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm leading-snug text-cream">{t.subject}</p>
                    {t.unread_for_staff && (
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    )}
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-[11px] text-cream-muted">
                    {t.member?.vip && <Star className="h-2.5 w-2.5 fill-gold text-gold" />}
                    {t.member?.first_name} {t.member?.last_name}
                    <span className="opacity-60">
                      · {THREAD_LABELS[t.kind as ThreadKind] ?? t.kind} · {relative(t.last_message_at)}
                    </span>
                  </p>
                </button>
              </li>
            ))}
            {visible.length === 0 && (
              <li className="card px-4 py-10 text-center text-sm text-cream-muted">
                Nothing matches.
              </li>
            )}
          </ul>
        </aside>

        <section className={clsx(showList && 'hidden lg:block')}>
          {active ? (
            <StaffThread
              key={active.id}
              staff={staff}
              thread={active}
              messages={messages}
              onBack={() => setShowList(true)}
            />
          ) : (
            <div className="card px-6 py-20 text-center text-sm text-cream-muted">
              Choose a conversation.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function StaffThread({
  staff, thread, messages, onBack,
}: {
  staff: Profile
  thread: InboxThread
  messages: Message[]
  onBack: () => void
}) {
  const router = useRouter()
  const [local, setLocal] = useState(messages)
  const [body, setBody] = useState('')
  const [internal, setInternal] = useState(false)
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => setLocal(messages), [messages])
  useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [local.length])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setBusy(true)
    const supabase = createClient()

    const { data } = await supabase
      .from('messages')
      .insert({
        thread_id: thread.id,
        sender_id: staff.id,
        sender_role: staff.role,
        body: text,
        is_staff_note: internal,
      } as never)
      .select()
      .single()

    if (data) setLocal((prev) => [...prev, data as Message])

    // Only a real reply notifies the member — internal notes stay silent.
    if (!internal && thread.member) {
      await supabase.from('notifications').insert({
        member_id: thread.member.id,
        kind: 'message',
        title: 'A reply from Subourbon',
        body: text.slice(0, 120),
        link: `/messages?thread=${thread.id}`,
        sent_at: new Date().toISOString(),
      } as never)
    }

    setBody('')
    setBusy(false)
    router.refresh()
  }

  async function toggleOpen() {
    await createClient()
      .from('message_threads')
      .update({ is_open: !thread.is_open })
      .eq('id', thread.id)
    router.refresh()
  }

  return (
    <div className="card flex h-[min(38rem,75dvh)] flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-ink-line px-4 py-3">
        <button onClick={onBack} className="lg:hidden" aria-label="Back">
          <ArrowLeft className="h-4 w-4 text-cream-muted" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-cream">{thread.subject}</p>
          <p className="text-[11px] text-cream-muted">
            {THREAD_LABELS[thread.kind as ThreadKind] ?? thread.kind}
          </p>
        </div>
        {thread.member && (
          <Link
            href={`/admin/members/${thread.member.id}`}
            className="flex shrink-0 items-center gap-1.5 text-xs text-gold hover:text-gold-bright"
          >
            <User className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {thread.member.first_name} {thread.member.last_name}
            </span>
          </Link>
        )}
        <button
          onClick={toggleOpen}
          className="shrink-0 rounded-full border border-ink-line px-2 py-0.5 text-[10px] uppercase tracking-wider text-cream-muted hover:border-gold/40 hover:text-gold"
        >
          {thread.is_open ? 'Open' : 'Closed'}
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {local.map((m) => {
          const fromMember = m.sender_role === 'member'
          return (
            <div key={m.id} className={clsx('flex', fromMember ? 'justify-start' : 'justify-end')}>
              <div className="max-w-[85%]">
                <div
                  className={clsx(
                    'rounded-xl px-3.5 py-2.5 text-sm leading-relaxed',
                    m.is_staff_note
                      ? 'border border-dashed border-cream/25 bg-ink text-cream/70'
                      : fromMember
                        ? 'border border-ink-line bg-ink-raised text-cream/90'
                        : 'bg-gold/12 text-cream'
                  )}
                >
                  {m.is_staff_note && (
                    <p className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-cream-muted">
                      <EyeOff className="h-3 w-3" />
                      Staff only — the member cannot see this
                    </p>
                  )}
                  {m.body.split('\n').map((line, i) => <p key={i}>{line || ' '}</p>)}
                </div>
                <p className={clsx('mt-1 text-[10px] text-cream-muted/70', fromMember ? 'text-left' : 'text-right')}>
                  {fromMember ? thread.member?.first_name : 'Staff'} · {shortDate(m.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="border-t border-ink-line p-3">
        <div className="flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={internal ? 'A note only staff will see…' : 'Reply to the member…'}
            className="input"
          />
          <button type="submit" disabled={busy || !body.trim()} className="btn-gold shrink-0 px-3">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <label className="mt-2.5 flex cursor-pointer items-center gap-2 text-xs text-cream-muted">
          <input
            type="checkbox"
            checked={internal}
            onChange={(e) => setInternal(e.target.checked)}
            className="h-3.5 w-3.5 accent-[#BBAF52]"
          />
          <EyeOff className="h-3 w-3" />
          Staff-only note
        </label>
      </form>
    </div>
  )
}
