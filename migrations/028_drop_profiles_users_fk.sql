-- 028_drop_profiles_users_fk.sql
-- Drop foreign key constraint from profiles to auth.users to allow child profiles without auth.users records.

alter table public.profiles drop constraint if exists profiles_id_fkey;

-- Add a trigger to handle delete cascade from auth.users to profiles manually
create or replace function handle_delete_user()
returns trigger as $$
begin
  delete from public.profiles where id = old.id;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted
  after delete on auth.users
  for each row execute function handle_delete_user();
