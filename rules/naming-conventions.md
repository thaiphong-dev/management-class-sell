# Rule: Naming Conventions

## Files & Folders

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| Component file | PascalCase | `AttendanceSheet.tsx` |
| Hook file | camelCase | `useStudentPackage.ts` |
| Utility file | camelCase | `deductSession.ts`, `formatCurrency.ts` |
| Type file | camelCase | `index.ts`, `database.types.ts` |
| Page file | PascalCase + Page | `DashboardPage.tsx` |
| Test file | same + `.test` | `AttendanceSheet.test.tsx` |

## TypeScript

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| Interface | PascalCase | `ClassCardProps`, `AttendanceRecord` |
| Type alias | PascalCase | `UserRole`, `AttendanceStatus` |
| Enum values | UPPER_SNAKE | — (dùng union types, không dùng enum) |
| Constant | UPPER_SNAKE | `MAX_STUDENTS_PER_CLASS = 20` |
| Variable | camelCase | `activeClasses`, `isLoading` |
| Function | camelCase | `handleSaveAttendance()` |

## React

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| Component | PascalCase | `function ClassCard()` |
| Hook | camelCase + `use` | `function useClasses()` |
| Event handler | `handle` + Action | `handleSave`, `handleDeleteClass` |
| Boolean state | `is/has/can` + Noun | `isLoading`, `hasError`, `canEdit` |
| Setter | `set` + Noun | `setClasses`, `setIsOpen` |

## CSS (Tailwind)

```tsx
// Dùng cn() để merge classes
import { cn } from '@/lib/utils'

<div className={cn(
  'base-classes',
  isActive && 'active-classes',
  variant === 'ghost' && 'ghost-classes'
)} />
```

## Database (Supabase)

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| Table | snake_case plural | `student_packages`, `class_students` |
| Column | snake_case | `full_name`, `expires_at`, `created_by` |
| Function | snake_case | `deduct_session_on_attendance()` |
| Index | `idx_table_column` | `idx_student_packages_student_id` |
| Policy | descriptive sentence | `"Students view own packages"` |

## Routes

```
/admin/dashboard          ← kebab-case
/admin/class-detail/:id   ← kebab-case (không PascalCase)
/coach/attendance/:id
/student/my-packages      ← "my-" prefix cho student owned
```

## Supabase Queries

```ts
// Function naming: verb + noun
getClasses()
getClassById(id)
createClass(payload)
updateClass(id, payload)
deleteClass(id)           // soft delete: updateClass(id, { status: 'inactive' })
assignPackageToStudent()
saveAttendance()
markNotificationRead()
```
