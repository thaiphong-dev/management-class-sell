import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { getAuthErrorMessage } from '@/lib/authErrors'

const registerSchema = z.object({
  fullName: z.string().min(2, 'Họ và tên tối thiểu 2 ký tự'),
  phone: z.string().min(10, 'Số điện thoại tối thiểu 10 số'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
})
type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [authError, setAuthError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    setAuthError(null)
    
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            role: 'parent',
            full_name: data.fullName,
            phone: data.phone,
          }
        }
      })

      if (signUpError) {
        throw signUpError
      }

      if (signUpData.user) {
        // Explicitly upsert the profile in case the trigger fails or is delayed
        const { error: profileError } = await (supabase
          .from('profiles') as any)
          .upsert({
            id: signUpData.user.id,
            full_name: data.fullName,
            phone: data.phone,
            role: 'parent'
          })

        if (profileError) {
          console.error('Failed to manually upsert profile:', profileError.message)
        }

        toast({
          title: 'Đăng ký thành công!',
          description: 'Chào mừng quý phụ huynh đến với Thái Phong Badminton Class.',
        })
        
        // Auto sign-in or redirect to login
        navigate('/login', { replace: true })
      }
    } catch (err: any) {
      console.error('Registration failed:', err)
      setAuthError(getAuthErrorMessage(err))
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{ background: 'linear-gradient(135deg, #180a0a 0%, #3b0f0f 50%, #1a2e0a 100%)' }}
    >
      {/* Court line decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] border border-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] border border-white/3 rounded-full" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo & Title */}
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
          >
            <svg viewBox="0 0 40 40" className="w-9 h-9" fill="none">
              <circle cx="20" cy="32" r="6" fill="white" fillOpacity="0.9" />
              <line x1="20" y1="26" x2="12" y2="8"  stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="20" y1="26" x2="20" y2="6"  stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="20" y1="26" x2="28" y2="8"  stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="8"  x2="28" y2="8"  stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="10" y1="12" x2="30" y2="12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight text-center leading-tight">Thái Phong Badminton Class</h1>
          <p className="text-white/50 text-xs mt-1">Cổng Đăng Ký Tài Khoản Phụ Huynh</p>
        </div>

        {/* Register card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-7 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => navigate('/login')}
              className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-semibold text-white">Đăng ký Phụ huynh</h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/80">Họ và tên Phụ huynh</label>
              <input
                {...register('fullName')}
                type="text"
                placeholder="Nguyễn Văn A"
                className="w-full px-3.5 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-red-500/60 transition-all text-xs"
              />
              {errors.fullName && (
                <p className="text-[10px] text-red-400 mt-0.5">{errors.fullName.message}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/80">Số điện thoại liên hệ</label>
              <input
                {...register('phone')}
                type="tel"
                placeholder="09XXXXXXXX"
                className="w-full px-3.5 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-red-500/60 transition-all text-xs"
              />
              {errors.phone && (
                <p className="text-[10px] text-red-400 mt-0.5">{errors.phone.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/80">Email đăng nhập</label>
              <input
                {...register('email')}
                type="email"
                placeholder="phuhuynh@gmail.com"
                className="w-full px-3.5 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-red-500/60 transition-all text-xs"
              />
              {errors.email && (
                <p className="text-[10px] text-red-400 mt-0.5">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/80">Mật khẩu tài khoản</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 pr-10 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-red-500/60 transition-all text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[10px] text-red-400 mt-0.5">{errors.password.message}</p>
              )}
            </div>

            {/* Auth error */}
            {authError && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl px-3 py-2">
                <p className="text-xs text-red-300">{authError}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 mt-2 rounded-xl font-semibold text-white text-xs transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-lg"
              style={{ background: isSubmitting ? '#991b1b' : 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isSubmitting ? 'Đang đăng ký...' : 'Đăng ký tài khoản'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/30 text-[9px] mt-6">
          © 2026 Thái Phong Badminton Class.
        </p>
      </div>
    </div>
  )
}
