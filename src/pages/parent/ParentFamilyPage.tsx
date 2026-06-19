import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/stores/useAppStore'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { 
  UserPlus, QrCode, Info, 
  Trash2, Plus, Heart, Loader2,
  Calendar, ClipboardList, TrendingUp, CreditCard
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ChildProfile {
  id: string; // studentId
  profileId: string; // profiles.id
  fullName: string;
  gender: 'Nam' | 'Nữ';
  dateOfBirth: string | null;
  emergencyContact: string | null;
  notes: string | null;
  status: string;
}

interface ClassInfo {
  id: string
  name: string
  skill_level: 'beginner' | 'intermediate' | 'advanced' | 'kids' | 'all'
}

interface PackageInfo {
  id: string
  name: string
  price: number
  sessions_count: number | null
  validity_days: number
  package_type: 'session' | 'monthly'
}

const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Không thể tạo canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(dataUrl)
      }
      img.onerror = (err) => reject(err)
    }
    reader.onerror = (err) => reject(err)
  })
}

export default function ParentFamilyPage() {
  const { profile, session } = useAuthContext()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { setActiveChildId } = useAppStore()

  const [children, setChildren] = useState<ChildProfile[]>([])
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [packages, setPackages] = useState<PackageInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [parentRecord, setParentRecord] = useState<any>(null)

  // Modals state
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [selectedChildForQr, setSelectedChildForQr] = useState<ChildProfile | null>(null)
  
  const [addChildOpen, setAddChildOpen] = useState(false)
  const [registerClassOpen, setRegisterClassOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)

  // Add child form states
  const [newChildName, setNewChildName] = useState('')
  const [newChildGender, setNewChildGender] = useState<'Nam' | 'Nữ'>('Nam')
  const [newChildDob, setNewChildDob] = useState('')
  const [newChildNotes, setNewChildNotes] = useState('')

  // Register class form states
  const [selectedChildId, setSelectedChildId] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedPackageId, setSelectedPackageId] = useState('')
  const [clubName, setClubName] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  // Health survey (10 questions)
  const [q1, setQ1] = useState(false)
  const [q2, setQ2] = useState(false)
  const [q3, setQ3] = useState(false)
  const [q4, setQ4] = useState(false)
  const [q5, setQ5] = useState(false)
  const [q6, setQ6] = useState(false)
  const [q7, setQ7] = useState(false)
  const [q7Detail, setQ7Detail] = useState('')
  const [q8, setQ8] = useState(false)
  const [q9, setQ9] = useState(false)
  const [q9Detail, setQ9Detail] = useState('')
  const [q10, setQ10] = useState(false)
  const [q10Detail, setQ10Detail] = useState('')

  // Payment display states
  const [createdRegistrationId, setCreatedRegistrationId] = useState('')
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const [bankDetails, setBankDetails] = useState({
    bank_id: 'MSB',
    bank_account: '96886693012620',
    bank_account_name: 'TU THAI PHONG',
    bank_bin: '970426',
    bank_branch: 'CN Hà Nội'
  })

  const loadData = useCallback(async () => {
    if (!profile) return
    setIsLoading(true)
    try {
      // 1. Get Parent
      const { data: parentData, error: parentError } = await (supabase
        .from('parents') as any)
        .select('id')
        .eq('user_id', profile.id)
        .single()

      if (parentError || !parentData) {
        console.error('Failed to get parent profile:', parentError?.message)
        setIsLoading(false)
        return
      }
      setParentRecord(parentData)

      // 2. Get children
      const { data: childrenData, error: childrenError } = await (supabase
        .from('students') as any)
        .select(`
          id,
          user_id,
          skill_level,
          date_of_birth,
          emergency_contact,
          notes,
          status,
          profiles (
            full_name,
            gender,
            avatar_url
          )
        `)
        .eq('parent_id', parentData.id)

      if (childrenError) throw childrenError

      setChildren((childrenData || []).map((c: any) => ({
        id: c.id,
        profileId: c.user_id,
        fullName: c.profiles?.full_name || 'Học viên',
        gender: c.profiles?.gender || 'Nam',
        dateOfBirth: c.date_of_birth,
        emergencyContact: c.emergency_contact,
        notes: c.notes,
        status: c.status,
      })))

      // 3. Get Classes
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name, skill_level')
        .eq('status', 'active')
        .order('name')
      setClasses(classesData || [])

      // 4. Get Packages
      const { data: packagesData } = await supabase
        .from('packages')
        .select('id, name, price, sessions_count, validity_days, package_type')
        .eq('status', 'active')
        .order('sort_order')
        .order('price')
      setPackages(packagesData || [])

      // 5. Get Bank settings
      const { data: bankRes } = await (supabase
        .from('landing_settings') as any)
        .select('bank_id, bank_account, bank_account_name, bank_bin, bank_branch')
        .limit(1)
        .maybeSingle()

      if (bankRes) {
        setBankDetails({
          bank_id: bankRes.bank_id || 'MSB',
          bank_account: bankRes.bank_account || '96886693012620',
          bank_account_name: bankRes.bank_account_name || 'TU THAI PHONG',
          bank_bin: bankRes.bank_bin || '970426',
          bank_branch: bankRes.bank_branch || ''
        })
      }
    } catch (err: any) {
      console.error(err)
      toast({ title: 'Lỗi tải dữ liệu', description: err.message, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }, [profile, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Realtime subscription for payment confirmation
  useEffect(() => {
    if (!createdRegistrationId) return

    const channel = supabase
      .channel(`reg_payment_check:${createdRegistrationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'registrations',
          filter: `id=eq.${createdRegistrationId}`,
        },
        (payload) => {
          const updated = payload.new as { status: string; payment_status: string }
          if (updated.payment_status === 'paid') {
            setPaymentConfirmed(true)
            toast({ title: 'Đã nhận thanh toán!', description: 'Hệ thống đã nhận chuyển khoản học phí.' })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [createdRegistrationId, toast])

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChildName.trim()) {
      toast({ title: 'Vui lòng nhập tên của con', variant: 'destructive' })
      return
    }
    if (!newChildDob) {
      toast({ title: 'Vui lòng chọn ngày sinh', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    try {
      const childProfileId = crypto.randomUUID()

      // 1. Insert child profile
      const { error: profileError } = await (supabase
        .from('profiles') as any)
        .insert({
          id: childProfileId,
          full_name: newChildName.trim(),
          role: 'student',
          gender: newChildGender,
        })

      if (profileError) throw profileError

      // 2. Insert child student record linked to parent
      const emergencyContact = `Phụ huynh: ${profile?.full_name} - SĐT: ${profile?.phone || 'N/A'}`
      const { data: newStudent, error: studentError } = await (supabase
        .from('students') as any)
        .insert({
          user_id: childProfileId,
          skill_level: 'beginner',
          date_of_birth: newChildDob,
          emergency_contact: emergencyContact,
          notes: newChildNotes.trim() || 'Học viên con được phụ huynh tạo.',
          parent_id: parentRecord.id,
          status: 'active',
        })
        .select('id')
        .single()

      if (studentError) throw studentError

      if (newStudent) {
        setActiveChildId(newStudent.id)
      }

      toast({ title: 'Thêm con thành công!' })
      setAddChildOpen(false)
      // Reset form
      setNewChildName('')
      setNewChildGender('Nam')
      setNewChildDob('')
      setNewChildNotes('')
      await loadData()
    } catch (err: any) {
      console.error(err)
      toast({ title: 'Lỗi thêm con', description: err.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const handleRegisterCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedChildId) {
      toast({ title: 'Vui lòng chọn con', variant: 'destructive' })
      return
    }
    if (!selectedClassId) {
      toast({ title: 'Vui lòng chọn lớp học', variant: 'destructive' })
      return
    }
    if (!selectedPackageId) {
      toast({ title: 'Vui lòng chọn gói học', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    try {
      // 1. Compress photo if selected
      let photoBase64 = null
      if (photoFile) {
        photoBase64 = await compressImage(photoFile)
      }

      // 2. Get Child Details
      const child = children.find(c => c.id === selectedChildId)
      if (!child) throw new Error('Học viên không tồn tại')

      // 3. Get Class & Package Details
      const selectedClass = classes.find(c => c.id === selectedClassId)
      const selectedPackage = packages.find(p => p.id === selectedPackageId)

      if (!selectedClass || !selectedPackage) throw new Error('Thông tin lớp hoặc gói học không hợp lệ')

      // Update child avatar if they uploaded a photo
      if (photoBase64) {
        await (supabase
          .from('profiles') as any)
          .update({ avatar_url: photoBase64 })
          .eq('id', child.profileId)
      }

      // 4. Create Package
      const { data: studentPkg, error: spError } = await (supabase
        .from('student_packages') as any)
        .insert({
          student_id: selectedChildId,
          package_id: selectedPackageId,
          sessions_total: selectedPackage.sessions_count,
          sessions_remaining: selectedPackage.sessions_count,
          status: 'pending_activation',
          notes: 'Đăng ký học từ cổng phụ huynh.'
        })
        .select('id')
        .single()

      if (spError || !studentPkg) throw spError

      // 5. Create Payment
      const { data: payment, error: payError } = await (supabase
        .from('payments') as any)
        .insert({
          student_id: selectedChildId,
          student_package_id: studentPkg.id,
          amount: Number(selectedPackage.price),
          payment_method: 'transfer',
          status: 'pending',
          notes: `Đăng ký học cho con ${child.fullName}`
        })
        .select('id')
        .single()

      if (payError || !payment) throw payError

      // 6. Enroll Child in class
      const { error: csError } = await (supabase
        .from('class_students') as any)
        .upsert({
          class_id: selectedClassId,
          student_id: selectedChildId,
          status: 'active'
        })

      if (csError) throw csError

      // 7. Health Notes Summary
      const healthSummaryList = []
      if (q1) healthSummaryList.push('Bệnh tim')
      if (q2 || q3) healthSummaryList.push('Đau ngực')
      if (q4) healthSummaryList.push('Chóng mặt/Ngất')
      if (q5) healthSummaryList.push('Khớp')
      if (q6) healthSummaryList.push('Cao huyết áp')
      if (q7) healthSummaryList.push(`Uống thuốc: ${q7Detail}`)
      if (q8) healthSummaryList.push('Có thai/sinh con')
      if (q9) healthSummaryList.push(`Hạn chế thể chất: ${q9Detail}`)
      if (q10) healthSummaryList.push(`Khuyết tật: ${q10Detail}`)

      // 8. Create Registration record
      const [lastName, ...firstParts] = child.fullName.split(' ')
      const firstName = firstParts.join(' ')

      const { data: reg, error: regError } = await (supabase
        .from('registrations') as any)
        .insert({
          student_id: selectedChildId,
          class_id: selectedClassId,
          package_id: selectedPackageId,
          student_package_id: studentPkg.id,
          payment_id: payment.id,
          payment_status: 'unpaid',
          status: 'pending',
          first_name: firstName || 'Học viên',
          last_name: lastName || '',
          gender: child.gender,
          date_of_birth: child.dateOfBirth || new Date().toISOString().split('T')[0],
          mobile_phone: profile?.phone || 'N/A',
          email: session?.user?.email || 'N/A',
          club_name: clubName.trim() || null,
          q1_heart_condition: q1,
          q2_chest_pain_activity: q2,
          q3_chest_pain_rest: q3,
          q4_fainting_dizziness: q4,
          q5_joint_problem: q5,
          q6_high_blood_pressure: q6,
          q7_medications: q7,
          q7_medications_detail: q7Detail || null,
          q8_pregnant: q8,
          q9_other_reasons: q9,
          q9_other_reasons_detail: q9Detail || null,
          q10_disability: q10,
          q10_disability_detail: q10Detail || null,
          student_photo_url: photoBase64,
          parent_name: profile?.full_name,
          parent_mobile_phone: profile?.phone,
          parent_email: session?.user?.email,
          terms_accepted: true,
        })
        .select('id')
        .single()

      if (regError || !reg) throw regError

      // Success, open payment display modal
      setCreatedRegistrationId(reg.id)
      setPaymentAmount(Number(selectedPackage.price))
      setPaymentConfirmed(false)
      setRegisterClassOpen(false)
      setPaymentModalOpen(true)

      // Reset form
      setSelectedChildId('')
      setSelectedClassId('')
      setSelectedPackageId('')
      setClubName('')
      setPhotoFile(null)
      setPhotoPreview(null)
      setQ1(false); setQ2(false); setQ3(false); setQ4(false); setQ5(false);
      setQ6(false); setQ7(false); setQ7Detail(''); setQ8(false); setQ9(false);
      setQ9Detail(''); setQ10(false); setQ10Detail('')
    } catch (err: any) {
      console.error(err)
      toast({ title: 'Lỗi đăng ký khóa học', description: err.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleManualCheckPayment = async () => {
    if (!createdRegistrationId) return
    setIsSubmitting(true)
    try {
      const { data, error } = await (supabase
        .from('registrations') as any)
        .select('payment_status')
        .eq('id', createdRegistrationId)
        .single()

      if (error) throw error

      if (data?.payment_status === 'paid') {
        setPaymentConfirmed(true)
        toast({ title: 'Xác nhận thành công!', description: 'Hệ thống đã nhận thanh toán học phí.' })
      } else {
        toast({ 
          title: 'Hệ thống chưa nhận được', 
          description: 'Nếu đã chuyển khoản, vui lòng chờ 1-2 phút hoặc liên hệ trực tiếp HLV để đối chiếu.' 
        })
      }
    } catch (err: any) {
      console.error(err)
      toast({ title: 'Lỗi kiểm tra', description: err.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteChild = async (childId: string, childName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa hồ sơ của con "${childName}" khỏi tài khoản này?`)) return
    setIsLoading(true)
    try {
      // Find the profile ID first
      const child = children.find(c => c.id === childId)
      if (!child) return

      // Since RLS is enabled, we delete from profiles. If cascade deletes students, then okay.
      const { error } = await (supabase
        .from('profiles') as any)
        .delete()
        .eq('id', child.profileId)

      if (error) throw error

      toast({ title: 'Đã xóa hồ sơ thành công!' })
      await loadData()
    } catch (err: any) {
      console.error(err)
      toast({ title: 'Lỗi xóa hồ sơ con', description: err.message, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-2">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Đang tải danh sách con...</p>
      </div>
    )
  }

  // Calculate VietQR values
  const shortId = createdRegistrationId.substring(0, 8)
  const paymentMemo = `TPB${shortId}`
  const vietQrUrl = `https://img.vietqr.io/image/${bankDetails.bank_id}-${bankDetails.bank_account}-compact2.png?amount=${paymentAmount}&addInfo=${paymentMemo}&accountName=${encodeURIComponent(bankDetails.bank_account_name)}`

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Quản lý gia đình</h2>
          <p className="text-sm text-gray-500 mt-0.5">Quản lý hồ sơ các con, mã điểm danh QR, và đăng ký lớp học.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button
            onClick={() => setAddChildOpen(true)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl px-4 py-2 text-xs font-bold border border-gray-200/50 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1 text-gray-600" /> Thêm con mới
          </Button>
          <Button
            onClick={() => setRegisterClassOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-2 text-xs font-bold shadow-sm"
          >
            <UserPlus className="w-4 h-4 mr-1" /> Đăng ký học cho con
          </Button>
        </div>
      </div>

      {/* Children list */}
      {children.length === 0 ? (
        <div className="bg-white border border-gray-150 rounded-2xl p-8 text-center text-gray-400 text-xs shadow-sm">
          Chưa có hồ sơ học viên con nào. Hãy nhấp nút "Thêm con mới" để bắt đầu.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {children.map(c => (
            <div key={c.id} className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-sm font-bold">
                      {c.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-850 text-sm leading-normal">{c.fullName}</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">Giới tính: {c.gender} | Ngày sinh: {c.dateOfBirth ? new Date(c.dateOfBirth).toLocaleDateString('vi-VN') : 'N/A'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteChild(c.id, c.fullName)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Xóa hồ sơ con"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs space-y-1 text-gray-600">
                  <p><strong>Liên hệ khẩn cấp:</strong> {c.emergencyContact || 'Chưa thiết lập'}</p>
                  <p><strong>Ghi chú thể trạng:</strong> {c.notes || 'Không có ghi chú đặc biệt'}</p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-100/60">
                <Button
                  onClick={() => {
                    setSelectedChildForQr(c)
                    setQrModalOpen(true)
                  }}
                  variant="outline"
                  className="w-full rounded-xl text-xs py-1.5 h-auto text-gray-650 font-bold border-gray-200/80 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <QrCode className="w-4 h-4 text-red-550" /> Mã QR đi học
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => {
                      setActiveChildId(c.id)
                      navigate('/parent/packages')
                    }}
                    variant="outline"
                    className="rounded-xl text-[10px] py-1.5 h-auto text-gray-600 font-bold border-gray-150 hover:bg-red-50 hover:text-red-750 transition-colors flex items-center justify-center gap-1"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-gray-400" /> Thẻ học
                  </Button>
                  <Button
                    onClick={() => {
                      setActiveChildId(c.id)
                      navigate('/parent/schedule')
                    }}
                    variant="outline"
                    className="rounded-xl text-[10px] py-1.5 h-auto text-gray-600 font-bold border-gray-150 hover:bg-red-50 hover:text-red-750 transition-colors flex items-center justify-center gap-1"
                  >
                    <Calendar className="w-3.5 h-3.5 text-gray-400" /> Lịch học
                  </Button>
                  <Button
                    onClick={() => {
                      setActiveChildId(c.id)
                      navigate('/parent/attendance')
                    }}
                    variant="outline"
                    className="rounded-xl text-[10px] py-1.5 h-auto text-gray-600 font-bold border-gray-150 hover:bg-red-50 hover:text-red-750 transition-colors flex items-center justify-center gap-1"
                  >
                    <ClipboardList className="w-3.5 h-3.5 text-gray-400" /> Điểm danh
                  </Button>
                  <Button
                    onClick={() => {
                      setActiveChildId(c.id)
                      navigate('/parent/progress')
                    }}
                    variant="outline"
                    className="rounded-xl text-[10px] py-1.5 h-auto text-gray-600 font-bold border-gray-150 hover:bg-red-50 hover:text-red-750 transition-colors flex items-center justify-center gap-1"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-gray-400" /> Tiến độ
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Code Modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="max-w-xs rounded-2xl border-gray-250">
          <DialogHeader className="text-center">
            <DialogTitle className="text-sm font-extrabold text-gray-850 flex items-center justify-center gap-1.5 select-none">
              <QrCode className="w-5 h-5 text-red-550 animate-pulse" /> Mã QR Đi Học Của Con
            </DialogTitle>
            <DialogDescription className="text-[11px] text-gray-500">
              Con của bạn quét mã này tại sân để điểm danh.
            </DialogDescription>
          </DialogHeader>

          {selectedChildForQr && (
            <div className="flex flex-col items-center gap-4 py-4 select-none">
              <div className="bg-red-50/20 px-3 py-1 rounded-full text-xs font-bold text-red-600 border border-red-100/30">
                {selectedChildForQr.fullName}
              </div>
              <div className="bg-white border-2 border-gray-150 p-2 rounded-2xl shadow-sm">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(selectedChildForQr.id)}`}
                  alt="QR Code"
                  className="w-44 h-44 object-contain"
                />
              </div>
              <p className="text-[10px] text-gray-400 font-mono tracking-tight">{selectedChildForQr.id}</p>
            </div>
          )}

          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setQrModalOpen(false)} className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs py-2 font-bold transition-colors">
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Child Dialog */}
      <Dialog open={addChildOpen} onOpenChange={setAddChildOpen}>
        <DialogContent className="max-w-md rounded-2xl border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-850 select-none">Thêm Hồ Sơ Con Mới</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Tạo hồ sơ con của bạn dưới 15 tuổi. Các con không cần email/mật khẩu đăng nhập riêng.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddChild} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Họ và tên của con</label>
              <input
                type="text"
                placeholder="Nguyễn Văn B"
                value={newChildName}
                onChange={e => setNewChildName(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500/20 focus:border-red-500/30 transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Giới tính</label>
                <Select
                  value={newChildGender}
                  onValueChange={(val: 'Nam' | 'Nữ') => setNewChildGender(val)}
                >
                  <SelectTrigger className="w-full h-9 bg-gray-50 border-gray-200 text-xs rounded-xl focus:ring-1 focus:ring-red-500/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-gray-200 text-xs">
                    <SelectItem value="Nam">Nam</SelectItem>
                    <SelectItem value="Nữ">Nữ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Ngày sinh của con</label>
                <input
                  type="date"
                  value={newChildDob}
                  onChange={e => setNewChildDob(e.target.value)}
                  className="w-full px-3.5 py-2 h-9 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500/20"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Ghi chú thể trạng / Bệnh lý (nếu có)</label>
              <textarea
                rows={2}
                placeholder="Bé bị cận thị, hen suyễn nhẹ..."
                value={newChildNotes}
                onChange={e => setNewChildNotes(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500/20 resize-none"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAddChildOpen(false)}
                className="rounded-xl text-xs py-2 text-gray-500 font-semibold"
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs py-2 px-4 font-bold flex items-center justify-center gap-1 transition-colors"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Xác nhận thêm con
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Register Course Dialog */}
      <Dialog open={registerClassOpen} onOpenChange={setRegisterClassOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-850 select-none">Đăng Ký Khóa Học Cho Con</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Chọn con, lớp tập luyện, gói học và hoàn thiện thông tin khảo sát y tế.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRegisterCourse} className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Select Child */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Chọn con đăng ký học</label>
                <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                  <SelectTrigger className="w-full h-9 bg-gray-50 border-gray-200 text-xs rounded-xl focus:ring-1 focus:ring-red-500/20">
                    <SelectValue placeholder="Chọn con..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-gray-200 text-xs">
                    {children.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Club name */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Tên nhóm / Câu lạc bộ (nếu có)</label>
                <input
                  type="text"
                  placeholder="TP Badminton Junior"
                  value={clubName}
                  onChange={e => setClubName(e.target.value)}
                  className="w-full px-3.5 py-2 h-9 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Select Class */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Chọn lớp huấn luyện</label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="w-full h-9 bg-gray-50 border-gray-200 text-xs rounded-xl focus:ring-1 focus:ring-red-500/20">
                    <SelectValue placeholder="Chọn lớp..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-gray-200 text-xs">
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name} ({c.skill_level})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Select Package */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Chọn gói học / thẻ tập</label>
                <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                  <SelectTrigger className="w-full h-9 bg-gray-50 border-gray-200 text-xs rounded-xl focus:ring-1 focus:ring-red-500/20">
                    <SelectValue placeholder="Chọn gói..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-gray-200 text-xs">
                    {packages.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} - {p.price.toLocaleString('vi-VN')} VNĐ ({p.package_type === 'session' ? `${p.sessions_count} buổi` : 'Gói tháng'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Photo upload */}
            <div className="space-y-2 border-t border-gray-100 pt-3">
              <label className="text-xs font-semibold text-gray-800 block">Hình ảnh chân dung của con</label>
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-gray-400">Không ảnh</span>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    id="parent-child-photo"
                  />
                  <label
                    htmlFor="parent-child-photo"
                    className="cursor-pointer inline-flex items-center px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors"
                  >
                    Chọn ảnh
                  </label>
                  <p className="text-[9px] text-gray-400 mt-1">Ảnh chân dung rõ mặt để hiển thị trong hồ sơ học viên.</p>
                </div>
              </div>
            </div>

            {/* Health Survey */}
            <div className="space-y-3 border-t border-gray-100 pt-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                <Heart className="w-4 h-4 text-red-500 animate-pulse" /> Phiếu khảo sát y tế bắt buộc
              </div>
              <p className="text-[10px] text-gray-400 leading-normal">Vui lòng tick chọn nếu con có các vấn đề sức khỏe sau để HLV đặc biệt lưu ý và điều chỉnh cường độ luyện tập phù hợp.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-700">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={q1} onChange={e => setQ1(e.target.checked)} className="rounded text-red-600 focus:ring-red-500/20" />
                  <span>1. Tiền sử bệnh tim/huyết áp</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={q2} onChange={e => setQ2(e.target.checked)} className="rounded text-red-600 focus:ring-red-500/20" />
                  <span>2. Thường đau ngực khi vận động</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={q4} onChange={e => setQ4(e.target.checked)} className="rounded text-red-600 focus:ring-red-500/20" />
                  <span>3. Hay chóng mặt, mất thăng bằng</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={q5} onChange={e => setQ5(e.target.checked)} className="rounded text-red-600 focus:ring-red-500/20" />
                  <span>4. Gặp vấn đề cơ, xương, khớp</span>
                </label>

                {/* Medication survey */}
                <div className="col-span-1 md:col-span-2 space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={q7} onChange={e => setQ7(e.target.checked)} className="rounded text-red-600 focus:ring-red-500/20" />
                    <span>5. Đang uống các loại thuốc điều trị bệnh lý</span>
                  </label>
                  {q7 && (
                    <input
                      type="text"
                      placeholder="Chi tiết thuốc bé đang sử dụng..."
                      value={q7Detail}
                      onChange={e => setQ7Detail(e.target.value)}
                      className="w-full px-3.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500/20"
                    />
                  )}
                </div>

                {/* Physically limited survey */}
                <div className="col-span-1 md:col-span-2 space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={q9} onChange={e => setQ9(e.target.checked)} className="rounded text-red-600 focus:ring-red-500/20" />
                    <span>6. Hạn chế thể chất khác ảnh hưởng tập luyện</span>
                  </label>
                  {q9 && (
                    <input
                      type="text"
                      placeholder="Chi tiết các hạn chế thể chất của bé..."
                      value={q9Detail}
                      onChange={e => setQ9Detail(e.target.value)}
                      className="w-full px-3.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500/20"
                    />
                  )}
                </div>

                {/* Disability survey */}
                <div className="col-span-1 md:col-span-2 space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={q10} onChange={e => setQ10(e.target.checked)} className="rounded text-red-600 focus:ring-red-500/20" />
                    <span>7. Bé có khuyết tật về vận động/trí não</span>
                  </label>
                  {q10 && (
                    <input
                      type="text"
                      placeholder="Vui lòng nêu rõ tình trạng để HLV biết..."
                      value={q10Detail}
                      onChange={e => setQ10Detail(e.target.value)}
                      className="w-full px-3.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500/20"
                    />
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRegisterClassOpen(false)}
                className="rounded-xl text-xs py-2 text-gray-500 font-semibold"
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs py-2 px-4 font-bold flex items-center justify-center gap-1 transition-colors"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Xác nhận đăng ký học
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment display Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border-gray-100">
          <DialogHeader className="text-center">
            <DialogTitle className="text-lg font-extrabold text-gray-900 select-none">Mã QR Thanh Toán Học Phí</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Chuyển khoản học phí cho con để kích hoạt lớp học.
            </DialogDescription>
          </DialogHeader>

          {paymentConfirmed ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto animate-bounce text-xl">
                ✓
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900">Thanh Toán Thành Công!</h3>
                <p className="text-xs text-gray-500">Hệ thống đã nhận được tiền và kích hoạt gói học thành công. Vui lòng kiểm tra thẻ học hoặc thông báo trên app.</p>
              </div>
              <Button
                onClick={() => setPaymentModalOpen(false)}
                className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-2 font-bold text-xs"
              >
                Đóng
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-2 text-center">
              {/* QR Code */}
              <div className="relative w-52 h-52 mx-auto bg-white border border-gray-150 rounded-2xl overflow-hidden flex items-center justify-center p-2 shadow-sm select-none">
                <img src={vietQrUrl} alt="VietQR Payment" className="max-w-full max-h-full object-contain" />
              </div>

              {/* Details */}
              <div className="text-left text-xs space-y-1.5 text-gray-600 bg-gray-50 p-4 rounded-2xl border border-gray-100/50">
                <p><strong>Số tài khoản:</strong> <span className="text-gray-900 font-bold select-all">{bankDetails.bank_account}</span> ({bankDetails.bank_id})</p>
                <p><strong>Chủ tài khoản:</strong> <span className="text-gray-900 font-bold">{bankDetails.bank_account_name}</span></p>
                <p><strong>Số tiền:</strong> <span className="text-red-650 font-extrabold">{paymentAmount.toLocaleString('vi-VN')} VNĐ</span></p>
                <p>
                  <strong>Nội dung CK (Memo):</strong>{' '}
                  <span className="bg-red-50 text-red-700 font-extrabold px-1.5 py-0.5 rounded border border-red-200/50 select-all">{paymentMemo}</span>
                </p>
              </div>

              <div className="p-3 bg-yellow-50/60 border border-yellow-100 rounded-xl text-left text-[10px] text-yellow-800 leading-normal flex gap-1.5">
                <Info className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Lưu ý:</span> Quý phụ huynh vui lòng giữ đúng **nội dung chuyển khoản ({paymentMemo})** để hệ thống tự động nhận dạng thanh toán trong vòng 1 phút.
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  disabled={isSubmitting}
                  onClick={handleManualCheckPayment}
                  className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tôi đã chuyển khoản - Kiểm tra trạng thái'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setPaymentModalOpen(false)}
                  className="w-full text-xs text-gray-500 font-semibold"
                >
                  Để thanh toán sau
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
