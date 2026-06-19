import { Link } from 'react-router-dom'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative text-white"
      style={{ background: 'linear-gradient(135deg, #180a0a 0%, #3b0f0f 50%, #110707 100%)' }}
    >
      {/* Decorative court lines background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] border border-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] border border-white/3 rounded-full" />
      </div>

      <div className="relative w-full max-w-md text-center space-y-6">
        {/* Animated Icon Container */}
        <div className="w-20 h-20 bg-red-650/15 border border-red-500/25 rounded-3xl flex items-center justify-center mx-auto shadow-lg animate-pulse">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl font-extrabold tracking-tight bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-xl font-bold text-white leading-tight">Không tìm thấy trang</h2>
          <p className="text-sm text-white/50 max-w-sm mx-auto leading-relaxed">
            Đường dẫn bạn truy cập không tồn tại hoặc bạn không có quyền xem nội dung này.
          </p>
        </div>

        <div className="pt-4">
          <Link to="/" replace>
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-6 font-bold flex items-center justify-center gap-2 shadow-lg transition-all hover:-translate-y-0.5">
              <ArrowLeft className="w-4 h-4" /> Quay lại trang chủ
            </Button>
          </Link>
        </div>

        <p className="text-white/20 text-[10px] uppercase tracking-wider">
          Thái Phong Badminton Class
        </p>
      </div>
    </div>
  )
}
