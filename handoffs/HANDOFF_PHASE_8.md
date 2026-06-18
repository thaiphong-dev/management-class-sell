# Handoff: Phase 8 — Đăng Ký Khóa Học, Lịch Học Trực Quan & Điểm Danh QR

## Tóm tắt
Đã hoàn thành việc tích hợp luồng Đăng ký khóa học công cộng cho phụ huynh/học sinh vãng lai kèm khai báo sức khỏe đầy đủ, tự động kiểm tra slot trống của lớp học. Cải tiến giao diện theo dõi điểm danh học viên dạng bảng và thẻ punch-card. Đồng thời tích hợp tính năng điểm danh bằng mã QR (học sinh hiển thị mã QR và HLV quét mã để chọn buổi điểm danh/học bù).

## Tính năng đã implement
| Tính năng | File chính | Status |
|-----------|-----------|--------|
| Sửa lỗi slice of null trên LandingPage | `src/pages/public/LandingPage.tsx` | ✅ Done |
| Database & Storage đăng ký | `migrations/017_create_registrations_table.sql` | ✅ Done |
| Form đăng ký khóa học công cộng | `src/pages/public/RegisterCoursePage.tsx` | ✅ Done |
| Quản lý & Phê duyệt đơn đăng ký (Admin) | `src/pages/admin/RegistrationsPage.tsx` | ✅ Done |
| Bảng điểm danh học viên & Punch-card | `src/pages/student/AttendancePage.tsx` | ✅ Done |
| Sinh QR code cá nhân cho học viên | `src/pages/student/DashboardPage.tsx` | ✅ Done |
| HLV quét mã QR & điểm danh (học bù) | `src/pages/coach/ScanAttendancePage.tsx` | ✅ Done |

## Database changes
- **Bảng mới `registrations`:** Lưu trữ thông tin đăng ký học viên (họ tên, ngày sinh, khảo sát sức khỏe 10 câu, thông tin phụ huynh khi dưới 16 tuổi, ảnh chân dung học sinh, trạng thái phê duyệt).
- **Storage bucket `student-photos`:** Lưu trữ ảnh chân dung học viên đăng ký mới, phân quyền RLS công khai để upload và xem ảnh.

## Chưa xử lý / Known Issues
Không có. Dự án biên dịch thành công (`npm run build` và `npm run typecheck` đạt 100% thành công).

## Hướng dẫn test (dành cho QC)

### Setup
1. Cập nhật cấu trúc DB: `npm run migrate`
2. Khởi động môi trường dev: `npm run dev`

### Test cases
| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 1 | Sửa lỗi LandingPage | Truy cập `/` và kiểm tra danh sách lớp học | Không còn lỗi crash console và hiển thị đầy đủ thông tin thời gian học. |
| 2 | Đăng ký lớp học hết slot | Truy cập `/register-course?classId=[id_lop_full]` -> Điền thông tin -> Bấm Đăng ký | Hệ thống báo lỗi: *"Đăng ký thất bại, lớp học đã hết slot. Vui lòng chọn lớp khác."* |
| 3 | Đăng ký lớp học có slot | Truy cập `/register-course?classId=[id_lop_trong]` -> Điền thông tin, upload ảnh -> Gửi đơn | Hệ thống báo: *"Đăng ký thành công!"* và lưu dữ liệu vào bảng `registrations`. |
| 4 | Admin phê duyệt đơn | Đăng nhập Admin -> Vào mục **Đơn đăng ký học** -> Xem đơn -> Bấm **Phê duyệt** | Hệ thống tự động tạo user, profile học sinh và thêm học sinh vào lớp học tương ứng. |
| 5 | Học viên xem điểm danh | Đăng nhập Học viên -> Vào mục **Điểm danh** | Xem lịch sử dạng bảng chi tiết và thẻ punch-card thể hiện trực quan số buổi còn lại. |
| 6 | Điểm danh bằng QR code | Học viên mở **Mã QR đi học** trên Dashboard. HLV đăng nhập -> Vào **Quét QR** quét mã học viên -> Chọn buổi học thực tế (kể cả học bù) -> Bấm điểm danh | Ghi nhận điểm danh thành công vào DB, trừ số buổi thẻ học của học viên chính xác. |

### Test accounts
| Role | Email | Password |
|------|-------|---------|
| Admin | `thaiphong.dev@gmail.com` | `LyLinh196465` |
| HLV | `tuthaiphong600@gmail.com` | `ttphong1101` |
| HV | `quanghuy.tma@shuttleclass.vn` | `Student@123` |
