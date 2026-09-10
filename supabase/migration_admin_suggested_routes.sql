-- Migration: Admin Suggested Puja Routes
-- Adds AI/Admin flags and enforces admin-only delete for Admin Suggested routes
-- Run in Supabase Dashboard → SQL Editor

-- 1. Extend puja_routes with admin/AI flags + search metadata (idempotent)
alter table public.puja_routes add column if not exists is_ai boolean not null default false;
alter table public.puja_routes add column if not exists is_admin_suggested boolean not null default false;
alter table public.puja_routes add column if not exists admin_area text;
alter table public.puja_routes add column if not exists search_radius_km double precision;
alter table public.puja_routes add column if not exists time_deadline_min integer;

-- 2. Indexes for admin/AI filtering
create index if not exists puja_routes_ai_idx on public.puja_routes(is_ai) where is_ai = true;
create index if not exists puja_routes_admin_idx on public.puja_routes(is_admin_suggested) where is_admin_suggested = true;
create index if not exists puja_routes_admin_area_idx on public.puja_routes(admin_area);

-- 3. RLS: Ensure Admin Suggested and AI routes can only be deleted by owner when not admin/AI, and allow admin via is_admin check or service_role
-- Current owner delete: using (auth.uid() = user_id). We add guard is_ai = false and is_admin_suggested = false
do $$
begin
  -- drop old owner policy if exists
  if exists (select 1 from pg_policies where tablename='puja_routes' and policyname='owner update/delete') then
    drop policy "owner update/delete" on public.puja_routes;
  end if;
end$$;

-- Owner can update/delete only own non-AI, non-Admin routes
create policy "owner update/delete" on public.puja_routes for all to authenticated
  using ((select auth.uid()) = user_id and coalesce(is_ai,false) = false and coalesce(is_admin_suggested,false) = false)
  with check ((select auth.uid()) = user_id and coalesce(is_ai,false) = false and coalesce(is_admin_suggested,false) = false);

-- Admin can delete any admin/AI route via profiles.is_admin (optional, create column if missing)
alter table public.profiles add column if not exists is_admin boolean default false;

drop policy if exists "admin delete any" on public.puja_routes;
create policy "admin delete any" on public.puja_routes for delete to authenticated
  using (exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.is_admin = true));

drop policy if exists "admin update any" on public.puja_routes;
create policy "admin update any" on public.puja_routes for update to authenticated
  using (exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.is_admin = true))
  with check (exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.is_admin = true));

-- Grant
grant all on public.puja_routes to authenticated, service_role;
grant select on public.puja_routes to anon;

-- 4. Helper: mark existing Admin Suggested by username (if inserted before migration)
-- No data migration needed; feed detects username = 'Admin Suggested' even without is_admin_suggested flag.
-- Optional backfill:
-- update public.puja_routes set is_admin_suggested = true where username = 'Admin Suggested' and coalesce(is_admin_suggested,false)=false;

-- Verify:
-- select column_name from information_schema.columns where table_name='puja_routes';
-- select policyname, cmd from pg_policies where tablename='puja_routes';
