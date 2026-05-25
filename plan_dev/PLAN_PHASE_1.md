# Plan: Phase 1 — Nền tảng (Foundation)

## Mục tiêu
Khởi tạo project React + Vite + TypeScript, cài toàn bộ dependencies, chạy migrations lên Supabase,
xây dựng auth flow (Login/logout/redirect theo role), và AppLayout với sidebar responsive + header.

## Phụ thuộc
- Phase trước đã hoàn thành: N/A (Phase đầu tiên)
- Files cần đọc: `/docs/DATABASE.md`, `/docs/DESIGN.md`, `/docs/ARCHITECTURE.md`, `mockup/index.html`

## Tasks
| # | Task | File(s) sẽ tạo/sửa | Ước tính |
|---|------|---------------------|----------|
| 1 | Project config | package.json, vite.config.ts, tsconfig.json, index.html | 15 phút |
| 2 | Tailwind + shadcn setup | tailwind.config.ts, postcss.config.js, components.json, src/index.css | 10 phút |
| 3 | TypeScript types | src/types/database.types.ts, src/types/index.ts | 15 phút |
| 4 | Supabase client + utils | src/lib/supabase.ts, src/lib/utils.ts | 5 phút |
| 5 | Auth Context | src/contexts/AuthContext.tsx | 15 phút |
| 6 | Zustand store | src/stores/useAppStore.ts | 5 phút |
| 7 | Login page | src/pages/auth/LoginPage.tsx | 20 phút |
| 8 | Protected routes | src/components/auth/RequireAuth.tsx | 10 phút |
| 9 | AppLayout + Sidebar + Header | src/components/layout/*.tsx | 30 phút |
| 10 | Dashboard placeholders | src/pages/{admin,coach,student}/DashboardPage.tsx | 10 phút |
| 11 | App.tsx routing | src/App.tsx, src/main.tsx | 10 phút |
| 12 | npm install + shadcn | — | 5 phút |
| 13 | Chạy migrations | node scripts/migrate.mjs | 5 phút |
| 14 | Seed test users | node scripts/seed-users.mjs | 5 phút |
| 15 | typecheck + build | npm run typecheck && npm run build | 5 phút |

## Acceptance Criteria
- [ ] `npm run build` thành công (0 errors, 0 warnings)
- [ ] `npm run typecheck` pass
- [ ] Login với admin@shuttleclass.vn → redirect /admin/dashboard
- [ ] Login với coach1@shuttleclass.vn → redirect /coach/dashboard
- [ ] Login với student1@shuttleclass.vn → redirect /student/dashboard
- [ ] Sai password → hiện thông báo lỗi
- [ ] Logout hoạt động → redirect /login
- [ ] Sidebar hiển thị đúng nav theo role
- [ ] Responsive: sidebar ẩn trên mobile, hiện trên desktop
- [ ] Không có `any` type mới

## Risks / Notes
- Supabase migrations cần chạy trước khi test auth (bảng profiles cần tồn tại)
- shadcn/ui dùng CSS variables cho màu → cần map đúng với màu đỏ/xanh trong tailwind.config.ts
- Trigger `handle_new_user` tự tạo profile khi user đăng ký, nhưng seed-users tạo qua Admin API nên trigger sẽ tự chạy
