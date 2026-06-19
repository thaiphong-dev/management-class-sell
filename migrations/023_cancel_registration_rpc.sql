-- 023_cancel_registration_rpc.sql
-- Add secure RPC functions to cancel a pending registration and to let students buy a new package

-- 1. Cancel pending registration
create or replace function cancel_pending_registration(p_registration_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_student_package_id uuid;
  v_payment_id uuid;
  v_student_user_id uuid;
begin
  -- Get registration details and verify owner
  select r.student_package_id, r.payment_id, s.user_id
  into v_student_package_id, v_payment_id, v_student_user_id
  from registrations r
  join students s on s.id = r.student_id
  where r.id = p_registration_id;

  if not found then
    raise exception 'Không tìm thấy đơn đăng ký';
  end if;

  -- Security check: caller must be the student owner or an admin
  if v_student_user_id <> auth.uid() and not exists (
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


-- 2. Student self-service buy package
create or replace function student_buy_package(p_class_id uuid, p_package_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_student_id uuid;
  v_student_package_id uuid;
  v_payment_id uuid;
  v_registration_id uuid;
  v_sessions_count int;
  v_price numeric(12,0);
  v_email text;
  v_phone text;
  v_full_name text;
  v_avatar_url text;
  v_dob date;
  v_emergency_contact text;
  v_notes text;
  v_first_name text;
  v_last_name text;
begin
  -- 1. Get student ID of the caller
  select id, date_of_birth, emergency_contact, notes
  into v_student_id, v_dob, v_emergency_contact, v_notes
  from students
  where user_id = auth.uid();

  if v_student_id is null then
    raise exception 'Học viên không tồn tại hoặc chưa kích hoạt';
  end if;

  -- Check if they already have an unpaid pending package
  if exists (
    select 1 from registrations
    where student_id = v_student_id and payment_status = 'unpaid' and status = 'pending'
  ) then
    raise exception 'Bạn đang có một thẻ học chờ thanh toán. Vui lòng thanh toán hoặc hủy thẻ đó trước.';
  end if;

  -- Get package details
  select sessions_count, price
  into v_sessions_count, v_price
  from packages
  where id = p_package_id;

  if v_price is null then
    raise exception 'Gói học không tồn tại';
  end if;

  -- Get profile details
  select u.email, p.phone, p.full_name, p.avatar_url
  into v_email, v_phone, v_full_name, v_avatar_url
  from profiles p
  join auth.users u on u.id = p.id
  where p.id = auth.uid();

  -- Split full name
  v_last_name  := coalesce(split_part(v_full_name, ' ', 1), '');
  v_first_name := coalesce(substr(v_full_name, length(v_last_name) + 2), '');

  -- 2. Create student package (pending_activation)
  insert into student_packages (
    student_id, package_id, sessions_total, sessions_remaining, status, notes
  ) values (
    v_student_id, p_package_id, v_sessions_count, v_sessions_count, 'pending_activation', 'Học viên đăng ký mua tự phục vụ trên web.'
  ) returning id into v_student_package_id;

  -- 3. Create pending payment
  insert into payments (
    student_id, student_package_id, amount, payment_method, status, notes
  ) values (
    v_student_id, v_student_package_id, v_price, 'transfer', 'pending', 'Học viên đăng ký mua tự phục vụ.'
  ) returning id into v_payment_id;

  -- 4. Create registration record
  insert into registrations (
    student_id, class_id, package_id, student_package_id, payment_id,
    payment_status, status, first_name, last_name, mobile_phone, email,
    date_of_birth, terms_accepted
  ) values (
    v_student_id, p_class_id, p_package_id, v_student_package_id, v_payment_id,
    'unpaid', 'pending', v_first_name, v_last_name, v_phone, v_email,
    v_dob, true
  ) returning id into v_registration_id;

  return v_registration_id;
end;
$$;
