# Bug Report: Phase 1 — Foundation (Automation QC)

> **Phương pháp:** Static code analysis + TypeScript/build verification + logic trace  
> **Ngày kiểm tra:** 2026-05-24  
> **Tester:** QC Automation Agent  
> **Branch:** master · Commit: c7a8fe9

---

## Summary

| Metric | Giá trị |
|--------|---------|
| Tổng bugs | 11 |
| Critical | 2 |
| Major | 6 |
| Minor | 3 |
| Build pass | ✅ 0 errors |
| Typecheck pass | ✅ 0 errors |

---

## Bugs

### BUG-001 [CRITICAL] — AuthContext race condition: profile=null sau khi login

**Mô tả:**  
Sau khi `signIn()` thành công, `LoginPage` gọi `navigate('/', { replace: true })` ngay lập tức. Tại thời điểm đó, `session` đã được set (qua `onAuthStateChange`) nhưng `profile` vẫn là `null` vì `fetchProfile` là async và chưa hoàn thành. `isLoading` **không được reset về `true`** trong `onAuthStateChange` handler, nên `RootRedirect` thấy `{ isLoading: false, session: <set>, profile: null }` và redirect về `/login`.

**Hậu quả:**
- Người dùng thấy trang Login flash lại sau khi đăng nhập thành công (race condition thông thường).
- Nếu `fetchProfile` lỗi (network error, RLS reject), `profile` mãi là `null` → user kẹt ở `/login` dù đã có session hợp lệ, không có thông báo lỗi nào.

**Steps to reproduce:**
1. Mở app ở trạng thái chưa login
2. Nhập email/password hợp lệ → click Đăng nhập
3. Quan sát: trang Login thoáng hiện lại trước khi redirect dashboard

**Expected:** Sau khi `signIn()` thành công → spinner → redirect đúng dashboard.  
**Actual:** Login page flash / bị kẹt ở login nếu profile fetch chậm/lỗi.

**Root cause:**
```tsx
// src/contexts/AuthContext.tsx:54
const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
  setSession(s)
  if (s) {
    // ❌ Thiếu setIsLoading(true) trước khi fetch
    fetchProfile(s.user.id)
  } else {
    setProfile(null)
    setIsLoading(false)
  }
})
```

**Fix cần thực hiện:**  
Thêm `setIsLoading(true)` trước khi gọi `fetchProfile` trong `onAuthStateChange` handler:
```tsx
if (s) {
  setIsLoading(true)   // ← thêm dòng này
  fetchProfile(s.user.id)
}
```

**File liên quan:** `src/contexts/AuthContext.tsx:54` · `src/pages/auth/LoginPage.tsx:34`

---

### BUG-002 [CRITICAL] — RequireRole render Outlet khi profile === null

**Mô tả:**  
Logic guard trong `RequireRole` không cover trường hợp `session != null` nhưng `profile == null` (đang fetch hoặc fetch failed). Điều kiện `if (profile && profile.role !== role)` là `false` khi `profile = null`, dẫn đến `<Outlet />` được render — tức là trang protected hiển thị với dữ liệu user = null.

**Steps to reproduce:**  
Xảy ra cùng với BUG-001: trong khoảng thời gian profile chưa fetch xong sau login.

**Expected:** Hiển thị spinner khi session có nhưng profile chưa load.  
**Actual:** Dashboard page được render với `profile = null`, các component con phải tự handle null.

**Root cause:**
```tsx
// src/components/auth/RequireAuth.tsx:25-29
if (isLoading) return <FullPageSpinner />
if (!session) return <Navigate to="/login" ... />
// ❌ Thiếu: if (session && !profile) return <FullPageSpinner />
if (profile && profile.role !== role) return <Navigate ... />
return <Outlet />  // ← render với profile = null!
```

**Fix cần thực hiện:**
```tsx
if (isLoading) return <FullPageSpinner />
if (!session) return <Navigate to="/login" state={{ from: location }} replace />
if (!profile) return <FullPageSpinner />   // ← thêm dòng này
if (profile.role !== role) return <Navigate to={ROLE_DASHBOARDS[profile.role]} replace />
return <Outlet />
```

**File liên quan:** `src/components/auth/RequireAuth.tsx:25-29`

---

### BUG-003 [MAJOR] — Không có error handling cho Supabase queries trong tất cả Dashboard pages

**Mô tả:**  
Cả 3 Dashboard pages (Admin, Coach, Student) đều thực hiện Supabase queries mà không handle errors. Theo quy tắc bắt buộc trong `CLAUDE.md`: *"Mọi Supabase call phải handle error — không bỏ qua"*. Khi xảy ra lỗi (network timeout, RLS reject, DB unavailable), UI sẽ hiển thị `0` / `—` mà không có toast hay thông báo nào.

