# Plan: Phase 11 — Tài Khoản Phụ Huynh & Quản Lý Đa Học Viên (Parent Portal)

## Mục tiêu
Thiết lập hệ thống tài khoản Phụ huynh (`parent` role) cho phép quản lý tập trung từ 2 đến 3 con đi học nhưng vẫn đảm bảo tính độc lập trong kế toán, điểm danh và thẻ học:
1. **Quản lý Đa Học viên (Multi-Child Portal)**: Phụ huynh đăng nhập xem lịch học hợp nhất (màu sắc phân biệt), thẻ học, điểm danh, và nhận xét giáo án/tiến độ của từng con qua bộ chuyển đổi nhanh (Child Switcher).
2. **Luồng Đăng ký & Mua Thẻ**: Phụ huynh tự tạo tài khoản phụ huynh, sau đó đăng ký lớp/gói học cho từng con độc lập (điền form và gửi đăng ký 3 lần cho 3 con).
3. **Độc lập Tài chính & Điểm danh**: Mỗi con có thẻ học (Package) riêng, hóa đơn thanh toán riêng (VietQR độc lập), và mã QR điểm danh độc lập tại sân.
4. **Học viên lớn (> 15 tuổi)**: Đăng ký Gmail độc lập, hoạt động như học viên thông thường không cần liên kết tài khoản phụ huynh.
5. **Định tuyến thông báo**: Toàn bộ thông báo hệ thống liên quan đến thẻ học, buổi học của các con sẽ tự động được gửi và hiển thị trên tài khoản đăng nhập của Phụ huynh.

## Phụ thuộc
- Phase 10 đã hoàn thành: Y
- Files cần đọc/sửa:
  - `src/router.tsx`
  - `src/components/layout/Sidebar.tsx`
  - `src/components/layout/Header.tsx`
  - `src/types/database.types.ts`
  - `src/pages/auth/RegisterPage.tsx`

