# Handoff: Phase 5 — Notifications, Dashboard, PWA

## Tóm tắt
Implement Realtime notifications với bell dropdown (Supabase Realtime subscribe), nâng cấp Student Dashboard với KPI stats + recent attendance + next session, và cài đặt PWA với service worker + manifest cho trải nghiệm mobile.

---

## Tính năng đã implement

| Tính năng | File chính | Status |
|-----------|-----------|--------|
| `useNotifications` hook (fetch + Realtime + markRead) | `hooks/useNotifications.ts` | ✅ Done |
| Header bell dropdown (list + mark-all-read) | `components/layout/Header.tsx` | ✅ Done |
| Student Dashboard: KPI stats (đã học / có mặt / chuyên cần) | `pages/student/DashboardPage.tsx` | ✅ Done |
| Student Dashboard: buổi học sắp tới | `pages/student/DashboardPage.tsx` | ✅ Done |
| Student Dashboard: 5 buổi điểm danh gần nhất | `pages/student/DashboardPage.tsx` | ✅ Done |
| PWA: manifest + service worker (workbox) | `vite.config.ts` | ✅ Done |

**Bug fixes cùng phase:**
| Bug | Fix | Status |
|-----|-----|--------|
| `profiles_admin_all` recursive RLS → HTTP 500 | Dùng JWT claim thay vì DB lookup | ✅ Fixed |
| `students ↔ class_students` circular RLS → HTTP 500 | 2 SECURITY DEFINER functions | ✅ Fixed |

---

## Functions / Components / Hooks đã tạo

| Tên | File | Mô tả |
|-----|------|-------|
| `useNotifications()` | `hooks/useNotifications.ts` | Fetch + Realtime subscribe + markAsRead + markAllAsRead |
| `timeAgo()` | `components/layout/Header.tsx` (local) | Format "X phút trước" từ ISO timestamp |
| `Header` (updated) | `components/layout/Header.tsx` | Thêm dropdown panel, dùng `useNotifications` hook |
| `StudentDashboardPage` (updated) | `pages/student/DashboardPage.tsx` | KPI + next session + recent attendance |

---

## PWA Output

Build ra các file sau trong `dist/`:
- `dist/manifest.webmanifest` — app manifest (name, icons, theme)
- `dist/sw.js` — service worker (precache 10 entries, 1.2 MB)
- `dist/workbox-*.js` — workbox runtime

**Caching strategy:**
- Static assets: precache (cache-first)
- Supabase API calls: NetworkFirst (TTL 5 min, max 50 entries)

---

## Patterns / Notes kỹ thuật

- **Realtime cleanup**: `useEffect` returns `() => supabase.removeChannel(channel)` để tránh memory leak khi unmount
- **Click outside**: `useRef` + `document.addEventListener('mousedown', ...)` — không dùng Radix DropdownMenu để tránh z-index conflict với layout
- **Notification Realtime filter**: `filter: 'user_id=eq.{profile.id}'` → chỉ nhận notification của chính mình, không cần filter phía client
- **Student Dashboard multi-step**: phải fetch `student.id` trước → lấy `class_ids` → sau đó parallel fetch 4 queries
- **PWA icons**: Dùng placeholder path `pwa-192x192.png` / `pwa-512x512.png` (chưa có file thực) → add file vào `public/` trước khi deploy production
- **`registerType: 'autoUpdate'`**: SW tự cập nhật khi có version mới, không cần prompt user

---

## Chưa xử lý / Known Issues

- [ ] Không có icon file thực (`public/pwa-192x192.png`, `public/pwa-512x512.png`) → cần thiết kế icon trước khi deploy production
- [x] ~~Notifications chưa tạo tự động khi thẻ sắp hết~~ → **ALREADY IN 004_triggers.sql**: `deduct_session_on_attendance` gửi notification khi còn 3/1 buổi; `expire_overdue_packages` gửi khi còn 7/3 ngày. Thêm Phase 6: `package_granted` (010) + `session_cancelled` (010) + `class_enrolled` (011)
- [x] ~~Không có "coach/attendance" page title~~ → **FIXED (bug-fix session sau Phase 6)**: `Header.tsx` dùng `useMatch` để detect dynamic routes `/coach/classes/:id/sessions` → "Buổi học" và `/coach/classes/:id/sessions/:sessionId/attendance` → "Điểm danh buổi học"
- [x] ~~Không có line chart tiến độ~~ → **FIXED Phase 6**: `StudentProgressPage.tsx` thêm Recharts LineChart
- [ ] Email notifications (Edge Functions) — defer, cần Supabase Edge Function + SMTP setup

---

## Hướng dẫn test (dành cho QC)

### Test accounts
| Role | Email | Password |
|------|-------|---------|
| Admin | admin@shuttleclass.vn | (xem .env.local) |
| HLV | coach@test.com | Test@123 |
| Học viên | student@test.com | Test@123 |

### Test cases

#### Notifications

| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 1 | Bell badge | Có thông báo chưa đọc trong DB | Badge số đỏ hiển thị trên bell |
| 2 | Mở dropdown | Click bell | Panel 80x max-h-80, danh sách notification |
| 3 | Đánh dấu đã đọc | Click vào 1 notification chưa đọc | Row màu nền mất, chấm đỏ biến mất |
| 4 | Đọc tất cả | Click "Đọc tất cả" | Tất cả row trắng, badge biến mất |
| 5 | Đóng dropdown | Click ra ngoài panel | Dropdown đóng |
| 6 | Realtime | Insert row vào `notifications` trực tiếp qua Supabase SQL Editor | Notification xuất hiện ngay (không reload) |

#### Student Dashboard

| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 7 | KPI stats | Học viên đã có attendance records | Hiển thị Đã học / Có mặt / Trễ / % Chuyên cần |
| 8 | Active card gradient | Thẻ `alert_level = 'warning'` | Gradient vàng-cam |
| 9 | Active card critical | `alert_level = 'critical'` | Gradient đỏ + banner "Thẻ sắp hết!" |
| 10 | Next session | Học viên có session trong tương lai | Card "Buổi học tiếp theo" với tên lớp + ngày |
| 11 | Recent attendance | Có ≥ 1 record | Danh sách 5 buổi với icon màu theo status |

#### PWA

| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 12 | Manifest | Inspect → Application → Manifest | Name: ShuttleClass, theme: #b91c1c |
| 13 | Service Worker | Application → Service Workers | sw.js registered, status: activated |
| 14 | Install prompt | Trên Chrome mobile / Edge desktop | Prompt "Install ShuttleClass" xuất hiện |
