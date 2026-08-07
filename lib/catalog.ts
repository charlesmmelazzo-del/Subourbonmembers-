/**
 * The backbar taxonomy, and the technical spec sheet that belongs to each
 * category.
 *
 * `catalog_items.specs` is a free-form jsonb bag. This file is what gives it
 * meaning: SPEC_SHEETS maps a category (or subcategory, which wins when both
 * match) to the ordered list of fields worth showing. The detail view renders
 * whichever keys are actually present, so a half-filled bottle still looks
 * deliberate rather than broken.
 */

export type CatalogKind = 'spirit' | 'beer' | 'wine'

export type SpecField = {
  key: string
  label: string
  /** `prose` fields get a full-width paragraph instead of a spec-row. */
  format?: 'text' | 'prose' | 'list'
  hint?: string
}

export type Taxon = {
  category: string
  subcategories?: string[]
  kind: CatalogKind
  blurb?: string
}

export const TAXONOMY: Taxon[] = [
  {
    category: 'Rum',
    kind: 'spirit',
    subcategories: [
      'Jamaican',
      'Martinique',
      'Barbados',
      'Rum Other',
      'Cachaça',
      'Clairin',
      'Sugar Distillate Other',
    ],
    blurb: 'Cane, in every dialect it has ever been spoken.',
  },
  {
    category: 'Whiskey',
    kind: 'spirit',
    subcategories: [
      'Bourbon',
      'Rye',
      'American Whiskey Other',
      'Japanese',
      'Scotch',
      'Irish',
      'International Whiskey Other',
    ],
    blurb: 'Grain, wood, and patience.',
  },
  { category: 'Gin', kind: 'spirit', blurb: 'Juniper, and the argument around it.' },
  { category: 'Shochu', kind: 'spirit', blurb: 'Koji, and a lighter hand.' },
  {
    category: 'Agave Spirits',
    kind: 'spirit',
    subcategories: ['Mezcal', 'Tequila', 'Sotol', 'Agave Other'],
    blurb: 'Smoke, soil, and a very long wait.',
  },
  {
    category: 'Brandy',
    kind: 'spirit',
    subcategories: ['Cognac', 'Armagnac', 'Eau de Vie', 'Brandy Other'],
    blurb: 'Fruit, distilled and rested.',
  },
  { category: 'Liqueurs', kind: 'spirit', blurb: 'Sweetened, flavored, essential.' },
  { category: 'Amaro', kind: 'spirit', blurb: 'Bitter as a virtue.' },
  { category: 'Aperitivo', kind: 'spirit', blurb: 'The opening argument.' },
  {
    category: 'Fortified & Aromatized Wines',
    kind: 'spirit',
    blurb: 'Wine, with reinforcements.',
  },
  { category: 'Beer', kind: 'beer' },
  { category: 'Wine', kind: 'wine' },
]

export const CATEGORIES = TAXONOMY.map((t) => t.category)

export function taxonFor(category: string): Taxon | undefined {
  return TAXONOMY.find((t) => t.category === category)
}

export function kindFor(category: string): CatalogKind {
  return taxonFor(category)?.kind ?? 'spirit'
}

// ---------------------------------------------------------------------------
// Spec sheets
// ---------------------------------------------------------------------------

const PRODUCTION_BASE: SpecField[] = [
  { key: 'still_type', label: 'Still' },
  { key: 'fermentation', label: 'Fermentation' },
  { key: 'distillation_proof', label: 'Distillation Proof' },
  { key: 'barrel_types', label: 'Cask / Barrel' },
  { key: 'aging_length', label: 'Aging' },
  { key: 'filtration', label: 'Filtration' },
]

const RUM_BASE: SpecField[] = [
  { key: 'base_material', label: 'Base', hint: 'Molasses, cane juice, cane syrup' },
  { key: 'still_type', label: 'Still' },
  { key: 'fermentation', label: 'Fermentation' },
  { key: 'fermentation_length', label: 'Fermentation Length' },
  { key: 'distillation_proof', label: 'Distillation Proof' },
  { key: 'barrel_types', label: 'Cask / Barrel' },
  { key: 'aging_length', label: 'Aging' },
  { key: 'aging_climate', label: 'Aging Climate', hint: 'Tropical or continental' },
  { key: 'angels_share', label: "Angel's Share" },
  { key: 'additives', label: 'Additives / Dosage' },
]

