# Plan: Phase 9 — Thanh Toán Tự Động VietQR & Sepay Webhook

## Mục tiêu
Tích hợp luồng thanh toán tự động qua mã VietQR và đồng bộ tự động phê duyệt đơn đăng ký học thông qua Webhook của Sepay và Supabase Edge Function. Giữ song song luồng phê duyệt thủ công của Admin.

## Phụ thuộc
- Phase 8 đã hoàn thành: Y
- Files cần đọc/sửa:
  - `src/pages/public/RegisterCoursePage.tsx`
  - `src/pages/admin/RegistrationsPage.tsx`
  - `src/App.tsx`

## Tasks
| # | Task | File(s) sẽ tạo/sửa | Ước tính |
|---|------|---------------------|----------|
| 1 | DB: Tạo migration 018 thêm package_id, payment_status vào registrations, tạo bảng sepay_transactions, và trigger tự động thêm notification cho Admin | `migrations/018_add_package_to_registrations.sql` | S |
| 2 | DB: Chạy migration cập nhật Database | — | XS |
| 3 | Frontend: Cập nhật form đăng ký cho phép chọn gói học | `src/pages/public/RegisterCoursePage.tsx` | S |
| 4 | Frontend: Xây dựng màn hình hiển thị mã VietQR động sau khi gửi đơn thành công | `src/pages/public/RegisterCoursePage.tsx` | M |
| 5 | Edge Function: Viết webhook nhận dữ liệu giao dịch chuyển khoản từ Sepay và tự động tạo học viên, cấp thẻ, xếp lớp | `supabase/functions/sepay-webhook/index.ts` | L |
| 6 | Admin UI: Cập nhật danh sách đơn đăng ký hiển thị trạng thái thanh toán và thông tin gói học | `src/pages/admin/RegistrationsPage.tsx` | S |
| 7 | PWA / Notifications: Yêu cầu quyền Browser Notification khi Admin đăng nhập và đẩy thông báo desktop dạng native khi có real-time notification mới | `src/components/layout/AppLayout.tsx`, `src/hooks/useNotifications.ts` | S |
| 8 | Build: Chạy typecheck và build dự án | — | S |

## Acceptance Criteria
- [ ] Form đăng ký có thêm dropdown chọn gói học lấy dữ liệu động từ danh sách `packages` đang hoạt động.
- [ ] Sau khi gửi đơn đăng ký thành công, hiển thị trang hướng dẫn thanh toán kèm mã VietQR sinh ra chính xác số tiền, số tài khoản và cú pháp chuyển khoản dạng `TPB{id_rut_gon}`.
- [ ] Khi đơn đăng ký mới được tạo, database trigger tự động chèn thông báo cho toàn bộ tài khoản Admin.
- [ ] Admin đăng nhập sẽ được hiển thị thông báo yêu cầu cấp quyền Desktop Notifications của trình duyệt.
- [ ] Khi có thông báo mới (đăng ký mới hoặc thanh toán thành công), Admin sẽ nhận được thông báo native trên hệ điều hành ngay cả khi trình duyệt/PWA đang thu nhỏ.
- [ ] Gửi mock request từ Sepay tới Edge Function `/sepay-webhook` với nội dung chuyển khoản hợp lệ.
- [ ] Edge Function xử lý thành công: tự động tạo Auth User, Profile, Student, xếp lớp (`class_students`), cấp thẻ học (`student_packages`) và lưu payment hóa đơn.
- [ ] Hóa đơn giao dịch lưu đúng và đối chiếu tránh xử lý trùng (Idempotency) trong bảng `sepay_transactions`.
- [ ] Admin duyệt thủ công cho đơn chưa thanh toán vẫn hoạt động bình thường và chuẩn xác.
- [ ] `npm run build` thành công, không cảnh báo hay lỗi kiểu dữ liệu.

## Risks / Notes
- Định dạng mã chuyển khoản VietQR: Cần sử dụng mã rút gọn UUID (ví dụ 8 ký tự đầu) để tránh vượt quá giới hạn độ dài memo chuyển khoản của ngân hàng.
- RLS Policy cho bảng `sepay_transactions`: Chỉ cho phép `service_role` ghi và đọc nội bộ, Admin có quyền xem đối soát.
- Edge Function `sepay-webhook` phải kiểm tra tính toàn vẹn (API Key từ Sepay) trước khi xử lý giao dịch.
- Trình duyệt yêu cầu phải có tương tác của người dùng hoặc sự đồng ý rõ ràng trước khi cấp quyền `Notification.requestPermission()`. Cần xử lý khéo léo để tránh chặn/gây phiền cho người dùng.
