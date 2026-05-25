# Bug Report: Phase 2 — Quản lý lõi (Admin + Coach)

**QC:** Senior QC Manual
**Date:** 2026-05-24
**Handoff đọc:** `handoffs/HANDOFF_PHASE_2.md`
**Fix report đọc:** `fixed/BUG_FIXED_PHASE_1.md`

---

## Phần 1 — Re-test Phase 1 Bugs

### Kết quả verification

| Bug ID | Mô tả | Trạng thái |
|--------|-------|-----------|
| BUG-001 (Race condition) | `setIsLoading(true)` trước fetchProfile trong onAuthStateChange | ✅ CONFIRMED FIXED |
| BUG-001 (RequireRole bypass) | Guard `if (!profile) return <FullPageSpinner />` | ✅ FIXED — nhưng có side effect mới (xem bên dưới) |
| BUG-002 (RLS Recursion) | Verified `is_admin()` function đã tồn tại | ✅ CONFIRMED |
| BUG-003 (Sidebar classes) | `w-[18px] h-[18px]`, `border-white/10`, `hover:bg-white/10`, `calc(0.75rem - 3px)` | ✅ CONFIRMED FIXED |
| BUG-004 (Toaster) | `<Toaster />` mount trong `App.tsx:79` | ✅ CONFIRMED FIXED |
| BUG-005 (alert_level sessions=1) | Case `sessions_remaining = 1 → 'critical'` thêm vào view | ✅ CONFIRMED FIXED |
| BUG-006 (.single → .maybeSingle) | `StudentDashboardPage` dùng `.maybeSingle()` + error handling | ✅ CONFIRMED FIXED |
| BUG-007 (Coach sessions no filter) | `.eq('coach_id', coach.id)` thêm vào query — ⚠️ xem BUG-P2-001 | ⚠️ FIX GÂY REGRESSION |
| BUG-008 (Dashboard error swallow) | Admin + Coach dashboard đã có error check + toast | ✅ CONFIRMED FIXED |
| BUG-009 (DESIGN.md mismatch) | tailwind.config.ts thêm `surface: '#f8fafc'` | ✅ CONFIRMED FIXED |

---

### ⚠️ Side effect mới từ fix BUG-001 — RequireRole infinite spinner

**Vấn đề:**
Fix BUG-001 thay đổi `RequireRole` thành:
```tsx
if (!session) return <Navigate to="/login" />
if (!profile) return <FullPageSpinner />   // ← fix mới
```

Nếu `fetchProfile()` **thất bại vĩnh viễn** (Supabase down, RLS block, network error) — `isLoading` đã về `false`, `session` hợp lệ, nhưng `profile = null`. Lúc này user thấy **spinner vô tận**, không thể logout (sidebar/header không render), không thể navigate. Tab bị kẹt.

**Trước fix:** User bypass vào routes (security hole).  
**Sau fix:** User bị stuck spinner không thoát được (UX dead-end).

Cả hai đều sai. Fix đúng là redirect `/login` thay vì spinner khi profile=null sau khi đã load xong.

**File:** `src/components/auth/RequireAuth.tsx:25`

---

## Phần 2 — Bug Report Phase 2

### Summary

- Tổng bugs: **7**
- Critical: **1**
- Major: **2**
- Minor: **4**

---

## Bugs

---

### BUG-P2-001 [CRITICAL] — Coach Dashboard: sessions query thất bại do `coach_id` không tồn tại trong view

**Mô tả:**
Fix BUG-007 của Phase 1 thêm `.eq('coach_id', coach.id)` vào query `sessions_with_details`. Tuy nhiên, view này **không có column `coach_id`**:

```sql
-- 006_views.sql
create or replace view sessions_with_details as
select
  se.*,               -- sessions table: id, class_id, court_id, scheduled_at, duration_min, status, ...
  c.name         as class_name,
  c.skill_level  as class_skill_level,
  pr.full_name   as coach_name,   -- coach name (text), không phải coach_id
  f.name         as facility_name,
  ct.name        as court_name
from sessions se
join classes c on c.id = se.class_id
left join coaches co on co.id = c.coach_id   -- co.id dùng trong JOIN nhưng KHÔNG được SELECT
```

`co.id` (coaches.id UUID) chỉ dùng trong điều kiện JOIN, không được select. View expose `coach_name` (text) chứ không phải `coach_id` (UUID).

