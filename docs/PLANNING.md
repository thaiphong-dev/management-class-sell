# PLANNING — ShuttleClass
> Ứng dụng quản lý lớp học cầu lông chuyên nghiệp

---

## 1. Tổng quan sản phẩm

**ShuttleClass** là web app quản lý toàn diện cho câu lạc bộ / trung tâm cầu lông, gồm 3 vai trò:

| Vai trò | Mô tả |
|---|---|
| **Admin** | Quản lý toàn hệ thống: người dùng, lớp học, gói học, tài chính, báo cáo |
| **Huấn luyện viên (HLV)** | Quản lý lớp được phân công, tạo buổi học, điểm danh, đánh giá học viên |
| **Học viên** | Xem lịch học, theo dõi điểm danh, tiến độ, thẻ tập |

---

## 2. Tech Stack

| Layer | Công nghệ | Lý do chọn |
|---|---|---|
| Frontend | **React 18 + Vite + TypeScript** | Nhanh, type-safe, HMR tốt |
| UI Components | **Tailwind CSS + shadcn/ui** | Đẹp, nhất quán, dễ tùy biến |
| Backend / DB | **Supabase** (PostgreSQL + Auth + Storage + Realtime) | BaaS mạnh, RLS sẵn, không cần viết API |
| Charts | **Recharts** | Nhẹ, tích hợp React tốt |
| Forms | **React Hook Form + Zod** | Validation type-safe |
| Global State | **Zustand** | Đơn giản, không boilerplate |
| PWA | **vite-plugin-pwa** | Dùng được trên mobile như native app |
| Deploy | **Vercel** (frontend) + **Supabase Cloud** (backend) | CI/CD tự động, free tier đủ dùng |

---

## 3. Kiến trúc Database

### 3.1 Sơ đồ quan hệ (ERD tóm tắt)

```
auth.users
    └── profiles (id, full_name, phone, avatar_url, role, created_at)
              ├── coaches (id, user_id, specialty, experience_years, bio)
              └── students (id, user_id, skill_level, dob, emergency_contact)

facilities (id, name, address, status)
    └── courts (id, facility_id, name, status)

classes (id, name, coach_id→coaches, facility_id, court_id, max_students,
         skill_level, schedule_days[], schedule_time, status)
    ├── class_students (class_id, student_id, joined_at, status)
    └── sessions (id, class_id, court_id, scheduled_at, duration_min, status, notes)
              └── attendance (id, session_id, student_id,
                             status: present|absent|late|excused, checked_at, notes)

packages (id, name, package_type: session|monthly, sessions_count,
          validity_days, price, description, status)
    └── student_packages (id, student_id, package_id,
                          purchased_at, activated_at, expires_at,
                          sessions_total, sessions_remaining,
                          status: pending_activation|active|expired|depleted)
              └── payments (id, student_id, student_package_id,
                           amount, payment_method, status, paid_at)

progress_evaluations (id, student_id, coach_id, session_id,
                      overall_score, skills JSONB, notes, created_at)

notifications (id, user_id, title, body, type, read_at, metadata JSONB, created_at)
```

### 3.2 Logic Gói Học (Membership Card)

**Hai loại gói:**

| Loại | `package_type` | Hết thẻ khi |
|---|---|---|
| Gói theo buổi | `session` | Hết buổi (`sessions_remaining = 0`) HOẶC hết hạn |
| Gói theo tháng | `monthly` | Chỉ khi hết hạn thời gian (buổi còn lại không mang sang) |

**Vòng đời thẻ (`student_packages.status`):**
```
Mua gói → pending_activation
             ↓  (kích hoạt thủ công hoặc tự động buổi đầu tiên)
           active
             ↓
    ┌── sessions_remaining = 0  → depleted
    └── NOW() > expires_at      → expired
```

**Deduction flow** (trigger khi HLV lưu điểm danh `present` / `late`):
```sql
-- Tìm thẻ active của học viên
-- Nếu package_type = 'session': sessions_remaining -= 1
-- Kiểm tra → cập nhật status nếu cần
-- Tạo notification nếu sessions_remaining IN (3, 1) hoặc expires_at - NOW() IN (7d, 3d)
```

