# DATABASE.md — ShuttleClass
> Tài liệu schema đầy đủ, quan hệ bảng, RLS policies, logic nghiệp vụ database.

---

## 1. Tổng quan

- **Database:** PostgreSQL (Supabase)
- **Auth:** Supabase Auth (`auth.users`)
- **Storage:** Supabase Storage (avatar, tài liệu)
- **Realtime:** Bảng `notifications` subscribe realtime

---

## 2. Schema đầy đủ

### 2.1 `profiles`
Mở rộng từ `auth.users`. Mỗi user có đúng 1 profile.

```sql
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  phone       text,
  avatar_url  text,
  role        text not null check (role in ('admin', 'coach', 'student')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
-- Trigger: tự tạo profile khi user đăng ký
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'role');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

### 2.2 `facilities` — Cơ sở tập luyện
```sql
create table facilities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text,
  description text,
  phone       text,
  status      text default 'active' check (status in ('active', 'inactive')),
  created_at  timestamptz default now()
);
```

### 2.3 `courts` — Sân cầu lông
```sql
create table courts (
  id           uuid primary key default gen_random_uuid(),
  facility_id  uuid not null references facilities(id) on delete cascade,
  name         text not null,        -- VD: "Sân 1", "Sân A"
  court_number int,
  status       text default 'available' check (status in ('available', 'maintenance', 'closed')),
  created_at   timestamptz default now()
);
```

### 2.4 `coaches` — Huấn luyện viên
```sql
create table coaches (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id) on delete cascade,
  specialty         text,             -- VD: "Đánh đơn", "Đánh đôi"
  experience_years  int default 0,
  bio               text,
  certifications    text[],
  status            text default 'active' check (status in ('active', 'inactive')),
  created_at        timestamptz default now()
);
```

### 2.5 `students` — Học viên
```sql
create table students (
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
```

### 2.6 `classes` — Lớp học
```sql
create table classes (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  coach_id       uuid references coaches(id),
  facility_id    uuid references facilities(id),
  court_id       uuid references courts(id),
  max_students   int default 15,
  skill_level    text check (skill_level in ('beginner', 'intermediate', 'advanced', 'kids', 'all')),
  schedule_days  text[],             -- VD: ['mon', 'wed', 'fri']
  schedule_time  time,               -- VD: 07:00:00
  duration_min   int default 90,
  description    text,
  status         text default 'active' check (status in ('active', 'inactive', 'full')),
  created_at     timestamptz default now()
);
```

### 2.7 `class_students` — Học viên trong lớp
```sql
create table class_students (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references classes(id) on delete cascade,
  student_id  uuid not null references students(id) on delete cascade,
  joined_at   timestamptz default now(),
  status      text default 'active' check (status in ('active', 'inactive', 'graduated')),
  unique (class_id, student_id)
);
```

### 2.8 `sessions` — Buổi học
```sql
create table sessions (
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
```

### 2.9 `attendance` — Điểm danh
```sql
create table attendance (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references sessions(id) on delete cascade,
  student_id  uuid not null references students(id),
  status      text not null check (status in ('present', 'absent', 'late', 'excused')),
  checked_at  timestamptz default now(),
  checked_by  uuid references profiles(id),  -- HLV điểm danh
  notes       text,
  unique (session_id, student_id)
);
```

### 2.10 `packages` — Gói học (template)
```sql
create table packages (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  package_type    text not null check (package_type in ('session', 'monthly')),
  sessions_count  int,               -- NULL nếu monthly không giới hạn buổi
  validity_days   int not null,      -- Số ngày hiệu lực từ ngày kích hoạt
  price           numeric(12,0) not null,
  description     text,
  is_featured     boolean default false,
  sort_order      int default 0,
  status          text default 'active' check (status in ('active', 'inactive')),
  created_at      timestamptz default now()
);
```

### 2.11 `student_packages` — Thẻ tập của học viên
```sql
create table student_packages (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references students(id),
  package_id          uuid not null references packages(id),
  purchased_at        timestamptz default now(),
  activated_at        timestamptz,       -- NULL = chưa kích hoạt
  expires_at          timestamptz,       -- = activated_at + validity_days
  sessions_total      int,               -- Copy từ package.sessions_count khi mua
  sessions_remaining  int,               -- Giảm dần khi điểm danh
  status              text default 'pending_activation'
    check (status in ('pending_activation', 'active', 'expired', 'depleted')),
  notes               text,
  created_by          uuid references profiles(id),  -- Admin cấp thẻ
  created_at          timestamptz default now()
);
```

**Indexes quan trọng:**
```sql
create index idx_student_packages_student_id on student_packages(student_id);
create index idx_student_packages_status on student_packages(status);
create index idx_student_packages_expires_at on student_packages(expires_at);
```

### 2.12 `payments` — Thanh toán
```sql
create table payments (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references students(id),
  student_package_id  uuid not null references student_packages(id),
  amount              numeric(12,0) not null,
  payment_method      text check (payment_method in ('cash', 'transfer', 'card', 'other')),
  status              text default 'paid' check (status in ('paid', 'pending', 'refunded')),
  paid_at             timestamptz default now(),
  received_by         uuid references profiles(id),  -- Admin nhận tiền
  notes               text,
  created_at          timestamptz default now()
);
```

### 2.13 `progress_evaluations` — Đánh giá tiến độ
```sql
create table progress_evaluations (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references students(id),
  coach_id       uuid not null references coaches(id),
  session_id     uuid references sessions(id),
  overall_score  int check (overall_score between 0 and 100),
  skills         jsonb,
  -- skills format: { "technique": 72, "footwork": 65, "tactics": 55, "fitness": 80 }
  notes          text,
  created_at     timestamptz default now()
);
```

### 2.14 `notifications` — Thông báo
```sql
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  title       text not null,
  body        text,
  type        text check (type in (
    'card_expiring_sessions',  -- Thẻ sắp hết buổi
    'card_expiring_days',      -- Thẻ sắp hết hạn ngày
    'card_expired',            -- Thẻ đã hết
    'session_cancelled',       -- Buổi học bị hủy
    'card_assigned',           -- Admin cấp thẻ
    'general'
  )),
  read_at     timestamptz,
  metadata    jsonb,
  -- metadata format: { "student_package_id": "...", "sessions_remaining": 2 }
  created_at  timestamptz default now()
);
-- Index cho realtime query
create index idx_notifications_user_id on notifications(user_id);
create index idx_notifications_read_at on notifications(read_at) where read_at is null;
```

---

## 3. Logic nghiệp vụ Database

### 3.1 Kích hoạt thẻ (`pending_activation` → `active`)

**Tự động** (trigger khi insert `attendance` với `status = 'present' | 'late'`):
```sql
create or replace function activate_pending_package()
returns trigger as $$
declare
  pkg student_packages;
begin
  -- Chỉ kích hoạt nếu status là present hoặc late
  if new.status not in ('present', 'late') then return new; end if;

  -- Tìm thẻ pending_activation của học viên
  select * into pkg
  from student_packages
  where student_id = new.student_id
    and status = 'pending_activation'
  order by purchased_at asc
  limit 1;

  if found then
    update student_packages set
      activated_at = now(),
      expires_at   = now() + (select validity_days || ' days' from packages where id = pkg.package_id)::interval,
      status       = 'active'
    where id = pkg.id;
  end if;

  return new;
end;
$$ language plpgsql security definer;
```

### 3.2 Trừ buổi (`deductSession`)

**Trigger sau insert `attendance`:**
```sql
create or replace function deduct_session_on_attendance()
returns trigger as $$
declare
  pkg student_packages;
begin
  if new.status not in ('present', 'late') then return new; end if;

  -- Tìm thẻ active theo buổi (session type)
  select sp.* into pkg
  from student_packages sp
  join packages p on p.id = sp.package_id
  where sp.student_id = new.student_id
    and sp.status = 'active'
    and p.package_type = 'session'
    and sp.expires_at > now()
    and sp.sessions_remaining > 0
  order by sp.activated_at asc
  limit 1;

  if not found then return new; end if;

  -- Trừ buổi
  update student_packages
  set sessions_remaining = sessions_remaining - 1,
      status = case
        when sessions_remaining - 1 <= 0 then 'depleted'
        else 'active'
      end
  where id = pkg.id;

  -- Gửi notification nếu còn 3 hoặc 1 buổi
  if pkg.sessions_remaining - 1 in (3, 1) then
    insert into notifications (user_id, title, body, type, metadata)
    select
      s.user_id,
      case when pkg.sessions_remaining - 1 = 3
        then 'Thẻ tập sắp hết!'
        else 'Buổi học cuối cùng!'
      end,
      case when pkg.sessions_remaining - 1 = 3
        then 'Thẻ của bạn còn 3 buổi. Hãy gia hạn sớm để không bị gián đoạn.'
        else 'Đây là buổi học cuối cùng trong thẻ của bạn!'
      end,
      'card_expiring_sessions',
      jsonb_build_object('student_package_id', pkg.id, 'sessions_remaining', pkg.sessions_remaining - 1)
    from students s where s.id = new.student_id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger after_attendance_insert
  after insert on attendance
  for each row execute function deduct_session_on_attendance();
```

### 3.3 Kiểm tra thẻ hết hạn theo ngày

Chạy scheduled job (Supabase Edge Function hoặc pg_cron) mỗi ngày lúc 00:00:
```sql
-- Cập nhật thẻ hết hạn
update student_packages
set status = 'expired'
where status = 'active' and expires_at < now();

-- Gửi notification thẻ còn 7 ngày / 3 ngày
insert into notifications (user_id, title, body, type, metadata)
select
  s.user_id,
  'Thẻ tập sắp hết hạn',
  'Thẻ của bạn sẽ hết hạn sau ' || extract(day from (sp.expires_at - now()))::int || ' ngày.',
  'card_expiring_days',
  jsonb_build_object('student_package_id', sp.id, 'expires_at', sp.expires_at, 'days_remaining', extract(day from (sp.expires_at - now()))::int)
from student_packages sp
join students s on s.id = sp.student_id
where sp.status = 'active'
  and sp.expires_at between now() and now() + interval '8 days'
  and extract(day from (sp.expires_at - now()))::int in (7, 3)
  and not exists (
    select 1 from notifications n
    where n.metadata->>'student_package_id' = sp.id::text
      and n.type = 'card_expiring_days'
      and n.created_at > now() - interval '1 day'
  );
```

---

## 4. RLS Policies

```sql
-- ======================== PROFILES ========================
alter table profiles enable row level security;
create policy "Users can read own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Admins full access" on profiles using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ======================== CLASSES ========================
alter table classes enable row level security;
create policy "All authenticated can view active classes" on classes for select
  using (auth.role() = 'authenticated' and status = 'active');
create policy "Admin full access classes" on classes using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ======================== SESSIONS ========================
alter table sessions enable row level security;
create policy "Students can view own class sessions" on sessions for select using (
  exists (
    select 1 from class_students cs
    join students s on s.id = cs.student_id
    where cs.class_id = sessions.class_id and s.user_id = auth.uid()
  )
);
create policy "Coach can manage own class sessions" on sessions using (
  exists (
    select 1 from classes c join coaches co on co.id = c.coach_id
    where c.id = sessions.class_id and co.user_id = auth.uid()
  )
);

-- ======================== ATTENDANCE ========================
alter table attendance enable row level security;
create policy "Students view own attendance" on attendance for select using (
  exists (select 1 from students where id = attendance.student_id and user_id = auth.uid())
);
create policy "Coach manage attendance in own sessions" on attendance using (
  exists (
    select 1 from sessions se join classes c on c.id = se.class_id
    join coaches co on co.id = c.coach_id
    where se.id = attendance.session_id and co.user_id = auth.uid()
  )
);

-- ======================== STUDENT_PACKAGES ========================
alter table student_packages enable row level security;
create policy "Students view own packages" on student_packages for select using (
  exists (select 1 from students where id = student_packages.student_id and user_id = auth.uid())
);
create policy "Coach view packages of own class students" on student_packages for select using (
  exists (
    select 1 from class_students cs
    join classes c on c.id = cs.class_id
    join coaches co on co.id = c.coach_id
    where cs.student_id = student_packages.student_id and co.user_id = auth.uid()
  )
);
create policy "Admin full access student_packages" on student_packages using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ======================== NOTIFICATIONS ========================
alter table notifications enable row level security;
create policy "Users view own notifications" on notifications for select using (user_id = auth.uid());
create policy "Users update own notifications (mark read)" on notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
```

---

## 5. Views hữu ích

```sql
-- View: Thẻ đang active với thông tin đầy đủ
create view active_student_packages as
select
  sp.*,
  p.name as package_name,
  p.package_type,
  pr.full_name as student_name,
  pr.phone as student_phone,
  case
    when sp.expires_at < now() + interval '3 days' then 'critical'
    when sp.expires_at < now() + interval '7 days' then 'warning'
    when sp.sessions_remaining <= 3 and p.package_type = 'session' then 'warning'
    else 'ok'
  end as alert_level
from student_packages sp
join packages p on p.id = sp.package_id
join students s on s.id = sp.student_id
join profiles pr on pr.id = s.user_id
where sp.status = 'active';
```

---

## 6. Enum Reference

| Field | Values |
|-------|--------|
| `profiles.role` | `admin`, `coach`, `student` |
| `students.skill_level` | `beginner`, `intermediate`, `advanced` |
| `classes.skill_level` | `beginner`, `intermediate`, `advanced`, `kids`, `all` |
| `sessions.status` | `scheduled`, `in_progress`, `completed`, `cancelled` |
| `attendance.status` | `present`, `absent`, `late`, `excused` |
| `packages.package_type` | `session`, `monthly` |
| `student_packages.status` | `pending_activation`, `active`, `expired`, `depleted` |
| `payments.payment_method` | `cash`, `transfer`, `card`, `other` |
| `courts.status` | `available`, `maintenance`, `closed` |
