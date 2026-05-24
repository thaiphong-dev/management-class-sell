-- 004_triggers.sql
-- Functions and triggers for business logic

-- =============================================
-- Auto-create profile when user registers
-- =============================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'student')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =============================================
-- Auto-update updated_at on profiles
-- =============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

-- =============================================
-- Activate pending package on first attendance
-- =============================================
create or replace function activate_pending_package()
returns trigger as $$
declare
  pkg student_packages%rowtype;
  pkg_validity int;
begin
  if new.status not in ('present', 'late') then
    return new;
  end if;

  select sp.* into pkg
  from student_packages sp
  where sp.student_id = new.student_id
    and sp.status = 'pending_activation'
  order by sp.purchased_at asc
  limit 1;

  if not found then
    return new;
  end if;

  select validity_days into pkg_validity
  from packages where id = pkg.package_id;

  update student_packages set
    activated_at = now(),
    expires_at   = now() + (pkg_validity || ' days')::interval,
    status       = 'active'
  where id = pkg.id;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists before_attendance_activate_package on attendance;
create trigger before_attendance_activate_package
  before insert on attendance
  for each row execute function activate_pending_package();

-- =============================================
-- Deduct session on attendance (session-type packages)
-- =============================================
create or replace function deduct_session_on_attendance()
returns trigger as $$
declare
  pkg student_packages%rowtype;
  new_remaining int;
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
    insert into notifications (user_id, title, body, type, metadata)
    select
      s.user_id,
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
    from students s
    where s.id = new.student_id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists after_attendance_deduct_session on attendance;
create trigger after_attendance_deduct_session
  after insert on attendance
  for each row execute function deduct_session_on_attendance();

-- =============================================
-- Check and expire overdue packages (run via cron daily)
-- =============================================
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
    s.user_id,
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
