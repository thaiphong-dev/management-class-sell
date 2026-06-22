import { useRef, useEffect, useState } from 'react'
import { useLocation, useMatch } from 'react-router-dom'
import { Menu, Bell, BellOff, CheckCheck, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthContext } from '@/contexts/AuthContext'
import { useAppStore } from '@/stores/useAppStore'
import { useNotifications } from '@/hooks/useNotifications'
import { supabase } from '@/lib/supabase'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PAGE_TITLES: Record<string, string> = {
  '/admin/dashboard':  'Dashboard',
  '/admin/users':      'Người dùng',
  '/admin/facilities': 'Cơ sở & Sân',
  '/admin/classes':    'Lớp học',
  '/admin/packages':   'Gói học',
  '/admin/reports':    'Báo cáo',
  '/coach/dashboard':  'Dashboard',
  '/coach/classes':    'Lớp của tôi',
  '/coach/attendance': 'Điểm danh',
  '/coach/progress':   'Đánh giá học viên',
  '/student/dashboard':  'Dashboard',
  '/student/schedule':   'Lịch học',
  '/student/attendance': 'Điểm danh',
  '/student/progress':   'Tiến độ',
  '/student/packages':   'Thẻ học',
  '/parent/dashboard': 'Dashboard Phụ huynh',
  '/parent/family':    'Quản lý con',
  '/parent/packages':  'Thẻ học của con',
  '/parent/progress':  'Tiến độ của con',
  '/parent/schedule':  'Lịch học của con',
  '/parent/attendance': 'Điểm danh của con',
}

const PAGES_WITHOUT_CHILD_SWITCHER = [
  '/parent/dashboard',
  '/parent/family'
]

function useDynamicTitle(pathname: string): string {
  const sessionsMatch  = useMatch('/coach/classes/:classId/sessions')
  const attendanceMatch = useMatch('/coach/classes/:classId/sessions/:sessionId/attendance')
  if (attendanceMatch) return 'Điểm danh buổi học'
  if (sessionsMatch)   return 'Buổi học'
  return PAGE_TITLES[pathname] ?? 'Thái Phong Badminton Class'
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 1)   return 'Vừa xong'
  if (mins < 60)  return `${mins} phút trước`
  if (hours < 24) return `${hours} giờ trước`
  return `${days} ngày trước`
}

const TYPE_ICON: Record<string, string> = {
  package_warning:  '⚠️',
  package_expiry:   '⏰',
  session_cancel:   '❌',
  package_grant:    '🎁',
  class_enrolled:   '🏸',
  default:          '🔔',
}

interface ChildOption {
  id: string
  name: string
}

