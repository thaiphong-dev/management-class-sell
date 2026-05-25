-- 012_attendance_update_trigger.sql
-- Deduct session when attendance status is UPDATED from absent/excused → present/late
-- Companion to after_attendance_deduct_session (INSERT trigger in 004_triggers.sql)

create or replace function deduct_session_on_attendance_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  pkg           student_packages%rowtype;
  new_remaining int;
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
    where s.id = NEW.student_id;
  end if;

  return NEW;
end;
$$;

drop trigger if exists after_attendance_update_deduct_session on attendance;
create trigger after_attendance_update_deduct_session
  after update on attendance
  for each row execute function deduct_session_on_attendance_update();
