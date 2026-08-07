'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EyeOff, Loader2, MessageSquare, Send } from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase/client'
import { relative, shortDate } from '@/lib/format'
import type { AppRole, Message } from '@/lib/types'

/**
 * Inline messaging for the floor. Staff can reply to the member, or leave a
 * note only staff can read — the toggle is deliberately explicit so nobody
 * sends an internal note by accident.
 */
export function ConciergeMessagePad({
  memberId, memberName, staffId, staffRole, threads,
}: {
  memberId: string
  memberName: string
  staffId: string
  staffRole: AppRole
  threads: Array<{
    id: string; subject: string; kind: string; last_message_at: string
    unread_for_staff: boolean
  }>
}) {
  const router = useRouter()
  const [activeId, setActiveId] = useState<string | null>(threads[0]?.id ?? null)
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody] = useState('')
  const [internal, setInternal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!activeId) { setMessages([]); return }
    setLoading(true)
    createClient()
      .from('messages')
      .select('*')
      .eq('thread_id', activeId)
      .order('created_at')
      .then(({ data }) => {
        setMessages((data as Message[]) ?? [])
        setLoading(false)
      })
  }, [activeId])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setBusy(true)
    const supabase = createClient()

    let threadId = activeId
    if (!threadId) {
      const { data } = await supabase
        .from('message_threads')
        .insert({
          member_id: memberId,
          subject: `Note from the floor — ${shortDate(new Date())}`,
          kind: 'general',
        } as never)
        .select('id')
        .single()
      threadId = data?.id ?? null
      setActiveId(threadId)
    }

    if (threadId) {
      const { data } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          sender_id: staffId,
          sender_role: staffRole,
          body: text,
          is_staff_note: internal,
        } as never)
        .select()
        .single()

      if (data) setMessages((prev) => [...prev, data as Message])

      if (!internal) {
        await supabase.from('notifications').insert({
          member_id: memberId,
          kind: 'message',
          title: 'A message from Subourbon',
          body: text.slice(0, 120),
          link: `/messages?thread=${threadId}`,
          sent_at: new Date().toISOString(),
        } as never)
      }
    }

    setBody('')
    setBusy(false)
    router.refresh()
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-ink-line px-4 py-3">
        <MessageSquare className="h-4 w-4 text-gold" />
        <h2 className="font-display text-base">Message {memberName.split(' ')[0]}</h2>
      </div>

      {threads.length > 1 && (
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-ink-line px-4 py-2.5">
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={clsx(
                'shrink-0 rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                activeId === t.id
                  ? 'border-gold bg-gold/10 text-gold-bright'
                  : 'border-ink-line text-cream-muted hover:border-gold/40'
              )}
            >
              {t.subject.length > 28 ? `${t.subject.slice(0, 28)}…` : t.subject}
              {t.unread_for_staff && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-gold" />}
            </button>
          ))}
        </div>
      )}

      <div className="max-h-72 space-y-2.5 overflow-y-auto px-4 py-4">
        {loading && <Loader2 className="mx-auto h-4 w-4 animate-spin text-gold" />}
        {!loading && messages.length === 0 && (
          <p className="py-6 text-center text-sm text-cream-muted">
            No messages yet. Say something.
          </p>
        )}
        {messages.map((m) => {
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
                      Staff only
                    </p>
                  )}
                  {m.body.split('\n').map((line, i) => <p key={i}>{line || ' '}</p>)}
                </div>
                <p className={clsx('mt-1 text-[10px] text-cream-muted/70', fromMember ? 'text-left' : 'text-right')}>
                  {fromMember ? memberName.split(' ')[0] : 'Staff'} · {relative(m.created_at)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <form onSubmit={send} className="border-t border-ink-line p-3">
        <div className="flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={internal ? 'A note only staff will see…' : `Reply to ${memberName.split(' ')[0]}…`}
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
          Staff-only note — the member will not see this
        </label>
      </form>
    </section>
  )
}