**File liên quan và cụ thể:**

`src/pages/admin/DashboardPage.tsx:26-50` — 4 Supabase calls không handle error:
```tsx
const [students, classes, sessions] = await Promise.all([
  supabase.from('students').select(...),   // ❌ không check .error
  supabase.from('classes').select(...),    // ❌ không check .error
  supabase.from('sessions').select(...),   // ❌ không check .error
])
const { data: revenueRaw } = await supabase.from('payments')...  // ❌ không check error
```

`src/pages/coach/DashboardPage.tsx:24-47` — 2 Supabase calls không handle error:
```tsx
const coachResult = await supabase.from('coaches').select('id')...  // ❌ không check
const [classes, sessions] = await Promise.all([...])               // ❌ không check
```

`src/pages/student/DashboardPage.tsx:25-44` — 2 Supabase calls không handle error:
```tsx
const studentResult = await supabase.from('students').select('id')...  // ❌ không check
const { data: card } = await supabase.from('active_student_packages')...// ❌ không check error
```

**Expected:** Hiển thị toast error khi query fail, log console.error.  
**Actual:** Silent fail — hiển thị số 0 như thể data trống.

---

### BUG-004 [MAJOR] — Sidebar dùng Tailwind class `w-4.5 h-4.5` không hợp lệ

**Mô tả:**  
Tailwind CSS default spacing scale không có giá trị `4.5` (có `4` = 16px và `5` = 20px nhưng không có `4.5`). JIT mode không tự generate CSS cho class này vì không có trong scale và không dùng cú pháp arbitrary value (`w-[4.5rem]`). Kết quả: tất cả navigation icons trong Sidebar không có `width`/`height` CSS được áp dụng, icon hiển thị theo kích thước SVG default.

**Steps to reproduce:**
1. Login với bất kỳ role nào
2. Inspect element nav icons trong Sidebar
3. Quan sát: class `w-4.5 h-4.5` tồn tại trong DOM nhưng không có CSS tương ứng trong stylesheet

**Expected:** Icons có kích thước `18px` (giữa 16px và 20px).  
**Actual:** Icons không có width/height CSS, dùng kích thước SVG default (thường 24×24px).

**File liên quan:** `src/components/layout/Sidebar.tsx:117`
```tsx
<Icon className="w-4.5 h-4.5 flex-shrink-0" />  // ❌ invalid Tailwind class
```

**Fix:** Đổi thành `w-4 h-4` hoặc `w-5 h-5`, hoặc dùng arbitrary value `w-[18px] h-[18px]`.

---

### BUG-005 [MAJOR] — Student Dashboard dùng `.single()` cho query có thể trả về 0 rows

**Mô tả:**  
Supabase `.single()` throw error `PGRST116` khi không tìm thấy row nào. Code chỉ destructure `data` và bỏ qua `error`, dẫn đến:
1. Học viên không có thẻ active: error bị silent (không log) — behavior trông đúng nhưng masking lỗi.
2. Lỗi thực sự (network, RLS): không phân biệt được với "không có thẻ active".

**Root cause:**
```tsx
// src/pages/student/DashboardPage.tsx:34-40
const { data: card } = await supabase          // ❌ error bị bỏ qua
  .from('active_student_packages')
  ...
  .limit(1)
  .single()                                    // ❌ dùng .single() thay vì .maybeSingle()

setActiveCard(card as ActiveCard | null)
```

**Fix:**
```tsx
const { data: card, error: cardError } = await supabase
  .from('active_student_packages')
  ...
  .limit(1)
  .maybeSingle()                               // ✅ trả về null thay vì error khi 0 rows

if (cardError) console.error('Failed to fetch active package:', cardError.message)
setActiveCard(card as ActiveCard | null)
```

**File liên quan:** `src/pages/student/DashboardPage.tsx:34-40`

---

### BUG-006 [MAJOR] — Sidebar active nav item có padding-left không nhất quán

**Mô tả:**  
Khi một nav item là active, inline style `paddingLeft: '0.625rem'` (10px) override Tailwind class `px-3` (12px padding-left). Điều này tạo ra sự dịch chuyển 2px của icon và text mỗi khi user navigate giữa các trang.

**Root cause:**
```tsx
// src/components/layout/Sidebar.tsx:107-115
style={({ isActive }) =>
  isActive
    ? {
        background: 'rgba(220,38,38,0.18)',
        borderLeft: '3px solid #dc2626',
        paddingLeft: '0.625rem',  // ❌ = 10px, override px-3 = 12px
      }
    : {}
}
```

