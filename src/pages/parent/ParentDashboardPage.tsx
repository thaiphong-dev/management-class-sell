import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Clock, MapPin, Users, CreditCard, Calendar, ClipboardList, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/stores/useAppStore'
import { Button } from '@/components/ui/button'

interface ChildInfo {
  id: string; // studentId
  fullName: string;
  avatarUrl: string | null;
  colorIndex: number;
}

interface ScheduleSession {
  id: string
  scheduled_at: string
  duration_min: number
  status: string
  className: string
  facilityName: string | null
  courtName: string | null
  coachName: string | null
  children: ChildInfo[]
}

interface ChildPackageSummary {
  childId: string
  childName: string
  packageName: string | null
  sessionsRemaining: number | null
  sessionsTotal: number | null
  expiresAt: string | null
  status: string | null
  alertLevel: string | null
}

const CHILD_COLORS = [
  { bg: 'bg-emerald-50/60 hover:bg-emerald-50 border-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', borderLeft: 'border-l-4 border-l-emerald-500' },
  { bg: 'bg-indigo-50/60 hover:bg-indigo-50 border-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500', borderLeft: 'border-l-4 border-l-indigo-500' },
  { bg: 'bg-amber-50/60 hover:bg-amber-50 border-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', borderLeft: 'border-l-4 border-l-amber-500' },
  { bg: 'bg-rose-50/60 hover:bg-rose-50 border-rose-100', text: 'text-rose-700', dot: 'bg-rose-500', borderLeft: 'border-l-4 border-l-rose-500' },
]

function groupByDate(sessions: ScheduleSession[]): Map<string, ScheduleSession[]> {
  const map = new Map<string, ScheduleSession[]>()
  for (const s of sessions) {
    const key = new Date(s.scheduled_at).toLocaleDateString('vi-VN', {
      weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
    })
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(s)
  }
  return map
}

