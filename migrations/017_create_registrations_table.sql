-- 017_create_registrations_table.sql
-- Create registrations table with RLS policies

-- 1. Create table registrations
create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete set null,
  class_id uuid not null references classes(id) on delete cascade,
  club_name text,
  first_name text not null,
  last_name text not null,
  title text,
  gender text check (gender in ('Nam', 'Nữ')),
  date_of_birth date not null,
  home_address text,
  home_phone text,
  mobile_phone text not null,
  emergency_phone text,
  email text not null,
  ethnicity text,
  
  -- 10 Health Questions
  q1_heart_condition boolean default false,
  q2_chest_pain_activity boolean default false,
  q3_chest_pain_rest boolean default false,
  q4_fainting_dizziness boolean default false,
  q5_joint_problem boolean default false,
  q6_high_blood_pressure boolean default false,
  q7_medications boolean default false,
  q7_medications_detail text,
  q8_pregnant boolean default false,
  q9_other_reasons boolean default false,
  q9_other_reasons_detail text,
  q10_disability boolean default false,
  q10_disability_detail text,
  
  -- Image Upload (stores Base64 data URL)
  student_photo_url text,
  
  -- Emergency Contact for under 16
  parent_name text,
  parent_relationship text,
  parent_address text,
  parent_home_phone text,
  parent_mobile_phone text,
  parent_email text,
  
  -- Declaration
  terms_accepted boolean not null check (terms_accepted = true),
  status text not null check (status in ('pending', 'approved', 'rejected')) default 'pending',
  created_at timestamptz default now()
);

-- Enable RLS on registrations
alter table registrations enable row level security;

-- Drop existing policies if any
drop policy if exists "Allow public insert registrations" on registrations;
drop policy if exists "Allow admin manage registrations" on registrations;

-- Create policies for registrations
create policy "Allow public insert registrations" on registrations
  for insert with check (true);

create policy "Allow admin manage registrations" on registrations
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );
