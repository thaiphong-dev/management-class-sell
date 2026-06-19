# Handoff: Phase 10 — Tính Năng Huấn Luyện Viên, Trợ Giảng & Quản Lý Giáo Án Chuyên Nghiệp

## Tóm tắt
Đã triển khai hoàn tất Phase 10 bao gồm: Cấu trúc cơ sở dữ liệu và các RLS policies cho Giáo án và Trợ giảng; chức năng quản lý Giáo án mẫu (soạn, sao chép/clone, chia sẻ); gán Trợ giảng dưới quyền HLV Trưởng; liên kết giáo án vào buổi dạy; và hỗ trợ đầy đủ vai trò Trợ giảng đăng nhập xem giáo án được giao.

## Tính năng đã implement
| Tính năng | File chính | Status |
|-----------|-----------|--------|
| Migration Giáo án & Trợ giảng | `migrations/024_create_lesson_plans_and_assistants.sql` | ✅ Done |
| Quản lý Trợ giảng cho HLV | `src/pages/coach/AssistantsManagementPage.tsx` | ✅ Done |
| Phân quyền & Navigation Trợ giảng | `src/components/layout/Sidebar.tsx` · `src/components/auth/RequireAuth.tsx` | ✅ Done |
| Thư viện giáo án (Library) | `src/pages/coach/LessonPlanLibraryPage.tsx` | ✅ Done |
| Form Soạn giáo án mẫu chuyên nghiệp | `src/pages/coach/LessonPlanFormPage.tsx` | ✅ Done |
| Xem & Chia sẻ giáo án công khai | `src/pages/public/SharedLessonPage.tsx` | ✅ Done |
| Gán giáo án vào buổi học | `src/pages/coach/SessionsPage.tsx` | ✅ Done |
| Quản lý tài khoản Trợ giảng (Admin) | `src/pages/admin/UsersPage.tsx` | ✅ Done |

## Functions / Hooks đã tạo
| Tên | File | Mô tả |
|-----|------|-------|
| `loadClasses` (Updated) | `src/pages/coach/ClassesPage.tsx` | Cập nhật để hỗ trợ hiển thị các lớp học cho vai trò Trợ giảng thông qua các HLV trưởng liên kết. |
| `loadData` / `updateSessionStatus` | `src/pages/coach/SessionsPage.tsx` | Cập nhật phân quyền truy cập cho Trợ giảng, đồng thời hỗ trợ tải và cập nhật `lesson_plan_id` của buổi học. |

## Database changes
- Cập nhật check constraint cho cột `profiles.role` để hỗ trợ vai trò `'assistant'`.
- Bảng mới `coach_assistants` để liên kết mối quan hệ HLV trưởng (`coach_id`) và Trợ giảng (`assistant_id`).
- Bảng mới `lesson_plans` để lưu cấu trúc giáo án bao gồm metadata, mục tiêu huấn luyện, và chuỗi bài tập chi tiết (dạng JSONB).
- Cột mới `lesson_plan_id` trong bảng `sessions` để liên kết giáo án vào buổi học cụ thể.
- RLS Policies tương ứng cho `lesson_plans` và `coach_assistants`.

## Chưa xử lý / Known Issues
Không có. Dự án đã build và typecheck thành công, không phát hiện lỗi.

## Hướng dẫn test (dành cho QC)

### Setup
1. Đảm bảo đã chạy migration `024_create_lesson_plans_and_assistants.sql` trên cơ sở dữ liệu Supabase.
2. Build ứng dụng locally bằng `npm run build` và kiểm tra typecheck bằng `npm run typecheck`.

### Test cases
| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 1 | Tạo trợ giảng | Đăng nhập Admin -> Thêm người dùng -> Chọn vai trò "Trợ giảng" | Tài khoản trợ giảng được tạo thành công |
| 2 | Gán trợ giảng | Đăng nhập HLV Trưởng -> Vào mục "Quản lý Trợ giảng" -> Nhấp "Thêm trợ giảng" -> Chọn trợ giảng vừa tạo | Trợ giảng xuất hiện trong danh sách đội ngũ dưới quyền |
| 3 | Tạo giáo án | Đăng nhập HLV Trưởng -> Thư viện giáo án -> Soạn giáo án mới -> Nhập mục tiêu, dụng cụ, bài tập huấn luyện -> Lưu lại | Giáo án được lưu thành công vào thư viện |
| 4 | Gán giáo án | Đăng nhập HLV Trưởng -> Lớp học -> Chọn lớp -> Thêm buổi học mới (hoặc bấm Cập nhật buổi học cũ) -> Chọn giáo án | Giáo án được liên kết và hiển thị badge trên buổi học |
| 5 | Xem giáo án trợ giảng | Đăng nhập Trợ giảng -> Vào "Lớp học trợ giảng" -> Xem chi tiết buổi học | Trợ giảng có thể xem giáo án HLV Trưởng đã đính kèm |
| 6 | Chia sẻ giáo án | Truy cập thư viện giáo án -> Click nút "Chia sẻ" -> Bật "Công khai giáo án" -> Copy link và mở tab ẩn danh | Phụ huynh/người ngoài xem được chi tiết giáo án (định dạng print-friendly) không cần đăng nhập |

### Test accounts
| Role | Email | Password |
|------|-------|---------|
| Admin | admin@test.com | Test@123 |
| HLV | coach@test.com | Test@123 |
| Trợ giảng | assistant@test.com | TPB@123 |