const WHISKEY_BASE: SpecField[] = [
  { key: 'mash_bill', label: 'Mash Bill', format: 'prose' },
  { key: 'grain_source', label: 'Grain Source' },
  { key: 'yeast', label: 'Yeast Strain' },
  { key: 'fermentation', label: 'Fermentation' },
  { key: 'still_type', label: 'Still' },
  { key: 'distillation_proof', label: 'Distillation Proof' },
  { key: 'entry_proof', label: 'Barrel Entry Proof' },
  { key: 'barrel_types', label: 'Barrel' },
  { key: 'char_level', label: 'Char Level' },
  { key: 'warehouse', label: 'Warehouse / Rickhouse' },
  { key: 'aging_length', label: 'Aging' },
  { key: 'batch_type', label: 'Batching', hint: 'Single barrel, small batch, blend' },
  { key: 'filtration', label: 'Filtration' },
]

const AGAVE_BASE: SpecField[] = [
  { key: 'agave_type', label: 'Agave', hint: 'Species — Espadín, Tobalá, Blue Weber…' },
  { key: 'agave_age', label: 'Agave Maturity' },
  { key: 'agave_origin', label: 'Agave Origin' },
  { key: 'cooking_method', label: 'Cooking', hint: 'Earthen pit, brick oven, autoclave' },
  { key: 'milling', label: 'Milling', hint: 'Tahona, roller mill, mano, shredder' },
  { key: 'fermentation_vessel', label: 'Fermentation Vessel' },
  { key: 'fermentation', label: 'Fermentation' },
  { key: 'water_source', label: 'Water' },
  { key: 'still_type', label: 'Still', hint: 'Copper pot, clay, alembic, filipino' },
  { key: 'distillations', label: 'Distillations' },
  { key: 'distillation_proof', label: 'Distillation Proof' },
  { key: 'maestro', label: 'Maestro / Distiller' },
  { key: 'nom', label: 'NOM / Certification' },
  { key: 'barrel_types', label: 'Cask' },
  { key: 'aging_length', label: 'Aging' },
]

