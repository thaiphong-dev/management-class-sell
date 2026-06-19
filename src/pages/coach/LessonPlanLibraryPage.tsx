import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, Search, Share2, Copy, Edit, Trash2, BookOpen, Clock, MapPin, Globe, Lock, BookCopy
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

interface LessonPlan {
  id: string
  creator_id: string
  title: string
  location: string | null
  duration_minutes: number
  target_audience: string | null
  equipment: string | null
  safety_check: string
  objectives: string[]
  exercises: any[]
  comments: string | null
  evaluation: string | null
  is_public: boolean
  created_at: string
  profiles?: {
    full_name: string
  }
}

export default function CoachLessonPlanLibraryPage() {
  const { profile } = useAuthContext()
  const { toast } = useToast()

  const [plans, setPlans] = useState<LessonPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'my' | 'public'>('my')

  // Share Dialog state
  const [sharePlan, setSharePlan] = useState<LessonPlan | null>(null)
  const [copied, setCopied] = useState(false)

  // Submitting state for cloning / deleting
  const [isActionLoading, setIsActionLoading] = useState(false)

  async function loadPlans() {
    setIsLoading(true)
    try {
      const { data, error } = await (supabase
        .from('lesson_plans') as any)
        .select(`
          *,
          profiles:creator_id (full_name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPlans(data || [])
    } catch (err: any) {
      console.error('Error loading lesson plans:', err.message)
      toast({ title: 'Lỗi tải giáo án', description: err.message, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPlans()
  }, [])

  const handleClone = async (plan: LessonPlan) => {
    if (!profile) return
    setIsActionLoading(true)
    try {
      const { error } = await (supabase
        .from('lesson_plans') as any)
        .insert({
          creator_id: profile.id,
          title: `${plan.title} (Nhân bản)`,
          location: plan.location,
          duration_minutes: plan.duration_minutes,
          target_audience: plan.target_audience,
          equipment: plan.equipment,
          safety_check: plan.safety_check,
          objectives: plan.objectives,
          exercises: plan.exercises,
          comments: plan.comments,
          evaluation: plan.evaluation,
          is_public: false
        })

      if (error) throw error

      toast({
        title: 'Nhân bản thành công',
        description: `Giáo án "${plan.title}" đã được nhân bản vào thư viện của bạn.`
      })
      await loadPlans()
    } catch (err: any) {
      console.error('Error cloning plan:', err.message)
      toast({
        title: 'Lỗi nhân bản giáo án',
        description: err.message,
        variant: 'destructive'
      })
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa giáo án "${title}" không?`)) return
    setIsActionLoading(true)
    try {
      const { error } = await (supabase
        .from('lesson_plans') as any)
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Đã xóa giáo án',
        description: `Giáo án "${title}" đã được xóa thành công.`
      })
      await loadPlans()
    } catch (err: any) {
      console.error('Error deleting plan:', err.message)
      toast({
        title: 'Lỗi xóa giáo án',
        description: err.message,
        variant: 'destructive'
      })
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleTogglePublic = async (plan: LessonPlan) => {
    setIsActionLoading(true)
    try {
      const { error } = await (supabase
        .from('lesson_plans') as any)
        .update({ is_public: !plan.is_public })
        .eq('id', plan.id)

      if (error) throw error

      toast({
        title: plan.is_public ? 'Đã hủy công khai' : 'Đã công khai giáo án',
        description: plan.is_public 
          ? 'Giáo án hiện đã bị ẩn khỏi thư viện công cộng.' 
          : 'Giáo án hiện đã có sẵn cho mọi người và phụ huynh có thể xem qua link chia sẻ.'
      })
      await loadPlans()
    } catch (err: any) {
      console.error('Error updating public status:', err.message)
      toast({
        title: 'Lỗi cập nhật',
        description: err.message,
        variant: 'destructive'
      })
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}/shared/lessons/${id}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast({ title: 'Đã sao chép liên kết', description: 'Gửi liên kết này cho phụ huynh học viên xem giáo án.' })
    setTimeout(() => setCopied(false), 2000)
  }

  // Filter plans based on search and active tab
  const filteredPlans = plans.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase())
    if (activeTab === 'my') {
      return matchesSearch && p.creator_id === profile?.id
    } else {
      return matchesSearch && p.is_public && p.creator_id !== profile?.id
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Thư viện giáo án</h2>
          <p className="text-sm text-gray-500 mt-0.5">Quản lý, thiết kế và chia sẻ giáo án giảng dạy</p>
        </div>
        <Link to="/coach/lesson-plans/new">
          <Button className="bg-primary-600 hover:bg-primary-700 text-white gap-2 rounded-xl">
            <Plus className="w-4 h-4" /> Soạn giáo án
          </Button>
        </Link>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('my')}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'my' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Giáo án của tôi
          </button>
          <button
            onClick={() => setActiveTab('public')}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'public' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Thư viện hệ thống
          </button>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm tiêu đề giáo án..."
            className="pl-9 bg-gray-50 border-gray-200 rounded-xl text-xs"
          />
        </div>
      </div>

      {/* Plans List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse h-44 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center max-w-lg mx-auto">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-700 text-sm">Chưa có giáo án nào</p>
          <p className="text-gray-400 text-xs mt-1">
            {activeTab === 'my' 
              ? 'Hãy nhấp nút "Soạn giáo án" ở góc phải để tạo giáo án giảng dạy đầu tiên.' 
              : 'Thư viện hệ thống chưa có giáo án công khai nào từ các HLV khác.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPlans.map(plan => {
            const isOwn = plan.creator_id === profile?.id
            return (
              <div
                key={plan.id}
                className="bg-white border border-gray-200 hover:border-primary-100/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{plan.title}</h3>
                    {isOwn && (
                      <span
                        onClick={() => handleTogglePublic(plan)}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 cursor-pointer select-none transition-all ${
                          plan.is_public 
                            ? 'bg-green-50 text-green-700 hover:bg-green-100' 
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                        title="Click để thay đổi chế độ chia sẻ"
                      >
                        {plan.is_public ? (
                          <>
                            <Globe className="w-2.5 h-2.5" /> Công khai
                          </>
                        ) : (
                          <>
                            <Lock className="w-2.5 h-2.5" /> Riêng tư
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-400 line-clamp-2">
                    {plan.objectives && plan.objectives.length > 0
                      ? `Mục tiêu: ${plan.objectives.join(', ')}`
                      : 'Chưa có thông tin mục tiêu buổi học.'}
                  </p>

                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-gray-500 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {plan.duration_minutes} phút
                    </span>
                    {plan.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        {plan.location}
                      </span>
                    )}
                    {plan.profiles?.full_name && (
                      <span className="text-primary-700 font-semibold">
                        HLV: {plan.profiles.full_name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-auto">
                  <div className="flex items-center gap-1">
                    {isOwn ? (
                      <>
                        <Link to={`/coach/lesson-plans/${plan.id}/edit`}>
                          <Button variant="ghost" className="h-8 w-8 p-0 text-gray-500 hover:text-primary-700 rounded-lg">
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          onClick={() => handleDelete(plan.id, plan.title)}
                          disabled={isActionLoading}
                          className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        onClick={() => handleClone(plan)}
                        disabled={isActionLoading}
                        className="text-xs text-gray-500 hover:text-primary-700 font-semibold h-8 rounded-lg gap-1 px-2.5"
                      >
                        <BookCopy className="w-3.5 h-3.5" /> Nhân bản
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Link to={`/shared/lessons/${plan.id}`} target="_blank">
                      <Button variant="outline" className="text-xs border-gray-200 text-gray-600 h-8 rounded-lg font-semibold">
                        Xem chi tiết
                      </Button>
                    </Link>
                    {plan.is_public && (
                      <Button
                        onClick={() => setSharePlan(plan)}
                        className="bg-primary-50/50 hover:bg-primary-50 text-primary-700 border border-primary-100 h-8 w-8 p-0 rounded-lg"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Share Dialog */}
      <Dialog open={!!sharePlan} onOpenChange={open => !open && setSharePlan(null)}>
        <DialogContent className="sm:max-w-md bg-white border border-gray-150 rounded-2xl shadow-xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-800">Chia sẻ giáo án buổi học</DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Sao chép liên kết này gửi cho phụ huynh hoặc trợ giảng để xem chi tiết bài học.
            </DialogDescription>
          </DialogHeader>

          {sharePlan && (
            <div className="space-y-4 py-3">
              <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-1 text-xs">
                <p className="font-semibold text-gray-600">Giáo án: <span className="text-gray-800 font-bold">{sharePlan.title}</span></p>
                <p className="text-gray-400">HLV trưởng: {sharePlan.profiles?.full_name || profile?.full_name}</p>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/shared/lessons/${sharePlan.id}`}
                  className="flex-1 bg-gray-50 border-gray-200 text-xs font-mono select-all rounded-xl h-10 px-3"
                />
                <Button
                  onClick={() => handleCopyLink(sharePlan.id)}
                  className="bg-primary-600 hover:bg-primary-700 text-white rounded-xl px-4 h-10 text-xs font-semibold gap-1.5 flex-shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? 'Đã chép' : 'Sao chép'}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-gray-50 pt-3">
            <Button
              onClick={() => setSharePlan(null)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl px-4 h-9 text-xs font-semibold ml-auto"
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
