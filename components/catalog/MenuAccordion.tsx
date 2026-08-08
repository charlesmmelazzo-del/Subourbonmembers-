'use client'

import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { TAXONOMY, type Taxon } from '@/lib/catalog'
import { iconForKind } from './kindIcon'
import type { CatalogItemFull } from '@/lib/types'

export type MenuSection = {
  taxon: Taxon
  items: CatalogItemFull[]
  subs: Array<{ name: string; count: number }>
}

type Props = {
  items: CatalogItemFull[]
  /** Category whose subcategories are showing, if any. */
  expanded: string | null
  onToggle: (category: string) => void
  /** Fired when a leaf is picked. `subcategory: null` means the whole category. */
  onSelect: (category: string, subcategory: string | null) => void
}

/**
 * The menu, as a bar menu rather than a database table: categories collapsed
 * to a single line each, subcategories revealed underneath on click. Picking a
 * leaf hands off to the category panel, which is where bottles actually live.
 */
export function MenuAccordion({ items, expanded, onToggle, onSelect }: Props) {
  const sections = useMemo(() => buildSections(items), [items])

  return (
    <ul className="space-y-2">
      {sections.map((section) => {
        const { category, blurb, kind } = section.taxon
        const open = expanded === category
        const Icon = iconForKind(kind)
        // A category with nothing to branch into opens its panel directly —
        // expanding to reveal a single "everything" row would be theatre.
        const leaf = section.subs.length === 0

        return (
          <li key={category}>
            <div
              className={clsx(
                'overflow-hidden rounded-xl border bg-ink-card transition-colors duration-base',
                open ? 'border-gold/40' : 'border-ink-line hover:border-gold/25'
              )}
            >
              <button
                onClick={() => (leaf ? onSelect(category, null) : onToggle(category))}
                aria-expanded={leaf ? undefined : open}
                className="group flex w-full items-center gap-4 px-4 py-4 text-left sm:px-5"
              >
                <motion.span
                  animate={{ rotate: open ? 90 : 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className={clsx(
                    'shrink-0 transition-colors',
                    open ? 'text-gold' : 'text-cream-muted group-hover:text-gold/70'
                  )}
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
                </motion.span>

                <span className="min-w-0 flex-1">
                  <span
                    className={clsx(
                      'block font-display text-xl leading-tight transition-colors sm:text-2xl',
                      open ? 'text-gold-bright' : 'text-cream group-hover:text-cream-warm'
                    )}
                  >
                    {category}
                  </span>
                  {blurb && (
                    <span className="mt-1 block text-xs italic text-cream-muted">{blurb}</span>
                  )}
                </span>

                <span className="shrink-0 text-xs tabular-nums text-cream-muted">
                  {section.items.length}
                </span>
                <Icon className="hidden h-4 w-4 shrink-0 text-gold/25 sm:block" strokeWidth={1.25} />
              </button>

              <AnimatePresence initial={false}>
                {open && !leaf && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      height: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
                      opacity: { duration: 0.2 },
                    }}
                    className="overflow-hidden"
                  >
                    <ul className="border-t border-ink-line/70 p-2 sm:px-3">
                      {[{ name: null, count: section.items.length }, ...section.subs].map(
                        (sub, i) => (
                          <motion.li
                            key={sub.name ?? '__all__'}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              delay: 0.05 + i * 0.035,
                              duration: 0.26,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                          >
                            <button
                              onClick={() => onSelect(category, sub.name)}
                              className="group/sub flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-gold/[0.06]"
                            >
                              <span
                                className={clsx(
                                  'h-[5px] w-[5px] shrink-0 rotate-45 transition-colors',
                                  sub.name
                                    ? 'bg-gold/40 group-hover/sub:bg-gold'
                                    : 'bg-transparent ring-1 ring-gold/50'
                                )}
                              />
                              <span
                                className={clsx(
                                  'flex-1 text-sm transition-colors',
                                  sub.name
                                    ? 'text-cream/80 group-hover/sub:text-cream'
                                    : 'italic text-cream-muted group-hover/sub:text-cream/90'
                                )}
                              >
                                {sub.name ?? `Everything in ${category}`}
                              </span>
                              <span className="text-[11px] tabular-nums text-cream-muted">
                                {sub.count}
                              </span>
                              <ChevronRight className="h-3.5 w-3.5 -translate-x-1 text-gold opacity-0 transition-all duration-base group-hover/sub:translate-x-0 group-hover/sub:opacity-100" />
                            </button>
                          </motion.li>
                        )
                      )}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Groups the catalog for display. Taxonomy order wins, then anything the
 * taxonomy has not heard of gets a row of its own so imported categories can
 * never go missing from the menu.
 */
function buildSections(items: CatalogItemFull[]): MenuSection[] {
  const byCategory = new Map<string, CatalogItemFull[]>()
  for (const item of items) {
    const rows = byCategory.get(item.category)
    if (rows) rows.push(item)
    else byCategory.set(item.category, [item])
  }

  const sections: MenuSection[] = []
  for (const taxon of TAXONOMY) {
    const rows = byCategory.get(taxon.category)
    if (!rows?.length) continue
    byCategory.delete(taxon.category)
    sections.push({ taxon, items: rows, subs: subsFor(taxon, rows) })
  }
  for (const [category, rows] of byCategory) {
    sections.push({
      taxon: { category, kind: rows[0].kind },
      items: rows,
      subs: subsFor(undefined, rows),
    })
  }
  return sections
}

function subsFor(taxon: Taxon | undefined, rows: CatalogItemFull[]) {
  const counts = new Map<string, number>()
  for (const row of rows) {
    if (!row.subcategory) continue
    counts.set(row.subcategory, (counts.get(row.subcategory) ?? 0) + 1)
  }

  const out: Array<{ name: string; count: number }> = []
  for (const name of taxon?.subcategories ?? []) {
    const count = counts.get(name)
    if (count) {
      out.push({ name, count })
      counts.delete(name)
    }
  }
  // Whatever is left is real data under a subcategory the taxonomy does not
  // declare — show it rather than hiding it behind "everything".
  for (const [name, count] of counts) out.push({ name, count })
  return out
}
