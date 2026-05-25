import { useEffect, useState } from 'react'
import { CreditCard, Calendar, Layers, AlertTriangle, CheckCircle2, ShoppingCart, Clock, Repeat2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDate } from '@/lib/utils'

interface ActiveCard {
  id: string
  packageName: string
  packageType: 'session' | 'monthly'
  sessionsRemaining: number | null
  sessionsTotal: number | null
  daysRemaining: number | null
  expiresAt: string | null
  activatedAt: string | null
  alertLevel: 'ok' | 'warning' | 'critical'
}

interface AvailablePackage {
  id: string
  name: string
  package_type: 'session' | 'monthly'
  sessions_count: number | null
  validity_days: number
  price: number
  description: string | null
}

interface PackageHistory {
  id: string
  packageName: string
  packageType: 'session' | 'monthly'
  purchasedAt: string
  activatedAt: string | null
  expiresAt: string | null
  status: 'pending_activation' | 'active' | 'expired' | 'depleted'
  sessionsTotal: number | null
  sessionsRemaining: number | null
}

const STATUS_CONFIG: Record<PackageHistory['status'], { label: string; className: string }> = {
  pending_activation: { label: 'Chờ kích hoạt', className: 'bg-yellow-100 text-yellow-700' },
  active:             { label: 'Đang dùng',     className: 'bg-green-100 text-green-700' },
  expired:            { label: 'Hết hạn',        className: 'bg-red-100 text-red-700' },
  depleted:           { label: 'Hết buổi',       className: 'bg-gray-100 text-gray-600' },
}

