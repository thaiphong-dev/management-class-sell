# Plan: Phase 5 — Nâng cao (Notifications, Dashboard, PWA)

## Mục tiêu
Realtime notifications qua Supabase Realtime, nâng cấp Student Dashboard với KPI + lịch sử điểm danh, cài đặt PWA để app dùng được trên mobile như native.

## Phụ thuộc
- Phase 4 đã hoàn thành: Y
- RLS bugs đã fix (profiles_admin_all, students↔class_students circular): Y
- Bảng `notifications` đã có sẵn từ schema Phase 1
- `vite-plugin-pwa` chưa cài

## Tasks
| # | Task | File(s) | Ước tính |
|---|------|---------|----------|
| 1 | `useNotifications` hook (fetch + Realtime subscribe + markRead) | `hooks/useNotifications.ts` (mới) | ~90 lines |
| 2 | Header: notification dropdown (list + mark-all-read) | `components/layout/Header.tsx` (sửa) | +80 lines |
| 3 | Student Dashboard: KPI stats + recent attendance + next session | `pages/student/DashboardPage.tsx` (sửa) | ~180 lines |
| 4 | PWA setup (manifest + service worker) | `vite.config.ts` (sửa), `public/` | ~40 lines |

## Acceptance Criteria
- [ ] Bell icon hiển thị badge đúng số thông báo chưa đọc
- [ ] Click bell mở dropdown danh sách thông báo (max 15)
- [ ] Click vào thông báo → đánh dấu đã đọc (read_at = now)
- [ ] Nút "Đánh dấu tất cả đã đọc"
- [ ] Thông báo mới từ Supabase Realtime cập nhật ngay (không cần reload)
- [ ] Student Dashboard hiển thị: buổi còn lại, đã học, % chuyên cần, ngày HH
- [ ] Student Dashboard hiển thị 5 buổi điểm danh gần nhất
- [ ] Student Dashboard hiển thị buổi học sắp tới tiếp theo
- [ ] PWA: `npm run build` ra `dist/sw.js` và `dist/manifest.webmanifest`
- [ ] `npm run build` 0 errors

## Risks / Notes
- Supabase Realtime channel phải được unsubscribe khi component unmount (cleanup)
- `notifications` RLS: `notif_select_own` (user_id = auth.uid()) đã có sẵn
- Không dùng Radix DropdownMenu vì cần custom positioning — dùng div + useRef + click-outside
- PWA manifest icon: dùng emoji svg placeholder (không có file icon thực)
- Student Dashboard query: dùng cùng `active_student_packages` view và `attendance` table
