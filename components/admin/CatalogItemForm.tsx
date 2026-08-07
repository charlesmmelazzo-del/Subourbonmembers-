'use client'

import { useMemo, useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES, TAXONOMY, humanize, kindFor, specSheet } from '@/lib/catalog'
import type { CatalogItem, Producer } from '@/lib/types'

type Draft = Partial<CatalogItem> & { __sources?: string[] }

export function CatalogItemForm({
  item, producers, onClose, onSaved,
}: {
  item: Draft
  producers: Producer[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<Draft>({
    kind: 'spirit',
    status: 'draft',
    specs: {},
    ...item,
  })
  const [producerName, setProducerName] = useState(
    producers.find((p) => p.id === item.producer_id)?.name ?? ''
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extraKey, setExtraKey] = useState('')

  const sheet = useMemo(
    () => specSheet(form.category ?? 'Rum', form.subcategory),
    [form.category, form.subcategory]
  )
  const taxon = TAXONOMY.find((t) => t.category === form.category)

  const specs = (form.specs ?? {}) as Record<string, string>
  const extras = Object.keys(specs).filter(
    (k) => !sheet.some((f) => f.key === k)
  )

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const setSpec = (key: string, value: string) =>
    setForm((prev) => ({
      ...prev,
      specs: { ...(prev.specs as Record<string, string>), [key]: value },
    }))

  const dropSpec = (key: string) =>
    setForm((prev) => {
      const next = { ...(prev.specs as Record<string, string>) }
      delete next[key]
      return { ...prev, specs: next }
    })

  async function save(status: CatalogItem['status']) {
    if (!form.name?.trim() || !form.category) {
      setError('A name and a category are required.')
      return
    }
    setBusy(true)
    setError(null)
    const supabase = createClient()

    // Resolve or create the producer by name so managers never juggle IDs.
    let producerId = form.producer_id ?? null
    const trimmedProducer = producerName.trim()
    if (trimmedProducer) {
      const existing = producers.find(
        (p) => p.name.toLowerCase() === trimmedProducer.toLowerCase()
      )
      if (existing) {
        producerId = existing.id
      } else {
        const { data } = await supabase
          .from('producers')
          .insert({ name: trimmedProducer, country: form.country ?? null } as never)
          .select('id')
          .single()
        producerId = data?.id ?? null
      }
    }

    const payload = {
      kind: form.kind ?? kindFor(form.category),
      category: form.category,
      subcategory: form.subcategory || null,
      name: form.name.trim(),
      producer_id: producerId,
      country: form.country || null,
      region: form.region || null,
      abv: form.abv ?? null,
      proof: form.abv ? form.abv * 2 : null,
      age_statement: form.age_statement || null,
      vintage: form.vintage ?? null,
      description: form.description || null,
      tasting_notes: form.tasting_notes || null,
      hero_image_url: form.hero_image_url || null,
      barcode: form.barcode || null,
      price_cents: form.price_cents ?? null,
      specs: form.specs ?? {},
      status,
      eightysixed_at: status === 'eightysixed' ? new Date().toISOString() : null,
    }

    const { error } = form.id
      ? await supabase.from('catalog_items').update(payload).eq('id', form.id)
      : await supabase.from('catalog_items').insert(payload as never)

    setBusy(false)
    if (error) {
      setError('That did not save. Check the fields and try again.')
      return
    }
    onSaved()
  }

  return (
    <Dialog
      title={form.id ? 'Edit bottle' : 'New bottle'}
      description={form.__sources?.length ? 'Drafted by research — check every field.' : undefined}
      onClose={onClose}
      wide
      footer={
        <div className="flex gap-2">
          <button onClick={() => save('draft')} disabled={busy} className="btn-ghost flex-1">
            Save as draft
          </button>
          <button onClick={() => save('active')} disabled={busy} className="btn-gold flex-1">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Publish to the list
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="Name" value={form.name ?? ''} onChange={(v) => set('name', v)} required />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label mb-2 block">Category</label>
            <select
              value={form.category ?? ''}
              onChange={(e) => {
                set('category', e.target.value)
                set('subcategory', null)
                set('kind', kindFor(e.target.value))
              }}
              className="input"
            >
              <option value="">Choose one</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label mb-2 block">Subcategory</label>
            <select
              value={form.subcategory ?? ''}
              onChange={(e) => set('subcategory', e.target.value || null)}
              disabled={!taxon?.subcategories?.length}
              className="input disabled:opacity-40"
            >
              <option value="">None</option>
              {taxon?.subcategories?.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <Field label="Producer" value={producerName} onChange={setProducerName} />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Country" value={form.country ?? ''} onChange={(v) => set('country', v)} />
          <Field label="Region" value={form.region ?? ''} onChange={(v) => set('region', v)} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field
            label="ABV %"
            type="number"
            value={form.abv?.toString() ?? ''}
            onChange={(v) => set('abv', v ? Number(v) : null)}
          />
          <Field
            label="Age"
            value={form.age_statement ?? ''}
            onChange={(v) => set('age_statement', v)}
          />
          <Field
            label="Price ($)"
            type="number"
            value={form.price_cents ? (form.price_cents / 100).toString() : ''}
            onChange={(v) => set('price_cents', v ? Math.round(Number(v) * 100) : null)}
          />
        </div>

        <div>
          <label className="label mb-2 block">Description</label>
          <textarea
            rows={3}
            value={form.description ?? ''}
            onChange={(e) => set('description', e.target.value)}
            className="input resize-none leading-relaxed"
            placeholder="What it is and why it is interesting. Written for people who know the category."
          />
        </div>

        <div>
          <label className="label mb-2 block">House tasting notes</label>
          <textarea
            rows={2}
            value={form.tasting_notes ?? ''}
            onChange={(e) => set('tasting_notes', e.target.value)}
            className="input resize-none"
            placeholder="Nose, palate, finish — one sentence."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Hero image URL"
            value={form.hero_image_url ?? ''}
            onChange={(v) => set('hero_image_url', v)}
          />
          <Field label="Barcode" value={form.barcode ?? ''} onChange={(v) => set('barcode', v)} />
        </div>

        {/* ---- Technical spec sheet ---- */}
        <div className="border-t border-ink-line pt-5">
          <p className="label mb-1">Technical</p>
          <p className="mb-4 text-[11px] text-cream-muted">
            Fields for {form.subcategory ?? form.category ?? 'this category'}. Leave anything
            you cannot verify blank.
          </p>

          <div className="space-y-3">
            {sheet.map((field) => (
              <div key={field.key}>
                <label className="label mb-1.5 block">
                  {field.label}
                  {field.hint && (
                    <span className="ml-1.5 normal-case tracking-normal opacity-50">
                      {field.hint}
                    </span>
                  )}
                </label>
                {field.format === 'prose' ? (
                  <textarea
                    rows={2}
                    value={specs[field.key] ?? ''}
                    onChange={(e) => setSpec(field.key, e.target.value)}
                    className="input resize-none"
                  />
                ) : (
                  <input
                    value={specs[field.key] ?? ''}
                    onChange={(e) => setSpec(field.key, e.target.value)}
                    className="input"
                  />
                )}
              </div>
            ))}

            {extras.map((key) => (
              <div key={key}>
                <label className="label mb-1.5 flex items-center gap-2">
                  {humanize(key)}
                  <button
                    onClick={() => dropSpec(key)}
                    className="text-cream-muted hover:text-red-400"
                    aria-label={`Remove ${key}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </label>
                <input
                  value={specs[key] ?? ''}
                  onChange={(e) => setSpec(key, e.target.value)}
                  className="input"
                />
              </div>
            ))}

            <div className="flex gap-2 pt-1">
              <input
                value={extraKey}
                onChange={(e) => setExtraKey(e.target.value)}
                placeholder="Add another spec field (e.g. cask_number)"
                className="input"
              />
              <button
                onClick={() => {
                  const key = extraKey.trim().toLowerCase().replace(/\s+/g, '_')
                  if (key) { setSpec(key, ''); setExtraKey('') }
                }}
                className="btn-ghost shrink-0 px-3"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {form.__sources && form.__sources.length > 0 && (
          <div className="border-t border-ink-line pt-4">
            <p className="label mb-2">Research sources</p>
            <ul className="space-y-0.5">
              {form.__sources.map((s) => (
                <li key={s}>
                  <a
                    href={s}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-gold hover:text-gold-bright"
                  >
                    {s.replace(/^https?:\/\//, '').slice(0, 70)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </Dialog>
  )
}

function Field({
  label, value, onChange, type = 'text', required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return (
    <div>
      <label htmlFor={id} className="label mb-2 block">{label}</label>
      <input
        id={id}
        type={type}
        step={type === 'number' ? 'any' : undefined}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      />
    </div>
  )
}
