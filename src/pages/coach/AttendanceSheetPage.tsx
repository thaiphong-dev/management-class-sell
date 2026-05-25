import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { formatDateTime, formatDate } from '@/lib/utils'
import type { AttendanceStatus } from '@/types'

interface StudentRow {
  studentId: string        // students.id
  profileId: string        // profiles.id (for checked_by)
  name: string
  status: AttendanceStatus | null
  sessionsRemaining: number | null
  expiresAt: string | null
  packageType: string | null
  alertLevel: string | null
}

interface SessionInfo {
  id: string
  scheduled_at: string
  duration_min: number
  status: string
  className: string
}

const STATUS_BUTTONS: { value: AttendanceStatus; label: string; className: string; activeClass: string }[] = [
  { value: 'present', label: 'Có mặt', className: 'border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700', activeClass: 'border-green-500 bg-green-50 text-green-700 font-semibold' },
  { value: 'absent',  label: 'Vắng',   className: 'border-gray-200 text-gray-600 hover:border-red-400 hover:text-red-700',   activeClass: 'border-red-500 bg-red-50 text-red-700 font-semibold' },
  { value: 'late',    label: 'Trễ',    className: 'border-gray-200 text-gray-600 hover:border-yellow-400 hover:text-yellow-700', activeClass: 'border-yellow-500 bg-yellow-50 text-yellow-700 font-semibold' },
  { value: 'excused', label: 'Phép',   className: 'border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-700',  activeClass: 'border-blue-500 bg-blue-50 text-blue-700 font-semibold' },
]

