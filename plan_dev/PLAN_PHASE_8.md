# Plan: Phase 8 — Đăng Ký Khóa Học, Lịch Học Trực Quan & Điểm Danh QR

## Mục tiêu
Triển khai hệ thống đăng ký học viên công cộng thông qua form thông tin y tế đầy đủ, xử lý kiểm tra số lượng slot trống trong lớp học, cải tiến giao diện lịch sử điểm danh của học viên dưới dạng bảng và punch-card trực quan, tích hợp tính năng điểm danh bằng mã QR cho phép HLV ghi nhận học viên tham dự buổi tập thực tế (kể cả học bù). Sửa lỗi runtime slice trên LandingPage.

## Phụ thuộc
- Phase 7 đã hoàn thành: Y
- Files cần đọc/sửa:
  - `src/pages/public/LandingPage.tsx`
  - `src/pages/student/AttendancePage.tsx`
  - `src/pages/student/DashboardPage.tsx`
  - `src/components/layout/Sidebar.tsx`
  - `src/App.tsx`

## Tasks
| # | Task | File(s) sẽ tạo/sửa | Ước tính |
|---|------|---------------------|----------|
| 1 | Bugfix: Sửa lỗi slice of null trên LandingPage khi schedule_time rỗng | `src/pages/public/LandingPage.tsx` | XS |
| 2 | DB: Tạo bảng `registrations` lưu trữ đơn đăng ký mới và Storage bucket `student-photos` | `migrations/017_create_registrations_table.sql` | S |
| 3 | Frontend: Xây dựng trang đăng ký khóa học công cộng với đầy đủ 10 câu hỏi sức khỏe, thông tin phụ huynh và upload ảnh học sinh | `src/pages/public/RegisterCoursePage.tsx` | L |
| 4 | Routing: Điều hướng các nút Đăng ký trên LandingPage sang trang đăng ký khóa học | `src/pages/public/LandingPage.tsx`, `src/App.tsx` | S |
| 5 | Admin UI: Trang hiển thị và phê duyệt đơn đăng ký học, thêm vào lớp tự động | `src/pages/admin/RegistrationsPage.tsx`, `src/components/layout/Sidebar.tsx` | M |
| 6 | Student UI: Thiết kế lại lịch sử điểm danh dạng bảng và punch-card đếm số buổi thẻ học | `src/pages/student/AttendancePage.tsx` | M |
| 7 | QR Code Student: Modal hiển thị mã QR check-in tích hợp đường dẫn điểm danh | `src/pages/student/DashboardPage.tsx` | S |
| 8 | QR Code Coach: Trang quét QR, xem thông tin học sinh và chọn lớp để điểm danh (hỗ trợ học bù) | `src/pages/coach/ScanAttendancePage.tsx`, `src/App.tsx`, `src/components/layout/Sidebar.tsx` | L |
| 9 | Build: Kiểm tra typecheck và biên dịch thành công hệ thống | — | S |

## Acceptance Criteria
- [ ] Lỗi runtime crash slice of null trên LandingPage được khắc phục triệt để.
- [ ] Bấm vào đăng ký trên LandingPage điều hướng sang `/register-course?classId=...`.
- [ ] Form đăng ký hiển thị đầy đủ các trường thông tin y tế, cam kết trách nhiệm và upload ảnh xem trước.
- [ ] Gửi đơn đăng ký tự động kiểm tra số lượng học viên hiện tại của lớp so với `max_students` để trả về thành công/thất bại.
- [ ] Lớp Trung cấp/Nâng cao hiển thị note cảnh báo kiểm tra đầu vào tại buổi học đầu tiên.
- [ ] Đơn đăng ký thành công được lưu vào bảng `registrations` và ảnh tải lên lưu ở Supabase Storage bucket.
- [ ] Admin xem được danh sách đơn, phê duyệt đơn sẽ tự tạo user/profile học sinh mới và thêm vào lớp học tương ứng.
- [ ] Giao diện điểm danh của học viên hiển thị dưới dạng bảng chi tiết rõ ràng thay vì dạng danh sách thô sơ.
- [ ] Hiển thị punch-card trực quan số buổi tập đã tham gia/còn lại tương tự thẻ tích điểm trên trang thẻ học/điểm danh của học viên.
- [ ] Học viên mở được Modal chứa mã QR cá nhân đại diện cho liên kết điểm danh của mình.
- [ ] HLV mở trang quét QR, sau khi quét hoặc chọn học viên sẽ hiện giao diện cho phép tự chọn buổi học (hỗ trợ học bù) và trạng thái điểm danh phù hợp, không tự động điền buổi học mặc định của học sinh.
- [ ] Build thành công với `npm run build` không cảnh báo hay lỗi.

## Risks / Notes
- RLS cho bảng `registrations` phải được kiểm tra kỹ: anon được `insert` nhưng không được `select`/`update`/`delete`.
- Supabase Storage bucket `student-photos` phải cho phép anon upload và đọc ảnh công khai.
- Logic kiểm tra số lượng slot trống của lớp học phải dựa trên số lượng bản ghi `class_students` có status là `active` liên kết với class đó.
- Trang điểm danh của HLV khi quét QR cần phải hỗ trợ danh sách chọn buổi học linh hoạt để ghi nhận buổi tập thực tế của học sinh (đáp ứng đúng yêu cầu học bù buổi khác của trung tâm).
