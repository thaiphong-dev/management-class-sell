# Bug Report: Phase 1 — Foundation

**QC:** Senior QC Manual
**Date:** 2026-05-24
**Handoff đọc:** `handoffs/HANDOFF_PHASE_1.md`

---

## Summary

- Tổng bugs: **9**
- Critical: **2**
- Major: **3**
- Minor: **4**

---

## Test Environment

| Item | Status |
|------|--------|
| `npm run build` | ✅ Pass — 0 errors, 0 warnings |
| `npm run typecheck` | ✅ Pass — 0 errors |
| Code review (static analysis) | ❌ Tìm thấy bugs — xem chi tiết |

> **Lưu ý:** Do không có Supabase connection thực trong môi trường test tĩnh, một số bugs được phát hiện qua **code review và logic analysis**, không phải runtime test. Dev cần verify thêm trên môi trường thật với Supabase được kết nối.

---

## Bugs

---

### BUG-001 [CRITICAL] — RequireRole bypass: session tồn tại nhưng profile = null → vào protected route được

**Mô tả:**
Khi user đã login (session hợp lệ) nhưng `fetchProfile` thất bại (network lỗi, RLS block, etc.), `profile` sẽ là `null` và `isLoading` sẽ là `false`. Trong `RequireRole`, logic check role là:

```tsx
// RequireAuth.tsx:24–29
if (!session) {
  return <Navigate to="/login" ... />
}
if (profile && profile.role !== role) {   // ← profile = null → điều kiện KHÔNG chạy
  return <Navigate to={ROLE_DASHBOARDS[profile.role]} replace />
}
return <Outlet />  // ← user không có profile vẫn vào được!
```

Một user có session hợp lệ nhưng profile bị null (hoặc profile chưa được tạo trong DB) có thể truy cập **bất kỳ** protected route nào — kể cả `/admin/dashboard` dù role thực tế là `student`.

**Steps to reproduce:**
1. Xóa row profile của một user trong Supabase (giả lập profile không tồn tại)
2. Login bằng user đó
3. Truy cập `/admin/dashboard`
4. → Expected: redirect `/login`; Actual: vào dashboard admin được

**Expected:** Khi `profile = null` sau khi load xong → redirect `/login`
**Actual:** `<Outlet />` được render, user vào được mọi protected route

**File liên quan:** `src/components/auth/RequireAuth.tsx:24–29`

**Fix đề xuất:**
```tsx
if (!session || !profile) {
  return <Navigate to="/login" state={{ from: location }} replace />
}
if (profile.role !== role) {
  return <Navigate to={ROLE_DASHBOARDS[profile.role]} replace />
}
return <Outlet />
```

---

### BUG-002 [CRITICAL] — RLS Infinite Recursion trong 005_rls.sql vẫn tồn tại nếu 009 không được chạy

**Mô tả:**
`005_rls.sql` tạo các admin policies dùng trực tiếp subquery vào bảng `profiles`:

```sql
-- 005_rls.sql (ví dụ line 26–29)
create policy "profiles_admin_all"
  on profiles
  using (exists (
    select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'
  ));
```

Policy trên bảng `profiles` lại query vào chính bảng `profiles` → **infinite recursion**. Điều này gây crash toàn bộ hệ thống cho user `admin` khi truy cập bất kỳ bảng nào có admin policy kiểu này.

Migration `009_fix_rls_recursion.sql` đã fix bằng cách tạo function `is_admin()` (security definer, bypass RLS). Tuy nhiên:
- Nếu dev mới chỉ chạy `005` mà quên `009`, hệ thống sẽ bị broken hoàn toàn
- `005_rls.sql` vẫn chứa code sai, gây nhầm lẫn khi đọc migration history

**Severity:** Critical vì nếu thiếu migration `009`, admin không thể login thành công (infinite loop DB query → timeout).

**Steps to reproduce:**
1. Chạy migrations `001` → `008` (bỏ qua `009`)
2. Login bằng account admin
3. Mọi query Supabase của admin sẽ timeout/error do RLS recursion

**Expected:** Migrations tự-consistent, không cần hotfix migration sau
**Actual:** `005_rls.sql` có code sai, phụ thuộc bắt buộc vào `009`

**File liên quan:** `migrations/005_rls.sql:26–29`, `migrations/009_fix_rls_recursion.sql`

