# API.md — ShuttleClass
> Tất cả Supabase queries, mutations, real-time subscriptions dùng trong dự án.
> File này là nguồn tham chiếu duy nhất — không viết query SQL trực tiếp trong component.

---

## 1. Supabase Client Setup

```ts
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

---

## 2. Auth API

### 2.1 Đăng nhập
```ts
// src/hooks/useAuth.ts
const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}
```

### 2.2 Đăng ký (Admin tạo tài khoản)
```ts
const signUp = async (email: string, password: string, role: UserRole, fullName: string) => {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name: fullName, role }
  })
  if (error) throw error
  return data
}
```

### 2.3 Đăng xuất
```ts
const signOut = () => supabase.auth.signOut()
```

### 2.4 Lấy session hiện tại
```ts
const getSession = () => supabase.auth.getSession()
const onAuthChange = (callback: (session: Session | null) => void) =>
  supabase.auth.onAuthStateChange((_event, session) => callback(session))
```

---

## 3. Profiles

### 3.1 Lấy profile theo user_id
```ts
const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}
```

### 3.2 Cập nhật profile
```ts
const updateProfile = async (userId: string, updates: Partial<Profile>) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}
```

### 3.3 Lấy danh sách users (Admin)
```ts
const getUsers = async (role?: UserRole) => {
  let query = supabase.from('profiles').select(`
    *,
    coaches (*),
    students (*)
  `)
  if (role) query = query.eq('role', role)
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data
}
```

---

## 4. Facilities & Courts

### 4.1 Lấy danh sách cơ sở với sân
```ts
const getFacilities = async () => {
  const { data, error } = await supabase
    .from('facilities')
    .select(`*, courts(*)`)
    .eq('status', 'active')
    .order('name')
  if (error) throw error
  return data
}
```

### 4.2 CRUD Facility
```ts
const createFacility = async (payload: FacilityInsert) => {
  const { data, error } = await supabase.from('facilities').insert(payload).select().single()
  if (error) throw error
  return data
}

