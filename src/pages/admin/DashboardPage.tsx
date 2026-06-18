import { useEffect, useState } from 'react'
import { Users, BookOpen, DollarSign, CalendarCheck, AlertTriangle, BarChart2, Clock } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'

interface KpiData {
  totalStudents:  number
  activeClasses:  number
  monthlyRevenue: number
  todaySessions:  number
}

interface TodaySession {
  id: string
  scheduled_at: string
  class_name: string | null
  coach_name: string | null
  court_name: string | null
  status: string
}

interface ExpiringCard {
  id: string
  studentName: string
  packageName: string
  alertLevel: 'warning' | 'critical'
  expiresAt: string | null
  sessionsRemaining: number | null
  packageType: 'session' | 'monthly'
  daysRemaining: number | null
}

interface ChartPoint {
  month: string
  revenue: number
}

function formatMonth(isoMonth: string): string {
  const d = new Date(isoMonth)
  return `${d.getMonth() + 1}/${d.getFullYear()}`
}

export default function AdminDashboardPage() {
  const { toast } = useToast()
  const [kpi, setKpi] = useState<KpiData>({
    totalStudents: 0, activeClasses: 0, monthlyRevenue: 0, todaySessions: 0,
  })
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [expiringCards, setExpiringCards] = useState<ExpiringCard[]>([])
  const [todaySessions, setTodaySessions] = useState<TodaySession[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      const today = new Date()
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
      const startOfDay   = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
      const endOfDay     = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

      const [students, classes, sessions, revenueRes, monthlyRes, expiringRes, todaySessionsRes] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('classes').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('sessions').select('id', { count: 'exact', head: true })
          .gte('scheduled_at', startOfDay).lt('scheduled_at', endOfDay)
          .neq('status', 'cancelled'),
        supabase.from('payments').select('amount').eq('status', 'paid').gte('paid_at', startOfMonth),
        supabase.from('monthly_revenue')
          .select('month, total_revenue')
          .order('month', { ascending: false })
          .limit(6),
        supabase.from('active_student_packages')
          .select('id, student_name, package_name, alert_level, expires_at, sessions_remaining, package_type, days_remaining')
          .in('alert_level', ['warning', 'critical'])
          .order('expires_at', { ascending: true })
          .limit(8),
        supabase.from('sessions_with_details')
          .select('id, scheduled_at, class_name, coach_name, court_name, status')
          .gte('scheduled_at', startOfDay)
          .lt('scheduled_at', endOfDay)
          .order('scheduled_at', { ascending: true }),
      ])

      if (todaySessionsRes.error) {
        console.error('Failed to fetch today sessions:', todaySessionsRes.error.message)
      } else {
        setTodaySessions((todaySessionsRes.data ?? []) as TodaySession[])
      }

      const hasError = students.error || classes.error || sessions.error
      if (hasError) {
        const errMsg = (students.error ?? classes.error ?? sessions.error)?.message ?? 'Unknown error'
        console.error('Failed to fetch KPI data:', errMsg)
        toast({ title: 'Lỗi tải dữ liệu', description: 'Không thể tải thống kê.', variant: 'destructive' })
      }

      if (revenueRes.error) {
        console.error('Failed to fetch revenue data:', revenueRes.error.message)
      }

      const revenueData = (revenueRes.data ?? []) as Array<{ amount: number }>
      const totalRevenue = revenueData.reduce((sum, p) => sum + Number(p.amount), 0)

      setKpi({
        totalStudents:  students.count  ?? 0,
        activeClasses:  classes.count   ?? 0,
        monthlyRevenue: totalRevenue,
        todaySessions:  sessions.count  ?? 0,
      })

      // Build chart — reverse so oldest is on left
      if (!monthlyRes.error && monthlyRes.data) {
        const chart: ChartPoint[] = [...(monthlyRes.data as unknown[])]
          .reverse()
          .map((raw: unknown) => {
            const r = raw as Record<string, unknown>
            return { month: formatMonth(r.month as string), revenue: Number(r.total_revenue) }
          })
        setChartData(chart)
      }

      // Expiring cards
      if (!expiringRes.error && expiringRes.data) {
        const cards: ExpiringCard[] = (expiringRes.data as unknown[]).map((raw: unknown) => {
          const r = raw as Record<string, unknown>
          return {
            id:                r.id as string,
            studentName:       r.student_name as string,
            packageName:       r.package_name as string,
            alertLevel:        r.alert_level as 'warning' | 'critical',
            expiresAt:         r.expires_at as string | null,
            sessionsRemaining: r.sessions_remaining as number | null,
            packageType:       r.package_type as 'session' | 'monthly',
            daysRemaining:     r.days_remaining as number | null,
          }
        })
        setExpiringCards(cards)
      }

      setIsLoading(false)
    }

    fetchDashboard()
  }, [toast])

  const kpiCards = [
    {
      label: 'Tổng học viên',
      value: isLoading ? '—' : kpi.totalStudents.toString(),
      icon:  Users,
      color: 'text-blue-600',
      bg:    'bg-blue-50',
    },
    {
      label: 'Lớp đang hoạt động',
      value: isLoading ? '—' : kpi.activeClasses.toString(),
      icon:  BookOpen,
      color: 'text-court-700',
      bg:    'bg-court-50',
    },
    {
      label: 'Doanh thu tháng',
      value: isLoading ? '—' : formatCurrency(kpi.monthlyRevenue),
      icon:  DollarSign,
      color: 'text-primary-700',
      bg:    'bg-primary-50',
    },
    {
      label: 'Buổi học hôm nay',
      value: isLoading ? '—' : kpi.todaySessions.toString(),
      icon:  CalendarCheck,
      color: 'text-purple-600',
      bg:    'bg-purple-50',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Tổng quan</h2>
        <p className="text-sm text-gray-500 mt-0.5">Thống kê hệ thống Thái Phong Badminton Class</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
              </div>
              <div className={`${bg} p-3 rounded-xl`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Today's sessions table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-semibold text-gray-700">Buổi học hôm nay</h3>
          {!isLoading && (
            <span className="ml-auto text-xs text-gray-400">{todaySessions.length} buổi</span>
          )}
        </div>
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse h-10 bg-gray-100 rounded-lg" />
            ))}
          </div>
        ) : todaySessions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400 text-sm">Không có buổi học nào hôm nay</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs text-gray-400 font-medium px-4 py-2">Lớp</th>
                  <th className="text-left text-xs text-gray-400 font-medium px-4 py-2 hidden sm:table-cell">HLV</th>
                  <th className="text-left text-xs text-gray-400 font-medium px-4 py-2 hidden md:table-cell">Sân</th>
                  <th className="text-left text-xs text-gray-400 font-medium px-4 py-2">Giờ</th>
                  <th className="text-left text-xs text-gray-400 font-medium px-4 py-2">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {todaySessions.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900 truncate max-w-[140px]">{s.class_name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600 hidden sm:table-cell">{s.coach_name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500 hidden md:table-cell">{s.court_name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{formatDateTime(s.scheduled_at)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        s.status === 'completed'   ? 'bg-green-100 text-green-700' :
                        s.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                        s.status === 'cancelled'   ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {s.status === 'completed'   ? 'Hoàn thành' :
                         s.status === 'in_progress' ? 'Đang học' :
                         s.status === 'cancelled'   ? 'Đã hủy' : 'Lịch học'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue mini chart */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700">Doanh thu 6 tháng</h3>
          </div>
          {isLoading ? (
            <div className="animate-pulse h-36 bg-gray-100 rounded-xl" />
          ) : chartData.length === 0 ? (
            <div className="h-36 flex items-center justify-center">
              <p className="text-gray-400 text-xs">Chưa có dữ liệu</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(0)}M`}
                  tick={{ fontSize: 11 }}
                  width={36}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Doanh thu']}
                  labelFormatter={(label: string) => `Tháng ${label}`}
                />
                <Bar dataKey="revenue" fill="#b91c1c" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Expiring cards */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-semibold text-gray-700">Thẻ sắp hết</h3>
          </div>
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse h-10 bg-gray-100 rounded-lg" />
              ))}
            </div>
          ) : expiringCards.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400 text-sm">Không có thẻ sắp hết</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {expiringCards.map(card => (
                <div key={card.id} className="flex items-center gap-3 p-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    card.alertLevel === 'critical' ? 'bg-red-500' : 'bg-yellow-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{card.studentName}</p>
                    <p className="text-xs text-gray-500 truncate">{card.packageName}</p>
                  </div>
                  <div className="text-right flex-shrink-0 text-xs text-gray-500">
                    {card.packageType === 'session' && card.sessionsRemaining !== null ? (
                      <span className={card.alertLevel === 'critical' ? 'text-red-600 font-medium' : 'text-yellow-600 font-medium'}>
                        {card.sessionsRemaining} buổi
                      </span>
                    ) : card.expiresAt ? (
                      <span className={card.alertLevel === 'critical' ? 'text-red-600 font-medium' : 'text-yellow-600 font-medium'}>
                        {card.daysRemaining !== null ? `${card.daysRemaining} ngày` : formatDate(card.expiresAt)}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
