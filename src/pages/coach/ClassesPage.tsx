import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Users, Clock, ChevronRight, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import type { Class } from '@/types'

interface ClassRow extends Class {
  courtName: string | null
  facilityName: string | null
  studentCount: number
}

const DAYS_VN: Record<string, string> = {
  mon: 'T2', tue: 'T3', wed: 'T4', thu: 'T5', fri: 'T6', sat: 'T7', sun: 'CN',
}

const SKILL_LABELS: Record<string, string> = {
  beginner: 'Cơ bản', intermediate: 'Trung cấp', advanced: 'Nâng cao', kids: 'Thiếu nhi', all: 'Tất cả',
}

export default function CoachClassesPage() {
  const { profile } = useAuthContext()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!profile) return

    async function loadClasses() {
      let coachIds: string[] = []

      if ((profile!.role as string) === 'assistant') {
        const { data: assignments, error: assignError } = await (supabase.from('coach_assistants') as any)
          .select('coach_id')
          .eq('assistant_id', profile!.id)

        if (assignError) {
          console.error('Failed to fetch assignments:', assignError.message)
          toast({ title: 'Lỗi tải phân công', description: assignError.message, variant: 'destructive' })
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
          console.error('Failed to fetch leaders coaches:', leadersError.message)
          setIsLoading(false)
          return
        }

        coachIds = (leadersCoaches ?? []).map((c: any) => c.id)
      } else {
        const { data: coachData, error: coachError } = await (supabase.from('coaches') as any)
          .select('id')
          .eq('user_id', profile!.id)
          .maybeSingle()

        if (coachError) {
          console.error('Failed to fetch coach record:', coachError.message)
          toast({ title: 'Lỗi tải dữ liệu', description: coachError.message, variant: 'destructive' })
          setIsLoading(false)
          return
        }
        const coach = coachData as { id: string } | null
        if (!coach) {
          setIsLoading(false)
          return
        }
        coachIds = [coach.id]
      }

      if (coachIds.length === 0) {
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          courts(id, name),
          facilities(id, name),
          class_students(count)
        `)
        .in('coach_id', coachIds)
        .eq('status', 'active')
        .order('name')

      if (error) {
        console.error('Failed to load classes:', error.message)
        toast({ title: 'Lỗi tải lớp học', description: error.message, variant: 'destructive' })
        setIsLoading(false)
        return
      }

      const rows: ClassRow[] = ((data ?? []) as unknown[]).map((raw: unknown) => {
        const r = raw as Record<string, unknown>
        const courts = r.courts as { name?: string } | null
        const facilities = r.facilities as { name?: string } | null
        const cs = r.class_students as Array<{ count: number }> | null
        return {
          ...(r as Class),
          courtName: courts?.name ?? null,
          facilityName: facilities?.name ?? null,
          studentCount: cs?.[0]?.count ?? 0,
        }
      })

      setClasses(rows)
      setIsLoading(false)
    }

    loadClasses()
  }, [profile, toast])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Lớp của tôi</h2>
        <p className="text-sm text-gray-500 mt-0.5">Các lớp học bạn đang phụ trách</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="animate-pulse h-36 bg-gray-100 rounded-2xl" />)}
        </div>
      ) : classes.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Bạn chưa được phân công lớp nào</p>
          <p className="text-gray-400 text-sm mt-1">Liên hệ Admin để được phân công</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {classes.map(cls => (
            <button
              key={cls.id}
              onClick={() => navigate(`/coach/classes/${cls.id}/sessions`)}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-left hover:shadow-md hover:border-primary-200 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-court-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-court-700" />
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors mt-1" />
              </div>

              <h3 className="font-semibold text-gray-900 mb-1 truncate">{cls.name}</h3>

              {cls.skill_level && (
                <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">
                  {SKILL_LABELS[cls.skill_level] ?? cls.skill_level}
                </span>
              )}

              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Users className="w-4 h-4 flex-shrink-0 text-gray-400" />
                  <span>{cls.studentCount} / {cls.max_students} học viên</span>
                </div>

                {(cls.schedule_days && cls.schedule_days.length > 0 && cls.schedule_time) && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4 flex-shrink-0 text-gray-400" />
                    <span>
                      {cls.schedule_days.map(d => DAYS_VN[d] ?? d).join(', ')} · {cls.schedule_time}
                    </span>
                  </div>
                )}

                {cls.facilityName && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4 flex-shrink-0 text-gray-400" />
                    <span className="truncate">
                      {cls.facilityName}{cls.courtName ? ` / ${cls.courtName}` : ''}
                    </span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
