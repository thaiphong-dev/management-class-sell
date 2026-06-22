import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuthContext } from '@/contexts/AuthContext'
import { RequireRole, PublicRoute } from '@/components/auth/RequireAuth'
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
import AdminRegistrationsPage from '@/pages/admin/RegistrationsPage'
import AdminStaffRegistrationsPage from '@/pages/admin/StaffRegistrationsPage'
// Coach pages
import CoachDashboardPage       from '@/pages/coach/DashboardPage'
import CoachClassesPage         from '@/pages/coach/ClassesPage'
import CoachSessionsPage        from '@/pages/coach/SessionsPage'
import CoachAttendancePage      from '@/pages/coach/AttendancePage'
import CoachAttendanceSheetPage from '@/pages/coach/AttendanceSheetPage'
import CoachProgressPage        from '@/pages/coach/ProgressPage'
import CoachScanAttendancePage  from '@/pages/coach/ScanAttendancePage'
import CoachLessonPlanLibraryPage from '@/pages/coach/LessonPlanLibraryPage'
import CoachLessonPlanFormPage    from '@/pages/coach/LessonPlanFormPage'
import CoachAssistantsPage        from '@/pages/coach/AssistantsManagementPage'
import CoachStudentsPage          from '@/pages/coach/StudentsPage'
// Student pages
import StudentDashboardPage  from '@/pages/student/DashboardPage'
import StudentSchedulePage   from '@/pages/student/SchedulePage'
import StudentAttendancePage from '@/pages/student/AttendancePage'
import StudentProgressPage   from '@/pages/student/ProgressPage'
import StudentPackagesPage   from '@/pages/student/PackagesPage'
// Parent pages
import ParentDashboardPage from '@/pages/parent/ParentDashboardPage'
import ParentFamilyPage    from '@/pages/parent/ParentFamilyPage'
import ParentPackagesPage  from '@/pages/parent/ParentPackagesPage'
import ParentProgressPage  from '@/pages/parent/ParentProgressPage'
import ParentSchedulePage  from '@/pages/parent/ParentSchedulePage'
import ParentAttendancePage from '@/pages/parent/ParentAttendancePage'
import RegisterPage        from '@/pages/auth/RegisterPage'
// Public & Settings pages
import LandingPage from '@/pages/public/LandingPage'
import AdminSettingsPage from '@/pages/admin/SettingsPage'
import RegisterCoursePage from '@/pages/public/RegisterCoursePage'
import RegisterCoachPage from '@/pages/public/RegisterCoachPage'
import RegisterAssistantPage from '@/pages/public/RegisterAssistantPage'
import SharedLessonPage from '@/pages/public/SharedLessonPage'
import NotFoundPage from '@/pages/public/NotFoundPage'

function DefaultRoute() {
  const { session, profile, isLoading } = useAuthContext()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Đang tải...</p>
        </div>
      </div>
    )
  }

  if (session && profile) {
    const ROLE_DASHBOARDS: Record<string, string> = {
      admin:   '/admin/dashboard',
      coach:   '/coach/dashboard',
      student: '/student/dashboard',
      parent:  '/parent/dashboard',
    }
    return <Navigate to={ROLE_DASHBOARDS[profile.role] || '/'} replace />
  }

  return <LandingPage />
}

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
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register-course"
            element={
              <RegisterCoursePage />
            }
          />
          <Route
            path="/register-coach"
            element={
              <RegisterCoachPage />
            }
          />
          <Route
            path="/register-assistant"
            element={
              <RegisterAssistantPage />
            }
          />
          <Route
            path="/shared/lessons/:id"
            element={
              <SharedLessonPage />
            }
          />

          {/* Admin */}
          <Route element={<RequireRole role="admin" />}>
            <Route path="/admin" element={<AppLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"  element={<AdminDashboardPage />} />
              <Route path="users"      element={<AdminUsersPage />} />
              <Route path="facilities" element={<AdminFacilitiesPage />} />
              <Route path="classes"       element={<AdminClassesPage />} />
              <Route path="packages"      element={<AdminPackagesPage />} />
              <Route path="registrations" element={<AdminRegistrationsPage />} />
              <Route path="staff-registrations" element={<AdminStaffRegistrationsPage />} />
              <Route path="reports"       element={<AdminReportsPage />} />
              <Route path="settings"   element={<AdminSettingsPage />} />
            </Route>
          </Route>

          {/* Coach & Assistant */}
          <Route element={<RequireRole role={['coach', 'assistant']} />}>
            <Route path="/coach" element={<AppLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"                                          element={<CoachDashboardPage />} />
              <Route path="classes"                                            element={<CoachClassesPage />} />
              <Route path="students"                                           element={<CoachStudentsPage />} />
              <Route path="classes/:classId/sessions"                          element={<CoachSessionsPage />} />
              <Route path="classes/:classId/sessions/:sessionId/attendance"    element={<CoachAttendanceSheetPage />} />
              <Route path="attendance"                                         element={<CoachAttendancePage />} />
              <Route path="attendance/scan"                                    element={<CoachScanAttendancePage />} />
              <Route path="progress"                                           element={<CoachProgressPage />} />
              <Route path="lesson-plans"                                       element={<CoachLessonPlanLibraryPage />} />
              <Route path="lesson-plans/new"                                   element={<CoachLessonPlanFormPage />} />
              <Route path="lesson-plans/:id/edit"                              element={<CoachLessonPlanFormPage />} />
              <Route path="assistants"                                         element={<CoachAssistantsPage />} />
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

          {/* Parent */}
          <Route element={<RequireRole role="parent" />}>
            <Route path="/parent" element={<AppLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"  element={<ParentDashboardPage />} />
              <Route path="family"     element={<ParentFamilyPage />} />
              <Route path="schedule"   element={<ParentSchedulePage />} />
              <Route path="attendance" element={<ParentAttendancePage />} />
              <Route path="packages"   element={<ParentPackagesPage />} />
              <Route path="progress"   element={<ParentProgressPage />} />
            </Route>
          </Route>

          {/* Root redirect */}
          <Route path="/" element={<DefaultRoute />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  )
}
