# Handoff: Phase 9 — Thanh Toán Tự Động VietQR & Thông Báo PWA Admin

## Tóm tắt
Đã tích hợp mã VietQR động vào trang đăng ký học viên công cộng, xây dựng Edge Function tiếp nhận Webhook Sepay để tự động phê duyệt đơn học viên và đồng bộ hóa hệ thống thông báo đẩy trình duyệt thời gian thực (Desktop Notification) đáp ứng trải nghiệm PWA cho Admin.

## Tính năng đã implement
| Tính năng | File chính | Status |
|-----------|-----------|--------|
| Form đăng ký kèm gói học & VietQR | src/pages/public/RegisterCoursePage.tsx | ✅ Done |
| Phê duyệt và log giao dịch trong Admin | src/pages/admin/RegistrationsPage.tsx | ✅ Done |
| Yêu cầu quyền thông báo đẩy | src/components/layout/AppLayout.tsx | ✅ Done |
| Đẩy thông báo hệ thống thời gian thực | src/hooks/useNotifications.ts | ✅ Done |
| Webhook Sepay Edge Function | supabase/functions/sepay-webhook/index.ts | ✅ Done |
| DB Migration & Triggers thông báo | migrations/018_add_package_to_registrations.sql | ✅ Done |

## Functions / Hooks đã tạo
| Tên | File | Mô tả |
|-----|------|-------|
| notify_new_registration() | migrations/018_add_package_to_registrations.sql | Trigger DB tự động thông báo cho tất cả Admin khi có đăng ký mới |
| notify_registration_payment() | migrations/018_add_package_to_registrations.sql | Trigger DB tự động thông báo cho tất cả Admin khi đăng ký được xác nhận thanh toán |
| sepay-webhook | supabase/functions/sepay-webhook/index.ts | Edge Function xử lý webhook từ Sepay, tự động tạo học sinh, kích hoạt thẻ và xếp lớp |

## Database changes
- Cột `package_id` và `payment_status` trong bảng `registrations`.
- Bảng `sepay_transactions` lưu vết webhook của Sepay ngân hàng.
- Nới lỏng check constraint trên bảng `notifications` để cho phép kiểu thông báo `'new_registration'`.

## Chưa xử lý / Known Issues
Không có. Tất cả các luồng hoạt động đồng bộ và đã được typecheck sạch sẽ.

## Hướng dẫn test (dành cho QC)

### Setup
1. Chạy `npm run migrate` để cập nhật Database địa phương.
2. Thiết lập env key `SEPAY_WEBHOOK_KEY` trong file cấu hình Edge Function (nếu cần bảo mật).

### Test cases
| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 1 | Đăng ký công cộng có thanh toán | Truy cập `/register-course`, chọn lớp và chọn gói học. Điền thông tin y tế và gửi đơn. | Hệ thống chuyển sang trang VietQR hiển thị thông tin thanh toán chi tiết kèm cú pháp chuyển khoản `TPB{short_uuid}`. |
| 2 | Nhận Webhook tự động duyệt | Gửi mock POST request đến `/functions/v1/sepay-webhook` giả lập Sepay gửi chuyển khoản đúng cú pháp và số tiền. | Đơn đăng ký tự động chuyển sang trạng thái `'paid'` và `'approved'`, tạo tài khoản học viên và kích hoạt thẻ, xếp lớp tương ứng. Trang phụ huynh đang mở tự động chuyển sang báo "Thanh toán thành công" theo thời gian thực. |
| 3 | Phê duyệt thủ công | Admin truy cập `/admin/registrations` và bấm duyệt thủ công cho đơn chưa thanh toán. | Học viên vẫn được tạo tài khoản, kích hoạt thẻ và xếp lớp bình thường. Trạng thái thanh toán cập nhật thành `'paid'`. |
| 4 | Thông báo đẩy Admin | Admin đăng nhập và đồng ý cấp quyền thông báo trình duyệt. Phụ huynh gửi đơn đăng ký mới. | Hệ thống gửi notification vào DB và Admin nhận được popup thông báo native trên góc màn hình Desktop ngay cả khi PWA đang thu nhỏ. |

### Test accounts
| Role | Email | Password |
|------|-------|---------|
| Admin | admin@test.com | Test@123 |