export default function StudentPackagesPage() {
  const { profile } = useAuthContext()
  const { toast } = useToast()
  const [activeCards, setActiveCards] = useState<ActiveCard[]>([])
  const [history, setHistory] = useState<PackageHistory[]>([])
  const [availablePackages, setAvailablePackages] = useState<AvailablePackage[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!profile) return

    async function loadPackages() {
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', profile!.id)
        .maybeSingle()

      if (studentError) {
        console.error('Failed to fetch student record:', studentError.message)
        setIsLoading(false)
        return
      }
      const student = studentData as { id: string } | null
      if (!student) { setIsLoading(false); return }

      const [activeRes, historyRes, availableRes] = await Promise.all([
        supabase
          .from('active_student_packages')
          .select('id, package_name, package_type, sessions_remaining, sessions_total, days_remaining, expires_at, activated_at, alert_level')
          .eq('student_id', student.id),
        supabase
          .from('student_packages')
          .select('id, purchased_at, activated_at, expires_at, status, sessions_total, sessions_remaining, packages(name, package_type)')
          .eq('student_id', student.id)
          .order('purchased_at', { ascending: false }),
        supabase
          .from('packages')
          .select('id, name, package_type, sessions_count, validity_days, price, description')
          .eq('status', 'active')
          .order('sort_order')
          .order('price'),
      ])

      if (activeRes.error) {
        console.error('Failed to fetch active packages:', activeRes.error.message)
        toast({ title: 'Lỗi tải thẻ học', description: activeRes.error.message, variant: 'destructive' })
      }
      if (historyRes.error) {
        console.error('Failed to fetch package history:', historyRes.error.message)
        toast({ title: 'Lỗi tải lịch sử', description: historyRes.error.message, variant: 'destructive' })
      }

      const activeRows: ActiveCard[] = ((activeRes.data ?? []) as unknown[]).map((raw: unknown) => {
        const r = raw as Record<string, unknown>
        return {
          id:                r.id as string,
          packageName:       r.package_name as string,
          packageType:       r.package_type as 'session' | 'monthly',
          sessionsRemaining: r.sessions_remaining as number | null,
          sessionsTotal:     r.sessions_total as number | null,
          daysRemaining:     r.days_remaining as number | null,
          expiresAt:         r.expires_at as string | null,
          activatedAt:       r.activated_at as string | null,
          alertLevel:        r.alert_level as 'ok' | 'warning' | 'critical',
        }
      })

      const historyRows: PackageHistory[] = ((historyRes.data ?? []) as unknown[]).map((raw: unknown) => {
        const r = raw as Record<string, unknown>
        const pkg = r.packages as Record<string, unknown> | null
        return {
          id:                r.id as string,
          packageName:       (pkg?.name as string) ?? '—',
          packageType:       (pkg?.package_type as 'session' | 'monthly') ?? 'session',
          purchasedAt:       r.purchased_at as string,
          activatedAt:       r.activated_at as string | null,
          expiresAt:         r.expires_at as string | null,
          status:            r.status as PackageHistory['status'],
          sessionsTotal:     r.sessions_total as number | null,
          sessionsRemaining: r.sessions_remaining as number | null,
        }
      })

      if (!availableRes.error && availableRes.data) {
        setAvailablePackages((availableRes.data as unknown[]).map((raw: unknown) => {
          const r = raw as Record<string, unknown>
          return {
            id:             r.id as string,
            name:           r.name as string,
            package_type:   r.package_type as 'session' | 'monthly',
            sessions_count: r.sessions_count as number | null,
            validity_days:  r.validity_days as number,
            price:          Number(r.price),
            description:    r.description as string | null,
          }
        }))
      }

      setActiveCards(activeRows)
      setHistory(historyRows)
      setIsLoading(false)
    }

    loadPackages()
  }, [profile, toast])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Thẻ học</h2>
        <p className="text-sm text-gray-500 mt-0.5">Gói học đang dùng và lịch sử thẻ</p>
      </div>

      {/* Active cards */}
      {isLoading ? (
        <div className="animate-pulse h-40 bg-gray-100 rounded-2xl" />
      ) : activeCards.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium">Không có thẻ đang hoạt động</p>
          <p className="text-gray-400 text-xs mt-1">Liên hệ admin để mua gói học</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeCards.map(card => (
            <ActivePackageCard key={card.id} card={card} />
          ))}
        </div>
      )}

      {/* Available packages catalog */}
      {!isLoading && availablePackages.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart className="w-4 h-4 text-primary-700" />
            <h3 className="text-base font-semibold text-gray-800">Gói học có thể đăng ký</h3>
          </div>
          <p className="text-xs text-gray-400 mb-3">Liên hệ Admin hoặc HLV để được cấp gói. Thanh toán và kích hoạt qua quản trị viên.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availablePackages.map(pkg => (
              <div key={pkg.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{pkg.name}</p>
                    {pkg.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{pkg.description}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2 ${
                    pkg.package_type === 'session' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                  }`}>
                    {pkg.package_type === 'session' ? 'Theo buổi' : 'Theo tháng'}
                  </span>
                </div>

                <div className="flex gap-3 text-xs text-gray-500">
                  {pkg.package_type === 'session' && pkg.sessions_count !== null && (
                    <span className="flex items-center gap-1">
                      <Repeat2 className="w-3.5 h-3.5 text-blue-500" />
                      {pkg.sessions_count} buổi
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    Hiệu lực {pkg.validity_days} ngày
                  </span>
                </div>

                <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                  <span className="text-lg font-bold text-primary-700">{formatCurrency(pkg.price)}</span>
                  <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">Liên hệ Admin</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-3">Lịch sử thẻ</h3>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse h-14 bg-gray-100 rounded-xl" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="p-10 text-center">
              <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Chưa có lịch sử thẻ</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {history.map(h => {
                const cfg = STATUS_CONFIG[h.status] ?? STATUS_CONFIG.expired
                return (
                  <div key={h.id} className="flex items-center gap-3 p-4">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{h.packageName}</p>
                      <p className="text-xs text-gray-500">
                        Mua: {formatDate(h.purchasedAt)}
                        {h.expiresAt ? ` · HH: ${formatDate(h.expiresAt)}` : ''}
                      </p>
                      {h.sessionsTotal !== null && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {h.sessionsRemaining ?? 0} / {h.sessionsTotal} buổi còn lại
                        </p>
                      )}
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${cfg.className}`}>
                      {cfg.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sub-component ────────────────────────────────────────────────────────────

interface ActivePackageCardProps {
  card: ActiveCard
}

function ActivePackageCard({ card }: ActivePackageCardProps) {
  const ALERT_GRADIENT: Record<ActiveCard['alertLevel'], string> = {
    ok:       'from-primary-600 to-primary-800',
    warning:  'from-yellow-500 to-orange-600',
    critical: 'from-red-600 to-red-800',
  }

  // Suppress TS "possible undefined" for formatCurrency — sessionsTotal is checked
  const sessionsPercent = (card.sessionsTotal ?? 0) > 0
    ? Math.round(((card.sessionsRemaining ?? 0) / card.sessionsTotal!) * 100)
    : 0

  return (
    <div className={`bg-gradient-to-br ${ALERT_GRADIENT[card.alertLevel]} rounded-2xl p-5 text-white shadow-md`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-white/70 uppercase tracking-wide">Thẻ học đang dùng</p>
          <p className="text-lg font-bold mt-0.5">{card.packageName}</p>
        </div>
        <div className="bg-white/20 rounded-xl p-2">
          {card.alertLevel !== 'ok'
            ? <AlertTriangle className="w-5 h-5 text-white" />
            : <CheckCircle2 className="w-5 h-5 text-white" />
          }
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {card.packageType === 'session' && card.sessionsTotal !== null && (
          <div className="bg-white/15 rounded-xl p-3">
            <p className="text-xs text-white/70">Buổi còn lại</p>
            <p className="text-2xl font-bold">
              {card.sessionsRemaining ?? 0}
              <span className="text-sm font-normal text-white/70"> / {card.sessionsTotal}</span>
            </p>
            <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${sessionsPercent}%` }}
              />
            </div>
          </div>
        )}
        {card.packageType === 'monthly' && card.activatedAt && card.expiresAt && (
          <div className="bg-white/15 rounded-xl p-3">
            <p className="text-xs text-white/70">Thời gian còn lại</p>
            {(() => {
              const total = new Date(card.expiresAt).getTime() - new Date(card.activatedAt).getTime()
              const remaining = Math.max(0, new Date(card.expiresAt).getTime() - Date.now())
              const pct = total > 0 ? Math.round((remaining / total) * 100) : 0
              return (
                <>
                  <p className="text-2xl font-bold">
                    {card.daysRemaining ?? 0}
                    <span className="text-sm font-normal text-white/70"> ngày</span>
                  </p>
                  <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </>
              )
            })()}
          </div>
        )}
        {card.expiresAt && (
          <div className="bg-white/15 rounded-xl p-3">
            <p className="text-xs text-white/70">Ngày hết hạn</p>
            <p className="text-base font-bold">{formatDate(card.expiresAt)}</p>
            {card.daysRemaining !== null && (
              <p className="text-xs text-white/70 mt-0.5">còn {card.daysRemaining} ngày</p>
            )}
          </div>
        )}
      </div>

      {card.activatedAt && (
        <div className="mt-3 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-white/60" />
          <p className="text-xs text-white/60">Kích hoạt: {formatDate(card.activatedAt)}</p>
        </div>
      )}
    </div>
  )
}

