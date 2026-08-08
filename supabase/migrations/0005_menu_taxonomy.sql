-- The menu's shape, so a manager can reorder and rename it without a deploy.
--
-- Until now the three headings, their categories and the subcategories under
-- them lived in lib/catalog.ts. That file stays — it is the seed for this
-- table and the fallback when the table is empty — but the running menu reads
-- from here.
--
-- One self-referencing table rather than three, because the editor does the
-- same four things at every level: rename, reorder, hide, remove.

create table if not exists menu_nodes (
  id         uuid primary key default gen_random_uuid(),
  parent_id  uuid references menu_nodes(id) on delete cascade,
  level      text not null check (level in ('section', 'category', 'subcategory')),
  name       text not null,
  blurb      text,
  -- Categories carry the kind (it drives the icon, the Dealer's Choice rails
  -- and the admin form). Sections carry the kinds they claim, which is only
  -- used to place a category the tree has never heard of.
  kind       catalog_kind,
  kinds      catalog_kind[],
  sort_order integer not null default 0,
  is_hidden  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint menu_nodes_parentage check (
    (level = 'section' and parent_id is null)
    or (level <> 'section' and parent_id is not null)
  )
);

-- catalog_items.category and .subcategory are plain text, and these names are
-- what they join on, so a name has to mean one thing per level.
create unique index if not exists menu_nodes_name_idx
  on menu_nodes (level, lower(name));

create index if not exists menu_nodes_tree_idx on menu_nodes (parent_id, sort_order);

alter table menu_nodes enable row level security;

drop policy if exists menu_nodes_read on menu_nodes;
create policy menu_nodes_read on menu_nodes
  for select to authenticated using (true);

drop policy if exists menu_nodes_staff_write on menu_nodes;
create policy menu_nodes_staff_write on menu_nodes
  for all to authenticated using (is_staff()) with check (is_staff());

-- ---------------------------------------------------------------------------
-- Renaming
-- ---------------------------------------------------------------------------

-- A category is not just a label — it is the value sitting in
-- catalog_items.category on every bottle filed under it. Renaming has to move
-- both or the menu quietly empties out, so it happens in one statement pair
-- rather than two round trips from the browser.
create or replace function rename_menu_node(node uuid, new_name text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  target menu_nodes;
  trimmed text := btrim(new_name);
begin
  if not is_staff() then
    raise exception 'Only staff may rename menu entries';
  end if;
  if trimmed = '' then
    raise exception 'A menu entry needs a name';
  end if;

  select * into target from menu_nodes where id = node;
  if not found then
    raise exception 'No such menu entry';
  end if;
  if target.name = trimmed then
    return;
  end if;

  update menu_nodes set name = trimmed, updated_at = now() where id = node;

  if target.level = 'category' then
    update catalog_items set category = trimmed, updated_at = now()
     where category = target.name;
  elsif target.level = 'subcategory' then
    update catalog_items set subcategory = trimmed, updated_at = now()
     where subcategory = target.name;
  end if;
end;
$$;

grant execute on function rename_menu_node(uuid, text) to authenticated;

-- How many bottles a node is holding, so the editor can refuse to delete one
-- that is still in use rather than orphaning its items.
create or replace function menu_node_usage(node uuid)
returns integer
language sql stable security definer set search_path = public as $$
  select coalesce((
    select count(*)::integer
    from catalog_items c
    join menu_nodes n on n.id = node
    where (n.level = 'category' and c.category = n.name)
       or (n.level = 'subcategory' and c.subcategory = n.name)
       or (n.level = 'section' and c.category in (
             select child.name from menu_nodes child where child.parent_id = n.id
           ))
  ), 0);
$$;

grant execute on function menu_node_usage(uuid) to authenticated;
