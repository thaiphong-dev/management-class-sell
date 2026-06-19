-- 025_allow_profiles_select_authenticated_and_add_gender.sql
-- 1. Add gender column to profiles table
alter table profiles add column if not exists gender text check (gender in ('Nam', 'Nữ'));

-- 2. Allow any authenticated user to select profiles (fixes hyphen name rendering due to RLS blocks)
drop policy if exists "profiles_select_authenticated" on profiles;
create policy "profiles_select_authenticated"
  on profiles for select
  using (auth.role() = 'authenticated');
