-- 011_enrollment_trigger.sql
-- Notify student when added to a class

create or replace function notify_class_enrolled()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_student_user_id uuid;
  v_class_name      text;
begin
  -- Only fire for active enrollments (direct add, not reactivation edge case)
  if NEW.status <> 'active' then
    return NEW;
  end if;

  select s.user_id into v_student_user_id
  from students s where s.id = NEW.student_id;

  select c.name into v_class_name
  from classes c where c.id = NEW.class_id;

  if v_student_user_id is not null and v_class_name is not null then
    insert into notifications(user_id, title, body, type, metadata)
    values (
      v_student_user_id,
      'Đã thêm vào lớp học',
      'Bạn đã được thêm vào lớp "' || v_class_name || '". Kiểm tra lịch học của bạn ngay!',
      'class_enrolled',
      jsonb_build_object('class_id', NEW.class_id, 'class_name', v_class_name)
    );
  end if;

  return NEW;
end;
$$;

drop trigger if exists on_class_enrolled on class_students;
create trigger on_class_enrolled
  after insert on class_students
  for each row execute function notify_class_enrolled();
