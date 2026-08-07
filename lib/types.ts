/**
 * Hand-maintained mirror of supabase/migrations. Keep in step when the schema
 * changes; `supabase gen types typescript` can replace this once the project
 * is provisioned.
 */

export type Json = string | number | boolean | null | { [k: string]: Json } | Json[]

export type AppRole = 'member' | 'manager' | 'admin'
export type MemberTier = 'senior' | 'junior' | 'comember'
export type MemberStatus = 'active' | 'paused' | 'removed'
export type CoMemberStatus = 'invited' | 'accepted' | 'removed'
export type CatalogKind = 'spirit' | 'beer' | 'wine'
export type CatalogStatus = 'active' | 'eightysixed' | 'locker_only' | 'draft' | 'archived'
export type EventKind = 'private_closure' | 'tasting' | 'concert' | 'general'
export type EventStatus = 'draft' | 'published' | 'cancelled'
export type ReservationStatus = 'confirmed' | 'waitlist' | 'cancelled'
export type RequestStatus = 'pending' | 'reviewing' | 'approved' | 'declined' | 'cancelled'
export type ThreadKind = 'general' | 'event_request' | 'locker_request' | 'fitting' | 'system'
export type ProductRequestStatus =
  | 'pending' | 'quoted' | 'ordered' | 'received' | 'added' | 'cancelled'
export type FittingStatus = 'requested' | 'scheduled' | 'completed' | 'cancelled'
export type LockerItemStatus = 'in_locker' | 'removed'
export type ShareEntity = 'list' | 'item' | 'note'

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

export type Profile = {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  role: AppRole
  tier: MemberTier
  status: MemberStatus
  member_number: string | null
  member_since: string
  renewal_date: string | null
  birthday: string | null
  vip: boolean
  avatar_url: string | null
  preferences: string | null
  linked_senior_id: string | null
  last_seen_at: string | null
  created_at: string
  updated_at: string
}

export type CoMember = {
  id: string
  senior_member_id: string
  profile_id: string | null
  invited_email: string
  invited_name: string | null
  status: CoMemberStatus
  invite_token: string | null
  invited_at: string
  accepted_at: string | null
  removed_at: string | null
}

export type MemberActivity = {
  id: number
  member_id: string
  kind: string
  entity_type: string | null
  entity_id: string | null
  metadata: Json
  created_at: string
}

export type Visit = {
  id: string
  member_id: string
  visited_on: string
  source: string
}

export type SalesImport = {
  id: string
  filename: string
  imported_by: string | null
  row_count: number
  matched_count: number
  skipped_count: number
  notes: string | null
  created_at: string
}

export type SalesTransaction = {
  id: string
  member_id: string
  import_id: string | null
  toast_check_id: string | null
  transacted_at: string
  item_name: string
  item_category: string | null
  item_id: string | null
  quantity: number
  unit_price_cents: number
  total_cents: number
}

export type MemberFlag = {
  id: string
  member_id: string
  severity: string
  note: string
  created_by: string | null
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
}

export type MemberChit = {
  id: string
  member_id: string
  kind: string
  body: string
  created_by: string | null
  created_at: string
}

export type Producer = {
  id: string
  name: string
  country: string | null
  region: string | null
  founded_year: number | null
  description: string | null
  website: string | null
  logo_url: string | null
  created_at: string
}

