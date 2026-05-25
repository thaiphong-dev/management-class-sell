# Plan: Phase 2 — Quản lý lõi (Core Management)

## Mục tiêu
Xây dựng toàn bộ CRUD cho Admin (Facilities, Courts, Users, Classes) và Coach (Sessions).
Sau phase này Admin có thể quản lý cơ sở vật chất, tài khoản người dùng, lớp học; HLV có thể tạo và quản lý buổi học.

## Phụ thuộc
- Phase 1 đã hoàn thành: ✅
- Bugs Phase 1 đã fix: ✅
- Files cần đọc: `docs/DATABASE.md`, `docs/API.md`, `docs/DESIGN.md`, `src/types/database.types.ts`

## shadcn components cần add
- `dialog` — modal form
- `alert-dialog` — confirm delete
- `select` — dropdown
- `tabs` — tab navigation
- `table` — data grid
- `textarea` — multi-line input

## Tasks

| # | Task | File(s) sẽ tạo/sửa | Ước tính |
|---|------|---------------------|----------|
| 1 | Add shadcn components | `npx shadcn@latest add dialog alert-dialog select table tabs textarea` | 5m |
| 2 | Facilities & Courts page (Admin) | `src/pages/admin/FacilitiesPage.tsx` | 60m |
| 3 | Users page (Admin) — list + detail | `src/pages/admin/UsersPage.tsx` | 90m |
| 4 | Classes page (Admin) — list + create + enroll | `src/pages/admin/ClassesPage.tsx` | 90m |
| 5 | Sessions page (Coach) — list + create per class | `src/pages/coach/ClassesPage.tsx`, `src/pages/coach/SessionsPage.tsx` | 60m |
| 6 | Wire routes in App.tsx | `src/App.tsx` | 10m |
| 7 | Update Sidebar nav | Already correct from Phase 1 | — |
| 8 | HANDOFF_PHASE_2.md | `handoffs/HANDOFF_PHASE_2.md` | 10m |

## Acceptance Criteria

- [ ] Admin có thể xem danh sách facilities + courts
- [ ] Admin có thể tạo / sửa / đổi status facility và court
- [ ] Admin có thể xem danh sách tất cả users theo role
- [ ] Admin có thể tạo user mới (admin/coach/student) — email + password + role + full_name
- [ ] Admin có thể edit profile (full_name, phone, role-specific info)
- [ ] Admin có thể xem danh sách lớp học
- [ ] Admin có thể tạo lớp (assign coach, facility, court, schedule)
- [ ] Admin có thể thêm / xóa học viên khỏi lớp
- [ ] Coach có thể xem danh sách lớp được phân công
- [ ] Coach có thể xem danh sách sessions của lớp
- [ ] Coach có thể tạo session mới (scheduled_at, court, duration)
- [ ] Coach có thể đổi status session (completed / cancelled)
- [ ] `npm run typecheck` pass
- [ ] `npm run build` pass (0 errors, 0 warnings)

## Risks / Notes

- **User creation:** Supabase Admin Auth API (`/auth/v1/admin/users`) chỉ accessible từ service role key — không thể gọi từ frontend browser trực tiếp. **Giải pháp:** Gọi qua Supabase Edge Function hoặc dùng `supabase.auth.admin.createUser()` với service role key. Tuy nhiên, expose service role key trên frontend là BAD PRACTICE. → Implement Edge Function `create-user` trong `/supabase/functions/create-user/index.ts`.
- **RLS cho coaches/students select:** Policy hiện tại chỉ cho admin xem tất cả. Coach xem học viên trong lớp mình cần RLS phù hợp (đã có trong 005_rls.sql).
- Component size limit 300 LOC — mỗi page tách sub-components nếu cần.
- Dùng `useToast` (đã có) cho feedback sau mọi action.
