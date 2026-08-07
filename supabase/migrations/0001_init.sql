-- Subourbon Members Portal — core schema
-- Run against a fresh Supabase project. Idempotent enough to re-run in dev.

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type app_role as enum ('member', 'manager', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type member_tier as enum ('senior', 'junior', 'comember');
exception when duplicate_object then null; end $$;

do $$ begin
  create type member_status as enum ('active', 'paused', 'removed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type comember_status as enum ('invited', 'accepted', 'removed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type catalog_kind as enum ('spirit', 'beer', 'wine');
exception when duplicate_object then null; end $$;

-- 'eightysixed' = no longer stocked. Hidden from browse/search, still visible
-- in member history and in the dedicated 86 list.
-- 'locker_only' = only ever ordered for a member's locker, never on the backbar.
do $$ begin
  create type catalog_status as enum ('active', 'eightysixed', 'locker_only', 'draft', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type event_kind as enum ('private_closure', 'tasting', 'concert', 'general');
exception when duplicate_object then null; end $$;

do $$ begin
  create type event_status as enum ('draft', 'published', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type reservation_status as enum ('confirmed', 'waitlist', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type request_status as enum ('pending', 'reviewing', 'approved', 'declined', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type thread_kind as enum ('general', 'event_request', 'locker_request', 'fitting', 'system');
exception when duplicate_object then null; end $$;

do $$ begin
  create type product_request_status as enum
    ('pending', 'quoted', 'ordered', 'received', 'added', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fitting_status as enum ('requested', 'scheduled', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type locker_item_status as enum ('in_locker', 'removed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type share_entity as enum ('list', 'item', 'note');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table if not exists profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text not null unique,
  first_name     text not null default '',
  last_name      text not null default '',
  phone          text,
  address_line1  text,
  address_line2  text,
  city           text,
  state          text,
  postal_code    text,
  role           app_role      not null default 'member',
  tier           member_tier   not null default 'junior',
  status         member_status not null default 'active',
  member_number  text unique,
  member_since   date          not null default current_date,
  renewal_date   date,
  birthday       date,
  vip            boolean       not null default false,
  avatar_url     text,
  -- Free-text preferences the member maintains themselves.
  preferences    text,
  -- Co-members point at the senior member whose membership they sit under.
  linked_senior_id uuid references profiles(id) on delete set null,
  last_seen_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists profiles_name_trgm
  on profiles using gin ((first_name || ' ' || last_name) gin_trgm_ops);
create index if not exists profiles_tier_idx on profiles (tier) where status = 'active';
create index if not exists profiles_senior_idx on profiles (linked_senior_id);

-- Co-member invitations. A senior member may hold at most three.
create table if not exists co_members (
  id               uuid primary key default gen_random_uuid(),
  senior_member_id uuid not null references profiles(id) on delete cascade,
  profile_id       uuid references profiles(id) on delete set null,
  invited_email    text not null,
  invited_name     text,
  status           comember_status not null default 'invited',
  invite_token     text unique default encode(gen_random_bytes(24), 'hex'),
  invited_at       timestamptz not null default now(),
  accepted_at      timestamptz,
  removed_at       timestamptz
);

create index if not exists co_members_senior_idx on co_members (senior_member_id)
  where status <> 'removed';

create or replace function enforce_comember_limit()
returns trigger language plpgsql as $$
begin
  if (select count(*) from co_members
      where senior_member_id = new.senior_member_id
        and status <> 'removed'
        and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)) >= 3 then
    raise exception 'A senior member may have at most 3 co-members';
  end if;
  return new;
end $$;

drop trigger if exists co_members_limit on co_members;
create trigger co_members_limit
  before insert or update on co_members
  for each row when (new.status <> 'removed')
  execute function enforce_comember_limit();

-- ---------------------------------------------------------------------------
-- Engagement, sales, staff notes
-- ---------------------------------------------------------------------------

-- Lightweight event stream powering the admin "how are they using the app" view.
create table if not exists member_activity (
  id          bigserial primary key,
  member_id   uuid not null references profiles(id) on delete cascade,
  kind        text not null,           -- 'view_spirit' | 'favorite' | 'open_calendar' | ...
  entity_type text,
  entity_id   uuid,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists member_activity_member_idx
  on member_activity (member_id, created_at desc);

create table if not exists visits (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references profiles(id) on delete cascade,
  visited_on date not null,
  source     text not null default 'toast',
  unique (member_id, visited_on)
);

create index if not exists visits_member_idx on visits (member_id, visited_on desc);

create table if not exists sales_imports (
  id            uuid primary key default gen_random_uuid(),
  filename      text not null,
  imported_by   uuid references profiles(id) on delete set null,
  row_count     integer not null default 0,
  matched_count integer not null default 0,
  skipped_count integer not null default 0,
  notes         text,
  created_at    timestamptz not null default now()
);

-- One row per line item on a Toast check.
create table if not exists sales_transactions (
  id             uuid primary key default gen_random_uuid(),
  member_id      uuid not null references profiles(id) on delete cascade,
  import_id      uuid references sales_imports(id) on delete set null,
  toast_check_id text,
  transacted_at  timestamptz not null,
  item_name      text not null,
  item_category  text,
  -- Resolved against the catalog when the item name matches a known bottle.
  item_id        uuid,
  quantity       numeric(10,2) not null default 1,
  unit_price_cents integer not null default 0,
  total_cents    integer not null default 0
);

create index if not exists sales_member_idx on sales_transactions (member_id, transacted_at desc);
create index if not exists sales_item_idx on sales_transactions (item_id, member_id);
create unique index if not exists sales_dedupe_idx
  on sales_transactions (member_id, toast_check_id, item_name, transacted_at)
  where toast_check_id is not null;

create table if not exists member_flags (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references profiles(id) on delete cascade,
  severity    text not null default 'info',   -- info | attention | urgent
  note        text not null,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles(id) on delete set null
);

create index if not exists member_flags_open_idx on member_flags (member_id)
  where resolved_at is null;

-- Staff-authored chits: preferences, locker status, bottle purchases, notes.
create table if not exists member_chits (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references profiles(id) on delete cascade,
  kind       text not null default 'note',   -- preference | locker | bottle | note
  body       text not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists member_chits_member_idx on member_chits (member_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Catalog: spirits, beer, wine
-- ---------------------------------------------------------------------------

create table if not exists producers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  country      text,
  region       text,
  founded_year integer,
  description  text,
  website      text,
  logo_url     text,
  created_at   timestamptz not null default now()
);

create unique index if not exists producers_name_idx on producers (lower(name));

create table if not exists catalog_items (
  id            uuid primary key default gen_random_uuid(),
  kind          catalog_kind   not null default 'spirit',
  category      text not null,             -- 'Rum' | 'Whiskey' | 'Gin' | ...
  subcategory   text,                      -- 'Jamaican' | 'Bourbon' | ...
  name          text not null,
  producer_id   uuid references producers(id) on delete set null,
  country       text,
  region        text,
  abv           numeric(5,2),
  proof         numeric(6,2),
  age_statement text,
  vintage       integer,
  description   text,
  tasting_notes text,                      -- the house's notes, not a member's
  hero_image_url text,
  status        catalog_status not null default 'active',
  -- Category-specific technical detail. Shape varies by category; the UI
  -- renders whichever keys are present using SPEC_FIELDS in lib/catalog.ts.
  -- e.g. { mash_bill, still_type, fermentation, distillation_proof,
  --        barrel_types, aging_length, agave_type, cooking_method, ... }
  specs         jsonb not null default '{}'::jsonb,
  barcode       text,
  price_cents   integer,
  eightysixed_at timestamptz,
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists catalog_search_trgm on catalog_items using gin (name gin_trgm_ops);
create index if not exists catalog_browse_idx on catalog_items (kind, category, subcategory)
  where status = 'active';
create index if not exists catalog_status_idx on catalog_items (status);

alter table sales_transactions
  drop constraint if exists sales_transactions_item_id_fkey;
alter table sales_transactions
  add constraint sales_transactions_item_id_fkey
  foreign key (item_id) references catalog_items(id) on delete set null;

create table if not exists catalog_media (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references catalog_items(id) on delete cascade,
  kind       text not null default 'image',  -- image | youtube
  url        text not null,
  caption    text,
  sort_order integer not null default 0
);

create index if not exists catalog_media_item_idx on catalog_media (item_id, sort_order);

-- ---------------------------------------------------------------------------
-- Member ↔ catalog
-- ---------------------------------------------------------------------------

create table if not exists favorites (
  member_id  uuid not null references profiles(id) on delete cascade,
  item_id    uuid not null references catalog_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, item_id)
);

create table if not exists member_lists (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references profiles(id) on delete cascade,
  name        text not null,
  description text,
  cover_url   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists member_lists_member_idx on member_lists (member_id, updated_at desc);

create table if not exists member_list_items (
  list_id    uuid not null references member_lists(id) on delete cascade,
  item_id    uuid not null references catalog_items(id) on delete cascade,
  sort_order integer not null default 0,
  added_at   timestamptz not null default now(),
  primary key (list_id, item_id)
);

create table if not exists tasting_notes (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references profiles(id) on delete cascade,
  item_id    uuid not null references catalog_items(id) on delete cascade,
  rating     smallint check (rating between 1 and 5),
  nose       text,
  palate     text,
  finish     text,
  body       text,
  is_private boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, item_id)
);

create index if not exists tasting_notes_member_idx on tasting_notes (member_id, updated_at desc);

create table if not exists shares (
  id             uuid primary key default gen_random_uuid(),
  from_member_id uuid not null references profiles(id) on delete cascade,
  to_member_id   uuid not null references profiles(id) on delete cascade,
  entity_type    share_entity not null,
  entity_id      uuid not null,
  message        text,
  created_at     timestamptz not null default now(),
  read_at        timestamptz
);

create index if not exists shares_recipient_idx on shares (to_member_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------

create table if not exists events (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  slug               text unique,
  kind               event_kind not null default 'general',
  status             event_status not null default 'published',
  starts_at          timestamptz not null,
  ends_at            timestamptz,
  all_day            boolean not null default false,
  summary            text,
  details            text,
  hero_image_url     text,
  location           text,
  capacity           integer,
  requires_reservation boolean not null default false,
  ticket_price_cents integer,
  -- 'senior' restricts visibility/booking to senior members; null = all members.
  tier_required      member_tier,
  -- Set when the space is closed for a member's private booking.
  host_member_id     uuid references profiles(id) on delete set null,
  created_by         uuid references profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists events_range_idx on events (starts_at) where status = 'published';

create table if not exists event_media (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events(id) on delete cascade,
  url        text not null,
  caption    text,
  sort_order integer not null default 0
);

create table if not exists event_reservations (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  member_id    uuid not null references profiles(id) on delete cascade,
  status       reservation_status not null default 'confirmed',
  seats        integer not null default 1 check (seats > 0),
  amount_cents integer not null default 0,
  notes        text,
  created_at   timestamptz not null default now(),
  cancelled_at timestamptz,
  unique (event_id, member_id)
);

create index if not exists reservations_event_idx on event_reservations (event_id)
  where status = 'confirmed';

create table if not exists event_requests (
  id             uuid primary key default gen_random_uuid(),
  member_id      uuid not null references profiles(id) on delete cascade,
  requested_date date not null,
  alt_date       date,
  occasion       text,
  guest_count    integer,
  start_time     time,
  end_time       time,
  notes          text,
  status         request_status not null default 'pending',
  thread_id      uuid,
  created_at     timestamptz not null default now(),
  resolved_at    timestamptz
);

create index if not exists event_requests_open_idx on event_requests (status, requested_date);

-- ---------------------------------------------------------------------------
-- Message center
-- ---------------------------------------------------------------------------

create table if not exists message_threads (
  id                uuid primary key default gen_random_uuid(),
  member_id         uuid not null references profiles(id) on delete cascade,
  subject           text not null,
  kind              thread_kind not null default 'general',
  related_type      text,
  related_id        uuid,
  is_open           boolean not null default true,
  last_message_at   timestamptz not null default now(),
  unread_for_staff  boolean not null default false,
  unread_for_member boolean not null default false,
  created_at        timestamptz not null default now()
);

create index if not exists threads_member_idx on message_threads (member_id, last_message_at desc);
create index if not exists threads_staff_inbox_idx on message_threads (last_message_at desc)
  where is_open;

create table if not exists messages (
  id           uuid primary key default gen_random_uuid(),
  thread_id    uuid not null references message_threads(id) on delete cascade,
  sender_id    uuid references profiles(id) on delete set null,
  sender_role  app_role not null default 'member',
  body         text not null,
  -- Staff-only note on the thread. Never returned to member-role clients.
  is_staff_note boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists messages_thread_idx on messages (thread_id, created_at);

alter table event_requests
  drop constraint if exists event_requests_thread_id_fkey;
alter table event_requests
  add constraint event_requests_thread_id_fkey
  foreign key (thread_id) references message_threads(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Lockers
-- ---------------------------------------------------------------------------

create table if not exists lockers (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references profiles(id) on delete cascade,
  locker_number text not null unique,
  location      text,
  is_active     boolean not null default true,
  assigned_at   date not null default current_date,
  notes         text
);

create index if not exists lockers_member_idx on lockers (member_id);

create table if not exists locker_items (
  id                 uuid primary key default gen_random_uuid(),
  locker_id          uuid not null references lockers(id) on delete cascade,
  -- Either a catalog bottle...
  item_id            uuid references catalog_items(id) on delete set null,
  -- ...or a member-entered one-off.
  custom_name        text,
  custom_description text,
  status             locker_item_status not null default 'in_locker',
  fill_percent       smallint check (fill_percent between 0 and 100),
  added_on           date not null default current_date,
  removed_on         date,
  notes              text,
  constraint locker_item_identified check (item_id is not null or custom_name is not null)
);

create index if not exists locker_items_locker_idx on locker_items (locker_id, status);

create table if not exists product_requests (
  id                 uuid primary key default gen_random_uuid(),
  member_id          uuid not null references profiles(id) on delete cascade,
  locker_id          uuid references lockers(id) on delete set null,
  requested_name     text not null,
  description        text,
  status             product_request_status not null default 'pending',
  quoted_price_cents integer,
  -- Visible to staff only.
  staff_notes        text,
  item_id            uuid references catalog_items(id) on delete set null,
  thread_id          uuid references message_threads(id) on delete set null,
  created_at         timestamptz not null default now(),
  fulfilled_at       timestamptz,
  cancelled_at       timestamptz
);

create index if not exists product_requests_member_idx on product_requests (member_id, created_at desc);
create index if not exists product_requests_open_idx on product_requests (status, created_at desc)
  where status not in ('added', 'cancelled');

-- ---------------------------------------------------------------------------
-- Fittings
-- ---------------------------------------------------------------------------

create table if not exists fittings (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid not null references profiles(id) on delete cascade,
  status          fitting_status not null default 'requested',
  occasion        text,
  flavor_profile  text,
  spirit_category text,
  -- [{ date: '2026-08-14', windows: ['evening'] }, ...]
  availability    jsonb not null default '[]'::jsonb,
  scheduled_at    timestamptz,
  pre_notes       text,
  post_notes      text,
  thread_id       uuid references message_threads(id) on delete set null,
  requested_at    timestamptz not null default now(),
  completed_at    timestamptz,
  cancelled_at    timestamptz,
  feedback_rating smallint check (feedback_rating between 1 and 5),
  feedback_body   text,
  feedback_at     timestamptz
);

create index if not exists fittings_member_idx on fittings (member_id, requested_at desc);
create index if not exists fittings_board_idx on fittings (status, scheduled_at);

-- Bottles selected during a fitting, so the outcome is auditable later.
create table if not exists fitting_items (
  id         uuid primary key default gen_random_uuid(),
  fitting_id uuid not null references fittings(id) on delete cascade,
  item_id    uuid references catalog_items(id) on delete set null,
  label      text,
  outcome    text,          -- liked | passed | ordered
  notes      text
);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

create table if not exists notifications (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references profiles(id) on delete cascade,
  kind          text not null,          -- event_week | event_day_of | fitting | request | share
  title         text not null,
  body          text,
  link          text,
  channel       text not null default 'in_app',  -- in_app | email | sms
  event_id      uuid references events(id) on delete cascade,
  scheduled_for timestamptz,
  sent_at       timestamptz,
  read_at       timestamptz,
  dismissed_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists notifications_inbox_idx on notifications (member_id, created_at desc)
  where read_at is null;
create index if not exists notifications_outbox_idx on notifications (scheduled_for)
  where sent_at is null;

create table if not exists app_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'catalog_items', 'member_lists', 'tasting_notes', 'events'
  ] loop
    execute format('drop trigger if exists touch_%1$s on %1$s', t);
    execute format(
      'create trigger touch_%1$s before update on %1$s
       for each row execute function touch_updated_at()', t);
  end loop;
end $$;

-- Keep thread.last_message_at and the unread flags in step with inserts.
create or replace function bump_thread()
returns trigger language plpgsql as $$
begin
  update message_threads
     set last_message_at   = new.created_at,
         unread_for_staff  = case when new.sender_role = 'member' then true
                                  else unread_for_staff end,
         unread_for_member = case when new.sender_role <> 'member' and not new.is_staff_note
                                  then true else unread_for_member end
   where id = new.thread_id;
  return new;
end $$;

drop trigger if exists messages_bump_thread on messages;
create trigger messages_bump_thread
  after insert on messages
  for each row execute function bump_thread();

-- New auth user → profile row. Metadata is set by the invite/signup flow.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, first_name, last_name, tier)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce((new.raw_user_meta_data->>'tier')::member_tier, 'junior')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
