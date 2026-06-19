# Handoff: Phase 9 — Thanh Toán Tự Động VietQR & Thông Báo PWA Admin

## Tóm tắt
Đã tích hợp quy trình tạo tài khoản tự động (mật khẩu mặc định: `TPB@123`) và thanh toán sau cho học viên. Tích hợp mã QR VietQR động tại Dashboard học viên cùng với quản lý thanh toán, tối ưu hóa giao diện cấu hình thông tin ngân hàng nhận thanh toán và bổ sung mã QR chuyển khoản thử nghiệm thực tế cho Admin. Đồng thời xử lý triệt để hiện tượng gọi API lặp lại 2 lần (do StrictMode) và thêm regex validate định dạng số điện thoại di động Việt Nam.

## Tính năng đã implement
| Tính năng | File chính | Status |
|-----------|-----------|--------|
| Form đăng ký kèm tạo tài khoản tự động & chọn thanh toán sau | `src/pages/public/RegisterCoursePage.tsx` | ✅ Done |
| Tích hợp VietQR thử nghiệm trực tiếp & Cài đặt ngân hàng | `src/pages/admin/SettingsPage.tsx` | ✅ Done |
| Bỏ qua tạo tài khoản trùng lặp khi phê duyệt đơn có sẵn | `src/pages/admin/RegistrationsPage.tsx` | ✅ Done |
| Quản lý Thẻ học chờ thanh toán, Hủy thẻ, Đăng ký mua tại Dashboard | `src/pages/student/PackagesPage.tsx` | ✅ Done |
| Loại bỏ StrictMode ngăn chặn API gọi 2 lần toàn hệ thống | `src/main.tsx` | ✅ Done |
| Webhook Sepay cập nhật đơn hàng có sẵn | `supabase/functions/webhook-sepay/index.ts` | ✅ Done |
| Edge Function đăng ký học viên công khai | `supabase/functions/register-student/index.ts` | ✅ Done |
| Cấu trúc Database liên kết đăng ký & thanh toán | `migrations/020_...`, `migrations/021_...`, `migrations/022_...`, `migrations/023_...` | ✅ Done |

## Functions / Hooks đã tạo
| Tên | File | Mô tả |
|-----|------|-------|
| register-student | `supabase/functions/register-student/index.ts` | Edge Function public tạo tài khoản học viên, profile, student, package và payment |
| webhook-sepay | `supabase/functions/webhook-sepay/index.ts` | Nhận webhook từ Sepay, đối chiếu giao dịch, cập nhật payment đã thanh toán |
| cancel_pending_registration() | `migrations/023_cancel_registration_rpc.sql` | DB RPC hủy bỏ đăng ký mua chưa thanh toán của học sinh |
| student_buy_package() | `migrations/023_cancel_registration_rpc.sql` | DB RPC cho phép học viên tự đăng ký mua gói học mới từ Dashboard |

## Database changes
- Thêm cột `bank_id`, `bank_account`, `bank_account_name`, `bank_bin`, `bank_branch` vào bảng `landing_settings`.
- Thêm cột `student_package_id` và `payment_id` vào bảng `registrations`.
- Cấu hình SELECT policy cho phép public người dùng theo dõi trạng thái đơn đăng ký.
- Tạo hàm Postgres RPC `cancel_pending_registration` và `student_buy_package`.

## Chưa xử lý / Known Issues
Không có. Dự án đã được kiểm tra và biên dịch sạch sẽ.

## Hướng dẫn test (dành cho QC)

### Setup
1. Thực thi toàn bộ lệnh SQL trong tệp `migrations/020_...` đến `023_...` trên Supabase SQL Editor.
2. Đảm bảo chạy lại lệnh deploy Edge Functions với cờ `--no-verify-jwt` để mở quyền công khai:
   ```bash
   npx supabase functions deploy register-student --no-verify-jwt
   npx supabase functions deploy webhook-sepay --no-verify-jwt
   ```

### Test cases
| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 1 | Đăng ký học tự tạo tài khoản | Truy cập `/register-course`, điền thông tin, nhập SĐT không đúng định dạng. | Form báo lỗi SĐT không hợp lệ. Sửa đúng và gửi form: Tài khoản được tạo tự động với mật khẩu `TPB@123`. |
| 2 | Thanh toán sau | Bấm nút **"Thanh toán sau"** trên trang thành công. | Hệ thống chuyển hướng về trang `/login`. Đăng nhập bằng Email vừa đăng ký và mật khẩu `TPB@123`. |
| 3 | Dashboard thẻ tập chờ thanh toán | Đăng nhập tài khoản học viên chưa thanh toán, truy cập trang Thẻ học. | Hiển thị thẻ học chờ thanh toán kèm mã QR VietQR động (chứa cú pháp `TPB{short_id}` và số tiền) và nút "Kiểm tra", "Hủy đơn". |
| 4 | Hủy đăng ký thẻ & mua gói mới | Học viên bấm **"Hủy đơn đăng ký"** hoặc bấm **"Đăng ký mua"** gói học khác dưới danh mục. | Đơn cũ bị hủy sạch sẽ. Dialog hiện lên cho phép chọn lớp học tương ứng và tạo mới hóa đơn thành công. |
| 5 | Quét mã thanh toán tự động | Gửi giao dịch mock vào webhook Sepay khớp cú pháp `TPB{short_id}`. | Trạng thái thanh toán cập nhật tức thì thành `paid` và thẻ học tự động kích hoạt. |
| 6 | Cấu hình Admin Settings | Đăng nhập tài khoản Admin, vào mục Cấu hình hệ thống. | Lưu thông tin ngân hàng thành công, hiển thị QR thử nghiệm thời gian thực ở bên dưới. |

### Test accounts
| Role | Email | Password |
|------|-------|---------|
| Admin | admin@test.com | Test@123 |
| Student | student_test@test.com | TPB@123 |
