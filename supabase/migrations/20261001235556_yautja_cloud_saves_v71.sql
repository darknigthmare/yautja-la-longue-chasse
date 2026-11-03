-- Additive Yautja-only storage. No other game's table or auth setting changes.
create table public.yautja_cloud_saves (
 user_id uuid primary key references auth.users(id) on delete cascade deferrable initially immediate,
 revision bigint not null default 1 check (revision between 1 and 1000000000),
 snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object' and octet_length(snapshot::text) <= 20971520),
 updated_at timestamptz not null default now()
);
alter table public.yautja_cloud_saves enable row level security;
revoke all on public.yautja_cloud_saves from anon, authenticated;
grant select, insert, update on public.yautja_cloud_saves to authenticated;
create policy yautja_cloud_select_own on public.yautja_cloud_saves for select to authenticated using ((select auth.uid()) = user_id);
create policy yautja_cloud_insert_own on public.yautja_cloud_saves for insert to authenticated with check ((select auth.uid()) = user_id);
create policy yautja_cloud_update_own on public.yautja_cloud_saves for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- The client must PATCH with both user_id and the previous revision.
-- Trigger also prevents skipped revisions or a reassigned owner.
create function public.yautja_cloud_revision_v71() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if TG_OP = 'INSERT' then
  if NEW.revision <> 1 then raise exception 'First cloud revision must be one' using errcode = '23514'; end if;
 else
  if NEW.user_id <> OLD.user_id or NEW.revision <> OLD.revision + 1 then
   raise exception 'Invalid cloud revision or owner' using errcode = '23514';
  end if;
 end if;
 NEW.updated_at := pg_catalog.clock_timestamp();
 return NEW;
end;
$$;
revoke all on function public.yautja_cloud_revision_v71() from public, anon, authenticated;
create trigger yautja_cloud_revision_v71 before insert or update on public.yautja_cloud_saves for each row execute function public.yautja_cloud_revision_v71();
comment on table public.yautja_cloud_saves is 'Private complete Yautja workspace per account; optimistic revision, mobile and desktop synchronization, no access tokens in snapshot.';