**Kích hoạt tự động:**
- Lần điểm danh đầu tiên của học viên sau khi mua gói `pending_activation`
  → set `activated_at = NOW()`, `expires_at = NOW() + validity_days`, `status = 'active'`

### 3.3 RLS Policies (Row Level Security)

| Bảng | Admin | HLV | Học viên |
|---|---|---|---|
| profiles | Full | Read own | Read/Update own |
| classes | Full | Read assigned | Read own class |
| sessions | Full | CRUD own class | Read own class |
| attendance | Full | CRUD own sessions | Read own |
| student_packages | Full | Read (học viên lớp mình) | Read own |
| progress_evaluations | Full | CRUD own | Read own |
| payments | Full | — | Read own |

---

## 4. Cấu trúc thư mục

```
src/
├── components/
│   ├── ui/                        # shadcn/ui (Button, Input, Dialog, Table...)
│   ├── layout/
│   │   ├── AppLayout.tsx          # Sidebar + Header + Outlet
│   │   ├── Sidebar.tsx            # Nav items theo role
│   │   └── Header.tsx             # Notification bell, avatar, breadcrumb
│   ├── attendance/
│   │   ├── AttendanceSheet.tsx    # Toggle present/absent/late per học viên
│   │   └── AttendanceStats.tsx    # Summary 3 số: có mặt, vắng, trễ
│   ├── packages/
│   │   ├── PackageCard.tsx        # Thẻ vật lý gradient
│   │   ├── PackageProgress.tsx    # Progress bar buổi còn lại
│   │   └── CardExpiryAlert.tsx    # Banner cảnh báo thẻ sắp hết
│   ├── classes/
│   │   ├── ClassCard.tsx
│   │   └── ClassStudentList.tsx
│   ├── progress/
│   │   ├── SkillRadar.tsx         # Recharts RadarChart
│   │   └── EvaluationForm.tsx
│   └── charts/
│       ├── RevenueBarChart.tsx    # Recharts BarChart doanh thu
│       └── AttendanceRateChart.tsx
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx
│   ├── admin/
│   │   ├── DashboardPage.tsx      # KPI + charts + today sessions
│   │   ├── UsersPage.tsx          # CRUD admin/HLV/học viên
│   │   ├── FacilitiesPage.tsx     # CRUD cơ sở + sân
│   │   ├── ClassesPage.tsx        # CRUD lớp, phân công HLV
│   │   ├── PackagesPage.tsx       # CRUD gói học + quản lý thẻ học viên
│   │   └── ReportsPage.tsx        # Doanh thu, điểm danh, học viên mới
│   ├── coach/
│   │   ├── DashboardPage.tsx      # Buổi hôm nay, lịch tuần
│   │   ├── ClassesPage.tsx        # Lớp được phân công
│   │   ├── SessionsPage.tsx       # CRUD buổi học của lớp
│   │   ├── AttendancePage.tsx     # Điểm danh buổi học
│   │   └── ProgressPage.tsx       # Đánh giá & xem tiến độ học viên
│   └── student/
│       ├── DashboardPage.tsx      # Tổng quan, alert thẻ sắp hết
│       ├── SchedulePage.tsx       # Lịch học (calendar view)
│       ├── AttendancePage.tsx     # Lịch sử điểm danh
│       ├── ProgressPage.tsx       # Kỹ năng + nhận xét HLV
│       └── PackagesPage.tsx       # Thẻ đang dùng, mua gói mới, lịch sử
├── hooks/
│   ├── useAuth.ts                 # Session + profile + role
│   ├── useClasses.ts
│   ├── useSessions.ts
│   ├── useAttendance.ts           # + deduct logic
│   ├── useStudentPackage.ts       # Active card, expiry check
│   └── useNotifications.ts        # Realtime + mark-read
├── lib/
│   ├── supabase.ts                # createClient singleton
│   ├── deductSession.ts           # Logic trừ buổi khi điểm danh
│   └── utils.ts                   # cn(), formatDate(), formatCurrency()
├── types/
│   └── index.ts                   # Database row types + enums
├── contexts/
│   └── AuthContext.tsx             # Provider + useAuthContext()
├── stores/
│   └── useAppStore.ts             # Zustand: sidebar open state, etc.
└── router.tsx                     # React Router v6 + role-based guards
```

