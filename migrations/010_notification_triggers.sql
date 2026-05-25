-- 010_notification_triggers.sql
-- Automatic notifications: package_granted, session_cancelled

-- =============================================
-- Notify student when package is granted
-- =============================================
create or replace function notify_package_granted()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_student_user_id uuid;
  v_package_name    text;
begin
  select s.user_id into v_student_user_id
  from students s where s.id = NEW.student_id;

  select p.name into v_package_name
  from packages p where p.id = NEW.package_id;

  if v_student_user_id is not null and v_package_name is not null then
    insert into notifications(user_id, title, body, type, metadata)
    values (
      v_student_user_id,
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

drop trigger if exists on_package_granted on student_packages;
create trigger on_package_granted
  after insert on student_packages
  for each row execute function notify_package_granted();

-- =============================================
-- Notify enrolled students when session cancelled
-- =============================================
create or replace function notify_session_cancelled()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_class_name      text;
  v_scheduled_text  text;
  v_student_user_id uuid;
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

    for v_student_user_id in
      select s.user_id
      from class_students cs
      join students s on s.id = cs.student_id
      where cs.class_id = NEW.class_id
        and cs.status   = 'active'
    loop
      insert into notifications(user_id, title, body, type, metadata)
      values (
        v_student_user_id,
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

drop trigger if exists on_session_cancelled on sessions;
create trigger on_session_cancelled
  after update on sessions
  for each row execute function notify_session_cancelled();
