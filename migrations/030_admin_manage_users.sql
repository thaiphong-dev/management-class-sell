-- 030_admin_manage_users.sql
-- Add status column to profiles and create RPC functions for admin to delete/disable users

-- 1. Add status column to profiles table
alter table public.profiles add column if not exists status text default 'active' check (status in ('active', 'inactive'));

-- 2. Create RPC function to disable/enable user (soft delete / toggle status)
create or replace function public.admin_set_user_status(p_user_id uuid, p_status text)
returns void
security definer
set search_path = public, auth
as $$
declare
  v_caller_role text;
begin
  -- Check if caller is authenticated and has admin role
  select role into v_caller_role from public.profiles where id = auth.uid();
  if v_caller_role <> 'admin' then
    raise exception 'Forbidden: Admin only';
  end if;

  -- Validate status value
  if p_status not in ('active', 'inactive') then
    raise exception 'Invalid status value';
  end if;

  -- Update profiles status
  update public.profiles
  set status = p_status
  where id = p_user_id;

  -- If status is inactive, also ban them in auth.users so they cannot log in
  if p_status = 'inactive' then
    update auth.users
    set banned_until = '2099-12-31T23:59:59Z'
    where id = p_user_id;
  else
    update auth.users
    set banned_until = null
    where id = p_user_id;
  end if;
end;
$$ language plpgsql;

-- 3. Create RPC function to hard delete user (hard delete / delete from auth.users)
create or replace function public.admin_delete_user(p_user_id uuid)
returns void
security definer
set search_path = public, auth
as $$
declare
  v_caller_role text;
begin
  -- Check if caller is authenticated and has admin role
  select role into v_caller_role from public.profiles where id = auth.uid();
  if v_caller_role <> 'admin' then
    raise exception 'Forbidden: Admin only';
  end if;

  -- Delete child tables first to avoid foreign key violations
  delete from public.payments where student_id in (select id from public.students where user_id = p_user_id);
  delete from public.student_packages where student_id in (select id from public.students where user_id = p_user_id);
  delete from public.attendance where student_id in (select id from public.students where user_id = p_user_id);
  delete from public.progress_evaluations where student_id in (select id from public.students where user_id = p_user_id) or coach_id in (select id from public.coaches where user_id = p_user_id);
  delete from public.class_students where student_id in (select id from public.students where user_id = p_user_id);
  
  -- Re-assign classes coach_id if coach is deleted
  update public.classes
  set coach_id = null
  where coach_id in (select id from public.coaches where user_id = p_user_id);

  -- Delete profile which will cascade delete coaches, assistants, students, parents
  delete from public.profiles where id = p_user_id;

  -- Delete auth user
  delete from auth.users where id = p_user_id;
end;
$$ language plpgsql;
