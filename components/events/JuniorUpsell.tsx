'use client'

import { useState } from 'react'
import { Check, Loader2, Sparkles } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { createClient } from '@/lib/supabase/client'

const SENIOR_PERKS = [
  'Book the space for private events',
  'Three co-members on your account',
  'Priority on tastings and the founders room',
  'A locker of your own',
]

/** Shown when a junior member reaches for a senior-only feature. */
export function JuniorUpsell({
  memberId, onClose,
}: {
  memberId: string
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function requestInfo() {
    setBusy(true)
    const supabase = createClient()
    const { data: thread } = await supabase
      .from('message_threads')
      .insert({
        member_id: memberId,
        subject: 'Interested in senior membership',
        kind: 'general',
      } as never)
      .select('id')
      .single()

    if (thread) {
      await supabase.from('messages').insert({
        thread_id: thread.id,
        sender_id: memberId,
        sender_role: 'member',
        body: 'I would like to hear more about moving up to a senior membership.',
      } as never)
    }
    setBusy(false)
    setSent(true)
    setTimeout(onClose, 1600)
  }

  if (sent) {
    return (
      <Dialog title="We will be in touch" onClose={onClose}>
        <div className="py-6 text-center">
          <Check className="mx-auto h-8 w-8 text-gold" />
          <p className="mt-3 text-sm leading-relaxed text-cream-muted">
            A manager will follow up in your message centre.
          </p>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog
      title="This one is for senior members"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1">Not now</button>
          <button onClick={requestInfo} disabled={busy} className="btn-gold flex-1">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Tell me more
          </button>
        </div>
      }
    >
      <div className="text-center">
        <Sparkles className="mx-auto h-7 w-7 text-gold" strokeWidth={1.3} />
        <p className="mt-4 text-sm leading-relaxed text-cream/80">
          Booking the space privately is a senior member privilege. Senior membership also
          comes with:
        </p>
      </div>

      <ul className="mt-5 space-y-2.5">
        {SENIOR_PERKS.map((perk) => (
          <li key={perk} className="flex items-start gap-2.5 text-sm text-cream/85">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            {perk}
          </li>
        ))}
      </ul>
    </Dialog>
  )
}