**Query bị lỗi (`CoachDashboardPage.tsx:44–45`):**
```tsx
supabase.from('sessions_with_details')
  .select('id, scheduled_at, class_name, court_name')
  .eq('coach_id', coach.id)   // ← column không tồn tại
```

PostgREST trả về HTTP 400: `{"code":"42703","message":"column sessions_with_details.coach_id does not exist"}`.

**Hành vi thực tế:**
- `sessions.error` sẽ truthy → toast "Lỗi tải dữ liệu" hiện mỗi lần HLV mở Dashboard
- `upcomingSessions` = `[]` → section "Buổi học sắp tới" luôn rỗng
- Coach Dashboard bị broken hoàn toàn ở widget sessions

**Lý do filter này thực ra không cần:**
View `sessions_with_details` dùng security invoker (mặc định) → RLS của bảng `sessions` áp dụng → policy `sessions_coach_all` đã lọc chỉ trả sessions thuộc lớp của coach. Filter `.eq('coach_id', ...)` vừa **thừa** vừa **sai column**.

**Steps to reproduce:**
1. Login account HLV
2. Mở Dashboard `/coach/dashboard`
3. Toast "Lỗi tải dữ liệu" xuất hiện ngay lập tức
4. Section "Buổi học sắp tới" hiển thị rỗng dù đã có buổi học được tạo

**Expected:** Danh sách 10 buổi học sắp tới của HLV đó
**Actual:** Error toast + empty list

**File liên quan:** `src/pages/coach/DashboardPage.tsx:44–45`, `migrations/006_views.sql`

**Fix đề xuất — Option A (loại bỏ filter thừa):**
```tsx
// Bỏ .eq('coach_id', coach.id) — RLS đã xử lý
supabase.from('sessions_with_details')
  .select('id, scheduled_at, class_name, court_name')
  .gte('scheduled_at', new Date().toISOString())
  .neq('status', 'cancelled')
  .order('scheduled_at', { ascending: true })
  .limit(10)
```

**Fix đề xuất — Option B (thêm coach_id vào view):**
```sql
-- Thêm `co.id as coach_id` vào SELECT trong view
select
  se.*,
  co.id   as coach_id,    -- thêm dòng này
  c.name  as class_name,
  ...
```

---

### BUG-P2-002 [MAJOR] — Student count trong Classes pages luôn sai: hiển thị 0 hoặc 1 thay vì số thực

**Mô tả:**
Cả `AdminClassesPage` và `CoachClassesPage` dùng pattern sau để đếm học viên:

```tsx
// ClassesPage.tsx:71-72 / CoachClassesPage.tsx:55-56
.select(`*, ..., class_students(count)`)

// ClassesPage.tsx:93-100
const cs = r.class_students as Array<unknown>
return { studentCount: cs?.length ?? 0 }
```

PostgREST với `class_students(count)` trả về một array chứa **một object** với count: `[{count: N}]` — không phải N objects. Do đó:

| Số học viên thực | `cs` value | `cs.length` | Hiển thị |
|-----------------|-----------|-------------|---------|
| 0 | `[]` | 0 | 0 ✅ (trùng hợp đúng) |
| 1 | `[{count:1}]` | 1 | 1 ✅ (trùng hợp đúng) |
| 5 | `[{count:5}]` | 1 | **1** ❌ |
| 12 | `[{count:12}]` | 1 | **1** ❌ |

Mọi lớp có từ 2 học viên trở lên đều hiển thị "1" trong cột số học viên. Hiển thị dạng: `1/15 học viên` (sai thực tế là `5/15`).

**Steps to reproduce:**
1. Tạo một lớp, thêm 5 học viên vào qua dialog enrollment
2. Đóng dialog, quan sát cột số học viên trong danh sách lớp
3. Hiển thị "1/max_students" thay vì "5/max_students"

**Expected:** Số học viên chính xác theo thực tế enrollment
**Actual:** Luôn hiển thị "1" cho bất kỳ lớp nào có ≥ 2 học viên

**File liên quan:** `src/pages/admin/ClassesPage.tsx:93–100`, `src/pages/coach/ClassesPage.tsx:68–79`

**Fix đề xuất:**
```tsx
// Đọc count từ object, không dùng array.length
const cs = r.class_students as Array<{ count: number }> | null
return {
  studentCount: cs?.[0]?.count ?? 0,
}
```

---

### BUG-P2-003 [MAJOR] — RequireRole: profile fetch thất bại → infinite spinner, user bị kẹt

