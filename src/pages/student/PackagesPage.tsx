import { useEffect, useState, useCallback } from 'react'
import { CreditCard, Calendar, Layers, AlertTriangle, CheckCircle2, ShoppingCart, Clock, Repeat2, Trash2, Check, Loader2, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

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
  coaching_type: 'none' | '1-1' | 'group'
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
  coachingType: 'none' | '1-1' | 'group'
}

const STATUS_CONFIG: Record<PackageHistory['status'], { label: string; className: string }> = {
  pending_activation: { label: 'Chờ kích hoạt', className: 'bg-yellow-100 text-yellow-700' },
  active:             { label: 'Đang dùng',     className: 'bg-green-100 text-green-700' },
  expired:            { label: 'Hết hạn',        className: 'bg-red-100 text-red-700' },
  depleted:           { label: 'Hết buổi',       className: 'bg-gray-100 text-gray-600' },
}

export default function StudentPackagesPage({ studentId }: { studentId?: string } = {}) {
  const { profile } = useAuthContext()
  const { toast } = useToast()
  const [activeCards, setActiveCards] = useState<ActiveCard[]>([])
  const [history, setHistory] = useState<PackageHistory[]>([])
  const [availablePackages, setAvailablePackages] = useState<AvailablePackage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isChecking, setIsChecking] = useState(false)

  // Unpaid package & banking state
  const [unpaidRegistration, setUnpaidRegistration] = useState<any | null>(null)
  const [bankDetails, setBankDetails] = useState({
    bank_id: 'MSB',
    bank_account: '96886693012620',
    bank_account_name: 'TU THAI PHONG',
    bank_bin: '970426',
    bank_branch: 'CN Hà Nội'
  })

  // Catalog Buying state
  const [activeClasses, setActiveClasses] = useState<any[]>([])
  const [buyDialogOpen, setBuyDialogOpen] = useState(false)
  const [selectedPkgForBuy, setSelectedPkgForBuy] = useState<AvailablePackage | null>(null)
  const [selectedClassId, setSelectedClassId] = useState<string>('')

  const loadPageData = useCallback(async () => {
    if (!profile) return
    setIsLoading(true)
    try {
      let resolvedStudentId = studentId

      if (!resolvedStudentId) {
        const { data: studentData, error: studentError } = await (supabase
          .from('students') as any)
          .select('id')
          .eq('user_id', profile.id)
          .maybeSingle()

        if (studentError) {
          console.error('Failed to fetch student record:', studentError.message)
          setIsLoading(false)
          return
        }
        resolvedStudentId = studentData?.id
      }

      if (!resolvedStudentId) {
        setIsLoading(false)
        return
      }

      const [activeRes, historyRes, availableRes, unpaidRes, bankRes, classesRes] = await Promise.all([
        (supabase.from('active_student_packages') as any)
          .select('id, package_name, package_type, sessions_remaining, sessions_total, days_remaining, expires_at, activated_at, alert_level')
          .eq('student_id', resolvedStudentId),
        (supabase.from('student_packages') as any)
          .select('id, purchased_at, activated_at, expires_at, status, sessions_total, sessions_remaining, packages(name, package_type, coaching_type)')
          .eq('student_id', resolvedStudentId)
          .order('purchased_at', { ascending: false }),
        (supabase.from('packages') as any)
          .select('id, name, package_type, sessions_count, validity_days, price, description, coaching_type')
          .eq('status', 'active')
          .order('sort_order')
          .order('price'),
        (supabase.from('registrations') as any)
          .select('id, student_package_id, payment_id, classes(id, name), packages(id, name, price)')
          .eq('student_id', resolvedStudentId)
          .eq('payment_status', 'unpaid')
          .eq('status', 'pending')
          .maybeSingle(),
        (supabase.from('landing_settings') as any)
          .select('bank_id, bank_account, bank_account_name, bank_bin, bank_branch')
          .limit(1)
          .maybeSingle(),
        (supabase.from('classes') as any)
          .select('id, name, skill_level')
          .eq('status', 'active')
          .order('name')
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
          coachingType:      (pkg?.coaching_type as 'none' | '1-1' | 'group') ?? 'none',
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
            coaching_type:  (r.coaching_type as 'none' | '1-1' | 'group') ?? 'none',
          }
        }))
      }

      if (unpaidRes.data) {
        setUnpaidRegistration(unpaidRes.data)
      } else {
        setUnpaidRegistration(null)
      }

      if (bankRes.data) {
        setBankDetails({
          bank_id: bankRes.data.bank_id || 'MSB',
          bank_account: bankRes.data.bank_account || '96886693012620',
          bank_account_name: bankRes.data.bank_account_name || 'TU THAI PHONG',
          bank_bin: bankRes.data.bank_bin || '970426',
          bank_branch: bankRes.data.bank_branch || ''
        })
      }

      if (classesRes.data) {
        setActiveClasses(classesRes.data)
        if (classesRes.data.length > 0) {
          setSelectedClassId(classesRes.data[0].id)
        }
      }

      setActiveCards(activeRows)
      setHistory(historyRows)
    } catch (err) {
      console.error('Error loading page data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [profile, toast, studentId])

  useEffect(() => {
    loadPageData()
  }, [loadPageData])

  const handleBuyClick = (pkg: AvailablePackage) => {
    if (unpaidRegistration) {
      toast({
        title: 'Không thể đăng ký',
        description: 'Bạn đang có một thẻ học chờ thanh toán. Vui lòng thanh toán hoặc hủy thẻ đó trước.',
        variant: 'destructive'
      })
      return
    }
    setSelectedPkgForBuy(pkg)
    setBuyDialogOpen(true)
  }

  const handleConfirmBuy = async () => {
    if (!selectedPkgForBuy || !selectedClassId) return
    setIsSubmitting(true)
    try {
      const rpcName = studentId ? 'parent_buy_package' : 'student_buy_package'
      const rpcParams = studentId
        ? { p_student_id: studentId, p_class_id: selectedClassId, p_package_id: selectedPkgForBuy.id }
        : { p_class_id: selectedClassId, p_package_id: selectedPkgForBuy.id }

      const { error } = await (supabase.rpc as any)(rpcName, rpcParams)

      if (error) throw error

      toast({
        title: 'Đăng ký thành công',
        description: 'Đơn mua thẻ học đã được tạo. Vui lòng chuyển khoản để kích hoạt gói học.'
      })
      setBuyDialogOpen(false)
      await loadPageData()
    } catch (err: any) {
      console.error('Error buying package:', err.message)
      toast({
        title: 'Lỗi đăng ký mua',
        description: err.message || 'Lỗi không xác định',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelUnpaid = async (regId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn mua thẻ học chờ thanh toán này không?')) return
    setIsSubmitting(true)
    try {
      const { error } = await (supabase.rpc as any)('cancel_pending_registration', {
        p_registration_id: regId
      })

      if (error) throw error

      toast({
        title: 'Đã hủy đơn mua',
        description: 'Đơn mua thẻ học chờ thanh toán đã được hủy bỏ.'
      })
      await loadPageData()
    } catch (err: any) {
      console.error('Error in cancel_pending_registration:', err.message)
      toast({
        title: 'Lỗi hủy đơn mua',
        description: err.message || 'Lỗi không xác định',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCheckStatus = async (regId: string) => {
    setIsChecking(true)
    try {
      const { data, error } = await (supabase
        .from('registrations') as any)
        .select('payment_status, status')
        .eq('id', regId)
        .single()

      if (error) throw error

      const reg = data as any

      if (reg && (reg.payment_status === 'paid' || reg.status === 'approved')) {
        toast({
          title: 'Đã kích hoạt!',
          description: 'Hệ thống đã nhận thanh toán thành công và kích hoạt thẻ học của bạn.'
        })
        await loadPageData()
      } else {
        toast({
          title: 'Chưa thanh toán',
          description: 'Hệ thống chưa nhận được giao dịch chuyển khoản khớp với cú pháp của bạn. Vui lòng quét mã QR chuyển khoản lại hoặc đợi ít phút.'
        })
      }
    } catch (err: any) {
      console.error('Error checking registration status:', err.message)
      toast({
        title: 'Lỗi kiểm tra',
        description: err.message,
        variant: 'destructive'
      })
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Thẻ học</h2>
        <p className="text-sm text-gray-500 mt-0.5">Gói học đang dùng và lịch sử thẻ</p>
      </div>

      {/* Unpaid Registration Card (Chờ thanh toán) */}
      {!isLoading && unpaidRegistration && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-200/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
              <p className="text-sm font-bold text-amber-800 uppercase tracking-wide">Thẻ học chờ thanh toán</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full">
              Chờ chuyển khoản
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* Left info column */}
            <div className="md:col-span-7 space-y-3">
              <div>
                <p className="text-xs text-gray-500 font-medium">Gói đăng ký</p>
                <p className="text-lg font-bold text-gray-800">{unpaidRegistration.packages?.name || '—'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-gray-500 font-medium">Lớp học đăng ký</p>
                  <p className="font-semibold text-gray-700">{unpaidRegistration.classes?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Số tiền cần đóng</p>
                  <p className="font-bold text-primary-700 text-sm">
                    {formatCurrency(unpaidRegistration.packages?.price || 0)}
                  </p>
                </div>
              </div>

              {/* Bank Details Box */}
              <div className="p-3.5 bg-white border border-amber-100 rounded-xl space-y-2 text-xs">
                <p className="font-bold text-gray-700 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-amber-500" /> Hướng dẫn chuyển khoản:
                </p>
                <div className="font-mono text-[11px] text-gray-700 space-y-1">
                  <p>Ngân hàng: <span className="font-semibold">{bankDetails.bank_id}</span></p>
                  <p>Số tài khoản: <span className="font-semibold">{bankDetails.bank_account}</span></p>
                  <p>Tên tài khoản: <span className="font-semibold">{bankDetails.bank_account_name}</span></p>
                  <p>Số tiền: <span className="font-bold text-primary-700">{formatCurrency(unpaidRegistration.packages?.price || 0)}</span></p>
                  <p>Nội dung CK: <span className="bg-amber-100 font-bold px-2 py-0.5 rounded text-amber-800 select-all">TPB{unpaidRegistration.id.substring(0, 8)}</span></p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  onClick={() => handleCheckStatus(unpaidRegistration.id)}
                  disabled={isChecking || isSubmitting}
                  className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs px-4 h-9 font-semibold gap-1.5"
                >
                  {isChecking ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Kiểm tra thanh toán
                </Button>
                <Button
                  onClick={() => handleCancelUnpaid(unpaidRegistration.id)}
                  disabled={isChecking || isSubmitting}
                  variant="outline"
                  className="border-gray-200 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl text-xs px-4 h-9 font-semibold gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hủy đơn đăng ký
                </Button>
              </div>
            </div>

            {/* Right QR Column */}
            <div className="md:col-span-5 flex flex-col items-center justify-center bg-white p-3 rounded-2xl border border-amber-100 shadow-inner">
              <div className="w-40 h-40 flex items-center justify-center p-1.5 border border-gray-100 rounded-xl relative overflow-hidden bg-white">
                <img
                  src={`https://img.vietqr.io/image/${bankDetails.bank_id}-${bankDetails.bank_account}-compact2.png?amount=${unpaidRegistration.packages?.price || 0}&addInfo=TPB${unpaidRegistration.id.substring(0, 8)}&accountName=${encodeURIComponent(bankDetails.bank_account_name)}`}
                  alt="VietQR Payment QR"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-2 text-center max-w-[180px]">
                Quét mã này bằng ứng dụng ngân hàng của bạn để thanh toán nhanh chóng.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active cards */}
      {isLoading ? (
        <div className="animate-pulse h-40 bg-gray-100 rounded-2xl" />
      ) : activeCards.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium">Không có thẻ đang hoạt động</p>
          <p className="text-gray-400 text-xs mt-1">Vui lòng đăng ký gói học ở danh sách bên dưới hoặc liên hệ admin.</p>
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
          <p className="text-xs text-gray-400 mb-3">
            Đăng ký gói học trực tiếp. Thanh toán chuyển khoản qua quét mã QR để kích hoạt thẻ tự động.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availablePackages.map(pkg => (
              <div key={pkg.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{pkg.name}</p>
                      {pkg.coaching_type === '1-1' && (
                        <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">Kèm 1-1</span>
                      )}
                      {pkg.coaching_type === 'group' && (
                        <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">Kèm nhóm</span>
                      )}
                    </div>
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
                  {pkg.package_type === 'session' && pkg.coaching_type === 'none' && pkg.sessions_count !== null && (
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
                  <span className="text-lg font-bold text-primary-700">
                    {pkg.coaching_type !== 'none' ? `${formatCurrency(pkg.price)} / buổi` : formatCurrency(pkg.price)}
                  </span>
                  <Button
                    onClick={() => handleBuyClick(pkg)}
                    disabled={!!unpaidRegistration}
                    className="bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs px-3 h-8 font-semibold"
                  >
                    Đăng ký mua
                  </Button>
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
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{h.packageName}</p>
                        {h.coachingType === '1-1' && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">1-1</span>
                        )}
                        {h.coachingType === 'group' && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded-full font-semibold font-semibold">Nhóm</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
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

      {/* Dialog Đăng ký mua Gói học */}
      <Dialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen}>
        <DialogContent className="sm:max-w-[420px] bg-white border border-gray-100 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-800">Đăng ký mua gói học</DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Vui lòng chọn lớp học bạn muốn đăng ký sử dụng gói học này.
            </DialogDescription>
          </DialogHeader>

          {selectedPkgForBuy && (
            <div className="space-y-4 py-3 text-sm">
              <div className="p-3 bg-gray-50 rounded-xl space-y-1.5 border border-gray-100">
                <p className="text-xs text-gray-500 font-medium">Gói học lựa chọn</p>
                <div className="flex items-center justify-between">
                  <p className="font-bold text-gray-800">{selectedPkgForBuy.name}</p>
                  <p className="font-extrabold text-primary-700">{formatCurrency(selectedPkgForBuy.price)}</p>
                </div>
                <p className="text-[11px] text-gray-400">
                  Hiệu lực: {selectedPkgForBuy.validity_days} ngày
                  {selectedPkgForBuy.sessions_count ? ` · Số buổi: ${selectedPkgForBuy.sessions_count}` : ''}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="class_select" className="text-xs font-bold text-gray-600">Lớp học đăng ký *</Label>
                <Select
                  value={selectedClassId}
                  onValueChange={setSelectedClassId}
                >
                  <SelectTrigger className="w-full bg-white border border-gray-200 rounded-xl text-xs font-semibold h-10">
                    <SelectValue placeholder="-- Chọn lớp học --" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeClasses.map(cls => (
                      <SelectItem key={cls.id} value={cls.id} className="text-xs">
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {activeClasses.length === 0 && (
                  <p className="text-[11px] text-red-500">Không tìm thấy lớp học hoạt động nào để chọn.</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 border-t border-gray-50 pt-3 flex flex-row items-center justify-end">
            <Button
              variant="ghost"
              onClick={() => setBuyDialogOpen(false)}
              disabled={isSubmitting}
              className="rounded-xl text-xs h-9 text-gray-500 font-semibold"
            >
              Hủy
            </Button>
            <Button
              onClick={handleConfirmBuy}
              disabled={isSubmitting || !selectedClassId || activeClasses.length === 0}
              className="bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs h-9 font-semibold"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                'Xác nhận mua'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
