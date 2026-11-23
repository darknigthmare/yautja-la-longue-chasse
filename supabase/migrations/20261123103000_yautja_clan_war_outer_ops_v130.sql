-- CW130-NET-006 / CW130-NET-012 · Outer Ops campaign authority per Supabase account.
-- Additive Yautja-only storage: no other application's table, role or auth setting changes.
-- The authoritative Node service writes through yautja_war_commit_v130 with the service role.
-- Players read their own rows; they never insert, update or delete them.

create table public.yautja_war_campaigns (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null default 0 check (revision between 0 and 1000000000),
 sequence bigint not null default 0 check (sequence between 0 and 1000000000),
 previous_time bigint not null default 0 check (previous_time >= 0),
 source_sha text not null check (source_sha ~ '^[A-Za-z0-9_.:-]{1,128}$'),
 world jsonb not null check (jsonb_typeof(world) = 'object' and octet_length(world::text) <= 4194304),
 updated_at timestamptz not null default now()
);
comment on table public.yautja_war_campaigns is 'Yautja clan war campaign stocks (RAV, teams, units, reports) owned by the Outer Ops server. Read-only for the player.';

create table public.yautja_war_orders (
 user_id uuid not null references public.yautja_war_campaigns(user_id) on delete cascade,
 order_id text not null check (order_id ~ '^[A-Za-z0-9_:-]{1,64}$'),
 sequence bigint not null check (sequence between 1 and 1000000000),
 kind text not null check (kind in ('start', 'incident', 'recall')),
 accepted_at bigint not null check (accepted_at >= 0),
 primary key (user_id, order_id),
 unique (user_id, sequence)
);
comment on table public.yautja_war_orders is 'Accepted Outer Ops orders. Primary key and sequence make a repeated order impossible to apply twice.';

create table public.yautja_war_receipts (
 user_id uuid not null references public.yautja_war_campaigns(user_id) on delete cascade,
 operation_id text not null check (operation_id ~ '^[A-Za-z0-9_:-]{1,150}$'),
 body jsonb not null check (jsonb_typeof(body) = 'object' and octet_length(body::text) <= 65536),
 signature text not null check (signature ~ '^[a-f0-9]{64}$'),
 settled_at bigint not null check (settled_at >= 0),
 primary key (user_id, operation_id)
);
comment on table public.yautja_war_receipts is 'Signed Outer Ops settlements. One receipt per operation: loot cannot be settled twice.';

alter table public.yautja_war_campaigns enable row level security;
alter table public.yautja_war_orders enable row level security;
alter table public.yautja_war_receipts enable row level security;
revoke all on public.yautja_war_campaigns, public.yautja_war_orders, public.yautja_war_receipts from anon, authenticated;
grant select on public.yautja_war_campaigns, public.yautja_war_orders, public.yautja_war_receipts to authenticated;
create policy yautja_war_campaigns_select_own on public.yautja_war_campaigns for select to authenticated using ((select auth.uid()) = user_id);
create policy yautja_war_orders_select_own on public.yautja_war_orders for select to authenticated using ((select auth.uid()) = user_id);
create policy yautja_war_receipts_select_own on public.yautja_war_receipts for select to authenticated using ((select auth.uid()) = user_id);

-- One atomic step of the authority: compare the revision, store the new world and the
-- revision the server announced (several native steps may share one commit), then append
-- accepted orders and receipts. Any duplicate aborts the whole step.
create function public.yautja_war_commit_v130(
 p_user uuid, p_expected_revision bigint, p_campaign jsonb, p_orders jsonb, p_receipts jsonb
) returns bigint language plpgsql security invoker set search_path = '' as $$
declare
 v_revision bigint;
begin
 if jsonb_typeof(p_campaign) <> 'object' or jsonb_typeof(p_orders) <> 'array' or jsonb_typeof(p_receipts) <> 'array' then
  raise exception 'Invalid Outer Ops commit' using errcode = '22023';
 end if;
 if p_expected_revision < 0 or (p_campaign->>'revision')::bigint <= p_expected_revision then
  raise exception 'Invalid Outer Ops revision' using errcode = '22023';
 end if;
 if p_expected_revision = 0 and not exists (select 1 from public.yautja_war_campaigns where user_id = p_user) then
  insert into public.yautja_war_campaigns (user_id, revision, sequence, previous_time, source_sha, world)
  values (p_user, 0, 0, 0, p_campaign->>'sourceSha', p_campaign->'world');
 end if;
 update public.yautja_war_campaigns set
  revision = (p_campaign->>'revision')::bigint,
  sequence = (p_campaign->>'sequence')::bigint,
  previous_time = (p_campaign->>'previousTime')::bigint,
  source_sha = p_campaign->>'sourceSha',
  world = p_campaign->'world',
  updated_at = pg_catalog.clock_timestamp()
 where user_id = p_user and revision = p_expected_revision
 returning revision into v_revision;
 if v_revision is null then
  raise exception 'Outer Ops revision changed' using errcode = '40001';
 end if;
 insert into public.yautja_war_orders (user_id, order_id, sequence, kind, accepted_at)
 select p_user, item->>'id', (item->>'sequence')::bigint, item->>'kind', (item->>'acceptedAt')::bigint
 from jsonb_array_elements(p_orders) as item;
 insert into public.yautja_war_receipts (user_id, operation_id, body, signature, settled_at)
 select p_user, item->>'operationId', item->'body', item->>'signature', (item->>'settledAt')::bigint
 from jsonb_array_elements(p_receipts) as item;
 return v_revision;
end;
$$;
revoke all on function public.yautja_war_commit_v130(uuid, bigint, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.yautja_war_commit_v130(uuid, bigint, jsonb, jsonb, jsonb) to service_role;
comment on function public.yautja_war_commit_v130(uuid, bigint, jsonb, jsonb, jsonb) is 'Outer Ops authority commit: compare-and-set revision plus append-only orders and receipts. Service role only.';
