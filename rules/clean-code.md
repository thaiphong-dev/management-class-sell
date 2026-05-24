# Rule: Clean Code

## 1. Tên phải tự nói lên ý nghĩa

```ts
// ❌ SAI
const d = new Date()
const arr = data.filter(x => x.s === 'active')
function calc(a, b) {}

// ✅ ĐÚNG
const today = new Date()
const activeClasses = classes.filter(c => c.status === 'active')
function calculateMonthlyRevenue(payments: Payment[]): number {}
```

## 2. Hàm làm 1 việc duy nhất

```ts
// ❌ SAI — hàm làm nhiều thứ
async function handleAttendanceSave(sessionId, records) {
  // validate
  // save to DB
  // deduct sessions
  // send notifications
  // update session status
}

// ✅ ĐÚNG — tách nhỏ
async function saveAttendance(sessionId, records) { /* chỉ save */ }
async function notifyExpiringCards(studentIds) { /* chỉ notify */ }
// trigger DB handles deduction
```

## 3. Không có magic numbers/strings

```ts
// ❌ SAI
if (sessionsRemaining <= 3) { ... }
if (daysLeft <= 7) { ... }

// ✅ ĐÚNG
const CARD_EXPIRY_WARNING_SESSIONS = 3
const CARD_EXPIRY_WARNING_DAYS = 7
if (sessionsRemaining <= CARD_EXPIRY_WARNING_SESSIONS) { ... }
```

## 4. Early return (guard clauses)

```ts
// ❌ SAI
function processAttendance(session: Session | null) {
  if (session) {
    if (session.status !== 'cancelled') {
      // main logic
    }
  }
}

// ✅ ĐÚNG
function processAttendance(session: Session | null) {
  if (!session) return
  if (session.status === 'cancelled') return
  // main logic
}
```

## 5. Không dùng comment giải thích WHAT — chỉ WHY

```ts
// ❌ SAI — comment thừa
// Check if session is completed
if (session.status === 'completed') { ... }

// ✅ ĐÚNG — comment giải thích lý do nghiệp vụ
// Chỉ trừ buổi khi thẻ đang active và chưa hết hạn
// Monthly package không bị trừ buổi, chỉ theo ngày
if (pkg.package_type === 'session' && pkg.sessions_remaining > 0) { ... }
```

## 6. Không có dead code

```ts
// ❌ SAI
// function oldGetClasses() { ... }  ← xóa đi, có git history
const unusedVariable = 'test'
import { unusedComponent } from './Component'
```

## 7. Error handling nhất quán

```ts
// ❌ SAI — bỏ qua lỗi
const { data } = await supabase.from('classes').select()
setClasses(data || [])

// ✅ ĐÚNG — handle lỗi rõ ràng
const { data, error } = await supabase.from('classes').select()
if (error) {
  toast.error('Không thể tải danh sách lớp học.')
  console.error('[useClasses]', error)
  return
}
setClasses(data)
```

## 8. Async/await nhất quán (không mix .then())

```ts
// ❌ SAI
supabase.from('classes').select().then(({ data }) => setClasses(data))

// ✅ ĐÚNG
const { data } = await supabase.from('classes').select()
setClasses(data ?? [])
```

## 9. Imports có thứ tự

```ts
// 1. React core
import { useState, useEffect } from 'react'

// 2. External libraries
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

// 3. Internal — components
import { Button } from '@/components/ui/button'
import { ClassCard } from '@/components/classes/ClassCard'

// 4. Internal — hooks/utils/types
import { useClasses } from '@/hooks/useClasses'
import type { Class } from '@/types'
```

## 10. Không có `console.log` trong code production

```ts
// ❌ SAI
console.log('data:', data)
console.log('class created')

// ✅ ĐÚNG — chỉ error
console.error('[useClasses] Failed to fetch:', error)

// Debug tạm thời → xóa trước khi tạo handoff
```
