# Handoff: Phase 4 — Finance (Gói học & Tài chính)

## Tóm tắt
Implement đầy đủ CRUD gói học (Admin), cấp thẻ + ghi nhận thanh toán (Admin), xem thẻ gradient card + lịch sử (Học viên), báo cáo doanh thu BarChart 6 tháng (Admin Reports), và nâng cấp Admin Dashboard với mini chart + danh sách thẻ sắp hết. Build thành công 0 errors.

---

## Tính năng đã implement

| Tính năng | File chính | Status |
|-----------|-----------|--------|
| Admin – CRUD gói học (session/monthly) | `pages/admin/PackagesPage.tsx` | ✅ Done |
| Admin – Quản lý thẻ học viên (lọc + search) | `pages/admin/PackagesPage.tsx` | ✅ Done |
| Admin – Cấp thẻ cho học viên + ghi nhận thanh toán | `pages/admin/PackagesPage.tsx` | ✅ Done |
| Admin – Kích hoạt thủ công thẻ pending_activation | `pages/admin/PackagesPage.tsx` | ✅ Done |
| Student – Xem thẻ active (gradient card + progress bar) | `pages/student/PackagesPage.tsx` | ✅ Done |
| Student – Lịch sử thẻ đã mua | `pages/student/PackagesPage.tsx` | ✅ Done |
| Admin Reports – BarChart doanh thu 6 tháng | `pages/admin/ReportsPage.tsx` | ✅ Done |
| Admin Reports – Stats tổng hợp + giao dịch gần đây | `pages/admin/ReportsPage.tsx` | ✅ Done |
| Admin Dashboard – Mini BarChart doanh thu | `pages/admin/DashboardPage.tsx` | ✅ Done |
| Admin Dashboard – Danh sách thẻ sắp hết | `pages/admin/DashboardPage.tsx` | ✅ Done |
| Routing Phase 4 | `App.tsx` | ✅ Done |

---

## Functions / Components đã tạo

| Tên | File | Mô tả |
|-----|------|-------|
| `AdminPackagesPage` | `pages/admin/PackagesPage.tsx` | 2 tabs: Gói học CRUD + Thẻ học viên |
| `StudentPackagesPage` | `pages/student/PackagesPage.tsx` | Gradient card thẻ active + lịch sử |
| `ActivePackageCard` | `pages/student/PackagesPage.tsx` | Sub-component gradient card với progress bar |
| `AdminReportsPage` | `pages/admin/ReportsPage.tsx` | BarChart 6 tháng + stats + recent payments |
| `AdminDashboardPage` | `pages/admin/DashboardPage.tsx` | Đã nâng cấp: mini chart + expiring cards |

---

## Routes mới (đã thay ComingSoon)

| Route | Component | Ghi chú |
|-------|-----------|---------|
| `/admin/packages` | `AdminPackagesPage` | Thay ComingSoon |
| `/admin/reports` | `AdminReportsPage` | Thay ComingSoon |
| `/student/packages` | `StudentPackagesPage` | Thay ComingSoon |

---

## Database Objects Dùng

| Bảng / View | Dùng ở đâu | Mục đích |
|------------|-----------|---------|
| `packages` | AdminPackagesPage | CRUD gói học |
| `student_packages` | AdminPackagesPage, StudentPackagesPage | Cấp thẻ, kích hoạt, lịch sử |
| `payments` | AdminPackagesPage, ReportsPage, DashboardPage | Ghi nhận thanh toán, thống kê |
| `active_student_packages` (view) | StudentPackagesPage, DashboardPage | Thẻ đang active + alert_level |
| `monthly_revenue` (view) | ReportsPage, DashboardPage | Doanh thu theo tháng |

---

## Patterns / Notes kỹ thuật

- **INSERT chain**: Khi cấp thẻ → `INSERT student_packages` → lấy `id` từ `.select('id').single()` → `INSERT payments` với foreign key đó. Tránh race condition.
- **`as never` workaround**: Supabase TypeScript generic cho `.insert()` / `.update()` infer `never` với schema phức tạp → dùng `as never` khi cần.
- **Kích hoạt thủ công**: `UPDATE student_packages SET activated_at = now(), expires_at = now() + validity_days days, status = 'active'`. Validity_days được re-fetch từ joined `packages`.
- **`monthly_revenue` view**: `SECURITY INVOKER` → chỉ admin có RLS `payments_admin_all` mới query được.
- **`active_student_packages` view**: Chỉ rows `status = 'active'`. Student package history phải query `student_packages` trực tiếp.
- **Alert gradient**: `ok` → `primary-600` (đỏ đậm), `warning` → `yellow-500`, `critical` → `red-600`.
- **BarChart axis formatter**: `(v / 1_000_000).toFixed(0) + 'M'` để tránh overflow trục Y.

