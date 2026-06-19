-- 024_create_lesson_plans_and_assistants.sql
-- 1. Update profiles role check constraint to include 'assistant'
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('admin', 'coach', 'assistant', 'student', 'parent'));

-- 2. Create coach_assistants table
create table if not exists coach_assistants (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id) on delete cascade,
  assistant_id uuid not null references profiles(id) on delete cascade,
  assigned_at timestamptz default now(),
  unique(coach_id, assistant_id)
);

-- Enable RLS for coach_assistants
alter table coach_assistants enable row level security;

-- Policies for coach_assistants
drop policy if exists "Allow admins full access to coach_assistants" on coach_assistants;
create policy "Allow admins full access to coach_assistants"
  on coach_assistants for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Allow coaches to view their assigned assistants" on coach_assistants;
create policy "Allow coaches to view their assigned assistants"
  on coach_assistants for select using (
    coach_id = auth.uid()
  );

drop policy if exists "Allow assistants to view their assigned coaches" on coach_assistants;
create policy "Allow assistants to view their assigned coaches"
  on coach_assistants for select using (
    assistant_id = auth.uid()
  );

-- 3. Create lesson_plans table
create table if not exists lesson_plans (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  location text,
  duration_minutes int default 60,
  target_audience text, -- Nhóm/CLB/Cá nhân
  equipment text, -- Trang bị/Dụng cụ
  safety_check text default 'Không có vấn đề',
  objectives jsonb default '[]'::jsonb, -- ['Mục tiêu 1', 'Mục tiêu 2']
  exercises jsonb default '[]'::jsonb, -- [{name, description, objective_index, duration_minutes}]
  comments text,
  evaluation text,
  is_public boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS for lesson_plans
alter table lesson_plans enable row level security;

-- Policies for lesson_plans
drop policy if exists "Allow all users to select public lesson plans" on lesson_plans;
create policy "Allow all users to select public lesson plans"
  on lesson_plans for select using (
    is_public = true
  );

drop policy if exists "Allow creators full access to their lesson plans" on lesson_plans;
create policy "Allow creators full access to their lesson plans"
  on lesson_plans for all using (
    creator_id = auth.uid()
  );

drop policy if exists "Allow admins full access to all lesson plans" on lesson_plans;
create policy "Allow admins full access to all lesson plans"
  on lesson_plans for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Allow assistants to view lesson plans of their leader coaches" on lesson_plans;
create policy "Allow assistants to view lesson plans of their leader coaches"
  on lesson_plans for select using (
    exists (
      select 1 from coach_assistants ca
      where ca.assistant_id = auth.uid() and ca.coach_id = lesson_plans.creator_id
    )
  );

-- 4. Update sessions table to reference lesson_plans
alter table sessions add column if not exists lesson_plan_id uuid references lesson_plans(id) on delete set null;
