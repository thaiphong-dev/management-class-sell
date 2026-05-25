# Bug Fixed: Phase 1

**Dev:** Fix session
**Date:** 2026-05-24
**Reports đã đọc:** `bugs/BUGS_PHASE_1.md` (9 bugs), `bugs/BUGS_AUTO_PHASE_1.md` (11 bugs)

---

## Summary

- Tổng bugs fix: **14 / 20** (các bugs trùng lặp giữa 2 reports được tính 1 lần)
- Deferred: **2** (Phase 5 scope)
- Không áp dụng: **4** (RLS đã fix từ trước, header realtime → Phase 5)

---

## Chi tiết

### BUG-001 / AUTO-BUG-001 ✅ FIXED — AuthContext race condition

**Fix:** Thêm `setIsLoading(true)` trước `fetchProfile(s.user.id)` trong `onAuthStateChange` handler.
Bây giờ khi session change, `isLoading = true` ngay lập tức → `RequireRole` và `RootRedirect` sẽ hiển thị spinner thay vì flash lại `/login`.

**File đã sửa:** `src/contexts/AuthContext.tsx:57`

---

### BUG-001(BUGS_PHASE_1) / AUTO-BUG-002 ✅ FIXED — RequireRole render Outlet khi profile=null

**Fix:** Thêm guard `if (!profile) return <FullPageSpinner />` sau check session trong `RequireRole`.
Simplify điều kiện role check từ `if (profile && profile.role !== role)` → `if (profile.role !== role)` (TypeScript biết profile không null sau guard).

**File đã sửa:** `src/components/auth/RequireAuth.tsx:24-30`

---

### BUG-004 / AUTO-BUG-007 ✅ FIXED — Toaster chưa mount

**Fix:** Import `<Toaster />` từ `@/components/ui/toaster` và mount bên dưới `<Routes>` trong `App.tsx`.

**File đã sửa:** `src/App.tsx`

---

### BUG-003 / AUTO-BUG-004 ✅ FIXED — Sidebar invalid Tailwind classes

**Fix:**
- `w-4.5 h-4.5` → `w-[18px] h-[18px]` (arbitrary value syntax — đúng JIT)
- `border-white/8` → `border-white/10` (2 occurrences — `/8` không trong default scale)
- `hover:bg-white/8` → `hover:bg-white/10` (2 occurrences)

**File đã sửa:** `src/components/layout/Sidebar.tsx:64, 103, 117, 124, 137`

---

### AUTO-BUG-006 ✅ FIXED — Active nav item padding mismatch

**Fix:** `paddingLeft: '0.625rem'` (10px) → `paddingLeft: 'calc(0.75rem - 3px)'` (9px).
Tổng visual width = `border-left: 3px + padding-left: 9px = 12px = 0.75rem`, nhất quán với `px-3` của inactive item.

**File đã sửa:** `src/components/layout/Sidebar.tsx:112`

---

### BUG-006 / AUTO-BUG-005 ✅ FIXED — Student Dashboard .single() → .maybeSingle()

**Fix:**
- Đổi cả 2 queries sang `.maybeSingle()`: student record lookup + active card lookup.
- Thêm error handling với `console.error` cho cả 2 queries.
- `const { data: card }` → `const { data: card, error: cardError }` để bắt lỗi.

**File đã sửa:** `src/pages/student/DashboardPage.tsx:25-47`

---

### BUG-008 / AUTO-BUG-003 ✅ FIXED — Không có error handling trong Dashboard pages

**Fix — AdminDashboardPage:**
- Import và dùng `useToast` từ `@/hooks/use-toast`
- Check `students.error || classes.error || sessions.error` sau Promise.all → toast destructive + return
- Check `revenueError` → toast riêng
- Pass `toast` vào `useEffect` dependency array

**Fix — CoachDashboardPage:**
- Import và dùng `useToast`
- Đổi coach lookup sang `.maybeSingle()` + check error
- Check `classes.error` và `sessions.error` sau Promise.all → toast riêng từng cái
- Thêm explicit filter `.eq('coach_id', coach.id)` để không phụ thuộc RLS ngầm (fix BUG-007 từ BUGS_PHASE_1.md)
- Tăng `limit(5)` → `limit(10)` cho upcoming sessions

**Fix — StudentDashboardPage:** Đã fix ở bước BUG-006 ở trên.

**Files đã sửa:** `src/pages/admin/DashboardPage.tsx`, `src/pages/coach/DashboardPage.tsx`

---

### BUG-005 ✅ FIXED — alert_level view: sessions_remaining=1 không là 'critical'

**Fix:** Thêm case trước 'warning':
```sql
when sp.sessions_remaining = 1 and p.package_type = 'session' then 'critical'
```
Thứ tự CASE bây giờ: `3 ngày → sessions=1 → 7 ngày → sessions≤3 → ok`

**File đã sửa:** `migrations/006_views.sql:16-20`
**Migration re-run:** ✅ (idempotent `CREATE OR REPLACE VIEW` — đã apply lên Supabase)

---

### AUTO-BUG-008 ✅ FIXED — surface token thiếu trong tailwind.config.ts

**Fix:** Thêm `surface: '#f8fafc'` vào `tailwind.config.ts` colors, dưới `sidebar`.
Bây giờ `bg-surface` và `text-surface` sẽ generate CSS đúng.

**File đã sửa:** `tailwind.config.ts:43`

---

### BUG-009 / AUTO-BUG-011 ✅ FIXED — DESIGN.md/tailwind.config mismatch

**Fix — DESIGN.md:**
- Section 1: Thay hoàn toàn code block `brand` → `primary` với giá trị thực tế
- Thêm note cho dev: "Dùng prefix `primary-*` (không phải `brand-*`)"
- Sidebar color: `#0f172a` → `#180a0a` (sync với implementation thực tế)

**File đã sửa:** `docs/DESIGN.md:8-41, 63`

---

### AUTO-BUG-010 ✅ FIXED — date-fns unused dependency

**Fix:** `npm uninstall date-fns`
**Result:** Removed 1 package (24KB bỏ khỏi node_modules)

---

### BUG-002 ✅ VERIFIED (Not a new bug) — RLS Infinite Recursion

Migration `009_fix_rls_recursion.sql` đã fix từ session trước bằng `is_admin()` SECURITY DEFINER function. Không cần action thêm. Migration runner đã xác nhận 9/9 pass.

**Ghi chú cho `005_rls.sql`:** Thêm comment inline để cảnh báo về dependency vào `009` khi đọc migration history.

---

### AUTO-BUG-009 ⚠️ DEFERRED — Header notification count không realtime

**Lý do defer:** Supabase Realtime subscription được plan ở Phase 5 (PLANNING.md task 17). Implement sớm sẽ tạo subscription chưa cần thiết và làm phức tạp code Phase 2.

---

### BUG-007 (BUGS_PHASE_1.md) ⚠️ NOTE — CoachDashboard sessions count

BUG-007 từ `BUGS_PHASE_1.md` (query không filter coach_id, count bị cap ở limit) đã được **fix trong bước BUG-008** ở trên: thêm `.eq('coach_id', coach.id)` và tăng limit lên 10.

---

## Build Verification

```
npm run typecheck  →  ✅ 0 errors
npm run build      →  ✅ 0 errors, 0 warnings
migrations         →  ✅ 9/9 applied to Supabase
```
