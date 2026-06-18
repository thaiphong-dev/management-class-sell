import { useEffect, useState } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import {
  Loader2, Check, X, ShieldAlert, Heart, Phone, Mail, User, FileText
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface RegistrationRow {
  id: string
  student_id: string | null
  class_id: string
  club_name: string | null
  first_name: string
  last_name: string
  title: string | null
  gender: 'Nam' | 'Nữ'
  date_of_birth: string
  home_address: string | null
  home_phone: string | null
  mobile_phone: string
  emergency_phone: string | null
  email: string
  ethnicity: string | null
  
  // Health
  q1_heart_condition: boolean
  q2_chest_pain_activity: boolean
  q3_chest_pain_rest: boolean
  q4_fainting_dizziness: boolean
  q5_joint_problem: boolean
  q6_high_blood_pressure: boolean
  q7_medications: boolean
  q7_medications_detail: string | null
  q8_pregnant: boolean
  q9_other_reasons: boolean
  q9_other_reasons_detail: string | null
  q10_disability: boolean
  q10_disability_detail: string | null
  
  student_photo_url: string | null
  
  // Parent
  parent_name: string | null
  parent_relationship: string | null
  parent_address: string | null
  parent_home_phone: string | null
  parent_mobile_phone: string | null
  parent_email: string | null

  terms_accepted: boolean
  status: 'pending' | 'approved' | 'rejected'
  created_at: string

  // Joined
  classes: {
    name: string
    skill_level: string
    max_students: number
  }
  package_id: string | null
  payment_status: 'unpaid' | 'paid'
  packages: {
    name: string
    price: number
    sessions_count: number | null
    validity_days: number
  } | null
}

export default function AdminRegistrationsPage() {
  const { session } = useAuthContext()
  const { toast } = useToast()
  
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Dialogs
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; record: RegistrationRow | null }>({ open: false, record: null })
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; record: RegistrationRow | null }>({ open: false, record: null })
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; record: RegistrationRow | null }>({ open: false, record: null })
  
  const [rejectReason, setRejectReason] = useState('')
  const [tempPassword, setTempPassword] = useState('Student@123')
  const [isProcessing, setIsProcessing] = useState(false)

  async function loadRegistrations() {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*, classes(name, skill_level, max_students), packages(name, price, sessions_count, validity_days)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRegistrations(data as RegistrationRow[])
    } catch (err: any) {
      console.error('Failed to load registrations:', err.message)
      toast({ title: 'Lỗi tải đơn đăng ký', description: err.message, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadRegistrations() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const hasHealthIssue = (r: RegistrationRow) => {
    return (
      r.q1_heart_condition || r.q2_chest_pain_activity || r.q3_chest_pain_rest ||
      r.q4_fainting_dizziness || r.q5_joint_problem || r.q6_high_blood_pressure ||
      r.q7_medications || r.q8_pregnant || r.q9_other_reasons || r.q10_disability
    )
  }

  const getHealthSummary = (r: RegistrationRow) => {
    const issues = []
    if (r.q1_heart_condition) issues.push('Bệnh tim')
    if (r.q2_chest_pain_activity || r.q3_chest_pain_rest) issues.push('Đau ngực')
    if (r.q4_fainting_dizziness) issues.push('Chóng mặt/Ngất')
    if (r.q5_joint_problem) issues.push('Vấn đề khớp')
    if (r.q6_high_blood_pressure) issues.push('Cao huyết áp')
    if (r.q7_medications) issues.push('Đang uống thuốc')
    if (r.q8_pregnant) issues.push('Có thai/mới sinh')
    if (r.q9_other_reasons) issues.push('Lý do thể chất khác')
    if (r.q10_disability) issues.push('Khuyết tật')
    
    return issues.length > 0 ? issues.join(', ') : 'Thể trạng tốt'
  }

  const handleApprove = async () => {
    const record = approveDialog.record
    if (!record) return

    setIsProcessing(true)
    try {
      // 1. Call Create User Edge Function
      const jwt = session?.access_token
      if (!jwt) throw new Error('Not authenticated')

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email: record.email.trim(),
          password: tempPassword,
          full_name: `${record.last_name} ${record.first_name}`.trim(),
          phone: record.mobile_phone,
          role: 'student',
          skill_level: record.classes.skill_level === 'kids' || record.classes.skill_level === 'all' ? 'beginner' : record.classes.skill_level,
          dob: record.date_of_birth,
        }),
      })

      const result = await res.json() as { success?: boolean; user_id?: string; error?: string }
      if (!res.ok || !result.success || !result.user_id) {
        throw new Error(result.error ?? 'Lỗi khi gọi chức năng tạo tài khoản học viên')
      }

      const authUserId = result.user_id

      // 2. Fetch the student record created by edge function
      const { data: studentData, error: studentFetchError } = await (supabase
        .from('students') as any)
        .select('id')
        .eq('user_id', authUserId)
        .single()

      if (studentFetchError || !studentData) {
        throw new Error('Không tìm thấy bản ghi học viên tương ứng: ' + studentFetchError?.message)
      }

      const studentId = (studentData as any).id

      // 3. Update student table with additional details (emergency contact, notes, avatar)
      const healthNotes = `
- Tên nhóm: ${record.club_name ?? 'Không'}
- Dân tộc: ${record.ethnicity ?? 'Kinh'}
- Sức khỏe: ${getHealthSummary(record)}
${record.q7_medications ? `- Chi tiết thuốc: ${record.q7_medications_detail}` : ''}
${record.q9_other_reasons ? `- Chi tiết hạn chế thể chất: ${record.q9_other_reasons_detail}` : ''}
${record.q10_disability ? `- Chi tiết khuyết tật: ${record.q10_disability_detail}` : ''}
      `.trim()

      const emergencyContact = record.parent_name 
        ? `${record.parent_name} (${record.parent_relationship}) - SĐT: ${record.parent_mobile_phone}`
        : `Liên hệ khẩn cấp: ${record.emergency_phone ?? 'Không'}`

      const { error: studentUpdateError } = await (supabase
        .from('students') as any)
        .update({
          emergency_contact: emergencyContact,
          notes: healthNotes,
        })
        .eq('id', studentId)

      if (studentUpdateError) console.error('Student profile update error:', studentUpdateError.message)

      // 4. Update profile avatar if portrait exists (stores Base64)
      if (record.student_photo_url) {
        const { error: profileUpdateError } = await (supabase
          .from('profiles') as any)
          .update({
            avatar_url: record.student_photo_url
          })
          .eq('id', authUserId)

        if (profileUpdateError) console.error('Avatar update error:', profileUpdateError.message)
      }

      // 5. Enroll student into class (insert class_students)
      const { error: enrollError } = await (supabase
        .from('class_students') as any)
        .insert({
          class_id: record.class_id,
          student_id: studentId,
          status: 'active'
        })

      if (enrollError) throw enrollError

      // 5.5. Grant student package (if selected)
      let studentPackageId = null
      if (record.package_id && record.packages) {
        const { data: pkgInsert, error: pkgError } = await (supabase
          .from('student_packages') as any)
          .insert({
            student_id: studentId,
            package_id: record.package_id,
            sessions_total: record.packages.sessions_count,
            sessions_remaining: record.packages.sessions_count,
            status: 'pending_activation',
            notes: 'Cấp thủ công qua phê duyệt đơn đăng ký.'
          })
          .select('id')
          .single()

        if (pkgError) {
          console.error('Package grant error:', pkgError.message)
        } else {
          studentPackageId = pkgInsert?.id
          
          // Record payment
          const { error: paymentError } = await (supabase
            .from('payments') as any)
            .insert({
              student_id: studentId,
              student_package_id: studentPackageId,
              amount: record.packages.price,
              payment_method: 'transfer',
              status: 'paid',
              notes: 'Thanh toán ghi nhận qua phê duyệt đơn đăng ký thủ công.'
            })
          if (paymentError) console.error('Payment record error:', paymentError.message)
        }
      }

      // 6. Update registration record
      const { error: regUpdateError } = await (supabase
        .from('registrations') as any)
        .update({
          student_id: studentId,
          payment_status: 'paid',
          status: 'approved'
        })
        .eq('id', record.id)

      if (regUpdateError) throw regUpdateError

      toast({ title: 'Đã phê duyệt đăng ký', description: `Học sinh đã được thêm vào lớp ${record.classes.name}.` })
      setApproveDialog({ open: false, record: null })
      await loadRegistrations()
    } catch (err: any) {
      console.error('Approve registration error:', err)
      toast({ title: 'Phê duyệt thất bại', description: err.message, variant: 'destructive' })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    const record = rejectDialog.record
    if (!record) return

    setIsProcessing(true)
    try {
      const { error } = await (supabase
        .from('registrations') as any)
        .update({
          status: 'rejected'
        })
        .eq('id', record.id)

      if (error) throw error

      toast({ title: 'Đã từ chối đơn đăng ký', description: `Lý do từ chối: ${rejectReason || 'Không có'}` })
      setRejectDialog({ open: false, record: null })
      setRejectReason('')
      await loadRegistrations()
    } catch (err: any) {
      console.error('Reject registration error:', err)
      toast({ title: 'Từ chối đơn thất bại', description: err.message, variant: 'destructive' })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Đơn đăng ký học viên</h2>
        <p className="text-sm text-gray-500 mt-0.5">Quản lý và duyệt thông tin đăng ký học viên từ trang chủ công cộng</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin mx-auto" />
            <p className="text-center text-xs text-gray-500">Đang tải danh sách đơn đăng ký...</p>
          </div>
        ) : registrations.length === 0 ? (
          <div className="p-16 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-semibold">Chưa có đơn đăng ký nào</p>
            <p className="text-gray-400 text-xs mt-1">Các đơn đăng ký mới từ trang chủ sẽ hiển thị ở đây</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[180px] font-semibold text-gray-700 text-xs">Học viên</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs">Lớp đăng ký</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs">Gói học & Học phí</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs">Liên hệ</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs">Thanh toán</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs">Tình trạng thể chất</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs">Ngày đăng ký</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs">Trạng thái</TableHead>
                  <TableHead className="w-[140px] text-right font-semibold text-gray-700 text-xs">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map(r => {
                  const healthIssue = hasHealthIssue(r)
                  return (
                    <TableRow key={r.id} className="hover:bg-gray-55/40 transition-colors">
                      <TableCell className="font-medium text-gray-900 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-10 rounded bg-gray-100 border border-gray-250/60 overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {r.student_photo_url ? (
                              <img src={r.student_photo_url} alt="Ảnh học viên" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{r.last_name} {r.first_name}</p>
                            <p className="text-[10px] text-gray-500">{r.gender} · {formatDate(r.date_of_birth)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <p className="font-semibold text-gray-800">{r.classes.name}</p>
                        <p className="text-[10px] text-gray-500 font-medium">Trình độ: {r.classes.skill_level === 'beginner' ? 'Cơ bản' : r.classes.skill_level === 'intermediate' ? 'Trung cấp' : r.classes.skill_level === 'advanced' ? 'Nâng cao' : 'Khác'}</p>
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.packages ? (
                          <>
                            <p className="font-semibold text-gray-800">{r.packages.name}</p>
                            <p className="text-[10px] text-red-650 font-bold">{Number(r.packages.price).toLocaleString('vi-VN')} VNĐ</p>
                          </>
                        ) : (
                          <p className="text-gray-400 italic">Chưa chọn gói</p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs space-y-0.5 text-gray-650">
                        <p className="flex items-center gap-1 font-semibold"><Phone className="w-3 h-3 text-gray-400" /> {r.mobile_phone}</p>
                        <p className="flex items-center gap-1 text-[10px]"><Mail className="w-3 h-3 text-gray-400 text-white/50" /> {r.email}</p>
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.payment_status === 'paid' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-150 text-green-700 border border-green-200">Đã thanh toán</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-650 border border-gray-200">Chưa thanh toán</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {healthIssue ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-50 text-yellow-700 border border-yellow-200">
                            <ShieldAlert className="w-3 h-3" /> {getHealthSummary(r)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                            <Heart className="w-3 h-3" /> Thể chất tốt
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">{formatDate(r.created_at)}</TableCell>
                      <TableCell className="text-xs">
                        {r.status === 'pending' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700">Chờ duyệt</span>}
                        {r.status === 'approved' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">Đã phê duyệt</span>}
                        {r.status === 'rejected' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">Đã từ chối</span>}
                      </TableCell>
                      <TableCell className="text-right py-3.5 space-x-1.5">
                        <Button
                          variant="ghost"
                          className="h-8 text-[11px] font-bold px-2.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                          onClick={() => setDetailDialog({ open: true, record: r })}
                        >
                          Xem chi tiết
                        </Button>
                        {r.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg"
                              onClick={() => setApproveDialog({ open: true, record: r })}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                              onClick={() => setRejectDialog({ open: true, record: r })}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ─── Detail Dialog ────────────────────────────────────────────────── */}
      <Dialog open={detailDialog.open} onOpenChange={(v) => !v && setDetailDialog({ open: false, record: null })}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-lg flex items-center gap-1.5 text-red-600">
              <FileText className="w-5 h-5" /> Chi Tiết Đơn Đăng Ký Học Viên
            </DialogTitle>
            <DialogDescription className="text-xs">
              Mẫu khai báo chi tiết sức khỏe và thông tin cá nhân của học sinh
            </DialogDescription>
          </DialogHeader>

          {detailDialog.record && (
            <div className="space-y-5 py-2 text-xs">
              {/* Header Info */}
              <div className="flex gap-4 p-4 bg-gray-50 border border-gray-100 rounded-xl">
                <div className="w-16 h-20 rounded bg-white border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {detailDialog.record.student_photo_url ? (
                    <img src={detailDialog.record.student_photo_url} alt="Ảnh học sinh" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-gray-300" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-base font-bold text-gray-900">{detailDialog.record.last_name} {detailDialog.record.first_name}</p>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">{detailDialog.record.title ?? 'VĐV/HV'} · Giới tính: {detailDialog.record.gender} · DOB: {formatDate(detailDialog.record.date_of_birth)}</p>
                  <p className="font-semibold text-red-600">Đăng ký lớp: {detailDialog.record.classes.name}</p>
                </div>
              </div>

              {/* Personal Details */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-gray-900 border-b border-gray-100 pb-1 text-xs">Thông tin cá nhân</h4>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-gray-650">
                  <p><strong>Dân tộc:</strong> {detailDialog.record.ethnicity ?? 'Kinh'}</p>
                  <p><strong>Nhóm/CLB:</strong> {detailDialog.record.club_name ?? '—'}</p>
                  <p><strong>Gói học đăng ký:</strong> {detailDialog.record.packages?.name ?? '—'}</p>
                  <p><strong>Học phí:</strong> {detailDialog.record.packages ? `${Number(detailDialog.record.packages.price).toLocaleString('vi-VN')} VNĐ` : '—'}</p>
                  <p><strong>Trạng thái thanh toán:</strong> <span className={detailDialog.record.payment_status === 'paid' ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>{detailDialog.record.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}</span></p>
                  <p><strong>Điện thoại di động:</strong> {detailDialog.record.mobile_phone}</p>
                  <p><strong>Điện thoại nhà riêng:</strong> {detailDialog.record.home_phone ?? '—'}</p>
                  <p><strong>Liên lạc khẩn cấp:</strong> {detailDialog.record.emergency_phone ?? '—'}</p>
                  <p><strong>Email:</strong> {detailDialog.record.email}</p>
                  <p className="col-span-2"><strong>Địa chỉ nhà:</strong> {detailDialog.record.home_address ?? '—'}</p>
                </div>
              </div>

              {/* Health Survey */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-gray-900 border-b border-gray-100 pb-1 text-xs">Báo cáo tình trạng sức khỏe</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start gap-3 bg-gray-50 p-2 rounded">
                    <span>1. Tiền sử bệnh tim:</span>
                    <span className={`font-bold ${detailDialog.record.q1_heart_condition ? 'text-red-600' : 'text-green-600'}`}>{detailDialog.record.q1_heart_condition ? 'Có' : 'Không'}</span>
                  </div>
                  <div className="flex justify-between items-start gap-3 p-2 rounded">
                    <span>2. Đau ngực khi vận động:</span>
                    <span className={`font-bold ${detailDialog.record.q2_chest_pain_activity ? 'text-red-600' : 'text-green-600'}`}>{detailDialog.record.q2_chest_pain_activity ? 'Có' : 'Không'}</span>
                  </div>
                  <div className="flex justify-between items-start gap-3 bg-gray-50 p-2 rounded">
                    <span>3. Đau ngực khi nghỉ ngơi:</span>
                    <span className={`font-bold ${detailDialog.record.q3_chest_pain_rest ? 'text-red-600' : 'text-green-600'}`}>{detailDialog.record.q3_chest_pain_rest ? 'Có' : 'Không'}</span>
                  </div>
                  <div className="flex justify-between items-start gap-3 p-2 rounded">
                    <span>4. Ngất xỉu / chóng mặt:</span>
                    <span className={`font-bold ${detailDialog.record.q4_fainting_dizziness ? 'text-red-600' : 'text-green-600'}`}>{detailDialog.record.q4_fainting_dizziness ? 'Có' : 'Không'}</span>
                  </div>
                  <div className="flex justify-between items-start gap-3 bg-gray-50 p-2 rounded">
                    <span>5. Chấn thương khớp:</span>
                    <span className={`font-bold ${detailDialog.record.q5_joint_problem ? 'text-red-600' : 'text-green-600'}`}>{detailDialog.record.q5_joint_problem ? 'Có' : 'Không'}</span>
                  </div>
                  <div className="flex justify-between items-start gap-3 p-2 rounded">
                    <span>6. Cao huyết áp:</span>
                    <span className={`font-bold ${detailDialog.record.q6_high_blood_pressure ? 'text-red-600' : 'text-green-600'}`}>{detailDialog.record.q6_high_blood_pressure ? 'Có' : 'Không'}</span>
                  </div>
                  
                  {/* Drugs */}
                  <div className="bg-gray-50 p-2 rounded space-y-1">
                    <div className="flex justify-between items-start gap-3">
                      <span>7. Đang uống các loại thuốc:</span>
                      <span className={`font-bold ${detailDialog.record.q7_medications ? 'text-red-600' : 'text-green-600'}`}>{detailDialog.record.q7_medications ? 'Có' : 'Không'}</span>
                    </div>
                    {detailDialog.record.q7_medications && detailDialog.record.q7_medications_detail && (
                      <p className="text-[10px] text-gray-500 pl-2">➔ Tên thuốc: {detailDialog.record.q7_medications_detail}</p>
                    )}
                  </div>

                  <div className="flex justify-between items-start gap-3 p-2 rounded">
                    <span>8. Đang có thai hoặc mới sinh (6 tháng):</span>
                    <span className={`font-bold ${detailDialog.record.q8_pregnant ? 'text-red-600' : 'text-green-600'}`}>{detailDialog.record.q8_pregnant ? 'Có' : 'Không'}</span>
                  </div>

                  {/* Other physical limitations */}
                  <div className="bg-gray-50 p-2 rounded space-y-1">
                    <div className="flex justify-between items-start gap-3">
                      <span>9. Hạn chế thể chất khác:</span>
                      <span className={`font-bold ${detailDialog.record.q9_other_reasons ? 'text-red-600' : 'text-green-600'}`}>{detailDialog.record.q9_other_reasons ? 'Có' : 'Không'}</span>
                    </div>
                    {detailDialog.record.q9_other_reasons && detailDialog.record.q9_other_reasons_detail && (
                      <p className="text-[10px] text-gray-500 pl-2">➔ Chi tiết: {detailDialog.record.q9_other_reasons_detail}</p>
                    )}
                  </div>

                  {/* Disability */}
                  <div className="p-2 rounded space-y-1">
                    <div className="flex justify-between items-start gap-3">
                      <span>10. Khuyết tật thể chất / trí tuệ:</span>
                      <span className={`font-bold ${detailDialog.record.q10_disability ? 'text-red-600' : 'text-green-600'}`}>{detailDialog.record.q10_disability ? 'Có' : 'Không'}</span>
                    </div>
                    {detailDialog.record.q10_disability && detailDialog.record.q10_disability_detail && (
                      <p className="text-[10px] text-gray-500 pl-2">➔ Chi tiết: {detailDialog.record.q10_disability_detail}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Parent Info (Under 16 emergency) */}
              {detailDialog.record.parent_name && (
                <div className="space-y-2.5 p-3.5 bg-red-50/20 border border-dashed border-red-200 rounded-xl">
                  <h4 className="font-bold text-red-600 pb-1 text-xs">Thông tin phụ huynh / Người bảo hộ</h4>
                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-gray-650">
                    <p><strong>Họ tên:</strong> {detailDialog.record.parent_name}</p>
                    <p><strong>Quan hệ:</strong> {detailDialog.record.parent_relationship}</p>
                    <p><strong>Điện thoại phụ huynh:</strong> {detailDialog.record.parent_mobile_phone}</p>
                    <p><strong>Điện thoại nhà riêng:</strong> {detailDialog.record.parent_home_phone ?? '—'}</p>
                    <p><strong>Email phụ huynh:</strong> {detailDialog.record.parent_email}</p>
                    <p className="col-span-2"><strong>Địa chỉ phụ huynh:</strong> {detailDialog.record.parent_address ?? '—'}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-2.5">
            <Button
              variant="outline"
              className="text-xs font-semibold rounded-xl"
              onClick={() => setDetailDialog({ open: false, record: null })}
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Approve Dialog ───────────────────────────────────────────────── */}
      <Dialog open={approveDialog.open} onOpenChange={(v) => !v && setApproveDialog({ open: false, record: null })}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-lg flex items-center gap-1.5 text-green-600">
              <Check className="w-5 h-5" /> Phê Duyệt Đơn Đăng Ký
            </DialogTitle>
            <DialogDescription className="text-xs">
              Thực hiện tạo tài khoản học viên mới và thêm vào lớp học tương ứng.
            </DialogDescription>
          </DialogHeader>

          {approveDialog.record && (
            <div className="space-y-4 py-2 text-xs">
              <p className="text-gray-650 leading-relaxed">
                Đơn đăng ký của học sinh <strong>{approveDialog.record.last_name} {approveDialog.record.first_name}</strong> sẽ được duyệt vào lớp <strong>{approveDialog.record.classes.name}</strong>.
              </p>

              <div className="space-y-2">
                <p className="font-bold text-gray-700">Thông tin đăng ký tài khoản:</p>
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-1 text-gray-650">
                  <p><strong>Họ tên:</strong> {approveDialog.record.last_name} {approveDialog.record.first_name}</p>
                  <p><strong>Email đăng nhập:</strong> {approveDialog.record.email}</p>
                  <p><strong>Số điện thoại:</strong> {approveDialog.record.mobile_phone}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Mật khẩu tạm thời cấp cho học viên:</label>
                <Input
                  type="text"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className="rounded-xl text-xs font-semibold"
                  placeholder="Student@123"
                  required
                />
                <p className="text-[10px] text-gray-400">Gửi thông tin tài khoản và mật khẩu này cho phụ huynh để họ đăng nhập hệ thống.</p>
              </div>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              disabled={isProcessing}
              className="text-xs font-semibold rounded-xl"
              onClick={() => setApproveDialog({ open: false, record: null })}
            >
              Hủy
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl gap-1.5"
              disabled={isProcessing}
              onClick={handleApprove}
            >
              {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Xác nhận phê duyệt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Reject Dialog ────────────────────────────────────────────────── */}
      <Dialog open={rejectDialog.open} onOpenChange={(v) => !v && setRejectDialog({ open: false, record: null })}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-lg flex items-center gap-1.5 text-red-600">
              <X className="w-5 h-5" /> Từ Chối Đơn Đăng Ký
            </DialogTitle>
            <DialogDescription className="text-xs">
              Hủy bỏ đơn đăng ký học này và chuyển trạng thái đơn thành từ chối.
            </DialogDescription>
          </DialogHeader>

          {rejectDialog.record && (
            <div className="space-y-3 py-2 text-xs">
              <p className="text-gray-650 leading-relaxed">
                Bạn đang từ chối đơn đăng ký của học sinh <strong>{rejectDialog.record.last_name} {rejectDialog.record.first_name}</strong>.
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Lý do từ chối (Ghi chú nội bộ):</label>
                <Input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="rounded-xl text-xs font-semibold"
                  placeholder="VD: Không đúng trình độ, trùng lịch học, v.v."
                />
              </div>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              disabled={isProcessing}
              className="text-xs font-semibold rounded-xl"
              onClick={() => setRejectDialog({ open: false, record: null })}
            >
              Hủy
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl gap-1.5"
              disabled={isProcessing}
              onClick={handleReject}
            >
              {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Từ chối đơn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