export default function ParentDashboardPage() {
  const { profile } = useAuthContext()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { setActiveChildId } = useAppStore()
  const [sessions, setSessions] = useState<ScheduleSession[]>([])
  const [childPackages, setChildPackages] = useState<ChildPackageSummary[]>([])
  const [children, setChildren] = useState<ChildInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Pending registrations states
  const [pendingRegistrations, setPendingRegistrations] = useState<any[]>([])
  const [isCancelling, setIsCancelling] = useState<string | null>(null)

  const handleCancelRegistration = async (regId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn đăng ký học này cho con không?')) return
    setIsCancelling(regId)
    try {
      const { error } = await (supabase.rpc as any)('cancel_pending_registration', {
        p_registration_id: regId
      })

      if (error) throw error

      toast({
        title: 'Hủy đăng ký thành công',
        description: 'Đơn đăng ký học đã được hủy bỏ.'
      })
      
      setPendingRegistrations(prev => prev.filter(r => r.id !== regId))
      window.location.reload()
    } catch (err: any) {
      console.error('Error cancelling registration:', err.message)
      toast({
        title: 'Lỗi hủy đăng ký',
        description: err.message || 'Lỗi không xác định',
        variant: 'destructive'
      })
    } finally {
      setIsCancelling(null)
    }
  }

  useEffect(() => {
    if (!profile) return

    async function loadDashboardData() {
      setIsLoading(true)
      try {
        // 1. Get Parent Record
        const { data: parentData, error: parentError } = await (supabase
          .from('parents') as any)
          .select('id')
          .eq('user_id', profile!.id)
          .single()

        if (parentError || !parentData) {
          console.error('Failed to load parent:', parentError?.message)
          setIsLoading(false)
          return
        }

        // 2. Get Children
        const { data: childrenData, error: childrenError } = await (supabase
          .from('students') as any)
          .select('id, user_id, profiles(full_name, avatar_url)')
          .eq('parent_id', parentData.id)

        if (childrenError) throw childrenError

        const childList: ChildInfo[] = (childrenData || []).map((c: any, index: number) => ({
          id: c.id,
          fullName: c.profiles?.full_name || 'Học viên',
          avatarUrl: c.profiles?.avatar_url || null,
          colorIndex: index % CHILD_COLORS.length,
        }))
        setChildren(childList)

        if (childList.length === 0) {
          setIsLoading(false)
          return
        }

        const childIds = childList.map(c => c.id)

        // Fetch pending registrations for these children
        const { data: pendingRegsData, error: pendingError } = await (supabase
          .from('registrations') as any)
          .select('id, student_id, first_name, last_name, class_name:classes(name), package_name:packages(name), packages(price)')
          .in('student_id', childIds)
          .eq('status', 'pending')
          .eq('payment_status', 'unpaid')

        if (pendingError) {
          console.error('Failed to load pending registrations:', pendingError.message)
        } else {
          setPendingRegistrations(pendingRegsData || [])
        }

        // 3. Get all active classes for these children
        const { data: classStudentsData, error: classStudentsError } = await (supabase
          .from('class_students') as any)
          .select('class_id, student_id')
          .in('student_id', childIds)
          .eq('status', 'active')

        if (classStudentsError) throw classStudentsError

        // Map class_id -> list of children in that class
        const classToChildrenMap: Record<string, ChildInfo[]> = {}
        const classIds: string[] = []
        for (const cs of (classStudentsData || [])) {
          const child = childList.find(c => c.id === cs.student_id)
          if (child) {
            if (!classToChildrenMap[cs.class_id]) {
              classToChildrenMap[cs.class_id] = []
              classIds.push(cs.class_id)
            }
            classToChildrenMap[cs.class_id].push(child)
          }
        }

        // 4. Get active student packages for summary
        const { data: packagesData } = await (supabase
          .from('active_student_packages') as any)
          .select('student_id, package_name, sessions_remaining, sessions_total, expires_at, status, alert_level')
          .in('student_id', childIds)

        // Get pending packages
        const { data: pendingPackagesData } = await (supabase
          .from('student_packages') as any)
          .select('student_id, status, sessions_total, sessions_remaining, packages(name)')
          .in('student_id', childIds)
          .eq('status', 'pending_activation')

        const summaries: ChildPackageSummary[] = childList.map(c => {
          const pkg = (packagesData || []).find((p: any) => p.student_id === c.id)
          const pendingPkg = (pendingPackagesData || []).find((p: any) => p.student_id === c.id)
          return {
            childId: c.id,
            childName: c.fullName,
            packageName: pkg?.package_name || (pendingPkg?.packages?.name ?? null),
            sessionsRemaining: pkg?.sessions_remaining || (pendingPkg?.sessions_remaining ?? null),
            sessionsTotal: pkg?.sessions_total || (pendingPkg?.sessions_total ?? null),
            expiresAt: pkg?.expires_at || null,
            status: pkg?.status || pendingPkg?.status || null,
            alertLevel: pkg?.alert_level || (pendingPkg ? 'pending_activation' : null)
          }
        })
        setChildPackages(summaries)

        if (classIds.length === 0) {
          setIsLoading(false)
          return
        }

        // 5. Get upcoming sessions for these classes
        const { data: sessionsData, error: sessionsError } = await (supabase
          .from('sessions_with_details') as any)
          .select('id, scheduled_at, duration_min, status, class_name, facility_name, court_name, coach_name, class_id')
          .in('class_id', classIds)
          .gte('scheduled_at', new Date().toISOString())
          .neq('status', 'cancelled')
          .order('scheduled_at', { ascending: true })
          .limit(30)

        if (sessionsError) throw sessionsError

        const mappedSessions: ScheduleSession[] = (sessionsData || []).map((s: any) => ({
          id: s.id,
          scheduled_at: s.scheduled_at,
          duration_min: s.duration_min,
          status: s.status,
          className: s.class_name,
          facilityName: s.facility_name,
          courtName: s.court_name,
          coachName: s.coach_name,
          children: classToChildrenMap[s.class_id] || [],
        }))

        setSessions(mappedSessions)
      } catch (err: any) {
        console.error(err)
        toast({ title: 'Lỗi tải dashboard', description: err.message, variant: 'destructive' })
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [profile, toast])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-2">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Đang tải thông tin dashboard...</p>
      </div>
    )
  }

  const alertChildren = childPackages.filter(cp => cp.alertLevel === 'warning' || cp.alertLevel === 'critical' || cp.alertLevel === 'pending_activation' || !cp.packageName)

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Xin chào, Phụ huynh {profile?.full_name}</h2>
        <p className="text-sm text-gray-500 mt-0.5">Chào mừng quay lại hệ thống quản lý học viên Thái Phong Badminton Class.</p>
      </div>

      {/* Đơn đăng ký học chờ duyệt/thanh toán */}
      {!isLoading && pendingRegistrations.length > 0 && (
        <div className="space-y-3 font-sans">
          {pendingRegistrations.map(reg => (
            <div key={reg.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-2xl p-4.5 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0 animate-pulse">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-850">
                    Đơn đăng ký học của bé {reg.last_name} {reg.first_name} đang chờ thanh toán
                  </h4>
                  <p className="text-xs text-amber-700 mt-0.5 leading-normal font-medium">
                    Đăng ký lớp: <span className="font-bold text-amber-900">{reg.class_name?.name || '—'}</span> · Gói học: <span className="font-bold text-amber-900">{reg.package_name?.name || '—'}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 font-sans">
                <Button 
                  onClick={() => {
                    setActiveChildId(reg.student_id)
                    navigate('/parent/packages')
                  }}
                  className="bg-amber-650 hover:bg-amber-750 text-white rounded-xl text-xs font-bold px-4 h-9 shadow-sm"
                >
                  Thanh toán ngay
                </Button>
                <Button 
                  onClick={() => handleCancelRegistration(reg.id)}
                  disabled={isCancelling === reg.id}
                  variant="outline"
                  className="border-gray-200 text-gray-500 hover:text-red-655 hover:bg-red-55/60 rounded-xl text-xs font-bold px-4 h-9"
                >
                  {isCancelling === reg.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Hủy đăng ký'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cảnh báo trạng thái thẻ học của các con */}
      {!isLoading && children.length > 0 && alertChildren.length > 0 && (
        <div className="space-y-3">
          {alertChildren.map(cp => {
            const isCritical = cp.alertLevel === 'critical';
            const isWarning = cp.alertLevel === 'warning';
            const isPendingActivation = cp.alertLevel === 'pending_activation';
            
            let bgClass = "bg-amber-50 border-amber-200 text-amber-850"
            let iconBg = "bg-amber-100 text-amber-600"
            let title = `Bé ${cp.childName} chưa có thẻ học`
            let desc = `Tài khoản của bé ${cp.childName} hiện chưa có thẻ học nào đang hoạt động. Vui lòng đăng ký gói học mới để kích hoạt và ghi nhận lịch tập luyện.`
            let btnText = "Đăng ký gói học"
            let btnClass = "bg-amber-600 hover:bg-amber-700 border-amber-600"
            
            if (isPendingActivation) {
              bgClass = "bg-amber-50 border-amber-200 text-amber-850"
              iconBg = "bg-amber-100 text-amber-600 animate-pulse"
              title = `Bé ${cp.childName} có thẻ học chờ kích hoạt`
              desc = `Gói học ${cp.packageName} của bé ${cp.childName} đang chờ kích hoạt. Thẻ sẽ tự động kích hoạt khi điểm danh lần đầu hoặc kích hoạt bằng tay.`
              btnText = "Xem chi tiết"
              btnClass = "bg-amber-600 hover:bg-amber-700 border-amber-600"
            } else if (isCritical) {
              bgClass = "bg-red-50 border-red-200 text-red-850"
              iconBg = "bg-red-100 text-red-655"
              title = `Thẻ học của bé ${cp.childName} đã hết hạn/hết buổi`
              desc = `Thẻ học của bé ${cp.childName} đã hết số buổi tập hoặc quá hạn sử dụng. Hãy mua gói học mới ngay hôm nay để tránh bị chặn điểm danh.`
              btnText = "Gia hạn ngay"
              btnClass = "bg-red-600 hover:bg-red-700 border-red-600"
            } else if (isWarning) {
              bgClass = "bg-orange-50 border-orange-200 text-orange-850"
              iconBg = "bg-orange-100 text-orange-600"
              title = `Thẻ học của bé ${cp.childName} sắp hết`
              desc = `Thẻ học của bé ${cp.childName} sắp hết hạn sử dụng hoặc còn ít buổi tập. Vui lòng đăng ký gói học sớm.`
              btnText = "Gia hạn sớm"
              btnClass = "bg-orange-600 hover:bg-orange-700 border-orange-600"
            }

            return (
              <div key={cp.childId} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border rounded-2xl p-4.5 shadow-xs ${bgClass}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold leading-snug">{title}</h4>
                    <p className="text-xs opacity-90 mt-0.5 leading-normal">{desc}</p>
                  </div>
                </div>
                <Link
                  to="/parent/packages"
                  onClick={() => setActiveChildId(cp.childId)}
                  className="shrink-0"
                >
                  <Button className={`text-white rounded-xl text-xs font-bold w-full sm:w-auto px-4 h-9.5 shadow-sm border ${btnClass}`}>
                    {btnText}
                  </Button>
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {children.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center space-y-4 shadow-sm max-w-md mx-auto">
          <div className="w-16 h-16 bg-red-50 text-red-650 rounded-full flex items-center justify-center mx-auto text-2xl">🏸</div>
          <div className="space-y-1">
            <h3 className="font-bold text-gray-800">Chưa đăng ký cho con học</h3>
            <p className="text-sm text-gray-500">Bạn chưa liên kết hoặc tạo hồ sơ học viên con nào dưới tài khoản này.</p>
          </div>
          <Link to="/parent/family">
            <button className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors">
              Đăng ký cho con ngay
            </button>
          </Link>
        </div>
      ) : (
        <>
          {/* Children Summary Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {childPackages.map(cp => {
              const child = children.find(c => c.id === cp.childId)
              const color = CHILD_COLORS[child?.colorIndex || 0]

              return (
                <div key={cp.childId} className={`bg-white border ${color.borderLeft} rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between`}>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {child?.avatarUrl ? (
                        <img
                          src={child.avatarUrl}
                          alt={cp.childName}
                          className="w-6 h-6 rounded-full object-cover border border-gray-150 flex-shrink-0"
                        />
                      ) : (
                        <div className={`w-2.5 h-2.5 rounded-full ${color.dot} flex-shrink-0`} />
                      )}
                      <h3 className="font-bold text-gray-850 text-sm select-none">{cp.childName}</h3>
                    </div>

                    <div className="space-y-1">
                      {cp.packageName ? (
                        <>
                          <p className="text-xs font-semibold text-gray-800 leading-normal">{cp.packageName}</p>
                          <div className="flex justify-between items-center text-xs text-gray-500 pt-1">
                            <span>Số buổi còn lại:</span>
                            <span className="font-bold text-gray-800">{cp.sessionsRemaining ?? 'N/A'} / {cp.sessionsTotal ?? 'N/A'}</span>
                          </div>
                          {cp.expiresAt && (
                            <div className="flex justify-between items-center text-[11px] text-gray-400">
                              <span>Hạn sử dụng:</span>
                              <span>{new Date(cp.expiresAt).toLocaleDateString('vi-VN')}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Chưa đăng ký gói học hoặc thẻ đã hết hạn</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-155">
                    <Link
                      to="/parent/packages"
                      onClick={() => setActiveChildId(cp.childId)}
                      className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-gray-50 hover:bg-red-50 hover:text-red-700 rounded-xl text-[10px] font-bold text-gray-600 border border-gray-100 transition-colors"
                    >
                      <CreditCard className="w-3 h-3 flex-shrink-0" />
                      <span>Thẻ học</span>
                    </Link>
                    <Link
                      to="/parent/schedule"
                      onClick={() => setActiveChildId(cp.childId)}
                      className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-gray-50 hover:bg-red-50 hover:text-red-700 rounded-xl text-[10px] font-bold text-gray-600 border border-gray-100 transition-colors"
                    >
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      <span>Lịch học</span>
                    </Link>
                    <Link
                      to="/parent/attendance"
                      onClick={() => setActiveChildId(cp.childId)}
                      className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-gray-50 hover:bg-red-50 hover:text-red-700 rounded-xl text-[10px] font-bold text-gray-600 border border-gray-100 transition-colors"
                    >
                      <ClipboardList className="w-3 h-3 flex-shrink-0" />
                      <span>Điểm danh</span>
                    </Link>
                    <Link
                      to="/parent/progress"
                      onClick={() => setActiveChildId(cp.childId)}
                      className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-gray-50 hover:bg-red-50 hover:text-red-700 rounded-xl text-[10px] font-bold text-gray-600 border border-gray-100 transition-colors"
                    >
                      <TrendingUp className="w-3 h-3 flex-shrink-0" />
                      <span>Tiến độ</span>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Unified Schedule Calendar */}
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-gray-850 text-base">Lịch học tổng hợp</h3>
              <p className="text-xs text-gray-400 mt-0.5">Lịch tập sắp tới của toàn bộ các con được hợp nhất (phân biệt theo màu nhãn)</p>
            </div>

            {sessions.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center text-gray-400 text-xs">
                Không có lịch học sắp tới.
              </div>
            ) : (
              <div className="space-y-6">
                {Array.from(groupByDate(sessions)).map(([dateStr, daySessions]) => (
                  <div key={dateStr} className="space-y-2.5">
                    <h4 className="text-xs font-extrabold text-red-650 bg-red-50/50 inline-block px-3 py-1.5 rounded-full capitalize select-none">
                      {dateStr}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {daySessions.map(s => {
                        return (
                          <div key={s.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex justify-between items-start gap-2">
                                <h5 className="font-bold text-gray-800 text-sm leading-snug">{s.className}</h5>
                                <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wide">
                                  {STATUS_CONFIG[s.status]?.label || 'Lịch học'}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 gap-1 text-xs text-gray-500">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                  <span>
                                    {new Date(s.scheduled_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ({s.duration_min} phút)
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                  <span className="truncate">
                                    {s.facilityName} - {s.courtName || 'Sân trống'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                  <span>HLV: {s.coachName || 'Chưa phân công'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Kids labels */}
                            <div className="border-t border-gray-100 pt-2.5 flex flex-wrap gap-2">
                              {s.children.map(c => {
                                const color = CHILD_COLORS[c.colorIndex]
                                return (
                                  <div key={c.id} className={`flex items-center gap-1.5 px-2 py-0.5 pl-1.5 rounded-full text-[10px] font-bold ${color.bg} ${color.text} border select-none`}>
                                    {c.avatarUrl ? (
                                      <img
                                        src={c.avatarUrl}
                                        alt={c.fullName}
                                        className="w-4 h-4 rounded-full object-cover border border-white/20 flex-shrink-0"
                                      />
                                    ) : (
                                      <div className={`w-1.5 h-1.5 rounded-full ${color.dot} flex-shrink-0`} />
                                    )}
                                    <span>{c.fullName}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  scheduled:   { label: 'Sắp học',    className: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'Đang học',    className: 'bg-yellow-100 text-yellow-700' },
  completed:   { label: 'Đã hoàn thành',  className: 'bg-green-100 text-green-700' },
  cancelled:   { label: 'Đã hủy',      className: 'bg-red-100 text-red-700' },
}
