import { useEffect, useState } from 'react'
import { ChevronLeft, Save, TrendingUp, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SkillRadar } from '@/components/progress/SkillRadar'
import { formatDate } from '@/lib/utils'
import type { SkillScores } from '@/types'

type ViewState =
  | { stage: 'classes' }
  | { stage: 'students'; classId: string; className: string }
  | { stage: 'eval'; classId: string; className: string; studentId: string; studentName: string }

interface ClassOption { id: string; name: string }
interface StudentOption { id: string; name: string }
interface EvalRecord {
  id: string
  created_at: string
  overall_score: number | null
  skills: Partial<SkillScores> | null
  notes: string | null
}

const SKILL_KEYS: (keyof SkillScores)[] = ['technique', 'footwork', 'tactics', 'fitness']
const SKILL_LABELS: Record<keyof SkillScores, string> = {
  technique: 'Kỹ thuật',
  footwork:  'Di chuyển',
  tactics:   'Chiến thuật',
  fitness:   'Thể lực',
}

export default function CoachProgressPage() {
  const { profile } = useAuthContext()
  const { toast } = useToast()

  const [coachId, setCoachId] = useState<string | null>(null)
  const [view, setView] = useState<ViewState>({ stage: 'classes' })
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [students, setStudents] = useState<StudentOption[]>([])
  const [evals, setEvals] = useState<EvalRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    technique: '70', footwork: '70', tactics: '70', fitness: '70',
    overall_score: '70', notes: '',
  })

  // Load coach ID + classes
  useEffect(() => {
    if (!profile) return

    async function loadCoach() {
      const { data, error } = await supabase
        .from('coaches')
        .select('id')
        .eq('user_id', profile!.id)
        .maybeSingle()

      if (error || !data) {
        console.error('Failed to load coach:', error?.message)
        setIsLoading(false)
        return
      }
      const coach = data as { id: string }
      setCoachId(coach.id)

      const { data: cls, error: clsErr } = await supabase
        .from('classes')
        .select('id, name')
        .eq('coach_id', coach.id)
        .eq('status', 'active')
        .order('name')

      if (clsErr) {
        console.error('Failed to load classes:', clsErr.message)
      }
      setClasses((cls ?? []) as ClassOption[])
      setIsLoading(false)
    }
    loadCoach()
  }, [profile])

  // Load students when entering student stage
  useEffect(() => {
    if (view.stage !== 'students') return
    const { classId: currentClassId } = view

    async function loadStudents() {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('class_students')
        .select('students(id, user_id, profiles(full_name))')
        .eq('class_id', currentClassId)
        .eq('status', 'active')

      if (error) {
        console.error('Failed to load students:', error.message)
        toast({ title: 'Lỗi tải học viên', description: error.message, variant: 'destructive' })
      } else {
        setStudents(((data ?? []) as unknown[]).map((raw: unknown) => {
          const r = raw as Record<string, unknown>
          const s = r.students as Record<string, unknown> | null
          const p = s?.profiles as { full_name?: string } | null
          return { id: s?.id as string, name: p?.full_name ?? '—' }
        }).filter(s => s.id))
      }
      setIsLoading(false)
    }
    loadStudents()
  }, [view, toast])

  // Load evaluations when entering eval stage
  useEffect(() => {
    if (view.stage !== 'eval') return
    const { studentId: currentStudentId } = view

    async function loadEvals() {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('progress_evaluations')
        .select('id, created_at, overall_score, skills, notes')
        .eq('student_id', currentStudentId)
        .eq('coach_id', coachId ?? '')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Failed to load evaluations:', error.message)
        toast({ title: 'Lỗi tải đánh giá', description: error.message, variant: 'destructive' })
      }
      setEvals((data ?? []) as EvalRecord[])
      setIsLoading(false)
    }
    if (coachId) loadEvals()
  }, [view, coachId])

  async function saveEval() {
    if (view.stage !== 'eval' || !coachId) return
    setSaving(true)

    const clamp = (val: string) => Math.min(100, Math.max(0, parseInt(val) || 0))

    const skills: SkillScores = {
      technique: clamp(form.technique),
      footwork:  clamp(form.footwork),
      tactics:   clamp(form.tactics),
      fitness:   clamp(form.fitness),
    }

    const { error } = await supabase.from('progress_evaluations').insert({
      student_id:    view.studentId,
      coach_id:      coachId,
      overall_score: clamp(form.overall_score),
      skills,
      notes:         form.notes.trim() || null,
    } as never)

    if (error) {
      console.error('Failed to save evaluation:', error.message)
      toast({ title: 'Lỗi lưu đánh giá', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Đã lưu đánh giá', description: `${view.studentName} — ${formatDate(new Date().toISOString())}` })
      setForm({ technique: '70', footwork: '70', tactics: '70', fitness: '70', overall_score: '70', notes: '' })
      // Reload evals
      const { data } = await supabase
        .from('progress_evaluations')
        .select('id, created_at, overall_score, skills, notes')
        .eq('student_id', view.studentId)
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false })
        .limit(10)
      setEvals((data ?? []) as EvalRecord[])
    }
    setSaving(false)
  }

  // ── Render: class list ────────────────────────────────────────────────────────
  if (view.stage === 'classes') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Đánh giá học viên</h2>
          <p className="text-sm text-gray-500 mt-0.5">Chọn lớp để đánh giá tiến độ</p>
        </div>
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="animate-pulse h-14 bg-gray-100 rounded-2xl" />)}</div>
        ) : classes.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
            <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Bạn chưa được phân công lớp nào</p>
          </div>
        ) : (
          <div className="space-y-2">
            {classes.map(c => (
              <button
                key={c.id}
                onClick={() => setView({ stage: 'students', classId: c.id, className: c.name })}
                className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all text-left"
              >
                <div className="w-9 h-9 bg-court-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-court-700" />
                </div>
                <span className="font-medium text-gray-900">{c.name}</span>
                <span className="ml-auto text-gray-400">›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Render: student list ──────────────────────────────────────────────────────
  if (view.stage === 'students') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setView({ stage: 'classes' })} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{view.className}</h2>
            <p className="text-sm text-gray-500 mt-0.5">Chọn học viên để đánh giá</p>
          </div>
        </div>
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="animate-pulse h-14 bg-gray-100 rounded-xl" />)}</div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Chưa có học viên trong lớp</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
            {students.map(s => (
              <button
                key={s.id}
                onClick={() => setView({ stage: 'eval', classId: view.classId, className: view.className, studentId: s.id, studentName: s.name })}
                className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-semibold">{s.name.charAt(0).toUpperCase()}</span>
                </div>
                <span className="flex-1 text-sm font-medium text-gray-900">{s.name}</span>
                <span className="text-gray-400">›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Render: eval form + history ───────────────────────────────────────────────
  const latestEval = evals[0]
  const latestSkills: Partial<SkillScores> = (latestEval?.skills as Partial<SkillScores>) ?? {}

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setView({ stage: 'students', classId: view.classId, className: view.className })} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{view.studentName}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{view.className} · Đánh giá kỹ năng</p>
        </div>
      </div>

      {/* Latest radar */}
      {latestEval && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Đánh giá gần nhất — {formatDate(latestEval.created_at)}
          </h3>
          {latestEval.notes && <p className="text-xs text-gray-500 mb-3 italic">"{latestEval.notes}"</p>}
          <SkillRadar scores={latestSkills} />
        </div>
      )}

      {/* New eval form */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Đánh giá mới</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {SKILL_KEYS.map(key => (
              <div key={key}>
                <Label>{SKILL_LABELS[key]} (0–100)</Label>
                <Input
                  className="mt-1"
                  type="number" min={0} max={100}
                  value={form[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div>
            <Label>Điểm tổng (0–100)</Label>
            <Input
              className="mt-1"
              type="number" min={0} max={100}
              value={form.overall_score}
              onChange={e => setForm(p => ({ ...p, overall_score: e.target.value }))}
            />
          </div>
          <div>
            <Label>Nhận xét</Label>
            <Textarea
              className="mt-1 resize-none"
              rows={3}
              placeholder="Nhận xét về học viên..."
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            />
          </div>
          <Button onClick={saveEval} disabled={saving} className="w-full bg-primary-600 hover:bg-primary-700 text-white gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Đang lưu...' : 'Lưu đánh giá'}
          </Button>
        </div>
      </div>

      {/* Eval history */}
      {evals.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Lịch sử đánh giá</h3>
          <div className="space-y-3">
            {evals.map(e => (
              <div key={e.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{formatDate(e.created_at)}</p>
                  {e.notes && <p className="text-xs text-gray-500 truncate">{e.notes}</p>}
                </div>
                <div className="flex gap-2 text-xs text-gray-500 flex-shrink-0">
                  {SKILL_KEYS.map(k => (
                    <span key={k} className="hidden sm:block">{SKILL_LABELS[k].charAt(0)}: <strong className="text-gray-900">{(e.skills as Record<string, number> | null)?.[k] ?? '—'}</strong></span>
                  ))}
                  <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-semibold">
                    {e.overall_score ?? '—'}đ
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
