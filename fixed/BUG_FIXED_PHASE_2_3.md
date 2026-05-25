# Bug Fixed: Phase 2 (Auto) + Phase 3

> **Ngày fix:** 2026-05-25
> **Nguồn:** `bugs/BUGS_AUTO_PHASE_2.md` · `bugs/BUGS_AUTO_PHASE_3.md` · `bugs/BUGS_PHASE_3.md`

---

## Summary

| Tổng bugs fix | 8 |
|---|---|
| Fixed | 8 |
| Deferred | 0 |

---

## Chi tiết

### BUG-C01 ✅ FIXED — RLS Infinite Recursion: `class_students ↔ students`

**Severity:** CRITICAL  
**Fix:** Tạo `migrations/013_fix_coach_student_rls.sql` — re-create (idempotent) hai SECURITY DEFINER functions:
- `auth_is_coach_of_student(uuid)` → dùng cho policy `students_coach_select`
- `auth_student_in_class(uuid)` → dùng cho policies `class_students_student_select` + `sessions_student_select`

Cả hai function bypass RLS khi thực thi sub-query, phá vỡ vòng đệ quy:
`class_students → students → class_students`.

Migration là **idempotent** (`create or replace function`, `drop policy if exists` + `create policy`), an toàn khi chạy nhiều lần.

**Files đã sửa:**
- `migrations/013_fix_coach_student_rls.sql` *(MỚI)*

---

### BUG-C02 ✅ FIXED — Coach1 chưa được phân công lớp nào

**Severity:** MINOR (test data)  
**Fix:** Thêm vào `migrations/007_seed.sql`:
- Tạo lớp "Lớp Cơ bản A" (UUID `40000000-...0001`) với coach_id tra theo email `coach1@shuttleclass.vn`
- Idempotent: `on conflict (id) do nothing`

**Files đã sửa:**
- `migrations/007_seed.sql`

---

### BUG-P01 ✅ FIXED — Coach không có sessions trong ±7 ngày

**Severity:** MAJOR (test data)  
**Fix:** Thêm vào `migrations/007_seed.sql`:
- Tạo 3 sessions với fixed UUIDs (`50000000-...0001/2/3`) cho lớp của coach1
- `scheduled_at`: `current_date + 1/3/5 ngày` tại giờ 08:00
- `ON CONFLICT (id) DO UPDATE SET scheduled_at = excluded.scheduled_at` → dates tự làm mới mỗi lần migration chạy lại, luôn nằm trong ±7 ngày

**Files đã sửa:**
- `migrations/007_seed.sql`

---

### BUG-P02 ✅ FIXED — Student1 chưa được enroll vào lớp nào

**Severity:** MINOR (test data)  
**Fix:** Thêm vào `migrations/007_seed.sql`:
- INSERT `class_students` nối student1 (tra theo email) vào lớp `40000000-...0001`
- Idempotent: `ON CONFLICT (class_id, student_id) DO NOTHING`

**Files đã sửa:**
- `migrations/007_seed.sql`

---

### BUG-P3-001 ✅ FIXED — AttendanceSheetPage thiếu coach ownership check

**Severity:** MAJOR (security IDOR)  
**Fix:** Thêm ownership check vào đầu `loadData()` trong `CoachAttendanceSheetPage.tsx`:
1. Fetch `coach.id` từ `coaches` theo `profile.id`
2. Fetch class theo `classId`, kiểm tra `class.coach_id === coachId`
3. Nếu không khớp → toast "Không có quyền truy cập" + navigate về `/coach/classes`

Coach A không còn có thể truy cập sheet điểm danh của lớp thuộc Coach B qua URL thủ công.

**Files đã sửa:**
- `src/pages/coach/AttendanceSheetPage.tsx`

---

### BUG-P3-002 ✅ FIXED — AttendanceSheetPage không verify sessionId thuộc classId

**Severity:** MAJOR (data integrity)  
**Fix:** Trong query `sessionRes` (đã chuyển từ `.single()` sang `.maybeSingle()`), thêm `.eq('class_id', classId)`. Nếu session không tồn tại hoặc không thuộc class → toast "Không tìm thấy buổi học" + navigate về sessions list.

Ngăn coach ghi attendance của học viên lớp A vào session của lớp B.

**Files đã sửa:**
- `src/pages/coach/AttendanceSheetPage.tsx`

---

### BUG-P3-003 ✅ FIXED (Phase 6) — Coach Dashboard còn card placeholder "Phase 3"

**Severity:** MINOR  
**Fix:** Đã được fix trong Phase 6 khi `CoachDashboardPage.tsx` được viết lại hoàn toàn với next-session card + weekly grid. Card placeholder đã bị xóa.

**Files đã sửa:**
- `src/pages/coach/DashboardPage.tsx` *(Phase 6)*

---

### BUG-P3-004 ✅ FIXED — CoachProgressPage: eval fetch error không toast

**Severity:** MINOR  
**Fix:** Thêm `toast({ title: 'Lỗi tải đánh giá', ... })` vào block `if (error)` trong `loadEvals()`.

**Files đã sửa:**
- `src/pages/coach/ProgressPage.tsx`

---

### BUG-P3-005 ✅ FIXED — CoachProgressPage: Nhận xét dùng Input thay Textarea

**Severity:** MINOR  
**Fix:** Import `Textarea` từ `@/components/ui/textarea` và thay `<Input>` bằng `<Textarea rows={3} className="resize-none">` ở field "Nhận xét".

**Files đã sửa:**
- `src/pages/coach/ProgressPage.tsx`

---

### BUG-P3-006 ✅ FIXED — CoachProgressPage: skill scores không validate 0–100

**Severity:** MINOR  
**Fix:** Thêm helper `const clamp = (val: string) => Math.min(100, Math.max(0, parseInt(val) || 0))` và áp dụng cho tất cả skill scores + overall_score trước khi insert vào DB. Giá trị âm hoặc >100 sẽ bị clamp về [0, 100].

**Files đã sửa:**
- `src/pages/coach/ProgressPage.tsx`

---

## Build Verification

```
npm run build → ✅ 0 errors, 0 warnings
tsc -b         → ✅ PASS
```
