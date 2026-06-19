-- 020_add_select_policy_to_registrations.sql
-- Add SELECT policy for registrations table to allow public/anonymous users to select registration status

-- Drop existing policy if any
drop policy if exists "Allow public select registrations" on registrations;

-- Create SELECT policy for public/anonymous users
create policy "Allow public select registrations" on registrations
  for select
  using (true);
