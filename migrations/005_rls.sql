-- 005_rls.sql
-- Row Level Security policies
-- Drop and recreate all policies to ensure idempotency

-- =============================================
-- profiles
-- =============================================
alter table profiles enable row level security;

drop policy if exists "profiles_select_own"         on profiles;
drop policy if exists "profiles_update_own"         on profiles;
drop policy if exists "profiles_admin_all"          on profiles;
drop policy if exists "profiles_select_authenticated" on profiles;

create policy "profiles_select_own"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id);

-- Admin can do anything
create policy "profiles_admin_all"
  on profiles
  using (exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ));

-- =============================================
-- facilities
-- =============================================
alter table facilities enable row level security;

drop policy if exists "facilities_select_auth"  on facilities;
drop policy if exists "facilities_admin_all"    on facilities;

create policy "facilities_select_auth"
  on facilities for select
  using (auth.role() = 'authenticated');

create policy "facilities_admin_all"
  on facilities
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

-- =============================================
-- courts
-- =============================================
alter table courts enable row level security;

drop policy if exists "courts_select_auth"  on courts;
drop policy if exists "courts_admin_all"    on courts;

create policy "courts_select_auth"
  on courts for select
  using (auth.role() = 'authenticated');

create policy "courts_admin_all"
  on courts
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

-- =============================================
-- coaches
-- =============================================
alter table coaches enable row level security;

drop policy if exists "coaches_select_auth"   on coaches;
drop policy if exists "coaches_update_own"    on coaches;
drop policy if exists "coaches_admin_all"     on coaches;

create policy "coaches_select_auth"
  on coaches for select
  using (auth.role() = 'authenticated');

create policy "coaches_update_own"
  on coaches for update
  using (user_id = auth.uid());

create policy "coaches_admin_all"
  on coaches
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

-- =============================================
-- students
-- =============================================
alter table students enable row level security;

drop policy if exists "students_select_own"        on students;
drop policy if exists "students_coach_select"      on students;
drop policy if exists "students_update_own"        on students;
drop policy if exists "students_admin_all"         on students;

create policy "students_select_own"
  on students for select
  using (user_id = auth.uid());

-- Coach can view students in own classes
create policy "students_coach_select"
  on students for select
  using (exists (
    select 1 from class_students cs
    join classes c on c.id = cs.class_id
    join coaches co on co.id = c.coach_id
    where cs.student_id = students.id
      and co.user_id = auth.uid()
  ));

create policy "students_update_own"
  on students for update
  using (user_id = auth.uid());

create policy "students_admin_all"
  on students
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

-- =============================================
-- packages
-- =============================================
alter table packages enable row level security;

drop policy if exists "packages_select_auth"  on packages;
drop policy if exists "packages_admin_all"    on packages;

create policy "packages_select_auth"
  on packages for select
  using (auth.role() = 'authenticated');

create policy "packages_admin_all"
  on packages
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

-- =============================================
-- classes
-- =============================================
alter table classes enable row level security;

drop policy if exists "classes_select_active"  on classes;
drop policy if exists "classes_admin_all"      on classes;

create policy "classes_select_active"
  on classes for select
  using (auth.role() = 'authenticated' and status = 'active');

create policy "classes_admin_all"
  on classes
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

-- =============================================
-- class_students
-- =============================================
alter table class_students enable row level security;

drop policy if exists "class_students_student_select"  on class_students;
drop policy if exists "class_students_coach_select"    on class_students;
drop policy if exists "class_students_admin_all"       on class_students;

create policy "class_students_student_select"
  on class_students for select
  using (exists (
    select 1 from students where id = class_students.student_id and user_id = auth.uid()
  ));

create policy "class_students_coach_select"
  on class_students for select
  using (exists (
    select 1 from classes c join coaches co on co.id = c.coach_id
    where c.id = class_students.class_id and co.user_id = auth.uid()
  ));

create policy "class_students_admin_all"
  on class_students
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

-- =============================================
-- sessions
-- =============================================
alter table sessions enable row level security;

drop policy if exists "sessions_student_select"  on sessions;
drop policy if exists "sessions_coach_all"       on sessions;
drop policy if exists "sessions_admin_all"       on sessions;

create policy "sessions_student_select"
  on sessions for select
  using (exists (
    select 1 from class_students cs
    join students s on s.id = cs.student_id
    where cs.class_id = sessions.class_id and s.user_id = auth.uid()
  ));

create policy "sessions_coach_all"
  on sessions
  using (exists (
    select 1 from classes c join coaches co on co.id = c.coach_id
    where c.id = sessions.class_id and co.user_id = auth.uid()
  ));

create policy "sessions_admin_all"
  on sessions
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

-- =============================================
-- attendance
-- =============================================
alter table attendance enable row level security;

drop policy if exists "attendance_student_select"  on attendance;
drop policy if exists "attendance_coach_all"       on attendance;
drop policy if exists "attendance_admin_all"       on attendance;

create policy "attendance_student_select"
  on attendance for select
  using (exists (
    select 1 from students where id = attendance.student_id and user_id = auth.uid()
  ));

create policy "attendance_coach_all"
  on attendance
  using (exists (
    select 1 from sessions se
    join classes c on c.id = se.class_id
    join coaches co on co.id = c.coach_id
    where se.id = attendance.session_id and co.user_id = auth.uid()
  ));

create policy "attendance_admin_all"
  on attendance
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

-- =============================================
-- student_packages
-- =============================================
alter table student_packages enable row level security;

drop policy if exists "sp_student_select"  on student_packages;
drop policy if exists "sp_coach_select"    on student_packages;
drop policy if exists "sp_admin_all"       on student_packages;

create policy "sp_student_select"
  on student_packages for select
  using (exists (
    select 1 from students where id = student_packages.student_id and user_id = auth.uid()
  ));

create policy "sp_coach_select"
  on student_packages for select
  using (exists (
    select 1 from class_students cs
    join classes c on c.id = cs.class_id
    join coaches co on co.id = c.coach_id
    where cs.student_id = student_packages.student_id and co.user_id = auth.uid()
  ));

create policy "sp_admin_all"
  on student_packages
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

-- =============================================
-- payments
-- =============================================
alter table payments enable row level security;

drop policy if exists "payments_student_select"  on payments;
drop policy if exists "payments_admin_all"       on payments;

create policy "payments_student_select"
  on payments for select
  using (exists (
    select 1 from students where id = payments.student_id and user_id = auth.uid()
  ));

create policy "payments_admin_all"
  on payments
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

-- =============================================
-- progress_evaluations
-- =============================================
alter table progress_evaluations enable row level security;

drop policy if exists "eval_student_select"  on progress_evaluations;
drop policy if exists "eval_coach_all"       on progress_evaluations;
drop policy if exists "eval_admin_all"       on progress_evaluations;

create policy "eval_student_select"
  on progress_evaluations for select
  using (exists (
    select 1 from students where id = progress_evaluations.student_id and user_id = auth.uid()
  ));

create policy "eval_coach_all"
  on progress_evaluations
  using (exists (
    select 1 from coaches where id = progress_evaluations.coach_id and user_id = auth.uid()
  ));

create policy "eval_admin_all"
  on progress_evaluations
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

-- =============================================
-- notifications
-- =============================================
alter table notifications enable row level security;

drop policy if exists "notif_select_own"   on notifications;
drop policy if exists "notif_update_own"   on notifications;
drop policy if exists "notif_admin_all"    on notifications;

create policy "notif_select_own"
  on notifications for select
  using (user_id = auth.uid());

create policy "notif_update_own"
  on notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notif_admin_all"
  on notifications
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));
