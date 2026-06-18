-- 002_tables.sql
-- Create all tables in dependency order

-- =============================================
-- profiles (extends auth.users)
-- =============================================
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  phone       text,
  avatar_url  text,
  role        text not null check (role in ('admin', 'coach', 'student')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- =============================================
-- facilities — Cơ sở tập luyện
-- =============================================
create table if not exists facilities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text,
  description text,
  phone       text,
  status      text default 'active' check (status in ('active', 'inactive')),
  created_at  timestamptz default now()
);

-- =============================================
-- courts — Sân cầu lông
-- =============================================
create table if not exists courts (
  id           uuid primary key default gen_random_uuid(),
  facility_id  uuid not null references facilities(id) on delete cascade,
  name         text not null,
  court_number int,
  status       text default 'available' check (status in ('available', 'maintenance', 'closed')),
  created_at   timestamptz default now()
);

-- =============================================
-- coaches — Huấn luyện viên
-- =============================================
create table if not exists coaches (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id) on delete cascade,
  specialty         text,
  experience_years  int default 0,
  bio               text,
  certifications    text[],
  status            text default 'active' check (status in ('active', 'inactive')),
  created_at        timestamptz default now()
);

-- =============================================
-- students — Học viên
-- =============================================
create table if not exists students (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references profiles(id) on delete cascade,
  skill_level        text default 'beginner'
                       check (skill_level in ('beginner', 'intermediate', 'advanced')),
  date_of_birth      date,
  emergency_contact  text,
  notes              text,
  status             text default 'active' check (status in ('active', 'inactive')),
  created_at         timestamptz default now()
);

-- =============================================
-- packages — Gói học (template)
-- =============================================
create table if not exists packages (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  package_type    text not null check (package_type in ('session', 'monthly')),
  sessions_count  int,           -- NULL nếu monthly
  validity_days   int not null,
  price           numeric(12,0) not null,
  description     text,
  is_featured     boolean default false,
  sort_order      int default 0,
  status          text default 'active' check (status in ('active', 'inactive')),
  created_at      timestamptz default now()
);

-- =============================================
-- classes — Lớp học
-- =============================================
create table if not exists classes (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  coach_id       uuid references coaches(id),
  facility_id    uuid references facilities(id),
  court_id       uuid references courts(id),
  max_students   int default 15,
  skill_level    text check (skill_level in ('beginner', 'intermediate', 'advanced', 'kids', 'all')),
  schedule_days  text[],
  schedule_time  time,
  duration_min   int default 90,
  description    text,
  status         text default 'active' check (status in ('active', 'inactive', 'full')),
  created_at     timestamptz default now()
);

-- =============================================
-- class_students — Học viên trong lớp
-- =============================================
create table if not exists class_students (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references classes(id) on delete cascade,
  student_id  uuid not null references students(id) on delete cascade,
  joined_at   timestamptz default now(),
  status      text default 'active' check (status in ('active', 'inactive', 'graduated')),
  unique (class_id, student_id)
);

-- =============================================
-- sessions — Buổi học
-- =============================================
create table if not exists sessions (
  id              uuid primary key default gen_random_uuid(),
  class_id        uuid not null references classes(id) on delete cascade,
  court_id        uuid references courts(id),
  scheduled_at    timestamptz not null,
  duration_min    int default 90,
  status          text default 'scheduled'
                    check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  cancel_reason   text,
  notes           text,
  created_by      uuid references profiles(id),
  created_at      timestamptz default now()
);

-- =============================================
-- attendance — Điểm danh
-- =============================================
create table if not exists attendance (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references sessions(id) on delete cascade,
  student_id  uuid not null references students(id),
  status      text not null check (status in ('present', 'absent', 'late', 'excused')),
  checked_at  timestamptz default now(),
  checked_by  uuid references profiles(id),
  notes       text,
  unique (session_id, student_id)
);

-- =============================================
-- student_packages — Thẻ tập của học viên
-- =============================================
create table if not exists student_packages (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references students(id),
  package_id          uuid not null references packages(id),
  purchased_at        timestamptz default now(),
  activated_at        timestamptz,
  expires_at          timestamptz,
  sessions_total      int,
  sessions_remaining  int,
  status              text default 'pending_activation'
    check (status in ('pending_activation', 'active', 'expired', 'depleted')),
  notes               text,
  created_by          uuid references profiles(id),
  created_at          timestamptz default now()
);

-- =============================================
-- payments — Thanh toán
-- =============================================
create table if not exists payments (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references students(id),
  student_package_id  uuid not null references student_packages(id),
  amount              numeric(12,0) not null,
  payment_method      text check (payment_method in ('cash', 'transfer', 'card', 'other')),
  status              text default 'paid' check (status in ('paid', 'pending', 'refunded')),
  paid_at             timestamptz default now(),
  received_by         uuid references profiles(id),
  notes               text,
  created_at          timestamptz default now()
);

-- =============================================
-- progress_evaluations — Đánh giá tiến độ
-- =============================================
create table if not exists progress_evaluations (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references students(id),
  coach_id       uuid not null references coaches(id),
  session_id     uuid references sessions(id),
  overall_score  int check (overall_score between 0 and 100),
  skills         jsonb,
  notes          text,
  created_at     timestamptz default now()
);

-- =============================================
-- notifications — Thông báo
-- =============================================
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  title       text not null,
  body        text,
  type        text check (type in (
    'card_expiring_sessions',
    'card_expiring_days',
    'card_expired',
    'session_cancelled',
    'card_assigned',
    'general',
    'class_enrolled',
    'package_grant',
    'session_cancel'
  )),
  read_at     timestamptz,
  metadata    jsonb,
  created_at  timestamptz default now()
);
