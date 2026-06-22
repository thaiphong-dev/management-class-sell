# DESIGN.md — ShuttleClass
> Design system, màu sắc, typography, spacing, component patterns và UI conventions.

---

## 1. Design Tokens (Tailwind Config)

> **Màu sắc chủ đạo:** Đỏ cầu lông (`#DC2626`) + Xanh lá sân (`#16A34A`) — themed cho ứng dụng badminton.

```ts
// tailwind.config.ts
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Red primary (brand color cho ShuttleClass)
        primary: {
          50:  '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',  // Primary CTA
          700: '#b91c1c',  // Hover / Active
          900: '#7f1d1d',
          DEFAULT: 'hsl(var(--primary))',
        },
        // Court green (secondary)
        court: {
          50:  '#f0fdf4',
          600: '#16a34a',
          700: '#15803d',
          DEFAULT: '#16a34a',
        },
        sidebar: '#180a0a',   // Dark red-black sidebar background
        surface: '#f8fafc',   // Page background
      },
    }
  }
}
```

> **Lưu ý cho dev:** Dùng prefix `primary-*` (không phải `brand-*`) cho màu đỏ chính.
> Ví dụ: `bg-primary-600`, `text-primary-700`, `border-primary-500`.

---

## 2. Layout

### 2.1 App Layout (sau khi đăng nhập)

```
┌─────────────────────────────────────────────────────┐
│ HEADER (height: 64px, sticky)                       │
├───────────────┬─────────────────────────────────────┤
│               │                                     │
│   SIDEBAR     │         MAIN CONTENT                │
│   (240px)     │         (flex-1, overflow-auto)     │
│               │                                     │
│               │                                     │
└───────────────┴─────────────────────────────────────┘
```

- **Sidebar:** `w-60` (240px), `bg-sidebar (#180a0a)`, fixed height `min-h-screen`
- **Header:** `h-16`, `bg-white`, `border-b border-gray-200`, `sticky top-0 z-40`
- **Content:** `flex-1`, `bg-surface (#f8fafc)`, `overflow-auto`
- **Content padding:** `p-6` (24px)

### 2.2 Mobile (< 768px)
- Sidebar ẩn mặc định, toggle qua hamburger menu
- Sidebar overlay khi mở: `fixed inset-0 z-50`
- Content full-width

---

## 3. Color Palette & Usage

### Status Colors (Badge/Pill)
| Trạng thái | Background | Text | Usage |
|------------|-----------|------|-------|
| Success/Active | `#dcfce7` | `#16a34a` | Lớp hoạt động, có mặt, thẻ active |
| Warning | `#fef9c3` | `#ca8a04` | Sắp hết thẻ, đi trễ |
| Danger | `#fee2e2` | `#dc2626` | Khẩn cấp, thẻ hết, vắng |
| Info | `#dbeafe` | `#2563eb` | Thông tin, gói session |
| Neutral | `#f1f5f9` | `#64748b` | Chưa bắt đầu, inactive |

### Gradient Cards (Gói học)
| Gói | Gradient | Usage |
|-----|---------|-------|
| Khởi đầu | `from-blue-500 to-blue-600` | 8 buổi |
| Tiêu chuẩn | `from-violet-500 to-purple-600` | 12 buổi |
| Chuyên sâu | `from-emerald-500 to-teal-600` | 20 buổi |
| Tháng | `from-orange-500 to-amber-500` | Monthly |

---

## 4. Typography

```
Font: System font stack (Tailwind default)
  - headings: font-semibold / font-bold
  - body: font-normal (text-sm = 14px)
  - caption: text-xs (12px)
  - label: text-sm font-medium

Sizes:
  - Page title:  text-lg font-semibold (18px)
  - Section:     text-sm font-semibold uppercase tracking-wide text-gray-500
  - Card title:  text-base font-semibold (16px)
  - Body:        text-sm (14px)
  - Caption:     text-xs (12px)
  - KPI number:  text-3xl font-bold (30px)
```

---

## 5. Component Patterns

### 5.1 KPI Card
```tsx
// Dùng cho Admin/Coach dashboard
<div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
  <div className="flex items-center justify-between mb-3">
    <span className="text-sm text-gray-500">{label}</span>
    <div className="w-9 h-9 rounded-xl bg-{color}-50 flex items-center justify-center">
      <Icon className="w-5 h-5 text-{color}-500" />
    </div>
  </div>
  <p className="text-3xl font-bold text-gray-900">{value}</p>
  <p className="text-xs text-green-600 mt-1">{trend}</p>
</div>
```