export const SPEC_SHEETS: Record<string, SpecField[]> = {
  // --- Rum -----------------------------------------------------------------
  Rum: RUM_BASE,
  Jamaican: [
    ...RUM_BASE,
    { key: 'marque', label: 'Marque', hint: 'e.g. DOK, HLCF, LROK' },
    { key: 'ester_count', label: 'Ester Count', hint: 'g/hLPA' },
    { key: 'dunder', label: 'Dunder / Muck Pit' },
  ],
  Martinique: [
    ...RUM_BASE,
    { key: 'aoc', label: 'AOC', hint: 'AOC Martinique Rhum Agricole' },
    { key: 'cane_variety', label: 'Cane Variety' },
    { key: 'harvest', label: 'Harvest' },
    { key: 'column_plates', label: 'Column Plates' },
  ],
  Barbados: [...RUM_BASE, { key: 'blend_ratio', label: 'Pot / Column Ratio' }],
  Cachaça: [
    ...RUM_BASE,
    { key: 'cane_variety', label: 'Cane Variety' },
    { key: 'wood_type', label: 'Native Wood', hint: 'Amburana, Jequitibá, Bálsamo…' },
  ],
  Clairin: [
    ...RUM_BASE,
    { key: 'terroir', label: 'Terroir / Commune' },
    { key: 'cane_variety', label: 'Cane Variety' },
    { key: 'wild_yeast', label: 'Wild Fermentation' },
  ],
  'Rum Other': RUM_BASE,
  'Sugar Distillate Other': RUM_BASE,

  // --- Whiskey -------------------------------------------------------------
  Whiskey: WHISKEY_BASE,
  Bourbon: WHISKEY_BASE,
  Rye: WHISKEY_BASE,
  'American Whiskey Other': WHISKEY_BASE,
  Scotch: [
    { key: 'scotch_region', label: 'Region', hint: 'Islay, Speyside, Highland…' },
    { key: 'malt_type', label: 'Type', hint: 'Single malt, blended, grain' },
    { key: 'peat_ppm', label: 'Peat', hint: 'Phenol ppm' },
    { key: 'malting', label: 'Malting' },
    { key: 'still_type', label: 'Stills' },
    { key: 'still_shape', label: 'Still Shape / Lyne Arm' },
    { key: 'fermentation', label: 'Fermentation' },
    { key: 'distillation_proof', label: 'Distillation Proof' },
    { key: 'barrel_types', label: 'Cask' },
    { key: 'aging_length', label: 'Aging' },
    { key: 'filtration', label: 'Chill Filtration' },
    { key: 'coloring', label: 'Caramel Coloring (E150)' },
  ],
  Japanese: [
    ...WHISKEY_BASE,
    { key: 'mizunara', label: 'Mizunara Influence' },
    { key: 'jsla', label: 'JSLA Compliant' },
  ],
  Irish: [
    ...WHISKEY_BASE,
    { key: 'pot_still_type', label: 'Style', hint: 'Single pot still, single malt, blend' },
    { key: 'distillations', label: 'Distillations' },
  ],
  'International Whiskey Other': WHISKEY_BASE,

  // --- Agave ---------------------------------------------------------------
  'Agave Spirits': AGAVE_BASE,
  Mezcal: AGAVE_BASE,
  Tequila: [...AGAVE_BASE, { key: 'highlands_lowlands', label: 'Los Altos / Valles' }],
  Sotol: [
    { key: 'dasylirion_species', label: 'Dasylirion Species' },
    ...AGAVE_BASE.filter((f) => f.key !== 'agave_type'),
  ],
  'Agave Other': AGAVE_BASE,

  // --- Everything else -----------------------------------------------------
  Gin: [
    { key: 'botanicals', label: 'Botanicals', format: 'prose' },
    { key: 'juniper_origin', label: 'Juniper Origin' },
    { key: 'base_spirit', label: 'Base Spirit' },
    { key: 'infusion_method', label: 'Method', hint: 'Maceration, vapor basket, one-shot' },
    { key: 'still_type', label: 'Still' },
    { key: 'distillation_proof', label: 'Distillation Proof' },
    { key: 'style', label: 'Style', hint: 'London Dry, Old Tom, Navy Strength…' },
  ],
  Shochu: [
    { key: 'base_ingredient', label: 'Base', hint: 'Imo, mugi, kome, kokuto, soba' },
    { key: 'koji', label: 'Koji', hint: 'White, black, or yellow' },
    { key: 'fermentation', label: 'Fermentation' },
    { key: 'distillation_method', label: 'Distillation', hint: 'Atmospheric or vacuum' },
    { key: 'honkaku', label: 'Honkaku (Single Distilled)' },
    { key: 'aging_length', label: 'Resting' },
    { key: 'water_source', label: 'Water' },
  ],
  Brandy: [
    { key: 'fruit', label: 'Fruit / Grape' },
    ...PRODUCTION_BASE,
  ],
  Cognac: [
    { key: 'cru', label: 'Cru', hint: 'Grande Champagne, Borderies…' },
    { key: 'grape_varieties', label: 'Grapes' },
    { key: 'still_type', label: 'Still', hint: 'Charentais alembic' },
    { key: 'lees', label: 'Distilled on Lees' },
    { key: 'distillation_proof', label: 'Distillation Proof' },
    { key: 'barrel_types', label: 'Oak', hint: 'Limousin, Tronçais' },
    { key: 'aging_length', label: 'Aging' },
    { key: 'rancio', label: 'Rancio' },
    { key: 'additives', label: 'Boisé / Dosage' },
  ],
  Armagnac: [
    { key: 'armagnac_region', label: 'Region', hint: 'Bas-Armagnac, Ténarèze, Haut-Armagnac' },
    { key: 'grape_varieties', label: 'Grapes' },
    { key: 'still_type', label: 'Still', hint: 'Alambic Armagnacais, continuous' },
    { key: 'distillation_proof', label: 'Distillation Proof' },
    { key: 'barrel_types', label: 'Oak' },
    { key: 'aging_length', label: 'Aging' },
    { key: 'vintage_or_blend', label: 'Vintage or Blend' },
  ],
  'Eau de Vie': [
    { key: 'fruit', label: 'Fruit' },
    { key: 'fruit_ratio', label: 'Fruit per Bottle' },
    { key: 'fermentation', label: 'Fermentation' },
    { key: 'still_type', label: 'Still' },
    { key: 'distillation_proof', label: 'Distillation Proof' },
    { key: 'aging_length', label: 'Resting', hint: 'Usually glass or steel' },
  ],
  'Brandy Other': [{ key: 'fruit', label: 'Fruit / Grape' }, ...PRODUCTION_BASE],
  Liqueurs: [
    { key: 'base_spirit', label: 'Base Spirit' },
    { key: 'flavor_source', label: 'Flavoring', format: 'prose' },
    { key: 'infusion_method', label: 'Method', hint: 'Maceration, percolation, distillation' },
    { key: 'sugar_content', label: 'Sugar', hint: 'g/L' },
    { key: 'aging_length', label: 'Aging' },
  ],
  Amaro: [
    { key: 'amaro_style', label: 'Style', hint: 'Alpino, Carciofo, Fernet, Rabarbaro…' },
    { key: 'botanicals', label: 'Botanicals', format: 'prose' },
    { key: 'bittering_agent', label: 'Bittering Agent', hint: 'Gentian, cinchona, rhubarb…' },
    { key: 'base_spirit', label: 'Base' },
    { key: 'infusion_method', label: 'Method' },
    { key: 'sugar_content', label: 'Sugar', hint: 'g/L' },
    { key: 'aging_length', label: 'Aging' },
    { key: 'origin_year', label: 'First Produced' },
  ],
  Aperitivo: [
    { key: 'botanicals', label: 'Botanicals', format: 'prose' },
    { key: 'bittering_agent', label: 'Bittering Agent' },
    { key: 'base_spirit', label: 'Base' },
    { key: 'sugar_content', label: 'Sugar', hint: 'g/L' },
    { key: 'coloring', label: 'Coloring' },
    { key: 'origin_year', label: 'First Produced' },
  ],
  'Fortified & Aromatized Wines': [
    { key: 'style', label: 'Style', hint: 'Vermouth, Sherry, Port, Madeira, Quinquina…' },
    { key: 'grape_varieties', label: 'Grapes' },
    { key: 'botanicals', label: 'Botanicals', format: 'prose' },
    { key: 'fortifying_spirit', label: 'Fortifying Spirit' },
    { key: 'aging_system', label: 'Aging System', hint: 'Solera, criadera, static' },
    { key: 'aging_length', label: 'Aging' },
    { key: 'sugar_content', label: 'Sugar', hint: 'g/L' },
    { key: 'serving', label: 'Serving Note' },
  ],

  // --- Beer & wine ---------------------------------------------------------
  Beer: [
    { key: 'style', label: 'Style' },
    { key: 'ibu', label: 'IBU' },
    { key: 'malt_bill', label: 'Malt', format: 'prose' },
    { key: 'hops', label: 'Hops' },
    { key: 'yeast', label: 'Yeast' },
    { key: 'fermentation', label: 'Fermentation' },
    { key: 'barrel_types', label: 'Barrel' },
    { key: 'aging_length', label: 'Aging' },
    { key: 'package', label: 'Format' },
  ],
  Wine: [
    { key: 'grape_varieties', label: 'Varieties' },
    { key: 'appellation', label: 'Appellation' },
    { key: 'vineyard', label: 'Vineyard' },
    { key: 'soil', label: 'Soil' },
    { key: 'farming', label: 'Farming', hint: 'Organic, biodynamic, conventional' },
    { key: 'fermentation', label: 'Fermentation' },
    { key: 'elevage', label: 'Élevage' },
    { key: 'dosage', label: 'Dosage' },
    { key: 'production', label: 'Production', hint: 'Bottles made' },
    { key: 'serving', label: 'Serving Note' },
  ],
}