export default function CoachAttendanceSheetPage() {
  const { classId, sessionId } = useParams<{ classId: string; sessionId: string }>()
  const { profile } = useAuthContext()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [session, setSession] = useState<SessionInfo | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    if (!classId || !sessionId || !profile) return

    // ── BUG-P3-001: Verify this class belongs to the logged-in coach ──────────
    const coachRes = await supabase
      .from('coaches')
      .select('id')
      .eq('user_id', profile.id)
      .maybeSingle()

    if (coachRes.error || !coachRes.data) {
      toast({ title: 'Không có quyền truy cập', description: 'Tài khoản không phải HLV.', variant: 'destructive' })
      navigate('/coach/classes')
      return
    }
    const coachId = (coachRes.data as { id: string }).id

    const classRes = await supabase
      .from('classes')
      .select('id, coach_id')
      .eq('id', classId)
      .maybeSingle()

    if (classRes.error || !classRes.data) {
      toast({ title: 'Không tìm thấy lớp học', variant: 'destructive' })
      navigate('/coach/classes')
      return
    }
    const classRow = classRes.data as { id: string; coach_id: string }
    if (classRow.coach_id !== coachId) {
      toast({ title: 'Không có quyền truy cập', description: 'Lớp học này không thuộc quyền quản lý của bạn.', variant: 'destructive' })
      navigate('/coach/classes')
      return
    }

    // ── BUG-P3-002: Verify the session belongs to this class ─────────────────
    const [sessionRes, classStudentsRes, attendanceRes] = await Promise.all([
      supabase.from('sessions')
        .select('id, scheduled_at, duration_min, status, classes(name)')
        .eq('id', sessionId)
        .eq('class_id', classId)   // ← ensures session belongs to this class
        .maybeSingle(),
      supabase.from('class_students')
        .select('student_id, students(id, user_id, profiles(id, full_name))')
        .eq('class_id', classId)
        .eq('status', 'active'),
      supabase.from('attendance')
        .select('student_id, status')
        .eq('session_id', sessionId),
    ])

    if (sessionRes.error || !sessionRes.data) {
      toast({ title: 'Không tìm thấy buổi học', description: 'Buổi học không tồn tại hoặc không thuộc lớp này.', variant: 'destructive' })
      navigate(`/coach/classes/${classId}/sessions`)
      return
    }

    const raw = sessionRes.data as Record<string, unknown>
    const cls = raw.classes as { name?: string } | null
    setSession({
      id: raw.id as string,
      scheduled_at: raw.scheduled_at as string,
      duration_min: raw.duration_min as number,
      status: raw.status as string,
      className: cls?.name ?? '—',
    })

    // Build student ID list for package query
    const csRows = ((classStudentsRes.data ?? []) as unknown[]).map((r: unknown) => {
      const row = r as Record<string, unknown>
      const student = row.students as Record<string, unknown> | null
      const profileData = student?.profiles as Record<string, unknown> | null
      return {
        studentId:  student?.id as string,
        profileId:  profileData?.id as string,
        name:       (profileData?.full_name as string) ?? '—',
      }
    }).filter(r => r.studentId)

    const studentIds = csRows.map(r => r.studentId)

    // Load active packages for these students
    const packagesRes = studentIds.length > 0
      ? await supabase.from('active_student_packages')
          .select('student_id, sessions_remaining, expires_at, package_type, alert_level')
          .in('student_id', studentIds)
      : { data: [], error: null }

    // Build attendance map
    const attendanceMap = new Map<string, AttendanceStatus>()
    for (const a of (attendanceRes.data ?? []) as { student_id: string; status: AttendanceStatus }[]) {
      attendanceMap.set(a.student_id, a.status)
    }

    // Build packages map
    const packagesMap = new Map<string, { sessions_remaining: number | null; expires_at: string | null; package_type: string | null; alert_level: string | null }>()
    for (const p of (packagesRes.data ?? []) as { student_id: string; sessions_remaining: number | null; expires_at: string | null; package_type: string | null; alert_level: string | null }[]) {
      if (!packagesMap.has(p.student_id)) packagesMap.set(p.student_id, p)
    }

    setStudents(csRows.map(r => {
      const pkg = packagesMap.get(r.studentId)
      return {
        ...r,
        status: attendanceMap.get(r.studentId) ?? null,
        sessionsRemaining: pkg?.sessions_remaining ?? null,
        expiresAt: pkg?.expires_at ?? null,
        packageType: pkg?.package_type ?? null,
        alertLevel: pkg?.alert_level ?? null,
      }
    }))

    setIsLoading(false)
  }, [classId, sessionId, profile, toast, navigate])

  useEffect(() => {
    if (profile) loadData()
  }, [profile, loadData])

  function toggleStatus(studentId: string, status: AttendanceStatus) {
    setStudents(prev => prev.map(s =>
      s.studentId === studentId ? { ...s, status: s.status === status ? null : status } : s
    ))
  }

  async function saveAttendance() {
    if (!sessionId || !profile) return
    const marked = students.filter(s => s.status !== null)
    if (marked.length === 0) {
      toast({ title: 'Chưa có dữ liệu', description: 'Hãy điểm danh ít nhất một học viên.', variant: 'destructive' })
      return
    }
    setSaving(true)

    const records = marked.map(s => ({
      session_id:  sessionId,
      student_id:  s.studentId,
      status:      s.status as AttendanceStatus,
      checked_by:  profile.id,
      checked_at:  new Date().toISOString(),
    }))

    const { error } = await supabase.from('attendance').upsert(records as never, {
      onConflict: 'session_id,student_id',
    })

    if (error) {
      console.error('Failed to save attendance:', error.message)
      toast({ title: 'Lỗi lưu điểm danh', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Đã lưu điểm danh', description: `${marked.length} học viên đã được cập nhật.` })
      // Reload to reflect latest state after triggers run
      await loadData()
    }
    setSaving(false)
  }

  const presentCount = students.filter(s => s.status === 'present' || s.status === 'late').length
  const absentCount  = students.filter(s => s.status === 'absent').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/coach/classes/${classId}/sessions`)}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">Điểm danh</h2>
          {session && (
            <p className="text-sm text-gray-500 mt-0.5">
              {session.className} · {formatDateTime(session.scheduled_at)}
            </p>
          )}
        </div>
        <Button
          onClick={saveAttendance}
          disabled={saving || isLoading}
          className="bg-primary-600 hover:bg-primary-700 text-white gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Đang lưu...' : 'Lưu điểm danh'}
        </Button>
      </div>

      {/* Summary bar */}
      {!isLoading && students.length > 0 && (
        <div className="flex items-center gap-4 px-1">
          <span className="text-sm text-gray-500">Tổng: <strong className="text-gray-900">{students.length}</strong></span>
          <span className="text-sm text-green-600">Có mặt: <strong>{presentCount}</strong></span>
          <span className="text-sm text-red-600">Vắng: <strong>{absentCount}</strong></span>
          <span className="text-sm text-gray-400">Chưa điểm: <strong>{students.filter(s => s.status === null).length}</strong></span>
        </div>
      )}

      {/* Student list */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-xl" />)}
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            Chưa có học viên nào trong lớp này
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {students.map((s, idx) => (
              <div key={s.studentId} className="flex items-center gap-3 p-4">
                {/* Index + name */}
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-gray-600">{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                    {s.alertLevel === 'critical' && (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" aria-label="Thẻ sắp hết" />
                    )}
                    {s.alertLevel === 'warning' && (
                      <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" aria-label="Thẻ cần gia hạn" />
                    )}
                  </div>
                  {s.packageType ? (
                    <p className="text-xs text-gray-400">
                      {s.packageType === 'session'
                        ? `Còn ${s.sessionsRemaining ?? 0} buổi · HH: ${formatDate(s.expiresAt)}`
                        : `Hết hạn: ${formatDate(s.expiresAt)}`
                      }
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400">Chưa có thẻ học</p>
                  )}
                </div>
                {/* Status toggle buttons */}
                <div className="flex gap-1.5 flex-shrink-0">
                  {STATUS_BUTTONS.map(btn => (
                    <button
                      key={btn.value}
                      onClick={() => toggleStatus(s.studentId, btn.value)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                        s.status === btn.value ? btn.activeClass : btn.className
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