### 5.2 Status Badge
```tsx
// src/components/ui/StatusBadge.tsx
const statusConfig = {
  active:    { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Hoạt động' },
  expired:   { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Hết hạn' },
  depleted:  { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Hết buổi' },
  warning:   { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Sắp hết' },
  present:   { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Có mặt' },
  absent:    { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Vắng' },
  late:      { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Đi trễ' },
}

<span className={cn('text-xs px-2 py-1 rounded-full font-medium', statusConfig[status].bg, statusConfig[status].text)}>
  {statusConfig[status].label}
</span>
```

### 5.3 Data Table
```tsx
// Dùng shadcn/ui Table component
<div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
    <h3 className="font-semibold text-gray-800">{title}</h3>
    {action}
  </div>
  <Table>
    <TableHeader className="bg-gray-50">
      <TableRow>
        <TableHead className="text-xs font-medium text-gray-500">{col}</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows}
    </TableBody>
  </Table>
</div>
```

### 5.4 Form Modal (CRUD)
```tsx
// Dùng shadcn/ui Dialog + React Hook Form
<Dialog>
  <DialogContent className="sm:max-w-md rounded-2xl">
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
    </DialogHeader>
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Tên lớp</Label>
        <Input className="rounded-xl" {...register('name')} />
        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Hủy</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang lưu...' : 'Lưu'}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

### 5.5 Membership Card
```tsx
// src/components/packages/PackageCard.tsx
// Gradient card hiển thị thẻ học viên
<div className={cn(
  'rounded-3xl p-6 text-white shadow-xl',
  gradientByType[packageType]  // from-violet-600 to-purple-700
)}>
  <div className="flex items-center justify-between mb-5">
    <div>
      <p className="text-purple-200 text-xs">Học viên</p>
      <p className="font-bold text-lg">{studentName}</p>
    </div>
    <div className="text-right">
      <p className="text-purple-200 text-xs">Loại thẻ</p>
      <p className="font-semibold text-sm">{packageTypeLabe[packageType]}</p>
    </div>
  </div>
  {/* sessions remaining + expiry */}
  {/* progress bar */}
</div>
```

### 5.6 Attendance Toggle Row
```tsx
// src/components/attendance/AttendanceRow.tsx
// 3 nút toggle per học viên
<div className="flex items-center gap-4 px-4 py-3">
  <Avatar name={student.name} />
  <div className="flex-1">
    <p className="text-sm font-medium">{student.name}</p>
    <PackageStatus remaining={remaining} expiresAt={expiresAt} />
  </div>
  <div className="flex gap-2">
    {(['present', 'absent', 'late'] as const).map(s => (
      <AttendanceButton
        key={s}
        status={s}
        active={currentStatus === s}
        onClick={() => setStatus(s)}
      />
    ))}
  </div>
</div>
```

### 5.7 Skill Progress Bar
```tsx
// src/components/progress/SkillBar.tsx
<div>
  <div className="flex justify-between text-xs text-gray-600 mb-1">
    <span>{label}</span>
    <span className="font-medium">{value}%</span>
  </div>
  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
    <div
      className="h-full rounded-full bg-gradient-to-r from-brand-400 to-indigo-500 transition-all duration-500"
      style={{ width: `${value}%` }}
    />
  </div>
### 5.8 Responsive Table & List (Mobile Card Pattern)
Đối với các trang hiển thị danh sách dạng bảng (như Danh sách Người dùng, Đơn đăng ký học viên, Đơn ứng tuyển), để tránh vỡ giao diện trên màn hình di động (< 768px), chúng ta áp dụng pattern chia đôi layout:
- **Desktop/Tablet Layout:** Sử dụng thẻ `<Table>` của shadcn/ui bọc ngoài bởi `<div className="hidden md:block overflow-x-auto">`.
- **Mobile Layout:** Sử dụng danh sách các Card được hiển thị dọc, bọc ngoài bởi `<div className="flex md:hidden flex-col gap-3 mt-2">`.