**Fix đề xuất:** Sửa trực tiếp `005_rls.sql` để dùng `is_admin()` function (cần define function trước trong `004_triggers.sql` hoặc một file riêng), hoặc thêm comment bắt buộc rõ ràng trong `005_rls.sql`: `-- CRITICAL: must run 009_fix_rls_recursion.sql after this`.

---

### BUG-003 [MAJOR] — Non-standard Tailwind classes không generate CSS: `w-4.5`, `h-4.5`, `border-white/8`, `hover:bg-white/8`

**Mô tả:**
`Sidebar.tsx` dùng một số Tailwind classes không có trong default scale:

| Class | File | Vấn đề |
|-------|------|---------|
| `w-4.5 h-4.5` | `Sidebar.tsx:117` | Scale Tailwind nhảy từ `w-4` (16px) lên `w-5` (20px), không có `w-4.5` |
| `border-white/8` | `Sidebar.tsx:64, 124` | Opacity modifier `/8` không có trong default scale (standard: `/5`, `/10`, `/20`...) |
| `hover:bg-white/8` | `Sidebar.tsx:103, 137` | Tương tự `/8` không generate CSS |

Các classes này sẽ bị Tailwind **bỏ qua hoàn toàn** → không có CSS được sinh ra.

**Visual impact:**
- Nav icons trong sidebar: không có `width/height` → icon sẽ có kích thước mặc định của SVG hoặc parent, layout lệch
- Divider giữa các section trong sidebar: border vô hình (không màu)
- Hover state của nav items: background hover không hiện → UX phản hồi kém

**Steps to reproduce:**
1. Chạy `npm run dev`
2. Mở DevTools → inspect nav items trong sidebar
3. Các class `w-4.5`, `border-white/8` không có trong stylesheet

**Expected:** Icons kích thước ~18px, border phân chia section hiển thị, hover có background
**Actual:** Icons kích thước không kiểm soát được, border ẩn, hover không có visual feedback

**File liên quan:** `src/components/layout/Sidebar.tsx:64, 103, 117, 124, 137`

**Fix đề xuất:**
```tsx
// w-4.5 h-4.5 → dùng w-[18px] h-[18px] hoặc w-4 h-4 / w-5 h-5
<Icon className="w-[18px] h-[18px] flex-shrink-0" />

// border-white/8 → dùng border-white/10
<div className="... border-b border-white/10">

// hover:bg-white/8 → dùng hover:bg-white/10
className="... hover:bg-white/10"
```

---

### BUG-004 [MAJOR] — `Toaster` component không được mount: toast notifications sẽ không hiển thị

**Mô tả:**
`src/components/ui/toaster.tsx` tồn tại và hoạt động đúng, nhưng `<Toaster />` **chưa được mount** vào `App.tsx` hay `main.tsx`. Handoff tự thừa nhận đây là known issue.

Hệ quả thực tế: mọi `toast.success()`, `toast.error()` được gọi ở các Phase sau (Phase 2+ có CRUD operations) sẽ **im lặng thất bại** — không có visual feedback gì cho user.

**File liên quan:** `src/App.tsx`, `src/components/ui/toaster.tsx`

**Severity:** Major vì sẽ ảnh hưởng trực tiếp đến toàn bộ UX feedback của Phase 2, 3, 4.

**Fix đề xuất:**
```tsx
// App.tsx — thêm import và mount Toaster
import { Toaster } from '@/components/ui/toaster'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ...routes... */}
        </Routes>
        <Toaster />   {/* ← thêm ở đây */}
      </AuthProvider>
    </BrowserRouter>
  )
}
```

---

### BUG-005 [MAJOR] — `active_student_packages` view: `sessions_remaining = 1` không được phân loại `critical`

**Mô tả:**
View `006_views.sql` tính `alert_level` như sau:

```sql
case
  when sp.expires_at < now() + interval '3 days'                   then 'critical'
  when sp.expires_at < now() + interval '7 days'                   then 'warning'
  when sp.sessions_remaining <= 3 and p.package_type = 'session'   then 'warning'
  else 'ok'
end as alert_level
```

Trường hợp `sessions_remaining = 1` chỉ được map thành `'warning'`, không phải `'critical'`.

Trong `StudentDashboardPage.tsx:74`, banner cảnh báo đỏ chỉ hiện khi:
```tsx
{activeCard.alert_level === 'critical' && (
  <AlertBanner>Thẻ sắp hết</AlertBanner>
)}
```

