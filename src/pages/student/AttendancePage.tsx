import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Clock, BookOpen, TrendingUp, Calendar, CreditCard, Award } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { formatDate, formatDateTime } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface AttendanceRecord {
  id: string
  checked_at: string
  status: 'present' | 'absent' | 'late' | 'excused'
  className: string
  scheduledAt: string
  coachName: string | null
  notes: string | null
}

interface ActivePackage {
  id: string
  packageName: string
  packageType: 'session' | 'monthly'
  sessionsRemaining: number | null
  sessionsTotal: number | null
  expiresAt: string | null
  activatedAt: string | null
}

const STATUS_CONFIG = {
  present: { label: 'Có mặt', icon: CheckCircle2, className: 'bg-green-50 text-green-700 border-green-200' },
  absent:  { label: 'Vắng',   icon: XCircle,      className: 'bg-red-50 text-red-700 border-red-200' },
  late:    { label: 'Trễ',    icon: Clock,         className: 'bg-yellow-50 text-yellow-700 border-yellow-250' },
  excused: { label: 'Phép',   icon: BookOpen,      className: 'bg-blue-50 text-blue-700 border-blue-200' },
}

export default function StudentAttendancePage({ studentId }: { studentId?: string }) {
  const { profile } = useAuthContext()
  const { toast } = useToast()
  
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [activePackage, setActivePackage] = useState<ActivePackage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent' | 'late' | 'excused'>('all')
  const [monthFilter, setMonthFilter] = useState<string>('all')

  useEffect(() => {
    if (!profile) return

    async function loadData() {
      try {
        let resolvedStudentId = studentId

        if (!resolvedStudentId) {
          const { data: studentData, error: studentError } = await (supabase
            .from('students') as any)
            .select('id')
            .eq('user_id', profile!.id)
            .maybeSingle()

          if (studentError) throw studentError
          resolvedStudentId = studentData?.id
        }

        if (!resolvedStudentId) {
          setIsLoading(false)
          return
        }

        // Fetch active package and attendance history in parallel
        const [activePkgRes, attendanceRes] = await Promise.all([
          (supabase
            .from('active_student_packages') as any)
            .select('id, package_name, package_type, sessions_remaining, sessions_total, expires_at, activated_at')
            .eq('student_id', resolvedStudentId)
            .maybeSingle(),
          (supabase
            .from('attendance') as any)
            .select(`
              id, status, checked_at, notes,
              sessions(scheduled_at, class_id,
                classes(name,
                  coaches(user_id, profiles(full_name))
                )
              )
            `)
            .eq('student_id', resolvedStudentId)
            .order('checked_at', { ascending: false })
            .limit(100)
        ])

        if (activePkgRes.error) console.error('Active pkg fetch error:', activePkgRes.error.message)
        if (attendanceRes.error) throw attendanceRes.error

        // Map active package
        if (activePkgRes.data) {
          const p = activePkgRes.data as any
          setActivePackage({
            id: p.id,
            packageName: p.package_name,
            packageType: p.package_type,
            sessionsRemaining: p.sessions_remaining,
            sessionsTotal: p.sessions_total,
            expiresAt: p.expires_at,
            activatedAt: p.activated_at
          })
        } else {
          setActivePackage(null)
        }

        // Map attendance
        const rows: AttendanceRecord[] = ((attendanceRes.data ?? []) as unknown[]).map((raw: unknown) => {
          const r = raw as Record<string, unknown>
          const session = r.sessions as Record<string, unknown> | null
          const cls = session?.classes as Record<string, unknown> | null
          const coachRec = cls?.coaches as Record<string, unknown> | null
          const coachProfile = coachRec?.profiles as { full_name?: string } | null
          return {
            id:          r.id as string,
            checked_at:  r.checked_at as string,
            status:      r.status as 'present' | 'absent' | 'late' | 'excused',
            className:   (cls?.name as string) ?? '—',
            scheduledAt: (session?.scheduled_at as string) ?? (r.checked_at as string),
            coachName:   coachProfile?.full_name ?? null,
            notes:       r.notes as string | null,
          }
        })

        setRecords(rows)
      } catch (err: any) {
        console.error('Failed to load attendance details:', err.message)
        toast({ title: 'Lỗi tải lịch sử điểm danh', description: err.message, variant: 'destructive' })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [profile, toast, studentId])

  const presentCount = records.filter(r => r.status === 'present').length
  const lateCount    = records.filter(r => r.status === 'late').length
  const total        = records.length
  const attendanceRate = total > 0 ? Math.round(((presentCount + lateCount) / total) * 100) : 0

  // Punch card variables
  const isSessionPkg = activePackage && activePackage.packageType === 'session'
  const sessionsTotal = activePackage?.sessionsTotal || 0
  const sessionsRemaining = activePackage?.sessionsRemaining || 0
  const sessionsUsed = Math.max(0, sessionsTotal - sessionsRemaining)

  // Get unique months from records (format: YYYY-MM)
  const uniqueMonths = Array.from(new Set(records.map(r => {
    if (!r.checked_at) return ''
    const d = new Date(r.checked_at)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${yyyy}-${mm}`
  }).filter(Boolean))).sort().reverse()

  const formatMonthLabel = (yyyyMm: string) => {
    const [yyyy, mm] = yyyyMm.split('-')
    return `Tháng ${mm}/${yyyy}`
  }

  // Filter records by month first to calculate counts for status tabs
  const matchesMonth = (r: AttendanceRecord, mFilter: string) => {
    if (mFilter === 'all') return true
    if (!r.checked_at) return false
    const d = new Date(r.checked_at)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${yyyy}-${mm}` === mFilter
  }

  const monthFiltered = records.filter(r => matchesMonth(r, monthFilter))

  const statusCounts = {
    all: monthFiltered.length,
    present: monthFiltered.filter(r => r.status === 'present').length,
    late: monthFiltered.filter(r => r.status === 'late').length,
    absent: monthFiltered.filter(r => r.status === 'absent').length,
    excused: monthFiltered.filter(r => r.status === 'excused').length,
  }

  // Apply both filters for final records list
  const filteredRecords = monthFiltered.filter(r => statusFilter === 'all' || r.status === statusFilter)

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Điểm danh</h2>
        <p className="text-sm text-gray-500 mt-0.5">Lịch sử tham gia tập luyện và thời hạn thẻ học của bạn</p>
      </div>

      {/* Stats Cards */}
      {!isLoading && total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Tổng buổi tham dự', value: total, className: 'text-gray-900', icon: Award },
            { label: 'Có mặt đúng giờ', value: presentCount, className: 'text-green-600', icon: CheckCircle2 },
            { label: 'Số buổi đi trễ', value: lateCount, className: 'text-yellow-600', icon: Clock },
            { label: 'Tỷ lệ đi học', value: `${attendanceRate}%`, className: 'text-red-600', icon: TrendingUp },
          ].map(stat => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 transition-all duration-300 hover:shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-gray-400" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                </div>
                <p className={`text-2xl font-extrabold ${stat.className}`}>{stat.value}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Punch Card & Active Package Info */}
      {!isLoading && activePackage && (
        <div className="bg-gradient-to-br from-[#180a0a] to-[#2e1111] text-white rounded-3xl p-6 shadow-md border border-white/5 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="space-y-1">
              <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Thẻ tập đang kích hoạt</p>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-red-500" /> {activePackage.packageName}
              </h3>
            </div>
            <div className="text-right text-xs">
              <p className="text-white/50">Hạn sử dụng</p>
              <p className="font-bold">{activePackage.expiresAt ? formatDate(activePackage.expiresAt) : 'Không thời hạn'}</p>
            </div>
          </div>

          {/* Punch Card View (Only for Session Packages) */}
          {isSessionPkg && sessionsTotal > 0 && (
            <div className="space-y-3.5">
              <div className="flex justify-between items-center text-xs">
                <p className="font-semibold text-white/80">Thẻ tích điểm số buổi học ({sessionsUsed}/{sessionsTotal} buổi đã học)</p>
                <p className="text-red-400 font-bold">Còn {sessionsRemaining} buổi</p>
              </div>
              
              {/* Punch Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-3.5">
                {Array.from({ length: sessionsTotal }).map((_, i) => {
                  const isChecked = i < sessionsUsed
                  return (
                    <div
                      key={i}
                      className={`aspect-square rounded-2xl border flex flex-col items-center justify-center relative transition-all duration-300 ${
                        isChecked
                          ? 'bg-red-600/20 border-red-500 text-red-400 font-bold shadow-inner ring-1 ring-red-500/10'
                          : 'bg-white/5 border-white/10 text-white/30'
                      }`}
                    >
                      {isChecked ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 mb-0.5 text-red-500" />
                          <span className="text-[10px]">B.{i + 1}</span>
                        </>
                      ) : (
                        <>
                          <Award className="w-4 h-4 mb-0.5 opacity-20" />
                          <span className="text-[10px] font-medium">{i + 1}</span>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activePackage.packageType === 'monthly' && (
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
              <Calendar className="w-8 h-8 text-red-500 flex-shrink-0" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-white/90">Gói tập tháng không giới hạn số buổi</p>
                <p className="text-white/60">Ngày kích hoạt: {activePackage.activatedAt ? formatDate(activePackage.activatedAt) : 'Chưa kích hoạt'}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Attendance History Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-950 text-sm">Nhật ký đi học</h3>
            <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 font-bold rounded-md uppercase">Lịch sử đầy đủ</span>
          </div>

          {/* Filter Bar */}
          {!isLoading && records.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              {/* Status Tabs */}
              <div className="flex flex-wrap gap-1.5 items-center">
                {[
                  { value: 'all', label: 'Tất cả', count: statusCounts.all, activeClass: 'bg-gray-950 text-white border-gray-950', inactiveClass: 'bg-gray-50 hover:bg-gray-100 text-gray-705 border-gray-200' },
                  { value: 'present', label: 'Có mặt', count: statusCounts.present, activeClass: 'bg-green-600 text-white border-green-600', inactiveClass: 'bg-green-50/50 hover:bg-green-50 text-green-700 border-green-200' },
                  { value: 'late', label: 'Đi trễ', count: statusCounts.late, activeClass: 'bg-yellow-600 text-white border-yellow-600', inactiveClass: 'bg-yellow-50/50 hover:bg-yellow-50 text-yellow-700 border-yellow-200' },
                  { value: 'absent', label: 'Vắng', count: statusCounts.absent, activeClass: 'bg-red-600 text-white border-red-600', inactiveClass: 'bg-red-50/50 hover:bg-red-50 text-red-700 border-red-200' },
                  { value: 'excused', label: 'Có phép', count: statusCounts.excused, activeClass: 'bg-blue-600 text-white border-blue-600', inactiveClass: 'bg-blue-50/50 hover:bg-blue-50 text-blue-700 border-blue-200' },
                ].map(tab => (
                  <button
                    key={tab.value}
                    onClick={() => setStatusFilter(tab.value as any)}
                    className={`px-3 py-1.5 border rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      statusFilter === tab.value ? tab.activeClass : tab.inactiveClass
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${
                      statusFilter === tab.value ? 'bg-white/20 text-white' : 'bg-gray-200/50 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Month Selector */}
              {uniqueMonths.length > 0 && (
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-xs font-bold text-gray-500 whitespace-nowrap">Tháng:</span>
                  <Select value={monthFilter} onValueChange={setMonthFilter}>
                    <SelectTrigger className="w-[150px] bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold h-9 focus:ring-2 focus:ring-red-500/50">
                      <SelectValue placeholder="Chọn tháng" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả các tháng</SelectItem>
                      {uniqueMonths.map(m => (
                        <SelectItem key={m} value={m}>{formatMonthLabel(m)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="animate-pulse h-12 bg-gray-55/70 rounded-xl" />)}
          </div>
        ) : records.length === 0 ? (
          <div className="p-16 text-center">
            <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-semibold">Chưa có lịch sử điểm danh</p>
            <p className="text-gray-400 text-xs mt-1">Thông tin điểm danh của bạn sẽ hiển thị tại đây khi bạn đi tập</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-16 text-center">
            <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-semibold">Không tìm thấy lịch sử phù hợp</p>
            <p className="text-gray-400 text-xs mt-1">Hãy thử thay đổi bộ lọc trạng thái hoặc bộ lọc tháng</p>
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="w-[80px] font-bold text-gray-700 text-xs">STT</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs">Lớp học</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs">Huấn luyện viên</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs">Thời gian buổi học</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs">Trạng thái</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs">Thời gian điểm danh</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs">Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((r) => {
                    const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.absent
                    const StatusIcon = cfg.icon
                    const originalIdx = records.indexOf(r)
                    return (
                      <TableRow key={r.id} className="hover:bg-gray-50/30 transition-colors">
                        <TableCell className="font-bold text-gray-400 text-xs py-3.5">{records.length - originalIdx}</TableCell>
                        <TableCell className="font-bold text-gray-800 text-xs">{r.className}</TableCell>
                        <TableCell className="text-xs text-gray-650 font-medium">{r.coachName ?? '—'}</TableCell>
                        <TableCell className="text-xs text-gray-600 font-semibold">{formatDateTime(r.scheduledAt)}</TableCell>
                        <TableCell className="text-xs">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cfg.className}`}>
                            <StatusIcon className="w-3.5 h-3.5" /> {cfg.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-gray-550">{r.checked_at ? formatDateTime(r.checked_at) : '—'}</TableCell>
                        <TableCell className="text-xs text-gray-400 italic max-w-[150px] truncate" title={r.notes ?? ''}>
                          {r.notes ?? '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden divide-y divide-gray-100">
              {filteredRecords.map((r) => {
                const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.absent
                const StatusIcon = cfg.icon
                const originalIdx = records.indexOf(r)
                return (
                  <div key={r.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-450 font-bold">STT: {records.length - originalIdx}</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cfg.className}`}>
                        <StatusIcon className="w-3.5 h-3.5" /> {cfg.label}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-gray-900">{r.className}</h4>
                      <p className="text-xs text-gray-500 font-medium">HLV: {r.coachName ?? '—'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-550 bg-gray-50/50 p-2.5 rounded-2xl border border-gray-100">
                      <div>
                        <p className="text-gray-400 font-semibold mb-0.5">Thời gian buổi học</p>
                        <p className="font-bold text-gray-700">{formatDateTime(r.scheduledAt)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-semibold mb-0.5">Thời gian điểm danh</p>
                        <p className="font-bold text-gray-700">{r.checked_at ? formatDateTime(r.checked_at) : '—'}</p>
                      </div>
                    </div>

                    {r.notes && (
                      <div className="p-2 bg-red-50/20 border border-red-100/30 rounded-xl text-[10px] text-gray-650 leading-relaxed italic">
                        Ghi chú: {r.notes}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