const updateFacility = async (id: string, payload: FacilityUpdate) => {
  const { data, error } = await supabase.from('facilities').update(payload).eq('id', id).select().single()
  if (error) throw error
  return data
}
```

---

## 5. Classes

### 5.1 Lấy danh sách lớp (Admin — tất cả)
```ts
const getClasses = async () => {
  const { data, error } = await supabase
    .from('classes')
    .select(`
      *,
      coaches (id, user_id, profiles (full_name, avatar_url)),
      facilities (id, name),
      courts (id, name),
      class_students (count)
    `)
    .order('name')
  if (error) throw error
  return data
}
```

### 5.2 Lấy lớp của HLV
```ts
const getCoachClasses = async (coachId: string) => {
  const { data, error } = await supabase
    .from('classes')
    .select(`*, class_students(student_id, students(user_id, profiles(full_name)))`)
    .eq('coach_id', coachId)
    .eq('status', 'active')
  if (error) throw error
  return data
}
```

### 5.3 Lấy lớp của học viên
```ts
const getStudentClasses = async (studentId: string) => {
  const { data, error } = await supabase
    .from('class_students')
    .select(`classes(*, coaches(user_id, profiles(full_name)))`)
    .eq('student_id', studentId)
    .eq('status', 'active')
  if (error) throw error
  return data?.map(r => r.classes)
}
```

### 5.4 Thêm học viên vào lớp
```ts
const addStudentToClass = async (classId: string, studentId: string) => {
  const { data, error } = await supabase
    .from('class_students')
    .insert({ class_id: classId, student_id: studentId })
    .select()
    .single()
  if (error) throw error
  return data
}
```

---

## 6. Sessions (Buổi học)

### 6.1 Lấy sessions của lớp
```ts
const getClassSessions = async (classId: string) => {
  const { data, error } = await supabase
    .from('sessions')
    .select(`*, courts(name)`)
    .eq('class_id', classId)
    .order('scheduled_at', { ascending: false })
  if (error) throw error
  return data
}
```

### 6.2 Lấy sessions hôm nay (Admin dashboard)
```ts
const getTodaySessions = async () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data, error } = await supabase
    .from('sessions')
    .select(`
      *,
      classes(name, coaches(profiles(full_name))),
      courts(name)
    `)
    .gte('scheduled_at', today.toISOString())
    .lt('scheduled_at', tomorrow.toISOString())
    .order('scheduled_at')
  if (error) throw error
  return data
}
```

### 6.3 Tạo buổi học
```ts
const createSession = async (payload: SessionInsert) => {
  const { data, error } = await supabase.from('sessions').insert(payload).select().single()
  if (error) throw error
  return data
}
```

### 6.4 Hủy buổi học
```ts
const cancelSession = async (sessionId: string, reason: string) => {
  const { data, error } = await supabase
    .from('sessions')
    .update({ status: 'cancelled', cancel_reason: reason })
    .eq('id', sessionId)
    .select()
    .single()
  if (error) throw error
  // TODO: Gửi notification cho học viên trong lớp
  return data
}
```

---

## 7. Attendance (Điểm danh)

### 7.1 Lấy danh sách điểm danh của buổi học
```ts
const getSessionAttendance = async (sessionId: string) => {
  const { data, error } = await supabase
    .from('attendance')
    .select(`
      *,
      students(id, user_id, profiles(full_name, avatar_url)),
      student_packages!inner(
        sessions_remaining, expires_at, status,
        packages(package_type, name)
      )
    `)
    .eq('session_id', sessionId)
  if (error) throw error
  return data
}
```

### 7.2 Lấy học viên trong lớp kèm thẻ hiện tại (để điểm danh)
```ts
const getClassStudentsWithPackage = async (classId: string) => {
  const { data, error } = await supabase
    .from('class_students')
    .select(`
      student_id,
      students(
        id,
        profiles(full_name, avatar_url),
        student_packages(
          id, sessions_remaining, expires_at, status,
          packages(name, package_type)
        )
      )
    `)
    .eq('class_id', classId)
    .eq('status', 'active')
  if (error) throw error
  return data
}
```

### 7.3 Lưu điểm danh (bulk upsert)
```ts
const saveAttendance = async (
  sessionId: string,
  records: Array<{ student_id: string; status: AttendanceStatus; notes?: string }>,
  checkedBy: string
) => {
  const payload = records.map(r => ({
    session_id: sessionId,
    student_id: r.student_id,
    status: r.status,
    notes: r.notes,
    checked_by: checkedBy,
    checked_at: new Date().toISOString()
  }))

  const { data, error } = await supabase
    .from('attendance')
    .upsert(payload, { onConflict: 'session_id,student_id' })
    .select()
  if (error) throw error

  // Cập nhật session status → completed
  await supabase.from('sessions').update({ status: 'completed' }).eq('id', sessionId)

  return data
  // NOTE: trigger deduct_session_on_attendance tự động chạy sau insert
}
```

### 7.4 Lịch sử điểm danh của học viên
```ts
const getStudentAttendanceHistory = async (studentId: string, limit = 20) => {
  const { data, error } = await supabase
    .from('attendance')
    .select(`
      *,
      sessions(scheduled_at, classes(name, coaches(profiles(full_name))))
    `)
    .eq('student_id', studentId)
    .order('checked_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}
```

---

## 8. Packages & Student Packages

### 8.1 Lấy tất cả gói học (template)
```ts
const getPackages = async () => {
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .eq('status', 'active')
    .order('sort_order')
  if (error) throw error
  return data
}
```

### 8.2 Cấp thẻ cho học viên (Admin)
```ts
const assignPackageToStudent = async (
  studentId: string,
  packageId: string,
  adminId: string,
  paymentMethod: PaymentMethod
) => {
  const pkg = await getPackageById(packageId)

  // Tạo student_package
  const { data: sp, error: spError } = await supabase
    .from('student_packages')
    .insert({
      student_id: studentId,
      package_id: packageId,
      sessions_total: pkg.sessions_count,
      sessions_remaining: pkg.sessions_count,
      status: 'pending_activation',
      created_by: adminId
    })
    .select()
    .single()
  if (spError) throw spError

  // Ghi nhận thanh toán
  const { error: payError } = await supabase
    .from('payments')
    .insert({
      student_id: studentId,
      student_package_id: sp.id,
      amount: pkg.price,
      payment_method: paymentMethod,
      received_by: adminId
    })
  if (payError) throw payError

  // Gửi notification cho học viên
  await supabase.from('notifications').insert({
    user_id: (await getStudentUserId(studentId)),
    title: 'Thẻ tập mới đã được cấp',
    body: `Bạn đã được cấp "${pkg.name}". Thẻ sẽ kích hoạt từ buổi học đầu tiên.`,
    type: 'card_assigned',
    metadata: { student_package_id: sp.id }
  })

  return sp
}
```

### 8.3 Kích hoạt thẻ thủ công (Admin)
```ts
const activatePackageManually = async (studentPackageId: string) => {
  const sp = await getStudentPackageById(studentPackageId)
  const pkg = await getPackageById(sp.package_id)

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + pkg.validity_days)

  const { data, error } = await supabase
    .from('student_packages')
    .update({
      activated_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      status: 'active'
    })
    .eq('id', studentPackageId)
    .select()
    .single()
  if (error) throw error
  return data
}
```

### 8.4 Lấy thẻ active của học viên
```ts
const getActiveStudentPackage = async (studentId: string) => {
  const { data, error } = await supabase
    .from('student_packages')
    .select(`*, packages(*)`)
    .eq('student_id', studentId)
    .eq('status', 'active')
    .order('activated_at', { ascending: false })
    .limit(1)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}
```

### 8.5 Lấy tất cả thẻ của học viên (lịch sử)
```ts
const getStudentPackageHistory = async (studentId: string) => {
  const { data, error } = await supabase
    .from('student_packages')
    .select(`*, packages(*), payments(*)`)
    .eq('student_id', studentId)
    .order('purchased_at', { ascending: false })
  if (error) throw error
  return data
}
```

---

## 9. Progress Evaluations

### 9.1 Tạo đánh giá
```ts
const createEvaluation = async (payload: EvaluationInsert) => {
  const { data, error } = await supabase
    .from('progress_evaluations')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}
```

### 9.2 Lấy lịch sử đánh giá của học viên
```ts
const getStudentEvaluations = async (studentId: string) => {
  const { data, error } = await supabase
    .from('progress_evaluations')
    .select(`
      *,
      coaches(profiles(full_name)),
      sessions(scheduled_at)
    `)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
```

---

## 10. Notifications

### 10.1 Lấy thông báo chưa đọc
```ts
const getUnreadNotifications = async (userId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .is('read_at', null)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data
}
```

### 10.2 Đánh dấu đã đọc
```ts
const markNotificationRead = async (notificationId: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
  if (error) throw error
}

const markAllRead = async (userId: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)
  if (error) throw error
}
```

### 10.3 Realtime subscription
```ts
// src/hooks/useNotifications.ts
const subscribeToNotifications = (userId: string, onNew: (n: Notification) => void) => {
  return supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      payload => onNew(payload.new as Notification)
    )
    .subscribe()
}
```

---

## 11. Reports (Admin)

### 11.1 Doanh thu theo tháng
```ts
const getMonthlyRevenue = async (year: number) => {
  const { data, error } = await supabase
    .from('payments')
    .select('amount, paid_at')
    .eq('status', 'paid')
    .gte('paid_at', `${year}-01-01`)
    .lt('paid_at', `${year + 1}-01-01`)
  if (error) throw error

  // Group by month trong frontend
  const byMonth = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    revenue: data
      .filter(p => new Date(p.paid_at!).getMonth() === i)
      .reduce((sum, p) => sum + Number(p.amount), 0)
  }))
  return byMonth
}
```

### 11.2 KPI Dashboard
```ts
const getDashboardKPIs = async () => {
  const [students, classes, revenue, todaySessions] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact' }).eq('status', 'active'),
    supabase.from('classes').select('id', { count: 'exact' }).eq('status', 'active'),
    supabase.from('payments').select('amount').eq('status', 'paid')
      .gte('paid_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    getTodaySessions()
  ])

  return {
    totalStudents: students.count ?? 0,
    activeClasses: classes.count ?? 0,
    monthRevenue: revenue.data?.reduce((s, p) => s + Number(p.amount), 0) ?? 0,
    todaySessionCount: todaySessions?.length ?? 0
  }
}
```

---

## 12. Error Handling Pattern

```ts
// Wrapper chuẩn cho mọi API call
async function apiCall<T>(fn: () => Promise<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await fn()
  if (error) {
    console.error('[API Error]', error)
    throw error
  }
  return data as T
}
```

---

## 13. Type Definitions (tham khảo)

```ts
// src/types/index.ts — các type quan trọng
export type UserRole = 'admin' | 'coach' | 'student'
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'
export type PackageType = 'session' | 'monthly'
export type StudentPackageStatus = 'pending_activation' | 'active' | 'expired' | 'depleted'
export type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'other'
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'

export interface SkillScores {
  technique: number   // Kỹ thuật đánh (0-100)
  footwork: number    // Di chuyển sân (0-100)
  tactics: number     // Chiến thuật (0-100)
  fitness: number     // Thể lực (0-100)
}
```
