# Plan: Phase 6 — Gap Closing (Dashboard upgrades, Triggers, Charts)

## Mục tiêu
Implement tất cả tính năng còn thiếu so với PLANNING.md sau 5 phase đầu.

## Phụ thuộc
- Phase 5 đã hoàn thành: Y
- Files cần đọc: src/pages/admin/DashboardPage.tsx, src/pages/coach/DashboardPage.tsx, src/pages/coach/SessionsPage.tsx, src/pages/student/DashboardPage.tsx, src/pages/student/ProgressPage.tsx, src/pages/admin/ReportsPage.tsx, migrations/004_triggers.sql

## Tasks
| # | Task | File(s) sẽ tạo/sửa | Ước tính |
|---|------|---------------------|----------|
| 1 | DB triggers: package_granted + session_cancelled notifications | migrations/007_notifications.sql | S |
| 2 | Admin Dashboard: thêm bảng buổi học hôm nay | src/pages/admin/DashboardPage.tsx | M |
| 3 | Coach Dashboard: next-session card + 7-day weekly grid | src/pages/coach/DashboardPage.tsx | L |
| 4 | Coach Sessions: cancel-with-reason dialog | src/pages/coach/SessionsPage.tsx | M |
| 5 | Student Dashboard: skill bars từ latest progress_evaluation | src/pages/student/DashboardPage.tsx | S |
| 6 | Student Progress: LineChart overall_score theo thời gian | src/pages/student/ProgressPage.tsx | M |
| 7 | Admin Reports: attendance rate chart + new students per month | src/pages/admin/ReportsPage.tsx | M |
| 8 | Typecheck + Build + Handoff | — | S |

## Acceptance Criteria
- [ ] Admin Dashboard hiển thị danh sách buổi học hôm nay (class, coach, court, time, status)
- [ ] Coach Dashboard hiển thị buổi học tiếp theo nổi bật + lịch 7 ngày
- [ ] Cancel session có dialog nhập lý do, trigger tự gửi notification cho học viên
- [ ] Student Dashboard hiển thị skill bars từ latest evaluation
- [ ] Student Progress hiển thị LineChart điểm tổng theo thời gian
- [ ] Admin Reports có thêm: biểu đồ tỷ lệ điểm danh + học viên mới theo tháng
- [ ] `npm run build` 0 errors

## Risks / Notes
- `sessions_with_details` view không có `coach_id`, chỉ có `coach_name` — dùng coach_name cho display
- Triggers chạy AFTER INSERT/UPDATE → cần execute qua Management API
- Coach Dashboard weekly grid: dùng grid-cols-7 với day headers Mon-Sun
- LineChart recharts: `<Line type="monotone" dataKey="score" />` với `<XAxis dataKey="date" />`
