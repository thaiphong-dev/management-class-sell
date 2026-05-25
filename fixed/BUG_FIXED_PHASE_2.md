# Bug Fixed: Phase 2

## Summary
- Tổng bugs fix: 7 / 7
- Critical: 1 / 1 ✅
- Major: 2 / 2 ✅
- Minor: 4 / 4 ✅

---

## Chi tiết

### BUG-P2-001 ✅ FIXED [CRITICAL]
**Mô tả:** Coach Dashboard sessions query dùng `.eq('coach_id', ...)` với view `sessions_with_details` không có column `coach_id` → HTTP 400 mỗi lần Dashboard load.
**Fix:** Xóa `.eq('coach_id', coach.id)` — RLS policy `sessions_coach_all` đã filter đúng sessions của từng HLV, filter thừa này vừa sai vừa lỗi.
**File đã sửa:** `src/pages/coach/DashboardPage.tsx:44`

---

### BUG-P2-002 ✅ FIXED [MAJOR]
**Mô tả:** Student count trong lớp luôn hiển thị 0 hoặc 1 thay vì số thực (vì dùng `cs.length` thay vì `cs[0].count`).
**Fix:** Đổi `cs?.length ?? 0` → `cs?.[0]?.count ?? 0` — PostgREST `class_students(count)` trả về `[{count: N}]` không phải N objects.
**File đã sửa:** `src/pages/admin/ClassesPage.tsx:100`, `src/pages/coach/ClassesPage.tsx:78`

---

### BUG-P2-003 ✅ FIXED [MAJOR]
**Mô tả:** Khi `fetchProfile()` thất bại, user có session hợp lệ nhưng `profile = null`. `RequireRole` render `<FullPageSpinner />` vô tận vì không thể logout.
**Fix:** Thêm `profileError` boolean vào `AuthContext`. Khi profile fetch fail → `profileError = true`. `RequireRole` check `profileError || !profile` → redirect `/login` thay vì spinner.
**File đã sửa:** `src/contexts/AuthContext.tsx`, `src/components/auth/RequireAuth.tsx`

---

### BUG-P2-004 ✅ FIXED [MINOR]
**Mô tả:** Label password ghi "Tối thiểu 8 ký tự" nhưng Supabase Auth yêu cầu 6 ký tự. Validation chỉ check truthy, không check độ dài.
**Fix:** Sửa label thành "tối thiểu 6 ký tự". Đổi `disabled={!form.password}` → `disabled={form.password.length < 6}`.
**File đã sửa:** `src/pages/admin/UsersPage.tsx:276, 324`

---

### BUG-P2-005 ✅ FIXED [MINOR]
**Mô tả:** HLV có thể xem metadata lớp của HLV khác bằng cách navigate đến URL `/coach/classes/{other-classId}/sessions`.
**Fix:** Trong `loadData()`, fetch `coaches` record trước, sau khi load `classInfo` verify `cls.coach_id === coachId`. Nếu không khớp → toast + navigate `/coach/classes`.
**File đã sửa:** `src/pages/coach/SessionsPage.tsx:51–84`

---

### BUG-P2-006 ✅ FIXED [MINOR]
**Mô tả:** Courts trong accordion của FacilitiesPage không có thứ tự sắp xếp cố định.
**Fix:** Sort client-side sau khi load theo `court_number ASC` rồi `name ASC`.
**File đã sửa:** `src/pages/admin/FacilitiesPage.tsx:74–79`

---

### BUG-P2-007 ✅ FIXED [MINOR]
**Mô tả:** Search trong UsersPage không hỗ trợ email (vì email nằm trong `auth.users`, không có trong `profiles`).
**Fix:** Cập nhật placeholder từ "Tìm theo tên, số điện thoại..." → "Tìm theo tên hoặc số điện thoại..." để tránh nhầm lẫn. Đây là architectural limitation — không thể search email mà không có migration hoặc Edge Function.
**File đã sửa:** `src/pages/admin/UsersPage.tsx:239`
