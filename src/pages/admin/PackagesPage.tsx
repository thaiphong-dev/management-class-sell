import { useEffect, useState, useCallback } from 'react'
import { Plus, CreditCard, Users, Zap, ToggleLeft, ToggleRight, Search, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Package } from '@/types'
 
// ─── types ────────────────────────────────────────────────────────────────────
 
interface StudentPackageRow {
  id: string
  student_id: string
  status: string
  purchased_at: string
  activated_at: string | null
  expires_at: string | null
  sessions_total: number | null
  sessions_remaining: number | null
  packageName: string
  packageType: string
  studentName: string
  studentPhone: string | null
}
 
interface StudentOption { id: string; name: string; phone: string | null }
 
interface PkgForm {
  name: string; package_type: 'session' | 'monthly'
  sessions_count: string; validity_days: string
  price: string; description: string
  is_featured: boolean; status: 'active' | 'inactive'
  coaching_type: 'none' | '1-1' | 'group'
}
 
interface AssignForm {
  student_id: string; package_id: string
  amount: string; payment_method: 'cash' | 'transfer' | 'card' | 'other'
  activate_now: boolean
  coaching_sessions: string
}
 
const EMPTY_PKG: PkgForm = {
  name: '', package_type: 'session', sessions_count: '12',
  validity_days: '60', price: '1000000', description: '',
  is_featured: false, status: 'active', coaching_type: 'none',
}
const EMPTY_ASSIGN: AssignForm = {
  student_id: '', package_id: '', amount: '',
  payment_method: 'cash', activate_now: false,
  coaching_sessions: '10',
}
 
const SP_STATUS_CFG: Record<string, { label: string; className: string }> = {
  pending_activation: { label: 'Chờ kích hoạt', className: 'bg-gray-100 text-gray-600' },
  active:             { label: 'Đang dùng',      className: 'bg-green-100 text-green-700' },
  expired:            { label: 'Hết hạn',         className: 'bg-red-100 text-red-700' },
  depleted:           { label: 'Hết buổi',        className: 'bg-orange-100 text-orange-700' },
}
 
const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Thẻ', other: 'Khác',
}
 
// ─── component ────────────────────────────────────────────────────────────────
 
