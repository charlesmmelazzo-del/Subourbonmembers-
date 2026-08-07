import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { shortDate } from '@/lib/format'
import { DiamondRule } from '@/components/ui/Logo'
import { FittingFeedbackForm } from '@/components/locker/FittingFeedbackForm'
import type { Fitting } from '@/lib/types'

export const metadata = { title: 'Fitting' }

export default async function FittingPage({ params }: { params: { id: string } }) {
  const profile = await requireProfile()
  const supabase = createClient()

  const { data } = await supabase
    .from('fittings')
    .select('*, items:fitting_items(*, item:catalog_items(id, name, category, subcategory))')
    .eq('id', params.id)
    .eq('member_id', profile.id)
    .maybeSingle()

  if (!data) notFound()

  const fitting = data as unknown as Fitting & {
    items: Array<{
      id: string
      label: string | null
      outcome: string | null
      item: { id: string; name: string; category: string; subcategory: string | null } | null
    }>
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/locker"
        className="mb-6 inline-flex items-center gap-2 text-xs text-cream-muted hover:text-gold"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to my locker
      </Link>

      <p className="label">{shortDate(fitting.completed_at ?? fitting.scheduled_at)}</p>
      <h1 className="mt-1.5 font-display text-3xl">Your fitting</h1>

      <dl className="mt-6 space-y-2 text-sm">
        {fitting.occasion && <Row label="Occasion" value={fitting.occasion} />}
        {fitting.flavor_profile && <Row label="Profile" value={fitting.flavor_profile} />}
        {fitting.spirit_category && <Row label="Category" value={fitting.spirit_category} />}
      </dl>

      {fitting.post_notes && (
        <>
          <DiamondRule className="my-7" />
          <p className="label mb-2">What we poured</p>
          <p className="text-sm leading-relaxed text-cream/85">{fitting.post_notes}</p>
        </>
      )}

      {fitting.items?.length > 0 && (
        <ul className="mt-5 space-y-1.5">
          {fitting.items.map((fi) => (
            <li
              key={fi.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-ink-line px-3.5 py-2.5"
            >
              {fi.item ? (
                <Link
                  href={`/spirits?item=${fi.item.id}`}
                  className="text-sm text-cream hover:text-gold-bright"
                >
                  {fi.item.name}
                </Link>
              ) : (
                <span className="text-sm text-cream">{fi.label}</span>
              )}
              {fi.outcome && (
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-cream-muted">
                  {fi.outcome}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <DiamondRule className="my-7" />

      {fitting.status === 'completed' ? (
        <FittingFeedbackForm
          fittingId={fitting.id}
          existingRating={fitting.feedback_rating}
          existingBody={fitting.feedback_body}
        />
      ) : (
        <p className="text-sm text-cream-muted">
          Feedback opens once we have marked this fitting complete and everything we sourced
          is in your locker.
        </p>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3">
      <dt className="text-xs uppercase tracking-wider text-cream-muted">{label}</dt>
      <dd className="text-cream/85">{value}</dd>
    </div>
  )
}
