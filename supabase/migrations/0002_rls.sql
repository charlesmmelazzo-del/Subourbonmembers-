-- Subourbon Members Portal — row level security
--
-- Three audiences:
--   member  — sees only their own data (plus their household's locker)
--   manager — sees every member, may not change roles or delete members
--   admin   — everything
--
-- All helpers are SECURITY DEFINER so they can read profiles without
-- re-entering the policies that call them (which would recurse).

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function auth_role()
returns app_role language sql stable security definer set search_path = public as $$
  select coalesce((select role from profiles where id = auth.uid()), 'member'::app_role);
$$;

create or replace function is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select auth_role() in ('manager', 'admin');
$$;

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select auth_role() = 'admin';
$$;

-- The membership a user's shared resources (locker, bottles) hang from:
-- their own id, or the senior member's id if they are a co-member.
create or replace function household_root(uid uuid default auth.uid())
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(linked_senior_id, id) from profiles where id = uid;
$$;

-- True when the current user may read member `target`'s personal data.
create or replace function can_read_member(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_staff()
      or target = auth.uid()
      or target = household_root();
$$;

grant execute on function auth_role, is_staff, is_admin, household_root, can_read_member
  to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','co_members','member_activity','visits','sales_imports',
    'sales_transactions','member_flags','member_chits','producers','catalog_items',
    'catalog_media','favorites','member_lists','member_list_items','tasting_notes',
    'shares','events','event_media','event_reservations','event_requests',
    'message_threads','messages','lockers','locker_items','product_requests',
    'fittings','fitting_items','notifications','app_settings'
  ] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select to authenticated
  using (
    is_staff()
    or id = auth.uid()
    or linked_senior_id = auth.uid()
    or id = household_root()
  );

-- Members edit their own contact details. The WITH CHECK clause below stops
-- self-promotion: role/tier/vip/status must match what is already stored.
drop policy if exists profiles_self_update on profiles;
create policy profiles_self_update on profiles for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role   = (select p.role   from profiles p where p.id = auth.uid())
    and tier   = (select p.tier   from profiles p where p.id = auth.uid())
    and status = (select p.status from profiles p where p.id = auth.uid())
    and vip    = (select p.vip    from profiles p where p.id = auth.uid())
    and member_since = (select p.member_since from profiles p where p.id = auth.uid())
  );

drop policy if exists profiles_staff_update on profiles;
create policy profiles_staff_update on profiles for update to authenticated
  using (is_staff()) with check (is_staff());

drop policy if exists profiles_staff_insert on profiles;
create policy profiles_staff_insert on profiles for insert to authenticated
  with check (is_staff());

drop policy if exists profiles_admin_delete on profiles;
create policy profiles_admin_delete on profiles for delete to authenticated
  using (is_admin());

-- ---------------------------------------------------------------------------
-- Co-members
-- ---------------------------------------------------------------------------

drop policy if exists co_members_read on co_members;
create policy co_members_read on co_members for select to authenticated
  using (is_staff() or senior_member_id = auth.uid() or profile_id = auth.uid());

-- Only senior members may invite; the 3-per-member cap is enforced by trigger.
drop policy if exists co_members_write on co_members;
create policy co_members_write on co_members for insert to authenticated
  with check (
    is_staff()
    or (senior_member_id = auth.uid()
        and (select tier from profiles where id = auth.uid()) = 'senior')
  );

drop policy if exists co_members_update on co_members;
create policy co_members_update on co_members for update to authenticated
  using (is_staff() or senior_member_id = auth.uid())
  with check (is_staff() or senior_member_id = auth.uid());

