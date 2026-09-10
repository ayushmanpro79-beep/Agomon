-- Gallery for welcome page — posters/pictures with label/details, depth carousel + lightbox
-- Run in Supabase Dashboard → SQL Editor

-- Storage bucket for gallery posters
insert into storage.buckets (id, name, public) values ('gallery-images', 'gallery-images', true)
on conflict (id) do nothing;

drop policy if exists "public read gallery images" on storage.objects;
create policy "public read gallery images" on storage.objects for select using (bucket_id = 'gallery-images');

drop policy if exists "auth upload gallery images" on storage.objects;
create policy "auth upload gallery images" on storage.objects for insert to authenticated with check (bucket_id = 'gallery-images');

drop policy if exists "auth update gallery images" on storage.objects;
create policy "auth update gallery images" on storage.objects for update to authenticated using (bucket_id = 'gallery-images');

drop policy if exists "auth delete gallery images" on storage.objects;
create policy "auth delete gallery images" on storage.objects for delete to authenticated using (bucket_id = 'gallery-images');

-- Table for gallery metadata (label/details)
create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 80),
  label text,
  details text,
  image_url text not null,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists gallery_active_order_idx on public.gallery_images(is_active, display_order, created_at desc);
create index if not exists gallery_created_at_idx on public.gallery_images(created_at desc);

alter table public.gallery_images enable row level security;

drop policy if exists "public read active gallery" on public.gallery_images;
create policy "public read active gallery" on public.gallery_images for select using (is_active = true);

drop policy if exists "authenticated manage gallery" on public.gallery_images;
create policy "authenticated manage gallery" on public.gallery_images for all to authenticated using (true) with check (true);

grant select on public.gallery_images to anon, authenticated;
grant insert, update, delete on public.gallery_images to authenticated;