/** Spec sheet for an item — subcategory wins over category. */
export function specSheet(category: string, subcategory?: string | null): SpecField[] {
  if (subcategory && SPEC_SHEETS[subcategory]) return SPEC_SHEETS[subcategory]
  return SPEC_SHEETS[category] ?? PRODUCTION_BASE
}

/** Only the fields this item actually has values for, in sheet order. */
export function populatedSpecs(
  category: string,
  subcategory: string | null | undefined,
  specs: Record<string, unknown> | null | undefined
): Array<SpecField & { value: string }> {
  if (!specs) return []
  return specSheet(category, subcategory)
    .map((field) => ({ ...field, value: formatSpecValue(specs[field.key]) }))
    .filter((f) => f.value.length > 0)
}

function formatSpecValue(raw: unknown): string {
  if (raw === null || raw === undefined) return ''
  if (Array.isArray(raw)) return raw.filter(Boolean).join(', ')
  if (typeof raw === 'boolean') return raw ? 'Yes' : 'No'
  return String(raw).trim()
}

/** Any spec keys not covered by the sheet, so nothing imported is lost. */
export function extraSpecs(
  category: string,
  subcategory: string | null | undefined,
  specs: Record<string, unknown> | null | undefined
): Array<{ key: string; label: string; value: string }> {
  if (!specs) return []
  const known = new Set(specSheet(category, subcategory).map((f) => f.key))
  return Object.entries(specs)
    .filter(([key]) => !known.has(key))
    .map(([key, value]) => ({ key, label: humanize(key), value: formatSpecValue(value) }))
    .filter((f) => f.value.length > 0)
}

export function humanize(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bAbv\b/, 'ABV')
    .replace(/\bIbu\b/, 'IBU')
    .replace(/\bAoc\b/, 'AOC')
    .replace(/\bNom\b/, 'NOM')
}

export function proofFromAbv(abv: number | null | undefined): string | null {
  if (abv === null || abv === undefined) return null
  return `${(abv * 2).toFixed(abv * 2 % 1 === 0 ? 0 : 1)}°`
}
