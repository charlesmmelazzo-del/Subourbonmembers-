'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Camera, Loader2, Sparkles, X } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import type { CatalogItem } from '@/lib/types'

type Draft = {
  found: boolean
  confidence: 'high' | 'medium' | 'low'
  name: string
  kind?: 'spirit' | 'beer' | 'wine'
  category: string
  subcategory?: string
  producer_name?: string
  country?: string
  region?: string
  abv?: number
  age_statement?: string
  vintage?: number
  description: string
  tasting_notes?: string
  specs: Record<string, string>
  image_urls?: string[]
  sources: string[]
  unverified?: string[]
}

/**
 * Scan a barcode (or type a name), send it to Claude for research, and hand the
 * draft to the editor. Uses the browser's BarcodeDetector where available —
 * Chrome and Android have it; Safari does not, so typing is always offered.
 */
export function BottleScanner({
  onClose, onDraft,
}: {
  onClose: () => void
  onDraft: (draft: Partial<CatalogItem> & { __sources?: string[] }) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [scanning, setScanning] = useState(false)
  const [barcode, setBarcode] = useState('')
  const [name, setName] = useState('')
  const [hint, setHint] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)

  const supportsScanner =
    typeof window !== 'undefined' && 'BarcodeDetector' in window

  useEffect(() => {
    return () => streamRef.current?.getTracks().forEach((t) => t.stop())
  }, [])

  async function startCamera() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      setScanning(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      detectLoop()
    } catch {
      setError('Could not open the camera. Type the barcode or the name instead.')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setScanning(false)
  }

  async function detectLoop() {
    // @ts-expect-error — BarcodeDetector is not in the DOM lib yet.
    const detector = new window.BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
    })

    const tick = async () => {
      if (!videoRef.current || !streamRef.current) return
      try {
        const codes = await detector.detect(videoRef.current)
        if (codes.length > 0) {
          setBarcode(codes[0].rawValue)
          stopCamera()
          return
        }
      } catch {
        // A dropped frame is not worth surfacing; keep looking.
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  async function research() {
    setBusy(true)
    setError(null)
    const res = await fetch('/api/catalog/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, barcode, hint }),
    })
    setBusy(false)

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: null }))
      setError(error ?? 'The lookup failed.')
      return
    }
    const { draft } = await res.json()
    setDraft(draft as Draft)
  }

  function accept() {
    if (!draft) return
    onDraft({
      name: draft.name,
      kind: draft.kind ?? 'spirit',
      category: draft.category,
      subcategory: draft.subcategory ?? null,
      country: draft.country ?? null,
      region: draft.region ?? null,
      abv: draft.abv ?? null,
      age_statement: draft.age_statement ?? null,
      vintage: draft.vintage ?? null,
      description: draft.description,
      tasting_notes: draft.tasting_notes ?? null,
      specs: draft.specs ?? {},
      barcode: barcode || null,
      hero_image_url: draft.image_urls?.[0] ?? null,
      status: 'draft',
      __sources: draft.sources,
    })
  }

  // ---- Review the draft ----
  if (draft) {
    return (
      <Dialog
        title={draft.found ? 'Draft ready' : 'Could not identify that bottle'}
        description={draft.found ? draft.name : undefined}
        onClose={onClose}
        wide
        footer={
          <div className="flex gap-2">
            <button onClick={() => setDraft(null)} className="btn-ghost flex-1">
              Try again
            </button>
            <button onClick={accept} disabled={!draft.found} className="btn-gold flex-1">
              Open in the editor
            </button>
          </div>
        }
      >
        {!draft.found ? (
          <p className="py-4 text-sm leading-relaxed text-cream-muted">
            {draft.description} Add it by hand instead.
          </p>
        ) : (
          <div className="space-y-5">
            <div
              className={
                draft.confidence === 'high'
                  ? 'rounded-lg border border-gold/30 bg-gold/[0.04] px-3.5 py-2.5'
                  : 'rounded-lg border border-[#a3736b]/40 bg-[#a3736b]/[0.06] px-3.5 py-2.5'
              }
            >
              <p className="flex items-center gap-2 text-xs">
                {draft.confidence === 'high' ? (
                  <Sparkles className="h-3.5 w-3.5 text-gold" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-[#c19a92]" />
                )}
                <span className="text-cream/80">
                  {draft.confidence} confidence — check everything before publishing.
                </span>
              </p>
            </div>

            <div>
              <p className="label mb-1">Identified as</p>
              <p className="font-display text-lg">{draft.name}</p>
              <p className="text-xs text-cream-muted">
                {[draft.subcategory ?? draft.category, draft.producer_name, draft.region, draft.country]
                  .filter(Boolean)
                  .join(' · ')}
                {draft.abv && ` · ${draft.abv}%`}
              </p>
            </div>

            <div>
              <p className="label mb-1.5">Description</p>
              <p className="text-sm leading-relaxed text-cream/85">{draft.description}</p>
            </div>

            {Object.keys(draft.specs ?? {}).length > 0 && (
              <div>
                <p className="label mb-2">
                  Technical — {Object.keys(draft.specs).length} fields found
                </p>
                <dl className="space-y-1 text-xs">
                  {Object.entries(draft.specs).map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[9rem_1fr] gap-3">
                      <dt className="truncate text-cream-muted">{k.replace(/_/g, ' ')}</dt>
                      <dd className="text-cream/85">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {draft.unverified && draft.unverified.length > 0 && (
              <div>
                <p className="label mb-1.5">Could not verify</p>
                <p className="text-xs leading-relaxed text-cream-muted">
                  {draft.unverified.join(', ')} — left blank rather than guessed.
                </p>
              </div>
            )}

            {draft.sources?.length > 0 && (
              <div>
                <p className="label mb-1.5">Sources</p>
                <ul className="space-y-0.5">
                  {draft.sources.map((s) => (
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
          </div>
        )}
      </Dialog>
    )
  }

  // ---- Capture ----
  return (
    <Dialog
      title="Scan a bottle"
      description="Scan the barcode or type the name. We will research it and draft an entry for you to check."
      onClose={() => { stopCamera(); onClose() }}
      footer={
        <button
          onClick={research}
          disabled={busy || (!barcode.trim() && !name.trim())}
          className="btn-gold w-full"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? 'Researching — this takes a minute…' : 'Research this bottle'}
        </button>
      }
    >
      <div className="space-y-5">
        {scanning ? (
          <div className="relative overflow-hidden rounded-xl border border-gold/40">
            <video ref={videoRef} playsInline muted className="w-full" />
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-gold/70" />
            <button
              onClick={stopCamera}
              className="absolute right-2 top-2 rounded-full bg-ink/80 p-1.5 text-cream backdrop-blur"
              aria-label="Stop scanning"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          supportsScanner && (
            <button onClick={startCamera} className="btn-ghost w-full py-6">
              <Camera className="h-5 w-5" />
              Open the camera
            </button>
          )
        )}

        <div>
          <label htmlFor="barcode" className="label mb-2 block">Barcode</label>
          <input
            id="barcode"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="0 12345 67890 5"
            className="input"
            inputMode="numeric"
          />
        </div>

        <div>
          <label htmlFor="bottle-name" className="label mb-2 block">
            Name on the label
          </label>
          <input
            id="bottle-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Hampden Estate 8 Year"
            className="input"
          />
        </div>

        <div>
          <label htmlFor="bottle-hint" className="label mb-2 block">
            Anything else on the label
          </label>
          <input
            id="bottle-hint"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="Batch number, distillery, importer, whatever is printed"
            className="input"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {!supportsScanner && (
          <p className="text-[11px] leading-relaxed text-cream-muted">
            This browser has no barcode scanner. Chrome on Android or a desktop
            Chrome will scan; otherwise type the barcode or the name.
          </p>
        )}
      </div>
    </Dialog>
  )
}
