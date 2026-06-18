# Thái Phong Badminton Class — CLAUDE.md
> Quy tắc bắt buộc cho mọi AI agent (dev, QC, fix) làm việc trên dự án này.
> **Đọc toàn bộ file này trước khi thực hiện bất kỳ tác vụ nào.**

---

## 1. Tổng quan dự án

- **Tên:** Thái Phong Badminton Class — Ứng dụng quản lý lớp học cầu lông
- **Tech stack:** React 18 + Vite + TypeScript · Tailwind CSS + shadcn/ui · Supabase (PostgreSQL + Auth + Realtime) · Recharts · Zustand · React Hook Form + Zod · vite-plugin-pwa
- **Tài liệu chính:** xem thư mục `/docs/`
- **Mockup UI:** `mockup/index.html`

---

## 2. Cấu trúc thư mục tài liệu

```
/docs/
  PLANNING.md        ← Kế hoạch tổng thể, phases, tính năng
  DATABASE.md        ← Schema đầy đủ, RLS, logic gói học
  API.md             ← Tất cả Supabase queries và mutations
  DESIGN.md          ← Design system, màu sắc, components, layout
  ARCHITECTURE.md    ← Cấu trúc code, patterns, data flow

/plan_dev/
  PLAN_PHASE_1.md    ← Dev tạo trước khi bắt đầu phase
  PLAN_PHASE_2.md
  ...

/handoffs/
  HANDOFF_PHASE_1.md ← Dev tạo sau khi hoàn thành phase
  ...

/bugs/
  BUGS_PHASE_1.md    ← QC tạo sau khi kiểm tra
  ...

/fixed/
  BUG_FIXED_PHASE_1.md ← Dev tạo sau khi fix xong bugs
  ...

/skills/             ← Kỹ năng kỹ thuật cần dùng
/rules/              ← Quy tắc code bắt buộc
```

---

## 3. Quy trình phát triển (WORKFLOW)

### 3.1 Bắt đầu một Phase — DEV

**BƯỚC BẮT BUỘC:** Trước khi viết bất kỳ dòng code nào, tạo file kế hoạch:

```
/plan_dev/PLAN_PHASE_X.md
```

**Format bắt buộc của PLAN_PHASE_X.md:**
```markdown
# Plan: Phase X — [Tên phase]

## Mục tiêu
[Mô tả ngắn mục tiêu phase này đạt được]

## Phụ thuộc
- Phase trước đã hoàn thành: [Y/N]
- Files cần đọc: [danh sách]

## Tasks
| # | Task | File(s) sẽ tạo/sửa | Ước tính |
|---|------|---------------------|----------|
| 1 | ... | ... | ... |

## Acceptance Criteria
- [ ] Tiêu chí 1
- [ ] Tiêu chí 2

## Risks / Notes
[Rủi ro hoặc điểm cần chú ý]
```

---

### 3.2 Hoàn thành một Phase — DEV

Sau khi code xong và build thành công, tạo file handoff:

```
/handoffs/HANDOFF_PHASE_X.md
```

**Format bắt buộc của HANDOFF_PHASE_X.md:**
```markdown
# Handoff: Phase X — [Tên phase]

## Tóm tắt
[1–2 câu mô tả những gì đã làm]

## Tính năng đã implement
| Tính năng | File chính | Status |
|-----------|-----------|--------|
| Login page | src/pages/auth/LoginPage.tsx | ✅ Done |

## Functions / Hooks đã tạo
| Tên | File | Mô tả |
|-----|------|-------|
| useAuth() | src/hooks/useAuth.ts | ... |

## Database changes
- [Bảng mới / cột mới / RLS policy mới]

## Chưa xử lý / Known Issues
- [ ] Issue 1: [mô tả]

## Hướng dẫn test (dành cho QC)

### Setup
1. [Bước 1]
2. [Bước 2]

### Test cases
| # | Scenario | Steps | Expected |
|---|----------|-------|---------|
| 1 | Login admin | ... | Redirect /admin/dashboard |

### Test accounts
| Role | Email | Password |
|------|-------|---------|
| Admin | admin@test.com | Test@123 |
| HLV | coach@test.com | Test@123 |
| HV | student@test.com | Test@123 |
```

---

### 3.3 Kiểm thử — QC AGENT

QC đọc theo thứ tự:
1. `/docs/PLANNING.md` — hiểu tính năng tổng thể
2. `/docs/DESIGN.md` — hiểu UI/UX kỳ vọng
3. `/handoffs/HANDOFF_PHASE_X.md` — hiểu scope cần test
4. Chạy app, test theo test cases trong handoff
5. Tạo file bug report:

```
/bugs/BUGS_PHASE_X.md
```

