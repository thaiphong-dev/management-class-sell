import { Navigate, Outlet, useLocation } from 'react-router-dom'
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
  const { session, profile, isLoading, profileError } = useAuthContext()
  const location = useLocation()

  if (isLoading) return <FullPageSpinner />

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Profile failed to load (network error, RLS block, etc.) → redirect to login
  if (profileError || !profile) {
    return <Navigate to="/login" replace />
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
  const { session, profile, isLoading } = useAuthContext()

  if (isLoading) return <FullPageSpinner />

  if (!session || !profile) {
    return <Navigate to="/login" replace />
  }

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