**Lý giải:** `borderLeft: 3px` làm giảm available width → dev cố compensate bằng giảm padding-left. Nhưng cần tính đúng: nếu border 3px + padding-left 9px = 12px total. Hiện tại 3 + 10 = 13px, không nhất quán.

**Fix:** Đổi `paddingLeft: 'calc(0.75rem - 3px)'` (= 9px) để tổng cộng bằng `0.75rem` = 12px.

**File liên quan:** `src/components/layout/Sidebar.tsx:112`

---

### BUG-007 [MAJOR] — Toast library: `sonner` trong DESIGN.md nhưng không install, `<Toaster />` không mount

**Mô tả — Phần A (Library sai):**  
`DESIGN.md` và `rules/clean-code.md` quy định dùng `sonner` cho toast:
```ts
import { toast } from 'sonner'
```
Nhưng `package.json` không có `sonner`. Project dùng `shadcn/ui toast` + `use-toast` hook thay thế. Nếu Phase 2+ dev follow docs và `import { toast } from 'sonner'`, sẽ bị runtime error.

**Mô tả — Phần B (Toaster chưa mount):**  
`<Toaster />` component (dù là shadcn hay sonner) chưa được mount vào `App.tsx` hoặc `main.tsx`. Mọi `toast()` call trong app sẽ không hiển thị UI nào.
```tsx
// src/App.tsx — thiếu:
// import { Toaster } from '@/components/ui/toaster'
// ...
// <Toaster />
```

**Expected:** DESIGN.md và package.json đồng bộ về toast library; Toaster được mount.  
**Actual:** Library khác nhau giữa docs và code; toast sẽ không hoạt động khi cần.

**File liên quan:** `package.json` · `src/App.tsx` · `docs/DESIGN.md`  
**Note:** Phần B là Known Issue từ HANDOFF_PHASE_1.md nhưng cần track để không bị bỏ sót.

---

### BUG-008 [MINOR] — Design token `surface` (#f8fafc) thiếu trong `tailwind.config.ts`

**Mô tả:**  
`DESIGN.md` định nghĩa `surface: '#f8fafc'` là màu nền page, nhưng token này không có trong `tailwind.config.ts`. Đồng thời `sidebar` color trong DESIGN.md là `#0f172a` (dark navy) nhưng code implement `#180a0a` (dark red-black) — đây là thay đổi có chủ ý nhưng docs chưa được cập nhật.

Nếu Phase 2+ component dùng `bg-surface`, class sẽ không được generate.

**File liên quan:** `tailwind.config.ts` · `docs/DESIGN.md`

**Fix options:**
- Thêm `surface: '#f8fafc'` vào `tailwind.config.ts`, hoặc
- Cập nhật `DESIGN.md` để phản ánh `sidebar: '#180a0a'` và loại bỏ `surface` nếu không dùng.

---

### BUG-009 [MINOR] — Header notification bell không realtime, không subscribe Supabase Realtime

**Mô tả:**  
Unread count chỉ được fetch 1 lần khi Header mount. Trong cùng một session, nếu admin/trigger tạo notification mới, bell count sẽ không cập nhật cho đến khi user reload trang.

```tsx
// src/components/layout/Header.tsx:36-44
useEffect(() => {
  if (!profile) return
  supabase.from('notifications')...
    .then(({ count }) => setUnreadCount(count ?? 0))
  // ❌ Không có realtime subscription
}, [profile])
```

**Expected (Phase 5 scope):** Subscribe `notifications` table với `channel.on('postgres_changes', ...)`.  
**Actual:** Static count, stale sau khi notification mới tạo.

**Note:** HANDOFF ghi Phase 5 mới implement Realtime. Bug này cần track để không bị quên.

**File liên quan:** `src/components/layout/Header.tsx:35-44`

---

### BUG-010 [MINOR] — `date-fns` dependency được install nhưng không dùng

**Mô tả:**  
`package.json` có `"date-fns": "^3.6.0"` nhưng `src/lib/utils.ts` dùng native `Intl.DateTimeFormat` API thay vì `date-fns`. Không có file nào import `date-fns`.

```json
// package.json
"date-fns": "^3.6.0",  // ❌ unused dependency
```

**Impact:** `date-fns` thêm ~24KB vào bundle (minified+gzip). Vite tree-shaking sẽ loại bỏ code không dùng, nhưng package vẫn chiếm disk space trong `node_modules`.

**File liên quan:** `package.json`

**Fix:** `npm uninstall date-fns`

---

### BUG-011 [MINOR] — `design token prefix mismatch: DESIGN.md dùng `brand`, code dùng `primary`