**Mô tả:** (Chi tiết đã mô tả trong Phần 1 — Side effect của fix BUG-001)

Khi `fetchProfile` thất bại, user có session hợp lệ nhưng `profile = null`. `RequireRole` hiển thị `<FullPageSpinner />` vĩnh viễn. Sidebar và Header không render (chúng check `profile`), nên user không thể logout hay navigate.

**Cách tái hiện:**
1. Giả lập: comment out RLS policy cho profiles hoặc tắt network sau khi đã login
2. Reload trang → profile fetch thất bại
3. App hiển thị spinner vô tận, không có cách thoát ngoài hard reload

**Expected:** Khi profile load thất bại → redirect `/login` với thông báo lỗi
**Actual:** Infinite spinner, tab bị kẹt hoàn toàn

**File liên quan:** `src/components/auth/RequireAuth.tsx:25`

**Fix đề xuất:**
```tsx
// Cần thêm state lỗi vào AuthContext để phân biệt "đang load" vs "load thất bại"
// Hoặc đơn giản hơn: set timeout, nếu profile không load được sau Ns thì redirect login
if (!profile) {
  // Nếu không còn loading và session tồn tại mà profile vẫn null → redirect login
  return <Navigate to="/login" replace />
}
```

Để phân biệt "profile đang load" vs "profile không load được", cần thêm `profileError` state vào `AuthContext`.

---

### BUG-P2-004 [MINOR] — UsersPage: password không validate minimum length, thông tin placeholder sai

**Mô tả:**
Form tạo user trong `UsersPage.tsx`:
- Label: `"Tối thiểu 8 ký tự"` — nhưng Supabase Auth mặc định yêu cầu **6 ký tự** (không phải 8)
- Validation: `disabled={!form.email || !form.password || ...}` — chỉ check truthy, không check độ dài
- User có thể submit với password 1 ký tự → Supabase Edge Function gọi `admin.createUser()` → Supabase trả lỗi "Password should be at least 6 characters" → error toast hiện

Về mặt chức năng không crash, nhưng UX kém (user phải thử mới biết bị lỗi, và thông tin 8 ký tự là không chính xác).

**File liên quan:** `src/pages/admin/UsersPage.tsx:276, 324`

**Fix đề xuất:**
```tsx
// Thêm validation
disabled={!form.email || form.password.length < 6 || !form.full_name || saving}

// Sửa label
<Label>Mật khẩu * <span className="text-gray-400 font-normal">(tối thiểu 6 ký tự)</span></Label>
```

---

### BUG-P2-005 [MINOR] — CoachSessionsPage: coach có thể xem thông tin lớp của HLV khác

**Mô tả:**
`CoachSessionsPage.tsx:55`:
```tsx
supabase.from('classes').select('*').eq('id', classId).single()
```

RLS policy `classes_select_active`: `using (auth.role() = 'authenticated' and status = 'active')` — **mọi user đã đăng nhập** đều đọc được tất cả lớp đang active.

Do đó, nếu HLV biết `classId` của lớp khác (ví dụ qua network tab hoặc URL guessing), họ có thể truy cập `/coach/classes/{other-classId}/sessions` và thấy tên lớp, thông tin cơ sở, sân của lớp đó. Sessions sẽ rỗng (bị block bởi `sessions_coach_all` RLS) nhưng metadata của lớp vẫn lộ.

**Severity:** Minor — không có data breach về học viên hay sessions, chỉ lộ tên lớp/cơ sở (thông tin ít nhạy cảm).

**Expected:** Coach chỉ xem được lớp của mình, navigate đến lớp người khác → redirect hoặc 403
**Actual:** Tên lớp + metadata hiển thị, sessions rỗng (không có thông báo lỗi)

**File liên quan:** `src/pages/coach/SessionsPage.tsx:55`

**Fix đề xuất:**
```tsx
// Sau khi load classInfo, verify coach_id khớp với coach hiện tại
if (classInfo.coach_id !== coach.id) {
  toast({ title: 'Không có quyền truy cập', variant: 'destructive' })
  navigate('/coach/classes')
  return
}
```

---

### BUG-P2-006 [MINOR] — FacilitiesPage: courts trong accordion không có thứ tự sắp xếp cố định

**Mô tả:**
`FacilitiesPage.tsx:66–69`:
```tsx
supabase.from('facilities').select('*, courts(*)')
```

