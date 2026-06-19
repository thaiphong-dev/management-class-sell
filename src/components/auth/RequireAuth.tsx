import { Navigate, Outlet } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthContext'
import type { UserRole } from '@/types'

interface RequireRoleProps {
  role: UserRole
}

const ROLE_DASHBOARDS: Record<UserRole, string> = {
  admin:   '/admin/dashboard',
  coach:   '/coach/dashboard',
  student: '/student/dashboard',
}

export function RequireRole({ role }: RequireRoleProps) {
  const { session, profile, isLoading, profileError, signOut } = useAuthContext()

  if (isLoading) return <FullPageSpinner />

  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Profile failed to load (network error, RLS block, etc.)
  // Do NOT redirect to /login — that would create a redirect trap since the session
  // is still valid. Show an error state with a retry / logout option instead.
  if (profileError) {
    return <ProfileErrorScreen onSignOut={signOut} />
  }

  // Profile still null but no error — shouldn't happen after isLoading=false, but guard anyway
  if (!profile) {
    return <ProfileErrorScreen onSignOut={signOut} />
  }

  if (profile.role !== role) {
    return <Navigate to={ROLE_DASHBOARDS[profile.role]} replace />
  }

  return <Outlet />
}

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, isLoading } = useAuthContext()

  if (isLoading) return <FullPageSpinner />

  if (session && profile) {
    return <Navigate to={ROLE_DASHBOARDS[profile.role]} replace />
  }

  return <>{children}</>
}

export function RootRedirect() {
  const { session, profile, isLoading, profileError, signOut } = useAuthContext()

  if (isLoading) return <FullPageSpinner />

  if (!session) return <Navigate to="/" replace />

  // Session valid but profile broken → show error, not redirect loop
  if (profileError || !profile) return <ProfileErrorScreen onSignOut={signOut} />

  return <Navigate to={ROLE_DASHBOARDS[profile.role]} replace />
}

function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Đang tải...</p>
      </div>
    </div>
  )
}

function ProfileErrorScreen({ onSignOut }: { onSignOut: () => Promise<void> }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-sm w-full text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <span className="text-red-600 text-xl">!</span>
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Không thể tải thông tin</h2>
          <p className="text-sm text-gray-500 mt-1">
            Đã xảy ra lỗi khi tải hồ sơ tài khoản. Vui lòng tải lại trang hoặc đăng xuất và thử lại.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2 px-4 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            Tải lại trang
          </button>
          <button
            onClick={onSignOut}
            className="w-full py-2 px-4 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  )
}
