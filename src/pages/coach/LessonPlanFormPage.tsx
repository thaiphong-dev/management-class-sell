import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Plus, Trash2, ArrowLeft, Save, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Exercise {
  name: string
  description: string
  objective_index: string
  duration_minutes: number
}

export default function CoachLessonPlanFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuthContext()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [duration, setDuration] = useState(60)
  const [targetAudience, setTargetAudience] = useState('Cá nhân')
  const [equipment, setEquipment] = useState('')
  const [safetyCheck, setSafetyCheck] = useState('Không có vấn đề')
  const [objectives, setObjectives] = useState<string[]>([''])
  const [exercises, setExercises] = useState<Exercise[]>([
    { name: 'Khởi động', description: '', objective_index: '1', duration_minutes: 5 }
  ])
  const [comments, setComments] = useState('')
  const [evaluation, setEvaluation] = useState('')
  const [isPublic, setIsPublic] = useState(false)

  useEffect(() => {
    if (!id) return

    async function loadPlan() {
      setIsLoading(true)
      try {
        const { data, error } = await (supabase
          .from('lesson_plans') as any)
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error

        if (data) {
          // Guard: Only creator or admin can edit
          if (data.creator_id !== profile?.id && profile?.role !== 'admin') {
            toast({ title: 'Không có quyền', description: 'Bạn không thể chỉnh sửa giáo án của người khác.', variant: 'destructive' })
            navigate('/coach/lesson-plans')
            return
          }

          setTitle(data.title)
          setLocation(data.location || '')
          setDuration(data.duration_minutes)
          setTargetAudience(data.target_audience || 'Cá nhân')
          setEquipment(data.equipment || '')
          setSafetyCheck(data.safety_check || 'Không có vấn đề')
          setObjectives(data.objectives && data.objectives.length > 0 ? data.objectives : [''])
          setExercises(data.exercises && data.exercises.length > 0 ? data.exercises : [])
          setComments(data.comments || '')
          setEvaluation(data.evaluation || '')
          setIsPublic(data.is_public)
        }
      } catch (err: any) {
        console.error('Error loading lesson plan:', err.message)
        toast({ title: 'Lỗi tải giáo án', description: err.message, variant: 'destructive' })
        navigate('/coach/lesson-plans')
      } finally {
        setIsLoading(false)
      }
    }

    loadPlan()
  }, [id, profile, navigate, toast])

  // Dynamic Objectives handling
  const handleAddObjective = () => {
    setObjectives(prev => [...prev, ''])
  }

  const handleRemoveObjective = (index: number) => {
    if (objectives.length === 1) return
    setObjectives(prev => prev.filter((_, i) => i !== index))
  }

  const handleObjectiveChange = (index: number, val: string) => {
    setObjectives(prev => {
      const copy = [...prev]
      copy[index] = val
      return copy
    })
  }

  // Dynamic Exercises handling
  const handleAddExercise = () => {
    setExercises(prev => [
      ...prev,
      { name: '', description: '', objective_index: '1', duration_minutes: 10 }
    ])
  }

  const handleRemoveExercise = (index: number) => {
    setExercises(prev => prev.filter((_, i) => i !== index))
  }

  const handleExerciseChange = (index: number, field: keyof Exercise, val: any) => {
    setExercises(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: val }
      return copy
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast({ title: 'Thiếu tiêu đề', description: 'Vui lòng nhập tiêu đề giáo án.', variant: 'destructive' })
      return
    }

    // Filter empty objectives and clean up
    const filteredObjectives = objectives.map(o => o.trim()).filter(o => o !== '')
    if (filteredObjectives.length === 0) {
      toast({ title: 'Thiếu mục tiêu', description: 'Vui lòng điền ít nhất một mục tiêu buổi học.', variant: 'destructive' })
      return
    }

    // Sum exercise durations
    const totalDuration = exercises.reduce((acc, curr) => acc + (Number(curr.duration_minutes) || 0), 0)

    setIsSubmitting(true)
    try {
      const payload = {
        title: title.trim(),
        location: location.trim() || null,
        duration_minutes: totalDuration || duration,
        target_audience: targetAudience.trim() || null,
        equipment: equipment.trim() || null,
        safety_check: safetyCheck.trim(),
        objectives: filteredObjectives,
        exercises: exercises,
        comments: comments.trim() || null,
        evaluation: evaluation.trim() || null,
        is_public: isPublic,
        updated_at: new Date().toISOString()
      }

      let res
      if (id) {
        res = await (supabase
          .from('lesson_plans') as any)
          .update(payload)
          .eq('id', id)
      } else {
        res = await (supabase
          .from('lesson_plans') as any)
          .insert({
            ...payload,
            creator_id: profile?.id
          })
      }

      if (res.error) throw res.error

      toast({
        title: 'Thành công',
        description: id ? 'Cập nhật giáo án thành công.' : 'Tạo giáo án mới thành công.'
      })
      navigate('/coach/lesson-plans')
    } catch (err: any) {
      console.error('Error saving lesson plan:', err.message)
      toast({
        title: 'Lỗi lưu giáo án',
        description: err.message || 'Lỗi không xác định',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
          <p className="text-sm text-gray-500">Đang tải chi tiết giáo án...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center gap-3">
        <Link to="/coach/lesson-plans">
          <Button variant="ghost" className="h-9 w-9 p-0 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Button>
        </Link>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {id ? 'Chỉnh sửa giáo án' : 'Soạn giáo án giảng dạy mới'}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Thiết kế bài dạy tiêu chuẩn và chi tiết</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Metadata */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2">
            1. Thông tin chung giáo án
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="title" className="text-xs font-bold text-gray-600">Tiêu đề giáo án *</Label>
              <Input
                id="title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="VD: Bung cầu trái tay trên lưới - Sải khuyu gối"
                className="mt-1 border-gray-200 rounded-xl text-xs h-10 font-medium"
              />
            </div>
            <div>
              <Label htmlFor="location" className="text-xs font-bold text-gray-600">Địa điểm dạy</Label>
              <Input
                id="location"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="VD: CLB Cầu lông TT, TP. Hồ Chí Minh"
                className="mt-1 border-gray-200 rounded-xl text-xs h-10"
              />
            </div>
            <div>
              <Label htmlFor="target_audience" className="text-xs font-bold text-gray-600">Nhóm/CLB/Cá nhân</Label>
              <Input
                id="target_audience"
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value)}
                placeholder="VD: Cá nhân / Lớp cơ bản"
                className="mt-1 border-gray-200 rounded-xl text-xs h-10"
              />
            </div>
            <div>
              <Label htmlFor="equipment" className="text-xs font-bold text-gray-600">Trang bị / Dụng cụ</Label>
              <Input
                id="equipment"
                value={equipment}
                onChange={e => setEquipment(e.target.value)}
                placeholder="VD: Vợt, 50 quả cầu lông, mắc lưới, dây thun nảy..."
                className="mt-1 border-gray-200 rounded-xl text-xs h-10"
              />
            </div>
            <div>
              <Label htmlFor="safety_check" className="text-xs font-bold text-gray-600">Kiểm tra an toàn</Label>
              <Input
                id="safety_check"
                value={safetyCheck}
                onChange={e => setSafetyCheck(e.target.value)}
                placeholder="VD: Không có vấn đề / Sân không trơn trượt"
                className="mt-1 border-gray-200 rounded-xl text-xs h-10"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Objectives */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
              2. Mục tiêu buổi tập
            </h3>
            <Button
              type="button"
              variant="outline"
              onClick={handleAddObjective}
              className="text-[11px] border-primary-100 hover:bg-primary-50 hover:text-primary-700 h-8 rounded-lg font-semibold gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm mục tiêu
            </Button>
          </div>
          <p className="text-[11px] text-gray-400 -mt-1">
            Đến cuối buổi tập, vận động viên/học sinh có thể làm được gì? (Nhập ngắn gọn các mục tiêu chính)
          </p>

          <div className="space-y-3">
            {objectives.map((obj, index) => (
              <div key={index} className="flex gap-2 items-center">
                <span className="font-bold text-gray-500 text-xs w-6 text-center">{index + 1}.</span>
                <Input
                  value={obj}
                  onChange={e => handleObjectiveChange(index, e.target.value)}
                  placeholder={`Mục tiêu số ${index + 1}...`}
                  className="border-gray-200 rounded-xl text-xs h-10 flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleRemoveObjective(index)}
                  disabled={objectives.length === 1}
                  className="h-9 w-9 p-0 text-gray-400 hover:text-red-600 rounded-lg flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Table of Exercises */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
              3. Kịch bản chuỗi bài dạy (Bài tập chi tiết)
            </h3>
            <Button
              type="button"
              variant="outline"
              onClick={handleAddExercise}
              className="text-[11px] border-primary-100 hover:bg-primary-50 hover:text-primary-700 h-8 rounded-lg font-semibold gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm bài tập
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs text-left">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/60">
                  <th className="py-2.5 px-3 w-40">Tên bài tập</th>
                  <th className="py-2.5 px-3">Mô tả dạy chi tiết</th>
                  <th className="py-2.5 px-3 w-28">Mục tiêu số</th>
                  <th className="py-2.5 px-3 w-24">Thời lượng (Phút)</th>
                  <th className="py-2.5 px-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {exercises.map((ex, index) => (
                  <tr key={index} className="align-top hover:bg-gray-50/40">
                    <td className="py-3 px-2">
                      <Input
                        value={ex.name}
                        onChange={e => handleExerciseChange(index, 'name', e.target.value)}
                        placeholder="VD: Khởi động khớp"
                        className="border-gray-200 rounded-lg text-xs h-9 font-semibold"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <Textarea
                        value={ex.description}
                        onChange={e => handleExerciseChange(index, 'description', e.target.value)}
                        placeholder="VD: + Di chuyển chạy bộ ngắn sân lưới... &#10;+ Ép giãn khớp dẻo cổ tay và khớp gối..."
                        className="border-gray-200 rounded-lg text-xs min-h-[70px] resize-y py-1.5 px-2"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <Select
                        value={ex.objective_index}
                        onValueChange={val => handleExerciseChange(index, 'objective_index', val)}
                      >
                        <SelectTrigger className="bg-white border border-gray-200 rounded-lg text-xs h-9">
                          <SelectValue placeholder="Chọn MT" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-xs">Không/Thả lỏng</SelectItem>
                          {objectives.map((_, i) => (
                            <SelectItem key={i} value={String(i + 1)} className="text-xs">
                              Mục tiêu {i + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 px-2">
                      <Input
                        type="number"
                        min="1"
                        value={ex.duration_minutes}
                        onChange={e => handleExerciseChange(index, 'duration_minutes', parseInt(e.target.value) || 0)}
                        className="border-gray-200 rounded-lg text-xs h-9 text-center font-bold"
                      />
                    </td>
                    <td className="py-3 px-2 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleRemoveExercise(index)}
                        disabled={exercises.length === 1}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Notes & Comments */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2">
            4. Nhận xét & Đánh giá buổi học
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="comments" className="text-xs font-bold text-gray-600">Nhận xét mẫu (Notes / Comments)</Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder="VD: &#10;• Khởi động kỹ hơn (10 phút)&#10;• HV thể hiện ngôn ngữ cơ thể tích cực"
                className="mt-1 border-gray-200 rounded-xl text-xs min-h-[100px] resize-y"
              />
            </div>
            <div>
              <Label htmlFor="evaluation" className="text-xs font-bold text-gray-600">Đánh giá mẫu (Evaluation / Advice)</Label>
              <Textarea
                id="evaluation"
                value={evaluation}
                onChange={e => setEvaluation(e.target.value)}
                placeholder="VD: &#10;• Theo dõi sát thời lượng từng bài tập&#10;• Đặt câu hỏi mở kích thích HV tự tư duy"
                className="mt-1 border-gray-200 rounded-xl text-xs min-h-[100px] resize-y"
              />
            </div>
          </div>
        </div>

        {/* Sharing toggle & Save actions */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <Switch
              id="is_public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
            <div>
              <Label htmlFor="is_public" className="text-xs font-bold text-gray-800 cursor-pointer">
                Chia sẻ công khai giáo án này
              </Label>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Khi công khai, các HLV khác có thể xem/nhân bản giáo án, và phụ huynh có thể xem qua link chia sẻ.
              </p>
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Link to="/coach/lesson-plans" className="w-full sm:w-auto">
              <Button type="button" variant="outline" className="w-full border-gray-200 text-gray-500 rounded-xl h-10 px-5 text-xs font-semibold">
                Quay lại
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white rounded-xl h-10 px-6 text-xs font-bold gap-2 flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Lưu giáo án
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