function ChildSwitcher({ variant = 'desktop' }: { variant?: 'desktop' | 'mobile' }) {
  const { profile } = useAuthContext()
  const { activeChildId, setActiveChildId } = useAppStore()
  const [children, setChildren] = useState<ChildOption[]>([])
  const [loading, setLoading] = useState(false)
  const location = useLocation()

  useEffect(() => {
    if (!profile || profile.role !== 'parent') return
    const profileId = profile.id

    async function fetchChildren() {
      setLoading(true)
      try {
        const { data: parentData, error: parentError } = await (supabase
          .from('parents') as any)
          .select('id')
          .eq('user_id', profileId)
          .single()

        if (parentError || !parentData) {
          console.error('Failed to fetch parent:', parentError?.message)
          return
        }

        const { data, error } = await (supabase
          .from('students') as any)
          .select(`
            id,
            profiles (
              full_name
            )
          `)
          .eq('parent_id', parentData.id)

        if (error) {
          console.error('Failed to fetch children:', error.message)
          return
        }

        const formatted: ChildOption[] = (data || []).map((c: any) => ({
          id: c.id,
          name: c.profiles?.full_name || 'Học viên'
        }))

        setChildren(formatted)

        if (formatted.length > 0) {
          const currentExists = formatted.some(c => c.id === activeChildId)
          if (!currentExists) {
            setActiveChildId(formatted[0].id)
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchChildren()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, activeChildId, location.pathname])

  if (profile?.role !== 'parent' || children.length === 0) return null

  if (variant === 'mobile') {
    return (
      <div className="flex items-center justify-between w-full select-none">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-red-500 flex-shrink-0 animate-pulse" />
          <span className="text-[10px] font-black text-red-650 uppercase tracking-wider">Đang xem thông tin:</span>
        </div>
        <Select
          value={activeChildId || ''}
          onValueChange={(val) => setActiveChildId(val)}
          disabled={loading}
        >
          <SelectTrigger className="w-[125px] h-7 bg-white border border-red-200/80 hover:border-red-400 text-red-700 text-xs font-black rounded-lg focus:ring-1 focus:ring-red-500/20 focus:border-red-500/30 transition-colors shadow-2xs">
            <SelectValue placeholder="Chọn con" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-gray-200">
            {children.map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-xs font-bold text-gray-700 focus:bg-red-50 focus:text-red-700 rounded-lg">
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-2xl shadow-2xs select-none">
      <Users className="w-3.5 h-3.5 text-red-550 flex-shrink-0 animate-pulse" />
      <span className="text-[10px] font-black text-red-600 uppercase tracking-wider whitespace-nowrap">Đang xem:</span>
      <Select
        value={activeChildId || ''}
        onValueChange={(val) => setActiveChildId(val)}
        disabled={loading}
      >
        <SelectTrigger className="w-[130px] h-7 bg-white border border-red-200/80 hover:border-red-400 text-red-700 text-xs font-black rounded-lg focus:ring-1 focus:ring-red-500/20 focus:border-red-500/30 transition-colors shadow-2xs">
          <SelectValue placeholder="Chọn con" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-gray-200">
          {children.map((c) => (
            <SelectItem key={c.id} value={c.id} className="text-xs font-bold text-gray-700 focus:bg-red-50 focus:text-red-700 rounded-lg">
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function Header() {
  const { profile } = useAuthContext()
  const { toggleSidebar, setProfileDialogOpen } = useAppStore()
  const location = useLocation()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()

  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const bellRef  = useRef<HTMLButtonElement>(null)

  const pageTitle = useDynamicTitle(location.pathname)

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        bellRef.current  && !bellRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function handleBellClick() {
    setOpen(prev => !prev)
  }

  async function handleNotifClick(id: string) {
    await markAsRead(id)
  }

  return (
    <>
      <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 gap-4 sticky top-0 z-30">
        {/* Mobile hamburger */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Page title */}
        <h1 className="font-semibold text-gray-900 text-sm sm:text-lg whitespace-nowrap truncate min-w-0 flex-1">{pageTitle}</h1>

        {/* Child Switcher for Parents */}
        {!PAGES_WITHOUT_CHILD_SWITCHER.includes(location.pathname) && (
          <div className="hidden lg:block">
            <ChildSwitcher variant="desktop" />
          </div>
        )}

        {/* Notification bell */}
        <div className="relative">
          <button
            ref={bellRef}
            onClick={handleBellClick}
            className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Thông báo"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown panel */}
          {open && (
            <div
              ref={panelRef}
              className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden"
            >
              {/* Header row */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">Thông báo</p>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-xs text-primary-700 hover:text-primary-800 font-medium"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Đọc tất cả
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <BellOff className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Không có thông báo</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <button
                      key={n.id}
                      onClick={() => handleNotifClick(n.id)}
                      className={cn(
                        'w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors',
                        n.read_at === null && 'bg-red-50/60'
                      )}
                    >
                      <div className="flex gap-3">
                        <span className="text-xl flex-shrink-0 mt-0.5">
                          {TYPE_ICON[n.type] ?? TYPE_ICON.default}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn(
                              'text-sm text-gray-800 leading-snug',
                              n.read_at === null && 'font-semibold'
                            )}>
                              {n.title}
                            </p>
                            {n.read_at === null && (
                              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">
                            {n.body}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-1">
                            {timeAgo(n.created_at)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setProfileDialogOpen(true)}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity cursor-pointer border-0 bg-transparent p-0 text-left"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-8 h-8 rounded-full object-cover border border-gray-100 shadow-sm"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                <span className="text-white text-xs font-semibold">
                  {profile?.full_name.charAt(0).toUpperCase() ?? '?'}
                </span>
              </div>
            )}
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900 leading-tight">{profile?.full_name}</p>
            </div>
          </button>
        </div>
      </header>

      {/* Mobile SubHeader for Parent Child Switcher */}
      {profile?.role === 'parent' && !PAGES_WITHOUT_CHILD_SWITCHER.includes(location.pathname) && (
        <div className="lg:hidden h-11 bg-red-50/65 border-b border-red-150/60 backdrop-blur-xs flex items-center justify-between px-4 sticky top-16 z-20 shadow-2xs">
          <ChildSwitcher variant="mobile" />
        </div>
      )}
    </>
  )
}
