'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Plus, Send } from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase/client'
import { relative, shortDate } from '@/lib/format'
import { Dialog } from '@/components/ui/Dialog'
import { THREAD_LABELS } from './threadKinds'
import type { Message, MessageThread, Profile } from '@/lib/types'

/**
 * The member's side of the message centre. Staff use the same thread view
 * from the concierge and admin panels — see ThreadPanel.
 */
export function MessageCenter({
  viewer, threads, activeThreadId, messages,
}: {
  viewer: Profile
  threads: MessageThread[]
  activeThreadId?: string
  messages: Message[]
}) {
  const router = useRouter()
  const [composing, setComposing] = useState(false)
  const [showList, setShowList] = useState(!activeThreadId)

  const active = threads.find((t) => t.id === activeThreadId) ?? null

  // Clear the member's unread flag as soon as they open the thread.
  useEffect(() => {
    if (!active?.unread_for_member) return
    createClient()
      .from('message_threads')
      .update({ unread_for_member: false })
      .eq('id', active.id)
      .then(() => router.refresh())
  }, [active?.id, active?.unread_for_member]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="label">Talk to us</p>
          <h1 className="mt-1.5 font-display text-3xl sm:text-4xl">Messages</h1>
        </div>
        <button onClick={() => setComposing(true)} className="btn-gold px-3">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New message</span>
        </button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[19rem_1fr]">
        {/* ---- Thread list ---- */}
        <aside className={clsx('space-y-1.5', !showList && 'hidden lg:block')}>
          {threads.length === 0 && (
            <div className="card px-4 py-10 text-center text-sm text-cream-muted">
              No messages yet. Ask us anything.
            </div>
          )}
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setShowList(false)
                router.push(`/messages?thread=${t.id}`)
              }}
              className={clsx(
                'w-full rounded-lg border px-3.5 py-3 text-left transition-colors',
                t.id === activeThreadId
                  ? 'border-gold/45 bg-gold/[0.06]'
                  : 'border-ink-line hover:border-gold/25'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 text-sm leading-snug text-cream">{t.subject}</p>
                {t.unread_for_member && (
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                )}
              </div>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-cream-muted">
                {THREAD_LABELS[t.kind]} · {relative(t.last_message_at)}
              </p>
            </button>
          ))}
        </aside>

        {/* ---- Conversation ---- */}
        <section className={clsx(showList && 'hidden lg:block')}>
          {active ? (
            <Conversation
              viewer={viewer}
              thread={active}
              messages={messages}
              onBack={() => setShowList(true)}
            />
          ) : (
            <div className="card px-6 py-20 text-center text-sm text-cream-muted">
              Choose a conversation, or start a new one.
            </div>
          )}
        </section>
      </div>

      {composing && (
        <NewMessageDialog memberId={viewer.id} onClose={() => setComposing(false)} />
      )}
    </div>
  )
}

function Conversation({
  viewer, thread, messages, onBack,
}: {
  viewer: Profile
  thread: MessageThread
  messages: Message[]
  onBack: () => void
}) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [local, setLocal] = useState(messages)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => setLocal(messages), [messages])
  useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [local.length])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setBusy(true)

    const { data } = await createClient()
      .from('messages')
      .insert({
        thread_id: thread.id,
        sender_id: viewer.id,
        sender_role: 'member',
        body: text,
      } as never)
      .select()
      .single()

    if (data) setLocal((prev) => [...prev, data as Message])
    setBody('')
    setBusy(false)
    router.refresh()
  }

  return (
    <div className="card flex h-[min(34rem,70dvh)] flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-ink-line px-4 py-3">
        <button onClick={onBack} className="lg:hidden" aria-label="Back to messages">
          <ArrowLeft className="h-4 w-4 text-cream-muted" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm text-cream">{thread.subject}</p>
          <p className="text-[10px] uppercase tracking-wider text-cream-muted">
            {THREAD_LABELS[thread.kind]}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {local.map((m) => {
          const mine = m.sender_role === 'member'
          return (
            <div key={m.id} className={clsx('flex', mine ? 'justify-end' : 'justify-start')}>
              <div className="max-w-[85%]">
                <div
                  className={clsx(
                    'rounded-xl px-3.5 py-2.5 text-sm leading-relaxed',
                    mine
                      ? 'bg-gold/12 text-cream'
                      : 'border border-ink-line bg-ink-raised text-cream/90'
                  )}
                >
                  {m.body.split('\n').map((line, i) => <p key={i}>{line || ' '}</p>)}
                </div>
                <p
                  className={clsx(
                    'mt-1 text-[10px] uppercase tracking-wider text-cream-muted/70',
                    mine ? 'text-right' : 'text-left'
                  )}
                >
                  {mine ? 'You' : 'Subourbon'} · {shortDate(m.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-ink-line p-3">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
          className="input"
        />
        <button type="submit" disabled={busy || !body.trim()} className="btn-gold shrink-0 px-3">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  )
}

function NewMessageDialog({ memberId, onClose }: { memberId: string; onClose: () => void }) {
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const supabase = createClient()
    const { data: thread } = await supabase
      .from('message_threads')
      .insert({ member_id: memberId, subject: subject.trim(), kind: 'general' } as never)
      .select('id')
      .single()

    if (thread) {
      await supabase.from('messages').insert({
        thread_id: thread.id,
        sender_id: memberId,
        sender_role: 'member',
        body: body.trim(),
      } as never)
      onClose()
      router.push(`/messages?thread=${thread.id}`)
      router.refresh()
      return
    }
    setBusy(false)
  }

  return (
    <Dialog
      title="New message"
      description="Anything at all — a question, a request, a complaint. It reaches a manager."
      onClose={onClose}
      footer={
        <button form="new-msg" type="submit" disabled={busy} className="btn-gold w-full">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Send
        </button>
      }
    >
      <form id="new-msg" onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="subject" className="label mb-2 block">Subject</label>
          <input
            id="subject"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="A question about Thursday"
            className="input"
          />
        </div>
        <div>
          <label htmlFor="msg-body" className="label mb-2 block">Message</label>
          <textarea
            id="msg-body"
            required
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="input resize-none leading-relaxed"
          />
        </div>
      </form>
    </Dialog>
  )
}
