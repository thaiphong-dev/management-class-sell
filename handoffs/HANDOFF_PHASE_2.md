# Handoff: Phase 2 — Quản lý lõi (Admin + Coach)

## Tóm tắt
Implement đầy đủ CRUD cho Cơ sở/Sân, Người dùng, Lớp học (Admin) và Buổi học (Coach). Đồng thời fix toàn bộ 9 bugs Phase 1 từ 2 bug reports (`BUGS_PHASE_1.md` và `BUGS_AUTO_PHASE_1.md`).

---

## Tính năng đã implement

| Tính năng | File chính | Status |
|-----------|-----------|--------|
| **Bug Fix Phase 1** | Nhiều file | ✅ Done |
| Admin – Quản lý Cơ sở & Sân | `src/pages/admin/FacilitiesPage.tsx` | ✅ Done |
| Admin – Quản lý Người dùng | `src/pages/admin/UsersPage.tsx` | ✅ Done |
| Admin – Quản lý Lớp học | `src/pages/admin/ClassesPage.tsx` | ✅ Done |
| Coach – Danh sách lớp | `src/pages/coach/ClassesPage.tsx` | ✅ Done |
| Coach – Quản lý Buổi học | `src/pages/coach/SessionsPage.tsx` | ✅ Done |
| Supabase Edge Function – Tạo user | `supabase/functions/create-user/index.ts` | ✅ Done |
| Routing Phase 2 | `src/App.tsx` | ✅ Done |

---

## Bug Fixes Phase 1

| Bug ID | Mô tả | File đã sửa |
|--------|-------|------------|
| BUG-001 | Auth race condition – flash trắng khi login | `src/contexts/AuthContext.tsx` |
| BUG-002 | RequireRole bypass khi profile = null | `src/components/auth/RequireAuth.tsx` |
| BUG-003 | Sidebar: invalid Tailwind classes (`border-white/8`, `w-4.5`) | `src/components/layout/Sidebar.tsx` |
| BUG-004 | Coach dashboard: maybeSingle + sessions filter sai | `src/pages/coach/DashboardPage.tsx` |
| BUG-005 | Student dashboard: `.single()` crash khi không có thẻ | `src/pages/student/DashboardPage.tsx` |
| BUG-006 | `alert_level = 'critical'` thiếu case `sessions_remaining = 1` | `migrations/006_views.sql` |
| BUG-007 | Admin dashboard: thiếu error handling | `src/pages/admin/DashboardPage.tsx` |
| BUG-008 | Tailwind token `surface` chưa định nghĩa | `tailwind.config.ts` |
| BUG-009 | Docs DESIGN.md dùng `brand` thay vì `primary` | `docs/DESIGN.md` |

---

## Functions / Components đã tạo

| Tên | File | Mô tả |
|-----|------|-------|
| `FacilitiesPage` | `src/pages/admin/FacilitiesPage.tsx` | CRUD cơ sở + sân con |
| `UsersPage` | `src/pages/admin/UsersPage.tsx` | Quản lý user, tạo qua Edge Function |
| `ClassesPage` (admin) | `src/pages/admin/ClassesPage.tsx` | CRUD lớp, phân công HLV, xếp học viên |
| `CoachClassesPage` | `src/pages/coach/ClassesPage.tsx` | Danh sách lớp của HLV |
| `CoachSessionsPage` | `src/pages/coach/SessionsPage.tsx` | Tạo + cập nhật trạng thái buổi học |
| `create-user` Edge Function | `supabase/functions/create-user/index.ts` | Tạo auth user an toàn từ admin |

---

## Database changes
Không có migration mới trong Phase 2. Tất cả queries dùng schema đã tạo ở Phase 1.

Schema đã dùng:
- `facilities`, `courts`
- `profiles`, `coaches`, `students`
- `classes`, `class_students`
- `sessions`

---

## Patterns / Notes kỹ thuật

