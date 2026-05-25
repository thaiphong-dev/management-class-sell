import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Calendar, ChevronRight, ClipboardList } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { formatDate, formatDateTime } from '@/lib/utils'

interface UpcomingSession {
  id: string
  class_id: string
  scheduled_at: string
  class_name: string | null
  court_name: string | null
  status: string
}

interface DayGroup {
  dateKey: string          // YYYY-MM-DD
  label: string            // "Hôm nay", "Ngày mai", or "Th2, 26/05"
  sessions: UpcomingSession[]
}

const DOW_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

function getDayLabel(dateKey: string, todayKey: string, tomorrowKey: string): string {
  if (dateKey === todayKey)     return 'Hôm nay'
  if (dateKey === tomorrowKey)  return 'Ngày mai'
  const d = new Date(dateKey)
  return `${DOW_SHORT[d.getDay()]}, ${formatDate(dateKey)}`
}

function toDateKey(iso: string): string {
  return iso.slice(0, 10) // YYYY-MM-DD
}

export default function CoachDashboardPage() {
  const { profile } = useAuthContext()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [myClassCount, setMyClassCount] = useState(0)
  const [nextSession, setNextSession] = useState<UpcomingSession | null>(null)
  const [weekSessions, setWeekSessions] = useState<UpcomingSession[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!profile) return

    async function fetchData() {
      const { data: coachData, error: coachError } = await supabase
        .from('coaches')
        .select('id')
        .eq('user_id', profile!.id)
        .maybeSingle()

      if (coachError) {
        console.error('Failed to fetch coach record:', coachError.message)
        toast({ title: 'Lỗi tải dữ liệu', description: 'Không thể tải thông tin HLV.', variant: 'destructive' })
        setIsLoading(false)
        return
      }
      const coach = coachData as { id: string } | null
      if (!coach) { setIsLoading(false); return }

      // Step 2: get class_ids this coach owns
      const { data: classData } = await supabase
        .from('classes')
        .select('id')
        .eq('coach_id', coach.id)
        .eq('status', 'active')

      const classIds = ((classData ?? []) as Array<{ id: string }>).map(c => c.id)
      const classCount = classIds.length

      if (classIds.length === 0) {
        setMyClassCount(classCount)
        setIsLoading(false)
        return
      }

      const now = new Date()
      const weekEnd = new Date(now)
      weekEnd.setDate(weekEnd.getDate() + 7)

      const [sessionsRes] = await Promise.all([
        supabase
          .from('sessions_with_details')
          .select('id, class_id, scheduled_at, class_name, court_name, status')
          .in('class_id', classIds)
          .gte('scheduled_at', now.toISOString())
          .lt('scheduled_at', weekEnd.toISOString())
          .neq('status', 'cancelled')
          .order('scheduled_at', { ascending: true }),
      ])

      if (sessionsRes.error) {
        console.error('Failed to fetch sessions:', sessionsRes.error.message)
        toast({ title: 'Lỗi tải dữ liệu', description: 'Không thể tải lịch buổi học.', variant: 'destructive' })
      }

      const sessions = (sessionsRes.data ?? []) as UpcomingSession[]
      setMyClassCount(classCount)
      setNextSession(sessions[0] ?? null)
      setWeekSessions(sessions)
      setIsLoading(false)
    }

    fetchData()
  }, [profile, toast])

  // Build day groups for 7-day schedule
  const today = new Date()
  const todayKey    = toDateKey(today.toISOString())
  const tomorrowKey = toDateKey(new Date(today.getTime() + 86_400_000).toISOString())

  const dayGroups: DayGroup[] = []
  for (const s of weekSessions) {
    const key = toDateKey(s.scheduled_at)
    const existing = dayGroups.find(g => g.dateKey === key)
    if (existing) {
      existing.sessions.push(s)
    } else {
      dayGroups.push({
        dateKey: key,
        label: getDayLabel(key, todayKey, tomorrowKey),
        sessions: [s],
      })
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Xin chào, {profile?.full_name} 👋</h2>
        <p className="text-sm text-gray-500 mt-0.5">Đây là lịch dạy của bạn</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="bg-court-50 p-2.5 rounded-xl">
            <BookOpen className="w-5 h-5 text-court-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{isLoading ? '—' : myClassCount}</p>
            <p className="text-xs text-gray-500">Lớp đang dạy</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="bg-primary-50 p-2.5 rounded-xl">
            <Calendar className="w-5 h-5 text-primary-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{isLoading ? '—' : weekSessions.length}</p>
            <p className="text-xs text-gray-500">Buổi trong 7 ngày</p>
          </div>
        </div>
      </div>

      {/* Next session card */}
      {!isLoading && nextSession && (
        <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-5 text-white shadow-md">
          <p className="text-white/70 text-xs mb-1">Buổi học tiếp theo</p>
          <p className="font-bold text-lg leading-snug">{nextSession.class_name ?? '—'}</p>
          <p className="text-white/80 text-sm mt-1">{formatDateTime(nextSession.scheduled_at)}</p>
          {nextSession.court_name && (
            <p className="text-white/60 text-xs mt-0.5">{nextSession.court_name}</p>
          )}
          <button
            onClick={() => navigate(`/coach/classes/${nextSession.class_id}/sessions`)}
            className="mt-3 flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            Xem buổi học <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 7-day schedule */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">Lịch 7 ngày tới</h3>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse h-12 bg-gray-100 rounded-xl" />
            ))}
          </div>
        ) : dayGroups.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Không có buổi học nào trong 7 ngày tới</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {dayGroups.map(group => (
              <div key={group.dateKey}>
                {/* Day header */}
                <div className="px-4 py-2 bg-gray-50/70">
                  <span className={`text-xs font-semibold ${
                    group.dateKey === todayKey ? 'text-primary-700' : 'text-gray-500'
                  }`}>
                    {group.label}
                  </span>
                </div>
                {/* Sessions in this day */}
                {group.sessions.map(s => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/coach/classes/${s.class_id}/sessions`)}
                  >
                    <div className="w-1.5 h-8 rounded-full bg-primary-200 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.class_name ?? '—'}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(s.scheduled_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        {s.court_name ? ` · ${s.court_name}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        navigate(`/coach/classes/${s.class_id}/sessions/${s.id}/attendance`)
                      }}
                      className="flex-shrink-0 text-xs bg-primary-50 text-primary-700 hover:bg-primary-100 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      Điểm danh
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
