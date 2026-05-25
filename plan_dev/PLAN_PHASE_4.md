# Plan: Phase 4 — Finance (Gói học & Tài chính)

## Mục tiêu
CRUD gói học (admin), cấp thẻ cho học viên + ghi nhận thanh toán, học viên xem thẻ và lịch sử, admin xem báo cáo doanh thu (Recharts).

## Phụ thuộc
- Phase 3 đã hoàn thành: Y
- DB tables: `packages`, `student_packages`, `payments`; view: `monthly_revenue`, `active_student_packages`
- Files cần đọc: `docs/DATABASE.md`, `migrations/005_rls.sql`, `migrations/006_views.sql`

## Tasks
| # | Task | File(s) | Ước tính |
|---|------|---------|----------|
| 1 | Admin: CRUD gói học + quản lý thẻ học viên | `pages/admin/PackagesPage.tsx` (mới) | ~320 lines |
| 2 | Student: Xem thẻ + lịch sử | `pages/student/PackagesPage.tsx` (mới) | ~150 lines |
| 3 | Admin: Reports (BarChart doanh thu + stats) | `pages/admin/ReportsPage.tsx` (mới) | ~180 lines |
| 4 | Admin Dashboard: upgrade với chart + expiring cards | `pages/admin/DashboardPage.tsx` (sửa) | +60 lines |
| 5 | Update routing | `App.tsx` | 5 lines |

## Acceptance Criteria
- [ ] Admin tạo gói học (session/monthly), chỉnh sửa, đổi status active/inactive
- [ ] Admin cấp thẻ cho học viên (chọn student + package), tùy chọn kích hoạt ngay
- [ ] Admin ghi nhận thanh toán khi cấp thẻ (amount, payment_method)
- [ ] Admin kích hoạt thủ công thẻ đang `pending_activation`
- [ ] Admin xem tất cả thẻ học viên lọc theo status
- [ ] Student xem thẻ đang active (gradient card + sessions/days remaining)
- [ ] Student xem lịch sử thẻ đã mua
- [ ] Admin Reports: BarChart doanh thu 6 tháng gần nhất
- [ ] Admin Dashboard: BarChart mini + danh sách thẻ sắp hết
- [ ] `npm run build` 0 errors

## Risks / Notes
- `monthly_revenue` view dùng `SECURITY INVOKER` → chỉ admin thấy data (nhờ `payments_admin_all` RLS)
- Khi cấp thẻ: INSERT `student_packages` trước, dùng returned `id` để INSERT `payments`
- `sessions_remaining` khi tạo thẻ = `package.sessions_count` (copy từ package). Monthly package → `sessions_remaining = null`
- Kích hoạt thủ công: UPDATE `student_packages` SET `activated_at = now()`, `expires_at = now() + validity_days days`, `status = 'active'`
- Recharts BarChart dùng cùng package đã install ở Phase 3
