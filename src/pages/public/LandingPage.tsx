import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, Calendar, CreditCard, Phone, Mail, ExternalLink,
  ChevronRight, ArrowRight, Shield, Award, Users, MapPin, Clock
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { formatCurrency } from '@/lib/utils'

interface LandingSettings {
  hero_title: string
  hero_subtitle: string
  center_intro: string
  contact_phone: string
  contact_email: string
  zalo_url: string
  facebook_url: string
}

interface CoursePackage {
  id: string
  name: string
  package_type: 'session' | 'monthly'
  sessions_count: number | null
  validity_days: number
  price: number
  description: string | null
  coaching_type: 'none' | '1-1' | 'group'
  is_featured: boolean
}

interface ClassInfo {
  id: string
  name: string
  skill_level: 'beginner' | 'intermediate' | 'advanced'
  schedule_days: string[]
  schedule_time: string
  duration_min: number
  coach_name: string
  facility_name: string
  court_name: string
}

const DAY_LABELS: Record<string, string> = {
  mon: 'T2', tue: 'T3', wed: 'T4', thu: 'T5', fri: 'T6', sat: 'T7', sun: 'CN'
}

const SKILL_LABELS: Record<ClassInfo['skill_level'], { label: string; className: string }> = {
  beginner:     { label: 'Cơ bản', className: 'bg-green-50 text-green-700 border-green-200' },
  intermediate: { label: 'Trung cấp', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  advanced:     { label: 'Nâng cao', className: 'bg-red-50 text-red-700 border-red-200' },
}

export default function LandingPage() {
  const { session, profile } = useAuthContext()
  const [settings, setSettings] = useState<LandingSettings>({
    hero_title: 'Học Cầu Lông Cùng Thái Phong Badminton Class',
    hero_subtitle: 'Chương trình đào tạo chuyên nghiệp từ cơ bản đến nâng cao dành cho mọi lứa tuổi',
    center_intro: 'Chào mừng đến với Thái Phong Badminton Class! Chúng tôi cung cấp các khóa học cầu lông chất lượng cao với đội ngũ huấn luyện viên giàu kinh nghiệm, cơ sở vật chất hiện đại, và lộ trình đào tạo cá nhân hóa rõ ràng.',
    contact_phone: '0901234567',
    contact_email: 'thaiphong.dev@gmail.com',
    zalo_url: 'https://zalo.me/',
    facebook_url: 'https://facebook.com/',
  })
  const [packages, setPackages] = useState<CoursePackage[]>([])
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [settingsRes, packagesRes, classesRes] = await Promise.all([
          supabase.from('landing_settings').select('*').limit(1).maybeSingle(),
          supabase.from('packages').select('*').eq('status', 'active').order('sort_order').order('price'),
          supabase.from('classes').select(`
            id, name, skill_level, schedule_days, schedule_time, duration_min,
            coaches(profiles(full_name)),
            facilities(name),
            courts(name)
          `).eq('status', 'active')
        ])

        if (!settingsRes.error && settingsRes.data) {
          setSettings(settingsRes.data as LandingSettings)
        }

        if (!packagesRes.error && packagesRes.data) {
          setPackages(packagesRes.data as CoursePackage[])
        }

        if (!classesRes.error && classesRes.data) {
          // Format classes relation data
          const formattedClasses = (classesRes.data as any[]).map(c => {
            const coachProfile = c.coaches?.profiles
            const coachName = Array.isArray(coachProfile)
              ? coachProfile[0]?.full_name
              : coachProfile?.full_name

            return {
              id: c.id,
              name: c.name,
              skill_level: c.skill_level,
              schedule_days: c.schedule_days ?? [],
              schedule_time: c.schedule_time,
              duration_min: c.duration_min,
              coach_name: coachName ?? 'Huấn luyện viên',
              facility_name: c.facilities?.name ?? 'Cơ sở',
              court_name: c.courts?.name ?? 'Sân tập',
            }
          })
          setClasses(formattedClasses)
        }
      } catch (err) {
        console.error('Error loading landing page data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const dashboardPath = profile
    ? `/${profile.role}/dashboard`
    : '/login'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-red-500 selection:text-white">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#180a0a]/95 backdrop-blur border-b border-white/5 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
            >
              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none">
                <circle cx="12" cy="19" r="3.5" fill="white" fillOpacity="0.9" />
                <line x1="12" y1="15.5" x2="7"  y2="4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="12" y1="15.5" x2="12" y2="3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="12" y1="15.5" x2="17" y2="4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
             <span className="font-bold text-base tracking-tight">Thái Phong Badminton Class</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-white/80 font-medium">
            <a href="#intro" className="hover:text-red-500 transition-colors">Giới thiệu</a>
            <a href="#courses" className="hover:text-red-500 transition-colors">Khóa học</a>
            <a href="#classes" className="hover:text-red-500 transition-colors">Lịch học</a>
            <a href="#contact" className="hover:text-red-500 transition-colors">Liên hệ</a>
          </nav>

          <div>
            {session ? (
              <Link
                to={dashboardPath}
                className="px-4 py-2 text-xs sm:text-sm rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white transition-all shadow-sm flex items-center gap-1.5 hover:translate-x-0.5 transform duration-150"
              >
                Vào bảng điều khiển <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 text-xs sm:text-sm rounded-xl font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#180a0a] text-white py-20 lg:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(220,38,38,0.15),transparent_45%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold uppercase tracking-wider">
                🏸 Thái Phong Badminton Class Academy
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight bg-gradient-to-r from-white via-white to-red-400 bg-clip-text text-transparent">
                {settings.hero_title}
              </h1>
              <p className="text-base sm:text-lg text-white/70 max-w-xl leading-relaxed">
                {settings.hero_subtitle}
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <a
                  href="#courses"
                  className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-all shadow-lg hover:shadow-red-900/20 flex items-center gap-2 hover:-translate-y-0.5"
                >
                  Khám phá khóa học <ChevronRight className="w-4 h-4" />
                </a>
                <a
                  href="#classes"
                  className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-sm border border-white/10 transition-all flex items-center gap-2 hover:-translate-y-0.5"
                >
                  Xem lịch khai giảng
                </a>
              </div>
            </div>
            <div className="lg:col-span-5 hidden lg:flex justify-center relative">
              <div className="w-80 h-80 rounded-3xl bg-gradient-to-br from-red-600/35 to-primary-900/50 p-0.5 shadow-2xl relative rotate-3 overflow-hidden group hover:rotate-1 transition-transform duration-500">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=600')] bg-cover bg-center opacity-85 mix-blend-overlay group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#180a0a] via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <p className="text-xs uppercase tracking-wider text-red-400 font-bold mb-1">HLV Chuyên Nghiệp</p>
                  <p className="font-extrabold text-lg">Đào tạo bài bản theo lộ trình quốc tế</p>
                </div>
              </div>
              {/* Decorative circle glow */}
              <div className="absolute -z-10 w-72 h-72 rounded-full bg-red-600/25 blur-3xl opacity-50 -bottom-10" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Introduction Section ────────────────────────────────────────────── */}
      <section id="intro" className="py-16 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Về Thái Phong Badminton Class</h2>
            <div className="h-1 w-12 bg-red-600 mx-auto rounded-full" />
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
              {settings.center_intro}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-12">
            {[
              { icon: Shield, title: 'Chất lượng hàng đầu', desc: 'Giáo trình đào tạo bài bản, chuẩn hóa từ cơ bản đến thi đấu' },
              { icon: Award, title: 'HLV chuyên nghiệp', desc: 'Đội ngũ giáo viên giàu kinh nghiệm, tận tâm hướng dẫn từng học viên' },
              { icon: Users, title: 'Cộng đồng năng động', desc: 'Giao lưu học hỏi cùng hàng trăm học viên yêu thích cầu lông' },
            ].map((feat, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 mb-4">
                  <feat.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-2">{feat.title}</h3>
                <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Courses Section ──────────────────────────────────────────────────── */}
      <section id="courses" className="py-16 bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-2 mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Khóa Học & Gói Học</h2>
            <p className="text-gray-500 text-xs sm:text-sm">Lựa chọn chương trình đào tạo phù hợp nhất với nhu cầu của bạn</p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse h-48 bg-white rounded-2xl border border-gray-100" />
              ))}
            </div>
          ) : packages.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm max-w-md mx-auto">
              <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm font-medium">Hiện tại chưa có gói học nào được mở bán</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {packages.map(pkg => (
                <div
                  key={pkg.id}
                  className={`bg-white rounded-2xl border transition-all p-5 flex flex-col gap-4 relative hover:shadow-lg ${
                    pkg.is_featured
                      ? 'border-red-500 ring-1 ring-red-500/20 shadow-md scale-102 sm:scale-105 z-10'
                      : 'border-gray-200 shadow-sm'
                  }`}
                >
                  {pkg.is_featured && (
                    <span className="absolute top-0 right-6 transform -translate-y-1/2 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Phổ biến
                    </span>
                  )}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-gray-900 text-base sm:text-lg">{pkg.name}</h3>
                      <div className="flex gap-1.5 flex-wrap mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          pkg.package_type === 'session' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                        }`}>
                          {pkg.package_type === 'session' ? 'Theo buổi' : 'Theo tháng'}
                        </span>
                        {pkg.coaching_type === '1-1' && (
                          <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">Kèm 1-1</span>
                        )}
                        {pkg.coaching_type === 'group' && (
                          <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-semibold">Kèm nhóm</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {pkg.description && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-3 leading-relaxed flex-grow">
                      {pkg.description}
                    </p>
                  )}

                  <div className="flex flex-col gap-1 border-t border-gray-50 pt-3 text-xs text-gray-500">
                    {pkg.package_type === 'session' && pkg.coaching_type === 'none' && pkg.sessions_count !== null && (
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                        {pkg.sessions_count} buổi tập
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      Hiệu lực sử dụng {pkg.validity_days} ngày
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between mt-auto pt-3 border-t border-gray-100">
                    <div>
                      <span className="text-xl font-extrabold text-red-600">{formatCurrency(pkg.price)}</span>
                      {pkg.coaching_type !== 'none' && (
                        <span className="text-xs text-gray-400 font-normal"> / buổi</span>
                      )}
                    </div>
                    <a
                      href="#contact"
                      className={`text-xs px-3.5 py-2 rounded-xl font-bold transition-colors shadow-sm ${
                        pkg.is_featured
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      Đăng ký ngay
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Classes Section ──────────────────────────────────────────────────── */}
      <section id="classes" className="py-16 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-2 mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Danh Sách Lớp Học</h2>
            <p className="text-gray-500 text-xs sm:text-sm">Lịch học linh hoạt, chia theo trình độ từ cơ bản đến nâng cao</p>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-xl" />
              ))}
            </div>
          ) : classes.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl p-12 text-center border border-gray-100 max-w-md mx-auto">
              <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm font-medium">Hiện tại chưa có lớp học nào hoạt động công khai</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.map(cls => (
                <div key={cls.id} className="bg-gray-50 rounded-2xl p-5 border border-gray-100 hover:border-red-200 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-gray-900 text-base truncate">{cls.name}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${SKILL_LABELS[cls.skill_level]?.className}`}>
                        {SKILL_LABELS[cls.skill_level]?.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        {cls.facility_name} (Sân {cls.court_name})
                      </span>
                      <span className="flex items-center gap-1 font-medium text-gray-600 bg-white px-2 py-0.5 rounded-lg border border-gray-200/50">
                        HLV: {cls.coach_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {cls.schedule_days.map(d => (
                        <span key={d} className="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 rounded-md font-bold">
                          {DAY_LABELS[d] ?? d}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1.5 flex-shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-200">
                    <div className="flex items-center gap-1 text-xs font-semibold text-gray-800 bg-white px-3 py-1.5 rounded-xl border border-gray-200/60">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {cls.schedule_time.slice(0, 5)} · {cls.duration_min} phút
                    </div>
                    <a
                      href="#contact"
                      className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1.5 ml-auto sm:ml-0"
                    >
                      Đăng ký xếp lớp <ChevronRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Contact Section ─────────────────────────────────────────────────── */}
      <section id="contact" className="py-16 bg-gradient-to-br from-[#180a0a] to-[#2b1010] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-6 space-y-6">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Liên Hệ Tư Vấn Học</h2>
              <p className="text-sm text-white/60 leading-relaxed max-w-md">
                Phụ huynh và học viên có nhu cầu đăng ký học thử, kiểm tra trình độ xếp lớp, vui lòng liên hệ trực tiếp với Thái Phong Badminton Class để được hỗ trợ tốt nhất.
              </p>
              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/25 flex items-center justify-center text-red-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-white/40 text-xs">Hotline di động</p>
                    <a href={`tel:${settings.contact_phone}`} className="font-bold hover:text-red-400 transition-colors">{settings.contact_phone}</a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/25 flex items-center justify-center text-red-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-white/40 text-xs">Địa chỉ email</p>
                    <a href={`mailto:${settings.contact_email}`} className="font-medium hover:text-red-400 transition-colors">{settings.contact_email}</a>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-6 flex flex-col justify-center gap-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                <h3 className="font-extrabold text-base tracking-wide">Kênh Trực Tuyến</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <a
                    href={settings.zalo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
                  >
                    <div>
                      <p className="font-bold text-sm">Zalo Tư Vấn</p>
                      <p className="text-[10px] text-white/50">Nhắn tin trực tiếp</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                  </a>
                  <a
                    href={settings.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
                  >
                    <div>
                      <p className="font-bold text-sm">Facebook Fanpage</p>
                      <p className="text-[10px] text-white/50">Cập nhật tin tức</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="bg-[#110707] py-6 border-t border-white/5 text-white/40 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Thái Phong Badminton Class. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/login" className="hover:text-white transition-colors">Đăng nhập Quản trị</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
