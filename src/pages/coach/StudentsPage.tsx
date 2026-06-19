import { useEffect, useState } from 'react'
import { Search, GraduationCap, Phone, Info, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface StudentRow {
  classStudentId: string
  classId: string
  className: string
  studentId: string
  fullName: string
  phone: string | null
  gender: string | null
  dateOfBirth: string | null
  age: number | null
  emergencyContact: string | null
  skillLevel: string | null
  activePackage: {
    name: string
    status: string
    remaining: number | null
    total: number | null
  } | null
}

const SKILL_LABELS: Record<string, string> = {
  beginner: 'Cơ bản',
  intermediate: 'Trung cấp',
  advanced: 'Nâng cao',
}

function calculateAge(dobString: string | null) {
  if (!dobString) return null
  const dob = new Date(dobString)
  if (isNaN(dob.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  return age
}

export default function CoachStudentsPage() {
  const { profile } = useAuthContext()
  const { toast } = useToast()

  const [students, setStudents] = useState<StudentRow[]>([])
  const [classesList, setClassesList] = useState<{ id: string; name: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters state
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [genderFilter, setGenderFilter] = useState('all')
  const [ageFilter, setAgeFilter] = useState('all')

  async function loadData() {
    if (!profile) return
    setIsLoading(true)

    // 1. Get coach IDs (depending on role: coach or assistant)
    let coachIds: string[] = []
    if ((profile.role as string) === 'assistant') {
      const { data: assignments, error: assignError } = await (supabase.from('coach_assistants') as any)
        .select('coach_id')
        .eq('assistant_id', profile.id)

      if (assignError) {
        console.error('Failed to load assignments:', assignError.message)
        setIsLoading(false)
        return
      }

      const leaderProfileIds = (assignments ?? []).map((a: any) => a.coach_id)
      if (leaderProfileIds.length === 0) {
        setIsLoading(false)
        return
      }

      const { data: leadersCoaches, error: leadersError } = await (supabase.from('coaches') as any)
        .select('id')
        .in('user_id', leaderProfileIds)

      if (leadersError) {
        console.error('Failed to load leaders coaches:', leadersError.message)
        setIsLoading(false)
        return
      }

      coachIds = (leadersCoaches ?? []).map((c: any) => c.id)
    } else {
      const { data: coachData, error: coachError } = await (supabase.from('coaches') as any)
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle()

      if (coachError || !coachData) {
        console.error('Failed to load coach record:', coachError?.message)
        setIsLoading(false)
        return
      }
      coachIds = [coachData.id]
    }

    if (coachIds.length === 0) {
      setIsLoading(false)
      return
    }

    // 2. Fetch classes taught by these coaches
    const { data: classesData, error: classesError } = await supabase
      .from('classes')
      .select('id, name')
      .in('coach_id', coachIds)
      .eq('status', 'active')

    if (classesError) {
      console.error('Failed to load classes:', classesError.message)
      setIsLoading(false)
      return
    }

    const classes = (classesData as any[] ?? [])
    setClassesList(classes)

    const classIds = classes.map((c: any) => c.id)
    if (classIds.length === 0) {
      setIsLoading(false)
      return
    }

    // 3. Fetch active students in those classes
    const { data: classStudentsData, error: classStudentsError } = await supabase
      .from('class_students')
      .select(`
        id,
        class_id,
        classes(name),
        student_id,
        students(
          id,
          date_of_birth,
          emergency_contact,
          skill_level,
          profiles(
            id,
            full_name,
            phone,
            gender
          ),
          student_packages(
            id,
            status,
            sessions_remaining,
            sessions_total,
            packages(name)
          )
        )
      `)
      .in('class_id', classIds)
      .eq('status', 'active')

    if (classStudentsError) {
      console.error('Failed to load class students:', classStudentsError.message)
      toast({ title: 'Lỗi tải danh sách học viên', description: classStudentsError.message, variant: 'destructive' })
      setIsLoading(false)
      return
    }

    // 4. Map to StudentRow structure
    const rows: StudentRow[] = ((classStudentsData ?? []) as any[]).map(cs => {
      const student = cs.students
      const prof = student?.profiles
      const className = cs.classes?.name ?? 'Không xác định'

      const activePkgData = student?.student_packages?.find(
        (sp: any) => sp.status === 'active' || sp.status === 'pending_activation'
      )
      const activePackage = activePkgData ? {
        name: activePkgData.packages?.name ?? 'Gói học',
        status: activePkgData.status,
        remaining: activePkgData.sessions_remaining,
        total: activePkgData.sessions_total,
      } : null

      const dob = student?.date_of_birth ?? null
      const age = calculateAge(dob)

      return {
        classStudentId: cs.id,
        classId: cs.class_id,
        className,
        studentId: cs.student_id,
        fullName: prof?.full_name ?? 'Chưa cập nhật',
        phone: prof?.phone ?? null,
        gender: prof?.gender ?? null,
        dateOfBirth: dob,
        age,
        emergencyContact: student?.emergency_contact ?? null,
        skillLevel: student?.skill_level ?? null,
        activePackage,
      }
    })

    // Deduplicate students who might be in multiple classes
    const seen = new Set<string>()
    const uniqRows = rows.filter(r => {
      const key = `${r.studentId}-${r.classId}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    setStudents(uniqRows)
    setIsLoading(false)
  }

  useEffect(() => {
    if (profile) {
      loadData()
    }
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply filters
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (s.phone ?? '').includes(search)

    const matchesClass = classFilter === 'all' || s.classId === classFilter

    const matchesGender = genderFilter === 'all' || s.gender === genderFilter

    let matchesAge = true
    if (ageFilter !== 'all') {
      if (s.age === null) {
        matchesAge = false
      } else {
        if (ageFilter === 'under12') matchesAge = s.age < 12
        else if (ageFilter === '12to18') matchesAge = s.age >= 12 && s.age <= 18
        else if (ageFilter === 'over18') matchesAge = s.age > 18
      }
    }

    return matchesSearch && matchesClass && matchesGender && matchesAge
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Danh sách học viên</h2>
        <p className="text-sm text-gray-500 mt-0.5">Quản lý và xem thông tin học viên đang theo học</p>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-1">
            <Label className="text-xs font-bold text-gray-500">Tìm kiếm</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                className="pl-9 h-10 border-gray-200 rounded-xl text-xs"
                placeholder="Tìm theo tên, SĐT..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold text-gray-500">Lớp học</Label>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="mt-1 h-10 border-gray-200 rounded-xl text-xs bg-white">
                <SelectValue placeholder="Tất cả các lớp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Tất cả các lớp</SelectItem>
                {classesList.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-bold text-gray-500">Giới tính</Label>
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="mt-1 h-10 border-gray-200 rounded-xl text-xs bg-white">
                <SelectValue placeholder="Tất cả giới tính" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Tất cả</SelectItem>
                <SelectItem value="Nam" className="text-xs">Nam</SelectItem>
                <SelectItem value="Nữ" className="text-xs">Nữ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-bold text-gray-500">Độ tuổi</Label>
            <Select value={ageFilter} onValueChange={setAgeFilter}>
              <SelectTrigger className="mt-1 h-10 border-gray-200 rounded-xl text-xs bg-white">
                <SelectValue placeholder="Tất cả độ tuổi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Tất cả</SelectItem>
                <SelectItem value="under12" className="text-xs">Dưới 12 tuổi</SelectItem>
                <SelectItem value="12to18" className="text-xs">Từ 12 - 18 tuổi</SelectItem>
                <SelectItem value="over18" className="text-xs">Trên 18 tuổi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-xl" />)}
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <GraduationCap className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Không tìm thấy học viên nào</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredStudents.map(student => (
              <div key={student.classStudentId} className="flex flex-col md:flex-row md:items-center gap-4 py-4 hover:bg-gray-50/50 rounded-xl px-2 transition-colors">
                {/* Info block */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0 border border-primary-100">
                    <GraduationCap className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-900 truncate">
                        {student.fullName}
                      </span>
                      {student.gender && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          student.gender === 'Nam' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-pink-50 text-pink-600 border border-pink-100'
                        }`}>
                          {student.gender}
                        </span>
                      )}
                      {student.age !== null && (
                        <span className="text-[10px] bg-gray-100 text-gray-650 px-2 py-0.5 rounded-full border border-gray-200">
                          {student.age} tuổi
                        </span>
                      )}
                      {student.skillLevel && (
                        <span className="text-[10px] bg-court-50 text-court-700 px-2 py-0.5 rounded-full border border-court-200">
                          {SKILL_LABELS[student.skillLevel] ?? student.skillLevel}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Lớp: <span className="font-medium text-gray-600">{student.className}</span>
                      </span>
                      {student.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" /> {student.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Package block */}
                <div className="flex flex-col md:items-end gap-1 flex-shrink-0">
                  {student.activePackage ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                          student.activePackage.status === 'active' 
                            ? 'bg-green-50 text-green-600 border border-green-200' 
                            : 'bg-yellow-50 text-yellow-600 border border-yellow-250'
                        }`}>
                          {student.activePackage.status === 'active' ? 'Đang học' : 'Chờ kích hoạt'}
                        </span>
                        <span className="text-xs font-bold text-gray-700">
                          {student.activePackage.name}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-450">
                        {student.activePackage.remaining !== null 
                          ? `Còn lại: ${student.activePackage.remaining} / ${student.activePackage.total} buổi` 
                          : 'Thẻ tháng (Không giới hạn)'}
                      </p>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Chưa có thẻ học hoạt động</span>
                  )}
                </div>

                {/* Emergency Contact */}
                {student.emergencyContact && (
                  <div className="text-[10px] text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100 md:max-w-xs w-full flex items-start gap-1">
                    <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="leading-tight">
                      <span className="font-bold text-gray-600">LH khẩn cấp:</span> {student.emergencyContact}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
