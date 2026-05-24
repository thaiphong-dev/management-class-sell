# Skill: TypeScript Advanced

## Database types từ Supabase

```ts
// src/types/index.ts — re-export types dùng trong app
import type { Database } from './database.types'

// Row types (từ DB)
export type Profile         = Database['public']['Tables']['profiles']['Row']
export type Class           = Database['public']['Tables']['classes']['Row']
export type Session         = Database['public']['Tables']['sessions']['Row']
export type Attendance      = Database['public']['Tables']['attendance']['Row']
export type Package         = Database['public']['Tables']['packages']['Row']
export type StudentPackage  = Database['public']['Tables']['student_packages']['Row']
export type Payment         = Database['public']['Tables']['payments']['Row']
export type Notification    = Database['public']['Tables']['notifications']['Row']

// Insert types (cho create)
export type ClassInsert          = Database['public']['Tables']['classes']['Insert']
export type SessionInsert        = Database['public']['Tables']['sessions']['Insert']
export type AttendanceInsert     = Database['public']['Tables']['attendance']['Insert']

// Update types (cho edit)
export type ClassUpdate          = Database['public']['Tables']['classes']['Update']

// App enums
export type UserRole               = 'admin' | 'coach' | 'student'
export type AttendanceStatus       = 'present' | 'absent' | 'late' | 'excused'
export type PackageType            = 'session' | 'monthly'
export type StudentPackageStatus   = 'pending_activation' | 'active' | 'expired' | 'depleted'
export type SessionStatus          = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type PaymentMethod          = 'cash' | 'transfer' | 'card' | 'other'
export type SkillLevel             = 'beginner' | 'intermediate' | 'advanced'

// Nested/joined types
export interface ClassWithCoach extends Class {
  coaches: {
    id: string
    profiles: Pick<Profile, 'full_name' | 'avatar_url'>
  } | null
}

export interface StudentPackageWithDetails extends StudentPackage {
  packages: Package
}

export interface SkillScores {
  technique: number
  footwork:  number
  tactics:   number
  fitness:   number
}
```

## Type Guards

```ts
// Type guard cho UserRole
export function isAdmin(role: string | null): role is 'admin' {
  return role === 'admin'
}

// Type guard cho StudentPackageStatus
export function isActivePackage(pkg: StudentPackage): pkg is StudentPackage & { status: 'active' } {
  return pkg.status === 'active'
}
```

## Utility Types

```ts
// Partial với required fields
type ClassFormData = Partial<ClassInsert> & Required<Pick<ClassInsert, 'name' | 'coach_id'>>

// Omit auto-generated fields
type CreatePayload<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>

// Dùng:
type CreateClassPayload = CreatePayload<ClassInsert>
```

## Generic hooks

```ts
// Generic loading hook
function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    fn()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setIsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, isLoading, error }
}

// Dùng:
const { data: classes, isLoading } = useAsync(() => getClasses(), [])
```

## Discriminated Union cho notifications

```ts
type NotificationType =
  | { type: 'card_expiring_sessions'; metadata: { sessions_remaining: number; student_package_id: string } }
  | { type: 'card_expiring_days';     metadata: { days_remaining: number; expires_at: string } }
  | { type: 'session_cancelled';      metadata: { session_id: string; class_name: string } }
  | { type: 'card_assigned';          metadata: { student_package_id: string; package_name: string } }

// Switch với exhaustive check
function getNotificationIcon(n: NotificationType) {
  switch (n.type) {
    case 'card_expiring_sessions': return <TicketIcon />
    case 'card_expiring_days':     return <CalendarIcon />
    case 'session_cancelled':      return <XCircleIcon />
    case 'card_assigned':          return <CheckCircleIcon />
    default:
      n satisfies never  // compile error nếu có case bị bỏ
  }
}
```
