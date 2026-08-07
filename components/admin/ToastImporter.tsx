'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { AlertTriangle, Check, FileUp, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { money } from '@/lib/format'

type Preview = {
  rows: Record<string, string>[]
  headers: string[]
}

type ImportResult = {
  imported: number
  matchedMembers: number
  matchedItems: number
  skipped: number
  unmatchedNames: string[]
}

export function ToastImporter() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  function load(f: File) {
    setError(null)
    setResult(null)
    setFile(f)
    Papa.parse<Record<string, string>>(f, {
      header: true,
      skipEmptyLines: true,
      preview: 200,
      complete: (res) => {
        if (!res.data.length) {
          setError('That file has no rows we can read.')
          return
        }
        setPreview({ rows: res.data, headers: res.meta.fields ?? [] })
      },
      error: () => setError('Could not read that file. Is it a CSV?'),
    })
  }

  async function runImport() {
    if (!file) return
    setBusy(true)
    setError(null)

    // Re-parse in full — the preview is capped at 200 rows.
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (res) => {
        const response = await fetch('/api/toast-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, rows: res.data }),
        })

        setBusy(false)
        if (!response.ok) {
          const { error } = await response.json().catch(() => ({ error: null }))
          setError(error ?? 'The import failed.')
          return
        }
        setResult(await response.json())
        router.refresh()
      },
    })
  }

  if (result) {
    return (
      <div className="card p-6">
        <Check className="h-7 w-7 text-gold" />
        <h2 className="mt-3 font-display text-xl">Import complete</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Line items" value={result.imported} />
          <Stat label="Members matched" value={result.matchedMembers} />
          <Stat label="Bottles matched" value={result.matchedItems} />
          <Stat label="Rows skipped" value={result.skipped} />
        </dl>

        {result.unmatchedNames.length > 0 && (
          <div className="mt-5 rounded-lg border border-gold/30 bg-gold/[0.04] p-4">
            <p className="flex items-center gap-2 text-sm text-gold">
              <AlertTriangle className="h-4 w-4" />
              {result.unmatchedNames.length} product names did not match the catalog
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-cream-muted">
              These still count toward spend, but members will not see them in their bottle
              history until the names line up. Add them to the list, or rename them in Toast.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {result.unmatchedNames.slice(0, 30).map((n) => (
                <span key={n} className="rounded border border-ink-line px-2 py-0.5 text-[11px] text-cream-muted">
                  {n}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => { setResult(null); setFile(null); setPreview(null) }}
          className="btn-ghost mt-5"
        >
          Import another file
        </button>
      </div>
    )
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files[0]
          if (f) load(f)
        }}
        className={clsx(
          'rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors',
          dragging ? 'border-gold bg-gold/5' : 'border-ink-line'
        )}
      >
        <FileUp className="mx-auto h-7 w-7 text-gold/50" strokeWidth={1.2} />
        <p className="mt-3 font-display text-lg">
          {file ? file.name : 'Drop a Toast CSV here'}
        </p>
        <p className="mt-1.5 text-sm text-cream-muted">or</p>
        <button onClick={() => inputRef.current?.click()} className="btn-ghost mt-3">
          Choose a file
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => e.target.files?.[0] && load(e.target.files[0])}
          className="hidden"
        />
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {preview && (
        <div className="mt-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-lg">Preview</h2>
            <span className="text-xs text-cream-muted">
              first {preview.rows.length} rows · {preview.headers.length} columns
            </span>
          </div>

          <div className="mt-3 overflow-x-auto rounded-xl border border-ink-line">
            <table className="w-full text-xs">
              <thead className="border-b border-ink-line bg-ink-raised/60">
                <tr>
                  {preview.headers.slice(0, 8).map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-normal uppercase tracking-wider text-cream-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-line/60">
                {preview.rows.slice(0, 6).map((row, i) => (
                  <tr key={i}>
                    {preview.headers.slice(0, 8).map((h) => (
                      <td key={h} className="max-w-[12rem] truncate px-3 py-2 text-cream/80">
                        {row[h]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-cream-muted">
            We look for columns named along the lines of <code className="text-cream">Email</code>,{' '}
            <code className="text-cream">Phone</code>, <code className="text-cream">Customer</code>,{' '}
            <code className="text-cream">Item</code>, <code className="text-cream">Menu Item</code>,{' '}
            <code className="text-cream">Net Sales</code>, <code className="text-cream">Amount</code>,{' '}
            <code className="text-cream">Date</code> and{' '}
            <code className="text-cream">Check Id</code> — matching is case-insensitive and
            tolerant of extra words.
          </p>

          <button onClick={runImport} disabled={busy} className="btn-gold mt-5">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Import and sync to member profiles
          </button>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="mt-1 font-display text-xl">{value.toLocaleString()}</dd>
    </div>
  )
}
