'use client'

import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { MENU_GROUPS, TAXONOMY, groupForKind, type MenuGroup, type Taxon } from '@/lib/catalog'
import { DiamondRule } from '@/components/ui/Logo'
import { iconForKind } from './kindIcon'
import type { CatalogItemFull } from '@/lib/types'

export type MenuSection = {
  taxon: Taxon
  items: CatalogItemFull[]
  subs: Array<{ name: string; count: number }>
  /**
   * What clicking this row opens. Usually the row's own category, but a
   * promoted row is really a subcategory wearing a category's clothes, and it
   * has to select the pair it was filed under.
   */
  select: { category: string; subcategory: string | null }
}

type Group = {
  group: MenuGroup
  sections: MenuSection[]
  total: number
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
 * The menu, as a bar menu rather than a database table. Three standing
 * headings — Cocktails, Spirits List, Beer and Wine List — with the categories
 * under each collapsed to a line, and subcategories revealed on click. Picking
 * a leaf hands off to the category panel, which is where bottles actually live.
 *
 * The headings do not collapse on purpose: they are the shape of the menu, and
 * hiding them would put a third click between a member and a drink.
 */
export function MenuAccordion({ items, expanded, onToggle, onSelect }: Props) {
  const groups = useMemo(() => buildGroups(items), [items])

  return (
    <div className="space-y-9">
      {groups.map(({ group, sections, total }) => (
        <section key={group.key} aria-labelledby={`menu-${group.key}`}>
          <header className="mb-3">
            <div className="flex items-baseline justify-between gap-4">
              <h2
                id={`menu-${group.key}`}
                className="font-display text-2xl leading-tight text-cream sm:text-[1.75rem]"
              >
                {group.title}
              </h2>
              <span className="shrink-0 text-xs tabular-nums text-cream-muted">{total}</span>
            </div>
            {group.blurb && (
              <p className="mt-1 text-xs italic text-cream-muted">{group.blurb}</p>
            )}
            <DiamondRule className="mt-3" />
          </header>

          <ul className="space-y-2">
            {sections.map((section) => (
              <CategoryRow
                key={section.taxon.category}
                section={section}
                open={expanded === section.taxon.category}
                onToggle={onToggle}
                onSelect={onSelect}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function CategoryRow({
  section, open, onToggle, onSelect,
}: {
  section: MenuSection
  open: boolean
  onToggle: (category: string) => void
  onSelect: (category: string, subcategory: string | null) => void
}) {
  const { category, blurb, kind } = section.taxon
  const Icon = iconForKind(kind)
  // A category with nothing to branch into opens its panel directly —
  // expanding to reveal a single "everything" row would be theatre.
  const leaf = section.subs.length === 0

  return (
    <li>
      <div
        className={clsx(
          'overflow-hidden rounded-xl border bg-ink-card transition-colors duration-base',
          open ? 'border-gold/40' : 'border-ink-line hover:border-gold/25'
        )}
      >
        <button
          onClick={() =>
            leaf
              ? onSelect(section.select.category, section.select.subcategory)
              : onToggle(category)
          }
          aria-expanded={leaf ? undefined : open}
          className="group flex w-full items-center gap-4 px-4 py-3.5 text-left sm:px-5"
        >
          {/*
            Two different promises, so two different marks: a chevron that
            turns means "this opens up", a diamond means "this goes straight
            to the bottles".
          */}
          {leaf ? (
            <span className="h-[6px] w-[6px] shrink-0 rotate-45 bg-gold/40 transition-colors group-hover:bg-gold" />
          ) : (
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
          )}

          <span className="min-w-0 flex-1">
            <span
              className={clsx(
                'block font-display text-lg leading-tight transition-colors sm:text-xl',
                open ? 'text-gold-bright' : 'text-cream group-hover:text-cream-warm'
              )}
            >
              {category}
            </span>
            {blurb && <span className="mt-0.5 block text-xs italic text-cream-muted">{blurb}</span>}
          </span>

          <span className="shrink-0 text-xs tabular-nums text-cream-muted">
            {section.items.length}
          </span>
          {leaf ? (
            <ChevronRight className="h-4 w-4 shrink-0 -translate-x-1 text-gold opacity-0 transition-all duration-base group-hover:translate-x-0 group-hover:opacity-100" />
          ) : (
            <Icon className="hidden h-4 w-4 shrink-0 text-gold/25 sm:block" strokeWidth={1.25} />
          )}
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
                {[{ name: null, count: section.items.length }, ...section.subs].map((sub, i) => (
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
                      <span className="text-[11px] tabular-nums text-cream-muted">{sub.count}</span>
                      <ChevronRight className="h-3.5 w-3.5 -translate-x-1 text-gold opacity-0 transition-all duration-base group-hover/sub:translate-x-0 group-hover/sub:opacity-100" />
                    </button>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </li>
  )
}

/**
 * Buckets the catalog into the three menu headings.
 *
 * Where a heading turns out to hold exactly one category of the same name —
 * Cocktails, as the menu stands — that category's subcategories are promoted
 * up a level, so the section reads "Cocktails / Stirred" rather than
 * "Cocktails / Cocktails / Stirred".
 */
function buildGroups(items: CatalogItemFull[]): Group[] {
  const sections = buildSections(items)

  return MENU_GROUPS.flatMap((group) => {
    const mine = sections.filter((s) => group.kinds.includes(s.taxon.kind))
    if (mine.length === 0) return []

    const total = mine.reduce((n, s) => n + s.items.length, 0)
    const only = mine.length === 1 ? mine[0] : null

    // Promoting is only safe when every item is filed under a subcategory —
    // otherwise the unfiled ones would have no row to reach them by, and the
    // nested form shows everything.
    if (
      only &&
      only.taxon.category === group.title &&
      only.subs.length > 0 &&
      only.items.every((i) => i.subcategory)
    ) {
      return [{ group, total, sections: promote(only) }]
    }
    return [{ group, total, sections: mine }]
  })
}

/** Turns a category's subcategories into categories in their own right. */
function promote(section: MenuSection): MenuSection[] {
  const bySub = new Map<string, CatalogItemFull[]>()
  for (const item of section.items) {
    const key = item.subcategory!
    bySub.set(key, [...(bySub.get(key) ?? []), item])
  }

  return section.subs.flatMap(({ name }) => {
    const rows = bySub.get(name)
    if (!rows?.length) return []
    return [{
      // Nothing below this level, so it opens its panel on click — but what it
      // opens is still the parent category filtered to this subcategory.
      taxon: { category: name, kind: section.taxon.kind },
      items: rows,
      subs: [],
      select: { category: section.taxon.category, subcategory: name },
    }]
  })
}

/**
 * Groups the catalog by category. Taxonomy order wins, then anything the
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
    sections.push({
      taxon,
      items: rows,
      subs: subsFor(taxon, rows),
      select: { category: taxon.category, subcategory: null },
    })
  }
  for (const [category, rows] of byCategory) {
    // An unknown category still has a kind, which is all a heading needs — but
    // a kind no heading claims would drop the category off the menu entirely.
    const kind = rows[0].kind
    sections.push({
      taxon: { category, kind: groupForKind(kind) ? kind : 'spirit' },
      items: rows,
      subs: subsFor(undefined, rows),
      select: { category, subcategory: null },
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
