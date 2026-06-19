-- 027_parent_buy_package_rpc.sql
-- 1. Update cancel_pending_registration to allow parent to cancel
create or replace function cancel_pending_registration(p_registration_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_student_package_id uuid;
  v_payment_id uuid;
  v_student_user_id uuid;
  v_student_id uuid;
begin
  -- Get registration details
  select r.student_package_id, r.payment_id, s.user_id, r.student_id
  into v_student_package_id, v_payment_id, v_student_user_id, v_student_id
  from registrations r
  join students s on s.id = r.student_id
  where r.id = p_registration_id;

  if not found then
    raise exception 'Không tìm thấy đơn đăng ký';
  end if;

  -- Security check: caller must be the student owner or their parent or an admin
  if v_student_user_id <> auth.uid() 
     and not exists (
       select 1 from parents p
       join students s on s.parent_id = p.id
       where p.user_id = auth.uid() and s.id = v_student_id
     )
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


-- 2. Parent buy package RPC
create or replace function parent_buy_package(p_student_id uuid, p_class_id uuid, p_package_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
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
  v_parent_id uuid;
begin
  -- 1. Verify that the caller is indeed the parent of this student
  select id into v_parent_id
  from parents
  where user_id = auth.uid();

  if v_parent_id is null then
    raise exception 'Tài khoản không phải là Phụ huynh';
  end if;

  if not exists (
    select 1 from students
    where id = p_student_id and parent_id = v_parent_id
  ) then
    raise exception 'Học viên không thuộc quản lý của bạn';
  end if;

  -- Check if they already have an unpaid pending package
  if exists (
    select 1 from registrations
    where student_id = p_student_id and payment_status = 'unpaid' and status = 'pending'
  ) then
    raise exception 'Học viên đang có một thẻ học chờ thanh toán. Vui lòng thanh toán hoặc hủy thẻ đó trước.';
  end if;

  -- Get student details
  select date_of_birth, emergency_contact, notes
  into v_dob, v_emergency_contact, v_notes
  from students
  where id = p_student_id;

  -- Get package details
  select sessions_count, price
  into v_sessions_count, v_price
  from packages
  where id = p_package_id;

  if v_price is null then
    raise exception 'Gói học không tồn tại';
  end if;

  -- Get profile details of the child
  select p.phone, p.full_name, p.avatar_url
  into v_phone, v_full_name, v_avatar_url
  from profiles p
  join students s on s.user_id = p.id
  where s.id = p_student_id;

  -- Split full name
  v_last_name  := coalesce(split_part(v_full_name, ' ', 1), '');
  v_first_name := coalesce(substr(v_full_name, length(v_last_name) + 2), '');

  -- Get parent email to use for registration contact
  select email into v_email
  from auth.users
  where id = auth.uid();

  -- 2. Create student package (pending_activation)
  insert into student_packages (
    student_id, package_id, sessions_total, sessions_remaining, status, notes
  ) values (
    p_student_id, p_package_id, v_sessions_count, v_sessions_count, 'pending_activation', 'Phụ huynh đăng ký mua thẻ học cho con trên web.'
  ) returning id into v_student_package_id;

  -- 3. Create pending payment
  insert into payments (
    student_id, student_package_id, amount, payment_method, status, notes
  ) values (
    p_student_id, v_student_package_id, v_price, 'transfer', 'pending', 'Phụ huynh đăng ký mua cho con.'
  ) returning id into v_payment_id;

  -- 4. Create registration record
  insert into registrations (
    student_id, class_id, package_id, student_package_id, payment_id,
    payment_status, status, first_name, last_name, mobile_phone, email,
    date_of_birth, terms_accepted
  ) values (
    p_student_id, p_class_id, p_package_id, v_student_package_id, v_payment_id,
    'unpaid', 'pending', v_first_name, v_last_name, v_phone, v_email,
    v_dob, true
  ) returning id into v_registration_id;

  return v_registration_id;
end;
$$;
