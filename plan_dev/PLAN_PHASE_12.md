# Plan: Phase 12 — Quản Lý Profile & Tuyển Dụng HLV/Trợ Giảng

## Mục tiêu
Phát triển tính năng tuyển dụng và quản lý hồ sơ chuyên nghiệp cho Huấn luyện viên (Coach) và Trợ giảng (Assistant):
1. **Biểu mẫu Đăng ký Tuyển dụng Công khai (Public Registration Forms)**: Cung cấp 2 form đăng ký chuyên nghiệp cho ứng viên Coach (`/register-coach`) và Trợ giảng (`/register-assistant`) với các nội dung chi tiết về chuyên môn, chứng chỉ, kinh nghiệm.
2. **Luồng Phê duyệt của Admin (Admin Approval Flow)**: Admin quản lý danh sách đơn ứng tuyển tại trang `/admin/staff-registrations`, có quyền Duyệt (hệ thống tự tạo tài khoản Auth + Profile + bản ghi HLV/Trợ giảng và gửi thông báo) hoặc Từ chối (nhập lý do).
3. **Quản lý Profile HLV & Trợ giảng (Staff Profile Management)**: Admin xem và cập nhật hồ sơ chuyên môn chi tiết của các HLV và Trợ giảng đang hoạt động tại trang `/admin/users` (tích hợp các trường chuyên môn, kinh nghiệm, bằng cấp, đại học, v.v.).
4. **Hệ thống Thông báo (Notification System)**: Tự động gửi thông báo Realtime cho các Admin khi có đơn đăng ký mới và gửi thông báo chào mừng cho thành viên mới khi được phê duyệt.

## Phụ thuộc
- Phase 11 đã hoàn thành: Y
- Files cần đọc/sửa:
  - `src/App.tsx`
  - `src/components/layout/Sidebar.tsx`
  - `src/pages/admin/UsersPage.tsx`
  - `supabase/functions/create-user/index.ts`

## Tasks
| # | Task | File(s) sẽ tạo/sửa | Ước tính |
|---|------|---------------------|----------|
| 1 | **DB: Migrations**<br>- Tạo bảng `assistants` quản lý hồ sơ Trợ giảng.<br>- Tạo bảng `coach_assistant_registrations` lưu đơn đăng ký ứng tuyển của HLV và Trợ giảng.<br>- Thiết lập RLS policies bảo vệ dữ liệu.<br>- Tạo Trigger PostgreSQL tự động thông báo cho tất cả Admin khi có ứng viên đăng ký mới. | `migrations/029_coach_assistant_registrations.sql` | M |
| 2 | **Deno: Edge Function**<br>- Cập nhật function `create-user` để hỗ trợ tạo role `assistant`.<br>- Tự động khởi tạo bản ghi trong bảng `assistants` tương ứng khi phê duyệt trợ giảng. | `supabase/functions/create-user/index.ts` | S |
| 3 | **Types: TS Generation**<br>- Chạy migration lên database và cập nhật `database.types.ts` cùng `src/types/index.ts` để đồng bộ các bảng mới. | `src/types/database.types.ts`<br>`src/types/index.ts` | S |
| 4 | **Frontend: Form Đăng ký HLV (`/register-coach`)**<br>- Giao diện form đăng ký Coach chuẩn hóa: Thông tin cá nhân, Số năm kinh nghiệm, Chuyên môn huấn luyện, Thành tích thi đấu, Giới thiệu ngắn (Bio), Tải ảnh chân dung (base64) và Bằng cấp/Chứng chỉ. | `src/pages/public/RegisterCoachPage.tsx` | M |
| 5 | **Frontend: Form Đăng ký Trợ giảng (`/register-assistant`)**<br>- Giao diện form đăng ký Trợ giảng: Thông tin cá nhân, Trường học/Đại học đang theo học, Chuyên ngành, Kỹ năng bổ trợ, Ảnh chân dung, v.v. | `src/pages/public/RegisterAssistantPage.tsx` | M |
| 6 | **Frontend: Tích hợp Landing Page & Router**<br>- Khai báo các route mới: `/register-coach`, `/register-assistant`, `/admin/staff-registrations`.<br>- Bổ sung liên kết ứng tuyển tại chân trang (Footer) của Landing Page. | `src/App.tsx`<br>`src/pages/public/LandingPage.tsx` | S |
| 7 | **Frontend: Trang Phê duyệt của Admin (`/admin/staff-registrations`)**<br>- Thiết kế màn hình quản lý đơn đăng ký: bộ lọc trạng thái (Chờ duyệt, Đã duyệt, Đã từ chối), tìm kiếm theo họ tên/SĐT.<br>- Modal hiển thị chi tiết hồ sơ cực kỳ chuyên nghiệp kèm ảnh chân dung.<br>- Nút Duyệt (gọi Edge Function `create-user` tạo tài khoản và gửi noti) và Từ chối (nhập lý do từ chối). | `src/pages/admin/StaffRegistrationsPage.tsx`<br>`src/components/layout/Sidebar.tsx` | M |
| 8 | **Frontend: Quản lý Profile HLV & Trợ giảng (`/admin/users`)**<br>- Cải tiến Modal chỉnh sửa thông tin trong `UsersPage.tsx`.<br>- Nếu là HLV: Cho phép xem/sửa `specialty`, `experience_years`, `bio`, `certifications`.<br>- Nếu là Trợ giảng: Cho phép xem/sửa `school_university`, `major`, `year_of_study`, `skills`, `bio`, `certifications`. | `src/pages/admin/UsersPage.tsx` | M |
| 9 | **Frontend: Tối ưu hiển thị & Tải ảnh QR**<br>- Tích hợp spinner loading (`Loader2`) cho mọi ảnh QR (VietQR và QR đi học).<br>- Thêm nút "Tải xuống mã QR" (`Download`) fetch Blob ảnh và lưu về thiết bị.<br>- Cập nhật note lưu ý thanh toán nhấn mạnh không sử dụng lại mã QR cũ. | `src/pages/parent/ParentFamilyPage.tsx`<br>`src/pages/public/RegisterCoursePage.tsx`<br>`src/pages/student/PackagesPage.tsx`<br>`src/pages/student/DashboardPage.tsx`<br>`src/pages/admin/SettingsPage.tsx` | S |
| 10 | **Frontend: Sửa Menu UI & Sub-Header Mobile**<br>- Sửa lỗi dồn chữ tiêu đề trang trên mobile.<br>- Di chuyển bộ chọn con của phụ huynh xuống thanh Sub-Header mỏng nằm dính dưới header chính trên di động. | `src/components/layout/Header.tsx` | S |
| 11 | **Frontend: Mobile Bottom Bar**<br>- Thiết kế dock điều hướng di động lơ lửng, uốn lượn.<br>- Tích hợp nút đỏ gradient chính giữa nổi bật làm điểm nhấn. | `src/components/layout/MobileBottomBar.tsx`<br>`src/components/layout/AppLayout.tsx` | S |
| 12 | **Frontend: Ẩn Child Switcher thông minh**<br>- Ẩn ChildSwitcher trên các trang xem thông tin chung của tất cả các con (`/parent/dashboard` và `/parent/family`) và chỉ hiển thị ở các trang chi tiết riêng biệt. | `src/components/layout/Header.tsx` | S |
| 13 | **Build & Verify**<br>- Chạy `npm run typecheck` và `npm run build` để đảm bảo hệ thống không có lỗi biên dịch và chạy trơn tru. | `tests/e2e/10-phase12-recruitment.spec.ts` | S |

