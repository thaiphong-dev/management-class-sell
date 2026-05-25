import { useEffect, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { SkillRadar } from '@/components/progress/SkillRadar'
import { formatDate } from '@/lib/utils'
import type { SkillScores } from '@/types'

interface EvalRecord {
  id: string
  created_at: string
  overall_score: number | null
  skills: Partial<SkillScores> | null
  notes: string | null
  coachName: string | null
}

const SKILL_LABELS: Record<keyof SkillScores, string> = {
  technique: 'Kỹ thuật',
  footwork:  'Di chuyển',
  tactics:   'Chiến thuật',
  fitness:   'Thể lực',
}

export default function StudentProgressPage() {
  const { profile } = useAuthContext()
  const { toast } = useToast()
  const [evals, setEvals] = useState<EvalRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!profile) return

    async function loadProgress() {
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

      const { data, error } = await supabase
        .from('progress_evaluations')
        .select(`
          id, created_at, overall_score, skills, notes,
          coaches(user_id, profiles(full_name))
        `)
        .eq('student_id', student.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Failed to load evaluations:', error.message)
        toast({ title: 'Lỗi tải đánh giá', description: error.message, variant: 'destructive' })
        setIsLoading(false)
        return
      }

      setEvals(((data ?? []) as unknown[]).map((raw: unknown) => {
        const r = raw as Record<string, unknown>
        const coachRec = r.coaches as Record<string, unknown> | null
        const coachProfile = coachRec?.profiles as { full_name?: string } | null
        return {
          id:            r.id as string,
          created_at:    r.created_at as string,
          overall_score: r.overall_score as number | null,
          skills:        r.skills as Partial<SkillScores> | null,
          notes:         r.notes as string | null,
          coachName:     coachProfile?.full_name ?? null,
        }
      }))
      setIsLoading(false)
    }

    loadProgress()
  }, [profile, toast])

  const latestEval = evals[0]
  const latestSkills: Partial<SkillScores> = (latestEval?.skills ?? {})

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Tiến độ</h2>
        <p className="text-sm text-gray-500 mt-0.5">Đánh giá kỹ năng từ huấn luyện viên</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="animate-pulse h-48 bg-gray-100 rounded-2xl" />)}
        </div>
      ) : evals.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Chưa có đánh giá kỹ năng nào</p>
          <p className="text-gray-400 text-xs mt-1">HLV sẽ đánh giá sau mỗi buổi học</p>
        </div>
      ) : (
        <>
          {/* Radar chart - latest eval */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Kỹ năng hiện tại
              </h3>
              <span className="text-xs text-gray-400">{formatDate(latestEval.created_at)}</span>
            </div>
            {latestEval.coachName && (
              <p className="text-xs text-gray-400 mb-2">HLV: {latestEval.coachName}</p>
            )}
            <SkillRadar scores={latestSkills} />

            {/* Score row */}
            <div className="grid grid-cols-4 gap-2 mt-3">
              {(Object.keys(SKILL_LABELS) as (keyof SkillScores)[]).map(key => (
                <div key={key} className="text-center p-2 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500">{SKILL_LABELS[key]}</p>
                  <p className="text-base font-bold text-gray-900 mt-0.5">
                    {latestSkills[key] ?? '—'}
                  </p>
                </div>
              ))}
            </div>

            {latestEval.overall_score !== null && (
              <div className="mt-3 p-3 bg-primary-50 rounded-xl text-center">
                <p className="text-xs text-primary-700">Điểm tổng</p>
                <p className="text-2xl font-bold text-primary-700">{latestEval.overall_score}<span className="text-sm font-normal">/100</span></p>
              </div>
            )}

            {latestEval.notes && (
              <p className="mt-3 text-sm text-gray-600 italic border-l-2 border-primary-200 pl-3">
                "{latestEval.notes}"
              </p>
            )}
          </div>

          {/* Score over time LineChart */}
          {evals.length > 1 && evals.some(e => e.overall_score !== null) && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Tiến độ điểm tổng
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart
                  data={[...evals]
                    .filter(e => e.overall_score !== null)
                    .reverse()
                    .map(e => ({ date: formatDate(e.created_at), score: e.overall_score }))}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={30} />
                  <Tooltip
                    formatter={(value: number) => [value, 'Điểm tổng']}
                    labelFormatter={(label: string) => `Ngày ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#b91c1c"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#b91c1c' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Evaluation history */}
          {evals.length > 1 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Lịch sử đánh giá
              </h3>
              <div className="space-y-2">
                {evals.slice(1).map(e => (
                  <div key={e.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{formatDate(e.created_at)}</p>
                      {e.coachName && <p className="text-xs text-gray-400">HLV: {e.coachName}</p>}
                      {e.notes && <p className="text-xs text-gray-500 truncate mt-0.5 italic">"{e.notes}"</p>}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {(Object.keys(SKILL_LABELS) as (keyof SkillScores)[]).map(k => (
                        <div key={k} className="hidden sm:block text-center min-w-[36px]">
                          <p className="text-xs text-gray-400">{SKILL_LABELS[k].slice(0,2)}</p>
                          <p className="text-xs font-bold text-gray-900">{(e.skills as Record<string, number> | null)?.[k] ?? '—'}</p>
                        </div>
                      ))}
                      {e.overall_score !== null && (
                        <span className="text-xs bg-primary-100 text-primary-700 px-2.5 py-1 rounded-full font-semibold">
                          {e.overall_score}đ
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
