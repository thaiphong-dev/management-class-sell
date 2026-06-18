# Handoff: Phase 7 — Trang chủ công cộng & Đổi thương hiệu, Cập nhật tài khoản

## Tóm tắt
Đã hoàn thành việc xây dựng Trang chủ công cộng (Landing Page) kết hợp hệ thống cấu hình động của Admin. Đồng thời, nâng cấp tính năng gói học (dạy kèm 1-1/nhóm với giá theo buổi) và thực hiện đổi toàn bộ tên thương hiệu thành **Thái Phong Badminton Class** cùng cập nhật thông tin đăng nhập của Admin và các Huấn luyện viên.

## Tính năng đã implement
| Tính năng | File chính | Status |
|-----------|-----------|--------|
| Landing Page công cộng | `src/pages/public/LandingPage.tsx` | ✅ Done |
| Routing và điều hướng (khách xem landing page, thành viên vào dashboard tương ứng) | `src/App.tsx`, `src/components/auth/RequireAuth.tsx` | ✅ Done |
| Cấu hình nội dung trang chủ động | `src/pages/admin/SettingsPage.tsx` | ✅ Done |
| Nâng cấp gói học (Kèm 1-1 / Kèm nhóm với giá riêng theo buổi) | `src/pages/admin/PackagesPage.tsx`, `src/pages/student/PackagesPage.tsx` | ✅ Done |
| Modal tạo/sửa gói học 2 cột cân đối | `src/pages/admin/PackagesPage.tsx` | ✅ Done |
| Đổi tên thương hiệu (ShuttleClass -> Thái Phong Badminton Class) | Nhiều file UI, `index.html`, `vite.config.ts`, `CLAUDE.md` | ✅ Done |
| Cập nhật tài khoản và mật khẩu người dùng | `scripts/seed-users.mjs`, `tests/helpers/auth.ts`, `tests/e2e/01-auth.spec.ts` | ✅ Done |

## Database changes
- **Bảng mới `landing_settings`:** Lưu trữ thông tin nội dung trang chủ (Tiêu đề, bài giới thiệu, hotline, Zalo, Facebook, email).
- **RLS cho `landing_settings`:** Cho phép truy cập đọc công khai (`anon` và `authenticated` SELECT), chỉ cho phép `admin` sửa đổi (`INSERT`/`UPDATE`).
- **Cập nhật RLS các bảng danh mục:** Mở quyền đọc cho khách vãng lai (`anon`) trên các bảng `packages`, `classes`, `facilities`, `courts`, `coaches` và thông tin huấn luyện viên trong `profiles` để hiển thị dữ liệu trên trang chủ.
- **Cột mới `coaching_type` trong bảng `packages`:** Phân loại hình thức học (`1-1`, `group` hoặc `none`).

## Chưa xử lý / Known Issues
Không có. Dự án đã được kiểm tra kiểu TypeScript (`npm run typecheck`), build thành công (`npm run build`) và toàn bộ test suite Playwright E2E hoàn thành không lỗi.

## Hướng dẫn test (dành cho QC)

### Setup
1. Chạy di chuyển cấu trúc database (nếu có): `npm run migrate`
2. Seed tài khoản và dữ liệu: `npm run seed`
3. Chạy môi trường phát triển: `npm run dev`

### Test cases
| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 1 | Khách vãng lai truy cập | Truy cập `/` khi chưa đăng nhập | Xem trang chủ giới thiệu với đầy đủ các gói học, danh sách lớp học thực tế và thông tin liên hệ. |
| 2 | Đăng nhập Admin mới | Đăng nhập bằng `thaiphong.dev@gmail.com` / `LyLinh196465` | Chuyển hướng thành công vào Dashboard của Admin. |
| 3 | Cấu hình trang chủ | Admin vào menu **Cấu hình trang chủ** -> Sửa Tiêu đề Hero -> Lưu | Nội dung thay đổi ngay lập tức trên Landing Page `/`. |
| 4 | Cấp thẻ kèm 1-1 | Admin chọn một học viên -> Cấp gói kèm 1-1 -> Nhập số buổi mua (ví dụ: 5 buổi) | Hệ thống tự tính toán tổng tiền thanh toán và lưu thẻ học viên với 5 buổi học. |
| 5 | Đăng xuất | Nhấp nút **Đăng xuất** từ Sidebar | Chuyển hướng người dùng quay trở lại trang chủ giới thiệu `/`. |

### Test accounts
| Role | Email | Password |
|------|-------|---------|
| Admin | `thaiphong.dev@gmail.com` | `LyLinh196465` |
| Coach 1 (Từ Thái Phong) | `tuthaiphong600@gmail.com` | `ttphong1101` |
| Coach 2 (Nguyễn Thị Như Hảo) | `hanie@gmail.com` | `haokhongnho` |
| Student 1 (Quang Huy TMA) | `quanghuy.tma@shuttleclass.vn` | `Student@123` |