---

## 5. Routing

```
/                           → redirect dựa theo role
/login
/register

# Admin
/admin/dashboard
/admin/users
/admin/users/:id
/admin/facilities
/admin/classes
/admin/classes/:id          → detail + danh sách học viên
/admin/packages             → gói học + bảng thẻ học viên
/admin/reports

# HLV
/coach/dashboard
/coach/classes
/coach/classes/:id/sessions
/coach/classes/:id/sessions/:sessionId/attendance
/coach/students/:studentId/progress

# Học viên
/student/dashboard
/student/schedule
/student/attendance
/student/progress
/student/packages
```

---

## 6. Tính năng chi tiết theo Role

### 6.1 Admin

#### Dashboard
- KPI cards: Tổng học viên, Lớp đang hoạt động, Doanh thu tháng, Buổi học hôm nay
- Bar chart doanh thu 6 tháng (Recharts)
- Danh sách thẻ sắp hết hạn (badge đỏ/vàng)
- Bảng buổi học hôm nay: lớp, HLV, sân, giờ, trạng thái

#### Quản lý người dùng
- Tab: Admin | HLV | Học viên
- CRUD với form modal (React Hook Form + Zod)
- Đặt lại mật khẩu qua Supabase Auth
- Phân quyền: thay đổi `profiles.role`

#### Quản lý cơ sở
- CRUD cơ sở (facility): tên, địa chỉ, mô tả
- CRUD sân (court) thuộc cơ sở: tên sân, trạng thái (available/maintenance)

#### Quản lý lớp học
- CRUD lớp: tên, HLV, cơ sở, sân, lịch (schedule_days + giờ), trình độ, sĩ số tối đa
- Tab "Học viên" trong detail: add/remove học viên, xem thẻ của từng học viên

#### Gói học & Thẻ
- CRUD gói học: tên, loại (session/monthly), số buổi, hạn dùng (ngày), giá
- Bảng thẻ học viên: filter theo status (active/expiring/expired/depleted)
- Action: Cấp thẻ mới, Kích hoạt thủ công, Gia hạn, Xem lịch sử

#### Báo cáo
- Doanh thu theo tháng/quý/năm (bar + line chart)
- Tỷ lệ điểm danh trung bình theo lớp
- Học viên mới theo tháng
- Thẻ sắp hết / đã hết theo kỳ

### 6.2 Huấn luyện viên

#### Dashboard
- Card "Buổi học tiếp theo" với nút "Điểm danh →"
- Lịch tuần dạng grid 7 cột
- Thông báo mới

#### Quản lý lớp
- Danh sách lớp được phân công
- Chi tiết lớp: danh sách học viên + trạng thái thẻ (cảnh báo nếu sắp hết)

#### Buổi học
- Tạo buổi học cho lớp: ngày, giờ, sân, ghi chú
- Hủy buổi học (với lý do, tự động gửi thông báo cho học viên)

#### Điểm danh
- Danh sách học viên với 3 nút toggle: **Có mặt / Vắng / Trễ**
- Hiển thị số buổi còn lại + ngày hết hạn thẻ của từng học viên
- Cảnh báo inline nếu học viên sắp hết thẻ
- Lưu điểm danh → trigger deductSession() tự động trừ buổi

#### Đánh giá học viên
- Form đánh giá: kỹ thuật đánh, di chuyển sân, chiến thuật, thể lực (0–100)
- Nhận xét tự do
- Xem lịch sử đánh giá của từng học viên (line chart tiến độ)

### 6.3 Học viên

#### Dashboard
- Alert đỏ/vàng nếu thẻ còn ≤ 3 buổi hoặc ≤ 7 ngày
- 4 KPI: buổi còn lại, buổi đã học, % chuyên cần, ngày đến hạn
- Lịch sử điểm danh 5 buổi gần nhất
- Skill bars (kỹ năng từ đánh giá HLV)

