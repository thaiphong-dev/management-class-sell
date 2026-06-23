import { useEffect, useState } from 'react'
import { CalendarClock, Clock, MapPin, BookOpen, Loader2, GraduationCap, Star, Award, Sparkles, UserCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ScheduleSession {
  id: string
  scheduled_at: string
  duration_min: number
  status: string
  className: string
  facilityName: string | null
  courtName: string | null
  coachName: string | null
  classId: string
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

  // Profile Dialog states
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [coachDetail, setCoachDetail] = useState<{
    fullName: string
    avatarUrl: string | null
    specialty: string | null
    experienceYears: number | null
    bio: string | null
    certifications: string[] | null
  } | null>(null)
  const [assistantsList, setAssistantsList] = useState<Array<{
    fullName: string
    avatarUrl: string | null
    schoolUniversity: string | null
    major: string | null
    yearOfStudy: string | null
    skills: string | null
    bio: string | null
    certifications: string[] | null
  }>>([])

  const fetchCoachProfile = async (classId: string) => {
    setProfileLoading(true)
    setCoachDetail(null)
    setAssistantsList([])
    setProfileDialogOpen(true)

    try {
      // 1. Get class details to find coach_id
      const { data: classData, error: classError } = await (supabase
        .from('classes') as any)
        .select('coach_id')
        .eq('id', classId)
        .single()

      if (classError || !classData?.coach_id) {
        console.error('Error fetching class or coach_id:', classError)
        toast({
          title: 'Không tìm thấy lớp học',
          description: 'Không thể tải thông tin huấn luyện viên.',
          variant: 'destructive',
        })
        setProfileLoading(false)
        return
      }

      // 2. Fetch coach details
      const { data: coachData, error: coachError } = await (supabase
        .from('coaches') as any)
        .select('user_id, specialty, experience_years, bio, certifications')
        .eq('id', classData.coach_id)
        .single()

      if (coachError || !coachData) {
        console.error('Error fetching coach details:', coachError)
        toast({
          title: 'Lỗi tải thông tin HLV',
          description: 'Không thể tải chi tiết huấn luyện viên.',
          variant: 'destructive',
        })
        setProfileLoading(false)
        return
      }

      // 3. Fetch coach profile info
      const { data: coachProfile, error: profileError } = await (supabase
        .from('profiles') as any)
        .select('full_name, avatar_url')
        .eq('id', coachData.user_id)
        .single()

      if (profileError || !coachProfile) {
        console.error('Error fetching coach profile:', profileError)
        toast({
          title: 'Lỗi tải hồ sơ HLV',
          description: 'Không thể tải thông tin cá nhân của huấn luyện viên.',
          variant: 'destructive',
        })
        setProfileLoading(false)
        return
      }

      setCoachDetail({
        fullName: coachProfile.full_name,
        avatarUrl: coachProfile.avatar_url,
        specialty: coachData.specialty,
        experienceYears: coachData.experience_years,
        bio: coachData.bio,
        certifications: coachData.certifications,
      })

      // 4. Fetch assistants mapping
      const { data: caData, error: caError } = await (supabase
        .from('coach_assistants') as any)
        .select('assistant_id')
        .eq('coach_id', coachData.user_id)

      if (caError) {
        console.error('Error fetching coach assistants mapping:', caError)
      } else if (caData && caData.length > 0) {
        const assistantIds = caData.map((r: any) => r.assistant_id)

        // Fetch assistant profiles
        const { data: profilesData, error: profilesError } = await (supabase
          .from('profiles') as any)
          .select('id, full_name, avatar_url')
          .in('id', assistantIds)

        // Fetch assistant details
        const { data: detailsData, error: detailsError } = await (supabase
          .from('assistants') as any)
          .select('user_id, school_university, major, year_of_study, skills, bio, certifications')
          .in('user_id', assistantIds)

        if (profilesError || detailsError) {
          console.error('Error fetching assistants profile/details:', { profilesError, detailsError })
        } else {
          // Combine profiles and details
          const profilesList = (profilesData ?? []) as any[]
          const detailsList = (detailsData ?? []) as any[]
          const combinedAssistants = profilesList.map(p => {
            const detail = detailsList.find(d => d.user_id === p.id)
            return {
              fullName: p.full_name,
              avatarUrl: p.avatar_url,
              schoolUniversity: detail?.school_university ?? null,
              major: detail?.major ?? null,
              yearOfStudy: detail?.year_of_study ?? null,
              skills: detail?.skills ?? null,
              bio: detail?.bio ?? null,
              certifications: detail?.certifications ?? null,
            }
          })
          setAssistantsList(combinedAssistants)
        }
      }
    } catch (error: any) {
      console.error('Unexpected error:', error)
      toast({
        title: 'Lỗi không xác định',
        description: error.message || 'Đã xảy ra lỗi ngoài ý muốn.',
        variant: 'destructive',
      })
    } finally {
      setProfileLoading(false)
    }
  }

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
        .select('id, class_id, scheduled_at, duration_min, status, class_name, facility_name, court_name, coach_name')
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
            classId:      r.class_id as string,
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
                            <p className="text-xs text-gray-500 mt-0.5">
                              HLV:{' '}
                              <span
                                onClick={() => fetchCoachProfile(s.classId)}
                                className="hover:underline cursor-pointer text-red-600 font-semibold hover:text-red-700 transition-colors"
                              >
                                {s.coachName}
                              </span>
                            </p>
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
      {/* Dialog thông tin HLV & Trợ giảng */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl p-5 border border-gray-100 shadow-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-gray-100">
            <DialogTitle className="text-base font-bold text-gray-800">
              Thông tin Huấn luyện viên & Trợ giảng
            </DialogTitle>
          </DialogHeader>

          {profileLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
              <p className="text-sm text-gray-500">Đang tải hồ sơ...</p>
            </div>
          ) : (
            <div className="space-y-6 pt-3">
              {coachDetail ? (
                <div className="space-y-6">
                  {/* Coach Header Section */}
                  <div className="flex flex-col items-center text-center pb-4 border-b border-gray-100">
                    <div className="relative mb-3">
                      {coachDetail.avatarUrl ? (
                        <img
                          src={coachDetail.avatarUrl}
                          alt={coachDetail.fullName}
                          className="w-24 h-24 rounded-full object-cover border-4 border-red-500/10 shadow-lg"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-3xl font-black shadow-lg select-none">
                          {coachDetail.fullName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="absolute -bottom-1.5 right-1.5 bg-red-600 text-white p-1 rounded-full shadow-md border border-white">
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">{coachDetail.fullName}</h3>
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wider bg-red-50 px-2.5 py-0.5 rounded-full mt-1 border border-red-100">
                      Huấn luyện viên chính
                    </p>
                  </div>

                  {/* Coach Information */}
                  <div className="space-y-4">
                    {coachDetail.specialty && (
                      <div className="grid grid-cols-3 gap-2 items-center bg-gray-50/80 p-3 rounded-2xl border border-gray-100">
                        <div className="col-span-1 flex items-center gap-1.5 text-xs text-gray-400 font-bold uppercase tracking-wider">
                          <Sparkles className="w-3.5 h-3.5 text-red-500" />
                          <span>Chuyên môn</span>
                        </div>
                        <div className="col-span-2 text-sm font-semibold text-gray-800 text-right">
                          {coachDetail.specialty}
                        </div>
                      </div>
                    )}

                    {coachDetail.experienceYears !== null && (
                      <div className="grid grid-cols-3 gap-2 items-center bg-gray-50/80 p-3 rounded-2xl border border-gray-100">
                        <div className="col-span-1 flex items-center gap-1.5 text-xs text-gray-400 font-bold uppercase tracking-wider">
                          <Award className="w-3.5 h-3.5 text-red-500" />
                          <span>Kinh nghiệm</span>
                        </div>
                        <div className="col-span-2 text-sm font-semibold text-gray-800 text-right">
                          {coachDetail.experienceYears} năm
                        </div>
                      </div>
                    )}

                    {coachDetail.bio && (
                      <div className="space-y-1 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
                        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">
                          Giới thiệu bản thân
                        </label>
                        <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                          {coachDetail.bio}
                        </p>
                      </div>
                    )}

                    {coachDetail.certifications && coachDetail.certifications.length > 0 && (
                      <div className="space-y-2 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
                        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">
                          Bằng cấp & Chứng chỉ
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {coachDetail.certifications.map((cert, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-700 bg-white border border-gray-200 shadow-sm px-2.5 py-1 rounded-xl"
                            >
                              <GraduationCap className="w-3 h-3 text-red-500" />
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Không tìm thấy thông tin huấn luyện viên.</p>
              )}

              {/* Assistant Coaches Section */}
              <div className="border-t border-gray-100 pt-6 mt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-red-600" />
                  <h4 className="text-sm font-bold text-gray-800">Danh sách trợ giảng</h4>
                </div>

                {assistantsList.length === 0 ? (
                  <p className="text-xs text-gray-400 italic bg-gray-50/50 p-3 rounded-2xl text-center border border-dashed border-gray-200">
                    Lớp học này hiện tại chưa phân công trợ giảng.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {assistantsList.map((ast, idx) => (
                      <div key={idx} className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 space-y-3">
                        {/* Assistant Info Header */}
                        <div className="flex items-center gap-3">
                          {ast.avatarUrl ? (
                            <img
                              src={ast.avatarUrl}
                              alt={ast.fullName}
                              className="w-12 h-12 rounded-full object-cover border-2 border-red-500/10 shadow-sm"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-base font-black shadow-sm select-none">
                              {ast.fullName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <h5 className="text-xs font-bold text-gray-800">{ast.fullName}</h5>
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-white px-2 py-0.5 rounded-full border border-gray-150 shadow-sm inline-block mt-0.5">
                              Trợ giảng
                            </p>
                          </div>
                        </div>

                        {/* Education Detail */}
                        {(ast.schoolUniversity || ast.major || ast.yearOfStudy) && (
                          <div className="text-[11px] text-gray-600 space-y-0.5 bg-white p-2.5 rounded-xl border border-slate-150">
                            {ast.schoolUniversity && (
                              <div>
                                <span className="font-semibold text-gray-700">Trường:</span> {ast.schoolUniversity}
                              </div>
                            )}
                            {ast.major && (
                              <div>
                                <span className="font-semibold text-gray-700">Chuyên ngành:</span> {ast.major}
                              </div>
                            )}
                            {ast.yearOfStudy && (
                              <div>
                                <span className="font-semibold text-gray-700">Năm học:</span> {ast.yearOfStudy}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Skills & Bio */}
                        {ast.skills && (
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">
                              Kỹ năng trợ giảng
                            </span>
                            <p className="text-xs text-gray-700 font-semibold">{ast.skills}</p>
                          </div>
                        )}

                        {ast.bio && (
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">
                              Giới thiệu
                            </span>
                            <p className="text-xs text-gray-650 leading-relaxed italic">
                              "{ast.bio}"
                            </p>
                          </div>
                        )}

                        {ast.certifications && ast.certifications.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">
                              Chứng chỉ trợ giảng
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {ast.certifications.map((cert, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center gap-0.5 text-[9px] font-bold text-gray-600 bg-white border border-gray-150 shadow-sm px-2 py-0.5 rounded-lg"
                                >
                                  <GraduationCap className="w-2.5 h-2.5 text-red-500" />
                                  {cert}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
