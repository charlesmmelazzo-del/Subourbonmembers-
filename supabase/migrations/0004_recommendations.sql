-- Recommendations — what to pour next.
--
-- Three sources feed the same idea, deliberately kept separate so the bar can
-- always overrule the maths:
--
--   item_recommendations — hand-curated pairings hung off a single bottle
--   staff_picks          — the week's picks, rotated by a manager
--   dealers_choice()     — collaborative filtering over everyone's favorites
--
-- The collaborative half has to run SECURITY DEFINER. A member may only read
-- their own favorites (see 0002_rls.sql), and the whole point of these
-- functions is to learn from everybody's without ever handing back who
-- favorited what.

-- ---------------------------------------------------------------------------
-- Curated tables
-- ---------------------------------------------------------------------------

create table if not exists item_recommendations (
  item_id             uuid not null,
  recommended_item_id uuid not null,
  note                text,
  sort_order          integer not null default 0,
  created_by          uuid references profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  constraint item_recommendations_pkey primary key (item_id, recommended_item_id),
  constraint item_recommendations_item_fk
    foreign key (item_id) references catalog_items(id) on delete cascade,
  constraint item_recommendations_recommended_fk
    foreign key (recommended_item_id) references catalog_items(id) on delete cascade,
  -- A bottle recommending itself is always a mistake, never a preference.
  constraint item_recommendations_not_self check (item_id <> recommended_item_id)
);

create index if not exists item_recommendations_item_idx
  on item_recommendations (item_id, sort_order);

-- One row per pick per week. `week_of` is the Monday the pick runs from, so
-- rotating the board is a matter of writing next Monday's rows — last week's
-- stay put as a record of what was poured.
create table if not exists staff_picks (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references catalog_items(id) on delete cascade,
  week_of    date not null,
  blurb      text,
  sort_order integer not null default 0,
  picked_by  uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint staff_picks_once_per_week unique (week_of, item_id)
);

create index if not exists staff_picks_week_idx on staff_picks (week_of, sort_order);

-- ---------------------------------------------------------------------------
-- RLS — read by every member, written by staff
-- ---------------------------------------------------------------------------

alter table item_recommendations enable row level security;
alter table staff_picks enable row level security;