#### Lịch học
- Calendar view (month/week) — các buổi học của lớp mình
- Click vào buổi: xem chi tiết (giờ, sân, HLV)

#### Điểm danh
- Bảng lịch sử: ngày, lớp, HLV, trạng thái (có mặt/vắng/trễ)
- Filter theo tháng, tỷ lệ chuyên cần

#### Tiến độ
- Radar chart 4 kỹ năng (Recharts)
- Lịch sử nhận xét của HLV theo thời gian

#### Thẻ tập
- **Thẻ đang dùng**: gradient card hiển thị buổi còn lại, ngày hết hạn, progress bar
- **Mua gói mới**: grid các gói, chọn gói → admin xác nhận + ghi nhận thanh toán
- **Lịch sử thẻ**: bảng tất cả thẻ đã mua

---

## 7. Notification System

### Trigger tự động
| Sự kiện | Người nhận | Nội dung |
|---|---|---|
| Thẻ còn 3 buổi | Học viên + Admin | "Thẻ của bạn còn 3 buổi, hãy gia hạn sớm" |
| Thẻ còn 1 buổi | Học viên + Admin | "Thẻ của bạn chỉ còn 1 buổi cuối cùng!" |
| Thẻ còn 7 ngày | Học viên + Admin | "Thẻ hết hạn sau 7 ngày" |
| Thẻ còn 3 ngày | Học viên + Admin | "Thẻ hết hạn sau 3 ngày – hành động ngay!" |
| HLV hủy buổi học | Học viên trong lớp | "Buổi học [ngày] bị hủy – lý do: ..." |
| Admin cấp thẻ mới | Học viên | "Thẻ [gói] đã được cấp cho bạn" |

### Realtime
- Dùng Supabase Realtime subscribe vào bảng `notifications` với filter `user_id = auth.uid()`
- Bell icon hiển thị badge số thông báo chưa đọc
- Dropdown danh sách thông báo

---

## 8. PWA

```
vite-plugin-pwa config:
  manifest:
    name: ShuttleClass
    short_name: ShuttleClass
    theme_color: #0ea5e9
    display: standalone
  workbox:
    runtimeCaching: network-first cho API calls
```

- Có thể cài lên home screen (Android/iOS)
- Offline fallback cho trang đã cache
- Push notification (web push) — Phase 5+

---

## 9. Thứ tự phát triển

### Phase 1 — Foundation (Tuần 1–2)
- [ ] Scaffold: `npm create vite@latest shuttleclass -- --template react-ts`
- [ ] Cài: Tailwind CSS, shadcn/ui, Supabase client, React Router v6, Zustand, RHF + Zod
- [ ] Tạo Supabase project + chạy SQL migration (tất cả bảng + RLS)
- [ ] Auth flow: Login → redirect theo role, Logout, Protected routes
- [ ] `AppLayout`: Sidebar responsive (collapsible mobile) + Header

### Phase 2 — Core Management (Tuần 3–4)
- [ ] Admin: CRUD Facilities & Courts
- [ ] Admin: CRUD Users (Admin / HLV / Học viên) + invite by email
- [ ] Admin: CRUD Classes + phân công HLV + add/remove học viên
- [ ] Coach: CRUD Sessions (tạo buổi học cho lớp)

### Phase 3 — Attendance + Deduction (Tuần 5)
- [ ] Coach: Attendance sheet (toggle 3 trạng thái)
- [ ] `deductSession()`: logic trừ buổi + cập nhật status thẻ + trigger notification
- [ ] `activatePackage()`: kích hoạt tự động buổi đầu tiên
- [ ] Student: Attendance history page
- [ ] HLV: Đánh giá tiến độ học viên + Student: Skill progress view

### Phase 4 — Finance (Tuần 6)
- [ ] Admin: CRUD Packages (session/monthly)
- [ ] Admin: Cấp thẻ cho học viên + kích hoạt + ghi nhận thanh toán
- [ ] Student: Packages page (thẻ đang dùng + mua gói mới)
- [ ] Admin: Reports page (Recharts charts)
- [ ] Admin Dashboard: KPI cards + Revenue chart

