import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Printer, ShieldAlert, Award, FileText, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

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

export default function SharedLessonPage() {
  const { id } = useParams()

  const [plan, setPlan] = useState<LessonPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function loadPlan() {
      setIsLoading(true)
      try {
        const { data, error } = await (supabase
          .from('lesson_plans') as any)
          .select(`
            *,
            profiles:creator_id (full_name)
          `)
          .eq('id', id)
          .single()

        if (error) throw error

        if (data) {
          if (!data.is_public) {
            setErrorMsg('Giáo án này được đặt ở chế độ riêng tư và không thể chia sẻ công khai.')
          } else {
            setPlan(data)
          }
        }
      } catch (err: any) {
        console.error('Error loading shared lesson plan:', err.message)
        setErrorMsg('Không tìm thấy giáo án hoặc bạn không có quyền xem liên kết này.')
      } finally {
        setIsLoading(false)
      }
    }

    loadPlan()
  }, [id])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-semibold">Đang tải giáo án...</p>
        </div>
      </div>
    )
  }

  if (errorMsg || !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Không thể xem giáo án</h2>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{errorMsg || 'Đã xảy ra lỗi không xác định.'}</p>
          </div>
          <Link to="/" className="inline-block w-full">
            <Button className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-5 font-bold text-xs">
              Quay lại trang chủ
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 print:bg-white print:py-0 print:px-0">
      <div className="max-w-4xl mx-auto space-y-6 print:space-y-0">
        
        {/* Top Actions Panel (Hidden during print) */}
        <div className="flex items-center justify-between bg-white border border-gray-200 p-4 rounded-2xl shadow-sm print:hidden">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary-600" />
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
              Giáo án chia sẻ công khai
            </span>
          </div>
          <Button
            onClick={() => window.print()}
            className="bg-primary-600 hover:bg-primary-700 text-white gap-1.5 rounded-xl text-xs font-semibold h-9 px-4"
          >
            <Printer className="w-3.5 h-3.5" /> In giáo án
          </Button>
        </div>

        {/* Lesson Plan Document Block */}
        <div className="bg-white border border-gray-300 rounded-2xl p-8 shadow-sm space-y-6 print:border-0 print:shadow-none print:p-0 print:rounded-none">
          {/* Document Header */}
          <div className="text-center border-b-2 border-gray-900 pb-5 space-y-1">
            <h1 className="text-xl font-extrabold text-gray-900 uppercase tracking-wide">
              Kế Hoạch Giảng Dạy Buổi Tập
            </h1>
            <p className="text-sm font-bold text-primary-700">{plan.title}</p>
            <p className="text-xs text-gray-400 print:text-gray-500">
              Biên soạn bởi HLV: {plan.profiles?.full_name || 'Huấn luyện viên trung tâm'}
            </p>
          </div>

          {/* Grid Metadata */}
          <div className="grid grid-cols-2 border border-gray-900 text-xs">
            <div className="border-r border-b border-gray-900 p-3">
              <span className="font-bold text-gray-500 uppercase tracking-wider block text-[9px]">Địa điểm</span>
              <span className="font-bold text-gray-800 text-[11px] mt-0.5 block">{plan.location || '—'}</span>
            </div>
            <div className="border-b border-gray-900 p-3">
              <span className="font-bold text-gray-500 uppercase tracking-wider block text-[9px]">Thời lượng</span>
              <span className="font-bold text-gray-800 text-[11px] mt-0.5 block">{plan.duration_minutes} phút</span>
            </div>
            <div className="border-r border-gray-900 p-3">
              <span className="font-bold text-gray-500 uppercase tracking-wider block text-[9px]">Nhóm/CLB/Cá nhân</span>
              <span className="font-bold text-gray-800 text-[11px] mt-0.5 block">{plan.target_audience || '—'}</span>
            </div>
            <div className="p-3">
              <span className="font-bold text-gray-500 uppercase tracking-wider block text-[9px]">Trang bị/Dụng cụ</span>
              <span className="font-bold text-gray-800 text-[11px] mt-0.5 block">{plan.equipment || '—'}</span>
            </div>
            <div className="col-span-2 border-t border-gray-900 p-3 bg-gray-50/50 print:bg-transparent">
              <span className="font-bold text-gray-500 uppercase tracking-wider block text-[9px]">Kiểm tra an toàn</span>
              <span className="font-bold text-gray-800 text-[11px] mt-0.5 block">{plan.safety_check}</span>
            </div>
          </div>

          {/* Objectives */}
          <div className="border border-gray-900 p-4 space-y-2 bg-gray-50/20">
            <h3 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider border-b border-gray-900/10 pb-1.5 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-green-600 print:text-gray-800" /> Mục tiêu buổi tập
            </h3>
            <p className="text-[10px] text-gray-500 italic">Đến cuối buổi tập, vận động viên/học viên có thể:</p>
            <ol className="list-decimal list-inside space-y-1.5 pl-1 text-[11px] font-medium text-gray-800">
              {plan.objectives.map((obj, i) => (
                <li key={i} className="leading-relaxed">{obj}</li>
              ))}
            </ol>
          </div>

          {/* Exercises Table */}
          <div className="space-y-2">
            <h3 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-primary-600 print:text-gray-800" /> Nội dung & kịch bản bài dạy
            </h3>
            
            <div className="border border-gray-900 overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-900 bg-gray-50 font-bold text-gray-800 print:bg-transparent text-[10px] uppercase tracking-wider">
                    <th className="py-2 px-3 border-r border-gray-900 w-44">Tên bài tập</th>
                    <th className="py-2 px-3 border-r border-gray-900">Mô tả chi tiết bài dạy</th>
                    <th className="py-2 px-3 border-r border-gray-900 w-24 text-center">Mục tiêu số</th>
                    <th className="py-2 px-3 w-28 text-center">Thời lượng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900 font-medium text-gray-800">
                  {plan.exercises && plan.exercises.map((ex, index) => (
                    <tr key={index} className="align-top">
                      <td className="py-3 px-3 border-r border-gray-900 font-bold text-gray-900 bg-gray-50/20 print:bg-transparent">
                        {ex.name}
                      </td>
                      <td className="py-3 px-3 border-r border-gray-900 leading-relaxed whitespace-pre-wrap">
                        {ex.description}
                      </td>
                      <td className="py-3 px-3 border-r border-gray-900 text-center font-bold text-gray-600 print:text-gray-800">
                        {ex.objective_index === 'none' ? '—' : ex.objective_index}
                      </td>
                      <td className="py-3 px-3 text-center font-bold">
                        {ex.duration_minutes} phút
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Comments and Evaluations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 border border-gray-900 text-xs">
            <div className="p-4 border-b sm:border-b-0 sm:border-r border-gray-900 space-y-1.5">
              <span className="font-extrabold text-gray-900 uppercase tracking-wider block text-[10px]">
                Nhận xét mẫu (Comments)
              </span>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {plan.comments || 'Không có ghi chú nhận xét mẫu.'}
              </p>
            </div>
            <div className="p-4 space-y-1.5">
              <span className="font-extrabold text-gray-900 uppercase tracking-wider block text-[10px]">
                Đánh giá buổi học (Evaluation)
              </span>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {plan.evaluation || 'Không có ghi chú đánh giá mẫu.'}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-200 pt-5 text-[10px] text-gray-400 print:text-gray-500">
            <p>Thái Phong Badminton Class — Giáo án kỹ thuật bài bản</p>
            <p className="font-mono">{new Date(plan.created_at).toLocaleDateString('vi-VN')}</p>
          </div>

        </div>

      </div>

      {/* Print-specific style block */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
            font-size: 11px !important;
          }
          .print\\:bg-white {
            background-color: white !important;
          }
          .print\\:py-0 {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
          .print\\:px-0 {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .print\\:border-0 {
            border: 0 !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
          .print\\:text-gray-500 {
            color: #6b7280 !important;
          }
          .print\\:text-gray-800 {
            color: #1f2937 !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
