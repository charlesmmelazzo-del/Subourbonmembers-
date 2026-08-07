'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { createClient } from '@/lib/supabase/client'

/**
 * "Request for my locker" — becomes both a product_request the staff can track
 * to fulfilment and a message thread the member can follow.
 */
export function RequestProductDialog({
  memberId, lockerId, onClose,
}: {
  memberId: string
  lockerId: string
  onClose: () => void
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const supabase = createClient()

    const { data: thread } = await supabase
      .from('message_threads')
      .insert({
        member_id: memberId,
        subject: `Locker request — ${name.trim()}`,
        kind: 'locker_request',
      } as never)
      .select('id')
      .single()

    await supabase.from('product_requests').insert({
      member_id: memberId,
      locker_id: lockerId,
      requested_name: name.trim(),
      description: description.trim() || null,
      thread_id: thread?.id ?? null,
    } as never)

    if (thread) {
      await supabase.from('messages').insert({
        thread_id: thread.id,
        sender_id: memberId,
        sender_role: 'member',
        body: `I would like to request ${name.trim()} for my locker.${
          description.trim() ? `\n\n${description.trim()}` : ''
        }`,
      } as never)
    }

    setBusy(false)
    setDone(true)
    setTimeout(() => { onClose(); router.refresh() }, 1400)
  }

  if (done) {
    return (
      <Dialog title="Request sent" onClose={onClose}>
        <div className="py-6 text-center">
          <Check className="mx-auto h-8 w-8 text-gold" />
          <p className="mt-3 text-sm leading-relaxed text-cream-muted">
            We will look into what we can source and come back with pricing.
          </p>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog
      title="Request a bottle for your locker"
      description="Tell us what you are after. We will find out what it costs and what we can get."
      onClose={onClose}
      footer={
        <button form="product-request" type="submit" disabled={busy} className="btn-gold w-full">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Send request
        </button>
      }
    >
      <form id="product-request" onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="req-name" className="label mb-2 block">What are you after</label>
          <input
            id="req-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Hampden single cask, or anything wild and agave"
            className="input"
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="req-desc" className="label mb-2 block">Tell us more</label>
          <textarea
            id="req-desc"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Budget, how many bottles, whether a substitute is fine, when you need it by."
            className="input resize-none leading-relaxed"
          />
        </div>
        <p className="text-[11px] leading-relaxed text-cream-muted">
          You will be able to follow this in your messages, and we will notify you the
          moment it lands in your locker.
        </p>
      </form>
    </Dialog>
  )
}
