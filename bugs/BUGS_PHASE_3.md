# Bug Report: Phase 3 — Điểm danh & Đánh giá tiến độ

## Summary
- Tổng bugs: 6
- Critical: 0 | Major: 2 | Minor: 4

---

## Re-test Phase 2 Bugs (BUG_FIXED_PHASE_2.md)

| Bug | Status | Ghi chú |
|-----|--------|---------|
| BUG-P2-001 [CRITICAL] Coach Dashboard 400 | ✅ Verified fixed | `DashboardPage.tsx:44` — không còn `.eq('coach_id', ...)`, dùng `sessions_with_details` + RLS |
| BUG-P2-002 [MAJOR] studentCount luôn 0/1 | ✅ Verified fixed | `ClassesPage.tsx:100` — `cs?.[0]?.count ?? 0` đúng |
| BUG-P2-003 [MAJOR] Infinite spinner khi profile fail | ✅ Verified fixed | `AuthContext.tsx` có `profileError`; `RequireAuth.tsx` redirect login khi `profileError \|\| !profile` |
| BUG-P2-004 [MINOR] Password label 8 ký tự sai | ✅ Verified fixed | `UsersPage.tsx:276` — label "tối thiểu 6 ký tự", disabled check `form.password.length < 6` |
| BUG-P2-005 [MINOR] Coach xem lớp của HLV khác | ✅ Verified fixed | `SessionsPage.tsx:80-84` — check `cls.coach_id !== coachId` → toast + redirect |
| BUG-P2-006 [MINOR] Courts không sort | ✅ Verified fixed | `FacilitiesPage.tsx:74-79` — client-side sort `court_number` rồi `name` ASC |
| BUG-P2-007 [MINOR] Search không hỗ trợ email | ✅ Verified fixed | `UsersPage.tsx:239` — placeholder cập nhật |

---

## Bugs Phase 3

### BUG-P3-001 [MAJOR]
**Mô tả:** `CoachAttendanceSheetPage` không kiểm tra ownership — coach có thể truy cập sheet điểm danh của lớp/buổi học thuộc HLV khác bằng cách navigate thủ công đến URL `/coach/classes/{otherClassId}/sessions/{otherSessionId}/attendance`.

**Chi tiết kỹ thuật:**
- `CoachSessionsPage` (fixed BUG-P2-005) có đầy đủ ownership check: fetch `coach.id` → verify `cls.coach_id === coachId`.
- `CoachAttendanceSheetPage.tsx` (Phase 3 mới) **không có bước này**. `classId` và `sessionId` lấy từ URL params mà không xác minh:
  1. `sessionId` có thuộc `classId` hay không
  2. `classId` có thuộc coach đang đăng nhập hay không
- Nếu RLS trên bảng `attendance` cho phép INSERT từ bất kỳ coach nào (cần verify), coach A có thể ghi điểm danh cho buổi học của coach B.
- Ngay cả khi RLS ngăn chặn ghi, việc đọc `class_students` và hiển thị danh sách học viên của lớp khác là IDOR (Insecure Direct Object Reference).

**Steps to reproduce:**
1. Đăng nhập coach@test.com
2. Lấy classId của một lớp thuộc admin/coach khác từ network requests
3. Navigate thủ công: `/coach/classes/{otherClassId}/sessions/{otherSessionId}/attendance`
4. Trang load danh sách học viên của lớp đó

**Expected:** Redirect về `/coach/classes` với toast "Không có quyền truy cập"
**Actual:** Trang load bình thường, hiển thị học viên của lớp khác, có thể điểm danh

**File liên quan:** `src/pages/coach/AttendanceSheetPage.tsx:48-128`

**Fix đề xuất:** Thêm ownership check tương tự `SessionsPage.tsx:55-84` — fetch `coach.id` trước, sau đó fetch session → verify `session.class_id === classId` và class thuộc coach trước khi render.

---

### BUG-P3-002 [MAJOR]
**Mô tả:** `CoachAttendanceSheetPage` không xác minh `sessionId` khớp với `classId` trong URL. Có thể tạo URL `/coach/classes/{coachOwnClassId}/sessions/{differentSessionId}/attendance` — trang sẽ load class_students từ lớp của coach (đúng classId) nhưng load attendance records từ session khác (sai sessionId). Kết quả: hiển thị danh sách học viên lớp A nhưng điểm danh ghi vào session của lớp B.

**Steps to reproduce:**
1. Coach tạo 2 lớp (lớp A và lớp B), mỗi lớp có sessions riêng
2. Navigate thủ công: `/coach/classes/{classA_Id}/sessions/{classB_SessionId}/attendance`
3. Trang load học viên của lớp A, nhưng khi lưu điểm danh, ghi với `session_id` = sessionB

**Expected:** Validate session thuộc class trước khi render
**Actual:** Data mismatch — học viên lớp A bị ghi attendance vào session của lớp B

**File liên quan:** `src/pages/coach/AttendanceSheetPage.tsx:51-63`

