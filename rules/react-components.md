# Rule: React Components

## 1. KHÔNG tạo component mới nếu đã có

**Trước khi tạo component mới, kiểm tra:**
1. `src/components/ui/` — shadcn/ui components
2. `src/components/common/` — shared app components
3. `lucide-react` — icons

```ts
// ❌ SAI — tạo custom button thay vì dùng shadcn
function MyButton({ children, onClick }) {
  return <button onClick={onClick} className="...">{children}</button>
}

// ✅ ĐÚNG — dùng shadcn Button
import { Button } from '@/components/ui/button'
<Button variant="outline" onClick={onClick}>{children}</Button>
```

**Common components đã có (src/components/common/):**
- `StatusBadge` — badge màu theo status
- `Avatar` — avatar với fallback initials
- `EmptyState` — empty state UI
- `LoadingSkeleton` — skeleton loading
- `ConfirmDialog` — delete confirmation
- `PageHeader` — page title + action

## 2. File size tối đa 300 dòng

```
Nếu component > 300 dòng → tách sub-components:
  AttendancePage.tsx (< 100 dòng, orchestration only)
    ├── AttendanceStats.tsx
    ├── AttendanceSheet.tsx (danh sách học viên)
    └── AttendanceRow.tsx (1 học viên)
```

## 3. Component structure chuẩn

```tsx
// 1. Imports
import { useState } from 'react'
import { Button } from '@/components/ui/button'

// 2. Types
interface Props {
  classId: string
  onSave?: () => void
}

// 3. Component (1 export mặc định per file)
export function AttendanceSheet({ classId, onSave }: Props) {
  // 4. Hooks (luôn ở đầu)
  const { students, isLoading } = useClassStudents(classId)
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({})

  // 5. Derived values
  const presentCount = Object.values(statuses).filter(s => s === 'present').length

  // 6. Handlers
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setStatuses(prev => ({ ...prev, [studentId]: status }))
  }

  // 7. Render
  if (isLoading) return <LoadingSkeleton />

  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

## 4. Custom hooks tách logic

```tsx
// ❌ SAI — logic trong component
function ClassesPage() {
  const [classes, setClasses] = useState([])
  useEffect(() => {
    supabase.from('classes').select().then(...)
  }, [])
  // ...
}

// ✅ ĐÚNG — logic trong hook
function ClassesPage() {
  const { classes, isLoading, createClass } = useClasses()
  // component chỉ có UI logic
}
```

## 5. Không prop drill quá 2 cấp

```tsx
// ❌ SAI
<Page>
  <Section user={user}>
    <Card user={user}>
      <Avatar user={user} />
    </Card>
  </Section>
</Page>

// ✅ ĐÚNG — dùng useAuthContext()
function Avatar() {
  const { profile } = useAuthContext()
  return <img src={profile.avatar_url} />
}
```

## 6. Keys trong list phải là ID

```tsx
// ❌ SAI
{classes.map((c, i) => <ClassCard key={i} data={c} />)}

// ✅ ĐÚNG
{classes.map(c => <ClassCard key={c.id} data={c} />)}
```

## 7. Event handlers naming

```tsx
// ❌ SAI
<Button onClick={submit} />
<Button onClick={handleClickButton} />

// ✅ ĐÚNG — handle + Action
<Button onClick={handleSave} />
<Button onClick={handleDeleteClass} />
```

## 8. Conditional rendering

```tsx
// ❌ SAI
{isLoading ? <Spinner /> : null}
{error && <div>{error}</div>}

// ✅ ĐÚNG
{isLoading && <LoadingSkeleton />}
{error ? <ErrorState message={error} /> : <ClassList classes={classes} />}
```
