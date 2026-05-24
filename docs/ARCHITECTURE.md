# ARCHITECTURE.md — ShuttleClass
> Kiến trúc code, patterns, data flow và các quyết định kỹ thuật.

---

## 1. Tech Stack Decision

| Layer | Chọn | Lý do |
|-------|------|-------|
| Bundler | **Vite** | Nhanh, HMR tốt, tree-shaking tốt |
| Framework | **React 18** | Concurrent features, Suspense |
| Language | **TypeScript strict** | Type safety, tránh runtime errors |
| UI | **shadcn/ui** | Copy-paste, fully customizable, không bị lock vendor |
| CSS | **Tailwind CSS** | Utility-first, nhất quán, không CSS drift |
| Backend | **Supabase** | PostgreSQL + Auth + Realtime + Storage, không cần viết API |
| State | **Zustand** | Nhỏ gọn, không boilerplate như Redux |
| Server state | **Supabase hooks** trực tiếp | Đủ dùng, không cần React Query cho app này |
| Forms | **React Hook Form + Zod** | Performance tốt, validation type-safe |
| Charts | **Recharts** | React-native, nhẹ, đủ tính năng |
| Routing | **React Router v6** | Standard, data loading, nested routes |
| PWA | **vite-plugin-pwa** | Workbox built-in, zero config |

---

## 2. Data Flow

```
User Action
    │
    ▼
React Component (UI layer)
    │  calls hook
    ▼
Custom Hook (useXxx.ts)     ← business logic, loading/error state
    │  calls
    ▼
Supabase Client (lib/supabase.ts)
    │  calls
    ▼
Supabase PostgreSQL (RLS enforced)
    │  triggers
    ▼
DB Triggers (deductSession, activatePackage)
    │  inserts
    ▼
notifications table
    │  realtime
    ▼
useNotifications hook → UI update
```

---

## 3. Folder Structure (Chi tiết)

```
src/
├── components/
│   ├── ui/                    ← shadcn/ui (KHÔNG SỬA trực tiếp)
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── AppLayout.tsx      ← Wrapper: Sidebar + Header + <Outlet/>
│   │   ├── Sidebar.tsx        ← Nav items dựa theo role
│   │   ├── Header.tsx         ← Breadcrumb + NotificationBell + Avatar
│   │   └── NotificationBell.tsx
│   ├── common/                ← Shared components (dùng ở nhiều pages)
│   │   ├── StatusBadge.tsx    ← Badge màu theo status
│   │   ├── Avatar.tsx         ← User avatar với fallback initials
│   │   ├── EmptyState.tsx     ← Empty state với icon + message
│   │   ├── LoadingSkeleton.tsx
│   │   ├── ConfirmDialog.tsx  ← Delete confirmation modal
│   │   └── PageHeader.tsx     ← Page title + subtitle + action button
│   ├── attendance/
│   │   ├── AttendanceSheet.tsx  ← Main điểm danh component
│   │   ├── AttendanceRow.tsx    ← 1 học viên + 3 toggle buttons
│   │   └── AttendanceStats.tsx  ← Summary (có mặt/vắng/trễ)
│   ├── packages/
│   │   ├── PackageCard.tsx      ← Gradient membership card
│   │   ├── PackageProgress.tsx  ← Progress bar buổi/ngày còn lại
│   │   ├── CardExpiryAlert.tsx  ← Banner cảnh báo
│   │   └── PackageGrid.tsx      ← Grid các gói để chọn mua
│   ├── classes/
│   │   ├── ClassCard.tsx
│   │   ├── ClassForm.tsx        ← Create/Edit form
│   │   └── ClassStudentTable.tsx
│   ├── sessions/
│   │   ├── SessionForm.tsx
│   │   └── SessionTable.tsx
│   ├── progress/
│   │   ├── SkillBar.tsx
│   │   ├── SkillRadarChart.tsx  ← Recharts RadarChart
│   │   └── EvaluationForm.tsx
│   └── charts/
│       ├── RevenueBarChart.tsx
│       └── AttendanceRateChart.tsx
│
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx     (optional — admin invite flow)
│   ├── admin/
│   │   ├── DashboardPage.tsx
│   │   ├── UsersPage.tsx
│   │   ├── FacilitiesPage.tsx
│   │   ├── ClassesPage.tsx
│   │   ├── ClassDetailPage.tsx  ← /admin/classes/:id
│   │   ├── PackagesPage.tsx
│   │   └── ReportsPage.tsx
│   ├── coach/
│   │   ├── DashboardPage.tsx
│   │   ├── ClassesPage.tsx
│   │   ├── SessionsPage.tsx     ← /coach/classes/:id/sessions
│   │   ├── AttendancePage.tsx   ← /coach/classes/:id/sessions/:sessionId/attendance
│   │   └── ProgressPage.tsx
│   └── student/
│       ├── DashboardPage.tsx
│       ├── SchedulePage.tsx
│       ├── AttendancePage.tsx
│       ├── ProgressPage.tsx
│       └── PackagesPage.tsx
│
├── hooks/
│   ├── useAuth.ts               ← session, profile, role, signIn/Out
│   ├── useProfile.ts            ← fetch/update profile
│   ├── useClasses.ts            ← getClasses, createClass, updateClass
│   ├── useStudents.ts
│   ├── useCoaches.ts
│   ├── useFacilities.ts
│   ├── useSessions.ts           ← getSessionsByClass, createSession, cancel
│   ├── useAttendance.ts         ← getAttendance, saveAttendance
│   ├── useStudentPackage.ts     ← active package, package history
│   ├── usePackages.ts           ← package templates CRUD
│   ├── useNotifications.ts      ← realtime, mark-read
│   ├── useEvaluations.ts
│   └── useReports.ts            ← dashboard KPIs, revenue data
│
├── lib/
│   ├── supabase.ts              ← Supabase client singleton
│   ├── deductSession.ts         ← Client-side deduction logic (nếu không dùng trigger)
│   └── utils.ts                 ← cn(), formatCurrency(), formatDate(), formatRelativeTime()
│
├── types/
│   ├── index.ts                 ← All app types + enums
│   └── database.types.ts        ← Generated từ Supabase CLI
│
├── contexts/
│   └── AuthContext.tsx           ← AuthProvider + useAuthContext()
│
├── stores/
│   └── useAppStore.ts            ← Zustand: sidebarOpen, activeModal
│
└── router.tsx                    ← Route definitions + guards
```

