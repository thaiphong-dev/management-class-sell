import { useEffect, useState } from 'react'
import { Plus, BookOpen, Users, Clock, Pencil, UserPlus, UserMinus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Class, Facility, Court } from '@/types'

interface CoachOption { id: string; name: string }
interface StudentOption { id: string; name: string; skill_level: string | null }

interface ClassRow extends Class {
  coachName: string | null
  courtName: string | null
  facilityName: string | null
  studentCount: number
}

interface EnrolledStudent { id: string; student_id: string; name: string }

const SKILL_LABELS: Record<string, string> = {
  beginner: 'Cơ bản', intermediate: 'Trung cấp', advanced: 'Nâng cao', kids: 'Thiếu nhi', all: 'Tất cả',
}
const DAYS_VN = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const DAY_VALUES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

interface ClassFormData {
  name: string
  coach_id: string
  facility_id: string
  court_id: string
  max_students: string
  skill_level: string
  schedule_days: string[]
  schedule_time: string
  duration_min: string
  description: string
  status: 'active' | 'inactive' | 'full'
}

const EMPTY_FORM: ClassFormData = {
  name: '', coach_id: '', facility_id: '', court_id: '',
  max_students: '12', skill_level: 'all', schedule_days: [],
  schedule_time: '', duration_min: '90', description: '', status: 'active',
}

