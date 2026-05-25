import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { RequireRole, PublicRoute, RootRedirect } from '@/components/auth/RequireAuth'
import { AppLayout } from '@/components/layout/AppLayout'
import { Toaster } from '@/components/ui/toaster'
import LoginPage from '@/pages/auth/LoginPage'
// Admin pages
import AdminDashboardPage  from '@/pages/admin/DashboardPage'
import AdminFacilitiesPage from '@/pages/admin/FacilitiesPage'
import AdminUsersPage      from '@/pages/admin/UsersPage'
import AdminClassesPage    from '@/pages/admin/ClassesPage'
import AdminPackagesPage   from '@/pages/admin/PackagesPage'
import AdminReportsPage    from '@/pages/admin/ReportsPage'
// Coach pages
import CoachDashboardPage       from '@/pages/coach/DashboardPage'
import CoachClassesPage         from '@/pages/coach/ClassesPage'
import CoachSessionsPage        from '@/pages/coach/SessionsPage'
import CoachAttendancePage      from '@/pages/coach/AttendancePage'
import CoachAttendanceSheetPage from '@/pages/coach/AttendanceSheetPage'
import CoachProgressPage        from '@/pages/coach/ProgressPage'
// Student pages
import StudentDashboardPage  from '@/pages/student/DashboardPage'
import StudentSchedulePage   from '@/pages/student/SchedulePage'
import StudentAttendancePage from '@/pages/student/AttendancePage'
import StudentProgressPage   from '@/pages/student/ProgressPage'
import StudentPackagesPage   from '@/pages/student/PackagesPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          {/* Admin */}
          <Route element={<RequireRole role="admin" />}>
            <Route path="/admin" element={<AppLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"  element={<AdminDashboardPage />} />
              <Route path="users"      element={<AdminUsersPage />} />
              <Route path="facilities" element={<AdminFacilitiesPage />} />
              <Route path="classes"    element={<AdminClassesPage />} />
              <Route path="packages"   element={<AdminPackagesPage />} />
              <Route path="reports"    element={<AdminReportsPage />} />
            </Route>
          </Route>

          {/* Coach */}
          <Route element={<RequireRole role="coach" />}>
            <Route path="/coach" element={<AppLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"                                          element={<CoachDashboardPage />} />
              <Route path="classes"                                            element={<CoachClassesPage />} />
              <Route path="classes/:classId/sessions"                          element={<CoachSessionsPage />} />
              <Route path="classes/:classId/sessions/:sessionId/attendance"    element={<CoachAttendanceSheetPage />} />
              <Route path="attendance"                                         element={<CoachAttendancePage />} />
              <Route path="progress"                                           element={<CoachProgressPage />} />
            </Route>
          </Route>

          {/* Student */}
          <Route element={<RequireRole role="student" />}>
            <Route path="/student" element={<AppLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"  element={<StudentDashboardPage />} />
              <Route path="schedule"   element={<StudentSchedulePage />} />
              <Route path="attendance" element={<StudentAttendancePage />} />
              <Route path="progress"   element={<StudentProgressPage />} />
              <Route path="packages"   element={<StudentPackagesPage />} />
            </Route>
          </Route>

          {/* Root redirect */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  )
}