**Kết quả:** Học viên chỉ còn **1 buổi học cuối cùng** sẽ KHÔNG thấy cảnh báo đỏ. Họ chỉ thấy màu warning (vàng) nhạt — không đủ nổi bật.

**Mâu thuẫn với spec:** `PLANNING.md:279` yêu cầu "Alert đỏ/vàng nếu thẻ còn ≤ 3 buổi hoặc ≤ 7 ngày", và `PLANNING.md:314` "Thẻ còn 1 buổi → Học viên + Admin nhận notification 'Buổi học cuối cùng!'". Cả 2 cấp độ (≤3 = warning, = 1 = critical) cần được phân biệt rõ.

**Steps to reproduce:**
1. Login học viên có thẻ active với `sessions_remaining = 1`
2. Xem Student Dashboard
3. Banner đỏ "Thẻ sắp hết" không hiện

**Expected:** Banner đỏ critical hiện khi `sessions_remaining = 1`
**Actual:** Không có banner, hoặc chỉ có warning thông thường

**File liên quan:** `migrations/006_views.sql:15–21`, `src/pages/student/DashboardPage.tsx:74`

**Fix đề xuất (view):**
```sql
case
  when sp.expires_at < now() + interval '3 days'                       then 'critical'
  when sp.sessions_remaining = 1 and p.package_type = 'session'        then 'critical'  -- thêm
  when sp.expires_at < now() + interval '7 days'                       then 'warning'
  when sp.sessions_remaining <= 3 and p.package_type = 'session'       then 'warning'
  else 'ok'
end as alert_level
```

---

### BUG-006 [MINOR] — `.single()` dùng sai ngữ cảnh, nên dùng `.maybeSingle()`

**Mô tả:**
`StudentDashboardPage.tsx:36–39`:
```tsx
const { data: card } = await supabase
  .from('active_student_packages')
  ...
  .single()   // ← throws PGRST116 error khi không có row
```

`.single()` expect chính xác 1 row. Khi học viên chưa có thẻ active (0 rows), Supabase trả về error `PGRST116 "The result contains 0 rows"`. Error bị destructure bỏ qua (`const { data: card }` không lấy `error`), nhưng error vẫn được log trong Supabase client internals.

**Expected:** Dùng `.maybeSingle()` — trả về `null` thay vì error khi 0 rows
**Actual:** Silent error bị swallow, có thể gây confusion khi debug

**File liên quan:** `src/pages/student/DashboardPage.tsx:39`

**Fix đề xuất:**
```tsx
const { data: card } = await supabase
  .from('active_student_packages')
  ...
  .maybeSingle()
```

---

### BUG-007 [MINOR] — CoachDashboardPage: "Buổi học sắp tới" không lọc theo coach hiện tại

**Mô tả:**
`CoachDashboardPage.tsx:36–40`:
```tsx
supabase.from('sessions_with_details')
  .select('id, scheduled_at, class_name, court_name')
  .gte('scheduled_at', new Date().toISOString())
  .neq('status', 'cancelled')
  .order('scheduled_at', { ascending: true })
  .limit(5)
// ← không có filter .eq('coach_id', coach.id) hoặc tương đương
```

Query không lọc theo `coach_id`. Dù RLS policy (`sessions_coach_all`) giới hạn chỉ trả sessions của lớp mà coach đó phụ trách, nhưng:

1. **KPI count sai:** `upcomingSessions.length` bị giới hạn `limit(5)` → nếu coach có nhiều hơn 5 buổi sắp tới, count hiển thị sẽ là 5 (không chính xác)
2. **Logic không rõ ràng:** Phụ thuộc ngầm vào RLS thay vì filter tường minh → khó debug, dễ bị break nếu RLS thay đổi

**Expected:** Query filter rõ ràng theo coach: `.eq('coach_id', coach.id)` (hoặc qua class_id)
**Actual:** Dựa vào RLS ngầm, count "Buổi sắp tới" bị cap ở 5

**File liên quan:** `src/pages/coach/DashboardPage.tsx:36–44`

---

### BUG-008 [MINOR] — Tất cả error từ Supabase queries trong Admin/Coach Dashboard bị swallow

**Mô tả:**
`AdminDashboardPage.tsx:26–49` và `CoachDashboardPage.tsx:33–44` dùng pattern:
```tsx
const [students, classes, sessions] = await Promise.all([
  supabase.from('students').select(...),
  supabase.from('classes').select(...),
  ...
])
// không check students.error, classes.error, sessions.error
```

