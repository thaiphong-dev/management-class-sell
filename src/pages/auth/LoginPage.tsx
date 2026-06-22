import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { getAuthErrorMessage } from '@/lib/authErrors'

const loginSchema = z.object({
  email:    z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
})
type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { signIn } = useAuthContext()
  const navigate = useNavigate()
  const [authError, setAuthError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setAuthError(null)
    const { error } = await signIn(data.email, data.password)

    if (error) {
      setAuthError(getAuthErrorMessage(error))
      return
    }

    // Fetch the session and role directly to navigate to the specific dashboard route instantly
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data: profile } = await (supabase
        .from('profiles') as any)
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile) {
        const ROLE_DASHBOARDS: Record<string, string> = {
          admin:   '/admin/dashboard',
          coach:   '/coach/dashboard',
          student: '/student/dashboard',
        }
        const redirectPath = ROLE_DASHBOARDS[profile.role] || '/'
        navigate(redirectPath, { replace: true })
        return
      }
    }

    navigate('/', { replace: true })
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #180a0a 0%, #3b0f0f 50%, #1a2e0a 100%)' }}
    >
      {/* Court line decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] border border-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] border border-white/3 rounded-full" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
          >
            <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
              <circle cx="20" cy="32" r="6" fill="white" fillOpacity="0.9" />
              <line x1="20" y1="26" x2="12" y2="8"  stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="20" y1="26" x2="20" y2="6"  stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="20" y1="26" x2="28" y2="8"  stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="8"  x2="28" y2="8"  stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="10" y1="12" x2="30" y2="12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight text-center leading-tight">Thái Phong Badminton Class</h1>
          <p className="text-white/50 text-sm mt-1">Quản lý lớp học cầu lông</p>
        </div>

        {/* Login card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-6">Đăng nhập</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/80">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="example@gmail.com"
                autoComplete="email"
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-red-500/60 transition-all text-sm"
              />
              {errors.email && (
                <p className="text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/80">Mật khẩu</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 pr-11 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-red-500/60 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Auth error */}
            {authError && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3">
                <p className="text-sm text-red-300">{authError}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
              style={{ background: isSubmitting ? '#991b1b' : 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center text-sm flex flex-col gap-2">
          <div>
            <span className="text-white/50">Bạn muốn đăng ký khóa học? </span>
            <button
              onClick={() => navigate('/register-course')}
              className="text-red-400 hover:text-red-300 font-semibold underline transition-colors"
            >
              Đăng ký khóa học ngay
            </button>
          </div>
          <div className="text-xs">
            <span className="text-white/30">Hoặc phụ huynh </span>
            <button
              onClick={() => navigate('/register')}
              className="text-red-400/80 hover:text-red-300 font-semibold underline transition-colors"
            >
              Đăng ký tài khoản Phụ huynh
            </button>
          </div>
        </div>

        <p className="text-center text-white/30 text-[10px] mt-6">
          © 2026 Thái Phong Badminton Class.
        </p>
      </div>
    </div>
  )
}
