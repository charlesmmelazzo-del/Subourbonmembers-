'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase/client'

export function FittingFeedbackForm({
  fittingId, existingRating, existingBody,
}: {
  fittingId: string
  existingRating: number | null
  existingBody: string | null
}) {
  const router = useRouter()
  const [rating, setRating] = useState(existingRating ?? 0)
  const [body, setBody] = useState(existingBody ?? '')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    await createClient()
      .from('fittings')
      .update({
        feedback_rating: rating || null,
        feedback_body: body.trim() || null,
        feedback_at: new Date().toISOString(),
      })
      .eq('id', fittingId)
    setBusy(false)
    setSaved(true)
    router.refresh()
  }

  if (saved) {
    return (
      <div className="card px-6 py-10 text-center">
        <Check className="mx-auto h-7 w-7 text-gold" />
        <p className="mt-3 text-sm text-cream-muted">
          Thank you. This genuinely shapes what we buy next.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h2 className="font-display text-xl">How did we do?</h2>
        <p className="mt-1 text-sm text-cream-muted">
          Both the hour itself, and whether we picked the right bottles for you.
        </p>
      </div>

      <div>
        <p className="label mb-2">Rating</p>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(rating === n ? 0 : n)}
              aria-pressed={rating >= n}
              className={clsx(
                'h-10 w-10 rounded-full border text-sm transition-colors',
                rating >= n
                  ? 'border-gold bg-gold/15 text-gold-bright'
                  : 'border-ink-line text-cream-muted hover:border-gold/40'
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="feedback" className="label mb-2 block">In your words</label>
        <textarea
          id="feedback"
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What landed, what missed, and what you would like us to look for next time."
          className="input resize-none leading-relaxed"
        />
      </div>

      <button type="submit" disabled={busy} className="btn-gold w-full sm:w-auto">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Send feedback
      </button>
    </form>
  )
}