---

## 4. Routing & Guards

```tsx
// src/router.tsx
const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/',
    element: <RequireAuth />,       // redirect nếu chưa login
    children: [
      { index: true, element: <RoleRedirect /> },  // redirect theo role

      // Admin routes
      {
        path: 'admin',
        element: <RequireRole role="admin"><AppLayout /></RequireRole>,
        children: [
          { path: 'dashboard', element: <AdminDashboard /> },
          { path: 'users', element: <UsersPage /> },
          { path: 'facilities', element: <FacilitiesPage /> },
          { path: 'classes', element: <ClassesPage /> },
          { path: 'classes/:id', element: <ClassDetailPage /> },
          { path: 'packages', element: <PackagesPage /> },
          { path: 'reports', element: <ReportsPage /> },
        ]
      },

      // Coach routes
      {
        path: 'coach',
        element: <RequireRole role="coach"><AppLayout /></RequireRole>,
        children: [
          { path: 'dashboard', element: <CoachDashboard /> },
          { path: 'classes', element: <CoachClassesPage /> },
          { path: 'classes/:id/sessions', element: <SessionsPage /> },
          { path: 'classes/:id/sessions/:sessionId/attendance', element: <AttendancePage /> },
          { path: 'students/:studentId/progress', element: <ProgressPage /> },
        ]
      },

      // Student routes
      {
        path: 'student',
        element: <RequireRole role="student"><AppLayout /></RequireRole>,
        children: [
          { path: 'dashboard', element: <StudentDashboard /> },
          { path: 'schedule', element: <SchedulePage /> },
          { path: 'attendance', element: <StudentAttendancePage /> },
          { path: 'progress', element: <StudentProgressPage /> },
          { path: 'packages', element: <StudentPackagesPage /> },
        ]
      }
    ]
  }
])

// RequireAuth: check session
// RequireRole: check role match, redirect nếu sai role
// RoleRedirect: admin→/admin/dashboard, coach→/coach/dashboard, student→/student/dashboard
```

---

## 5. Auth Context

```tsx
// src/contexts/AuthContext.tsx
interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  role: UserRole | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

// Usage trong component:
const { profile, role } = useAuthContext()
```

---

## 6. Hook Pattern (Chuẩn)

```ts
// src/hooks/useClasses.ts
export function useClasses() {
  const [classes, setClasses] = useState<Class[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClasses = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getClasses()  // from lib/api/classes.ts
      setClasses(data)
    } catch (err) {
      setError('Không thể tải danh sách lớp học.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchClasses() }, [])

  const createClass = async (payload: ClassInsert) => {
    const newClass = await createClassApi(payload)
    setClasses(prev => [newClass, ...prev])
    return newClass
  }

  return { classes, isLoading, error, refetch: fetchClasses, createClass }
}
```

---

## 7. Zustand Store

```ts
// src/stores/useAppStore.ts
interface AppStore {
  sidebarOpen: boolean
  toggleSidebar: () => void

  activeModal: string | null
  openModal: (name: string) => void
  closeModal: () => void
}

export const useAppStore = create<AppStore>()(set => ({
  sidebarOpen: true,
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),

  activeModal: null,
  openModal: (name) => set({ activeModal: name }),
  closeModal: () => set({ activeModal: null }),
}))
```

---

## 8. Type Generation từ Supabase

```bash
# Chạy sau khi thay đổi schema
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts
```

---

## 9. Environment Variables

```env
# .env.local (không commit)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# .env.example (commit)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## 10. Build & Scripts

```json
// package.json scripts
{
  "dev": "vite",
  "build": "tsc && vite build",
  "typecheck": "tsc --noEmit",
  "preview": "vite preview",
  "lint": "eslint src --ext ts,tsx --report-unused-disable-directives"
}
```

**Build phải pass:** `npm run build` + `npm run typecheck` trước mỗi handoff.

---

## 11. Performance Guidelines

- **Code splitting:** Dùng `React.lazy()` cho mỗi page (không bundle tất cả)
- **Images:** Dùng `loading="lazy"` + width/height
- **Charts:** Chỉ load khi visible (IntersectionObserver hoặc lazy)
- **Supabase queries:** Chỉ select columns cần thiết (không `select('*')` toàn bảng)
- **Re-renders:** Dùng `useMemo`/`useCallback` chỉ khi có evidence về performance issue
