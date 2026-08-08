/**
 * Dummy staff picks and curated pairings.
 *
 * Everything here is placeholder content so the Staff Picks board and the
 * "if you like this" rails have something in them before a manager has sat
 * down with the real menu. Items are matched to the catalog by name — a name
 * that does not exist is skipped with a warning rather than failing the seed.
 *
 * Replace both lists from the admin panel; nothing reads this file at runtime.
 */

export type SeedStaffPick = { name: string; blurb: string }

/** This week's board — one or two per kind so every rail has something. */
export const STAFF_PICKS_THIS_WEEK: SeedStaffPick[] = [
  {
    name: 'The Trelawny',
    blurb: 'What the bar team has been drinking after close. Order it long if it is warm out.',
  },
  {
    name: 'Naked & Famous',
    blurb: 'The mezcal is doing more work than usual this month. Worth the detour.',
  },
  {
    name: 'Springbank 10 Year',
    blurb: 'A new parcel landed Tuesday. Oily, coastal, and gone by the end of the month.',
  },
  {
    name: 'Clairin Sajous',
    blurb: 'If you have never had Haitian cane spirit, start here and start neat.',
  },
  {
    name: 'Rey Campero Jabalí',
    blurb: 'Jabalí is a nightmare to distill and this is why people keep trying.',
  },
  {
    name: 'Cantillon Gueuze 100% Lambic Bio',
    blurb: 'One bottle open per night. Ask early.',
  },
  {
    name: 'Pierre Péters Cuvée de Réserve Blanc de Blancs',
    blurb: 'Grower champagne that drinks like a reason to stay for another.',
  },
]

/** Last week's board, so the rotation has a past to show. */
export const STAFF_PICKS_LAST_WEEK: SeedStaffPick[] = [
  { name: 'Executive Order', blurb: 'Held over by popular demand.' },
  { name: 'Lagavulin 16 Year', blurb: 'The cold snap called for it.' },
  { name: 'Rodenbach Grand Cru', blurb: 'Sour, red, and better than it sounds.' },
  { name: 'Domaine Tempier Bandol Rouge', blurb: 'Mourvèdre with the lights off.' },
]

export type SeedPairing = {
  /** The bottle being looked at. */
  item: string
  recommends: Array<{ name: string; note?: string }>
}

/**
 * Hand-curated "drink this next" links. These outrank anything the favorites
 * maths comes up with, which is the point — the bar gets the last word.
 */
export const PAIRINGS: SeedPairing[] = [
  {
    item: 'Hampden Estate 8 Year',
    recommends: [
      { name: 'Worthy Park 109', note: 'The same island, dialled up and unaged.' },
      { name: 'Clairin Sajous', note: 'If the funk is what you came for, go further.' },
      { name: 'Appleton Estate 12 Year Rare Casks', note: 'The polite version of the same idea.' },
    ],
  },
  {
    item: 'Lagavulin 16 Year',
    recommends: [
      { name: 'Springbank 10 Year', note: 'Less peat, more everything else.' },
      { name: 'Del Maguey Chichicapa', note: 'Smoke without the whisky, if you want a change.' },
    ],
  },
  {
    item: 'Rittenhouse Rye Bottled-in-Bond',
    recommends: [
      { name: 'WhistlePig 10 Year Rye', note: 'What the same grain does with ten years on it.' },
      { name: 'Wild Turkey Rare Breed', note: 'Trade the spice for proof.' },
    ],
  },
  {
    item: 'Fortaleza Blanco',
    recommends: [
      { name: 'Tapatio 110', note: 'Same valley, twice the proof.' },
      { name: 'G4 Blanco', note: 'Rainwater in the cut. Softer, longer.' },
    ],
  },
  {
    item: 'The Trelawny',
    recommends: [
      { name: 'Hampden Estate 8 Year', note: 'The rum underneath it, neat.' },
      { name: 'Improved Ranch Water', note: 'When the second one should be lighter.' },
    ],
  },
  {
    item: 'Paper Plane',
    recommends: [
      { name: 'Amaro Nonino Quintessentia', note: 'A quarter of the drink, on its own.' },
      { name: 'Naked & Famous', note: 'The same four-part trick, smokier.' },
    ],
  },
  {
    item: 'Campari',
    recommends: [
      { name: 'Select Aperitivo', note: 'Venice’s answer. Lower proof, more orange.' },
      { name: 'Cappelletti Sfumato Rabarbaro', note: 'When bitter should taste like a campfire.' },
    ],
  },
]
