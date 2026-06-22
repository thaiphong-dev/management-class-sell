import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthContext } from '@/contexts/AuthContext'
import { 
  LayoutDashboard, Users, BookOpen, FileText, BarChart3, 
  QrCode, ClipboardList, TrendingUp, GraduationCap, 
  Calendar, CreditCard 
} from 'lucide-react'

export function MobileBottomBar() {
  const { profile } = useAuthContext()

  if (!profile) return null

  const role = profile.role

  // Define 5 buttons for each role
  let buttons: { icon: any; label: string; path: string; isCenter?: boolean }[] = []

  if (role === 'admin') {
    buttons = [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
      { icon: Users,           label: 'Người dùng', path: '/admin/users' },
      { icon: BookOpen,        label: 'Lớp học', path: '/admin/classes', isCenter: true },
      { icon: FileText,        label: 'Đăng ký', path: '/admin/registrations' },
      { icon: BarChart3,       label: 'Báo cáo', path: '/admin/reports' },
    ]
  } else if (role === 'coach') {
    buttons = [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/coach/dashboard' },
      { icon: BookOpen,        label: 'Lớp học', path: '/coach/classes' },
      { icon: QrCode,          label: 'Quét QR', path: '/coach/attendance/scan', isCenter: true },
      { icon: ClipboardList,   label: 'Điểm danh', path: '/coach/attendance' },
      { icon: TrendingUp,      label: 'Đánh giá', path: '/coach/progress' },
    ]
  } else if (role === 'assistant') {
    buttons = [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/coach/dashboard' },
      { icon: BookOpen,        label: 'Lớp học', path: '/coach/classes' },
      { icon: QrCode,          label: 'Quét QR', path: '/coach/attendance/scan', isCenter: true },
      { icon: ClipboardList,   label: 'Điểm danh', path: '/coach/attendance' },
      { icon: GraduationCap,   label: 'Học viên', path: '/coach/students' },
    ]
  } else if (role === 'student') {
    buttons = [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/student/dashboard' },
      { icon: Calendar,        label: 'Lịch học', path: '/student/schedule' },
      { icon: CreditCard,      label: 'Thẻ học', path: '/student/packages', isCenter: true },
      { icon: ClipboardList,   label: 'Điểm danh', path: '/student/attendance' },
      { icon: TrendingUp,      label: 'Tiến độ', path: '/student/progress' },
    ]
  } else if (role === 'parent') {
    buttons = [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/parent/dashboard' },
      { icon: Calendar,        label: 'Lịch học', path: '/parent/schedule' },
      { icon: Users,           label: 'Quản lý con', path: '/parent/family', isCenter: true },
      { icon: ClipboardList,   label: 'Điểm danh', path: '/parent/attendance' },
      { icon: CreditCard,      label: 'Thẻ học', path: '/parent/packages' },
    ]
  }

  if (buttons.length === 0) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 h-16 bg-white/95 backdrop-blur-md border border-gray-150 rounded-3xl shadow-xl shadow-gray-300/40 flex items-center justify-around px-2 z-40 lg:hidden select-none">
      {buttons.map((btn, index) => {
        const Icon = btn.icon
        if (btn.isCenter) {
          return (
            <NavLink
              key={index}
              to={btn.path}
              className={({ isActive }) =>
                cn(
                  "relative -top-5 w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all duration-350 shadow-md",
                  isActive 
                    ? "bg-gradient-to-br from-red-500 to-red-700 text-white shadow-lg shadow-red-500/45 scale-110" 
                    : "bg-gradient-to-br from-red-600 to-red-750 text-white shadow-md shadow-red-600/30 hover:scale-105"
                )
              }
            >
              <Icon className="w-6 h-6 flex-shrink-0" />
            </NavLink>
          )
        }

        return (
          <NavLink
            key={index}
            to={btn.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 gap-0.5",
                isActive 
                  ? "text-red-600 scale-105 font-bold" 
                  : "text-gray-400 hover:text-gray-650"
              )
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className="text-[9px] tracking-tight whitespace-nowrap overflow-hidden max-w-[50px] truncate">{btn.label}</span>
          </NavLink>
        )
      })}
    </div>
  )
}
