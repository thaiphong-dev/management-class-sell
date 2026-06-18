# Plan: Phase 7 — Trang chủ công cộng & Cấu hình Admin

## Mục tiêu
Xây dựng trang chủ công cộng (Landing Page) cho phép phụ huynh/học sinh vãng lai xem thông tin lớp học và các gói học mà không cần đăng nhập. Đồng thời cung cấp trang cấu hình Admin để chỉnh sửa nội dung động của trang chủ.

## Phụ thuộc
- Phase 6 đã hoàn thành: Y
- Các file cần đọc/sửa:
  - `src/App.tsx`
  - `src/components/auth/RequireAuth.tsx`
  - `src/components/layout/Sidebar.tsx`
  - `src/types/database.types.ts`

## Tasks
| # | Task | File(s) sẽ tạo/sửa | Ước tính |
|---|------|---------------------|----------|
| 1 | DB: Tạo bảng `landing_settings` + RLS (anon select, admin write) + Seed dữ liệu | `migrations/016_create_landing_settings_table.sql` | S |
| 2 | Routing: Cấu hình `/` làm trang công cộng, cập nhật logic Redirect | `src/App.tsx`, `src/components/auth/RequireAuth.tsx` | S |
| 3 | Frontend: Xây dựng trang chủ LandingPage (hiển thị Hero, Khóa học, Lịch lớp, Hotline...) | `src/pages/public/LandingPage.tsx` | L |
| 4 | Frontend: Trang cấu hình landing page dành cho Admin | `src/pages/admin/SettingsPage.tsx` | M |
| 5 | UI Sidebar: Thêm liên kết "Cấu hình trang chủ" vào sidebar Admin | `src/components/layout/Sidebar.tsx` | S |
| 6 | Types: Khai báo kiểu dữ liệu cho bảng `landing_settings` | `src/types/database.types.ts` | S |
| 7 | Build: Chạy typecheck và build dự án | — | S |
| 8 | Thương hiệu: Đổi ShuttleClass thành Thái Phong Badminton Class trong toàn bộ hệ thống | Nhiều file UI, index.html, vite.config.ts, CLAUDE.md | M |
| 9 | Tài khoản: Cập nhật email và mật khẩu cho Admin và 2 HLV (Thái Phong, Như Hảo) | `scripts/seed-users.mjs`, `tests/helpers/auth.ts`, `tests/e2e/01-auth.spec.ts` | S |

## Acceptance Criteria
- [x] Truy cập `/` không yêu cầu đăng nhập, hiển thị giao diện landing page Thái Phong Badminton Class cực kỳ bắt mắt (Premium UI).
- [x] Khách vãng lai xem được danh sách gói học (packages) đang active và danh sách lớp học (classes) kèm lịch trình.
- [x] Có nút "Đăng nhập" ở Header trang chủ dẫn tới trang `/login`. Nếu học viên/coach/admin đã đăng nhập sẵn thì hiển thị nút "Vào bảng điều khiển".
- [x] Admin có thêm menu "Cấu hình trang chủ" dẫn tới `/admin/settings` để chỉnh sửa: Tiêu đề Hero, Mô tả, Hotline, link Zalo, link Facebook, bài giới thiệu trung tâm.
- [x] Lưu cấu hình cập nhật ngay lập tức lên trang chủ.
- [x] `npm run build` không lỗi.
- [x] Đổi tên thương hiệu từ "ShuttleClass" thành "Thái Phong Badminton Class" đồng bộ trên UI, cấu hình PWA, trang Đăng nhập và thẻ tiêu đề HTML.
- [x] Đổi tài khoản Admin thành `thaiphong.dev@gmail.com`, mật khẩu `LyLinh196465`.
- [x] Đổi tài khoản Coach Từ Thái Phong thành `tuthaiphong600@gmail.com`, mật khẩu `ttphong1101`.
- [x] Đổi tài khoản Coach Nguyễn Thị Như Hảo thành `hanie@gmail.com`, mật khẩu `haokhongnho`.
- [x] Đăng nhập thành công với 3 tài khoản mới và toàn bộ E2E tests pass.

## Risks / Notes
- RLS Policy cho `landing_settings`: Cho phép `anon` và `authenticated` đọc (`select`), chỉ cho phép role `admin` thực hiện ghi (`insert`, `update`).
- Landing page cần thiết kế responsive tốt trên di động (vì phụ huynh thường xem qua điện thoại).
- Cần join `classes` với `coaches` và `facilities` để lấy tên huấn luyện viên và sân tập phục vụ hiển thị công khai lịch lớp.
- Khi cập nhật email cho Admin và HLV trực tiếp trong cơ sở dữ liệu Auth, cần đảm bảo đồng bộ hóa các tệp tin seed dữ liệu và cấu hình helper test để Playwright không gặp lỗi.