Ví dụ cấu trúc React component:
```tsx
return (
  <>
    {/* Desktop & Tablet Layout */}
    <div className="hidden md:block overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Học viên</TableHead>
            {/* ... các cột khác */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map(item => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>

    {/* Mobile Card Layout */}
    <div className="flex md:hidden flex-col gap-3">
      {list.map(item => (
        <div key={item.id} className="flex flex-col border border-gray-150/70 rounded-2xl p-4 gap-3 bg-white shadow-2xs relative">
          <div className="flex items-center gap-3">
            {/* Avatar & Tiêu đề chính */}
            <div>
              <h4 className="text-sm font-bold text-gray-900">{item.name}</h4>
              <p className="text-[11px] text-gray-500">{item.subtext}</p>
            </div>
          </div>
          {/* Khối thông tin chi tiết */}
          <div className="bg-gray-50/50 border border-gray-150/40 rounded-xl p-3 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400 font-bold text-[10px]">CHI TIẾT</span>
              <span className="font-semibold">{item.detail}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </>
)
```

Đối với các thanh bộ lọc danh sách dạng Tabs:
- Trên Desktop/Tablet: Sử dụng `<TabsList className="hidden md:grid grid-cols-5">`.
- Trên Mobile: Thay thế bằng component `<Select>` đồng bộ với `activeTab` state để tránh bị tràn/khuất các tabs trên màn hình nhỏ.

---

## 6. Sidebar Navigation

### Structure per Role

**Admin:**
```
[Logo + Tên + Avatar]
─── Tổng quan ───
  Dashboard
─── Quản lý ─────
  Học viên / HLV
  Lớp học
  Gói học / Thẻ
  Cơ sở / Sân
─── Báo cáo ─────
  Doanh thu
```

**HLV:**
```
[Logo + Tên + Avatar]
─────────────────
  Dashboard
  Lớp của tôi
  Điểm danh
  Đánh giá học viên
```

**Học viên:**
```
[Logo + Tên + Avatar]
─────────────────
  Tổng quan
  Lịch học
  Điểm danh
  Tiến độ
  Thẻ của tôi
```

### Active State
```css
/* nav-item active */
background: rgba(14, 165, 233, 0.15);
border-left: 3px solid #0ea5e9;
color: white;
```

---

## 7. Notification Bell

- Icon: Bell với badge đỏ (số chưa đọc)
- Dropdown: `w-80`, `rounded-2xl`, `shadow-lg`
- Each item: icon type + title + time relative ("2 phút trước")
- Footer: "Đánh dấu tất cả đã đọc"

---

## 8. Empty States

```tsx
// Dùng cho tables/lists rỗng
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
    <Icon className="w-8 h-8 text-gray-400" />
  </div>
  <p className="text-gray-500 font-medium">{title}</p>
  <p className="text-sm text-gray-400 mt-1">{description}</p>
  {actionButton}
</div>
```

---

## 9. Loading States

- **Table loading:** Skeleton rows (`animate-pulse`)
- **Page loading:** Skeleton layout (header + cards)
- **Button loading:** Spinner inside button + disabled
- **Form submit:** `isSubmitting` state → disabled + "Đang lưu..."

---

## 10. Responsive Breakpoints

| Breakpoint | Width | Notes |
|-----------|-------|-------|
| Mobile | < 640px | Sidebar hidden, single column |
| Tablet | 640–1024px | Sidebar overlay, 2-col grid |
| Desktop | > 1024px | Sidebar fixed, 3-4 col grid |

```tsx
// Grid patterns
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"  // KPI cards
className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"  // Class cards
```

---

## 11. Toast Notifications (UI feedback)

Dùng `sonner` (đã tích hợp với shadcn/ui):

```ts
import { toast } from 'sonner'

toast.success('Điểm danh đã được lưu!')
toast.error('Có lỗi xảy ra. Vui lòng thử lại.')
toast.warning('Thẻ học viên sắp hết hạn.')
toast.info('Buổi học đã được tạo.')
```

---

## 12. Icons

Dùng `lucide-react` (đã có trong shadcn/ui):

| Icon | Usage |
|------|-------|
| `Users` | Học viên, người dùng |
| `CalendarDays` | Lịch học, buổi học |
| `CheckCircle` | Có mặt, hoàn thành |
| `XCircle` | Vắng, hủy |
| `Clock` | Đi trễ, thời gian |
| `Ticket` | Thẻ tập, gói học |
| `Building2` | Cơ sở |
| `LayoutDashboard` | Dashboard |
| `Bell` | Thông báo |
| `TrendingUp` | Báo cáo, tiến độ |
| `ChevronRight` | Navigation |
