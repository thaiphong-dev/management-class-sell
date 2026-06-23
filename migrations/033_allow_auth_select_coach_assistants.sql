-- 033_allow_auth_select_coach_assistants.sql
-- Allow authenticated users to select coach_assistants mapping

drop policy if exists "Allow authenticated users to view coach assistants" on coach_assistants;
create policy "Allow authenticated users to view coach assistants"
  on coach_assistants for select using (
    auth.role() = 'authenticated'
  );
