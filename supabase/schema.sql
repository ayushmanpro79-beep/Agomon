-- Agomon - আগমন | Supabase Schema
-- Run this in Supabase Studio -> SQL Editor
-- Location: supabase/schema.sql:1

-- 1. Extensions
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- 2. Pandals table (45 Kolkata pujas from PDF)
create table if not exists pandals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  area text not null check (area in ('North Kolkata','Dumdum','South Kolkata','West Kolkata & Behala','Central Kolkata','Salt Lake & Rajarhat')),
  address text,
  latitude double precision,
  longitude double precision,
  verified boolean default true,
  created_at timestamp with time zone default now()
);

-- 3. Indexes for fast search (Search Pandals, Areas...)
create index if not exists pandals_search_idx on pandals using gin (name gin_trgm_ops);
create index if not exists pandals_area_idx on pandals (area);
create index if not exists pandals_slug_idx on pandals (slug);

-- 4. Insert 45 pandals
insert into pandals (name, slug, area) values
-- North Kolkata - 14
('Ahiritala Sarbajanin','ahiritala-sarbajanin','North Kolkata'),
('Ahiritala Yubak Brinda','ahiritala-yubak-brinda','North Kolkata'),
('Jagat Mukherjee Park','jagat-mukherjee-park','North Kolkata'),
('Chore Bagan Sarbojanin','chore-bagan-sarbojanin','North Kolkata'),
('Chaltabagan Sarbojanin','chaltabagan-sarbojanin','North Kolkata'),
('Sikdar Bagan','sikdar-bagan','North Kolkata'),
('Tala Barowari','tala-barowari','North Kolkata'),
('Mitali Sangha Kankurgachi','mitali-sangha-kankurgachi','North Kolkata'),
('Prafulla Kanan Paschim Adhibasi Brinda','prafulla-kanan-paschim-adhibasi-brinda','North Kolkata'),
('Aswininagar Bandhu Mahal','aswininagar-bandhu-mahal','North Kolkata'),
('Hatibagan Sarbojanin','hatibagan-sarbajanin','North Kolkata'),
('Hatibagan Nabin Pally','hatibagan-nabin-pally','North Kolkata'),
('Kashi Bose Lane','kashi-bose-lane','North Kolkata'),
('Nalin Sarkar Street','nalin-sarkar-street','North Kolkata'),
-- Dumdum - 3
('Dum Dum Tarun Dal','dum-dum-tarun-dal','Dumdum'),
('Dum Dum Park Bharat Chakra','dum-dum-park-bharat-chakra','Dumdum'),
('Dum Dum Park Tarun Sangha','dum-dum-park-tarun-sangha','Dumdum'),
-- South Kolkata - 18
('Ajeya Sanghati','ajeya-sanghati','South Kolkata'),
('Vivekananda Park Atheletic Club','vivekananda-park-atheletic-club','South Kolkata'),
('41 Pally Club','41-pally-club','South Kolkata'),
('Badamtala Ashar Sangha','badamtala-ashar-sangha','South Kolkata'),
('Pratapaditya Road Trikon Park','pratapaditya-road-trikon-park','South Kolkata'),
('Alipur Sarbojanin','alipur-sarbojanin','South Kolkata'),
('Bakul Bagan Sarbojanin','bakul-bagan-sarbojanin','South Kolkata'),
('Chakraberia Sarbojanin','chakraberia-sarbojanin','South Kolkata'),
('Abasar','abasar','South Kolkata'),
('Netaji Jatiyo Seva Dal','netaji-jatiyo-seva-dal','South Kolkata'),
('Kendua Shanti Sangha','kendua-shanti-sangha','South Kolkata'),
('Purbachal Shakti Sangha','purbachal-shakti-sangha','South Kolkata'),
('Santoshpur Lake Pally','santoshpur-lake-pally','South Kolkata'),
('Santoshpur Trikon Park','santoshpur-trikon-park','South Kolkata'),
('95 Pally','95-pally','South Kolkata'),
('Hindusthan Park Sarbojanin','hindusthan-park-sarbojanin','South Kolkata'),
('Rajdanga Naba Uday Sangha','rajdanga-naba-uday-sangha','South Kolkata'),
('Bosepukur Sitala Mandir','bosepukur-sitala-mandir','South Kolkata'),
-- West Kolkata & Behala - 6
('Barisha Club','barisha-club','West Kolkata & Behala'),
('SB Park Sarbojanin','sb-park-sarbojanin','West Kolkata & Behala'),
('Behala Nutan Dal','behala-nutan-dal','West Kolkata & Behala'),
('Behala Friends','behala-friends','West Kolkata & Behala'),
('Behala Club','behala-club','West Kolkata & Behala'),
('Kidderpore 25 Pally Club','kidderpore-25-pally-club','West Kolkata & Behala'),
-- Central Kolkata - 2
('Beliaghata 33 Palli','beliaghata-33-palli','Central Kolkata'),
('Santosh Mitra Square','santosh-mitra-square','Central Kolkata'),
-- Salt Lake & Rajarhat - 2
('New Town Sarbojanin','new-town-sarbojanin','Salt Lake & Rajarhat'),
('AK Block Salt Lake','ak-block-salt-lake','Salt Lake & Rajarhat')
on conflict (slug) do nothing;

-- 5. RLS - allow public read/write for tracker (fixes anon getting 0 rows)
alter table pandals enable row level security;
drop policy if exists "Allow public read" on pandals;
create policy "Allow public read" on pandals for select using (true);
drop policy if exists "Allow public update" on pandals;
create policy "Allow public update" on pandals for update using (true) with check (true);
drop policy if exists "Allow public insert" on pandals;
create policy "Allow public insert" on pandals for insert with check (true);
grant select, insert, update on pandals to anon, authenticated;

-- 6. Verify
-- select area, count(*) from pandals group by area order by area;
-- should return: North 14, Dumdum 3, South 18, West 6, Central 2, Salt Lake 2 = 45

-- 7. Example queries for tracker (no crowd/HOP yet)
-- Search: select * from pandals where name ilike '%ahiritola%' order by name;
-- Filter by area: select * from pandals where area = 'South Kolkata' order by name;
-- OSM geocode fill (after script): update pandals set latitude=22.5726, longitude=88.3639, address='Kolkata' where slug='...';

-- 8. Optional: PostGIS for later map routing (enable when adding HOP)
-- create extension if not exists postgis;
