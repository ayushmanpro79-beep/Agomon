-- Run in Supabase Studio > SQL Editor
-- Create public bucket for pandal images

insert into storage.buckets (id, name, public) values ('pandal-images', 'pandal-images', true)
on conflict (id) do nothing;

-- Allow public read
drop policy if exists "public read pandal images" on storage.objects;
create policy "public read pandal images" on storage.objects for select using (bucket_id = 'pandal-images');

-- Allow authenticated upload/update/delete (admin via anon key after login)
drop policy if exists "auth upload pandal images" on storage.objects;
create policy "auth upload pandal images" on storage.objects for insert to authenticated with check (bucket_id = 'pandal-images');
drop policy if exists "auth update pandal images" on storage.objects;
create policy "auth update pandal images" on storage.objects for update to authenticated using (bucket_id = 'pandal-images');
drop policy if exists "auth delete pandal images" on storage.objects;
create policy "auth delete pandal images" on storage.objects for delete to authenticated using (bucket_id = 'pandal-images');