do $$
declare t text;
begin
  foreach t in array array['item_recommendations', 'staff_picks'] loop
    execute format('drop policy if exists %1$s_read on %1$s', t);
    execute format(
      'create policy %1$s_read on %1$s for select to authenticated using (true)', t);
    execute format('drop policy if exists %1$s_staff_write on %1$s', t);
    execute format(
      'create policy %1$s_staff_write on %1$s for all to authenticated
       using (is_staff()) with check (is_staff())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- The Monday a date belongs to. Postgres weeks start on Monday, which is also
-- when the bar's week turns over.
create or replace function week_of(d date default current_date)
returns date language sql immutable as $$
  select (date_trunc('week', d::timestamp))::date;
$$;

-- ---------------------------------------------------------------------------
-- Dealer's Choice
-- ---------------------------------------------------------------------------

-- Up to `per_kind` suggestions for each of cocktail / spirit / beer / wine,
-- for whoever is asking. Always scoped to auth.uid(): there is no parameter to
-- point this at somebody else's palate.
--
-- The shape of a match: someone else favorited a bottle you favorited, and
-- also favorited this other thing in the same category. Items you have never
-- had — never favorited, never noted, never ordered — outrank ones you have.
create or replace function dealers_choice(per_kind integer default 3)
returns table (
  item_id      uuid,
  kind         catalog_kind,
  score        numeric,
  untried      boolean,
  seed_item_id uuid,
  basis        text
)
language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as id),
  mine as (
    select f.item_id, c.category
    from favorites f
      join catalog_items c on c.id = f.item_id
    where f.member_id = (select id from me)
  ),
  tried as (
    select item_id from favorites where member_id = (select id from me)
    union
    select item_id from tasting_notes where member_id = (select id from me)
    union
    select item_id from sales_transactions
      where member_id = (select id from me) and item_id is not null
  ),
  -- Members who share one of your favorites, and what else they like in the
  -- category that favorite belongs to.
  links as (
    select
      mine.item_id      as seed_id,
      peer_fav.item_id  as cand_id,
      count(*)::numeric as weight
    from mine
      join favorites shared
        on shared.item_id = mine.item_id
       and shared.member_id <> (select id from me)
      join favorites peer_fav
        on peer_fav.member_id = shared.member_id
       and peer_fav.item_id <> mine.item_id
      join catalog_items c on c.id = peer_fav.item_id
    where c.status = 'active'
      and c.category = mine.category
    group by mine.item_id, peer_fav.item_id
  ),
  from_peers as (
    select
      l.cand_id                                        as item_id,
      sum(l.weight)                                    as score,
      (array_agg(l.seed_id order by l.weight desc))[1] as seed_item_id,
      'peers'::text                                    as basis
    from links l
    where l.cand_id not in (select item_id from mine)
    group by l.cand_id
  ),
  -- A member with no favorites yet has nothing to match on. Fall back to what
  -- the room as a whole favors so the button is never a dead end.
  from_room as (
    select
      f.item_id,
      count(*)::numeric as score,
      null::uuid        as seed_item_id,
      'popular'::text   as basis
    from favorites f
      join catalog_items c on c.id = f.item_id
    where c.status = 'active'
      and f.item_id not in (select item_id from mine)
    group by f.item_id
  ),
  merged as (
    select distinct on (item_id) item_id, score, seed_item_id, basis
    from (select * from from_peers union all select * from from_room) u
    order by item_id, (basis = 'peers') desc, score desc
  ),
  -- `untried` is resolved here rather than inline in the window's ORDER BY,
  -- which keeps a sublink out of the window definition entirely.
  scored as (
    select
      m.item_id,
      c.kind,
      c.name,
      m.score,
      m.seed_item_id,
      m.basis,
      (m.item_id not in (select item_id from tried)) as untried
    from merged m
      join catalog_items c on c.id = m.item_id
    where c.status = 'active'
  ),
  ranked as (
    select
      s.*,
      row_number() over (
        partition by s.kind
        order by s.untried desc, (s.basis = 'peers') desc, s.score desc, s.name
      ) as rn
    from scored s
  )
  select item_id, kind, score, untried, seed_item_id, basis
  from ranked
  where rn <= greatest(per_kind, 1)
  order by kind, rn;
$$;

-- ---------------------------------------------------------------------------
-- "If you like this one"
-- ---------------------------------------------------------------------------

-- What to reach for after `target`. Staff pairings come first and always win;
-- the rest is co-favoriting inside the same category, with a nudge toward the
-- same subcategory. Returns ids and reasons only — never who favorited what.
create or replace function recommended_with(target uuid, want integer default 8)
returns table (item_id uuid, source text, note text, score numeric)
language sql stable security definer set search_path = public as $$
  with base as (
    select category, subcategory from catalog_items where id = target
  ),
  curated as (
    select
      r.recommended_item_id      as item_id,
      'staff'::text              as source,
      r.note,
      (1000 - r.sort_order)::numeric as score
    from item_recommendations r
      join catalog_items c on c.id = r.recommended_item_id
    where r.item_id = target
      and c.status = 'active'
  ),
  co_favorited as (
    select
      alongside.item_id,
      'favorites'::text as source,
      null::text        as note,
      count(*)::numeric
        + case when c.subcategory is not distinct from b.subcategory then 0.5 else 0 end
        as score
    from favorites liked
      join favorites alongside
        on alongside.member_id = liked.member_id
       and alongside.item_id <> target
      join catalog_items c on c.id = alongside.item_id
      cross join base b
    where liked.item_id = target
      and c.status = 'active'
      and c.category = b.category
    group by alongside.item_id, c.subcategory, b.subcategory
  ),
  merged as (
    select distinct on (item_id) item_id, source, note, score
    from (select * from curated union all select * from co_favorited) u
    order by item_id, score desc
  )
  select item_id, source, note, score
  from merged
  order by score desc, item_id
  limit greatest(want, 1);
$$;

grant execute on function week_of(date) to authenticated;
grant execute on function dealers_choice(integer) to authenticated;
grant execute on function recommended_with(uuid, integer) to authenticated;