export type CatalogItem = {
  id: string
  kind: CatalogKind
  category: string
  subcategory: string | null
  name: string
  producer_id: string | null
  country: string | null
  region: string | null
  abv: number | null
  proof: number | null
  age_statement: string | null
  vintage: number | null
  description: string | null
  tasting_notes: string | null
  hero_image_url: string | null
  status: CatalogStatus
  specs: Record<string, Json>
  barcode: string | null
  price_cents: number | null
  eightysixed_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type CatalogMedia = {
  id: string
  item_id: string
  kind: string
  url: string
  caption: string | null
  sort_order: number
}

export type Favorite = { member_id: string; item_id: string; created_at: string }

export type MemberList = {
  id: string
  member_id: string
  name: string
  description: string | null
  cover_url: string | null
  created_at: string
  updated_at: string
}

export type MemberListItem = {
  list_id: string
  item_id: string
  sort_order: number
  added_at: string
}

export type TastingNote = {
  id: string
  member_id: string
  item_id: string
  rating: number | null
  nose: string | null
  palate: string | null
  finish: string | null
  body: string | null
  is_private: boolean
  created_at: string
  updated_at: string
}

export type Share = {
  id: string
  from_member_id: string
  to_member_id: string
  entity_type: ShareEntity
  entity_id: string
  message: string | null
  created_at: string
  read_at: string | null
}

export type EventRow = {
  id: string
  title: string
  slug: string | null
  kind: EventKind
  status: EventStatus
  starts_at: string
  ends_at: string | null
  all_day: boolean
  summary: string | null
  details: string | null
  hero_image_url: string | null
  location: string | null
  capacity: number | null
  requires_reservation: boolean
  ticket_price_cents: number | null
  tier_required: MemberTier | null
  host_member_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type EventMedia = {
  id: string
  event_id: string
  url: string
  caption: string | null
  sort_order: number
}

export type EventReservation = {
  id: string
  event_id: string
  member_id: string
  status: ReservationStatus
  seats: number
  amount_cents: number
  notes: string | null
  created_at: string
  cancelled_at: string | null
}

export type EventRequest = {
  id: string
  member_id: string
  requested_date: string
  alt_date: string | null
  occasion: string | null
  guest_count: number | null
  start_time: string | null
  end_time: string | null
  notes: string | null
  status: RequestStatus
  thread_id: string | null
  created_at: string
  resolved_at: string | null
}

export type MessageThread = {
  id: string
  member_id: string
  subject: string
  kind: ThreadKind
  related_type: string | null
  related_id: string | null
  is_open: boolean
  last_message_at: string
  unread_for_staff: boolean
  unread_for_member: boolean
  created_at: string
}

export type Message = {
  id: string
  thread_id: string
  sender_id: string | null
  sender_role: AppRole
  body: string
  is_staff_note: boolean
  created_at: string
}

export type Locker = {
  id: string
  member_id: string
  locker_number: string
  location: string | null
  is_active: boolean
  assigned_at: string
  notes: string | null
}

export type LockerItem = {
  id: string
  locker_id: string
  item_id: string | null
  custom_name: string | null
  custom_description: string | null
  status: LockerItemStatus
  fill_percent: number | null
  added_on: string
  removed_on: string | null
  notes: string | null
}

export type ProductRequest = {
  id: string
  member_id: string
  locker_id: string | null
  requested_name: string
  description: string | null
  status: ProductRequestStatus
  quoted_price_cents: number | null
  staff_notes: string | null
  item_id: string | null
  thread_id: string | null
  created_at: string
  fulfilled_at: string | null
  cancelled_at: string | null
}

export type Fitting = {
  id: string
  member_id: string
  status: FittingStatus
  occasion: string | null
  flavor_profile: string | null
  spirit_category: string | null
  availability: Array<{ date: string; windows: string[] }>
  scheduled_at: string | null
  pre_notes: string | null
  post_notes: string | null
  thread_id: string | null
  requested_at: string
  completed_at: string | null
  cancelled_at: string | null
  feedback_rating: number | null
  feedback_body: string | null
  feedback_at: string | null
}

export type FittingItem = {
  id: string
  fitting_id: string
  item_id: string | null
  label: string | null
  outcome: string | null
  notes: string | null
}

export type Notification = {
  id: string
  member_id: string
  kind: string
  title: string
  body: string | null
  link: string | null
  channel: string
  event_id: string | null
  scheduled_for: string | null
  sent_at: string | null
  read_at: string | null
  dismissed_at: string | null
  created_at: string
}

export type AppSetting = {
  key: string
  value: Json
  updated_at: string
  updated_by: string | null
}

// ---------------------------------------------------------------------------
// Database shape for the Supabase client
// ---------------------------------------------------------------------------

type Relationship = {
  foreignKeyName: string
  columns: string[]
  isOneToOne: boolean
  referencedRelation: string
  referencedColumns: string[]
}

type Table<
  Row,
  Optional extends keyof Row = never,
  Rels extends readonly Relationship[] = [],
> = {
  Row: Row
  Insert: Omit<Row, Optional> & Partial<Pick<Row, Optional & keyof Row>>
  Update: Partial<Row>
  Relationships: Rels
}

/**
 * Declares a foreign key so PostgREST embedded selects — `member:profiles(...)`
 * and friends — resolve to real types instead of SelectQueryError.
 */
type FK<Column extends string, Target extends string> = {
  foreignKeyName: `fk_${Column}_${Target}`
  columns: [Column]
  isOneToOne: false
  referencedRelation: Target
  referencedColumns: ['id']
}

/** A foreign key onto profiles.id, by far the most common. */
type MemberFK<Column extends string = 'member_id'> = FK<Column, 'profiles'>

/** Columns with defaults, so Insert doesn't demand them. */
type Generated = 'id' | 'created_at' | 'updated_at'

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, Generated | 'member_since' | 'role' | 'tier' | 'status' | 'vip'>
      co_members: Table<CoMember, 'id' | 'invited_at' | 'status' | 'invite_token'>
      member_activity: Table<MemberActivity, 'id' | 'created_at' | 'metadata'>
      visits: Table<Visit, 'id' | 'source'>
      sales_imports: Table<
        SalesImport,
        'id' | 'created_at' | 'row_count' | 'matched_count' | 'skipped_count'
      >
      sales_transactions: Table<
        SalesTransaction,
        'id' | 'quantity' | 'unit_price_cents' | 'total_cents',
        [MemberFK, FK<'item_id', 'catalog_items'>]
      >
      member_flags: Table<MemberFlag, 'id' | 'created_at' | 'severity', [MemberFK]>
      member_chits: Table<MemberChit, 'id' | 'created_at' | 'kind', [MemberFK]>
      producers: Table<Producer, 'id' | 'created_at'>
      catalog_items: Table<
        CatalogItem,
        Generated | 'kind' | 'status' | 'specs',
        [FK<'producer_id', 'producers'>]
      >
      catalog_media: Table<
        CatalogMedia,
        'id' | 'kind' | 'sort_order',
        [FK<'item_id', 'catalog_items'>]
      >
      favorites: Table<Favorite, 'created_at', [MemberFK, FK<'item_id', 'catalog_items'>]>
      member_lists: Table<MemberList, Generated, [MemberFK]>
      member_list_items: Table<
        MemberListItem,
        'sort_order' | 'added_at',
        [FK<'list_id', 'member_lists'>, FK<'item_id', 'catalog_items'>]
      >
      tasting_notes: Table<
        TastingNote,
        Generated | 'is_private',
        [MemberFK, FK<'item_id', 'catalog_items'>]
      >
      shares: Table<
        Share,
        'id' | 'created_at',
        [MemberFK<'from_member_id'>, MemberFK<'to_member_id'>]
      >
      events: Table<EventRow, Generated | 'kind' | 'status' | 'all_day' | 'requires_reservation'>
      event_media: Table<EventMedia, 'id' | 'sort_order', [FK<'event_id', 'events'>]>
      event_reservations: Table<
        EventReservation,
        'id' | 'created_at' | 'status' | 'seats' | 'amount_cents',
        [MemberFK, FK<'event_id', 'events'>]
      >
      event_requests: Table<EventRequest, 'id' | 'created_at' | 'status', [MemberFK]>
      message_threads: Table<
        MessageThread,
        | 'id' | 'created_at' | 'kind' | 'is_open' | 'last_message_at'
        | 'unread_for_staff' | 'unread_for_member',
        [MemberFK]
      >
      messages: Table<
        Message,
        'id' | 'created_at' | 'sender_role' | 'is_staff_note',
        [FK<'thread_id', 'message_threads'>, MemberFK<'sender_id'>]
      >
      lockers: Table<Locker, 'id' | 'is_active' | 'assigned_at', [MemberFK]>
      locker_items: Table<
        LockerItem,
        'id' | 'status' | 'added_on',
        [FK<'locker_id', 'lockers'>, FK<'item_id', 'catalog_items'>]
      >
      product_requests: Table<
        ProductRequest,
        'id' | 'created_at' | 'status',
        [MemberFK, FK<'locker_id', 'lockers'>, FK<'item_id', 'catalog_items'>]
      >
      fittings: Table<Fitting, 'id' | 'requested_at' | 'status' | 'availability', [MemberFK]>
      fitting_items: Table<
        FittingItem,
        'id',
        [FK<'fitting_id', 'fittings'>, FK<'item_id', 'catalog_items'>]
      >
      notifications: Table<Notification, 'id' | 'created_at' | 'channel'>
      app_settings: Table<AppSetting, 'updated_at'>
    }
    // `{ [_ in never]: never }` is the shape supabase-js expects for an empty
    // section. `Record<string, never>` fails its GenericSchema constraint and
    // silently degrades every query result to `never`.
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: {
      app_role: AppRole
      member_tier: MemberTier
      member_status: MemberStatus
    }
    CompositeTypes: { [_ in never]: never }
  }
}

// ---------------------------------------------------------------------------
// Composed shapes used across the UI
// ---------------------------------------------------------------------------

export type CatalogItemFull = CatalogItem & {
  producer: Producer | null
  media: CatalogMedia[]
}

/** What a member sees when browsing — their own state folded in. */
export type CatalogItemForMember = CatalogItemFull & {
  is_favorite: boolean
  my_note: TastingNote | null
  order_dates: string[]
}

export type MemberSummary = Profile & {
  open_flags: number
  lifetime_spend_cents: number
  last_visit: string | null
  visit_count: number
}

export function displayName(p: Pick<Profile, 'first_name' | 'last_name'>): string {
  return `${p.first_name} ${p.last_name}`.trim()
}

export function initials(p: Pick<Profile, 'first_name' | 'last_name'>): string {
  return `${p.first_name[0] ?? ''}${p.last_name[0] ?? ''}`.toUpperCase() || '—'
}

export function isStaff(role: AppRole): boolean {
  return role === 'manager' || role === 'admin'
}