Nested select `courts(*)` không có `.order()`. PostgreSQL không đảm bảo thứ tự trả về nếu không có ORDER BY. Courts có thể xáo trộn thứ tự sau mỗi lần reload, gây khó chịu khi cơ sở có nhiều sân.

**Expected:** Courts sắp xếp theo `court_number` hoặc `name`
**Actual:** Thứ tự không xác định, có thể thay đổi giữa các lần load

**File liên quan:** `src/pages/admin/FacilitiesPage.tsx:66`

**Fix đề xuất:**
```tsx
supabase.from('facilities').select('*, courts(*order=court_number.asc,name.asc)').order('name')
// Hoặc sort client-side sau khi nhận data:
setFacilities(result.map(f => ({ ...f, courts: f.courts.sort((a, b) => (a.court_number ?? 999) - (b.court_number ?? 999)) })))
```

---

### BUG-P2-007 [MINOR] — UsersPage: ô tìm kiếm không hỗ trợ search theo email

**Mô tả:**
`UsersPage.tsx:142–145`:
```tsx
const filtered = users.filter(u =>
  u.full_name.toLowerCase().includes(search.toLowerCase()) ||
  (u.phone ?? '').includes(search)
)
```

Search chỉ lọc theo `full_name` và `phone`. Email của user nằm trong `auth.users` — không có trong bảng `profiles` (và không được query). Admin không thể tìm kiếm user theo email.

Handoff test case #7: "Nhập tên/SĐT vào ô tìm kiếm" → spec chỉ mention tên/SĐT. Nhưng trong thực tế khi admin muốn tìm user theo email (ví dụ để reset password) sẽ không tìm được.

**Expected:** Search hỗ trợ cả email
**Actual:** Không search được theo email

**Ghi chú:** Do email nằm trong `auth.users`, không thể query trực tiếp từ client (cần Admin API hoặc Edge Function). Đây là limitation của kiến trúc, không chỉ là bug code.

**File liên quan:** `src/pages/admin/UsersPage.tsx:142–145`

**Fix đề xuất (nếu cần):** Thêm `email` vào bảng `profiles` hoặc tạo Edge Function để admin search user theo email qua Admin API.

---

## Tổng kết Test Cases Phase 2

| # | Scenario | Result | Ghi chú |
|---|----------|--------|---------|
| 1 | Tạo cơ sở mới | ✅ Logic đúng | Validation name required |
| 2 | Thêm sân vào cơ sở | ✅ Logic đúng | Dialog + toast |
| 3 | Sửa trạng thái sân | ✅ Logic đúng | |
| 4 | Xóa cơ sở | ✅ Logic đúng | AlertDialog confirm |
| 5 | Tạo HLV mới | ✅ Via Edge Function | Cần Edge Function deployed |
| 6 | Tạo học viên | ✅ Via Edge Function | |
| 7 | Tìm kiếm user | ⚠️ Partial | Không search được email (BUG-P2-007) |
| 8 | Sửa thông tin user | ✅ Logic đúng | Chỉ sửa name + phone |
| 9 | Tạo lớp học | ✅ Logic đúng | |
| 10 | Thêm học viên vào lớp | ✅ Logic đúng | |
| 11 | Xóa học viên khỏi lớp | ✅ Logic đúng | |
| 12 | HLV xem lớp của mình | ✅ Logic đúng | Filtered by coach_id |
| 13 | Tạo buổi học | ✅ Logic đúng | |
| 14 | Cập nhật trạng thái buổi | ✅ Logic đúng | |
| 15 | Hủy buổi | ✅ Logic đúng | |
| — | Số học viên trong lớp | ❌ **BUG-P2-002** | Luôn hiển thị 0 hoặc 1 |
| — | Coach Dashboard sessions | ❌ **BUG-P2-001 CRITICAL** | Error toast + empty mỗi lần load |
| — | Student count AdminClasses | ❌ **BUG-P2-002** | |

---

## Chưa xử lý / Known Issues (từ Handoff — đã ghi nhận)

- Coach có thể insert session vào lớp của HLV khác nếu biết classId → Đã verified: RLS `sessions_coach_all` dùng `USING` clause áp dụng cả cho INSERT → **thực ra đã được bảo vệ bởi RLS**. Handoff note này không còn chính xác.
- Không có pagination → sẽ cần ở giai đoạn data lớn.
- Phase 3 routes vẫn là `ComingSoon` → đúng theo kế hoạch.