**Fix đề xuất:** Trong query `sessionRes`, thêm `.eq('class_id', classId)`. Nếu session không thuộc class → toast + navigate back.

---

### BUG-P3-003 [MINOR]
**Mô tả:** Card placeholder "Điểm danh và đánh giá học viên sẽ có ở Phase 3" vẫn còn hiển thị ở cuối Coach Dashboard mặc dù Phase 3 đã hoàn thành.

**Steps to reproduce:**
1. Đăng nhập coach@test.com
2. Vào Dashboard → kéo xuống cuối

**Expected:** Không còn placeholder này; các tính năng đã có link trong sidebar
**Actual:** Card với text "Điểm danh và đánh giá học viên sẽ có ở Phase 3" vẫn hiển thị

**File liên quan:** `src/pages/coach/DashboardPage.tsx:131-133`

---

### BUG-P3-004 [MINOR]
**Mô tả:** `CoachProgressPage` — khi fetch evaluations thất bại (`loadEvals`), lỗi chỉ được `console.error` mà không hiển thị toast cho người dùng. UI sẽ hiển thị empty state ("Chưa có đánh giá") thay vì báo lỗi — gây nhầm lẫn: HLV nghĩ học viên chưa được đánh giá nhưng thực ra là lỗi mạng/DB.

**Steps to reproduce:**
1. Vào Coach Progress → chọn lớp → chọn học viên
2. Nếu `progress_evaluations` query fail (network error, RLS issue...)
3. Không có toast, chỉ thấy form trống

**Expected:** Toast error "Lỗi tải đánh giá" giống pattern ở StudentProgressPage và các page khác
**Actual:** Error bị swallow, UI hiện empty state

**File liên quan:** `src/pages/coach/ProgressPage.tsx:132-134`

---

### BUG-P3-005 [MINOR]
**Mô tả:** `CoachProgressPage` — trường "Nhận xét" dùng `<Input>` (single-line) thay vì `<Textarea>` (multi-line). Nhận xét đánh giá kỹ năng thường dài (ví dụ: "Kỹ thuật smash tốt, cần cải thiện di chuyển góc phải, thể lực yếu cuối buổi"), nhưng input một dòng không phù hợp cho loại nội dung này.

**Steps to reproduce:**
1. Coach → Đánh giá → chọn lớp → chọn học viên
2. Nhập nhận xét dài vào field "Nhận xét"

**Expected:** `<Textarea>` multi-line cho phép nhập thoải mái
**Actual:** `<Input>` single-line, text dài bị cắt hiển thị, UX không tốt

**File liên quan:** `src/pages/coach/ProgressPage.tsx:312-316`

---

### BUG-P3-006 [MINOR]
**Mô tả:** `CoachProgressPage` — form nhập điểm kỹ năng không validate giá trị nằm trong khoảng 0–100 trước khi save. HTML `min={0} max={100}` không được enforce nhất quán (có thể bypass bằng cách type thủ công). `parseInt(value) || 0` chuyển `NaN`/rỗng thành 0, nhưng số âm hoặc >100 (ví dụ `-5`, `150`) được lưu thẳng vào DB mà không có cảnh báo.

**Steps to reproduce:**
1. Coach → Đánh giá → chọn học viên
2. Nhập `-5` hoặc `150` vào field "Kỹ thuật"
3. Click "Lưu đánh giá"

**Expected:** Validation error hoặc clamp về 0–100 trước khi save
**Actual:** Giá trị âm / >100 được lưu vào cột `skills` jsonb mà không báo lỗi

**File liên quan:** `src/pages/coach/ProgressPage.tsx:145-150`

---

## Tổng hợp Phase 3

| # | Bug | Severity | File | Status |
|---|-----|----------|------|--------|
| BUG-P3-001 | AttendanceSheetPage thiếu coach ownership check | MAJOR | `coach/AttendanceSheetPage.tsx:48` | ✅ Fixed |
| BUG-P3-002 | AttendanceSheetPage không verify sessionId thuộc classId | MAJOR | `coach/AttendanceSheetPage.tsx:51` | ✅ Fixed |
| BUG-P3-003 | Coach Dashboard còn placeholder "Phase 3" | MINOR | `coach/DashboardPage.tsx:131` | ✅ Fixed (Phase 6 rewrite) |
| BUG-P3-004 | CoachProgressPage: eval fetch error không toast | MINOR | `coach/ProgressPage.tsx:132` | ✅ Fixed |
| BUG-P3-005 | CoachProgressPage: Nhận xét dùng Input thay Textarea | MINOR | `coach/ProgressPage.tsx:313` | ✅ Fixed |
| BUG-P3-006 | CoachProgressPage: skill scores không validate 0-100 | MINOR | `coach/ProgressPage.tsx:145` | ✅ Fixed |

## Build Status
- `npm run typecheck`: ✅ PASS (0 errors)
- `npm run build`: ✅ PASS (0 errors, 0 warnings)