export default function PackagesPage() {
  const { profile } = useAuthContext()
  const { toast } = useToast()
  const [packages, setPackages] = useState<Package[]>([])
  const [studentPkgs, setStudentPkgs] = useState<StudentPackageRow[]>([])
  const [students, setStudents] = useState<StudentOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [spFilter, setSpFilter] = useState<string>('all')
  const [spSearch, setSpSearch] = useState('')
 
  const [pkgDialog, setPkgDialog] = useState<{ open: boolean; id?: string; form: PkgForm }>({
    open: false, form: { ...EMPTY_PKG },
  })
  const [assignDialog, setAssignDialog] = useState(false)
  const [assignForm, setAssignForm] = useState<AssignForm>({ ...EMPTY_ASSIGN })
  const [deleteConfirmPkgId, setDeleteConfirmPkgId] = useState<string | null>(null)
 
  // ── load ────────────────────────────────────────────────────────────────────
 
  const loadPackages = useCallback(async () => {
    const { data, error } = await supabase
      .from('packages').select('*').order('sort_order').order('name')
    if (error) {
      console.error('Failed to load packages:', error.message)
      toast({ title: 'Lỗi tải gói học', description: error.message, variant: 'destructive' })
    } else {
      setPackages((data ?? []) as Package[])
    }
  }, [toast])
 
  const loadStudentPackages = useCallback(async () => {
    const { data, error } = await supabase
      .from('student_packages')
      .select(`
        id, student_id, status, purchased_at, activated_at, expires_at,
        sessions_total, sessions_remaining,
        packages(name, package_type),
        students(id, user_id, profiles(full_name, phone))
      `)
      .order('purchased_at', { ascending: false })
 
    if (error) {
      console.error('Failed to load student packages:', error.message)
      toast({ title: 'Lỗi tải thẻ học viên', description: error.message, variant: 'destructive' })
      return
    }
 
    setStudentPkgs(((data ?? []) as unknown[]).map((raw: unknown) => {
      const r = raw as Record<string, unknown>
      const pkg = r.packages as { name?: string; package_type?: string } | null
      const student = r.students as Record<string, unknown> | null
      const prof = student?.profiles as { full_name?: string; phone?: string } | null
      return {
        id: r.id as string,
        student_id: r.student_id as string,
        status: r.status as string,
        purchased_at: r.purchased_at as string,
        activated_at: r.activated_at as string | null,
        expires_at: r.expires_at as string | null,
        sessions_total: r.sessions_total as number | null,
        sessions_remaining: r.sessions_remaining as number | null,
        packageName: pkg?.name ?? '—',
        packageType: pkg?.package_type ?? 'session',
        studentName: prof?.full_name ?? '—',
        studentPhone: prof?.phone ?? null,
      }
    }))
  }, [toast])
 
  const loadStudents = useCallback(async () => {
    const { data, error } = await supabase
      .from('students')
      .select('id, profiles(full_name, phone)')
      .eq('status', 'active')
      .order('id')
 
    if (error) {
      console.error('Failed to load students:', error.message)
      toast({ title: 'Lỗi tải danh sách học viên', description: error.message, variant: 'destructive' })
      return
    }
    setStudents(((data ?? []) as unknown[]).map((raw: unknown) => {
      const r = raw as Record<string, unknown>
      const p = r.profiles as { full_name?: string; phone?: string } | null
      return { id: r.id as string, name: p?.full_name ?? '—', phone: p?.phone ?? null }
    }))
  }, [toast])
 
  useEffect(() => {
    Promise.all([loadPackages(), loadStudentPackages(), loadStudents()])
      .finally(() => setIsLoading(false))
  }, [loadPackages, loadStudentPackages, loadStudents])

  // ── package CRUD ─────────────────────────────────────────────────────────────

  async function savePackage() {
    const f = pkgDialog.form
    if (!f.name.trim() || !f.price) return
    setSaving(true)

    const payload = {
      name:           f.name.trim(),
      package_type:   f.package_type,
      sessions_count: f.coaching_type !== 'none' ? 1 : (f.package_type === 'session' ? parseInt(f.sessions_count) || null : null),
      validity_days:  parseInt(f.validity_days) || 30,
      price:          parseFloat(f.price.replace(/[^0-9.]/g, '')) || 0,
      description:    f.description.trim() || null,
      is_featured:    f.is_featured,
      status:         f.status,
      coaching_type:  f.coaching_type,
    }

    const { error } = pkgDialog.id
      ? await supabase.from('packages').update(payload as never).eq('id', pkgDialog.id)
      : await supabase.from('packages').insert(payload as never)

    if (error) {
      console.error('Failed to save package:', error.message)
      toast({ title: 'Lỗi lưu gói học', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: pkgDialog.id ? 'Đã cập nhật gói học' : 'Đã tạo gói học mới' })
      setPkgDialog({ open: false, form: { ...EMPTY_PKG } })
      await loadPackages()
    }
    setSaving(false)
  }

  async function togglePackageStatus(pkg: Package) {
    const newStatus = pkg.status === 'active' ? 'inactive' : 'active'
    const { error } = await supabase
      .from('packages').update({ status: newStatus } as never).eq('id', pkg.id)
    if (error) {
      toast({ title: 'Lỗi cập nhật', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: `Gói học đã ${newStatus === 'active' ? 'kích hoạt' : 'tắt'}` })
      await loadPackages()
    }
  }

  async function deletePackage(id: string) {
    setSaving(true)
    const { error } = await supabase
      .from('packages')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('Failed to delete package:', error.message)
      toast({
        title: 'Lỗi xóa gói học',
        description: error.message.includes('foreign key') || error.message.includes('violates foreign key')
          ? 'Không thể xóa gói học này vì đã có học viên đăng ký sử dụng.'
          : error.message,
        variant: 'destructive',
      })
    } else {
      toast({ title: 'Đã xóa gói học thành công' })
      await loadPackages()
    }
    setSaving(false)
    setDeleteConfirmPkgId(null)
  }

  // ── assign package ───────────────────────────────────────────────────────────

  async function assignPackage() {
    const f = assignForm
    if (!f.student_id || !f.package_id || !f.amount) return
    setSaving(true)

    const selectedPkg = packages.find(p => p.id === f.package_id)
    const now = new Date().toISOString()
    const activatedAt = f.activate_now ? now : null
    const expiresAt = f.activate_now && selectedPkg
      ? new Date(Date.now() + (selectedPkg.validity_days * 24 * 60 * 60 * 1000)).toISOString()
      : null

    const isCoaching = selectedPkg && selectedPkg.coaching_type && selectedPkg.coaching_type !== 'none'
    const sessionsCount = isCoaching 
      ? (parseInt(f.coaching_sessions) || 1) 
      : (selectedPkg?.package_type === 'session' ? selectedPkg.sessions_count : null)

    const spPayload = {
      student_id:         f.student_id,
      package_id:         f.package_id,
      sessions_total:     sessionsCount,
      sessions_remaining: sessionsCount,
      status:             f.activate_now ? 'active' : 'pending_activation',
      activated_at:       activatedAt,
      expires_at:         expiresAt,
      created_by:         profile?.id ?? null,
    }

    const { data: spData, error: spError } = await supabase
      .from('student_packages').insert(spPayload as never).select('id').single()

    if (spError || !spData) {
      console.error('Failed to assign package:', spError?.message)
      toast({ title: 'Lỗi cấp thẻ', description: spError?.message ?? 'Lỗi không xác định', variant: 'destructive' })
      setSaving(false)
      return
    }

    const spId = (spData as { id: string }).id

    const { error: payError } = await supabase.from('payments').insert({
      student_id:         f.student_id,
      student_package_id: spId,
      amount:             parseFloat(f.amount.replace(/[^0-9.]/g, '')),
      payment_method:     f.payment_method,
      status:             'paid',
      paid_at:            now,
      received_by:        profile?.id ?? null,
    } as never)

    if (payError) {
      console.error('Failed to record payment:', payError.message)
      // Rollback: delete the student_package that was just created to keep data consistent
      await supabase.from('student_packages').delete().eq('id', spId)
      toast({
        title: 'Lỗi ghi thanh toán',
        description: 'Không thể ghi nhận thanh toán. Thẻ chưa được cấp — vui lòng thử lại.',
        variant: 'destructive',
      })
    } else {
      toast({ title: 'Đã cấp thẻ và ghi nhận thanh toán' })
      setAssignDialog(false)
      setAssignForm({ ...EMPTY_ASSIGN })
      await loadStudentPackages()
    }
    setSaving(false)
  }

  async function activateStudentPackage(sp: StudentPackageRow) {
    // Re-fetch the package for validity_days
    const { data: pkgData } = await supabase
      .from('student_packages')
      .select('package_id, packages(validity_days)')
      .eq('id', sp.id)
      .single()

    const pRaw = pkgData as Record<string, unknown> | null
    const pInfo = pRaw?.packages as { validity_days?: number } | null
    const validityDays = pInfo?.validity_days ?? 30

    const now = new Date()
    const expiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000).toISOString()

    const { error } = await supabase.from('student_packages').update({
      activated_at: now.toISOString(),
      expires_at:   expiresAt,
      status:       'active',
    } as never).eq('id', sp.id)

    if (error) {
      toast({ title: 'Lỗi kích hoạt', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Đã kích hoạt thẻ học viên' })
      await loadStudentPackages()
    }
  }

  // ── derived data ─────────────────────────────────────────────────────────────

  const filteredSP = studentPkgs.filter(sp => {
    const matchStatus = spFilter === 'all' || sp.status === spFilter
    const matchSearch = !spSearch ||
      sp.studentName.toLowerCase().includes(spSearch.toLowerCase()) ||
      (sp.studentPhone ?? '').includes(spSearch)
    return matchStatus && matchSearch
  })

  const selectedPkg = packages.find(p => p.id === assignForm.package_id)

  // Pre-fill amount when package selected
  function onSelectPackage(pkgId: string) {
    const pkg = packages.find(p => p.id === pkgId)
    const isCoaching = pkg && pkg.coaching_type && pkg.coaching_type !== 'none'
    const sessions = isCoaching ? 10 : 1
    const amount = pkg 
      ? String(isCoaching ? Number(pkg.price) * sessions : pkg.price) 
      : ''
    
    setAssignForm(prev => ({
      ...prev,
      package_id: pkgId,
      amount: amount,
      coaching_sessions: isCoaching ? '10' : '1',
    }))
  }

  function onChangeCoachingSessions(sessionsVal: string) {
    const sessions = parseInt(sessionsVal) || 0
    setAssignForm(prev => {
      const pkg = packages.find(p => p.id === prev.package_id)
      const price = pkg ? Number(pkg.price) : 0
      return {
        ...prev,
        coaching_sessions: sessionsVal,
        amount: String(price * sessions),
      }
    })
  }

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Gói học & Học phí</h2>
          <p className="text-sm text-gray-500 mt-0.5">Quản lý gói học và thẻ tập học viên</p>
        </div>
      </div>

      <Tabs defaultValue="packages">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="packages">Gói học ({packages.length})</TabsTrigger>
          <TabsTrigger value="cards">Thẻ học viên ({studentPkgs.length})</TabsTrigger>
        </TabsList>

        {/* ── Tab: Packages ────────────────────────────────────────────────── */}
        <TabsContent value="packages" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => setPkgDialog({ open: true, form: { ...EMPTY_PKG } })}
              className="bg-primary-600 hover:bg-primary-700 text-white gap-2"
            >
              <Plus className="w-4 h-4" /> Thêm gói học
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-xl" />)}</div>
          ) : packages.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
              <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Chưa có gói học nào</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
              {packages.map(pkg => (
                <div key={pkg.id} className="flex items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{pkg.name}</p>
                      {pkg.is_featured && (
                        <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">Nổi bật</span>
                      )}
                      {pkg.coaching_type === '1-1' && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Kèm 1-1</span>
                      )}
                      {pkg.coaching_type === 'group' && (
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">Kèm nhóm</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {pkg.coaching_type && pkg.coaching_type !== 'none'
                        ? `${formatCurrency(Number(pkg.price))} / buổi · Hạn ${pkg.validity_days} ngày`
                        : (pkg.package_type === 'session'
                            ? `${pkg.sessions_count} buổi / ${pkg.validity_days} ngày`
                            : `${pkg.validity_days} ngày · Không giới hạn buổi`)}
                      {pkg.coaching_type === 'none' && ` · ${formatCurrency(Number(pkg.price))}`}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    pkg.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {pkg.status === 'active' ? 'Đang bán' : 'Tạm ngừng'}
                  </span>
                  <button
                    onClick={() => setPkgDialog({ open: true, id: pkg.id, form: {
                      name: pkg.name, package_type: pkg.package_type as 'session' | 'monthly',
                      sessions_count: String(pkg.sessions_count ?? 12),
                      validity_days: String(pkg.validity_days),
                      price: String(pkg.price),
                      description: pkg.description ?? '',
                      is_featured: pkg.is_featured ?? false,
                      status: pkg.status as 'active' | 'inactive',
                      coaching_type: pkg.coaching_type ?? 'none',
                    }})}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600 transition-colors"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => togglePackageStatus(pkg)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title={pkg.status === 'active' ? 'Tắt gói' : 'Bật gói'}
                  >
                    {pkg.status === 'active'
                      ? <ToggleRight className="w-5 h-5 text-green-500" />
                      : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => setDeleteConfirmPkgId(pkg.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
                    title="Xóa gói học"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Student Cards ────────────────────────────────────────────── */}
        <TabsContent value="cards" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {['all', 'active', 'pending_activation', 'expired', 'depleted'].map(s => (
                <button
                  key={s}
                  onClick={() => setSpFilter(s)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    spFilter === s
                      ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {s === 'all' ? 'Tất cả' : SP_STATUS_CFG[s]?.label ?? s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-9 w-48"
                  placeholder="Tên, SĐT..."
                  value={spSearch}
                  onChange={e => setSpSearch(e.target.value)}
                />
              </div>
              <Button
                onClick={() => setAssignDialog(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white gap-2 flex-shrink-0"
              >
                <Plus className="w-4 h-4" /> Cấp thẻ
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-xl" />)}</div>
          ) : filteredSP.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Không có thẻ nào</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
              {filteredSP.map(sp => {
                const cfg = SP_STATUS_CFG[sp.status] ?? SP_STATUS_CFG.pending_activation
                return (
                  <div key={sp.id} className="flex items-center gap-3 p-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{sp.studentName}</p>
                      <p className="text-xs text-gray-500">
                        {sp.packageName}
                        {sp.packageType === 'session' && sp.sessions_remaining !== null
                          ? ` · ${sp.sessions_remaining}/${sp.sessions_total} buổi`
                          : ''}
                        {sp.expires_at ? ` · HH: ${formatDate(sp.expires_at)}` : ''}
                      </p>
                      <p className="text-xs text-gray-400">Mua: {formatDate(sp.purchased_at)}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${cfg.className}`}>
                      {cfg.label}
                    </span>
                    {sp.status === 'pending_activation' && (
                      <button
                        onClick={() => activateStudentPackage(sp)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-1.5 flex-shrink-0"
                      >
                        <Zap className="w-3 h-3" /> Kích hoạt
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Package CRUD Dialog ───────────────────────────────────────────────── */}
      <Dialog open={pkgDialog.open} onOpenChange={open => !open && setPkgDialog({ open: false, form: { ...EMPTY_PKG } })}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{pkgDialog.id ? 'Chỉnh sửa gói học' : 'Thêm gói học mới'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            {/* Tên gói */}
            <div className="col-span-1 sm:col-span-2">
              <Label>Tên gói *</Label>
              <Input className="mt-1" placeholder="VD: Gói 12 buổi"
                value={pkgDialog.form.name}
                onChange={e => setPkgDialog(prev => ({ ...prev, form: { ...prev.form, name: e.target.value } }))}
              />
            </div>

            {/* Giá (VND) */}
            <div>
              <Label>Giá (VND) *</Label>
              <Input className="mt-1" type="number" placeholder="1000000"
                value={pkgDialog.form.price}
                onChange={e => setPkgDialog(prev => ({ ...prev, form: { ...prev.form, price: e.target.value } }))}
              />
            </div>

            {/* Hiệu lực (ngày) */}
            <div>
              <Label>Hiệu lực (ngày) *</Label>
              <Input className="mt-1" type="number" placeholder="60"
                value={pkgDialog.form.validity_days}
                onChange={e => setPkgDialog(prev => ({ ...prev, form: { ...prev.form, validity_days: e.target.value } }))}
              />
            </div>

            {/* Hình thức học */}
            <div>
              <Label>Hình thức học</Label>
              <Select value={pkgDialog.form.coaching_type}
                onValueChange={v => {
                  const val = v as 'none' | '1-1' | 'group';
                  setPkgDialog(prev => ({
                    ...prev,
                    form: {
                      ...prev.form,
                      coaching_type: val,
                      sessions_count: val !== 'none' ? '1' : prev.form.sessions_count
                    }
                  }));
                }}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Lớp thường (theo nhóm)</SelectItem>
                  <SelectItem value="1-1">Dạy kèm 1-1</SelectItem>
                  <SelectItem value="group">Dạy kèm nhóm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Loại gói */}
            <div>
              <Label>Loại gói</Label>
              <Select value={pkgDialog.form.package_type}
                onValueChange={v => setPkgDialog(prev => ({ ...prev, form: { ...prev.form, package_type: v as 'session' | 'monthly' } }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="session">Theo buổi</SelectItem>
                  <SelectItem value="monthly">Theo tháng</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Số buổi (chỉ hiện khi Loại gói là Theo buổi và Hình thức học là Lớp thường) */}
            {pkgDialog.form.package_type === 'session' && pkgDialog.form.coaching_type === 'none' ? (
              <div>
                <Label>Số buổi</Label>
                <Input className="mt-1" type="number" value={pkgDialog.form.sessions_count}
                  onChange={e => setPkgDialog(prev => ({ ...prev, form: { ...prev.form, sessions_count: e.target.value } }))} />
              </div>
            ) : (
              // Spacer to keep layout balanced when Số buổi is hidden
              <div className="hidden sm:block" />
            )}

            {/* Gói nổi bật */}
            <div className="flex items-center gap-3 pt-2">
              <input type="checkbox" id="featured" checked={pkgDialog.form.is_featured}
                onChange={e => setPkgDialog(prev => ({ ...prev, form: { ...prev.form, is_featured: e.target.checked } }))} />
              <Label htmlFor="featured" className="cursor-pointer">Gói nổi bật</Label>
            </div>

            {/* Mô tả */}
            <div className="col-span-1 sm:col-span-2">
              <Label>Mô tả</Label>
              <Input className="mt-1" placeholder="Tùy chọn" value={pkgDialog.form.description}
                onChange={e => setPkgDialog(prev => ({ ...prev, form: { ...prev.form, description: e.target.value } }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPkgDialog({ open: false, form: { ...EMPTY_PKG } })}>Hủy</Button>
            <Button onClick={savePackage} disabled={!pkgDialog.form.name || !pkgDialog.form.price || saving}
              className="bg-primary-600 hover:bg-primary-700 text-white">
              {saving ? 'Đang lưu...' : (pkgDialog.id ? 'Cập nhật' : 'Tạo gói')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign Package Dialog ─────────────────────────────────────────────── */}
      <Dialog open={assignDialog} onOpenChange={open => { if (!open) { setAssignDialog(false); setAssignForm({ ...EMPTY_ASSIGN }) } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cấp thẻ học viên</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Học viên *</Label>
              <Select value={assignForm.student_id}
                onValueChange={v => setAssignForm(prev => ({ ...prev, student_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn học viên" /></SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}{s.phone ? ` · ${s.phone}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Gói học *</Label>
              <Select value={assignForm.package_id} onValueChange={onSelectPackage}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn gói học" /></SelectTrigger>
                <SelectContent>
                  {packages.filter(p => p.status === 'active').map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {formatCurrency(Number(p.price))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPkg && (
              <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                {selectedPkg.coaching_type !== 'none'
                  ? `Dạy kèm · Hạn ${selectedPkg.validity_days} ngày`
                  : (selectedPkg.package_type === 'session'
                      ? `${selectedPkg.sessions_count} buổi / ${selectedPkg.validity_days} ngày`
                      : `${selectedPkg.validity_days} ngày không giới hạn`)}
              </p>
            )}
            {selectedPkg && selectedPkg.coaching_type !== 'none' && (
              <div>
                <Label>Số lượng buổi mua *</Label>
                <Input className="mt-1" type="number" min="1"
                  value={assignForm.coaching_sessions}
                  onChange={e => onChangeCoachingSessions(e.target.value)} />
              </div>
            )}
            <div>
              <Label>Số tiền nhận (VND) *</Label>
              <Input className="mt-1" type="number" placeholder="0"
                value={assignForm.amount}
                onChange={e => setAssignForm(prev => ({ ...prev, amount: e.target.value }))} />
            </div>
            <div>
              <Label>Hình thức thanh toán</Label>
              <Select value={assignForm.payment_method}
                onValueChange={v => setAssignForm(prev => ({ ...prev, payment_method: v as AssignForm['payment_method'] }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
              <input type="checkbox" id="activate_now" checked={assignForm.activate_now}
                onChange={e => setAssignForm(prev => ({ ...prev, activate_now: e.target.checked }))} />
              <Label htmlFor="activate_now" className="text-green-700 cursor-pointer">
                Kích hoạt ngay (tính hạn từ hôm nay)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignDialog(false); setAssignForm({ ...EMPTY_ASSIGN }) }}>Hủy</Button>
            <Button onClick={assignPackage}
              disabled={!assignForm.student_id || !assignForm.package_id || !assignForm.amount || saving}
              className="bg-primary-600 hover:bg-primary-700 text-white">
              {saving ? 'Đang xử lý...' : 'Cấp thẻ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Package */}
      <AlertDialog open={!!deleteConfirmPkgId} onOpenChange={open => !open && setDeleteConfirmPkgId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa gói học</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa gói học này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmPkgId && deletePackage(deleteConfirmPkgId)}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={saving}
            >
              {saving ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
