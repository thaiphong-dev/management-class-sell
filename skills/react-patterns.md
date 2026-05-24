# Skill: React Patterns

## Custom Hook pattern

```ts
// Chuẩn cho data fetching
export function useClasses() {
  const [classes, setClasses] = useState<Class[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getClasses()
      setClasses(data)
    } catch {
      setError('Không thể tải dữ liệu.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { classes, isLoading, error, refetch: load }
}
```

## Protected Route

```tsx
// src/components/auth/RequireAuth.tsx
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuthContext()
  const location = useLocation()

  if (isLoading) return <FullPageSpinner />
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />

  return <>{children}</>
}

// RequireRole
export function RequireRole({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const { profile } = useAuthContext()
  if (profile?.role !== role) return <Navigate to="/" replace />
  return <>{children}</>
}
```

## Form với React Hook Form + Zod

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const classSchema = z.object({
  name: z.string().min(1, 'Tên lớp không được để trống'),
  max_students: z.number().min(1).max(30),
  skill_level: z.enum(['beginner', 'intermediate', 'advanced', 'kids', 'all']),
})
type ClassFormData = z.infer<typeof classSchema>

export function ClassForm({ onSubmit }: { onSubmit: (data: ClassFormData) => Promise<void> }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ClassFormData>({
    resolver: zodResolver(classSchema)
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register('name')} />
      {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Đang lưu...' : 'Lưu'}
      </Button>
    </form>
  )
}
```

## Optimistic UI

```ts
// Cập nhật UI ngay, rollback nếu lỗi
const handleToggleStatus = async (classId: string) => {
  const prev = classes
  setClasses(c => c.map(item =>
    item.id === classId
      ? { ...item, status: item.status === 'active' ? 'inactive' : 'active' }
      : item
  ))
  try {
    await updateClass(classId, { status: 'inactive' })
  } catch {
    setClasses(prev)  // rollback
    toast.error('Có lỗi xảy ra.')
  }
}
```

## Code splitting

```tsx
// Lazy load pages (giảm initial bundle)
const AdminDashboard = lazy(() => import('@/pages/admin/DashboardPage'))
const CoachAttendance = lazy(() => import('@/pages/coach/AttendancePage'))

// Wrap với Suspense
<Suspense fallback={<PageSkeleton />}>
  <Routes>
    <Route path="dashboard" element={<AdminDashboard />} />
  </Routes>
</Suspense>
```

## Controlled vs Uncontrolled

```tsx
// Controlled — cho form phức tạp cần validation
const [value, setValue] = useState('')
<Input value={value} onChange={e => setValue(e.target.value)} />

// Uncontrolled — với React Hook Form
const { register } = useForm()
<Input {...register('name')} />
// RHF quản lý ref nội bộ, không re-render mỗi keystroke
```
