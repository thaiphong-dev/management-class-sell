import { useEffect, useState } from 'react'
import { CalendarClock, Clock, MapPin, BookOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

interface ScheduleSession {
  id: string
  scheduled_at: string
  duration_min: number
  status: string
  className: string
  facilityName: string | null
  courtName: string | null
  coachName: string | null
}

interface EnrolledClass {
  class_id: string
  className: string | null
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  scheduled:   { label: 'Lịch học',    className: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'Đang học',    className: 'bg-yellow-100 text-yellow-700' },
  completed:   { label: 'Hoàn thành',  className: 'bg-green-100 text-green-700' },
  cancelled:   { label: 'Đã hủy',      className: 'bg-red-100 text-red-700' },
}

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

export default function StudentSchedulePage({ studentId }: { studentId?: string }) {
  const { profile } = useAuthContext()
  const { toast } = useToast()
  const [sessions, setSessions] = useState<ScheduleSession[]>([])
  const [enrolledClasses, setEnrolledClasses] = useState<EnrolledClass[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!profile) return

    async function loadSchedule() {
      let resolvedStudentId = studentId

      if (!resolvedStudentId) {
        const { data: studentData, error: studentError } = await (supabase
          .from('students') as any)
          .select('id')
          .eq('user_id', profile!.id)
          .maybeSingle()

        if (studentError) {
          console.error('Failed to fetch student record:', studentError.message)
          setIsLoading(false)
          return
        }
        resolvedStudentId = studentData?.id
      }

      if (!resolvedStudentId) { setIsLoading(false); return }

      // Get student's active class IDs + class names
      const { data: classData } = await (supabase
        .from('class_students') as any)
        .select('class_id, classes(name)')
        .eq('student_id', resolvedStudentId)
        .eq('status', 'active')

      const classRows = (classData ?? []) as Array<{ class_id: string; classes: { name?: string } | null }>
      const classIds = classRows.map(c => c.class_id)
      setEnrolledClasses(classRows.map(c => ({
        class_id: c.class_id,
        className: c.classes?.name ?? null,
      })))
      if (classIds.length === 0) { setIsLoading(false); return }

      // Get upcoming sessions for these classes
      const { data, error } = await supabase
        .from('sessions_with_details')
        .select('id, scheduled_at, duration_min, status, class_name, facility_name, court_name, coach_name')
        .in('class_id', classIds)
        .gte('scheduled_at', new Date().toISOString())
        .neq('status', 'cancelled')
        .order('scheduled_at', { ascending: true })
        .limit(50)

      if (error) {
        console.error('Failed to load schedule:', error.message)
        toast({ title: 'Lỗi tải lịch học', description: error.message, variant: 'destructive' })
      } else {
        setSessions(((data ?? []) as unknown[]).map((raw: unknown) => {
          const r = raw as Record<string, unknown>
          return {
            id:           r.id as string,
            scheduled_at: r.scheduled_at as string,
            duration_min: r.duration_min as number,
            status:       r.status as string,
            className:    (r.class_name as string) ?? '—',
            facilityName: r.facility_name as string | null,
            courtName:    r.court_name as string | null,
            coachName:    r.coach_name as string | null,
          }
        }))
      }
      setIsLoading(false)
    }

    loadSchedule()
  }, [profile, toast, studentId])

  const grouped = groupByDate(sessions)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Lịch học</h2>
        <p className="text-sm text-gray-500 mt-0.5">Các buổi học sắp tới của bạn</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="animate-pulse h-20 bg-gray-100 rounded-2xl" />)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="space-y-4">
          {enrolledClasses.length > 0 ? (
            /* Enrolled but no upcoming sessions yet */
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-court-700" />
                <h3 className="text-sm font-semibold text-gray-700">Lớp đang theo học</h3>
              </div>
              <div className="space-y-2">
                {enrolledClasses.map(cls => (
                  <div key={cls.class_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-2 h-2 rounded-full bg-court-500 flex-shrink-0" />
                    <p className="text-sm text-gray-800">{cls.className ?? '—'}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">
                Bạn đã được thêm vào lớp. Lịch buổi học sẽ hiện ở đây khi HLV tạo buổi học mới.
              </p>
            </div>
          ) : (
            /* Not enrolled in any class */
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
              <CalendarClock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Bạn chưa được thêm vào lớp học nào</p>
              <p className="text-gray-400 text-xs mt-1">Liên hệ Admin để được xếp lớp</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {Array.from(grouped.entries()).map(([date, list]) => (
            <div key={date}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                {date}
              </h3>
              <div className="space-y-2">
                {list.map(s => {
                  const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.scheduled
                  return (
                    <div key={s.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{s.className}</p>
                          {s.coachName && (
                            <p className="text-xs text-gray-500 mt-0.5">HLV: {s.coachName}</p>
                          )}
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${cfg.className}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-3">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>
                            {new Date(s.scheduled_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            {' · '}{s.duration_min} phút
                          </span>
                        </div>
                        {(s.facilityName || s.courtName) && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            <span>
                              {[s.facilityName, s.courtName].filter(Boolean).join(' / ')}
                            </span>
                          </div>
                        )}
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
  )
}
