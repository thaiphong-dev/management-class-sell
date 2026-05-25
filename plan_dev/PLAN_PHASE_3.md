# Plan: Phase 3 — Điểm danh & Đánh giá tiến độ

## Mục tiêu
Fix 7 bugs Phase 2, sau đó implement đầy đủ điểm danh cho HLV, lịch học / lịch sử điểm danh cho học viên, đánh giá tiến độ (HLV tạo / học viên xem).

## Phụ thuộc
- Phase 2 đã hoàn thành: Y
- DB triggers `activate_pending_package` + `deduct_session_on_attendance` đã có trong `004_triggers.sql`
- Files cần đọc: `docs/DATABASE.md`, `docs/PLANNING.md`, `migrations/004_triggers.sql`, `migrations/006_views.sql`

## Tasks

### Bug Fixes Phase 2
| # | Bug | File | Fix |
|---|-----|------|-----|
| B1 | BUG-P2-001 CRITICAL: `.eq('coach_id')` không tồn tại trong view | `pages/coach/DashboardPage.tsx` | Xóa `.eq('coach_id', coach.id)` |
| B2 | BUG-P2-002 MAJOR: studentCount dùng `cs.length` thay vì `cs[0].count` | `admin/ClassesPage.tsx`, `coach/ClassesPage.tsx` | `cs?.[0]?.count ?? 0` |
| B3 | BUG-P2-003 MAJOR: RequireAuth infinite spinner khi profile fetch fail | `AuthContext.tsx` + `RequireAuth.tsx` | Thêm `profileError` state, redirect login |
| B4 | BUG-P2-004 MINOR: Password validation sai (8 vs 6 ký tự) | `admin/UsersPage.tsx` | Sửa label + check `length < 6` |
| B5 | BUG-P2-005 MINOR: Coach xem class của HLV khác | `coach/SessionsPage.tsx` | Verify `coach_id` sau load |
| B6 | BUG-P2-006 MINOR: Courts không có thứ tự | `admin/FacilitiesPage.tsx` | Sort client-side theo name |
| B7 | BUG-P2-007 MINOR: Search không hỗ trợ email | `admin/UsersPage.tsx` | Cập nhật placeholder |

### Phase 3 Implementation
| # | Task | File(s) sẽ tạo/sửa | Ước tính |
|---|------|---------------------|----------|
| P1 | Coach: Attendance sheet cho 1 session | `pages/coach/AttendancePage.tsx` (mới) | 200 lines |
| P2 | Student: Lịch học (danh sách session sắp tới) | `pages/student/SchedulePage.tsx` (mới) | 120 lines |
| P3 | Student: Lịch sử điểm danh | `pages/student/AttendancePage.tsx` (mới) | 120 lines |
| P4 | Coach: Đánh giá tiến độ học viên | `pages/coach/ProgressPage.tsx` (mới) | 250 lines |
| P5 | Student: Xem tiến độ kỹ năng | `pages/student/ProgressPage.tsx` (mới) | 150 lines |
| P6 | Cài Recharts + RadarChart component | `components/progress/SkillRadar.tsx` (mới) | 50 lines |
| P7 | Cập nhật routing App.tsx | `App.tsx` | 10 lines |
| P8 | Migration trigger upsert attendance | `migrations/010_attendance_upsert.sql` (mới) | 20 lines |

## Acceptance Criteria
- [ ] Coach Dashboard không còn error toast khi load
- [ ] Student count trong lớp hiển thị chính xác
- [ ] profile fetch fail → redirect login (không spinner vô tận)
- [ ] HLV mở session của lớp khác → redirect coach/classes
- [ ] Courts sắp xếp theo tên
- [ ] Coach có thể điểm danh cho từng học viên trong buổi (toggle present/absent/late)
- [ ] Khi lưu điểm danh `present`/`late` → DB trigger tự trừ buổi + kích hoạt thẻ
- [ ] Học viên xem lịch học sắp tới của lớp mình
- [ ] Học viên xem lịch sử điểm danh
- [ ] HLV có thể tạo đánh giá kỹ năng (0-100) cho học viên
- [ ] Học viên xem radar chart kỹ năng từ đánh giá HLV
- [ ] `npm run build` 0 errors, 0 warnings

## Risks / Notes
- Attendance upsert: `unique(session_id, student_id)` → dùng `upsert` với `onConflict`
- Trigger `deduct_session_on_attendance` chỉ fire trên INSERT, không UPDATE. Khi HLV thay đổi status từ absent → present (update), trigger không fire → buổi không bị trừ. Để đơn giản Phase 3: chấp nhận limitation này, document rõ. Phase 4+ có thể thêm AFTER UPDATE trigger.
- Recharts cần install: `npm install recharts`
- Coach ProgressPage: do route `/coach/progress` từ sidebar, page này hiển thị list các lớp của HLV để chọn, sau đó chọn học viên để tạo/xem đánh giá. Route chi tiết: `/coach/classes/:classId/progress/:studentId`
