-- ShipInsure Merchant Vault — deal rooms (Rep Hub → Merchant Vault tab)
-- Project: shipinsure-calculators (oiljklutlmtztascnkpm). Same auth as the calculators.
-- Run in Supabase → SQL Editor → New query → Run. Safe to re-run (idempotent).
--
-- Security model
--   • Reps (signed-in; signups are disabled so every user is ShipInsure staff) can
--     read + edit ALL vaults (team handoff: AE → CSM). Only the owner can delete.
--   • Merchants never touch the tables directly. They go through three
--     security-definer functions that require the exact vault id:
--       vault_get           — read one vault (no listing / enumeration possible)
--       vault_merchant_save — save the action plan + their own team roster;
--                             needs the vault's edit key (carried in the share link)
--       vault_track         — append a visit / click / question event
-- ────────────────────────────────────────────────────────────────────────────

-- 1) VAULTS — one row per merchant deal room
create table if not exists public.vaults (
  id             text primary key default substr(replace(gen_random_uuid()::text,'-',''),1,12),
  rep_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  merchant       text not null default '',
  merchant_ref   text,                                   -- merchants.id (calculator folder), optional
  title          text not null default '',
  data           jsonb not null default '{}'::jsonb,     -- the whole room (see vault-core.js → MV.template)
  status         text not null default 'draft',          -- draft | shared | active | cold | won | lost | archived
  edit_token     text not null default substr(replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''),1,24),
  updated_by     text not null default 'rep',            -- 'rep' | 'merchant'
  visit_count    integer not null default 0,
  last_visit_at  timestamptz,
  last_action    text,
  last_action_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists vaults_rep_idx on public.vaults (rep_id, updated_at desc);

alter table public.vaults enable row level security;
revoke all on public.vaults from anon;
grant select, insert, update, delete on public.vaults to authenticated;

drop policy if exists vaults_team_read   on public.vaults;
drop policy if exists vaults_team_insert on public.vaults;
drop policy if exists vaults_team_update on public.vaults;
drop policy if exists vaults_owner_delete on public.vaults;
create policy vaults_team_read    on public.vaults for select to authenticated using (true);
create policy vaults_team_insert  on public.vaults for insert to authenticated with check (rep_id = auth.uid());
create policy vaults_team_update  on public.vaults for update to authenticated using (true) with check (true);
create policy vaults_owner_delete on public.vaults for delete to authenticated using (rep_id = auth.uid());

-- 2) EVENTS — append-only engagement log (visits, section views, clicks, plan checks, questions)
create table if not exists public.vault_events (
  id        bigint generated always as identity primary key,
  vault_id  text not null references public.vaults(id) on delete cascade,
  kind      text not null,
  detail    jsonb not null default '{}'::jsonb,
  visitor   text,                                        -- anonymous per-browser id
  who       text,                                        -- name/email if the merchant gave one
  at        timestamptz not null default now()
);
create index if not exists vault_events_vault_idx on public.vault_events (vault_id, at desc);

alter table public.vault_events enable row level security;
revoke all on public.vault_events from anon;
grant select, delete on public.vault_events to authenticated;
drop policy if exists vault_events_team_read on public.vault_events;
drop policy if exists vault_events_team_delete on public.vault_events;
create policy vault_events_team_read   on public.vault_events for select to authenticated using (true);
create policy vault_events_team_delete on public.vault_events for delete to authenticated using (true);

-- 3) MERCHANT READ — one vault by exact id. Returns editable=true when the key matches.
create or replace function public.vault_get(p_id text, p_key text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r public.vaults;
begin
  select * into r from public.vaults where id = p_id and status <> 'archived';
  if not found then return null; end if;
  return jsonb_build_object(
    'id', r.id, 'merchant', r.merchant, 'title', r.title, 'data', r.data,
    'status', r.status, 'updated_at', r.updated_at,
    'editable', (p_key is not null and p_key = r.edit_token)
  );
end;
$$;
revoke all on function public.vault_get(text,text) from public;
grant execute on function public.vault_get(text,text) to anon, authenticated;

-- 4) MERCHANT SAVE-BACK — key-gated. Only the action plan and the merchant's own
--    team column can change; branding, decks, links and the ShipInsure team cannot.
create or replace function public.vault_merchant_save(p_id text, p_key text, p_patch jsonb, p_action text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare d jsonb;
begin
  if length(coalesce(p_patch::text,'')) > 200000 then raise exception 'patch too large'; end if;
  select data into d from public.vaults where id = p_id and edit_token = p_key for update;
  if not found then raise exception 'invalid id or key'; end if;
  if p_patch ? 'plan' then
    d := jsonb_set(d, '{plan}', p_patch->'plan', true);
  end if;
  if p_patch ? 'teamMerchant' then
    d := jsonb_set(d, '{team}', coalesce(d->'team','{}'::jsonb) || jsonb_build_object('merchant', p_patch->'teamMerchant'), true);
  end if;
  update public.vaults
     set data = d, updated_by = 'merchant', updated_at = now(),
         last_action = coalesce(left(p_action, 200), last_action),
         last_action_at = case when p_action is null then last_action_at else now() end,
         status = case when status in ('draft','shared','cold') then 'active' else status end
   where id = p_id;
end;
$$;
revoke all on function public.vault_merchant_save(text,text,jsonb,text) from public;
grant execute on function public.vault_merchant_save(text,text,jsonb,text) to anon, authenticated;

-- 5) TRACKING — append an event; 'visit' bumps the counters.
create or replace function public.vault_track(p_id text, p_kind text, p_detail jsonb default '{}'::jsonb, p_visitor text default null, p_who text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.vaults where id = p_id) then return; end if;
  if length(coalesce(p_detail::text,'')) > 4000 then p_detail := '{}'::jsonb; end if;
  insert into public.vault_events (vault_id, kind, detail, visitor, who)
  values (p_id, left(p_kind, 40), coalesce(p_detail,'{}'::jsonb), left(p_visitor, 64), left(p_who, 200));
  if p_kind = 'visit' then
    update public.vaults
       set visit_count = visit_count + 1, last_visit_at = now(),
           status = case when status in ('draft','shared','cold') then 'active' else status end
     where id = p_id;
  elsif p_kind in ('question','click','download','open') then
    update public.vaults set last_action = left(p_kind || coalesce(': ' || (p_detail->>'label'), ''), 200), last_action_at = now()
     where id = p_id;
  end if;
end;
$$;
revoke all on function public.vault_track(text,text,jsonb,text,text) from public;
grant execute on function public.vault_track(text,text,jsonb,text,text) to anon, authenticated;

-- 6) FILE STORAGE — decks, mockups, photos. Public read, rep upload. 50 MB per file.
insert into storage.buckets (id, name, public, file_size_limit)
values ('vault-files', 'vault-files', true, 52428800)
on conflict (id) do update set public = true, file_size_limit = 52428800;

drop policy if exists vault_files_public_read on storage.objects;
drop policy if exists vault_files_rep_insert on storage.objects;
drop policy if exists vault_files_rep_update on storage.objects;
drop policy if exists vault_files_rep_delete on storage.objects;
create policy vault_files_public_read on storage.objects for select to anon, authenticated using (bucket_id = 'vault-files');
create policy vault_files_rep_insert  on storage.objects for insert to authenticated with check (bucket_id = 'vault-files');
create policy vault_files_rep_update  on storage.objects for update to authenticated using (bucket_id = 'vault-files');
create policy vault_files_rep_delete  on storage.objects for delete to authenticated using (bucket_id = 'vault-files');
