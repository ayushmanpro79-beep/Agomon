-- Admin PandalManager CRUD support — run once in Supabase SQL Editor
-- File: supabase/migration_admin_pandal_crud.sql:1
-- Existing schema (supabase/schema.sql) allows public select/insert/update but not delete.

drop policy if exists "Allow public delete" on pandals;
create policy "Allow public delete" on pandals for delete using (true);

grant delete on pandals to anon, authenticated;

-- verify:
-- select policyname, cmd from pg_policies where tablename = 'pandals';
-- should list select, insert, update, delete