---

## Chưa xử lý / Known Issues

- [ ] Không có pagination cho danh sách thẻ học viên — defer
- [ ] Không có export CSV/PDF báo cáo doanh thu — defer
- [ ] Không có filter theo khoảng thời gian tùy chỉnh ở ReportsPage — defer
- [x] ~~Monthly package không hiển thị progress bar~~ → **FIXED (bug-fix session sau Phase 6)**: `StudentPackagesPage.tsx` `ActivePackageCard` thêm days-remaining progress bar cho gói monthly (tính từ `activatedAt` → `expiresAt`)
- [x] ~~`/admin/packages` và `/admin/reports` chưa có link từ Sidebar~~ → **ALREADY IN SIDEBAR**: `Sidebar.tsx` NAV_ITEMS admin đã có đủ cả 2 links từ đầu
- [x] ~~Attendance UPDATE trigger absent→present không deduct~~ → **FIXED (bug-fix session sau Phase 6)**: `migrations/012_attendance_update_trigger.sql`

---

## Hướng dẫn test (dành cho QC)

### Test accounts
| Role | Email | Password |
|------|-------|---------|
| Admin | admin@test.com | Test@123 |
| HLV | coach@test.com | Test@123 |
| Học viên | student@test.com | Test@123 |

### Test cases

#### Admin – Gói học

| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 1 | Tạo gói học session | Admin → Gói học → Tab "Gói học" → "+ Tạo gói" → Điền tên, loại Session, 12 buổi, 60 ngày, giá 1.200.000 → Lưu | Gói xuất hiện trong danh sách |
| 2 | Tạo gói học monthly | Tương tự, loại Monthly, không có số buổi, 30 ngày, giá 800.000 | Gói xuất hiện với badge "Theo tháng" |
| 3 | Chỉnh sửa gói | Click "Sửa" → Đổi giá → Lưu | Giá cập nhật trong danh sách |
| 4 | Đổi status gói | Click badge "Đang hoạt động" → Confirm | Badge chuyển "Không hoạt động" |

#### Admin – Cấp thẻ & Thanh toán

| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 5 | Cấp thẻ session + kích hoạt ngay | Tab "Thẻ học viên" → "+ Cấp thẻ" → Chọn học viên → Chọn gói session → Amount auto-fill → PTTT: Tiền mặt → ☑ Kích hoạt ngay → Cấp thẻ | Thẻ hiện với status "Đang dùng" |
| 6 | Cấp thẻ pending | Tương tự, bỏ check "Kích hoạt ngay" | Thẻ hiện với status "Chờ kích hoạt" |
| 7 | Kích hoạt thủ công | Click "Kích hoạt" trên row thẻ pending | Status chuyển "Đang dùng", activated_at và expires_at được set |
| 8 | Lọc theo status | Chọn filter "Đang dùng" | Chỉ hiện thẻ active |
| 9 | Tìm kiếm | Gõ tên học viên vào ô search | Lọc realtime theo tên |

#### Student – Thẻ học

| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 10 | Xem thẻ active | Học viên → Thẻ học | Gradient card đỏ với tên gói, số buổi còn/tổng, progress bar, ngày HH |
| 11 | Thẻ cảnh báo | Còn ≤ 3 buổi hoặc ≤ 7 ngày | Gradient chuyển vàng (warning) hoặc đỏ tươi (critical) + icon ⚠️ |
| 12 | Xem lịch sử | Scroll xuống "Lịch sử thẻ" | Danh sách các thẻ đã mua với badge status |
| 13 | Không có thẻ | Học viên chưa có thẻ nào | Thông báo "Không có thẻ đang hoạt động · Liên hệ admin" |

#### Admin – Báo cáo

| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 14 | Xem báo cáo | Admin → Báo cáo | Stats 3 cards (doanh thu, giao dịch, TB/tháng) + BarChart + danh sách giao dịch |
| 15 | BarChart hiển thị | Có ít nhất 1 tháng có giao dịch | Bar cho tháng đó hiển thị đúng, tooltip format VND |

#### Admin – Dashboard

| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 16 | Mini chart | Admin → Dashboard | BarChart doanh thu 6 tháng bên trái |
| 17 | Expiring cards | Có thẻ warning/critical | Danh sách bên phải với chấm màu đỏ/vàng + số buổi/ngày còn lại |
