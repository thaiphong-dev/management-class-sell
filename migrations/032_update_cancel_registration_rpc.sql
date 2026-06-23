-- 032_update_cancel_registration_rpc.sql
-- Update cancel_pending_registration to allow parents of the student to cancel pending registrations.

create or replace function cancel_pending_registration(p_registration_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_student_package_id uuid;
  v_payment_id uuid;
  v_student_user_id uuid;
  v_student_id uuid;
begin
  -- Get registration details and verify owner
  select r.student_package_id, r.payment_id, s.user_id, r.student_id
  into v_student_package_id, v_payment_id, v_student_user_id, v_student_id
  from registrations r
  join students s on s.id = r.student_id
  where r.id = p_registration_id;

  if not found then
    raise exception 'Không tìm thấy đơn đăng ký';
  end if;

  -- Security check: caller must be the student owner, parent of the student, or an admin
  if v_student_user_id <> auth.uid() 
     and not auth_is_parent_of_student(v_student_id)
     and not exists (
       select 1 from profiles where id = auth.uid() and role = 'admin'
     ) then
    raise exception 'Không có quyền thực hiện hành động này';
  end if;

  -- Delete payment record if pending
  if v_payment_id is not null then
    delete from payments where id = v_payment_id and status = 'pending';
  end if;

  -- Delete student package if pending activation
  if v_student_package_id is not null then
    delete from student_packages where id = v_student_package_id and status = 'pending_activation';
  end if;

  -- Delete registration record
  delete from registrations where id = p_registration_id and status = 'pending';
end;
$$;