- **`as never` pattern**: Supabase v2.106.1 có bug TypeScript khiến `.insert()` và `.update()` infer parameter type là `never`. Workaround: `supabase.from('table').insert({ ... } as never)`. Runtime không ảnh hưởng.
- **User creation**: Browser không thể gọi Supabase Admin API trực tiếp (cần service role key). Dùng Edge Function `create-user` để validate caller là admin rồi gọi `supabase.auth.admin.createUser()`.
- **courts filter**: Query `courts` chỉ lấy `status = 'available'` trong dialog tạo session/class. Courts khác vẫn hiển thị trong list cơ sở.

---

## Chưa xử lý / Known Issues

- [x] ~~Coach có thể thêm buổi học vào lớp HLV khác~~ → **FIXED Phase 3** (BUG-P2-005): `SessionsPage.tsx` kiểm tra `cls.coach_id !== coachId` server-side và redirect nếu sai
- [x] ~~Delete facility chưa cascade delete courts UI~~ → **ALREADY HANDLED**: AlertDialog đã hiển thị warning "sẽ ảnh hưởng đến tất cả sân thuộc cơ sở", DB FK cascade xử lý actual deletion
- [ ] Không có pagination — defer, cần khi data > vài trăm records
- [x] ~~Phase 3 routes vẫn là ComingSoon~~ → **FIXED Phase 3**: tất cả routes đã được implement

---

## Hướng dẫn test (dành cho QC)

### Setup
1. `npm install` (nếu chưa)
2. Tạo file `.env.local` với `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`
3. Deploy Edge Function: `supabase functions deploy create-user`
4. `npm run dev`

### Test accounts
| Role | Email | Password |
|------|-------|---------|
| Admin | admin@test.com | Test@123 |
| HLV | coach@test.com | Test@123 |
| Học viên | student@test.com | Test@123 |

### Test cases

#### Admin – Cơ sở & Sân

| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 1 | Tạo cơ sở mới | Admin → Cơ sở → "Thêm cơ sở" → điền tên+địa chỉ → Lưu | Cơ sở xuất hiện trong danh sách |
| 2 | Thêm sân vào cơ sở | Click "Thêm sân" trên cơ sở → điền tên → Lưu | Sân xuất hiện trong accordion |
| 3 | Sửa trạng thái sân | Click edit sân → đổi status → Lưu | Badge trạng thái cập nhật |
| 4 | Xóa cơ sở | Click xóa → confirm dialog → OK | Cơ sở biến khỏi danh sách |

#### Admin – Người dùng

| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 5 | Tạo HLV mới | "Thêm người dùng" → role=HLV → điền thông tin → Tạo tài khoản | HLV xuất hiện trong tab HLV |
| 6 | Tạo học viên | Tương tự, role=Học viên | Học viên xuất hiện trong tab Học viên |
| 7 | Tìm kiếm | Nhập tên/SĐT vào ô tìm kiếm | Danh sách lọc real-time |
| 8 | Sửa thông tin | Click icon bút → sửa tên/SĐT → Lưu | Thông tin cập nhật |

#### Admin – Lớp học

| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 9 | Tạo lớp | "Thêm lớp" → điền tên, chọn HLV, cơ sở, sân, tích ngày học → Lưu | Lớp xuất hiện trong bảng |
| 10 | Thêm học viên vào lớp | Click icon người dùng → chọn học viên → Thêm | Số học viên tăng |
| 11 | Xóa học viên khỏi lớp | Trong dialog enrollment → click xóa học viên | Học viên bị remove |

#### Coach – Buổi học

| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 12 | Xem lớp | Login HLV → Lớp của tôi | Thấy các lớp được phân công |
| 13 | Tạo buổi học | Click vào lớp → "Thêm buổi" → chọn ngày giờ → Tạo | Buổi xuất hiện trong "Sắp diễn ra" |
| 14 | Cập nhật trạng thái | Click "Cập nhật" → chọn "Hoàn thành" | Buổi chuyển sang tab "Đã qua" |
| 15 | Hủy buổi | Click "Cập nhật" → chọn "Đã hủy" | Buổi hiển thị badge đỏ trong "Đã qua" |
