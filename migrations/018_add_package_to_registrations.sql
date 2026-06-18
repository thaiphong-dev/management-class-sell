-- 018_add_package_to_registrations.sql
-- Update registrations table, create sepay_transactions table, update notifications type check, and add admin notify triggers

-- 1. Alter registrations table
alter table registrations 
  add column if not exists package_id uuid references packages(id) on delete set null,
  add column if not exists payment_status text check (payment_status in ('unpaid', 'paid')) default 'unpaid';

-- 2. Create sepay_transactions table for banking webhook idempotency and logs
create table if not exists sepay_transactions (
  id              uuid primary key default gen_random_uuid(),
  transaction_id  text unique not null,
  amount          numeric(12,0) not null,
  transfer_type   text check (transfer_type in ('in', 'out')),
  transfer_date   timestamptz,
  gateway         text,
  account_number  text,
  sub_account     text,
  code            text,
  content         text,
  registration_id uuid references registrations(id) on delete set null,
  created_at      timestamptz default now()
);

-- Enable RLS on sepay_transactions
alter table sepay_transactions enable row level security;

-- Admin can manage sepay_transactions
drop policy if exists "Allow admin manage sepay_transactions" on sepay_transactions;
create policy "Allow admin manage sepay_transactions" on sepay_transactions
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 3. Update notifications type constraint to support 'new_registration'
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check check (type in (
  'card_expiring_sessions',
  'card_expiring_days',
  'card_expired',
  'session_cancelled',
  'card_assigned',
  'general',
  'class_enrolled',
  'package_grant',
  'session_cancel',
  'new_registration'
));

-- 4. Notification trigger: when a registration is inserted (new registration)
create or replace function notify_new_registration()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_class_name text;
  v_admin_id   uuid;
begin
  select name into v_class_name from classes where id = NEW.class_id;

  for v_admin_id in 
    select id from profiles where role = 'admin'
  loop
    insert into notifications(user_id, title, body, type, metadata)
    values (
      v_admin_id,
      'Đăng ký lớp học mới',
      NEW.last_name || ' ' || NEW.first_name || ' đã gửi đơn đăng ký mới vào lớp "' || coalesce(v_class_name, 'N/A') || '".',
      'new_registration',
      jsonb_build_object(
        'registration_id', NEW.id,
        'class_id', NEW.class_id,
        'student_name', NEW.last_name || ' ' || NEW.first_name
      )
    );
  end loop;

  return NEW;
end;
$$;

drop trigger if exists on_new_registration on registrations;
create trigger on_new_registration
  after insert on registrations
  for each row execute function notify_new_registration();

-- 5. Notification trigger: when a registration payment is confirmed
create or replace function notify_registration_payment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_class_name text;
  v_admin_id   uuid;
begin
  if NEW.payment_status = 'paid' and (OLD.payment_status is null or OLD.payment_status = 'unpaid') then
    select name into v_class_name from classes where id = NEW.class_id;

    for v_admin_id in 
      select id from profiles where role = 'admin'
    loop
      insert into notifications(user_id, title, body, type, metadata)
      values (
        v_admin_id,
        'Thanh toán đăng ký thành công',
        NEW.last_name || ' ' || NEW.first_name || ' đã thanh toán học phí thành công cho lớp "' || coalesce(v_class_name, 'N/A') || '".',
        'general',
        jsonb_build_object(
          'registration_id', NEW.id,
          'class_id', NEW.class_id,
          'student_name', NEW.last_name || ' ' || NEW.first_name
        )
      );
    end loop;
  end if;

  return NEW;
end;
$$;

drop trigger if exists on_registration_paid on registrations;
create trigger on_registration_paid
  after update on registrations
  for each row execute function notify_registration_payment();
