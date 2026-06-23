import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft, Clock, CheckCircle2, XCircle, CalendarClock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { formatDateTime } from '@/lib/utils'
import type { Session, Court, Class } from '@/types'

interface LessonPlanMinimal {
  id: string
  title: string
  creator_id: string
  is_public: boolean
}

interface SessionRow extends Session {
  courtName: string | null
  lesson_plan_id?: string | null
  lessonPlanTitle?: string | null
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  scheduled:   { label: 'Lịch học',    icon: CalendarClock, className: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'Đang học',    icon: Clock,          className: 'bg-yellow-100 text-yellow-700' },
  completed:   { label: 'Hoàn thành',  icon: CheckCircle2,   className: 'bg-green-100 text-green-700' },
  cancelled:   { label: 'Đã hủy',      icon: XCircle,        className: 'bg-red-100 text-red-700' },
}

const DAYS_VN = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const DAY_VALUES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_INDEXES: Record<number, string> = {
  0: 'sun',
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat'
}

export default function CoachSessionsPage() {
  const { classId } = useParams<{ classId: string }>()
  const { profile } = useAuthContext()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [classInfo, setClassInfo] = useState<Class | null>(null)
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [lessonPlans, setLessonPlans] = useState<LessonPlanMinimal[]>([])
  const [editLessonPlanId, setEditLessonPlanId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [createDialog, setCreateDialog] = useState(false)
  const [sessionForm, setSessionForm] = useState({
    scheduled_date: '',
    scheduled_time: '',
    duration_min: '90',
    court_id: '',
    notes: '',
    lesson_plan_id: '',
  })

  const [statusDialog, setStatusDialog] = useState<{ open: boolean; session: SessionRow | null }>({
    open: false, session: null,
  })
  const [cancelReason, setCancelReason] = useState('')

  const [autoDialog, setAutoDialog] = useState(false)
  const [autoForm, setAutoForm] = useState({
    rangeType: '30' as '7' | '14' | '30' | '60' | '90',
    startDate: new Date().toISOString().split('T')[0],
    court_id: '',
  })

  async function loadData() {
    if (!classId || !profile) return

    // Fetch class details first
    const classRes = await supabase.from('classes').select('*').eq('id', classId).single()
    if (classRes.error) {
      console.error('Failed to fetch class:', classRes.error.message)
      toast({ title: 'Lỗi tải lớp học', description: classRes.error.message, variant: 'destructive' })
      navigate('/coach/classes')
      return
    }
    const cls = classRes.data as Class

    // Verify this class belongs to the current coach or is managed by their leader
    let isAuthorized = false

    if ((profile.role as string) === 'assistant') {
      if (cls.coach_id) {
        const { data: classCoachData } = await (supabase.from('coaches') as any)
          .select('user_id')
          .eq('id', cls.coach_id)
          .maybeSingle()

        const classCoachUserId = classCoachData?.user_id
        if (classCoachUserId) {
          const { data: link } = await (supabase.from('coach_assistants') as any)
            .select('id')
            .eq('coach_id', classCoachUserId)
            .eq('assistant_id', profile.id)
            .maybeSingle()

          if (link) {
            isAuthorized = true
          }
        }
      }
    } else {
      const { data: coachData } = await (supabase.from('coaches') as any)
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle()
      const coachId = (coachData as { id: string } | null)?.id ?? null

      if (coachId && cls.coach_id === coachId) {
        isAuthorized = true
      }
    }

    if (!isAuthorized) {
      toast({ title: 'Không có quyền truy cập', description: 'Lớp này không thuộc quyền quản lý của bạn hoặc trưởng nhóm của bạn.', variant: 'destructive' })
      navigate('/coach/classes')
      return
    }

    const [sessionRes, courtRes, planRes] = await Promise.all([
      (supabase.from('sessions') as any)
        .select('*, courts(name), lesson_plans(title)')
        .eq('class_id', classId)
        .order('scheduled_at', { ascending: false }),
      supabase.from('courts').select('*').eq('status', 'available'),
      (supabase.from('lesson_plans') as any)
        .select('id, title, creator_id, is_public')
    ])

    if (sessionRes.error) {
      console.error('Failed to load sessions:', sessionRes.error.message)
      toast({ title: 'Lỗi tải buổi học', description: sessionRes.error.message, variant: 'destructive' })
    }

    setClassInfo(cls)

    const rows: SessionRow[] = ((sessionRes.data ?? []) as unknown[]).map((raw: any) => {
      const r = raw as Record<string, any>
      const courts = r.courts as { name?: string } | null
      const lessonPlans = r.lesson_plans as { title?: string } | null
      return {
        ...(r as Session),
        courtName: courts?.name ?? null,
        lessonPlanTitle: lessonPlans?.title ?? null
      }
    })
    setSessions(rows)
    setCourts((courtRes.data ?? []) as Court[])
    setLessonPlans((planRes.data ?? []) as LessonPlanMinimal[])

    // Pre-fill court from class default
    if (cls.court_id) {
      setSessionForm(prev => ({ ...prev, court_id: cls.court_id ?? '', lesson_plan_id: '' }))
    }

    setIsLoading(false)
  }

  useEffect(() => {
    if (profile) loadData()
  }, [profile, classId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function createSession() {
    if (!classId || !sessionForm.scheduled_date || !sessionForm.scheduled_time) return
    setSaving(true)

    const scheduledAt = new Date(`${sessionForm.scheduled_date}T${sessionForm.scheduled_time}`)

    const { error } = await (supabase.from('sessions') as any).insert({
      class_id: classId,
      scheduled_at: scheduledAt.toISOString(),
      duration_min: parseInt(sessionForm.duration_min) || 90,
      court_id: sessionForm.court_id || null,
      notes: sessionForm.notes.trim() || null,
      lesson_plan_id: sessionForm.lesson_plan_id || null,
      created_by: profile?.id ?? null,
    })

    if (error) {
      toast({ title: 'Lỗi tạo buổi học', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Đã tạo buổi học mới' })
      setCreateDialog(false)
      setSessionForm({ scheduled_date: '', scheduled_time: '', duration_min: '90', court_id: classInfo?.court_id ?? '', notes: '', lesson_plan_id: '' })
      await loadData()
    }
    setSaving(false)
  }

  function getCandidateDates(startDateStr: string, rangeDays: number, scheduleDays: string[], scheduleTime: string) {
    if (!scheduleDays || scheduleDays.length === 0 || !scheduleTime) return []
    const candidates: Date[] = []
    const start = new Date(startDateStr)
    for (let i = 0; i < rangeDays; i++) {
      const current = new Date(start.getTime() + i * 24 * 60 * 60 * 1000)
      const dayName = DAY_INDEXES[current.getDay()]
      if (scheduleDays.includes(dayName)) {
        const datePart = current.toISOString().split('T')[0]
        const dateTimeLocal = new Date(`${datePart}T${scheduleTime}`)
        candidates.push(dateTimeLocal)
      }
    }
    return candidates
  }

  async function handleAutoGenerate() {
    if (!classId || !classInfo || !classInfo.schedule_days || !classInfo.schedule_time) {
      toast({ title: 'Không thể tạo lịch', description: 'Lớp học chưa cấu hình ngày/giờ học.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const rangeDays = parseInt(autoForm.rangeType)
      const candidates = getCandidateDates(autoForm.startDate, rangeDays, classInfo.schedule_days, classInfo.schedule_time)
      
      if (candidates.length === 0) {
        toast({ title: 'Không có buổi học nào', description: 'Không tìm thấy ngày học phù hợp với lịch của lớp trong khoảng thời gian đã chọn.' })
        setSaving(false)
        return
      }

      const { data: existingSessions, error: fetchError } = await (supabase.from('sessions') as any)
        .select('scheduled_at')
        .eq('class_id', classId)
        .neq('status', 'cancelled')

      if (fetchError) throw fetchError

      const existingTimes = new Set((existingSessions ?? []).map((s: any) => new Date(s.scheduled_at).getTime()))
      
      const newSessionsToInsert = candidates
        .filter(c => !existingTimes.has(c.getTime()))
        .map(c => ({
          class_id: classId,
          scheduled_at: c.toISOString(),
          duration_min: classInfo.duration_min ?? 90,
          court_id: autoForm.court_id || null,
          notes: 'Tạo tự động theo lịch lớp',
          created_by: profile?.id ?? null,
          status: 'scheduled'
        }))

      if (newSessionsToInsert.length === 0) {
        toast({ title: 'Không có buổi học mới', description: 'Tất cả các buổi học trong khoảng thời gian này đã được tạo trước đó.' })
        setAutoDialog(false)
        setSaving(false)
        return
      }

      const { error: insertError } = await (supabase.from('sessions') as any).insert(newSessionsToInsert)
      if (insertError) throw insertError

      toast({ title: 'Đã tạo lịch học tự động', description: `Đã thêm thành công ${newSessionsToInsert.length} buổi học mới.` })
      setAutoDialog(false)
      await loadData()
    } catch (err: any) {
      console.error('Auto generate sessions error:', err.message)
      toast({ title: 'Lỗi tạo lịch tự động', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (statusDialog.session) {
      setEditLessonPlanId((statusDialog.session as any).lesson_plan_id || 'none')
    }
  }, [statusDialog.session])

  async function updateSessionStatus(sessionId: string, status: Session['status'], notes?: string) {
    const updatePayload: Record<string, unknown> = { status }
    if (notes !== undefined && notes.trim() !== '') {
      updatePayload.notes = notes.trim()
    }

    const { error } = await supabase
      .from('sessions')
      .update(updatePayload as never)
      .eq('id', sessionId)

    if (error) {
      toast({ title: 'Lỗi cập nhật trạng thái', description: error.message, variant: 'destructive' })
    } else {
      if (status === 'cancelled') {
        toast({ title: 'Đã hủy buổi học', description: 'Học viên đã được thông báo tự động.' })
      } else {
        toast({ title: 'Đã cập nhật trạng thái buổi học' })
      }
      setStatusDialog({ open: false, session: null })
      setCancelReason('')
      await loadData()
    }
  }

  const upcoming = sessions.filter(s => s.status === 'scheduled' || s.status === 'in_progress')
  const past = sessions.filter(s => s.status === 'completed' || s.status === 'cancelled')

  function renderSessions(list: SessionRow[], emptyMsg: string) {
    if (list.length === 0) {
      return <p className="text-sm text-gray-400 text-center py-6">{emptyMsg}</p>
    }
    return (
      <div className="space-y-2">
        {list.map(s => {
          const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.scheduled
          const Icon = cfg.icon
          return (
            <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.className}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{formatDateTime(s.scheduled_at)}</p>
                <p className="text-xs text-gray-500">
                  {s.duration_min} phút · {s.courtName ?? 'Chưa có sân'}
                  {s.notes ? ` · ${s.notes}` : ''}
                </p>
                {s.lessonPlanTitle && (
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center text-[10px] font-medium bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                      Giáo án: {s.lessonPlanTitle}
                    </span>
                    {profile?.role === 'coach' ? (
                      <button
                        onClick={() => navigate(`/coach/lesson-plans/${s.lesson_plan_id}/edit`)}
                        className="text-[10px] text-purple-600 hover:text-purple-800 hover:underline font-medium"
                      >
                        Sửa giáo án
                      </button>
                    ) : (
                      <a
                        href={`/shared/lessons/${s.lesson_plan_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-purple-600 hover:text-purple-800 hover:underline font-medium"
                      >
                        Xem giáo án
                      </a>
                    )}
                    <a
                      href={`/shared/lessons/${s.lesson_plan_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-gray-500 hover:text-gray-700 hover:underline"
                    >
                      Chia sẻ
                    </a>
                  </div>
                )}
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg.className}`}>
                {cfg.label}
              </span>
              <div className="flex gap-1.5 flex-shrink-0">
                {(s.status === 'scheduled' || s.status === 'in_progress') && (
                  <button
                    onClick={() => navigate(`/coach/classes/${classId}/sessions/${s.id}/attendance`)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                  >
                    Điểm danh
                  </button>
                )}
                {profile?.role === 'coach' && (s.status === 'scheduled' || s.status === 'in_progress') && (
                  <button
                    onClick={() => setStatusDialog({ open: true, session: s })}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600 transition-colors"
                  >
                    Cập nhật
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/coach/classes')}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">
            {isLoading ? '...' : (classInfo?.name ?? 'Buổi học')}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Danh sách buổi học</p>
        </div>
        {profile?.role === 'coach' && (
          <div className="flex gap-2">
            <Button
              onClick={() => {
                if (!classInfo?.schedule_days?.length || !classInfo?.schedule_time) {
                  toast({
                    title: 'Lớp học chưa cấu hình lịch',
                    description: 'HLV hoặc Admin cần thiết lập ngày và giờ học cho lớp này trước.',
                    variant: 'destructive'
                  })
                  return
                }
                setAutoForm(prev => ({
                  ...prev,
                  court_id: classInfo.court_id ?? '',
                  startDate: new Date().toISOString().split('T')[0]
                }))
                setAutoDialog(true)
              }}
              variant="outline"
              className="border border-gray-300 text-gray-750 hover:bg-gray-50 gap-2 rounded-xl text-xs font-semibold h-10 px-4"
            >
              <CalendarClock className="w-4 h-4 text-gray-500" /> Tạo lịch tự động
            </Button>
            <Button
              onClick={() => setCreateDialog(true)}
              className="bg-primary-600 hover:bg-primary-700 text-white gap-2 rounded-xl text-xs font-semibold h-10 px-4"
            >
              <Plus className="w-4 h-4" /> Thêm buổi
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="animate-pulse h-14 bg-gray-100 rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Upcoming */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Sắp diễn ra ({upcoming.length})
            </h3>
            {renderSessions(upcoming, 'Không có buổi học sắp tới')}
          </div>

          {/* Past */}
          {past.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Đã qua ({past.length})
              </h3>
              {renderSessions(past, '')}
            </div>
          )}
        </>
      )}

      {/* Auto Generate Sessions Dialog */}
      <Dialog open={autoDialog} onOpenChange={open => !open && setAutoDialog(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tự động tạo lịch học</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="rangeType" className="text-xs font-bold text-gray-700">Thời khoảng tự động tạo</Label>
              <Select
                value={autoForm.rangeType}
                onValueChange={(val: any) => setAutoForm(prev => ({ ...prev, rangeType: val }))}
              >
                <SelectTrigger id="rangeType" className="w-full bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold h-11">
                  <SelectValue placeholder="Chọn thời khoảng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">1 tuần tới</SelectItem>
                  <SelectItem value="14">2 tuần tới</SelectItem>
                  <SelectItem value="30">1 tháng tới (30 ngày)</SelectItem>
                  <SelectItem value="60">2 tháng tới (60 ngày)</SelectItem>
                  <SelectItem value="90">3 tháng tới (90 ngày)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-700">Ngày bắt đầu tạo</Label>
              <DatePicker
                value={autoForm.startDate}
                onChange={(val) => setAutoForm(prev => ({ ...prev, startDate: val }))}
                placeholder="Chọn ngày bắt đầu"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="auto_court_id" className="text-xs font-bold text-gray-700">Chọn sân tập luyện</Label>
              <Select
                value={autoForm.court_id || 'none'}
                onValueChange={(val) => setAutoForm(prev => ({ ...prev, court_id: val === 'none' ? '' : val }))}
              >
                <SelectTrigger id="auto_court_id" className="w-full bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold h-11">
                  <SelectValue placeholder="Chọn sân cầu lông" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Chưa chọn</SelectItem>
                  {courts.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview of schedule details */}
            {classInfo?.schedule_days && classInfo?.schedule_time && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl text-[11px] text-gray-600 space-y-1">
                <p><strong>Lịch lớp:</strong> {classInfo.schedule_days.map(d => DAYS_VN[DAY_VALUES.indexOf(d)]).join(', ')} vào lúc {classInfo.schedule_time.slice(0, 5)}</p>
                <p>
                  <strong>Số buổi ước tính:</strong>{' '}
                  <span className="font-bold text-primary-600">
                    {getCandidateDates(autoForm.startDate, parseInt(autoForm.rangeType), classInfo.schedule_days, classInfo.schedule_time).length} buổi
                  </span>
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl text-xs font-semibold"
              onClick={() => setAutoDialog(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={saving}
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-xs h-10"
              onClick={handleAutoGenerate}
            >
              {saving ? 'Đang tạo...' : 'Xác nhận tạo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Session Dialog */}
      <Dialog open={createDialog} onOpenChange={open => !open && setCreateDialog(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Thêm buổi học mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ngày *</Label>
                <div className="mt-1">
                  <DatePicker
                    value={sessionForm.scheduled_date}
                    onChange={val => setSessionForm(p => ({ ...p, scheduled_date: val }))}
                    placeholder="Chọn ngày học"
                  />
                </div>
              </div>
              <div>
                <Label>Giờ *</Label>
                <Input
                  className="mt-1"
                  type="time"
                  value={sessionForm.scheduled_time}
                  onChange={e => setSessionForm(p => ({ ...p, scheduled_time: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Thời lượng (phút)</Label>
              <Input
                className="mt-1"
                type="number"
                min={30}
                step={15}
                value={sessionForm.duration_min}
                onChange={e => setSessionForm(p => ({ ...p, duration_min: e.target.value }))}
              />
            </div>
             <div>
              <Label>Sân</Label>
              <Select
                value={sessionForm.court_id || 'none'}
                onValueChange={v => setSessionForm(p => ({ ...p, court_id: v === 'none' ? '' : v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Chọn sân" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Chưa chọn</SelectItem>
                  {courts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Giáo án</Label>
              <Select
                value={sessionForm.lesson_plan_id || 'none'}
                onValueChange={v => setSessionForm(p => ({ ...p, lesson_plan_id: v === 'none' ? '' : v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Chọn giáo án" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không chọn giáo án</SelectItem>
                  {lessonPlans.map(lp => (
                    <SelectItem key={lp.id} value={lp.id}>{lp.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ghi chú</Label>
              <Input
                className="mt-1"
                placeholder="Tùy chọn"
                value={sessionForm.notes}
                onChange={e => setSessionForm(p => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Hủy</Button>
            <Button
              onClick={createSession}
              disabled={!sessionForm.scheduled_date || !sessionForm.scheduled_time || saving}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              {saving ? 'Đang tạo...' : 'Tạo buổi học'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog
        open={statusDialog.open}
        onOpenChange={open => {
          if (!open) {
            setStatusDialog({ open: false, session: null })
            setCancelReason('')
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cập nhật trạng thái buổi học</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <p className="text-sm text-gray-600">
              {statusDialog.session && formatDateTime(statusDialog.session.scheduled_at)}
            </p>

            {/* Mark completed */}
            <button
              onClick={() => statusDialog.session && updateSessionStatus(statusDialog.session.id, 'completed')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 border-transparent hover:border-current transition-colors ${STATUS_CONFIG.completed.className}`}
            >
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Đánh dấu Hoàn thành</span>
            </button>

            {/* Link Lesson Plan */}
            <div className="pt-4 border-t border-gray-100 space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Giáo án cho buổi dạy</p>
              <Select
                value={editLessonPlanId}
                onValueChange={setEditLessonPlanId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn giáo án" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Chưa chọn giáo án</SelectItem>
                  {lessonPlans.map(lp => (
                    <SelectItem key={lp.id} value={lp.id}>{lp.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  if (!statusDialog.session) return
                  const { error } = await (supabase.from('sessions') as any)
                    .update({ lesson_plan_id: editLessonPlanId === 'none' ? null : editLessonPlanId })
                    .eq('id', statusDialog.session.id)
                  
                  if (error) {
                    toast({ title: 'Lỗi cập nhật giáo án', description: error.message, variant: 'destructive' })
                  } else {
                    toast({ title: 'Đã cập nhật giáo án thành công' })
                    setStatusDialog({ open: false, session: null })
                    await loadData()
                  }
                }}
              >
                Lưu giáo án
              </Button>
            </div>

            {/* Cancel with reason */}
            <div className="pt-4 border-t border-gray-100 space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hủy buổi học</p>
              <Input
                placeholder="Lý do hủy (vd: Sân sự cố, HLV bận việc...)"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
              />
              <p className="text-xs text-gray-400">Học viên trong lớp sẽ tự động nhận thông báo hủy.</p>
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={() => {
                  if (statusDialog.session) {
                    updateSessionStatus(statusDialog.session.id, 'cancelled', cancelReason)
                  }
                }}
              >
                <XCircle className="w-4 h-4" />
                Xác nhận hủy buổi học
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setStatusDialog({ open: false, session: null })
              setCancelReason('')
            }}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
