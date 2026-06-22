# Handoff: Phase 12 — Quản Lý Profile & Tuyển Dụng HLV/Trợ Giảng

## Tóm tắt
Đã hoàn thành xây dựng phân hệ tuyển dụng nhân sự trực tuyến và quản lý hồ sơ chuyên môn thời gian thực cho Huấn luyện viên (Coach) và Trợ giảng (Assistant). Tính năng bao gồm form đăng ký ứng tuyển công khai, trang phê duyệt tập trung của Admin, tự động đồng bộ tài khoản, cập nhật hồ sơ chi tiết và thông báo hệ thống tự động. Đồng thời tối ưu giao diện Mobile với thanh điều hướng nổi và cải thiện UX cho người dùng Phụ huynh.

## Tính năng đã implement
| Tính năng | File chính | Status |
|-----------|-----------|--------|
| Form đăng ký Coach | [RegisterCoachPage.tsx](file:///d:/antigravity/claude_code/management-class/src/pages/public/RegisterCoachPage.tsx) | ✅ Done |
| Form đăng ký Trợ giảng | [RegisterAssistantPage.tsx](file:///d:/antigravity/claude_code/management-class/src/pages/public/RegisterAssistantPage.tsx) | ✅ Done |
| Tích hợp Footer Landing | [LandingPage.tsx](file:///d:/antigravity/claude_code/management-class/src/pages/public/LandingPage.tsx) | ✅ Done |
| Trang phê duyệt ứng tuyển | [StaffRegistrationsPage.tsx](file:///d:/antigravity/claude_code/management-class/src/pages/admin/StaffRegistrationsPage.tsx) | ✅ Done |
| Tích hợp Menu Sidebar | [Sidebar.tsx](file:///d:/antigravity/claude_code/management-class/src/components/layout/Sidebar.tsx) | ✅ Done |
| Quản lý profile HLV/Trợ giảng | [UsersPage.tsx](file:///d:/antigravity/claude_code/management-class/src/pages/admin/UsersPage.tsx) | ✅ Done |
| Định tuyến router | [App.tsx](file:///d:/antigravity/claude_code/management-class/src/App.tsx) | ✅ Done |
| Tối ưu hiển thị & Tải ảnh QR | [ParentFamilyPage.tsx](file:///d:/antigravity/claude_code/management-class/src/pages/parent/ParentFamilyPage.tsx)<br>[RegisterCoursePage.tsx](file:///d:/antigravity/claude_code/management-class/src/pages/public/RegisterCoursePage.tsx)<br>[PackagesPage.tsx](file:///d:/antigravity/claude_code/management-class/src/pages/student/PackagesPage.tsx)<br>[DashboardPage.tsx](file:///d:/antigravity/claude_code/management-class/src/pages/student/DashboardPage.tsx)<br>[SettingsPage.tsx](file:///d:/antigravity/claude_code/management-class/src/pages/admin/SettingsPage.tsx) | ✅ Done |
| Mobile Bottom Bar uốn lượn | [MobileBottomBar.tsx](file:///d:/antigravity/claude_code/management-class/src/components/layout/MobileBottomBar.tsx)<br>[AppLayout.tsx](file:///d:/antigravity/claude_code/management-class/src/components/layout/AppLayout.tsx) | ✅ Done |
| Sửa menu UI & Mobile Sub-Header | [Header.tsx](file:///d:/antigravity/claude_code/management-class/src/components/layout/Header.tsx) | ✅ Done |

## Functions / Hooks đã tạo
| Tên | File | Mô tả |
|-----|------|-------|
| `notify_admin_on_staff_registration()` | [029_coach_assistant_registrations.sql](file:///d:/antigravity/claude_code/management-class/migrations/029_coach_assistant_registrations.sql) | Trigger PostgreSQL thông báo Realtime cho các Admin khi có đơn tuyển dụng mới. |
| `CreateUserPayload` update | [index.ts](file:///d:/antigravity/claude_code/management-class/supabase/functions/create-user/index.ts) | Cập nhật payload Edge Function để hỗ trợ thêm quyền `assistant`. |
| `handleDownloadQr()` | [ParentFamilyPage.tsx](file:///d:/antigravity/claude_code/management-class/src/pages/parent/ParentFamilyPage.tsx) | Hàm fetch ảnh QR về máy khách dưới dạng Blob để bỏ qua CORS. |
| `MobileBottomBar` component | [MobileBottomBar.tsx](file:///d:/antigravity/claude_code/management-class/src/components/layout/MobileBottomBar.tsx) | Component thanh điều hướng dưới cùng lơ lửng, uốn lượn. |

## Database changes
- **Bảng mới**:
  - `assistants`: Lưu trữ thông tin chi tiết về học vấn, kỹ năng, kinh nghiệm của Trợ giảng.
  - `coach_assistant_registrations`: Lưu trữ thông tin đơn nộp ứng tuyển tuyển dụng của HLV và Trợ giảng.
- **RLS Policies**: Admin toàn quyền quản lý, ứng viên tự đăng ký.
- **Triggers**: Cập nhật `updated_at` và thông báo Realtime cho Admin.

## Chưa xử lý / Known Issues
- Không có.

## Hướng dẫn test (dành cho QC)

### Setup
1. Đảm bảo chạy di trú database: `npm run migrate`.
2. Khởi chạy ứng dụng cục bộ: `npm run dev`.

### Test cases
| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 1 | Ứng tuyển HLV công khai | 1. Truy cập `/register-coach`<br>2. Điền đầy đủ thông tin<br>3. Bấm gửi đơn | - Lưu thành công vào bảng `coach_assistant_registrations`. |
| 2 | Duyệt đơn tuyển dụng & Tạo TK | 1. Đăng nhập Admin.<br>2. Đi tới mục **Đơn ứng tuyển**.<br>3. Phê duyệt hồ sơ. | - Gọi Edge Function tạo tài khoản Auth + Profile + HLV/Trợ giảng thành công. |
| 3 | Tải ảnh QR & Hiệu ứng Loading | 1. Mở modal QR.<br>2. Quan sát spinner loading.<br>3. Bấm nút **Tải xuống mã QR**. | - Có spinner loading xoay tròn.<br>- Tải thành công file ảnh QR về máy. |
| 4 | Mobile Bottom Bar | 1. Giả lập màn hình mobile.<br>2. Quan sát thanh bar lơ lửng dưới cùng. | - Hiển thị đúng 5 nút điều hướng.<br>- Nội dung có đệm phía dưới (`pb-24`). |
| 5 | Mobile Sub-Header chọn con | 1. Đăng nhập Phụ huynh.<br>2. Truy cập `/parent/schedule`. | - Ô chọn con nằm ở thanh Sub-Header đỏ nhạt dưới header chính. |
| 6 | Ẩn bộ chọn con thông minh | 1. Truy cập trang `/parent/dashboard` hoặc `/parent/family`. | - Header chính và sub-header ẩn bộ chọn con (do xem toàn bộ). |

### Test accounts
| Role | Email | Password |
|------|-------|---------|
| Admin | admin@test.com | Test@123 |
| Phụ huynh | parent@test.com | Test@123 |
