# Plan: Phase 10 — Tính Năng Huấn Luyện Viên, Trợ Giảng & Quản Lý Giáo Án Chuyên Nghiệp

## Mục tiêu
Nâng cấp toàn diện các tính năng dành cho Huấn luyện viên (HLV) và Trợ giảng:
1. **Quản lý Giáo án Chuyên nghiệp (Lesson Plans)**: HLV có thể soạn giáo án chuẩn hóa theo mẫu (gồm mục tiêu, trang thiết bị, chuỗi bài tập có thời lượng, nhận xét và đánh giá mẫu), cho phép tái sử dụng hoặc nhân bản giáo án của đồng nghiệp.
2. **Chia sẻ Giáo án Công khai (Public Lesson Sharing)**: Tích hợp nút chia sẻ giáo án công khai thông qua liên kết công cộng cho phụ huynh học viên xem kế hoạch dạy học của con.
3. **Phân quyền Trợ giảng (Teaching Assistants)**: Bổ sung vai trò `assistant` (Trợ giảng), cho phép gán trực tiếp trợ giảng cho một HLV trưởng (Leader). HLV trưởng phân công giáo án vào buổi học để trợ giảng theo dõi và dạy theo giáo án.
4. **Điểm danh & Đánh giá**: Tối ưu hóa giao diện điểm danh và đánh giá học viên thuộc các lớp được phân công.

## Phụ thuộc
- Phase 9 đã hoàn thành: Y
- Files cần đọc/sửa:
  - `src/router.tsx`
  - `src/components/layout/Sidebar.tsx`
  - `src/pages/coach/SessionsPage.tsx`
  - `src/pages/coach/DashboardPage.tsx`
  - `src/pages/coach/AttendancePage.tsx`
  - `src/pages/coach/ProgressPage.tsx`

## Tasks
| # | Task | File(s) sẽ tạo/sửa | Ước tính |
|---|------|---------------------|----------|
| 1 | **DB: Migrations**<br>- Cập nhật check constraint của `profiles.role` để hỗ trợ vai trò `'assistant'`. <br>- Tạo bảng `coach_assistants` liên kết Leader-Member.<br>- Tạo bảng `lesson_plans` chứa toàn bộ metadata giáo án cấu trúc phức tạp.<br>- Thêm cột `lesson_plan_id` vào bảng `sessions` để HLV gắn giáo án vào buổi dạy. | `migrations/024_create_lesson_plans_and_assistants.sql` | S |
| 2 | **Frontend: Router & Roles**<br>- Cấu hình route mới cho quản lý giáo án và trang xem giáo án công khai `/shared/lessons/:id`. <br>- Cập nhật `RequireRole` và `Sidebar` hiển thị nav-items phù hợp cho HLV Trưởng và Trợ giảng. | `src/router.tsx`<br>`src/components/layout/Sidebar.tsx` | S |
| 3 | **Frontend: Giao diện Thư viện Giáo án (`/coach/lesson-plans`)**<br>- Xây dựng trang thư viện giáo án tổng hợp (cho phép xem giáo án của tôi, giáo án được công khai của các HLV khác).<br>- Hỗ trợ nút nhân bản (Clone) giáo án có sẵn. | `src/pages/coach/LessonPlanLibraryPage.tsx` | M |
| 4 | **Frontend: Soạn Giáo án mới / Chỉnh sửa**<br>- Form thiết kế giáo án chuyên nghiệp dựa trên ảnh mẫu (gồm: địa điểm, thời lượng, mục tiêu buổi tập, bảng danh sách bài tập động có thời lượng, mục tiêu số, mô tả chi tiết, nhận xét, đánh giá). | `src/pages/coach/LessonPlanFormPage.tsx` | L |
| 5 | **Frontend: Public Share View (`/shared/lessons/:id`)**<br>- Xây dựng trang xem chi tiết giáo án công khai thân thiện, tối ưu giao diện in ấn (print-friendly) để phụ huynh xem không cần đăng nhập. | `src/pages/public/SharedLessonPage.tsx` | S |
| 6 | **Frontend: Gắn giáo án vào buổi học**<br>- Trong danh sách buổi học của HLV (`SessionsPage.tsx` / `DashboardPage.tsx`), cho phép HLV chọn giáo án từ thư viện để áp dụng cho buổi học. | `src/pages/coach/SessionsPage.tsx` | S |
| 7 | **Admin/Coach: Quản lý Trợ giảng**<br>- Thêm tab quản lý trợ giảng trong Settings hoặc User Management để HLV trưởng/Admin liên kết Trợ giảng vào nhóm của mình. | `src/pages/admin/UsersPage.tsx`<br>`src/pages/coach/AssistantsManagementPage.tsx` | M |
| 8 | **Build & Verify**<br>- Kiểm tra typecheck và build dự án chạy sạch lỗi. | — | S |

## Acceptance Criteria
- [ ] Database hỗ trợ lưu trữ giáo án chuẩn hóa với danh sách mục tiêu buổi học và chuỗi bài tập chi tiết dạng JSONB.
- [ ] HLV có thể soạn thảo, chỉnh sửa, xóa và nhân bản (clone) giáo án.
- [ ] Giao diện form soạn giáo án chia rõ ràng các phần: Thông tin chung, Mục tiêu buổi tập, Bảng bài tập (Add/Remove dòng động), Nhận xét & Đánh giá mẫu.
- [ ] HLV có thể gán giáo án vào bất kỳ buổi học nào trong danh sách buổi học.
- [ ] HLV có thể bật chế độ công khai giáo án. Khi bật công khai, phụ huynh truy cập link chia sẻ `/shared/lessons/:id` xem được chi tiết giáo án (không yêu cầu đăng nhập).
- [ ] Role `assistant` (Trợ giảng) được hỗ trợ. Trợ giảng đăng nhập thấy lớp học được phân công và xem được giáo án đính kèm của buổi học để triển khai bài dạy.
- [ ] `npm run build` và `npm run typecheck` chạy hoàn toàn không có lỗi.

## Risks / Notes
- **Độ linh hoạt của cấu trúc giáo án**: Cần lưu trữ các bài tập dưới dạng mảng JSONB trong PostgreSQL để dễ dàng cập nhật danh sách bài tập động mà không cần tạo quá nhiều bảng liên kết phụ.
- **Bảo mật RLS cho Giáo án**: Giáo án chỉ được chỉnh sửa bởi người tạo. Các HLV khác chỉ có quyền đọc/nhân bản nếu giáo án được thiết lập trạng thái công khai (`is_public = true`).
