import { useAppStore } from '@/stores/useAppStore'
import StudentPackagesPage from '@/pages/student/PackagesPage'
import { AlertCircle } from 'lucide-react'

export default function ParentPackagesPage() {
  const { activeChildId } = useAppStore()

  if (!activeChildId) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white border border-gray-100 rounded-2xl text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-gray-400" />
        <div>
          <h3 className="text-base font-semibold text-gray-800">Chưa chọn học viên con</h3>
          <p className="text-sm text-gray-500 mt-1">Vui lòng đăng ký/thêm hồ sơ của con hoặc chọn con ở thanh menu trên đầu.</p>
        </div>
      </div>
    )
  }

  return <StudentPackagesPage studentId={activeChildId} />
}