### Phase 5 — Notifications + Polish (Tuần 7–8)
- [ ] Supabase Realtime notifications
- [ ] Email notifications via Supabase Edge Functions
- [ ] PWA: `vite-plugin-pwa` + manifest + service worker
- [ ] Mobile responsive polish (test trên các breakpoint)
- [ ] Loading states, error boundaries, empty states
- [ ] Lighthouse audit ≥ 90

---

## 10. Environment Variables

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 11. SQL Migration (Tóm tắt)

```sql
-- Chạy trong Supabase SQL Editor

-- 1. Profiles
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  phone text,
  avatar_url text,
  role text not null check (role in ('admin','coach','student')),
  created_at timestamptz default now()
);

-- 2. Facilities & Courts
create table facilities (id uuid primary key default gen_random_uuid(), name text not null, address text, description text, status text default 'active');
create table courts (id uuid primary key default gen_random_uuid(), facility_id uuid references facilities, name text not null, status text default 'available');

-- 3. Coaches & Students
create table coaches (id uuid primary key default gen_random_uuid(), user_id uuid references profiles, specialty text, experience_years int, bio text, status text default 'active');
create table students (id uuid primary key default gen_random_uuid(), user_id uuid references profiles, skill_level text default 'beginner', dob date, emergency_contact text, status text default 'active');

-- 4. Classes
create table classes (
  id uuid primary key default gen_random_uuid(),
  name text not null, coach_id uuid references coaches,
  facility_id uuid references facilities, court_id uuid references courts,
  max_students int default 15, skill_level text,
  schedule_days text[], schedule_time time, status text default 'active'
);
create table class_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes, student_id uuid references students,
  joined_at timestamptz default now(), status text default 'active'
);

-- 5. Sessions & Attendance
create table sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes, court_id uuid references courts,
  scheduled_at timestamptz not null, duration_minutes int default 90,
  status text default 'scheduled', notes text
);
create table attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions, student_id uuid references students,
  status text check (status in ('present','absent','late','excused')),
  checked_at timestamptz default now(), notes text
);

-- 6. Packages & Student Packages
create table packages (
  id uuid primary key default gen_random_uuid(),
  name text not null, package_type text check (package_type in ('session','monthly')),
  sessions_count int, validity_days int not null, price numeric not null,
  description text, status text default 'active'
);
create table student_packages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students, package_id uuid references packages,
  purchased_at timestamptz default now(), activated_at timestamptz,
  expires_at timestamptz, sessions_total int, sessions_remaining int,
  status text default 'pending_activation'
    check (status in ('pending_activation','active','expired','depleted'))
);

-- 7. Payments
create table payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students,
  student_package_id uuid references student_packages,
  amount numeric not null, payment_method text, status text default 'paid',
  paid_at timestamptz default now(), notes text
);

-- 8. Progress Evaluations
create table progress_evaluations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students, coach_id uuid references coaches,
  session_id uuid references sessions,
  overall_score int, skills jsonb, notes text, created_at timestamptz default now()
);

-- 9. Notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles,
  title text not null, body text, type text,
  read_at timestamptz, metadata jsonb, created_at timestamptz default now()
);
```

---

## 12. Verification Checklist

- [ ] Đăng nhập với 3 role → redirect đúng page
- [ ] Admin tạo lớp + phân công HLV → HLV thấy trong dashboard
- [ ] HLV tạo buổi học → học viên thấy trong lịch
- [ ] HLV điểm danh `present` → `sessions_remaining` giảm 1 đúng
- [ ] Thẻ 12 buổi: sau 12 buổi → `status = depleted`
- [ ] Thẻ monthly: hết 30 ngày → `status = expired` dù còn buổi
- [ ] Thẻ còn 3 buổi → notification được tạo đúng
- [ ] Kích hoạt tự động: buổi đầu tiên sau khi mua thẻ → `activated_at` được set
- [ ] RLS: học viên A không thể đọc thẻ của học viên B
- [ ] PWA: lighthouse score ≥ 90, install prompt hiện trên mobile Chrome
