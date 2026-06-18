import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import {
  ShieldAlert, Upload, CheckCircle2, AlertTriangle, ArrowLeft,
  Loader2, User, Heart, FileText, Calendar, Info
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface ClassDetail {
  id: string
  name: string
  max_students: number
  skill_level: 'beginner' | 'intermediate' | 'advanced' | 'kids' | 'all'
  facility_name?: string
  court_name?: string
}

interface PackageDetail {
  id: string
  name: string
  package_type: 'session' | 'monthly'
  sessions_count: number | null
  validity_days: number
  price: number
  description: string | null
}

export default function RegisterCoursePage() {
  const [searchParams] = useSearchParams()
  const classIdParam = searchParams.get('classId')
  const navigate = useNavigate()
  const { toast } = useToast()

  const [classes, setClasses] = useState<ClassDetail[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>(classIdParam || '')
  const [selectedClass, setSelectedClass] = useState<ClassDetail | null>(null)

  const [packages, setPackages] = useState<PackageDetail[]>([])
  const [selectedPackageId, setSelectedPackageId] = useState<string>('')
  const [selectedPackage, setSelectedPackage] = useState<PackageDetail | null>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'failure'>('idle')
  const [failureReason, setFailureReason] = useState('')
  const [createdRegistrationId, setCreatedRegistrationId] = useState<string>('')
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)

  // Form states
  const [clubName, setClubName] = useState('')
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [title, setTitle] = useState('VĐV/HV')
  const [gender, setGender] = useState<'Nam' | 'Nữ'>('Nam')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [homeAddress, setHomeAddress] = useState('')
  const [homePhone, setHomePhone] = useState('')
  const [mobilePhone, setMobilePhone] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [email, setEmail] = useState('')
  const [ethnicity, setEthnicity] = useState('Kinh')

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

  // Emergency contact for under 16
  const [parentName, setParentName] = useState('')
  const [parentRelationship, setParentRelationship] = useState('')
  const [parentAddress, setParentAddress] = useState('')
  const [parentHomePhone, setParentHomePhone] = useState('')
  const [parentMobilePhone, setParentMobilePhone] = useState('')
  const [parentEmail, setParentEmail] = useState('')

  // Photo upload
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  // Declaration tick
  const [responsibilityAccepted, setResponsibilityAccepted] = useState(false)

  // Compute if student is under 16
  const isUnder16 = () => {
    if (!dateOfBirth) return false
    const birthDate = new Date(dateOfBirth)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age < 16
  }

  useEffect(() => {
    async function loadData() {
      try {
        // Load active classes
        const { data, error } = await supabase
          .from('classes')
          .select(`
            id, name, max_students, skill_level,
            facilities(name), courts(name)
          `)
          .eq('status', 'active')

        if (error) throw error

        const formatted = (data as any[]).map(c => ({
          id: c.id,
          name: c.name,
          max_students: c.max_students || 15,
          skill_level: c.skill_level,
          facility_name: c.facilities?.name,
          court_name: c.courts?.name
        }))

        setClasses(formatted)

        // Set selected class details
        if (selectedClassId) {
          const cls = formatted.find(c => c.id === selectedClassId)
          if (cls) setSelectedClass(cls)
        }

        // Load active packages
        const { data: pkgData, error: pkgError } = await supabase
          .from('packages')
          .select('id, name, package_type, sessions_count, validity_days, price, description')
          .eq('status', 'active')
          .order('sort_order', { ascending: true })

        if (pkgError) throw pkgError

        setPackages(pkgData as PackageDetail[])
      } catch (err: any) {
        console.error('Error loading data:', err.message)
        toast({ title: 'Lỗi tải dữ liệu', description: err.message, variant: 'destructive' })
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [selectedClassId, toast])

  // Realtime subscription for payment status updates
  useEffect(() => {
    if (!createdRegistrationId) return

    const channel = supabase
      .channel(`registration_status:${createdRegistrationId}`)
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
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [createdRegistrationId])

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId)
    const cls = classes.find(c => c.id === classId) || null
    setSelectedClass(cls)
  }

  const handlePackageChange = (packageId: string) => {
    setSelectedPackageId(packageId)
    const pkg = packages.find(p => p.id === packageId) || null
    setSelectedPackage(pkg)
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedClassId) {
      toast({ title: 'Vui lòng chọn lớp học', variant: 'destructive' })
      return
    }

    if (!selectedPackageId) {
      toast({ title: 'Vui lòng chọn gói học', variant: 'destructive' })
      return
    }

    if (!responsibilityAccepted) {
      toast({ title: 'Bạn phải cam kết chịu trách nhiệm với thông tin đã cung cấp', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    setFailureReason('')

    try {
      // Step 1: Check available slots in class
      const { data: classInfo, error: classInfoError } = await (supabase
        .from('classes') as any)
        .select('max_students')
        .eq('id', selectedClassId)
        .maybeSingle()

      if (classInfoError || !classInfo) {
        throw new Error('Lớp học không tồn tại hoặc đã bị đóng.')
      }

      const maxStudents = (classInfo as any).max_students || 15

      // Get count of active students
      const { count, error: countError } = await supabase
        .from('class_students')
        .select('id', { count: 'exact', head: true })
        .eq('class_id', selectedClassId)
        .eq('status', 'active')

      if (countError) throw countError

      const currentStudentsCount = count || 0

      if (currentStudentsCount >= maxStudents) {
        setSubmitStatus('failure')
        setFailureReason('Lớp học này đã hết slot trống. Vui lòng chọn lớp học khác.')
        setIsSubmitting(false)
        return
      }

      // Step 2: Convert photo to Base64 if selected
      let photoUrl = null
      if (photoFile) {
        try {
          photoUrl = await new Promise<string>((resolve, reject) => {
            const fileReader = new FileReader()
            fileReader.readAsDataURL(photoFile)
            fileReader.onload = () => resolve(fileReader.result as string)
            fileReader.onerror = (error) => reject(error)
          })
        } catch (uploadError) {
          throw new Error('Không thể xử lý hình ảnh học sinh.')
        }
      }

      // Step 3: Insert registration record
      const { data: insertResult, error: insertError } = await (supabase
        .from('registrations') as any)
        .insert({
          class_id: selectedClassId,
          package_id: selectedPackageId,
          payment_status: 'unpaid',
          club_name: clubName,
          first_name: firstName,
          last_name: lastName,
          title,
          gender,
          date_of_birth: dateOfBirth,
          home_address: homeAddress,
          home_phone: homePhone,
          mobile_phone: mobilePhone,
          emergency_phone: emergencyPhone,
          email,
          ethnicity,
          q1_heart_condition: q1,
          q2_chest_pain_activity: q2,
          q3_chest_pain_rest: q3,
          q4_fainting_dizziness: q4,
          q5_joint_problem: q5,
          q6_high_blood_pressure: q6,
          q7_medications: q7,
          q7_medications_detail: q7Detail,
          q8_pregnant: q8,
          q9_other_reasons: q9,
          q9_other_reasons_detail: q9Detail,
          q10_disability: q10,
          q10_disability_detail: q10Detail,
          student_photo_url: photoUrl,
          parent_name: isUnder16() ? parentName : null,
          parent_relationship: isUnder16() ? parentRelationship : null,
          parent_address: isUnder16() ? parentAddress : null,
          parent_home_phone: isUnder16() ? parentHomePhone : null,
          parent_mobile_phone: isUnder16() ? parentMobilePhone : null,
          parent_email: isUnder16() ? parentEmail : null,
          terms_accepted: true,
          status: 'pending'
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      const insertedId = insertResult?.id || ''
      setCreatedRegistrationId(insertedId)
      setPaymentConfirmed(false)
      setSubmitStatus('success')
      toast({ title: 'Gửi đăng ký thành công! Vui lòng thanh toán.' })
    } catch (err: any) {
      console.error('Registration failed:', err)
      toast({ title: 'Đăng ký thất bại', description: err.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
          <p className="text-sm text-gray-500">Đang tải biểu mẫu đăng ký...</p>
        </div>
      </div>
    )
  }

  if (submitStatus === 'success') {
    const BANK_ID = 'MB'
    const BANK_ACCOUNT = '0901234567'
    const BANK_ACCOUNT_NAME = 'THAI PHONG BADMINTON'
    const shortId = createdRegistrationId.substring(0, 8)
    const memo = `TPB${shortId}`
    const amount = selectedPackage ? Number(selectedPackage.price) : 0
    const vietQrUrl = `https://img.vietqr.io/image/${BANK_ID}-${BANK_ACCOUNT}-compact2.png?amount=${amount}&addInfo=${memo}&accountName=${encodeURIComponent(BANK_ACCOUNT_NAME)}`

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 font-sans">
        <div className="bg-white rounded-3xl p-8 max-w-lg w-full text-center shadow-xl border border-gray-100 space-y-6">
          {paymentConfirmed ? (
            <>
              <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold text-gray-900">Thanh Toán Thành Công!</h2>
                <p className="text-sm text-gray-500">
                  Giao dịch học phí cho học viên <span className="font-bold text-gray-800">{lastName} {firstName}</span> đã được ghi nhận. Tài khoản của học sinh đã được tạo và kích hoạt lớp <span className="font-bold text-gray-800">"${selectedClass?.name}"</span>.
                </p>
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-left text-xs space-y-2 text-green-800">
                <p className="font-bold text-green-900 text-sm mb-1">🎉 Thông tin lớp & thẻ học:</p>
                <p><strong>Học viên:</strong> {lastName} {firstName}</p>
                <p><strong>Lớp học:</strong> {selectedClass?.name}</p>
                <p><strong>Gói học:</strong> {selectedPackage?.name}</p>
                <p><strong>Trạng thái tài khoản:</strong> Đã kích hoạt. Huấn luyện viên sẽ liên hệ với bạn trước buổi học.</p>
              </div>
              <div className="pt-4">
                <Link to="/">
                  <Button className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-6 font-bold">
                    Quay lại trang chủ
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold text-gray-900">Đăng Ký Thành Công!</h2>
                <p className="text-sm text-gray-500">
                  Đơn đăng ký của học sinh <span className="font-bold text-gray-800">{lastName} {firstName}</span> đã được lưu. Vui lòng thanh toán học phí để kích hoạt lớp học.
                </p>
              </div>

              {/* VietQR Display */}
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-4">
                <p className="font-bold text-gray-800 text-sm">Quét mã VietQR để thanh toán học phí</p>
                
                <div className="relative w-64 h-64 mx-auto bg-white border border-gray-200 rounded-2xl overflow-hidden flex items-center justify-center p-2 shadow-sm">
                  <img src={vietQrUrl} alt="VietQR Payment" className="max-w-full max-h-full object-contain" />
                </div>

                <div className="text-left text-xs space-y-1.5 text-gray-650 border-t border-gray-200/60 pt-3">
                  <p><strong>Số tài khoản:</strong> <span className="text-gray-900 font-bold select-all">{BANK_ACCOUNT}</span> ({BANK_ID})</p>
                  <p><strong>Chủ tài khoản:</strong> <span className="text-gray-900 font-bold">{BANK_ACCOUNT_NAME}</span></p>
                  <p><strong>Số tiền:</strong> <span className="text-red-600 font-extrabold">{amount.toLocaleString('vi-VN')} VNĐ</span></p>
                  <p>
                    <strong>Cú pháp chuyển khoản (Memo):</strong>{' '}
                    <span className="bg-red-50 text-red-700 font-extrabold px-1.5 py-0.5 rounded border border-red-200/50 select-all">{memo}</span>
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-yellow-50/60 border border-yellow-100 rounded-xl text-left text-[11px] text-yellow-800 leading-relaxed flex gap-2">
                <Info className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Lưu ý quan trọng:</span> Quý phụ huynh vui lòng giữ đúng **nội dung chuyển khoản ({memo})** để hệ thống tự động kích hoạt tài khoản trong vòng 1-2 phút sau khi nhận được tiền.
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button 
                  disabled={isSubmitting} 
                  onClick={async () => {
                    setIsSubmitting(true)
                    // Check manual status
                    const { data: reg, error } = await (supabase
                      .from('registrations') as any)
                      .select('payment_status, status')
                      .eq('id', createdRegistrationId)
                      .single()
                    setIsSubmitting(false)
                    if (error) {
                      toast({ title: 'Lỗi kiểm tra trạng thái', description: error.message, variant: 'destructive' })
                      return
                    }
                    if (reg?.payment_status === 'paid') {
                      setPaymentConfirmed(true)
                      toast({ title: 'Thanh toán thành công!' })
                    } else {
                      toast({ title: 'Hệ thống chưa ghi nhận chuyển khoản', description: 'Nếu đã chuyển khoản, vui lòng đợi 1-2 phút rồi kiểm tra lại hoặc liên hệ HLV.' })
                    }
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-6 font-bold flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tôi đã chuyển khoản - Kiểm tra trạng thái'}
                </Button>
                
                <Link to="/">
                  <Button variant="ghost" className="w-full text-gray-500 hover:text-gray-700 font-medium text-xs">
                    Quay lại trang chủ (tài khoản sẽ được kích hoạt khi thanh toán xong)
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  if (submitStatus === 'failure') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 font-sans">
        <div className="bg-white rounded-3xl p-8 max-w-lg w-full text-center shadow-xl border border-gray-100 space-y-6">
          <div className="w-20 h-20 bg-red-50 text-red-650 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-12 h-12" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-gray-900">Đăng Ký Thất Bại</h2>
            <p className="text-sm text-red-500 font-medium">{failureReason}</p>
          </div>
          <p className="text-xs text-gray-505 leading-relaxed">
            Do sĩ số tối đa của lớp học đã được lấp đầy bởi các học sinh trước đó. Quý phụ huynh vui lòng chọn một lớp học khác còn slot trống hoặc liên hệ HLV để được hỗ trợ sắp xếp lớp bổ sung.
          </p>
          <div className="flex flex-col gap-2 pt-4 border-t border-gray-100">
            <Button
              onClick={() => setSubmitStatus('idle')}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl py-6 font-bold"
            >
              Chọn lớp khác và thử lại
            </Button>
            <Link to="/" className="w-full">
              <Button variant="ghost" className="w-full text-gray-500 hover:text-gray-700 font-medium">
                Về trang chủ
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-16">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#180a0a] border-b border-white/5 text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white font-medium">
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>
          <span className="font-extrabold text-sm sm:text-base tracking-tight">Thái Phong Badminton Class</span>
          <div className="w-16"></div> {/* Spacer */}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 mt-8">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-red-800 p-6 text-white text-center">
            <h1 className="text-xl sm:text-2xl font-extrabold uppercase tracking-wide">Mẫu Đăng Ký Học Viên</h1>
            <p className="text-white/80 text-xs mt-1.5">Mẫu thu thập thông tin quản lý và theo dõi sức khỏe VĐV/HV</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
            
            {/* Lớp đăng ký */}
            <div className="space-y-3">
              <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2 text-sm flex items-center gap-1.5 text-red-600">
                <Calendar className="w-4 h-4" /> 1. LỚP HỌC ĐĂNG KÝ
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Chọn Lớp Tập Luyện <span className="text-red-500">*</span></label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => handleClassChange(e.target.value)}
                    required
                    className="mt-1 w-full px-4 py-3 bg-gray-55 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-sm font-semibold"
                  >
                    <option value="">-- Chọn lớp học --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.facility_name ? `(${c.facility_name})` : ''} - Trình độ: {c.skill_level === 'beginner' ? 'Cơ bản' : c.skill_level === 'intermediate' ? 'Trung cấp' : c.skill_level === 'advanced' ? 'Nâng cao' : 'Khác'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Chọn Gói Học Muốn Mua <span className="text-red-500">*</span></label>
                  <select
                    value={selectedPackageId}
                    onChange={(e) => handlePackageChange(e.target.value)}
                    required
                    className="mt-1 w-full px-4 py-3 bg-gray-55 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-sm font-semibold"
                  >
                    <option value="">-- Chọn gói học --</option>
                    {packages.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} - {Number(p.price).toLocaleString('vi-VN')} VNĐ ({p.package_type === 'session' ? `${p.sessions_count} buổi` : 'Theo tháng'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(selectedClass || selectedPackage) && (
                <div className="mt-3 p-4.5 bg-red-50/50 border border-red-100 rounded-2xl space-y-3">
                  {selectedClass && (
                    <div className="flex items-start gap-2 text-xs text-red-800">
                      <Info className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold">Lớp đang chọn: {selectedClass.name}</p>
                        <p>Sân tập: {selectedClass.facility_name || 'Đang cập nhật'} {selectedClass.court_name ? `(Sân ${selectedClass.court_name})` : ''}</p>
                        <p>Giới hạn tối đa: {selectedClass.max_students} học viên</p>
                      </div>
                    </div>
                  )}

                  {selectedPackage && (
                    <div className="flex items-start gap-2 text-xs text-green-800 border-t border-red-200/40 pt-2.5">
                      <CheckCircle2 className="w-4 h-4 text-green-650 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold">Gói học đang chọn: {selectedPackage.name}</p>
                        <p>Học phí: <span className="font-extrabold text-red-600 text-sm">{Number(selectedPackage.price).toLocaleString('vi-VN')} VNĐ</span></p>
                        <p>Hạn sử dụng: {selectedPackage.validity_days} ngày từ khi kích hoạt</p>
                        {selectedPackage.description && <p className="text-gray-500 italic text-[11px] mt-0.5">{selectedPackage.description}</p>}
                      </div>
                    </div>
                  )}

                  {/* Note trình độ Trung cấp / Nâng cao */}
                  {selectedClass && selectedClass.skill_level !== 'beginner' && (
                    <div className="mt-2.5 p-3 bg-yellow-50 border border-yellow-250 rounded-xl flex gap-2 text-[11px] text-yellow-850 leading-relaxed">
                      <ShieldAlert className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold uppercase text-yellow-800">Thông báo test trình độ:</span> Học sinh đăng ký lớp trình độ Trung cấp/Nâng cao sẽ được kiểm tra trình độ tại buổi học đầu tiên tại lớp. Nếu học viên không đáp ứng đủ trình độ, huấn luyện viên sẽ trao đổi trực tiếp với phụ huynh để chuyển học viên vào lớp học có trình độ phù hợp hơn.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Thông tin học sinh */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2 text-sm flex items-center gap-1.5 text-red-600">
                <User className="w-4 h-4" /> 2. THÔNG TIN HỌC VIÊN
              </h3>

              {/* Upload photo */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                <div className="w-24 h-32 rounded-xl bg-gray-200 border border-gray-300 overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Xem trước" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <div className="space-y-2 text-center sm:text-left">
                  <p className="text-xs font-bold text-gray-700">Tải Lên Ảnh Chân Dung Học Sinh</p>
                  <p className="text-[10px] text-gray-400">Hình ảnh rõ mặt để HLV dễ nhận biết và theo dõi chuyên cần</p>
                  <div className="relative inline-block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Button type="button" variant="outline" className="text-xs font-semibold gap-1.5 bg-white">
                      <Upload className="w-3.5 h-3.5" /> Chọn file ảnh
                    </Button>
                  </div>
                  {photoFile && <span className="text-xs text-green-600 block sm:inline sm:ml-2 font-medium">{photoFile.name}</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tên CLB/Nhóm (nếu có)</label>
                  <input
                    type="text"
                    value={clubName}
                    onChange={(e) => setClubName(e.target.value)}
                    placeholder="VD: Nhóm cầu lông TMA"
                    className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Mẫu đăng ký VĐV/HV</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-gray-150 border border-gray-200 rounded-xl text-gray-500 text-sm focus:outline-none font-medium"
                    readOnly
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Họ đệm học viên <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    placeholder="VD: Nguyễn Văn"
                    className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tên học viên <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    placeholder="VD: A"
                    className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Giới tính <span className="text-red-500">*</span></label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        checked={gender === 'Nam'}
                        onChange={() => setGender('Nam')}
                        className="text-red-600 focus:ring-red-500"
                      />
                      Nam
                    </label>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        checked={gender === 'Nữ'}
                        onChange={() => setGender('Nữ')}
                        className="text-red-600 focus:ring-red-500"
                      />
                      Nữ
                    </label>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ngày sinh <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    required
                    className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-sm font-semibold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Địa chỉ nhà</label>
                  <input
                    type="text"
                    value={homeAddress}
                    onChange={(e) => setHomeAddress(e.target.value)}
                    placeholder="VD: 123 Đường ABC, Phường X, Quận Y"
                    className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Số điện thoại di động <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    value={mobilePhone}
                    onChange={(e) => setMobilePhone(e.target.value)}
                    required
                    placeholder="VD: 090xxxxxxx"
                    className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Số điện thoại nhà riêng (nếu có)</label>
                  <input
                    type="tel"
                    value={homePhone}
                    onChange={(e) => setHomePhone(e.target.value)}
                    placeholder="VD: 028xxxxxxx"
                    className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Số điện thoại liên lạc khẩn cấp <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    required
                    placeholder="VD: 091xxxxxxx"
                    className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Địa chỉ Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="VD: hocsinh@gmail.com"
                    className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Dân tộc</label>
                  <input
                    type="text"
                    value={ethnicity}
                    onChange={(e) => setEthnicity(e.target.value)}
                    placeholder="Kinh"
                    className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Bảng khảo sát sức khỏe */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2 text-sm flex items-center gap-1.5 text-red-600">
                <Heart className="w-4 h-4" /> 3. KHẢO SÁT SỨC KHỎE
              </h3>
              
              <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-[11px] text-red-900 leading-relaxed font-semibold">
                <Info className="w-3.5 h-3.5 text-red-600 inline mr-1 mb-0.5" />
                Thông tin sức khỏe dưới đây vô cùng quan trọng, giúp Huấn luyện viên đảm bảo take care kỹ lưỡng từng học sinh và đưa ra bài tập, phương án đào tạo phù hợp nhất với thể trạng mỗi em.
              </div>

              <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100 text-xs">
                {/* Q1 */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/30">
                  <p className="font-medium text-gray-700">1. Bạn có từng được bác sĩ thông báo có bệnh tim và chỉ nên thực hiện các hoạt động thể chất sau khi được xác nhận y tế?</p>
                  <div className="flex gap-4 flex-shrink-0">
                    <label className="flex items-center gap-1 cursor-pointer font-bold"><input type="radio" checked={q1 === true} onChange={() => setQ1(true)} className="text-red-600 focus:ring-red-500" /> Có</label>
                    <label className="flex items-center gap-1 cursor-pointer font-bold"><input type="radio" checked={q1 === false} onChange={() => setQ1(false)} className="text-red-600 focus:ring-red-500" /> Không</label>
                  </div>
                </div>

                {/* Q2 */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="font-medium text-gray-700">2. Bạn có từng cảm thấy đau ở ngực khi thực hiện các hoạt động thể chất?</p>
                  <div className="flex gap-4 flex-shrink-0">
                    <label className="flex items-center gap-1 cursor-pointer font-bold"><input type="radio" checked={q2 === true} onChange={() => setQ2(true)} className="text-red-600 focus:ring-red-500" /> Có</label>
                    <label className="flex items-center gap-1 cursor-pointer font-bold"><input type="radio" checked={q2 === false} onChange={() => setQ2(false)} className="text-red-600 focus:ring-red-500" /> Không</label>
                  </div>
                </div>

                {/* Q3 */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/30">
                  <p className="font-medium text-gray-700">3. Bạn có từng cảm thấy đau ở ngực khi không thực hiện các hoạt động thể chất?</p>
                  <div className="flex gap-4 flex-shrink-0">
                    <label className="flex items-center gap-1 cursor-pointer font-bold"><input type="radio" checked={q3 === true} onChange={() => setQ3(true)} className="text-red-600 focus:ring-red-500" /> Có</label>
                    <label className="flex items-center gap-1 cursor-pointer font-bold"><input type="radio" checked={q3 === false} onChange={() => setQ3(false)} className="text-red-600 focus:ring-red-500" /> Không</label>
                  </div>
                </div>

                {/* Q4 */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="font-medium text-gray-700">4. Bạn có từng ngất xỉu hay cảm thấy chóng mặt?</p>
                  <div className="flex gap-4 flex-shrink-0">
                    <label className="flex items-center gap-1 cursor-pointer font-bold"><input type="radio" checked={q4 === true} onChange={() => setQ4(true)} className="text-red-600 focus:ring-red-500" /> Có</label>
                    <label className="flex items-center gap-1 cursor-pointer font-bold"><input type="radio" checked={q4 === false} onChange={() => setQ4(false)} className="text-red-600 focus:ring-red-500" /> Không</label>
                  </div>
                </div>

                {/* Q5 */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/30">
                  <p className="font-medium text-gray-700">5. Bạn có vấn đề về khớp mà có thể trầm trọng hơn khi tập thể dục không?</p>
                  <div className="flex gap-4 flex-shrink-0">
                    <label className="flex items-center gap-1 cursor-pointer font-bold"><input type="radio" checked={q5 === true} onChange={() => setQ5(true)} className="text-red-600 focus:ring-red-500" /> Có</label>
                    <label className="flex items-center gap-1 cursor-pointer font-bold"><input type="radio" checked={q5 === false} onChange={() => setQ5(false)} className="text-red-600 focus:ring-red-500" /> Không</label>
                  </div>
                </div>

                {/* Q6 */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="font-medium text-gray-700">6. Bạn có từng được thông báo là bị cao huyết áp không?</p>
                  <div className="flex gap-4 flex-shrink-0">
                    <label className="flex items-center gap-1 cursor-pointer font-bold"><input type="radio" checked={q6 === true} onChange={() => setQ6(true)} className="text-red-600 focus:ring-red-500" /> Có</label>
                    <label className="flex items-center gap-1 cursor-pointer font-bold"><input type="radio" checked={q6 === false} onChange={() => setQ6(false)} className="text-red-600 focus:ring-red-500" /> Không</label>
                  </div>
                </div>

                {/* Q7 */}
                <div className="p-4 space-y-2 bg-gray-50/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="font-medium text-gray-700">7. Hiện tại bạn có đang sử dụng các loại thuốc mà HLV cần được biết hay không?</p>
                    <div className="flex gap-4 flex-shrink-0">
                      <label className="flex items-center gap-1 cursor-pointer font-bold"><input type="radio" checked={q7 === true} onChange={() => setQ7(true)} className="text-red-600 focus:ring-red-500" /> Có</label>
                      <label className="flex items-center gap-1 cursor-pointer font-bold"><input type="radio" checked={q7 === false} onChange={() => setQ7(false)} className="text-red-600 focus:ring-red-500" /> Không</label>
                    </div>
                  </div>
                  {q7 && (
                    <input
                      type="text"
                      value={q7Detail}
                      onChange={(e) => setQ7Detail(e.target.value)}
                      placeholder="Nêu rõ tên thuốc đang sử dụng và liều lượng..."
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 text-xs"
                      required
                    />
                  )}
                </div>

                {/* Q8 */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="font-medium text-gray-700">8. Bạn đang có thai hay vừa sinh em bé trong 6 tháng gần nhất hay không?</p>
                  <div className="flex gap-4 flex-shrink-0">
                    <label className="flex items-center gap-1 cursor-pointer font-bold"><input type="radio" checked={q8 === true} onChange={() => setQ8(true)} className="text-red-600 focus:ring-red-500" /> Có</label>
                    <label className="flex items-center gap-1 cursor-pointer font-bold"><input type="radio" checked={q8 === false} onChange={() => setQ8(false)} className="text-red-600 focus:ring-red-500" /> Không</label>
                  </div>
                </div>

                {/* Q9 */}
                <div className="p-4 space-y-2 bg-gray-50/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="font-medium text-gray-700">9. Có lí do nào khác khiến bạn không nên tham gia vào các hoạt động thể chất không?</p>
                    <div className="flex gap-4 flex-shrink-0">
                      <label className="flex items-center gap-1 cursor-pointer font-bold"><input type="radio" checked={q9 === true} onChange={() => setQ9(true)} className="text-red-600 focus:ring-red-500" /> Có</label>
                      <label className="flex items-center gap-1 cursor-pointer font-bold"><input type="radio" checked={q9 === false} onChange={() => setQ9(false)} className="text-red-600 focus:ring-red-500" /> Không</label>
                    </div>
                  </div>
                  {q9 && (
                    <input
                      type="text"
                      value={q9Detail}
                      onChange={(e) => setQ9Detail(e.target.value)}
                      placeholder="Nhập lý do chi tiết..."
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 text-xs"
                      required
                    />
                  )}
                </div>

                {/* Q10 */}
                <div className="p-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="font-medium text-gray-700">10. Bạn có nghĩ mình có bất kì khuyết tật gì về thể chất hoặc trí tuệ không?</p>
                    <div className="flex gap-4 flex-shrink-0">
                      <label className="flex items-center gap-1 cursor-pointer font-bold"><input type="radio" checked={q10 === true} onChange={() => setQ10(true)} className="text-red-600 focus:ring-red-500" /> Có</label>
                      <label className="flex items-center gap-1 cursor-pointer font-bold"><input type="radio" checked={q10 === false} onChange={() => setQ10(false)} className="text-red-600 focus:ring-red-500" /> Không</label>
                    </div>
                  </div>
                  {q10 && (
                    <input
                      type="text"
                      value={q10Detail}
                      onChange={(e) => setQ10Detail(e.target.value)}
                      placeholder="Vui lòng mô tả chi tiết khuyết tật thể chất / trí tuệ..."
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 text-xs"
                      required
                    />
                  )}
                </div>
              </div>

              {/* Health Guidance Warnings */}
              {(q1 || q2 || q3 || q4 || q5 || q6 || q7 || q8 || q9 || q10) ? (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-2xl flex gap-2 text-[11px] text-yellow-850 leading-relaxed font-semibold">
                  <ShieldAlert className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-yellow-800 uppercase">Khuyến nghị Y tế:</span> Do bạn đã trả lời "Có" cho một hoặc một vài câu hỏi sức khỏe trên, chúng tôi khuyến nghị phụ huynh/học sinh nên tham khảo ý kiến tư vấn trực tiếp của bác sĩ hoặc chuyên gia y tế trước khi bắt đầu các hoạt động thể thao cường độ mạnh. Đồng thời, vui lòng thông báo chi tiết tình trạng cho Huấn luyện viên vào buổi tập đầu tiên.
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-green-50 border border-green-150 rounded-2xl flex gap-2 text-[11px] text-green-850 leading-relaxed font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    Do bạn trả lời "Không" cho tất cả các câu hỏi, bạn có thể tự tin tham gia ngay vào môn cầu lông. Tuy nhiên hãy tập luyện tăng dần cường độ để cơ thể thích nghi một cách từ từ.
                  </div>
                </div>
              )}
            </div>

            {/* Thông tin phụ huynh (nếu dưới 16 tuổi) */}
            {isUnder16() && (
              <div className="space-y-4 p-5 bg-red-50/20 border border-dashed border-red-200 rounded-3xl">
                <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2 text-sm flex items-center gap-1.5 text-red-600">
                  <FileText className="w-4 h-4" /> 4. THÔNG TIN LIÊN LẠC PHỤ HUYNH (Học sinh dưới 16 tuổi)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Họ tên phụ huynh <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      required
                      placeholder="VD: Nguyễn Văn Cha"
                      className="mt-1 w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Mối quan hệ với học viên <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={parentRelationship}
                      onChange={(e) => setParentRelationship(e.target.value)}
                      required
                      placeholder="VD: Bố / Mẹ"
                      className="mt-1 w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Địa chỉ (nếu khác với địa chỉ học viên)</label>
                    <input
                      type="text"
                      value={parentAddress}
                      onChange={(e) => setParentAddress(e.target.value)}
                      placeholder="Nhập địa chỉ phụ huynh nếu khác bên trên..."
                      className="mt-1 w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Số điện thoại di động phụ huynh <span className="text-red-500">*</span></label>
                    <input
                      type="tel"
                      value={parentMobilePhone}
                      onChange={(e) => setParentMobilePhone(e.target.value)}
                      required
                      placeholder="VD: 090xxxxxxx"
                      className="mt-1 w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Số điện thoại nhà riêng phụ huynh</label>
                    <input
                      type="tel"
                      value={parentHomePhone}
                      onChange={(e) => setParentHomePhone(e.target.value)}
                      placeholder="VD: 028xxxxxxx"
                      className="mt-1 w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">E-mail phụ huynh <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      required
                      placeholder="VD: phuhuynh@gmail.com"
                      className="mt-1 w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Điều khoản & Cam kết */}
            <div className="pt-6 border-t border-gray-100 space-y-4">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={responsibilityAccepted}
                  onChange={(e) => setResponsibilityAccepted(e.target.checked)}
                  required
                  className="mt-1 rounded text-red-600 focus:ring-red-500 w-4.5 h-4.5"
                />
                <span className="text-xs text-gray-650 font-bold leading-relaxed">
                  Tôi đã đọc kỹ và cam kết chịu hoàn toàn trách nhiệm đối với các thông tin đã khai báo ở trên. Tôi hiểu rằng thông tin này dùng để phục vụ quá trình tập luyện an toàn tại Thái Phong Badminton Class.
                </span>
              </label>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-red-600 hover:bg-red-700 text-white rounded-2xl py-7 font-extrabold shadow-md uppercase tracking-wider flex items-center justify-center gap-2 text-sm disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'Đang gửi đăng ký...' : 'Gửi đăng ký xếp lớp'}
              </Button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}
