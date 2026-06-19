# Plan: Phase 9 — Thanh Toán Tự Động VietQR & Sepay Webhook

## Mục tiêu
Tích hợp luồng thanh toán tự động qua mã VietQR và đồng bộ tự động phê duyệt đơn đăng ký học thông qua Webhook của Sepay và Supabase Edge Function. Đồng thời tối ưu hóa quy trình đăng ký học viên (đăng ký -> tạo tài khoản -> thanh toán sau), hỗ trợ học viên quản lý và thanh toán thẻ học chưa thanh toán trực tiếp tại Dashboard, tích hợp mã QR thử nghiệm trong phần cấu hình Admin, và ngăn chặn toàn bộ hiện tượng API lặp lại 2 lần.

## Phụ thuộc
- Phase 8 đã hoàn thành: Y
- Files cần đọc/sửa:
  - `src/pages/public/RegisterCoursePage.tsx`
  - `src/pages/admin/RegistrationsPage.tsx`
  - `src/pages/admin/SettingsPage.tsx`
  - `src/pages/student/PackagesPage.tsx`
  - `src/main.tsx`
  - `supabase/functions/webhook-sepay/index.ts`
  - `supabase/functions/register-student/index.ts`

## Tasks
| # | Task | File(s) sẽ tạo/sửa | Ước tính |
|---|------|---------------------|----------|
| 1 | DB: Tạo các migration 020, 021, 022, 023 bổ sung quyền SELECT registrations, thêm cột ngân hàng vào landing_settings, thêm cột liên kết vào registrations, và tạo các RPC `cancel_pending_registration`, `student_buy_package` | `migrations/020_add_select_policy_to_registrations.sql`<br>`migrations/021_add_bank_settings_to_landing_settings.sql`<br>`migrations/022_add_package_and_payment_to_registrations.sql`<br>`migrations/023_cancel_registration_rpc.sql` | S |
| 2 | Edge Function: Tạo hàm public `register-student` để tạo auth user (mật khẩu mặc định: `TPB@123`), profiles, students, class_students, student_packages, payments, và registrations | `supabase/functions/register-student/index.ts` | L |
| 3 | Edge Function: Cập nhật hàm `webhook-sepay` kiểm tra student_id có sẵn để cập nhật hóa đơn, kích hoạt thẻ thay vì tạo trùng lặp tài khoản | `supabase/functions/webhook-sepay/index.ts` | M |
| 4 | Frontend: Form đăng ký công khai gọi Edge Function `register-student`, hiển thị thông tin tài khoản mặc định, nút "Thanh toán sau", và thêm validate số điện thoại | `src/pages/public/RegisterCoursePage.tsx` | M |
| 5 | Frontend: Trang phê duyệt Admin bỏ qua luồng tạo user nếu đơn đăng ký đã có sẵn student_id | `src/pages/admin/RegistrationsPage.tsx` | S |
| 6 | Frontend: Thêm cấu hình ngân hàng nhận thanh toán và mã QR VietQR test preview trực tiếp trong trang Settings của Admin | `src/pages/admin/SettingsPage.tsx` | S |
| 7 | Frontend: Hiển thị Thẻ học chờ thanh toán ở Dashboard học viên kèm mã QR động, nút "Kiểm tra", "Hủy đơn", và Dialog "Đăng ký mua" chọn lớp cho gói học mới | `src/pages/student/PackagesPage.tsx` | L |
| 8 | Global: Loại bỏ `<StrictMode>` khỏi `main.tsx` để ngăn chặn hoàn toàn việc gọi API 2 lần do double mount ở dev mode | `src/main.tsx` | XS |
| 9 | Build: Chạy typecheck và build dự án sạch lỗi | — | S |

## Acceptance Criteria
- [x] Form đăng ký tự động tạo tài khoản với mật khẩu mặc định `TPB@123` và hiển thị thông tin đăng nhập trên trang thành công.
- [x] Người dùng có tùy chọn "Thanh toán sau" chuyển hướng về trang `/login` để đăng nhập sử dụng tài khoản vừa tạo.
- [x] Số điện thoại học sinh và phụ huynh (nếu dưới 16 tuổi) được kiểm tra định dạng Việt Nam trước khi gửi form.
- [x] Webhook của Sepay kiểm tra tài khoản đã có sẵn và chỉ cập nhật trạng thái thanh toán + phê duyệt thay vì tạo trùng lặp.
- [x] Giao diện Admin Settings cho phép lưu thông tin ngân hàng nhận tiền và hiển thị QR chuyển khoản thử nghiệm trực tiếp thời gian thực.
- [x] Dashboard học sinh hiển thị thẻ học chưa thanh toán kèm mã QR và cú pháp chuyển khoản tương ứng.
- [x] Học viên có thể tự hủy thẻ học chờ thanh toán để đăng ký gói khác, hoặc chọn lớp học đăng ký khi mua gói học mới.
- [x] Chế độ StrictMode được loại bỏ giúp các trang không còn lặp lại việc gọi API 2 lần khi tải trang.
- [x] `npm run build` và `npm run typecheck` chạy hoàn toàn không có lỗi.

## Risks / Notes
- Chuyển khoản VietQR sử dụng mã ID rút gọn của đơn đăng ký làm cú pháp chuyển khoản để tránh giới hạn ký tự.
- Cần triển khai các Edge Functions với tùy chọn `--no-verify-jwt` để API Gateway cho phép các lượt gọi công khai từ phía học viên và hệ thống SePay.
