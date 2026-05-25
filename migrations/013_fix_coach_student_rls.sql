-- 013_fix_coach_student_rls.sql
-- Fix BUG-C01: infinite recursion in RLS policies between class_students and students.
--
-- Root cause:
-- When querying `classes JOIN class_students`, PostgreSQL evaluates ALL matching
-- RLS policies. `class_students_student_select` queries `students`, which triggers
-- `students_coach_select`, which queries `class_students` again → infinite loop.
--
-- Note: 005_rls.sql already defines auth_is_coach_of_student / auth_student_in_class
-- and uses them in the initial policies. This migration is a definitive idempotent
-- re-apply in case the live DB has stale policies without the security definer fix.

-- ─── Re-create security definer functions (idempotent) ──────────────────────

create or replace function auth_is_coach_of_student(p_student_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from class_students cs
    join classes c  on c.id  = cs.class_id
    join coaches co on co.id = c.coach_id
    where cs.student_id = p_student_id
      and co.user_id    = auth.uid()
  )
$$;

create or replace function auth_student_in_class(p_class_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from class_students cs
    join students s on s.id = cs.student_id
    where cs.class_id = p_class_id
      and s.user_id   = auth.uid()
  )
$$;

-- Restrict execution to authenticated users only
revoke execute on function auth_is_coach_of_student(uuid) from public;
grant  execute on function auth_is_coach_of_student(uuid) to authenticated;

revoke execute on function auth_student_in_class(uuid) from public;
grant  execute on function auth_student_in_class(uuid) to authenticated;

-- ─── Re-create students_coach_select using the security definer function ─────
drop policy if exists "students_coach_select" on students;
create policy "students_coach_select"
  on students
  for select
  using (auth_is_coach_of_student(id));

-- ─── Re-create class_students_student_select using security definer function ─
drop policy if exists "class_students_student_select" on class_students;
create policy "class_students_student_select"
  on class_students
  for select
  using (auth_student_in_class(class_id));

-- ─── Re-create sessions_student_select (also uses auth_student_in_class) ─────
drop policy if exists "sessions_student_select" on sessions;
create policy "sessions_student_select"
  on sessions
  for select
  using (auth_student_in_class(class_id));
