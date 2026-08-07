'use client'

import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { Dialog } from '@/components/ui/Dialog'
import { createClient } from '@/lib/supabase/client'
import type { CatalogItemFull, TastingNote } from '@/lib/types'

export function TastingNoteEditor({
  item, memberId, existing, onSaved, onClose,
}: {
  item: CatalogItemFull
  memberId: string
  existing: TastingNote | null
  onSaved: (note: TastingNote | null) => void
  onClose: () => void
}) {
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [nose, setNose] = useState(existing?.nose ?? '')
  const [palate, setPalate] = useState(existing?.palate ?? '')
  const [finish, setFinish] = useState(existing?.finish ?? '')
  const [body, setBody] = useState(existing?.body ?? '')
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('tasting_notes')
      .upsert(
        {
          member_id: memberId,
          item_id: item.id,
          rating: rating || null,
          nose: nose.trim() || null,
          palate: palate.trim() || null,
          finish: finish.trim() || null,
          body: body.trim() || null,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: 'member_id,item_id' }
      )
      .select()
      .single()

    await supabase.from('member_activity').insert({
      member_id: memberId,
      kind: 'add_note',
      entity_type: 'catalog_item',
      entity_id: item.id,
    } as never)

    setBusy(false)
    onSaved((data as TastingNote) ?? null)
  }

  async function remove() {
    setBusy(true)
    await createClient()
      .from('tasting_notes')
      .delete()
      .eq('member_id', memberId)
      .eq('item_id', item.id)
    setBusy(false)
    onSaved(null)
  }

  return (
    <Dialog
      title={existing ? 'Edit your note' : 'Add a tasting note'}
      description={item.name}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          {existing && (
            <button onClick={remove} disabled={busy} className="btn-ghost px-3 text-red-400">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={save} disabled={busy} className="btn-gold flex-1">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Save note
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="label mb-2">Rating</p>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(rating === n ? 0 : n)}
                aria-label={`${n} of 5`}
                aria-pressed={rating >= n}
                className={clsx(
                  'h-9 w-9 rounded-full border text-sm transition-colors',
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

        <Field label="Nose" value={nose} onChange={setNose} placeholder="What you smell before anything else." />
        <Field label="Palate" value={palate} onChange={setPalate} placeholder="How it lands, and where it goes." />
        <Field label="Finish" value={finish} onChange={setFinish} placeholder="What is left after you swallow." />
        <Field
          label="Anything else"
          value={body}
          onChange={setBody}
          placeholder="Context, who you drank it with, whether you would buy it."
          rows={3}
        />

        <p className="text-[11px] leading-relaxed text-cream-muted">
          Your notes are private to you unless you share them. Staff can see that a note exists
          so they can make better recommendations.
        </p>
      </div>
    </Dialog>
  )
}

function Field({
  label, value, onChange, placeholder, rows = 2,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  rows?: number
}) {
  return (
    <div>
      <label className="label mb-2 block">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="input resize-none leading-relaxed"
      />
    </div>
  )
}