**Format bắt buộc của BUGS_PHASE_X.md:**
```markdown
# Bug Report: Phase X

## Summary
- Tổng bugs: N
- Critical: N | Major: N | Minor: N

## Bugs

### BUG-001 [CRITICAL/MAJOR/MINOR]
**Mô tả:** ...
**Steps to reproduce:**
1. ...
**Expected:** ...
**Actual:** ...
**File liên quan:** src/...
**Screenshot/Log:** (nếu có)

---
### BUG-002 ...
```

---

### 3.4 Fix bugs — DEV

1. Đọc `/bugs/BUGS_PHASE_X.md`
2. Fix từng bug, commit rõ ràng
3. Tạo file xác nhận fix:

```
/fixed/BUG_FIXED_PHASE_X.md
```

**Format bắt buộc của BUG_FIXED_PHASE_X.md:**
```markdown
# Bug Fixed: Phase X

## Summary
- Tổng bugs fix: N / N

## Chi tiết

### BUG-001 ✅ FIXED
**Fix:** [Mô tả cách fix]
**File đã sửa:** src/...
**Commit:** [commit hash nếu có]

### BUG-002 ⚠️ DEFERRED
**Lý do defer:** [không thuộc scope phase này / cần thêm feature]
```

---

## 4. Rules Code (bắt buộc)

> Chi tiết đầy đủ trong `/rules/`. Tóm tắt các điểm quan trọng nhất:

### TypeScript
- **KHÔNG DÙNG `any`** — dùng `unknown`, type guard, hoặc define type cụ thể
- Tất cả props của component phải có interface/type
- Tất cả Supabase responses phải có return type tường minh
- Dùng `satisfies` operator thay vì cast `as` khi có thể

### React Components
- **KHÔNG tạo component mới nếu đã có component tương tự** trong `src/components/ui/` hoặc shadcn/ui
- Component file không vượt quá **300 dòng** — tách thành sub-components
- Không dùng `default export` cho utilities/hooks — dùng named export
- Custom hooks phải bắt đầu bằng `use`, trả về object (không phải array trừ khi là [value, setter])

### Styling
- **Chỉ dùng Tailwind CSS** — không viết CSS thuần (trừ animation phức tạp)
- Responsive mobile-first: `sm:` → `md:` → `lg:`
- Không hardcode màu sắc — dùng design token từ `tailwind.config.ts`
- Dùng `cn()` từ `lib/utils.ts` để merge class names

### State Management
- **Zustand** chỉ cho global UI state (sidebar, modal open state)
- **React Query / Supabase hooks** cho server state
- **useState** cho local component state
- Không prop drill quá 2 cấp — dùng context hoặc Zustand

### Error Handling
- Mọi Supabase call phải handle `error` — không bỏ qua
- Hiển thị toast notification cho lỗi user-facing
- Console.error cho lỗi debug (xóa trước khi merge)

### Build
- `npm run build` phải thành công **0 errors, 0 warnings** trước khi tạo handoff
- `npm run typecheck` phải pass
- Không commit code có `console.log` (chỉ `console.error` được phép)

---

## 5. Naming Conventions

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| Component | PascalCase | `AttendanceSheet.tsx` |
| Hook | camelCase + `use` prefix | `useStudentPackage.ts` |
| Utility | camelCase | `deductSession.ts` |
| Type/Interface | PascalCase | `StudentPackage`, `AttendanceStatus` |
| Const | SCREAMING_SNAKE_CASE | `MAX_STUDENTS_PER_CLASS` |
| CSS class | kebab-case (Tailwind only) | — |
| Supabase table | snake_case | `student_packages` |
| Route | kebab-case | `/admin/class-detail` |

---

## 6. Commit Message Format

```
type(scope): mô tả ngắn

feat(auth): add login redirect by role
fix(attendance): correct session deduction logic
chore(deps): update supabase client to 2.x
docs(phase1): add handoff file
```

Types: `feat` | `fix` | `refactor` | `chore` | `docs` | `test` | `style`

---

## 7. Checklist trước khi kết thúc session

- [ ] `npm run build` thành công (0 error)
- [ ] `npm run typecheck` pass
- [ ] Không có `any` type mới
- [ ] Không có component bị duplicate
- [ ] Đã tạo/cập nhật PLAN hoặc HANDOFF tương ứng
- [ ] Tất cả Supabase queries có error handling

---

## 8. Tham khảo nhanh

| Cần gì | Đọc file |
|--------|---------|
| Hiểu database schema | `/docs/DATABASE.md` |
| Biết API nào dùng | `/docs/API.md` |
| Design system | `/docs/DESIGN.md` |
| Patterns & architecture | `/docs/ARCHITECTURE.md` |
| Rules chi tiết | `/rules/*.md` |
| Skills kỹ thuật | `/skills/*.md` |