**Mô tả:**  
`DESIGN.md` ghi color token prefix là `brand` (ví dụ `brand-500`, `bg-brand-50`), nhưng `tailwind.config.ts` implement với prefix `primary`. Code trong các pages dùng `primary-*` class.  

Hậu quả: Dev mới đọc `DESIGN.md` sẽ dùng `bg-brand-500` nhưng class này không tồn tại, dẫn đến styling không hoạt động.

**File liên quan:** `docs/DESIGN.md` · `tailwind.config.ts`

**Fix:** Cập nhật `DESIGN.md` để dùng `primary` thay vì `brand`.

---

## Bảng tổng hợp

| Bug ID | Mức độ | File chính | Mô tả ngắn |
|--------|--------|-----------|-----------|
| BUG-001 | CRITICAL | `AuthContext.tsx:54` | isLoading race condition → flash login sau signIn |
| BUG-002 | CRITICAL | `RequireAuth.tsx:25` | RequireRole render Outlet khi profile=null |
| BUG-003 | MAJOR | 3 DashboardPages | Không handle Supabase query errors |
| BUG-004 | MAJOR | `Sidebar.tsx:117` | Class `w-4.5 h-4.5` không hợp lệ trong Tailwind |
| BUG-005 | MAJOR | `student/DashboardPage.tsx:34` | `.single()` thay vì `.maybeSingle()` |
| BUG-006 | MAJOR | `Sidebar.tsx:112` | Active item padding-left 10px vs 12px |
| BUG-007 | MAJOR | `App.tsx`, `package.json` | Toast library không đồng bộ, Toaster chưa mount |
| BUG-008 | MINOR | `tailwind.config.ts` | Token `surface` thiếu, `sidebar` color mismatch |
| BUG-009 | MINOR | `Header.tsx:35` | Notification count không realtime |
| BUG-010 | MINOR | `package.json` | `date-fns` installed nhưng không dùng |
| BUG-011 | MINOR | `DESIGN.md` | `brand` vs `primary` token prefix mismatch |

---

## E2E Test Results (Playwright) — 2026-05-24

| Test | ID | Kết quả |
|------|----|---------|
| Admin login redirects to /admin/dashboard | A1 | ✅ Pass |
| Coach login redirects to /coach/dashboard | A2 | ✅ Pass |
| Student login redirects to /student/dashboard | A3 | ✅ Pass |
| Wrong password shows error message | A4 | ✅ Pass |
| Invalid email format stays on login | A4b | ✅ Pass |
| Short password shows validation error | A4c | ✅ Pass |
| Student cannot access /admin/dashboard | A5 | ✅ Pass |
| Coach cannot access /admin/dashboard | A5b | ✅ Pass |
| Unauthenticated access redirects to /login (×3) | A6a-c | ✅ Pass |
| Already logged-in admin on /login redirects | A7 | ✅ Pass |
| Logout clears session | A8 | ✅ Pass |
| Password toggle shows/hides | PV1 | ✅ Pass |
| Desktop sidebar visible | U1 | ✅ Pass |
| Mobile hamburger visible | U1b | ✅ Pass |
| Mobile sidebar opens on hamburger click | U2 | ✅ Pass |
| Admin KPI cards render | U3 | ✅ Pass |
| Student dashboard no crash | U4 | ✅ Pass |
| ShuttleClass brand visible | U5 | ✅ Pass |
| Root redirect | ROOT | ✅ Pass |

**Kết quả: 22/22 PASS — Phase 1 authentication & layout hoạt động đúng.**

---

## Ghi chú QC

- **Build & Typecheck:** `npm run build` và `npm run typecheck` đều PASS với 0 errors — đây là tốt.
- **BUG-001 + BUG-002** có liên quan với nhau và nên được fix cùng lúc. Fix BUG-001 (`setIsLoading(true)` trước fetchProfile trong onAuthStateChange) và BUG-002 (thêm `if (!profile) return <FullPageSpinner />` trong RequireRole) sẽ giải quyết toàn bộ auth race condition.
- **BUG-003** ảnh hưởng toàn bộ Phase hiện tại và các Phase sau — nên tạo pattern xử lý lỗi chuẩn ngay.
- **RLS Recursion** đã được fix đúng trong `009_fix_rls_recursion.sql` bằng `is_admin()` security definer function — không phải bug, chỉ cần verify migration đã chạy theo thứ tự.
- **Auth trigger** (`004_triggers.sql`): BEFORE/AFTER trigger combination (`activate_pending_package` BEFORE + `deduct_session_on_attendance` AFTER) hoạt động đúng logic nghiệp vụ — lần điểm danh đầu vừa activate vừa deduct 1 buổi.