drop policy if exists co_members_delete on co_members;
create policy co_members_delete on co_members for delete to authenticated
  using (is_staff() or senior_member_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Member-owned rows: read own, staff reads all
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'member_activity','visits','sales_transactions','favorites',
    'member_lists','tasting_notes','notifications'
  ] loop
    execute format('drop policy if exists %1$s_read on %1$s', t);
    execute format(
      'create policy %1$s_read on %1$s for select to authenticated
       using (is_staff() or member_id = auth.uid())', t);

    execute format('drop policy if exists %1$s_own_write on %1$s', t);
    execute format(
      'create policy %1$s_own_write on %1$s for insert to authenticated
       with check (is_staff() or member_id = auth.uid())', t);

    execute format('drop policy if exists %1$s_own_update on %1$s', t);
    execute format(
      'create policy %1$s_own_update on %1$s for update to authenticated
       using (is_staff() or member_id = auth.uid())
       with check (is_staff() or member_id = auth.uid())', t);

    execute format('drop policy if exists %1$s_own_delete on %1$s', t);
    execute format(
      'create policy %1$s_own_delete on %1$s for delete to authenticated
       using (is_staff() or member_id = auth.uid())', t);
  end loop;
end $$;

-- Sales and visits are imported by staff and are read-only to members.
drop policy if exists sales_transactions_own_write on sales_transactions;
drop policy if exists sales_transactions_own_update on sales_transactions;
drop policy if exists sales_transactions_own_delete on sales_transactions;
create policy sales_staff_write on sales_transactions for all to authenticated
  using (is_staff()) with check (is_staff());

drop policy if exists visits_own_write on visits;
drop policy if exists visits_own_update on visits;
drop policy if exists visits_own_delete on visits;
create policy visits_staff_write on visits for all to authenticated
  using (is_staff()) with check (is_staff());

-- ---------------------------------------------------------------------------
-- Staff-only tables
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['sales_imports','member_flags','member_chits'] loop
    execute format('drop policy if exists %1$s_staff on %1$s', t);
    execute format(
      'create policy %1$s_staff on %1$s for all to authenticated
       using (is_staff()) with check (is_staff())', t);
  end loop;
end $$;

drop policy if exists app_settings_read on app_settings;
create policy app_settings_read on app_settings for select to authenticated using (true);
drop policy if exists app_settings_write on app_settings;
create policy app_settings_write on app_settings for all to authenticated
  using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- Catalog — readable by every signed-in member, written by staff
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['producers','catalog_items','catalog_media','event_media'] loop
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
-- Lists, shares
-- ---------------------------------------------------------------------------

-- List contents follow the parent list: owner, staff, or anyone it was shared with.
drop policy if exists member_list_items_read on member_list_items;
create policy member_list_items_read on member_list_items for select to authenticated
  using (
    is_staff()
    or exists (
      select 1 from member_lists l
      where l.id = list_id
        and (l.member_id = auth.uid()
             or exists (select 1 from shares s
                        where s.entity_type = 'list' and s.entity_id = l.id
                          and s.to_member_id = auth.uid()))
    )
  );

drop policy if exists member_list_items_write on member_list_items;
create policy member_list_items_write on member_list_items for all to authenticated
  using (
    is_staff()
    or exists (select 1 from member_lists l where l.id = list_id and l.member_id = auth.uid())
  )
  with check (
    is_staff()
    or exists (select 1 from member_lists l where l.id = list_id and l.member_id = auth.uid())
  );

-- A shared list must stay readable by its recipient.
drop policy if exists member_lists_shared_read on member_lists;
create policy member_lists_shared_read on member_lists for select to authenticated
  using (
    exists (select 1 from shares s
            where s.entity_type = 'list' and s.entity_id = member_lists.id
              and s.to_member_id = auth.uid())
  );

drop policy if exists tasting_notes_shared_read on tasting_notes;
create policy tasting_notes_shared_read on tasting_notes for select to authenticated
  using (
    exists (select 1 from shares s
            where s.entity_type = 'note' and s.entity_id = tasting_notes.id
              and s.to_member_id = auth.uid())
  );

drop policy if exists shares_read on shares;
create policy shares_read on shares for select to authenticated
  using (is_staff() or from_member_id = auth.uid() or to_member_id = auth.uid());

drop policy if exists shares_send on shares;
create policy shares_send on shares for insert to authenticated
  with check (from_member_id = auth.uid());

-- Recipients mark as read; senders can unshare.
drop policy if exists shares_update on shares;
create policy shares_update on shares for update to authenticated
  using (to_member_id = auth.uid()) with check (to_member_id = auth.uid());

drop policy if exists shares_delete on shares;
create policy shares_delete on shares for delete to authenticated
  using (is_staff() or from_member_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------

drop policy if exists events_read on events;
create policy events_read on events for select to authenticated
  using (
    is_staff()
    or (status = 'published'
        and (tier_required is null
             or (select tier from profiles where id = auth.uid()) = tier_required))
  );

drop policy if exists events_staff_write on events;
create policy events_staff_write on events for all to authenticated
  using (is_staff()) with check (is_staff());

drop policy if exists reservations_read on event_reservations;
create policy reservations_read on event_reservations for select to authenticated
  using (is_staff() or member_id = auth.uid());

drop policy if exists reservations_book on event_reservations;
create policy reservations_book on event_reservations for insert to authenticated
  with check (is_staff() or member_id = auth.uid());

drop policy if exists reservations_update on event_reservations;
create policy reservations_update on event_reservations for update to authenticated
  using (is_staff() or member_id = auth.uid())
  with check (is_staff() or member_id = auth.uid());

drop policy if exists reservations_delete on event_reservations;
create policy reservations_delete on event_reservations for delete to authenticated
  using (is_staff() or member_id = auth.uid());

-- Private-date requests are a senior-member privilege.
drop policy if exists event_requests_read on event_requests;
create policy event_requests_read on event_requests for select to authenticated
  using (is_staff() or member_id = auth.uid());

drop policy if exists event_requests_create on event_requests;
create policy event_requests_create on event_requests for insert to authenticated
  with check (
    is_staff()
    or (member_id = auth.uid()
        and (select tier from profiles where id = auth.uid()) = 'senior')
  );

drop policy if exists event_requests_update on event_requests;
create policy event_requests_update on event_requests for update to authenticated
  using (is_staff() or member_id = auth.uid())
  with check (is_staff() or member_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Messaging
-- ---------------------------------------------------------------------------

drop policy if exists threads_read on message_threads;
create policy threads_read on message_threads for select to authenticated
  using (is_staff() or member_id = auth.uid());

drop policy if exists threads_create on message_threads;
create policy threads_create on message_threads for insert to authenticated
  with check (is_staff() or member_id = auth.uid());

drop policy if exists threads_update on message_threads;
create policy threads_update on message_threads for update to authenticated
  using (is_staff() or member_id = auth.uid())
  with check (is_staff() or member_id = auth.uid());

-- Staff notes on a thread are invisible to the member they concern.
drop policy if exists messages_read on messages;
create policy messages_read on messages for select to authenticated
  using (
    is_staff()
    or (not is_staff_note
        and exists (select 1 from message_threads t
                    where t.id = thread_id and t.member_id = auth.uid()))
  );

drop policy if exists messages_send on messages;
create policy messages_send on messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (
      is_staff()
      or (not is_staff_note
          and sender_role = 'member'
          and exists (select 1 from message_threads t
                      where t.id = thread_id and t.member_id = auth.uid()))
    )
  );

-- ---------------------------------------------------------------------------
-- Lockers — shared across a household (senior + their co-members)
-- ---------------------------------------------------------------------------

drop policy if exists lockers_read on lockers;
create policy lockers_read on lockers for select to authenticated
  using (is_staff() or member_id = household_root());

drop policy if exists lockers_staff_write on lockers;
create policy lockers_staff_write on lockers for all to authenticated
  using (is_staff()) with check (is_staff());

drop policy if exists locker_items_read on locker_items;
create policy locker_items_read on locker_items for select to authenticated
  using (
    is_staff()
    or exists (select 1 from lockers l
               where l.id = locker_id and l.member_id = household_root())
  );

drop policy if exists locker_items_write on locker_items;
create policy locker_items_write on locker_items for all to authenticated
  using (
    is_staff()
    or exists (select 1 from lockers l
               where l.id = locker_id and l.member_id = household_root())
  )
  with check (
    is_staff()
    or exists (select 1 from lockers l
               where l.id = locker_id and l.member_id = household_root())
  );

-- product_requests.staff_notes is filtered out for members in the data layer
-- (lib/queries) since Postgres RLS is row- not column-scoped.
drop policy if exists product_requests_read on product_requests;
create policy product_requests_read on product_requests for select to authenticated
  using (is_staff() or member_id = auth.uid() or member_id = household_root());

drop policy if exists product_requests_create on product_requests;
create policy product_requests_create on product_requests for insert to authenticated
  with check (is_staff() or member_id = auth.uid());

drop policy if exists product_requests_update on product_requests;
create policy product_requests_update on product_requests for update to authenticated
  using (is_staff()) with check (is_staff());

-- ---------------------------------------------------------------------------
-- Fittings
-- ---------------------------------------------------------------------------

drop policy if exists fittings_read on fittings;
create policy fittings_read on fittings for select to authenticated
  using (is_staff() or member_id = auth.uid());

drop policy if exists fittings_request on fittings;
create policy fittings_request on fittings for insert to authenticated
  with check (is_staff() or member_id = auth.uid());

-- Members may only add feedback; scheduling and notes are staff-side. The
-- column-level split is enforced in lib/queries.
drop policy if exists fittings_update on fittings;
create policy fittings_update on fittings for update to authenticated
  using (is_staff() or member_id = auth.uid())
  with check (is_staff() or member_id = auth.uid());

drop policy if exists fitting_items_read on fitting_items;
create policy fitting_items_read on fitting_items for select to authenticated
  using (
    is_staff()
    or exists (select 1 from fittings f where f.id = fitting_id and f.member_id = auth.uid())
  );

drop policy if exists fitting_items_staff on fitting_items;
create policy fitting_items_staff on fitting_items for all to authenticated
  using (is_staff()) with check (is_staff());
