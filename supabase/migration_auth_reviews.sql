-- Run in Supabase Studio > SQL Editor
-- Basic email login (username + Gmail verified via Supabase email confirmation) + review per pandal

-- 1. profiles table (username unique, email verified by Supabase Auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  email text unique not null,
  created_at timestamptz default now()
);

-- 2. reviews table (one per user per pandal)
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  pandal_id uuid not null references public.pandals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  rating int not null check (rating between 1 and 5),
  comment text not null,
  created_at timestamptz default now()
);
create index if not exists reviews_pandal_idx on public.reviews(pandal_id);
create index if not exists reviews_user_idx on public.reviews(user_id);

-- 3. Enable RLS
alter table public.profiles enable row level security;
alter table public.reviews enable row level security;

-- 4. Policies - profiles: public read, users manage own
drop policy if exists "public read profiles" on public.profiles;
create policy "public read profiles" on public.profiles for select using (true);
drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile" on public.profiles for insert with check ((select auth.uid()) = id);
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- 5. Policies - reviews: public read, authenticated insert own, update/delete own
drop policy if exists "public read reviews" on public.reviews;
create policy "public read reviews" on public.reviews for select using (true);
drop policy if exists "auth insert review" on public.reviews;
create policy "auth insert review" on public.reviews for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "auth update own review" on public.reviews;
create policy "auth update own review" on public.reviews for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "auth delete own review" on public.reviews;
create policy "auth delete own review" on public.reviews for delete to authenticated using ((select auth.uid()) = user_id);

-- 6. Grants
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;

-- 7. Trigger to auto-create profile on signup (username from user_metadata)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
