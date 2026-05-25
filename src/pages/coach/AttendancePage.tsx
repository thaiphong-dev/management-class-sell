import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, CalendarCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { formatDateTime } from '@/lib/utils'

interface PendingSession {
  id: string
  class_id: string
  scheduled_at: string
  duration_min: number
  status: string
  className: string
  attendanceCount: number
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  scheduled:   { label: 'Lịch học',   className: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'Đang học',   className: 'bg-yellow-100 text-yellow-700' },
  completed:   { label: 'Hoàn thành', className: 'bg-green-100 text-green-700' },
  cancelled:   { label: 'Đã hủy',     className: 'bg-red-100 text-red-700' },
}

export default function CoachAttendancePage() {
  const { profile } = useAuthContext()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<PendingSession[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!profile) return

    async function loadSessions() {
      // Get the coach record
      const { data: coachData, error: coachError } = await supabase
        .from('coaches')
        .select('id')
        .eq('user_id', profile!.id)
        .maybeSingle()

      if (coachError) {
        console.error('Failed to fetch coach record:', coachError.message)
        setIsLoading(false)
        return
      }
      const coach = coachData as { id: string } | null
      if (!coach) { setIsLoading(false); return }

      // Get coach's active class IDs
      const { data: classData } = await supabase
        .from('classes')
        .select('id')
        .eq('coach_id', coach.id)
        .eq('status', 'active')

      const classIds = ((classData ?? []) as { id: string }[]).map(c => c.id)
      if (classIds.length === 0) { setIsLoading(false); return }

      // Get sessions from last 7 days + next 7 days (not cancelled)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const sevenDaysAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

      const sessionsRes = await supabase.from('sessions')
        .select('id, class_id, scheduled_at, duration_min, status, classes(name)')
        .in('class_id', classIds)
        .neq('status', 'cancelled')
        .gte('scheduled_at', sevenDaysAgo)
        .lte('scheduled_at', sevenDaysAhead)
        .order('scheduled_at', { ascending: false })

      if (sessionsRes.error) {
        console.error('Failed to load sessions:', sessionsRes.error.message)
        toast({ title: 'Lỗi tải dữ liệu', description: sessionsRes.error.message, variant: 'destructive' })
        setIsLoading(false)
        return
      }

      const sessionList = (sessionsRes.data ?? []) as unknown[]
      const sessionIds = sessionList.map((s: unknown) => (s as Record<string, unknown>).id as string)

      // Re-fetch attendance count per session
      const { data: attData } = sessionIds.length > 0
        ? await supabase.from('attendance').select('session_id').in('session_id', sessionIds)
        : { data: [] }

      const attCountMap = new Map<string, number>()
      for (const a of (attData ?? []) as { session_id: string }[]) {
        attCountMap.set(a.session_id, (attCountMap.get(a.session_id) ?? 0) + 1)
      }

      const rows: PendingSession[] = sessionList.map((raw: unknown) => {
        const r = raw as Record<string, unknown>
        const cls = r.classes as { name?: string } | null
        return {
          id: r.id as string,
          class_id: r.class_id as string,
          scheduled_at: r.scheduled_at as string,
          duration_min: r.duration_min as number,
          status: r.status as string,
          className: cls?.name ?? '—',
          attendanceCount: attCountMap.get(r.id as string) ?? 0,
        }
      })

      setSessions(rows)
      setIsLoading(false)
    }

    loadSessions()
  }, [profile, toast])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Điểm danh</h2>
        <p className="text-sm text-gray-500 mt-0.5">Các buổi học trong 7 ngày qua và sắp tới</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {[1,2,3].map(i => <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-xl" />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Không có buổi học nào trong khoảng thời gian này</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sessions.map(s => {
              const statusCfg = STATUS_LABELS[s.status] ?? STATUS_LABELS.scheduled
              const hasTaken = s.attendanceCount > 0
              return (
                <div key={s.id} className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-4 h-4 text-primary-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.className}</p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(s.scheduled_at)} · {s.duration_min} phút
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.className}`}>
                      {statusCfg.label}
                    </span>
                    {hasTaken ? (
                      <span className="text-xs text-green-600 font-medium">{s.attendanceCount} HV ✓</span>
                    ) : (
                      <span className="text-xs text-gray-400">Chưa điểm</span>
                    )}
                    {s.status !== 'cancelled' && (
                      <button
                        onClick={() => navigate(`/coach/classes/${s.class_id}/sessions/${s.id}/attendance`)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                      >
                        Điểm danh
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
