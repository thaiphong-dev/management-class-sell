import { useEffect, useState } from 'react'
import { DollarSign, TrendingUp, CreditCard, BarChart2, Users } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDate } from '@/lib/utils'

interface MonthlyRevenueRow {
  month: string
  payment_count: number
  total_revenue: number
}

interface AttendanceStatPoint {
  month: string
  rate: number   // 0–100
  total: number
}

interface NewStudentPoint {
  month: string
  count: number
}

interface RecentPayment {
  id: string
  amount: number
  payment_method: string
  paid_at: string
  studentName: string
  packageName: string
}

interface ChartPoint {
  month: string
  revenue: number
}

function formatMonth(isoMonth: string): string {
  const d = new Date(isoMonth)
  return `${d.getMonth() + 1}/${d.getFullYear()}`
}

const METHOD_LABELS: Record<string, string> = {
  cash:          'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
  card:          'Thẻ',
  other:         'Khác',
}

export default function AdminReportsPage() {
  const { toast } = useToast()
  const [revenueRows, setRevenueRows] = useState<MonthlyRevenueRow[]>([])
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([])
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStatPoint[]>([])
  const [newStudents, setNewStudents] = useState<NewStudentPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadReports() {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      const [revRes, payRes, attendanceRes, studentsTimeRes] = await Promise.all([
        supabase
          .from('monthly_revenue')
          .select('month, payment_count, total_revenue')
          .order('month', { ascending: false })
          .limit(6),
        supabase
          .from('payments')
          .select(`
            id, amount, payment_method, paid_at,
            student_packages(
              packages(name),
              students(profiles(full_name))
            )
          `)
          .eq('status', 'paid')
          .order('paid_at', { ascending: false })
          .limit(10),
        // Attendance in last 6 months (aggregate by month client-side)
        supabase
          .from('attendance')
          .select('status, checked_at')
          .gte('checked_at', sixMonthsAgo.toISOString()),
        // Students created in last 6 months
        supabase
          .from('students')
          .select('created_at')
          .gte('created_at', sixMonthsAgo.toISOString()),
      ])

      if (revRes.error) {
        console.error('Failed to fetch monthly revenue:', revRes.error.message)
        toast({ title: 'Lỗi tải doanh thu', description: revRes.error.message, variant: 'destructive' })
      }
      if (payRes.error) {
        console.error('Failed to fetch recent payments:', payRes.error.message)
        toast({ title: 'Lỗi tải giao dịch', description: payRes.error.message, variant: 'destructive' })
      }

      // Revenue rows (newest first from DB) — keep as-is for stats, reverse for chart
      const rows: MonthlyRevenueRow[] = ((revRes.data ?? []) as unknown[]).map((raw: unknown) => {
        const r = raw as Record<string, unknown>
        return {
          month:         r.month as string,
          payment_count: Number(r.payment_count),
          total_revenue: Number(r.total_revenue),
        }
      })
      setRevenueRows(rows)

      // Recent payments
      const recent: RecentPayment[] = ((payRes.data ?? []) as unknown[]).map((raw: unknown) => {
        const r  = raw as Record<string, unknown>
        const sp = r.student_packages as Record<string, unknown> | null
        const pkg = sp?.packages as Record<string, unknown> | null
        const stu = sp?.students as Record<string, unknown> | null
        const prof = stu?.profiles as Record<string, unknown> | null
        return {
          id:             r.id as string,
          amount:         Number(r.amount),
          payment_method: r.payment_method as string,
          paid_at:        r.paid_at as string,
          studentName:    (prof?.full_name as string) ?? '—',
          packageName:    (pkg?.name as string) ?? '—',
        }
      })
      setRecentPayments(recent)

      // Attendance rate by month
      if (!attendanceRes.error && attendanceRes.data) {
        const byMonth: Record<string, { total: number; attended: number }> = {}
        for (const row of attendanceRes.data as Array<{ status: string; checked_at: string }>) {
          const key = row.checked_at.slice(0, 7) // YYYY-MM
          if (!byMonth[key]) byMonth[key] = { total: 0, attended: 0 }
          byMonth[key].total++
          if (row.status === 'present' || row.status === 'late') byMonth[key].attended++
        }
        const attStats: AttendanceStatPoint[] = Object.entries(byMonth)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6)
          .map(([key, v]) => ({
            month: formatMonth(key + '-01'),
            rate:  v.total > 0 ? Math.round((v.attended / v.total) * 100) : 0,
            total: v.total,
          }))
        setAttendanceStats(attStats)
      }

      // New students by month
      if (!studentsTimeRes.error && studentsTimeRes.data) {
        const byMonth: Record<string, number> = {}
        for (const row of studentsTimeRes.data as Array<{ created_at: string }>) {
          const key = row.created_at.slice(0, 7)
          byMonth[key] = (byMonth[key] ?? 0) + 1
        }
        const nsStats: NewStudentPoint[] = Object.entries(byMonth)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6)
          .map(([key, count]) => ({ month: formatMonth(key + '-01'), count }))
        setNewStudents(nsStats)
      }

      setIsLoading(false)
    }

    loadReports()
  }, [toast])

  const totalRevenue  = revenueRows.reduce((s, r) => s + r.total_revenue, 0)
  const totalPayments = revenueRows.reduce((s, r) => s + r.payment_count, 0)
  const avgRevenue    = revenueRows.length > 0 ? Math.round(totalRevenue / revenueRows.length) : 0

  // Chart: oldest month on left
  const chartData: ChartPoint[] = [...revenueRows].reverse().map(r => ({
    month:   formatMonth(r.month),
    revenue: r.total_revenue,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Báo cáo doanh thu</h2>
        <p className="text-sm text-gray-500 mt-0.5">Thống kê thu học phí 6 tháng gần nhất</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Doanh thu (6 tháng)',
            value: isLoading ? '—' : formatCurrency(totalRevenue),
            icon: DollarSign,
            color: 'text-primary-700',
            bg: 'bg-primary-50',
          },
          {
            label: 'Số giao dịch',
            value: isLoading ? '—' : totalPayments.toString(),
            icon: CreditCard,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
          },
          {
            label: 'Trung bình / tháng',
            value: isLoading ? '—' : formatCurrency(avgRevenue),
            icon: TrendingUp,
            color: 'text-court-700',
            bg: 'bg-court-50',
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
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

      {/* Revenue bar chart */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">Doanh thu theo tháng</h3>
        </div>

        {isLoading ? (
          <div className="animate-pulse h-52 bg-gray-100 rounded-xl" />
        ) : chartData.length === 0 ? (
          <div className="h-52 flex items-center justify-center">
            <p className="text-gray-400 text-sm">Chưa có dữ liệu doanh thu</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis
                tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(0)}M`}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Doanh thu']}
                labelFormatter={(label: string) => `Tháng ${label}`}
              />
              <Bar dataKey="revenue" fill="#b91c1c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Attendance rate + New students charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Attendance rate */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-court-700" />
            <h3 className="text-sm font-semibold text-gray-700">Tỷ lệ chuyên cần (6 tháng)</h3>
          </div>
          {isLoading ? (
            <div className="animate-pulse h-44 bg-gray-100 rounded-xl" />
          ) : attendanceStats.length === 0 ? (
            <div className="h-44 flex items-center justify-center">
              <p className="text-gray-400 text-sm">Chưa có dữ liệu</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={attendanceStats} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11 }} width={36} />
                <Tooltip formatter={(value: number) => [`${value}%`, 'Chuyên cần']} labelFormatter={(l: string) => `Tháng ${l}`} />
                <Line type="monotone" dataKey="rate" stroke="#15803d" strokeWidth={2} dot={{ r: 4, fill: '#15803d' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* New students per month */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-700">Học viên mới (6 tháng)</h3>
          </div>
          {isLoading ? (
            <div className="animate-pulse h-44 bg-gray-100 rounded-xl" />
          ) : newStudents.length === 0 ? (
            <div className="h-44 flex items-center justify-center">
              <p className="text-gray-400 text-sm">Chưa có dữ liệu</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={newStudents} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={28} allowDecimals={false} />
                <Tooltip formatter={(value: number) => [value, 'Học viên mới']} labelFormatter={(l: string) => `Tháng ${l}`} />
                <Bar dataKey="count" fill="#2563eb" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent payments */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Giao dịch gần đây</h3>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="animate-pulse h-12 bg-gray-100 rounded-xl" />
            ))}
          </div>
        ) : recentPayments.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-gray-400 text-sm">Chưa có giao dịch</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentPayments.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-4">
                <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.studentName}</p>
                  <p className="text-xs text-gray-500">
                    {p.packageName} · {METHOD_LABELS[p.payment_method] ?? p.payment_method}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-green-700">{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-gray-400">{formatDate(p.paid_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
