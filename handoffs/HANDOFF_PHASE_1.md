# Handoff: Phase 1 — Nền tảng (Foundation)

## Tóm tắt
Khởi tạo project React 18 + Vite + TypeScript, cấu hình Tailwind CSS + shadcn/ui với màu đỏ/xanh cầu lông,
chạy toàn bộ 8 migrations lên Supabase (14 bảng + triggers + RLS + views), seed 5 test accounts,
và xây dựng auth flow đầy đủ cùng AppLayout với sidebar responsive.

## Tính năng đã implement

| Tính năng | File chính | Status |
|-----------|-----------|--------|
| Project scaffold (Vite + React + TS) | package.json, vite.config.ts, tsconfig.json | ✅ Done |
| Tailwind CSS + shadcn/ui setup | tailwind.config.ts, src/index.css, components.json | ✅ Done |
| Supabase client | src/lib/supabase.ts | ✅ Done |
| TypeScript types (14 bảng) | src/types/database.types.ts, src/types/index.ts | ✅ Done |
| Auth Context (session + profile) | src/contexts/AuthContext.tsx | ✅ Done |
| Login page (dark glassmorphism UI) | src/pages/auth/LoginPage.tsx | ✅ Done |
| Protected routes (role guard) | src/components/auth/RequireAuth.tsx | ✅ Done |
| AppLayout (sidebar + header) | src/components/layout/AppLayout.tsx | ✅ Done |
| Sidebar (per-role nav, dark theme) | src/components/layout/Sidebar.tsx | ✅ Done |
| Header (title + notification bell) | src/components/layout/Header.tsx | ✅ Done |
| Admin Dashboard (KPI cards) | src/pages/admin/DashboardPage.tsx | ✅ Done |
| Coach Dashboard (lịch dạy) | src/pages/coach/DashboardPage.tsx | ✅ Done |
| Student Dashboard (thẻ học) | src/pages/student/DashboardPage.tsx | ✅ Done |
| React Router v6 (full routing) | src/App.tsx | ✅ Done |
| Zustand store (sidebar state) | src/stores/useAppStore.ts | ✅ Done |

## Database migrations đã chạy

| File | Nội dung | Status |
|------|----------|--------|
| 001_extensions.sql | uuid-ossp, pgcrypto | ✅ |
| 002_tables.sql | 14 bảng (profiles → notifications) | ✅ |
| 003_indexes.sql | 19 indexes | ✅ |
| 004_triggers.sql | handle_new_user, activate_package, deduct_session | ✅ |
| 005_rls.sql | RLS tất cả bảng | ✅ |
| 006_views.sql | active_student_packages, sessions_with_details, monthly_revenue | ✅ |
| 007_seed.sql | 1 facility, 4 courts, 4 packages | ✅ |
| 008_unique_constraints.sql | UNIQUE(user_id) cho coaches + students | ✅ |

## Functions / Hooks đã tạo

| Tên | File | Mô tả |
|-----|------|-------|
| `AuthProvider` | src/contexts/AuthContext.tsx | Context quản lý session + profile |
| `useAuthContext()` | src/contexts/AuthContext.tsx | Hook để dùng auth context |
| `RequireRole` | src/components/auth/RequireAuth.tsx | Layout route guard theo role |
| `PublicRoute` | src/components/auth/RequireAuth.tsx | Redirect nếu đã login |
| `RootRedirect` | src/components/auth/RequireAuth.tsx | Redirect / → dashboard theo role |
| `useAppStore` | src/stores/useAppStore.ts | Zustand: sidebar open/close state |
| `cn()` | src/lib/utils.ts | tailwind-merge + clsx |
| `formatCurrency()` | src/lib/utils.ts | Format VND |
| `formatDate()` | src/lib/utils.ts | Format ngày vi-VN |
| `formatDateTime()` | src/lib/utils.ts | Format ngày + giờ vi-VN |

## shadcn/ui components đã add

`button` · `input` · `label` · `badge` · `card` · `separator` · `avatar` · `dropdown-menu` · `toast` · `toaster`

## Chưa xử lý / Known Issues

- [x] ~~shadcn Toaster chưa được mount vào App.tsx~~ → **FIXED Phase 2**: `<Toaster />` đã mount trong `App.tsx` line 85
- [ ] Code splitting cần thêm lazy loading cho các pages — defer, không ảnh hưởng functionality
- [x] ~~Sidebar mobile: khi navigate, scroll position không reset~~ → **FIXED (bug-fix session sau Phase 6)**: `AppLayout.tsx` dùng `useRef + useEffect` scroll to top khi `location.pathname` thay đổi

---

## Hướng dẫn test (dành cho QC)

### Setup
1. Clone project, chạy `npm install`
2. Tạo `.env.local` với các giá trị từ Supabase (xem `.env.example`)
3. Chạy `npm run dev` → mở `http://localhost:5173`

### Test accounts
| Role | Email | Password |
|------|-------|---------|
| Admin | admin@shuttleclass.vn | Admin@123 |
| HLV 1 | coach1@shuttleclass.vn | Coach@123 |
| HLV 2 | coach2@shuttleclass.vn | Coach@123 |
| Học viên 1 | student1@shuttleclass.vn | Student@123 |
| Học viên 2 | student2@shuttleclass.vn | Student@123 |

### Test cases Phase 1

| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| A1 | Login Admin | Email admin, đúng PW | Redirect `/admin/dashboard`, sidebar hiện nav admin |
| A2 | Login HLV | Email coach1 | Redirect `/coach/dashboard`, sidebar hiện nav coach |
| A3 | Login HV | Email student1 | Redirect `/student/dashboard`, sidebar hiện nav student |
| A4 | Sai PW | Nhập PW sai | Hiện thông báo lỗi trong form |
| A5 | Truy cập sai role | Student vào `/admin/dashboard` | Redirect về `/student/dashboard` |
| A6 | Chưa login vào dashboard | Vào `/admin/dashboard` trực tiếp | Redirect về `/login` |
| A7 | Đã login vào /login | Vào `/login` khi đã có session | Redirect về dashboard tương ứng |
| A8 | Logout | Click "Đăng xuất" trong sidebar | Redirect về `/login`, session xóa |
| U1 | Responsive sidebar | Resize < 1024px | Sidebar ẩn, hamburger menu hiện |
| U2 | Mobile sidebar open | Click hamburger | Sidebar slide ra với overlay |
| U3 | KPI cards admin | Login admin | Hiện 4 KPI cards (có thể = 0 nếu chưa có data) |
| U4 | Student card | Login student1 | Card thẻ học hiện (chưa có thẻ → hiện empty state) |
