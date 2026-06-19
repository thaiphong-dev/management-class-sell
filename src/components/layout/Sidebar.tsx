import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Building2, BookOpen, CreditCard,
  BarChart3, ClipboardList, TrendingUp, Calendar, LogOut, X, Settings, FileText, QrCode, GraduationCap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthContext } from '@/contexts/AuthContext'
import { useAppStore } from '@/stores/useAppStore'
import type { UserRole } from '@/types'

interface NavItem {
  icon: React.ElementType
  label: string
  path: string
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  admin: [
    { icon: LayoutDashboard, label: 'Dashboard',    path: '/admin/dashboard' },
    { icon: Users,           label: 'Người dùng',   path: '/admin/users' },
    { icon: Building2,       label: 'Cơ sở & Sân',  path: '/admin/facilities' },
    { icon: BookOpen,        label: 'Lớp học',       path: '/admin/classes' },
    { icon: CreditCard,      label: 'Gói học',       path: '/admin/packages' },
    { icon: FileText,        label: 'Đơn đăng ký học', path: '/admin/registrations' },
    { icon: BarChart3,       label: 'Báo cáo',       path: '/admin/reports' },
    { icon: Settings,        label: 'Cấu hình trang chủ', path: '/admin/settings' },
  ],
  coach: [
    { icon: LayoutDashboard, label: 'Dashboard',    path: '/coach/dashboard' },
    { icon: BookOpen,        label: 'Lớp của tôi',  path: '/coach/classes' },
    { icon: GraduationCap,   label: 'Học viên',     path: '/coach/students' },
    { icon: ClipboardList,   label: 'Điểm danh',    path: '/coach/attendance' },
    { icon: QrCode,          label: 'Quét QR điểm danh', path: '/coach/attendance/scan' },
    { icon: FileText,        label: 'Thư viện giáo án', path: '/coach/lesson-plans' },
    { icon: Users,           label: 'Quản lý Trợ giảng', path: '/coach/assistants' },
    { icon: TrendingUp,      label: 'Đánh giá',     path: '/coach/progress' },
  ],
  assistant: [
    { icon: LayoutDashboard, label: 'Dashboard',    path: '/coach/dashboard' },
    { icon: BookOpen,        label: 'Lớp trợ giảng', path: '/coach/classes' },
    { icon: GraduationCap,   label: 'Học viên',     path: '/coach/students' },
    { icon: ClipboardList,   label: 'Điểm danh',    path: '/coach/attendance' },
    { icon: QrCode,          label: 'Quét QR điểm danh', path: '/coach/attendance/scan' },
    { icon: FileText,        label: 'Xem giáo án',   path: '/coach/lesson-plans' },
  ],
  student: [
    { icon: LayoutDashboard, label: 'Dashboard',    path: '/student/dashboard' },
    { icon: Calendar,        label: 'Lịch học',     path: '/student/schedule' },
    { icon: ClipboardList,   label: 'Điểm danh',    path: '/student/attendance' },
    { icon: TrendingUp,      label: 'Tiến độ',      path: '/student/progress' },
    { icon: CreditCard,      label: 'Thẻ học',      path: '/student/packages' },
  ],
  parent: [
    { icon: LayoutDashboard, label: 'Dashboard',    path: '/parent/dashboard' },
    { icon: Users,           label: 'Quản lý con',   path: '/parent/family' },
    { icon: Calendar,        label: 'Lịch học của con', path: '/parent/schedule' },
    { icon: ClipboardList,   label: 'Điểm danh của con', path: '/parent/attendance' },
    { icon: CreditCard,      label: 'Thẻ học của con', path: '/parent/packages' },
    { icon: TrendingUp,      label: 'Tiến độ của con', path: '/parent/progress' },
  ],
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin:   'Quản trị viên',
  coach:   'Huấn luyện viên',
  assistant: 'Trợ giảng',
  student: 'Học viên',
  parent:  'Phụ huynh',
}

export function Sidebar() {
  const { profile, signOut } = useAuthContext()
  const { sidebarOpen, setSidebarOpen } = useAppStore()
  const navigate = useNavigate()

  if (!profile) return null

  const navItems = NAV_ITEMS[profile.role]

  const handleSignOut = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  const sidebarContent = (
    <div className="flex flex-col h-full" style={{ background: '#180a0a' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
            <circle cx="12" cy="19" r="3.5" fill="white" fillOpacity="0.9" />
            <line x1="12" y1="15.5" x2="7"  y2="4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="12" y1="15.5" x2="12" y2="3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="12" y1="15.5" x2="17" y2="4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="7"  y1="4"   x2="17" y2="4" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="6"  y1="7"   x2="18" y2="7" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="font-bold text-white text-sm leading-tight">Thái Phong Badminton Class</p>
          <p className="text-white/40 text-xs truncate">{ROLE_LABELS[profile.role]}</p>
        </div>

        {/* Mobile close button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="ml-auto lg:hidden text-white/40 hover:text-white transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ icon: Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer',
                isActive
                  ? 'text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              )
            }
            style={({ isActive }) =>
              isActive
                ? {
                    background: 'rgba(220,38,38,0.18)',
                    borderLeft: '3px solid #dc2626',
                    paddingLeft: 'calc(0.75rem - 3px)',
                  }
                : {}
            }
          >
            <Icon className="w-[18px] h-[18px] flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-3 pb-4 pt-2 border-t border-white/10 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">
              {profile.full_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-medium truncate">{profile.full_name}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-60 z-50 flex flex-col lg:hidden shadow-2xl">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}