## Tasks
| # | Task | File(s) sẽ tạo/sửa | Ước tính |
|---|------|---------------------|----------|
| 1 | **DB: Migrations**<br>- Cập nhật check constraint `profiles.role` cho phép vai trò `'parent'`.<br>- Tạo bảng `parents` liên kết `auth.users`.<br>- Thêm trường `parent_id` trong `students` trỏ tới `parents.id`.<br>- Cập nhật RLS policies cho bảng `students`, `profiles`, `student_packages`, `payments`, `progress_evaluations`, `attendance` cho phép phụ huynh truy xuất dữ liệu của các con mình.<br>- Cập nhật các trigger hàm thông báo (`notify_package_granted`, `notify_session_cancelled`, `deduct_session_on_attendance`, `expire_overdue_packages`) để tự động chuyển tiếp `user_id` người nhận tới phụ huynh nếu học sinh có liên kết `parent_id`. | `migrations/026_parent_role_and_multi_child.sql` | M |
| 2 | **Frontend: Router & Roles**<br>- Khai báo các route mới: `/parent/dashboard`, `/parent/family`, `/parent/packages`, `/parent/payments`, `/parent/progress`.<br>- Cập nhật điều hướng `RequireRole` và sidebar điều hướng [Sidebar.tsx](file:///d:/antigravity/claude_code/management-class/src/components/layout/Sidebar.tsx) cho role `'parent'`. | `src/router.tsx`<br>`src/components/layout/Sidebar.tsx` | S |
| 3 | **Frontend: Đăng ký tài khoản Phụ huynh**<br>- Bổ sung lựa chọn "Tôi là Phụ huynh đăng ký cho con" trong màn hình đăng ký tài khoản [RegisterPage.tsx](file:///d:/antigravity/claude_code/management-class/src/pages/auth/RegisterPage.tsx). | `src/pages/auth/RegisterPage.tsx` | S |
| 4 | **Frontend: Child Switcher & Layout Phụ huynh**<br>- Thiết kế thành phần `ChildSwitcher` trên thanh Header để phụ huynh lựa chọn con hiện tại cần xem thông tin.<br>- Lưu trạng thái con đang chọn vào Zustand hoặc Context để chia sẻ giữa các trang. | `src/components/layout/Header.tsx`<br>`src/stores/useAppStore.ts` | S |
| 5 | **Frontend: Dashboard Phụ huynh (`/parent/dashboard`)**<br>- Xem lịch học tuần tích hợp (calendar view gộp buổi học của toàn bộ các con, phân biệt theo nhãn màu sắc).<br>- Widget xem nhanh trạng thái thẻ học của từng bé. | `src/pages/parent/ParentDashboardPage.tsx` | M |
| 6 | **Frontend: Quản lý gia đình & Đăng ký cho con (`/parent/family`)**<br>- Màn hình danh sách các con, thông tin chi tiết từng bé (bao gồm mã QR điểm danh độc lập của con).<br>- Luồng thêm hồ sơ con mới và đăng ký lớp học cho con (sử dụng lại form đăng ký xếp lớp hiện có nhưng tự động gán `parent_id` sau khi đăng nhập). | `src/pages/parent/ParentFamilyPage.tsx` | M |
| 7 | **Frontend: Thẻ học & Nhận xét của con**<br>- Màn hình thẻ học của con hiện tại (`/parent/packages`), hiển thị số buổi, hạn sử dụng, hỗ trợ gia hạn tạo hóa đơn VietQR.<br>- Màn hình xem tiến độ và nhận xét từ Coach cho con hiện tại (`/parent/progress`). | `src/pages/parent/ParentPackagesPage.tsx`<br>`src/pages/parent/ParentProgressPage.tsx` | M |
| 8 | **Build & Verify**<br>- Viết test E2E để giả lập toàn bộ luồng của phụ huynh đăng ký tài khoản, gửi đơn xếp lớp cho con, thanh toán và điểm danh.<br>- Chạy typecheck và build dự án sạch lỗi. | `tests/e2e/09-phase11-parent.spec.ts` | M |

## Acceptance Criteria
- [ ] Database hỗ trợ role `'parent'`, bảng `parents` và khóa ngoại `parent_id` trong `students`.
- [ ] Các thông báo hệ thống liên quan đến thẻ học, buổi học của các con được gửi thẳng vào tài khoản của Phụ huynh thông qua cơ chế trigger định tuyến thông minh.
- [ ] Phụ huynh có thể tự đăng ký tài khoản qua form Đăng ký ngoài trang chủ.
- [ ] Khi đã đăng nhập, Phụ huynh có thể gửi đơn đăng ký học cho các con nhiều lần độc lập. Thông tin đăng ký tự động trỏ về `parent_id` của phụ huynh.
- [ ] Portal phụ huynh hiển thị lịch học tích hợp gộp chung (phân biệt màu sắc cho từng bé) để bố mẹ tiện sắp xếp thời gian đưa đón.
- [ ] Màn hình phụ huynh có bộ chọn con (Child Switcher). Khi chọn con nào, giao diện Tiến độ (Skill Radar), Thẻ học, Điểm danh hiển thị đúng dữ liệu của bé đó.
- [ ] Mỗi con có một mã QR điểm danh độc lập trong portal của phụ huynh để con tự check-in tại sân.
- [ ] `npm run build` và `npm run typecheck` chạy hoàn toàn không có lỗi.

## Risks / Notes
- **RLS Policies**: Do hồ sơ của con không có `auth.users`, các câu lệnh SELECT và UPDATE dữ liệu của con (bảng `profiles`, `students`, `student_packages`, `attendance`, `progress_evaluations`, `payments`) phải sử dụng mệnh đề RLS join kiểm tra `parent_id` thuộc tài khoản đang đăng nhập để tránh rò rỉ dữ liệu chéo giữa các phụ huynh.
- **Dữ liệu điểm danh trống**: Đối với học viên mới chưa mua thẻ, hệ thống cần hỗ trợ hiển thị rõ tình trạng này trên app của phụ huynh để thôi thúc hành động mua thẻ.
