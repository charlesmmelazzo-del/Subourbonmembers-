import type { MemberTier } from '@/lib/types'

export type SeedMember = {
  first_name: string
  last_name: string
  email: string
  phone: string
  address_line1: string
  city: string
  state: string
  postal_code: string
  tier: MemberTier
  member_since: string
  birthday: string
  vip?: boolean
  preferences?: string
  /** Rough annual spend, used to shape the generated Toast history. */
  spend_band: 'low' | 'mid' | 'high' | 'whale'
  /** Visits per month on average, used to generate the visit log. */
  visit_rate: number
  locker?: string
  co_members?: Array<{ name: string; email: string; accepted: boolean }>
}

// Wheaton / Glen Ellyn / Naperville — Subourbon's actual catchment.
export const MEMBERS: SeedMember[] = [
  {
    first_name: 'Nathaniel', last_name: 'Ashford',
    email: 'n.ashford@example.com', phone: '(630) 555-0142',
    address_line1: '812 N Main St', city: 'Wheaton', state: 'IL', postal_code: '60187',
    tier: 'senior', member_since: '2023-02-14', birthday: '1978-06-03', vip: true,
    preferences: 'Neat pours, no ice. Deep in Jamaican rum right now — the funkier the better. Allergic to shellfish.',
    spend_band: 'whale', visit_rate: 5.2, locker: 'A-01',
    co_members: [
      { name: 'Claire Ashford', email: 'c.ashford@example.com', accepted: true },
      { name: 'Douglas Pree', email: 'd.pree@example.com', accepted: true },
      { name: 'Marisol Ferrer', email: 'm.ferrer@example.com', accepted: false },
    ],
  },
  {
    first_name: 'Imogen', last_name: 'Whitlock',
    email: 'i.whitlock@example.com', phone: '(630) 555-0198',
    address_line1: '44 Crescent Blvd', city: 'Glen Ellyn', state: 'IL', postal_code: '60137',
    tier: 'senior', member_since: '2023-03-02', birthday: '1985-11-19', vip: true,
    preferences: 'Champagne first, always. Working through grower producers. Hates anything overly sweet.',
    spend_band: 'whale', visit_rate: 4.1, locker: 'A-02',
    co_members: [
      { name: 'Theo Whitlock', email: 't.whitlock@example.com', accepted: true },
      { name: 'Priya Raghunathan', email: 'p.raghunathan@example.com', accepted: true },
    ],
  },
  {
    first_name: 'Desmond', last_name: 'Ackerley',
    email: 'd.ackerley@example.com', phone: '(630) 555-0177',
    address_line1: '1290 Butterfield Rd', city: 'Wheaton', state: 'IL', postal_code: '60189',
    tier: 'senior', member_since: '2023-04-21', birthday: '1969-01-27',
    preferences: 'Islay, and nothing but. Will try a sherried Speysider if pushed. Prefers the vault seats.',
    spend_band: 'high', visit_rate: 3.4, locker: 'A-03',
    co_members: [{ name: 'Ruth Ackerley', email: 'r.ackerley@example.com', accepted: true }],
  },
  {
    first_name: 'Priyanka', last_name: 'Venkataraman',
    email: 'p.venkat@example.com', phone: '(630) 555-0104',
    address_line1: '77 Naperville Rd', city: 'Naperville', state: 'IL', postal_code: '60540',
    tier: 'senior', member_since: '2023-05-08', birthday: '1988-09-12',
    preferences: 'Agave forward. Loves anything from a clay pot still. Low-ABV options for weeknights.',
    spend_band: 'high', visit_rate: 4.6, locker: 'A-04',
    co_members: [
      { name: 'Arjun Venkataraman', email: 'a.venkat@example.com', accepted: true },
      { name: 'Sana Qureshi', email: 's.qureshi@example.com', accepted: false },
    ],
  },
  {
    first_name: 'Callum', last_name: 'Brightwater',
    email: 'c.brightwater@example.com', phone: '(630) 555-0166',
    address_line1: '203 W Wesley St', city: 'Wheaton', state: 'IL', postal_code: '60187',
    tier: 'senior', member_since: '2023-06-30', birthday: '1974-04-08',
    preferences: 'Rye Manhattans, stirred, orange twist. Building a locker of bonded American whiskey.',
    spend_band: 'high', visit_rate: 3.9, locker: 'A-05',
  },
  {
    first_name: 'Saoirse', last_name: 'Delacroix',
    email: 's.delacroix@example.com', phone: '(630) 555-0121',
    address_line1: '918 Roosevelt Rd', city: 'Glen Ellyn', state: 'IL', postal_code: '60137',
    tier: 'senior', member_since: '2023-08-11', birthday: '1991-02-22', vip: true,
    preferences: 'Amaro obsessive. Wants to try everything bitter we bring in. Vegetarian.',
    spend_band: 'high', visit_rate: 5.8, locker: 'A-06',
    co_members: [{ name: 'Benoit Delacroix', email: 'b.delacroix@example.com', accepted: true }],
  },
  {
    first_name: 'Thaddeus', last_name: 'Okonkwo',
    email: 't.okonkwo@example.com', phone: '(630) 555-0193',
    address_line1: '556 Front St', city: 'Wheaton', state: 'IL', postal_code: '60187',
    tier: 'senior', member_since: '2023-09-19', birthday: '1980-12-05',
    preferences: 'Cognac and armagnac. Interested in single-estate anything. Sits at the bar.',
    spend_band: 'high', visit_rate: 2.8, locker: 'A-07',
  },
  {
    first_name: 'Wilhelmina', last_name: 'Strand',
    email: 'w.strand@example.com', phone: '(630) 555-0158',
    address_line1: '3300 Finley Rd', city: 'Downers Grove', state: 'IL', postal_code: '60515',
    tier: 'senior', member_since: '2023-10-04', birthday: '1972-07-30',
    preferences: 'Old vine reds and Barolo. Will always take a recommendation. Celebrates anniversaries here.',
    spend_band: 'high', visit_rate: 2.2, locker: 'A-08',
    co_members: [
      { name: 'Gregor Strand', email: 'g.strand@example.com', accepted: true },
      { name: 'Anneke Vos', email: 'a.vos@example.com', accepted: true },
      { name: 'Lars Mikkelsen', email: 'l.mikkelsen@example.com', accepted: true },
    ],
  },
  {
    first_name: 'Rasheed', last_name: 'Boulware',
    email: 'r.boulware@example.com', phone: '(630) 555-0137',
    address_line1: '61 S Park Blvd', city: 'Glen Ellyn', state: 'IL', postal_code: '60137',
    tier: 'senior', member_since: '2023-11-15', birthday: '1983-03-17',
    preferences: 'Daiquiri as a benchmark. Rum-first, agricole especially. No garnish fuss.',
    spend_band: 'mid', visit_rate: 4.4, locker: 'B-01',
  },
  {
    first_name: 'Cordelia', last_name: 'Fanshawe',
    email: 'c.fanshawe@example.com', phone: '(630) 555-0189',
    address_line1: '145 E Liberty Dr', city: 'Wheaton', state: 'IL', postal_code: '60187',
    tier: 'senior', member_since: '2024-01-09', birthday: '1990-08-24',
    preferences: 'Gin. Navy strength when available. Keeps meticulous tasting notes.',
    spend_band: 'mid', visit_rate: 3.7, locker: 'B-02',
    co_members: [{ name: 'Miles Fanshawe', email: 'm.fanshawe@example.com', accepted: false }],
  },
  {
    first_name: 'Bartholomew', last_name: 'Quill',
    email: 'b.quill@example.com', phone: '(630) 555-0115',
    address_line1: '890 Warrenville Rd', city: 'Lisle', state: 'IL', postal_code: '60532',
    tier: 'senior', member_since: '2024-02-27', birthday: '1965-05-11',
    preferences: 'Bourbon, barrel proof, no water. Locker regular. Prefers Tuesdays.',
    spend_band: 'high', visit_rate: 3.1, locker: 'B-03',
  },
  {
    first_name: 'Anneliese', last_name: 'Ravensworth',
    email: 'a.ravensworth@example.com', phone: '(630) 555-0172',
    address_line1: '412 Hill Ave', city: 'Glen Ellyn', state: 'IL', postal_code: '60137',
    tier: 'senior', member_since: '2024-03-14', birthday: '1987-10-02',
    preferences: 'Sherry and fortified wines. Loves a flight. Gluten sensitive.',
    spend_band: 'mid', visit_rate: 4.9, locker: 'B-04',
    co_members: [{ name: 'Otto Ravensworth', email: 'o.ravensworth@example.com', accepted: true }],
  },
  {
    first_name: 'Ignatius', last_name: 'Mbeki',
    email: 'i.mbeki@example.com', phone: '(630) 555-0148',
    address_line1: '2201 Ogden Ave', city: 'Downers Grove', state: 'IL', postal_code: '60515',
    tier: 'senior', member_since: '2024-04-30', birthday: '1976-01-08',
    preferences: 'Mezcal, wild agave especially. Will pay for rarity. Books the founders room.',
    spend_band: 'whale', visit_rate: 2.6, locker: 'B-05',
  },
  {
    first_name: 'Rosalind', last_name: 'Kettleburn',
    email: 'r.kettleburn@example.com', phone: '(630) 555-0126',
    address_line1: '76 N President St', city: 'Wheaton', state: 'IL', postal_code: '60187',
    tier: 'senior', member_since: '2024-06-06', birthday: '1993-04-19',
    preferences: 'Low-intervention wine. Skin contact welcome. Non-alcoholic options for a friend.',
    spend_band: 'mid', visit_rate: 3.3, locker: 'B-06',
    co_members: [
      { name: 'Fenwick Kettleburn', email: 'f.kettleburn@example.com', accepted: true },
      { name: 'Juno Alvarez', email: 'j.alvarez@example.com', accepted: true },
    ],
  },
  {
    first_name: 'Everett', last_name: 'Sandoval-Pike',
    email: 'e.sandovalpike@example.com', phone: '(630) 555-0183',
    address_line1: '1550 Winfield Rd', city: 'Warrenville', state: 'IL', postal_code: '60555',
    tier: 'senior', member_since: '2024-07-22', birthday: '1981-09-28',
    preferences: 'Japanese whisky and shochu. Curious about koji. Quiet corner, please.',
    spend_band: 'high', visit_rate: 2.9, locker: 'B-07',
  },
  {
    first_name: 'Marguerite', last_name: 'Thorne',
    email: 'm.thorne@example.com', phone: '(630) 555-0109',
    address_line1: '333 Pennsylvania Ave', city: 'Glen Ellyn', state: 'IL', postal_code: '60137',
    tier: 'senior', member_since: '2024-09-03', birthday: '1970-11-14', vip: true,
    preferences: 'Everything, once. Sends friends constantly. Our most reliable event attendee.',
    spend_band: 'whale', visit_rate: 6.4, locker: 'B-08',
    co_members: [{ name: 'Hugo Thorne', email: 'h.thorne@example.com', accepted: true }],
  },
  {
    first_name: 'Alistair', last_name: 'Featherstone',
    email: 'a.featherstone@example.com', phone: '(630) 555-0164',
    address_line1: '905 College Ave', city: 'Wheaton', state: 'IL', postal_code: '60187',
    tier: 'senior', member_since: '2024-10-17', birthday: '1979-02-06',
    preferences: 'Beer nerd first, spirits second. Lambic and Flanders reds. Brings his own glassware jokes.',
    spend_band: 'mid', visit_rate: 4.2, locker: 'C-01',
  },
  {
    first_name: 'Xiomara', last_name: 'Delgado-Reyes',
    email: 'x.delgadoreyes@example.com', phone: '(630) 555-0151',
    address_line1: '18 W Jefferson Ave', city: 'Naperville', state: 'IL', postal_code: '60540',
    tier: 'senior', member_since: '2024-11-29', birthday: '1986-06-21',
    preferences: 'Tequila, highlands. Doing a vertical of Fortaleza. Anniversary in June.',
    spend_band: 'high', visit_rate: 3.6, locker: 'C-02',
    co_members: [{ name: 'Emiliano Reyes', email: 'e.reyes@example.com', accepted: true }],
  },
  {
    first_name: 'Percival', last_name: 'Hollingsworth',
    email: 'p.hollingsworth@example.com', phone: '(630) 555-0195',
    address_line1: '640 Roosevelt Rd', city: 'Wheaton', state: 'IL', postal_code: '60187',
    tier: 'senior', member_since: '2025-01-12', birthday: '1962-08-09',
    preferences: 'Port and cigars, in that order. Old-school. Calls rather than emails.',
    spend_band: 'high', visit_rate: 2.4, locker: 'C-03',
  },
  {
    first_name: 'Beatrix', last_name: 'Nakamura-Doyle',
    email: 'b.nakamuradoyle@example.com', phone: '(630) 555-0132',
    address_line1: '271 Taylor Ave', city: 'Glen Ellyn', state: 'IL', postal_code: '60137',
    tier: 'senior', member_since: '2025-02-25', birthday: '1994-12-30',
    preferences: 'Highballs. Big on Japanese technique. Wants a shochu tasting.',
    spend_band: 'mid', visit_rate: 5.1, locker: 'C-04',
    co_members: [
      { name: 'Kenji Nakamura', email: 'k.nakamura@example.com', accepted: true },
      { name: 'Fiona Doyle', email: 'f.doyle@example.com', accepted: true },
      { name: 'Riordan Doyle', email: 'r.doyle@example.com', accepted: false },
    ],
  },

  // --- Junior members ------------------------------------------------------
  {
    first_name: 'Jules', last_name: 'Amberton',
    email: 'j.amberton@example.com', phone: '(630) 555-0118',
    address_line1: '129 S Main St', city: 'Wheaton', state: 'IL', postal_code: '60187',
    tier: 'junior', member_since: '2024-05-01', birthday: '1996-03-15',
    preferences: 'New to spirits. Likes anything citrus forward. Asks great questions.',
    spend_band: 'low', visit_rate: 2.1,
  },
  {
    first_name: 'Odalys', last_name: 'Pemberton',
    email: 'o.pemberton@example.com', phone: '(630) 555-0146',
    address_line1: '58 Duane St', city: 'Glen Ellyn', state: 'IL', postal_code: '60137',
    tier: 'junior', member_since: '2024-06-18', birthday: '1998-07-07',
    preferences: 'Spritz drinker. Slowly working toward amaro.',
    spend_band: 'low', visit_rate: 3.2,
  },
  {
    first_name: 'Fitzgerald', last_name: 'Nkemdirim',
    email: 'f.nkemdirim@example.com', phone: '(630) 555-0173',
    address_line1: '2410 Wiesbrook Rd', city: 'Wheaton', state: 'IL', postal_code: '60189',
    tier: 'junior', member_since: '2024-08-09', birthday: '1992-10-23',
    preferences: 'Bourbon curious. Wants to understand mash bills.',
    spend_band: 'mid', visit_rate: 2.7,
  },
  {
    first_name: 'Serafina', last_name: 'Wycliffe',
    email: 's.wycliffe@example.com', phone: '(630) 555-0154',
    address_line1: '811 Prairie Ave', city: 'Naperville', state: 'IL', postal_code: '60540',
    tier: 'junior', member_since: '2024-09-27', birthday: '1995-01-31',
    preferences: 'Wine only, mostly white. Interested in Champagne.',
    spend_band: 'low', visit_rate: 1.9,
  },
  {
    first_name: 'Lucian', last_name: 'Ravenscroft',
    email: 'l.ravenscroft@example.com', phone: '(630) 555-0187',
    address_line1: '1701 Ogden Ave', city: 'Lisle', state: 'IL', postal_code: '60532',
    tier: 'junior', member_since: '2024-10-30', birthday: '1989-05-16',
    preferences: 'Negroni, always. Trying different bitters and vermouths.',
    spend_band: 'mid', visit_rate: 3.8,
  },
  {
    first_name: 'Adaeze', last_name: 'Onwuachi',
    email: 'a.onwuachi@example.com', phone: '(630) 555-0163',
    address_line1: '340 Scott St', city: 'Wheaton', state: 'IL', postal_code: '60187',
    tier: 'junior', member_since: '2024-12-05', birthday: '1997-11-09',
    preferences: 'Rum, coming from a tiki angle. Wants to learn the funky stuff.',
    spend_band: 'low', visit_rate: 2.4,
  },
  {
    first_name: 'Ferdinand', last_name: 'Blackwood',
    email: 'f.blackwood@example.com', phone: '(630) 555-0129',
    address_line1: '96 N Main St', city: 'Glen Ellyn', state: 'IL', postal_code: '60137',
    tier: 'junior', member_since: '2025-01-20', birthday: '1984-04-02',
    preferences: 'Scotch, mid-shelf and up. Slightly peat-averse but coming around.',
    spend_band: 'mid', visit_rate: 2.2,
  },
  {
    first_name: 'Ottoline', last_name: 'Marchetti',
    email: 'o.marchetti@example.com', phone: '(630) 555-0141',
    address_line1: '505 Roosevelt Rd', city: 'Glen Ellyn', state: 'IL', postal_code: '60137',
    tier: 'junior', member_since: '2025-02-14', birthday: '1999-09-26',
    preferences: 'Aperitivo hour regular. Low ABV preferred.',
    spend_band: 'low', visit_rate: 4.3,
  },
  {
    first_name: 'Caspian', last_name: 'Whitfield',
    email: 'c.whitfield@example.com', phone: '(630) 555-0179',
    address_line1: '1122 Butterfield Rd', city: 'Downers Grove', state: 'IL', postal_code: '60515',
    tier: 'junior', member_since: '2025-03-08', birthday: '1991-12-12',
    preferences: 'Gin and tonic, but wants to be talked into something better.',
    spend_band: 'low', visit_rate: 1.6,
  },
  {
    first_name: 'Perpetua', last_name: 'Osei-Bonsu',
    email: 'p.oseibonsu@example.com', phone: '(630) 555-0192',
    address_line1: '74 W Front St', city: 'Wheaton', state: 'IL', postal_code: '60187',
    tier: 'junior', member_since: '2025-04-16', birthday: '1993-06-18',
    preferences: 'Mezcal curious after a tasting. Prefers smoky over sweet.',
    spend_band: 'mid', visit_rate: 3.5,
  },
  {
    first_name: 'Barnaby', last_name: 'Ellingham',
    email: 'b.ellingham@example.com', phone: '(630) 555-0136',
    address_line1: '288 Geneva Rd', city: 'Wheaton', state: 'IL', postal_code: '60187',
    tier: 'junior', member_since: '2025-05-02', birthday: '1987-08-04',
    preferences: 'Beer and a shot. Uncomplicated, cheerfully so.',
    spend_band: 'low', visit_rate: 4.7,
  },
  {
    first_name: 'Isolde', last_name: 'Vandenberg',
    email: 'i.vandenberg@example.com', phone: '(630) 555-0157',
    address_line1: '640 Hillside Ave', city: 'Glen Ellyn', state: 'IL', postal_code: '60137',
    tier: 'junior', member_since: '2025-06-11', birthday: '2000-02-28',
    preferences: 'Just turned into it. Loves the space more than the spirits so far.',
    spend_band: 'low', visit_rate: 2.8,
  },
  {
    first_name: 'Montgomery', last_name: 'Fairweather',
    email: 'm.fairweather@example.com', phone: '(630) 555-0168',
    address_line1: '1919 Springbrook Sq', city: 'Naperville', state: 'IL', postal_code: '60563',
    tier: 'junior', member_since: '2025-07-01', birthday: '1975-10-15',
    preferences: 'Rye whiskey. Old fashioned, no muddled fruit, please.',
    spend_band: 'mid', visit_rate: 2.0,
  },
  {
    first_name: 'Genevieve', last_name: 'Aldercott',
    email: 'g.aldercott@example.com', phone: '(630) 555-0113',
    address_line1: '17 S Prospect St', city: 'Wheaton', state: 'IL', postal_code: '60187',
    tier: 'junior', member_since: '2025-08-19', birthday: '1990-01-07',
    preferences: 'Brandy and eau-de-vie. Unusual for a junior — knows exactly what she wants.',
    spend_band: 'mid', visit_rate: 3.0,
  },
  {
    first_name: 'Sylvester', last_name: 'Achterberg',
    email: 's.achterberg@example.com', phone: '(630) 555-0184',
    address_line1: '2320 Fender Ave', city: 'Carol Stream', state: 'IL', postal_code: '60188',
    tier: 'junior', member_since: '2025-09-30', birthday: '1982-05-23',
    preferences: 'Came for a concert, stayed for the whiskey. Still finding his footing.',
    spend_band: 'low', visit_rate: 1.4,
  },
]

export const STAFF: Array<{
  first_name: string
  last_name: string
  email: string
  role: 'admin' | 'manager'
  phone: string
}> = [
  {
    first_name: 'Mike', last_name: 'Melazzo',
    email: 'mike@cgcocktails.com', role: 'admin', phone: '(630) 555-0100',
  },
  {
    first_name: 'Nadia', last_name: 'Krolikowski',
    email: 'nadia@subourbon.bar', role: 'manager', phone: '(630) 555-0101',
  },
  {
    first_name: 'Emmett', last_name: 'Sanjuro',
    email: 'emmett@subourbon.bar', role: 'manager', phone: '(630) 555-0102',
  },
]