## Acceptance Criteria
- [ ] Database hỗ trợ bảng `assistants` và `coach_assistant_registrations` đầy đủ khóa ngoại, RLS và triggers.
- [ ] Ứng viên có thể điền đơn tuyển dụng trực tuyến tại `/register-coach` và `/register-assistant`. Các trường dữ liệu chuẩn, có kiểm tra hợp lệ chi tiết (Zod/HTML5 validation).
- [ ] Khi có ứng tuyển mới, mọi Admin trong hệ thống đều nhận được thông báo Realtime với tiêu đề và mô tả rõ ràng.
- [ ] Admin có thể xem chi tiết hồ sơ ứng viên tại `/admin/staff-registrations`.
- [ ] Khi duyệt đơn ứng tuyển, hệ thống gọi Edge Function tạo tài khoản Auth thành công, cấp quyền tương ứng (HLV/Trợ giảng) và gửi thông báo chào mừng vào tài khoản của họ.
- [ ] Khi từ chối đơn ứng tuyển, cập nhật trạng thái đơn thành `'rejected'` kèm lý do từ chối.
- [ ] Trang quản lý người dùng `/admin/users` hỗ trợ cập nhật toàn diện các thông tin profile đặc thù của HLV và Trợ giảng.
- [ ] Các ảnh QR trên hệ thống đều có spinner loading khi đang tải và có nút Tải ảnh xuống hoạt động tốt (hoặc mở tab mới khi bị CORS).
- [ ] Header mobile không còn bị dồn dòng; bộ chọn con của phụ huynh chuyển thành Sub-Header mỏng nằm sticky dưới header chính.
- [ ] Tích hợp thanh Mobile Bottom Bar dạng Floating curved dock đẹp mắt, có nút đỏ ở giữa nổi bật làm điểm nhấn.
- [ ] Ẩn ChildSwitcher hợp lý tại trang Dashboard và Quản lý con.
- [ ] `npm run build` và `npm run typecheck` hoàn toàn thành công, không phát sinh lỗi hoặc cảnh báo mới.

## Risks / Notes
- **Lưu trữ ảnh ứng viên**: Ảnh chân dung của HLV và Trợ giảng sẽ được nén về dạng Base64 và lưu trữ trực tiếp dưới dạng chuỗi văn bản trong trường `avatar_url` (bảng `coach_assistant_registrations` và `profiles`) để tối ưu hóa lưu trữ và tránh cấu hình bucket phức tạp.
- **Quyền Admin khi gọi Edge Function**: Cần đảm bảo caller gửi đúng JWT token của tài khoản Admin hiện tại khi thực hiện phê duyệt đơn để vượt qua lớp kiểm tra quyền trong Edge Function.
- **Tải ảnh di động qua CORS**: Sử dụng fetch blob có thể gặp lỗi CORS trên một số trình duyệt khi gọi domain bên ngoài. Cần đảm bảo có block fallback `window.open` để người dùng tải ảnh thủ công.
