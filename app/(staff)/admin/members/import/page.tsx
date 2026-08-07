import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireStaff } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { ToastImporter } from '@/components/admin/ToastImporter'
import { shortDate } from '@/lib/format'
import type { SalesImport } from '@/lib/types'

export const metadata = { title: 'Import sales data' }

export default async function ImportPage() {
  await requireStaff()
  const supabase = createClient()

  const { data: imports } = await supabase
    .from('sales_imports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/members"
        className="mb-5 inline-flex items-center gap-2 text-xs text-cream-muted hover:text-gold"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All members
      </Link>

      <header className="mb-6">
        <p className="label">From Toast</p>
        <h1 className="mt-1.5 font-display text-3xl">Import member sales data</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-cream-muted">
          Export a sales report from Toast as CSV and drop it here. Rows are matched to
          members by email first, then phone, then name. Line items are matched against the
          catalog by name so members see them in their order history.
        </p>
      </header>

      <ToastImporter />

      {imports && imports.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-lg">Recent imports</h2>
          <ul className="space-y-1.5">
            {(imports as SalesImport[]).map((imp) => (
              <li
                key={imp.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-ink-line px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-cream">{imp.filename}</p>
                  <p className="text-[11px] text-cream-muted">
                    {imp.matched_count} matched · {imp.skipped_count} skipped
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-cream-muted">
                  {shortDate(imp.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
