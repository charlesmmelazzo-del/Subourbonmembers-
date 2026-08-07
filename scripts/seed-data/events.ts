import type { EventKind, MemberTier } from '@/lib/types'

export type SeedEvent = {
  title: string
  kind: EventKind
  /** Days from the seed run date. Negative values are in the past. */
  day_offset: number
  start_hour: number
  end_hour?: number
  all_day?: boolean
  summary: string
  details?: string
  capacity?: number
  requires_reservation?: boolean
  ticket_price_cents?: number
  tier_required?: MemberTier
  location?: string
  hero?: string
  /** Index into MEMBERS for a private booking's host. */
  host_index?: number
}

const VAULT = '/images/space/subourbon-vault.jpg'
const BAR = '/images/space/subourbon-bar.jpg'
const BOTTLES = '/images/space/subourbon-executive-bottles.jpg'
const FOUNDERS = '/images/space/subourbon-founders-wide.jpg'

export const EVENTS: SeedEvent[] = [
  // --- Recent past, so history views have something in them -----------------
  {
    title: 'Jamaican Rum: Ester Bombs & Where They Come From',
    kind: 'tasting',
    day_offset: -21,
    start_hour: 19,
    end_hour: 21,
    summary: 'Six pours across Hampden, Worthy Park and Appleton, with a detour through the muck pit.',
    details:
      'We poured through the ester scale from a gentle Appleton up to a Hampden overproof, and talked about why wild fermentation in Trelawny produces something that cannot legally be called rum in some markets. Thirty seats, gone in a day.',
    capacity: 30,
    requires_reservation: true,
    location: 'The Vault',
    hero: VAULT,
  },
  {
    title: 'Trio Night: The Wheaton Standards',
    kind: 'concert',
    day_offset: -12,
    start_hour: 20,
    end_hour: 23,
    summary: 'Piano, upright bass, brushes. Two sets.',
    ticket_price_cents: 2500,
    capacity: 60,
    requires_reservation: true,
    location: 'Main Room',
    hero: BAR,
  },
  {
    title: 'Space Closed — Private Member Event',
    kind: 'private_closure',
    day_offset: -6,
    start_hour: 17,
    end_hour: 23,
    all_day: true,
    summary: 'The space is closed to general membership this evening.',
    details:
      'A member has booked the full room for a fiftieth birthday. The bar, vault and founders room are all unavailable. Lockers can be accessed by arrangement — message the staff and we will sort it out.',
    host_index: 7,
    location: 'Entire Space',
  },

  // --- This week ------------------------------------------------------------
  {
    title: 'Agave Beyond Tequila: Sotol, Raicilla & Wild Mezcal',
    kind: 'tasting',
    day_offset: 2,
    start_hour: 19,
    end_hour: 21,
    summary: 'Five pours from producers working outside the Blue Weber monoculture. Thirty seats.',
    details:
      'Romulo Sanchez Parada\'s Jabalí, a wild-harvested Chihuahuan sotol, and three others. We will talk about why Dasylirion is not an agave at all, what a tahona actually changes, and why some of these bottles will never be made again in the same way.\n\nSeats are limited to thirty. Bread and cheese from the kitchen throughout.',
    capacity: 30,
    requires_reservation: true,
    location: 'The Vault',
    hero: BOTTLES,
  },
  {
    title: 'Space Closed — Private Member Event',
    kind: 'private_closure',
    day_offset: 4,
    start_hour: 16,
    end_hour: 23,
    all_day: true,
    summary: 'The space is closed for a private wedding reception.',
    details:
      'A senior member has taken the full space for a wedding reception. We are closed to general membership from four o\'clock. Normal service resumes the following day.',
    host_index: 1,
    location: 'Entire Space',
  },
  {
    title: 'Duo: Guitar & Voice',
    kind: 'concert',
    day_offset: 5,
    start_hour: 20,
    end_hour: 22,
    summary: 'An intimate two-set evening. Tickets required.',
    details:
      'Standards, bossa, and a few things you will not have heard before. Two sets with a short break. Sixty tickets, and the room is genuinely small — this sells out.',
    ticket_price_cents: 3000,
    capacity: 60,
    requires_reservation: true,
    location: 'Main Room',
    hero: BAR,
  },

  // --- Next two weeks -------------------------------------------------------
  {
    title: 'Bonded & Barrel Proof: American Whiskey at Full Strength',
    kind: 'tasting',
    day_offset: 11,
    start_hour: 19,
    end_hour: 21,
    summary: 'Six American whiskeys, none of them cut. Thirty seats.',
    details:
      'Rittenhouse bonded, Rare Breed, Old Forester 1920, and three from the locker programme. We will cover what bottled-in-bond actually guarantees, why barrel entry proof matters more than most people think, and where the water goes.',
    capacity: 30,
    requires_reservation: true,
    location: 'The Vault',
    hero: VAULT,
  },
  {
    title: 'Space Closed — Private Member Event',
    kind: 'private_closure',
    day_offset: 14,
    start_hour: 18,
    end_hour: 23,
    all_day: true,
    summary: 'Closed for a private corporate dinner booked by a member.',
    host_index: 12,
    location: 'Entire Space',
  },
  {
    title: 'Founders Room Supper',
    kind: 'general',
    day_offset: 17,
    start_hour: 18,
    end_hour: 22,
    summary: 'A seated dinner in the founders room. Senior members only.',
    details:
      'Six courses, six pairings, twelve seats. This one is limited to senior members and their co-members.',
    capacity: 12,
    requires_reservation: true,
    tier_required: 'senior',
    location: 'Founders Room',
    hero: FOUNDERS,
  },
  {
    title: 'Amaro & Aperitivo: The Bitter Hour',
    kind: 'tasting',
    day_offset: 19,
    start_hour: 18,
    end_hour: 20,
    summary: 'Working the bitter scale from Aperol to Fernet. Thirty seats.',
    details:
      'A walk from an eleven-percent aperitivo through rabarbaro and alpino and out the far side into Fernet. Snacks throughout, because you will want them.',
    capacity: 30,
    requires_reservation: true,
    location: 'Main Room',
    hero: BOTTLES,
  },
  {
    title: 'Quartet Night',
    kind: 'concert',
    day_offset: 22,
    start_hour: 20,
    end_hour: 23,
    summary: 'Four pieces, two sets, one room. Tickets required.',
    ticket_price_cents: 3500,
    capacity: 60,
    requires_reservation: true,
    location: 'Main Room',
    hero: BAR,
  },

  // --- Further out ----------------------------------------------------------
  {
    title: 'Space Closed — Private Member Event',
    kind: 'private_closure',
    day_offset: 27,
    start_hour: 15,
    end_hour: 23,
    all_day: true,
    summary: 'Closed for a member\'s anniversary party.',
    host_index: 17,
    location: 'Entire Space',
  },
  {
    title: 'Sherry: Flor, Solera, and the Driest Wine in the World',
    kind: 'tasting',
    day_offset: 31,
    start_hour: 19,
    end_hour: 21,
    summary: 'Fino through oloroso, and what happens when the flor dies. Thirty seats.',
    capacity: 30,
    requires_reservation: true,
    location: 'The Vault',
    hero: VAULT,
  },
  {
    title: 'Islay Deep Cut',
    kind: 'tasting',
    day_offset: 38,
    start_hour: 19,
    end_hour: 21,
    summary: 'Six peated malts, and an argument about ppm. Thirty seats.',
    capacity: 30,
    requires_reservation: true,
    location: 'The Vault',
    hero: BOTTLES,
  },
  {
    title: 'Solo Piano',
    kind: 'concert',
    day_offset: 43,
    start_hour: 20,
    end_hour: 22,
    summary: 'One player, one instrument, two sets.',
    ticket_price_cents: 2000,
    capacity: 60,
    requires_reservation: true,
    location: 'Main Room',
    hero: BAR,
  },
]
