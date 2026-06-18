import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar, CreditCard, TrendingUp, AlertTriangle,
  CheckCircle2, XCircle, Clock, ChevronRight,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { formatDate } from '@/lib/utils'
import type { SkillScores } from '@/types'

interface ActiveCard {
  id: string
  package_name: string | null
  sessions_remaining: number | null
  sessions_total: number | null
  expires_at: string | null
  package_type: string | null
  alert_level: string | null
  days_remaining: number | null
}

interface RecentAttendance {
  id: string
  status: 'present' | 'absent' | 'late' | 'excused'
  checked_at: string
  className: string
}

interface NextSession {
  id: string
  scheduled_at: string
  class_name: string
  court_name: string | null
}

interface Stats {
  total: number
  present: number
  late: number
}

interface LatestSkills {
  skills: Partial<SkillScores>
  overall_score: number | null
  evaluated_at: string
}

const STATUS_ICON = {
  present: CheckCircle2,
  absent:  XCircle,
  late:    Clock,
  excused: Calendar,
}
const STATUS_COLOR = {
  present: 'text-green-600 bg-green-50',
  absent:  'text-red-500 bg-red-50',
  late:    'text-yellow-600 bg-yellow-50',
  excused: 'text-blue-600 bg-blue-50',
}
const STATUS_LABEL = {
  present: 'Có mặt',
  absent:  'Vắng',
  late:    'Trễ',
  excused: 'Phép',
}

