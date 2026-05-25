-- 009_fix_rls_recursion.sql
-- Fix: infinite recursion in RLS policies.
--
-- Root cause: admin policies on ALL tables do "exists (select 1 from profiles where role='admin')"
-- which queries profiles → triggers profiles policy → queries profiles → infinite loop.
--
-- Fix: create a security definer function is_admin() that bypasses RLS,
-- then use it in every _admin_all policy instead of querying profiles directly.

-- ─── Helper: check admin without triggering RLS ───────────────────────────────
create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$;

-- Restrict execution to authenticated users only
revoke execute on function is_admin() from public;
grant  execute on function is_admin() to authenticated;

-- ─── Re-create all _admin_all policies using is_admin() ──────────────────────

-- profiles
drop policy if exists "profiles_admin_all" on profiles;
create policy "profiles_admin_all"
  on profiles
  using (is_admin());

-- facilities
drop policy if exists "facilities_admin_all" on facilities;
create policy "facilities_admin_all"
  on facilities
  using (is_admin());

-- courts
drop policy if exists "courts_admin_all" on courts;
create policy "courts_admin_all"
  on courts
  using (is_admin());

-- coaches
drop policy if exists "coaches_admin_all" on coaches;
create policy "coaches_admin_all"
  on coaches
  using (is_admin());

-- students
drop policy if exists "students_admin_all" on students;
create policy "students_admin_all"
  on students
  using (is_admin());

-- packages
drop policy if exists "packages_admin_all" on packages;
create policy "packages_admin_all"
  on packages
  using (is_admin());

-- classes
drop policy if exists "classes_admin_all" on classes;
create policy "classes_admin_all"
  on classes
  using (is_admin());

-- class_students
drop policy if exists "class_students_admin_all" on class_students;
create policy "class_students_admin_all"
  on class_students
  using (is_admin());

-- sessions
drop policy if exists "sessions_admin_all" on sessions;
create policy "sessions_admin_all"
  on sessions
  using (is_admin());

-- attendance
drop policy if exists "attendance_admin_all" on attendance;
create policy "attendance_admin_all"
  on attendance
  using (is_admin());

-- student_packages
drop policy if exists "sp_admin_all" on student_packages;
create policy "sp_admin_all"
  on student_packages
  using (is_admin());

-- payments
drop policy if exists "payments_admin_all" on payments;
create policy "payments_admin_all"
  on payments
  using (is_admin());

-- progress_evaluations
drop policy if exists "eval_admin_all" on progress_evaluations;
create policy "eval_admin_all"
  on progress_evaluations
  using (is_admin());

-- notifications
drop policy if exists "notif_admin_all" on notifications;
create policy "notif_admin_all"
  on notifications
  using (is_admin());
