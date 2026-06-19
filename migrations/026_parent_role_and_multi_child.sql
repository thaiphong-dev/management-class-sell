-- 026_parent_role_and_multi_child.sql
-- 1. Update profiles role check constraint to include 'parent'
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('admin', 'coach', 'assistant', 'student', 'parent'));

-- 2. Create parents table
create table if not exists parents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id)
);

-- Enable RLS for parents
alter table parents enable row level security;

-- Policies for parents
drop policy if exists "parents_select" on parents;
create policy "parents_select" on parents for select using (
  user_id = auth.uid() or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists "parents_insert" on parents;
create policy "parents_insert" on parents for insert with check (
  user_id = auth.uid() or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- 3. Add parent_id to students table
alter table students add column if not exists parent_id uuid references parents(id) on delete set null;

-- 4. Sync parents record automatically when a profile role is updated to 'parent'
create or replace function sync_parent_record()
returns trigger as $$
begin
  if new.role = 'parent' then
    insert into public.parents (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  else
    delete from public.parents where user_id = new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_sync_parent_record on profiles;
create trigger trg_sync_parent_record
  after insert or update of role on profiles
  for each row execute function sync_parent_record();

-- Populate existing parent users (if any)
insert into parents (user_id)
select id from profiles where role = 'parent'
on conflict (user_id) do nothing;

-- 5. Helper function for RLS checks to see if current user is parent of student
create or replace function auth_is_parent_of_student(p_student_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1
    from students s
    join parents p on p.id = s.parent_id
    where s.id = p_student_id
      and p.user_id = auth.uid()
  );
$$;

-- Helper function for RLS checks to see if current user is parent of profile
create or replace function auth_is_parent_of_profile(p_child_profile_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1
    from students s
    join parents p on p.id = s.parent_id
    where s.user_id = p_child_profile_id
      and p.user_id = auth.uid()
  );
$$;

-- 6. Add policies for Parent access to profiles, students, student_packages, etc.

-- profiles policies for parent
drop policy if exists "profiles_parent_insert" on profiles;
create policy "profiles_parent_insert" on profiles for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'parent')
);

drop policy if exists "profiles_parent_update" on profiles;
create policy "profiles_parent_update" on profiles for update using (
  auth_is_parent_of_profile(id)
);

-- students policies for parent
drop policy if exists "students_parent_select" on students;
create policy "students_parent_select" on students for select using (
  exists (select 1 from parents p where p.id = students.parent_id and p.user_id = auth.uid())
);

drop policy if exists "students_parent_insert" on students;
create policy "students_parent_insert" on students for insert with check (
  exists (select 1 from parents p where p.id = students.parent_id and p.user_id = auth.uid())
);

drop policy if exists "students_parent_update" on students;
create policy "students_parent_update" on students for update using (
  exists (select 1 from parents p where p.id = students.parent_id and p.user_id = auth.uid())
);

-- student_packages policies for parent
drop policy if exists "sp_parent_select" on student_packages;
create policy "sp_parent_select" on student_packages for select using (
  auth_is_parent_of_student(student_id)
);

drop policy if exists "sp_parent_insert" on student_packages;
create policy "sp_parent_insert" on student_packages for insert with check (
  auth_is_parent_of_student(student_id)
);

-- payments policies for parent
drop policy if exists "payments_parent_select" on payments;
create policy "payments_parent_select" on payments for select using (
  auth_is_parent_of_student(student_id)
);

drop policy if exists "payments_parent_insert" on payments;
create policy "payments_parent_insert" on payments for insert with check (
  auth_is_parent_of_student(student_id)
);

-- progress_evaluations policies for parent
drop policy if exists "eval_parent_select" on progress_evaluations;
create policy "eval_parent_select" on progress_evaluations for select using (
  auth_is_parent_of_student(student_id)
);

-- attendance policies for parent
drop policy if exists "attendance_parent_select" on attendance;
create policy "attendance_parent_select" on attendance for select using (
  auth_is_parent_of_student(student_id)
);

-- registrations policies for parent
drop policy if exists "registrations_parent_select" on registrations;
create policy "registrations_parent_select" on registrations for select using (
  exists (
    select 1 from parents p
    join students s on s.parent_id = p.id
    where p.user_id = auth.uid() and s.id = registrations.student_id
  )
);

-- class_students policies for parent
drop policy if exists "class_students_parent_select" on class_students;
create policy "class_students_parent_select" on class_students for select using (
  auth_is_parent_of_student(student_id)
);

drop policy if exists "class_students_parent_insert" on class_students;
create policy "class_students_parent_insert" on class_students for insert with check (
  auth_is_parent_of_student(student_id)
);

-- sessions policies for parent
drop policy if exists "sessions_parent_select" on sessions;
create policy "sessions_parent_select" on sessions for select using (
  exists (
    select 1 from class_students cs
    join students s on s.id = cs.student_id
    join parents p on p.id = s.parent_id
    where cs.class_id = sessions.class_id and p.user_id = auth.uid()
  )
);

-- 7. Update notification triggers to redirect to parent if child has parent_id

-- 7.1 notify_package_granted
create or replace function notify_package_granted()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_student_user_id uuid;
  v_parent_user_id  uuid;
  v_package_name    text;
  v_target_user_id  uuid;
begin
  select s.user_id, p.user_id into v_student_user_id, v_parent_user_id
  from students s
  left join parents p on p.id = s.parent_id
  where s.id = NEW.student_id;

  select p.name into v_package_name
  from packages p where p.id = NEW.package_id;

  v_target_user_id := coalesce(v_parent_user_id, v_student_user_id);

  if v_target_user_id is not null and v_package_name is not null then
    insert into notifications(user_id, title, body, type, metadata)
    values (
      v_target_user_id,
      'Gói học mới',
      'Bạn đã được cấp gói học "' || v_package_name || '". Chúc bạn tập luyện hiệu quả!',
      'package_grant',
      jsonb_build_object(
        'student_package_id', NEW.id,
        'package_name', v_package_name
      )
    );
  end if;

  return NEW;
end;
$$;

-- 7.2 notify_session_cancelled
create or replace function notify_session_cancelled()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_class_name      text;
  v_scheduled_text  text;
  v_student_user_id uuid;
  v_parent_user_id  uuid;
  v_body            text;
begin
  if NEW.status = 'cancelled' and (OLD.status is null or OLD.status <> 'cancelled') then
    select c.name into v_class_name
    from classes c where c.id = NEW.class_id;

    v_scheduled_text := to_char(
      (NEW.scheduled_at at time zone 'Asia/Ho_Chi_Minh'),
      'DD/MM/YYYY HH24:MI'
    );

    v_body := 'Buổi học lớp "' || coalesce(v_class_name, 'N/A') || '" lúc '
      || v_scheduled_text || ' đã bị hủy.';

    if NEW.notes is not null and trim(NEW.notes) <> '' then
      v_body := v_body || ' Lý do: ' || trim(NEW.notes);
    end if;

    for v_student_user_id, v_parent_user_id in
      select s.user_id, p.user_id
      from class_students cs
      join students s on s.id = cs.student_id
      left join parents p on p.id = s.parent_id
      where cs.class_id = NEW.class_id
        and cs.status   = 'active'
    loop
      insert into notifications(user_id, title, body, type, metadata)
      values (
        coalesce(v_parent_user_id, v_student_user_id),
        'Buổi học bị hủy',
        v_body,
        'session_cancel',
        jsonb_build_object(
          'session_id',   NEW.id,
          'class_name',   v_class_name,
          'scheduled_at', NEW.scheduled_at
        )
      );
    end loop;
  end if;

  return NEW;
end;
$$;

-- 7.3 deduct_session_on_attendance
create or replace function deduct_session_on_attendance()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  pkg student_packages%rowtype;
  new_remaining int;
  v_student_user_id uuid;
  v_parent_user_id  uuid;
begin
  if new.status not in ('present', 'late') then
    return new;
  end if;

  select sp.* into pkg
  from student_packages sp
  join packages p on p.id = sp.package_id
  where sp.student_id = new.student_id
    and sp.status = 'active'
    and p.package_type = 'session'
    and sp.expires_at > now()
    and sp.sessions_remaining > 0
  order by sp.activated_at asc
  limit 1;

  if not found then
    return new;
  end if;

  new_remaining := pkg.sessions_remaining - 1;

  update student_packages
  set
    sessions_remaining = new_remaining,
    status = case when new_remaining <= 0 then 'depleted' else 'active' end
  where id = pkg.id;

  -- Notify when 3 or 1 session remaining
  if new_remaining in (3, 1) then
    select s.user_id, p.user_id into v_student_user_id, v_parent_user_id
    from students s
    left join parents p on p.id = s.parent_id
    where s.id = new.student_id;

    insert into notifications (user_id, title, body, type, metadata)
    values (
      coalesce(v_parent_user_id, v_student_user_id),
      case when new_remaining = 3 then 'Thẻ tập sắp hết!' else 'Buổi học cuối cùng!' end,
      case when new_remaining = 3
        then 'Thẻ của bạn còn 3 buổi. Hãy gia hạn sớm để không bị gián đoạn.'
        else 'Đây là buổi học cuối cùng trong thẻ của bạn!'
      end,
      'card_expiring_sessions',
      jsonb_build_object(
        'student_package_id', pkg.id,
        'sessions_remaining', new_remaining
      )
    );
  end if;

  return new;
end;
$$;

-- 7.4 deduct_session_on_attendance_update
create or replace function deduct_session_on_attendance_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  pkg           student_packages%rowtype;
  new_remaining int;
  v_student_user_id uuid;
  v_parent_user_id  uuid;
begin
  -- Only fire when transitioning FROM non-deductible TO deductible status
  if NEW.status not in ('present', 'late') then
    return NEW;
  end if;
  if OLD.status in ('present', 'late') then
    -- Already deducted on INSERT or previous update — skip
    return NEW;
  end if;

  -- Find active session-type package with remaining sessions
  select sp.* into pkg
  from student_packages sp
  join packages p on p.id = sp.package_id
  where sp.student_id = NEW.student_id
    and sp.status     = 'active'
    and p.package_type = 'session'
    and sp.expires_at  > now()
    and sp.sessions_remaining > 0
  order by sp.activated_at asc
  limit 1;

  if not found then
    return NEW;
  end if;

  new_remaining := pkg.sessions_remaining - 1;

  update student_packages
  set
    sessions_remaining = new_remaining,
    status = case when new_remaining <= 0 then 'depleted' else 'active' end
  where id = pkg.id;

  -- Low session notifications (same thresholds as INSERT trigger)
  if new_remaining in (3, 1) then
    select s.user_id, p.user_id into v_student_user_id, v_parent_user_id
    from students s
    left join parents p on p.id = s.parent_id
    where s.id = NEW.student_id;

    insert into notifications (user_id, title, body, type, metadata)
    values (
      coalesce(v_parent_user_id, v_student_user_id),
      case when new_remaining = 3 then 'Thẻ tập sắp hết!' else 'Buổi học cuối cùng!' end,
      case when new_remaining = 3
        then 'Thẻ của bạn còn 3 buổi. Hãy gia hạn sớm để không bị gián đoạn.'
        else 'Đây là buổi học cuối cùng trong thẻ của bạn!'
      end,
      'card_expiring_sessions',
      jsonb_build_object(
        'student_package_id', pkg.id,
        'sessions_remaining', new_remaining
      )
    );
  end if;

  return NEW;
end;
$$;

-- 7.5 expire_overdue_packages
create or replace function expire_overdue_packages()
returns void as $$
begin
  -- Mark expired packages
  update student_packages
  set status = 'expired'
  where status = 'active'
    and expires_at < now();

  -- Send 7-day and 3-day expiry notifications (skip if already sent today)
  insert into notifications (user_id, title, body, type, metadata)
  select
    coalesce(p.user_id, s.user_id),
    'Thẻ tập sắp hết hạn',
    'Thẻ của bạn sẽ hết hạn sau ' ||
      extract(day from (sp.expires_at - now()))::int || ' ngày.',
    'card_expiring_days',
    jsonb_build_object(
      'student_package_id', sp.id,
      'expires_at', sp.expires_at,
      'days_remaining', extract(day from (sp.expires_at - now()))::int
    )
  from student_packages sp
  join students s on s.id = sp.student_id
  left join parents p on p.id = s.parent_id
  where sp.status = 'active'
    and extract(day from (sp.expires_at - now()))::int in (7, 3)
    and not exists (
      select 1 from notifications n
      where (n.metadata->>'student_package_id') = sp.id::text
        and n.type = 'card_expiring_days'
        and n.created_at > now() - interval '20 hours'
    );
end;
$$ language plpgsql security definer;