export default function StudentDashboardPage() {
  const { profile } = useAuthContext()
  const navigate = useNavigate()
  const [activeCard, setActiveCard] = useState<ActiveCard | null>(null)
  const [recentAttendance, setRecentAttendance] = useState<RecentAttendance[]>([])
  const [nextSession, setNextSession] = useState<NextSession | null>(null)
  const [stats, setStats] = useState<Stats>({ total: 0, present: 0, late: 0 })
  const [latestSkills, setLatestSkills] = useState<LatestSkills | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!profile) return

    async function fetchData() {
      // Step 1: get student record
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

      // Step 2: get class IDs the student is enrolled in
      const { data: classData } = await supabase
        .from('class_students')
        .select('class_id')
        .eq('student_id', student.id)
        .eq('status', 'active')

      const classIds = ((classData ?? []) as Array<{ class_id: string }>).map(c => c.class_id)

      // Step 3: parallel fetches
      const [cardRes, attendanceRes, nextSessionRes, statsRes, skillsRes] = await Promise.all([
        // Active package
        supabase
          .from('active_student_packages')
          .select('id, package_name, sessions_remaining, sessions_total, expires_at, package_type, alert_level, days_remaining')
          .eq('student_id', student.id)
          .order('activated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),

        // Recent attendance (last 5)
        supabase
          .from('attendance')
          .select('id, status, checked_at, sessions(class_id, classes(name))')
          .eq('student_id', student.id)
          .order('checked_at', { ascending: false })
          .limit(5),

        // Next upcoming session
        classIds.length > 0
          ? supabase
            .from('sessions_with_details')
            .select('id, scheduled_at, class_name, court_name')
            .in('class_id', classIds)
            .gte('scheduled_at', new Date().toISOString())
            .neq('status', 'cancelled')
            .order('scheduled_at', { ascending: true })
            .limit(1)
            .maybeSingle()
          : Promise.resolve({ data: null, error: null }),

        // Attendance stats (all time)
        supabase
          .from('attendance')
          .select('status')
          .eq('student_id', student.id),

        // Latest skill evaluation
        supabase
          .from('progress_evaluations')
          .select('skills, overall_score, created_at')
          .eq('student_id', student.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      // Active card
      if (!cardRes.error) {
        setActiveCard(cardRes.data as ActiveCard | null)
      }

      // Recent attendance
      if (!attendanceRes.error) {
        const rows: RecentAttendance[] = ((attendanceRes.data ?? []) as unknown[]).map((raw: unknown) => {
          const r = raw as Record<string, unknown>
          const sess = r.sessions as Record<string, unknown> | null
          const cls  = sess?.classes as Record<string, unknown> | null
          return {
            id:        r.id as string,
            status:    r.status as RecentAttendance['status'],
            checked_at: r.checked_at as string,
            className: (cls?.name as string) ?? '—',
          }
        })
        setRecentAttendance(rows)
      }

      // Next session
      if (!nextSessionRes.error && nextSessionRes.data) {
        const s = nextSessionRes.data as Record<string, unknown>
        setNextSession({
          id:           s.id as string,
          scheduled_at: s.scheduled_at as string,
          class_name:   s.class_name as string,
          court_name:   s.court_name as string | null,
        })
      }

      // Stats
      if (!statsRes.error) {
        const all = (statsRes.data ?? []) as Array<{ status: string }>
        setStats({
          total:   all.length,
          present: all.filter(a => a.status === 'present').length,
          late:    all.filter(a => a.status === 'late').length,
        })
      }

      // Latest skills
      if (!skillsRes.error && skillsRes.data) {
        const s = skillsRes.data as Record<string, unknown>
        setLatestSkills({
          skills:        (s.skills as Partial<SkillScores>) ?? {},
          overall_score: s.overall_score as number | null,
          evaluated_at:  s.created_at as string,
        })
      }

      setIsLoading(false)
    }

    fetchData()
  }, [profile])

  const attendanceRate = stats.total > 0
    ? Math.round(((stats.present + stats.late) / stats.total) * 100)
    : 0

  const ALERT_GRADIENT: Record<string, string> = {
    ok:       'from-primary-600 to-primary-800',
    warning:  'from-yellow-500 to-orange-600',
    critical: 'from-red-600 to-red-800',
  }
  const alertLevel = activeCard?.alert_level ?? 'ok'
  const gradientClass = ALERT_GRADIENT[alertLevel] ?? ALERT_GRADIENT.ok

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          Xin chào, {profile?.full_name} 👋
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">Chào mừng trở lại Thái Phong Badminton Class</p>
      </div>

      {/* Active membership card */}
      {isLoading ? (
        <div className="animate-pulse h-40 bg-gray-100 rounded-2xl" />
      ) : activeCard ? (
        <div
          className={`bg-gradient-to-br ${gradientClass} rounded-2xl p-5 text-white shadow-md relative overflow-hidden`}
        >
          {/* Decorative lines */}
          <div className="absolute right-0 top-0 w-40 h-full opacity-10 pointer-events-none">
            <div className="absolute right-4  top-0 bottom-0 border-r border-white" />
            <div className="absolute right-16 top-0 bottom-0 border-r border-white" />
          </div>

          {alertLevel !== 'ok' && (
            <div className="flex items-center gap-1.5 bg-white/20 rounded-lg px-3 py-1.5 mb-3 w-fit">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">
                {alertLevel === 'critical' ? 'Thẻ sắp hết!' : 'Sắp hết hạn'}
              </span>
            </div>
          )}

          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/70 text-xs">Gói hiện tại</p>
              <p className="text-white font-bold text-lg mt-0.5">{activeCard.package_name}</p>
            </div>
            <CreditCard className="w-6 h-6 text-white/50" />
          </div>

          <div className="flex gap-6 mt-4">
            {activeCard.package_type === 'session' && activeCard.sessions_total !== null && (
              <div>
                <p className="text-white/70 text-xs">Buổi còn lại</p>
                <p className="text-white font-bold text-xl">
                  {activeCard.sessions_remaining ?? 0}
                  <span className="text-sm font-normal text-white/60"> / {activeCard.sessions_total}</span>
                </p>
              </div>
            )}
            {activeCard.expires_at && (
              <div>
                <p className="text-white/70 text-xs">Hết hạn</p>
                <p className="text-white font-bold text-xl">{formatDate(activeCard.expires_at)}</p>
                {activeCard.days_remaining !== null && (
                  <p className="text-white/60 text-xs">còn {activeCard.days_remaining} ngày</p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
          <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Bạn chưa có thẻ học đang hoạt động</p>
          <p className="text-gray-400 text-xs mt-1">Liên hệ Admin để được cấp thẻ</p>
        </div>
      )}

      {/* KPI stats */}
      {!isLoading && stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Đã học',     value: stats.total,         color: 'text-gray-900' },
            { label: 'Có mặt',    value: stats.present,        color: 'text-green-600' },
            { label: 'Trễ',        value: stats.late,          color: 'text-yellow-600' },
            { label: 'Chuyên cần', value: `${attendanceRate}%`, color: 'text-primary-700' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Skill bars from latest evaluation */}
      {!isLoading && latestSkills && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Kỹ năng</h3>
            <button
              onClick={() => navigate('/student/progress')}
              className="text-xs text-primary-700 hover:text-primary-800 flex items-center gap-0.5"
            >
              Chi tiết <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2.5">
            {(
              [
                { key: 'technique' as keyof SkillScores, label: 'Kỹ thuật',   color: 'bg-blue-500' },
                { key: 'footwork'  as keyof SkillScores, label: 'Di chuyển',  color: 'bg-court-500' },
                { key: 'tactics'   as keyof SkillScores, label: 'Chiến thuật', color: 'bg-purple-500' },
                { key: 'fitness'   as keyof SkillScores, label: 'Thể lực',    color: 'bg-orange-500' },
              ] as Array<{ key: keyof SkillScores; label: string; color: string }>
            ).map(({ key, label, color }) => {
              const val = latestSkills.skills[key] ?? 0
              return (
                <div key={key}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-600">{label}</span>
                    <span className="text-xs font-semibold text-gray-900">{val}/100</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full transition-all`}
                      style={{ width: `${val as number}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          {latestSkills.overall_score !== null && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">Điểm tổng · {formatDate(latestSkills.evaluated_at)}</span>
              <span className="text-sm font-bold text-primary-700">{latestSkills.overall_score}/100</span>
            </div>
          )}
        </div>
      )}

      {/* Next session */}
      {!isLoading && nextSession && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="bg-court-50 p-2.5 rounded-xl flex-shrink-0">
            <Calendar className="w-5 h-5 text-court-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">Buổi học tiếp theo</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{nextSession.class_name}</p>
            <p className="text-xs text-gray-500">
              {formatDate(nextSession.scheduled_at)}
              {nextSession.court_name ? ` · ${nextSession.court_name}` : ''}
            </p>
          </div>
          <button
            onClick={() => navigate('/student/schedule')}
            className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick nav (when no attendance data yet) */}
      {!isLoading && stats.total === 0 && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/student/schedule')}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="bg-court-50 p-2.5 rounded-xl">
              <Calendar className="w-5 h-5 text-court-700" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Lịch học</p>
              <p className="text-sm font-semibold text-gray-900">Xem lịch</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/student/progress')}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="bg-purple-50 p-2.5 rounded-xl">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Tiến độ</p>
              <p className="text-sm font-semibold text-gray-900">Xem đánh giá</p>
            </div>
          </button>
        </div>
      )}

      {/* Recent attendance */}
      {!isLoading && recentAttendance.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Điểm danh gần đây</h3>
            <button
              onClick={() => navigate('/student/attendance')}
              className="text-xs text-primary-700 hover:text-primary-800 flex items-center gap-0.5"
            >
              Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
            {recentAttendance.map(r => {
              const StatusIcon = STATUS_ICON[r.status] ?? CheckCircle2
              const colorClass = STATUS_COLOR[r.status] ?? STATUS_COLOR.present
              return (
                <div key={r.id} className="flex items-center gap-3 p-3.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <StatusIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{r.className}</p>
                    <p className="text-xs text-gray-400">{formatDate(r.checked_at)}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorClass}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
