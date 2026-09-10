-- Run this in Supabase SQL Editor to add UI fields for Agomon tracker
-- File: supabase/migration_add_ui_fields.sql:1

alter table pandals add column if not exists image_url text;
alter table pandals add column if not exists avg_rating numeric(2,1) default 4.2;
alter table pandals add column if not exists rating_count int default 0;

-- optional: fill with dummy ratings for preview (you will replace image_url later)
update pandals set avg_rating = round((4.0 + random()*0.9)::numeric,1) where avg_rating is null or avg_rating = 4.2;
update pandals set rating_count = 10 + floor(random()*200)::int where rating_count = 0 or rating_count is null;

-- verify
-- select slug, avg_rating, rating_count, image_url from pandals limit 5;