Nếu có lỗi (RLS block, network timeout, DB error), UI sẽ hiển thị `0` / `—` cho tất cả KPI — giống hệt trường hợp không có data. User không biết đang xem data thật hay đang bị lỗi.

**Expected:** Khi query fail, hiển thị trạng thái lỗi rõ ràng (toast hoặc inline error message)
**Actual:** Silent fail, KPI hiển thị 0 không rõ nguyên nhân

**File liên quan:** `src/pages/admin/DashboardPage.tsx:26–49`, `src/pages/coach/DashboardPage.tsx:33–44`

---

### BUG-009 [MINOR] — DESIGN.md định nghĩa token `brand` (sky blue) nhưng implementation dùng `primary` (red) — lệch spec

**Mô tả:**
`DESIGN.md:8–25` định nghĩa color token `brand` với primary color là sky blue `#0ea5e9`, sidebar `#0f172a`.

Thực tế `tailwind.config.ts` implement:
- `primary` = red (`#dc2626`) — không phải sky blue
- `sidebar` = `#180a0a` (dark red/maroon) — không phải `#0f172a` (dark slate)
- Không có token `brand` nào

Về mặt visual, thiết kế đỏ/cầu lông có thể là intentional decision của dev, nhưng:
- `DESIGN.md` là tài liệu thiết kế chính thức được quy định trong `CLAUDE.md`
- Bất kỳ component Phase 2+ nào copy class `brand-*` từ `DESIGN.md` sẽ không sinh CSS
- Sẽ gây nhầm lẫn giữa dev và designer khi làm việc song song

**Expected:** Tailwind config phản ánh đúng tokens trong DESIGN.md, hoặc DESIGN.md được cập nhật để sync với implementation
**Actual:** 2 nguồn thông tin mâu thuẫn nhau

**File liên quan:** `docs/DESIGN.md:8–25`, `tailwind.config.ts:12–43`

---

## Test Cases Coverage

| # | Test Case | Method | Result | Ghi chú |
|---|-----------|--------|--------|---------|
| A1 | Login Admin → `/admin/dashboard` | Code review | ✅ Logic đúng | Cần verify runtime |
| A2 | Login HLV → `/coach/dashboard` | Code review | ✅ Logic đúng | |
| A3 | Login HV → `/student/dashboard` | Code review | ✅ Logic đúng | |
| A4 | Sai PW → hiển thị lỗi | Code review | ✅ `authError` state hiển thị đúng | |
| A5 | Student vào `/admin/dashboard` → redirect | Code review | ✅ RequireRole redirect đúng khi profile có role | |
| A6 | Chưa login vào dashboard → redirect `/login` | Code review | ✅ `!session` → Navigate login | |
| A7 | Đã login vào `/login` → redirect dashboard | Code review | ✅ `PublicRoute` redirect đúng | |
| A8 | Logout → redirect `/login` | Code review | ✅ `signOut` + navigate | |
| U1 | Sidebar ẩn khi < 1024px | Code review | ✅ `hidden lg:flex` | |
| U2 | Mobile hamburger → sidebar slide | Code review | ✅ overlay + `fixed` sidebar | |
| U3 | KPI cards admin | Code review | ⚠️ Hiển thị đúng nhưng error bị swallow (BUG-008) | |
| U4 | Student card → empty state khi chưa có thẻ | Code review | ✅ empty state render đúng | |
| — | Session có nhưng profile null → bypass auth | Code review | ❌ **BUG-001 CRITICAL** | |
| — | RLS recursion | Code review | ❌ **BUG-002 CRITICAL** (nếu thiếu 009) | |
| — | Sidebar icon size | Code review | ❌ **BUG-003 MAJOR** | |
| — | Toast không hoạt động | Code review | ❌ **BUG-004 MAJOR** | |
| — | Alert critical sessions = 1 | Code review | ❌ **BUG-005 MAJOR** | |

---

## Không thuộc scope Phase 1 (ghi nhận để theo dõi)

- Sidebar mobile: scroll position không reset khi navigate — đã được note trong known issues của handoff
- Code splitting / lazy loading — Phase 2+ concern
- RLS policy `profiles_select_own` chỉ cho đọc profile của bản thân → sẽ cần mở rộng ở Phase 2 khi HLV cần đọc tên học viên