export default function ClassesPage() {
  const { toast } = useToast()
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [coaches, setCoaches] = useState<CoachOption[]>([])
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [classDialog, setClassDialog] = useState<{ open: boolean; id?: string; data: ClassFormData }>({
    open: false, data: { ...EMPTY_FORM },
  })
  const [enrollDialog, setEnrollDialog] = useState<{ open: boolean; classId: string; className: string }>({
    open: false, classId: '', className: '',
  })
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([])
  const [allStudents, setAllStudents] = useState<StudentOption[]>([])
  const [enrollLoading, setEnrollLoading] = useState(false)

  async function loadClasses() {
    const { data, error } = await supabase
      .from('classes')
      .select(`
        *,
        coaches(id, user_id, profiles(full_name)),
        courts(id, name),
        facilities(id, name),
        class_students(count)
      `)
      .order('name')

    if (error) {
      console.error('Failed to load classes:', error.message)
      toast({ title: 'Lỗi tải dữ liệu', description: error.message, variant: 'destructive' })
      setIsLoading(false)
      return
    }

    const rows: ClassRow[] = ((data ?? []) as unknown[]).map((raw: unknown) => {
      const r = raw as Record<string, unknown>
      const coaches = r.coaches as { profiles?: { full_name?: string } } | null
      const courts  = r.courts  as { name?: string } | null
      const facilities = r.facilities as { name?: string } | null
      const cs = r.class_students as Array<{ count: number }> | null

      return {
        ...(r as Class),
        coachName:    coaches?.profiles?.full_name ?? null,
        courtName:    courts?.name ?? null,
        facilityName: facilities?.name ?? null,
        studentCount: cs?.[0]?.count ?? 0,
      }
    })

    setClasses(rows)
    setIsLoading(false)
  }

  async function loadOptions() {
    const [coachRes, facilityRes, courtRes] = await Promise.all([
      supabase.from('coaches').select('id, user_id, profiles(full_name)').eq('status', 'active'),
      supabase.from('facilities').select('*').eq('status', 'active'),
      supabase.from('courts').select('*').eq('status', 'available'),
    ])

    const coachList: CoachOption[] = ((coachRes.data ?? []) as unknown[]).map((c: unknown) => {
      const r = c as { id: string; profiles?: { full_name?: string } }
      return { id: r.id, name: r.profiles?.full_name ?? '—' }
    })
    setCoaches(coachList)
    setFacilities((facilityRes.data ?? []) as Facility[])
    setCourts((courtRes.data ?? []) as Court[])
  }

  useEffect(() => {
    loadClasses()
    loadOptions()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function setF(key: string, value: string) {
    setClassDialog(prev => ({ ...prev, data: { ...prev.data, [key]: value } }))
  }

  function toggleDay(day: string) {
    setClassDialog(prev => {
      const days = prev.data.schedule_days.includes(day)
        ? prev.data.schedule_days.filter(d => d !== day)
        : [...prev.data.schedule_days, day]
      return { ...prev, data: { ...prev.data, schedule_days: days } }
    })
  }

  async function saveClass() {
    setSaving(true)
    const { id, data } = classDialog
    const base = {
      name: data.name.trim(),
      coach_id: data.coach_id || null,
      facility_id: data.facility_id || null,
      court_id: data.court_id || null,
      max_students: parseInt(data.max_students) || 12,
      skill_level: (data.skill_level || null) as Class['skill_level'],
      schedule_days: data.schedule_days.length ? data.schedule_days : null,
      schedule_time: data.schedule_time || null,
      duration_min: parseInt(data.duration_min) || 90,
      description: data.description.trim() || null,
      status: data.status,
    }

    const { error } = id
      ? await supabase.from('classes').update(base as never).eq('id', id)
      : await supabase.from('classes').insert(base as never)

    if (error) {
      toast({ title: 'Lỗi lưu lớp', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: id ? 'Đã cập nhật lớp' : 'Đã thêm lớp mới' })
      setClassDialog({ open: false, data: { ...EMPTY_FORM } })
      await loadClasses()
    }
    setSaving(false)
  }

  async function openEnroll(classId: string, className: string) {
    setEnrollDialog({ open: true, classId, className })
    setEnrollLoading(true)

    const [enrollRes, studentRes] = await Promise.all([
      supabase.from('class_students')
        .select('id, student_id, students(user_id, profiles(full_name))')
        .eq('class_id', classId)
        .eq('status', 'active'),
      supabase.from('students')
        .select('id, skill_level, profiles(full_name)')
        .eq('status', 'active'),
    ])

    const enrolled: EnrolledStudent[] = ((enrollRes.data ?? []) as unknown[]).map((r: unknown) => {
      const row = r as { id: string; student_id: string; students?: { profiles?: { full_name?: string } } }
      return { id: row.id, student_id: row.student_id, name: row.students?.profiles?.full_name ?? '—' }
    })
    setEnrolledStudents(enrolled)

    const enrolledIds = new Set(enrolled.map(e => e.student_id))
    const all: StudentOption[] = ((studentRes.data ?? []) as unknown[])
      .filter((r: unknown) => {
        const row = r as { id: string }
        return !enrolledIds.has(row.id)
      })
      .map((r: unknown) => {
        const row = r as { id: string; skill_level: string | null; profiles?: { full_name?: string } }
        return { id: row.id, name: row.profiles?.full_name ?? '—', skill_level: row.skill_level }
      })
    setAllStudents(all)
    setEnrollLoading(false)
  }

  async function enrollStudent(studentId: string) {
    const { error } = await supabase.from('class_students').insert({
      class_id: enrollDialog.classId,
      student_id: studentId,
    } as never)
    if (error) {
      toast({ title: 'Lỗi thêm học viên', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Đã thêm học viên vào lớp' })
      await openEnroll(enrollDialog.classId, enrollDialog.className)
      await loadClasses()
    }
  }

  async function unenrollStudent(enrollId: string) {
    const { error } = await supabase.from('class_students').delete().eq('id', enrollId)
    if (error) {
      toast({ title: 'Lỗi xóa học viên', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Đã xóa học viên khỏi lớp' })
      await openEnroll(enrollDialog.classId, enrollDialog.className)
      await loadClasses()
    }
  }

  const filteredCourts = classDialog.data.facility_id
    ? courts.filter(c => c.facility_id === classDialog.data.facility_id)
    : courts

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Lớp học</h2>
          <p className="text-sm text-gray-500 mt-0.5">Quản lý lớp học và học viên</p>
        </div>
        <Button
          onClick={() => setClassDialog({ open: true, data: { ...EMPTY_FORM } })}
          className="bg-primary-600 hover:bg-primary-700 text-white gap-2"
        >
          <Plus className="w-4 h-4" /> Tạo lớp mới
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="animate-pulse h-20 bg-gray-100 rounded-2xl" />)}
        </div>
      ) : classes.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Chưa có lớp học nào</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {classes.map(cls => (
              <div key={cls.id} className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 bg-court-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-court-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{cls.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {cls.coachName ? `HLV: ${cls.coachName}` : 'Chưa có HLV'} ·{' '}
                    {cls.facilityName ?? 'Chưa có cơ sở'}{cls.courtName ? ` / ${cls.courtName}` : ''}
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-4 text-sm text-gray-500">
                  {cls.schedule_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {cls.schedule_days?.map(d => DAYS_VN[DAY_VALUES.indexOf(d)]).join(', ')} {cls.schedule_time}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {cls.studentCount}/{cls.max_students}
                  </span>
                </div>
                <span className={`hidden sm:inline text-xs px-2.5 py-1 rounded-full font-medium ${
                  cls.skill_level ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {cls.skill_level ? (SKILL_LABELS[cls.skill_level] ?? cls.skill_level) : 'Tất cả'}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  cls.status === 'active' ? 'bg-green-100 text-green-700' :
                  cls.status === 'full'   ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {cls.status === 'active' ? 'Đang mở' : cls.status === 'full' ? 'Đầy' : 'Tạm dừng'}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setClassDialog({
                      open: true, id: cls.id,
                      data: {
                        name: cls.name, coach_id: cls.coach_id ?? '',
                        facility_id: cls.facility_id ?? '', court_id: cls.court_id ?? '',
                        max_students: cls.max_students.toString(),
                        skill_level: cls.skill_level ?? 'all',
                        schedule_days: cls.schedule_days ?? [],
                        schedule_time: cls.schedule_time ?? '',
                        duration_min: cls.duration_min.toString(),
                        description: cls.description ?? '',
                        status: cls.status,
                      },
                    })}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEnroll(cls.id, cls.name)}
                    className="p-1.5 text-gray-400 hover:text-court-600 hover:bg-court-50 rounded-lg transition-colors"
                    title="Quản lý học viên"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Class Create/Edit Dialog */}
      <Dialog open={classDialog.open} onOpenChange={open => !open && setClassDialog({ open: false, data: { ...EMPTY_FORM } })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{classDialog.id ? 'Chỉnh sửa lớp' : 'Tạo lớp mới'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label>Tên lớp *</Label>
              <Input className="mt-1" placeholder="Ví dụ: Lớp Cơ bản Sáng" value={classDialog.data.name} onChange={e => setF('name', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Huấn luyện viên</Label>
                <Select value={classDialog.data.coach_id || 'none'} onValueChange={v => setF('coach_id', v === 'none' ? '' : v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn HLV" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Chưa phân công</SelectItem>
                    {coaches.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Trình độ</Label>
                <Select value={classDialog.data.skill_level} onValueChange={v => setF('skill_level', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SKILL_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cơ sở</Label>
                <Select value={classDialog.data.facility_id || 'none'} onValueChange={v => { setF('facility_id', v === 'none' ? '' : v); setF('court_id', '') }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn cơ sở" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Chưa chọn</SelectItem>
                    {facilities.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sân</Label>
                <Select value={classDialog.data.court_id || 'none'} onValueChange={v => setF('court_id', v === 'none' ? '' : v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn sân" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Chưa chọn</SelectItem>
                    {filteredCourts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sĩ số tối đa</Label>
                <Input className="mt-1" type="number" min={1} value={classDialog.data.max_students} onChange={e => setF('max_students', e.target.value)} />
              </div>
              <div>
                <Label>Giờ học</Label>
                <Input className="mt-1" type="time" value={classDialog.data.schedule_time} onChange={e => setF('schedule_time', e.target.value)} />
              </div>
              <div>
                <Label>Thời lượng (phút)</Label>
                <Input className="mt-1" type="number" min={30} step={15} value={classDialog.data.duration_min} onChange={e => setF('duration_min', e.target.value)} />
              </div>
              <div>
                <Label>Trạng thái</Label>
                <Select value={classDialog.data.status} onValueChange={v => setF('status', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Đang mở</SelectItem>
                    <SelectItem value="inactive">Tạm dừng</SelectItem>
                    <SelectItem value="full">Đầy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Ngày học trong tuần</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {DAYS_VN.map((label, i) => (
                  <button
                    key={DAY_VALUES[i]}
                    type="button"
                    onClick={() => toggleDay(DAY_VALUES[i])}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      classDialog.data.schedule_days.includes(DAY_VALUES[i])
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClassDialog({ open: false, data: { ...EMPTY_FORM } })}>Hủy</Button>
            <Button
              onClick={saveClass}
              disabled={!classDialog.data.name.trim() || saving}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              {saving ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enrollment Dialog */}
      <Dialog open={enrollDialog.open} onOpenChange={open => !open && setEnrollDialog({ open: false, classId: '', className: '' })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Học viên — {enrollDialog.className}</DialogTitle>
          </DialogHeader>
          {enrollLoading ? (
            <div className="py-8 text-center text-gray-400">Đang tải...</div>
          ) : (
            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              {/* Enrolled students */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Đang trong lớp ({enrolledStudents.length})
                </p>
                {enrolledStudents.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">Chưa có học viên trong lớp</p>
                ) : (
                  <div className="space-y-1">
                    {enrolledStudents.map(s => (
                      <div key={s.id} className="flex items-center gap-3 px-3 py-2 bg-green-50 rounded-xl">
                        <div className="w-7 h-7 rounded-full bg-court-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-semibold">{s.name.charAt(0)}</span>
                        </div>
                        <span className="flex-1 text-sm font-medium text-gray-800">{s.name}</span>
                        <button
                          onClick={() => unenrollStudent(s.id)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa khỏi lớp"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Available students */}
              {allStudents.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Học viên khả dụng ({allStudents.length})
                  </p>
                  <div className="space-y-1">
                    {allStudents.map(s => (
                      <div key={s.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-xl">
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-gray-600 text-xs font-semibold">{s.name.charAt(0)}</span>
                        </div>
                        <span className="flex-1 text-sm text-gray-700">{s.name}</span>
                        {s.skill_level && (
                          <span className="text-xs text-gray-400">{SKILL_LABELS[s.skill_level] ?? s.skill_level}</span>
                        )}
                        <button
                          onClick={() => enrollStudent(s.id)}
                          className="p-1 text-court-600 hover:text-court-700 hover:bg-court-50 rounded-lg transition-colors"
                          title="Thêm vào lớp"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollDialog({ open: false, classId: '', className: '' })}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
