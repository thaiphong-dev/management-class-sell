-- 029_coach_assistant_registrations.sql
-- Migration to create assistants table and coach_assistant_registrations table with RLS policies and triggers.

-- 1. Create assistants table
create table if not exists assistants (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id) on delete cascade unique,
  school_university text,
  major             text,
  year_of_study     text,
  skills            text,
  bio               text,
  certifications    text[],
  status            text default 'active' check (status in ('active', 'inactive')),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- Enable RLS for assistants
alter table assistants enable row level security;

-- Policies for assistants
drop policy if exists "Allow admins full access to assistants" on assistants;
create policy "Allow admins full access to assistants"
  on assistants for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Allow authenticated users to select active assistants" on assistants;
create policy "Allow authenticated users to select active assistants"
  on assistants for select using (
    auth.role() = 'authenticated' and status = 'active'
  );

drop policy if exists "Allow assistants to update own profile" on assistants;
create policy "Allow assistants to update own profile"
  on assistants for update using (
    user_id = auth.uid()
  );

-- 2. Create coach_assistant_registrations table
create table if not exists coach_assistant_registrations (
  id                uuid primary key default gen_random_uuid(),
  role              text not null check (role in ('coach', 'assistant')),
  first_name        text not null,
  last_name         text not null,
  gender            text not null check (gender in ('Nam', 'Nữ')),
  date_of_birth     date not null,
  email             text not null,
  phone             text not null,
  avatar_url        text, -- stores base64 compressed image
  address           text,
  -- Coach specific / General
  specialty         text,
  experience_years  int default 0,
  bio               text,
  certifications    text[],
  achievements      text,
  -- Assistant specific
  school_university text,
  major             text,
  year_of_study     text,
  skills            text,
  -- Status & Auditing
  status            text not null check (status in ('pending', 'approved', 'rejected')) default 'pending',
  rejection_reason  text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- Enable RLS for coach_assistant_registrations
alter table coach_assistant_registrations enable row level security;

-- Policies for coach_assistant_registrations
drop policy if exists "Allow public insert registrations" on coach_assistant_registrations;
create policy "Allow public insert registrations"
  on coach_assistant_registrations for insert with check (true);

drop policy if exists "Allow admins full access to registrations" on coach_assistant_registrations;
create policy "Allow admins full access to registrations"
  on coach_assistant_registrations for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- 3. Create updated_at trigger helper function if it doesn't exist
create or replace function set_updated_at_column()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

-- Apply updated_at trigger to assistants
drop trigger if exists set_assistants_updated_at on assistants;
create trigger set_assistants_updated_at
  before update on assistants
  for each row execute function set_updated_at_column();

-- Apply updated_at trigger to coach_assistant_registrations
drop trigger if exists set_coach_assistant_registrations_updated_at on coach_assistant_registrations;
create trigger set_coach_assistant_registrations_updated_at
  before update on coach_assistant_registrations
  for each row execute function set_updated_at_column();

-- 4. Trigger to notify admins when a new coach/assistant registration is created
create or replace function notify_admin_on_staff_registration()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  admin_rec record;
  v_role_label text;
begin
  v_role_label := case when NEW.role = 'coach' then 'Huấn luyện viên' else 'Trợ giảng' end;

  for admin_rec in select id from profiles where role = 'admin' loop
    insert into notifications(user_id, title, body, type, metadata)
    values (
      admin_rec.id,
      'Ứng tuyển ' || v_role_label || ' mới',
      'Ứng viên ' || NEW.last_name || ' ' || NEW.first_name || ' vừa gửi đơn ứng tuyển vị trí ' || v_role_label || '.',
      'general',
      jsonb_build_object(
        'registration_id', NEW.id,
        'role', NEW.role,
        'full_name', NEW.last_name || ' ' || NEW.first_name
      )
    );
  end loop;

  return NEW;
end;
$$;

drop trigger if exists on_staff_registration_created on coach_assistant_registrations;
create trigger on_staff_registration_created
  after insert on coach_assistant_registrations
  for each row execute function notify_admin_on_staff_registration();
