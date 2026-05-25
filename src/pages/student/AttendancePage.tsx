import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Clock, BookOpen, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'

interface AttendanceRecord {
  id: string
  checked_at: string
  status: 'present' | 'absent' | 'late' | 'excused'
  className: string
  scheduledAt: string
  coachName: string | null
  notes: string | null
}

const STATUS_CONFIG = {
  present: { label: 'Có mặt', icon: CheckCircle2, className: 'bg-green-100 text-green-700' },
  absent:  { label: 'Vắng',   icon: XCircle,      className: 'bg-red-100 text-red-700' },
  late:    { label: 'Trễ',    icon: Clock,         className: 'bg-yellow-100 text-yellow-700' },
  excused: { label: 'Phép',   icon: BookOpen,      className: 'bg-blue-100 text-blue-700' },
}

export default function StudentAttendancePage() {
  const { profile } = useAuthContext()
  const { toast } = useToast()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!profile) return

    async function loadAttendance() {
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', profile!.id)
        .maybeSingle()

      if (studentError) {
        console.error('Failed to fetch student record:', studentError.message)
        setIsLoading(false)
        return
      }
      const student = studentData as { id: string } | null
      if (!student) { setIsLoading(false); return }

      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id, status, checked_at, notes,
          sessions(scheduled_at, class_id,
            classes(name,
              coaches(user_id, profiles(full_name))
            )
          )
        `)
        .eq('student_id', student.id)
        .order('checked_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Failed to load attendance:', error.message)
        toast({ title: 'Lỗi tải điểm danh', description: error.message, variant: 'destructive' })
        setIsLoading(false)
        return
      }

      const rows: AttendanceRecord[] = ((data ?? []) as unknown[]).map((raw: unknown) => {
        const r = raw as Record<string, unknown>
        const session = r.sessions as Record<string, unknown> | null
        const cls = session?.classes as Record<string, unknown> | null
        const coachRec = cls?.coaches as Record<string, unknown> | null
        const coachProfile = coachRec?.profiles as { full_name?: string } | null
        return {
          id:          r.id as string,
          checked_at:  r.checked_at as string,
          status:      r.status as AttendanceRecord['status'],
          className:   (cls?.name as string) ?? '—',
          scheduledAt: (session?.scheduled_at as string) ?? (r.checked_at as string),
          coachName:   coachProfile?.full_name ?? null,
          notes:       r.notes as string | null,
        }
      })

      setRecords(rows)
      setIsLoading(false)
    }

    loadAttendance()
  }, [profile, toast])

  const presentCount = records.filter(r => r.status === 'present').length
  const lateCount    = records.filter(r => r.status === 'late').length
  const total        = records.length
  const attendanceRate = total > 0 ? Math.round(((presentCount + lateCount) / total) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Điểm danh</h2>
        <p className="text-sm text-gray-500 mt-0.5">Lịch sử tham dự buổi học của bạn</p>
      </div>

      {/* Stats */}
      {!isLoading && total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Tổng buổi',   value: total,       className: 'text-gray-900' },
            { label: 'Có mặt',      value: presentCount, className: 'text-green-600' },
            { label: 'Trễ',         value: lateCount,    className: 'text-yellow-600' },
            { label: 'Tỷ lệ',       value: `${attendanceRate}%`, className: 'text-primary-700' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
              <p className={`text-xl font-bold ${stat.className}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Records list */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="animate-pulse h-14 bg-gray-100 rounded-xl" />)}
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Chưa có lịch sử điểm danh</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {records.map(r => {
              const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.absent
              const Icon = cfg.icon
              return (
                <div key={r.id} className="flex items-center gap-3 p-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.className}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{r.className}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(r.scheduledAt)}
                      {r.coachName ? ` · HLV: ${r.coachName}` : ''}
                    </p>
                    {r.notes && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{r.notes}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${cfg.className}`}>
                    {cfg.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
