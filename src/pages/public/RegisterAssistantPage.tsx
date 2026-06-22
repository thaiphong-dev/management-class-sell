import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Upload, CheckCircle2, ArrowLeft, Loader2, User, GraduationCap, Award, Info, FileText
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'



const compressImageToBlob = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<Blob> => {
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
        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Không thể nén ảnh'))
            }
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = (err) => reject(err)
    }
    reader.onerror = (err) => reject(err)
  })
}

export default function RegisterAssistantPage() {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'failure'>('idle')

  // Form Fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [gender, setGender] = useState<'Nam' | 'Nữ'>('Nam')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  
  // Assistant Specific
  const [schoolUniversity, setSchoolUniversity] = useState('')
  const [major, setMajor] = useState('')
  const [yearOfStudy, setYearOfStudy] = useState('')
  const [skills, setSkills] = useState('')
  const [bio, setBio] = useState('')
  const [newCert, setNewCert] = useState('')
  const [certifications, setCertifications] = useState<string[]>([])

  // Image Upload handler
  const [uploadingImage, setUploadingImage] = useState(false)
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const blob = await compressImageToBlob(file, 400, 400, 0.8)
      const fileExt = 'jpg'
      const fileName = `registrations/assistant-${Date.now()}.${fileExt}`
      const { error: uploadErr } = await supabase.storage
        .from('image')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true })
      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage.from('image').getPublicUrl(fileName)
      setAvatarUrl(urlData.publicUrl)
      toast({ title: 'Tải ảnh lên thành công', description: 'Ảnh chân dung đã được tải lên lưu trữ.' })
    } catch (err: any) {
      console.error(err)
      toast({ title: 'Lỗi xử lý ảnh', description: err.message || 'Không thể nén hoặc tải ảnh lên.', variant: 'destructive' })
    } finally {
      setUploadingImage(false)
    }
  }

  // Certifications list handlers
  const addCertification = () => {
    if (newCert.trim() && !certifications.includes(newCert.trim())) {
      setCertifications(prev => [...prev, newCert.trim()])
      setNewCert('')
    }
  }
  const removeCertification = (cert: string) => {
    setCertifications(prev => prev.filter(c => c !== cert))
  }

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName || !lastName || !dateOfBirth || !email || !phone) {
      toast({ title: 'Thiếu thông tin', description: 'Vui lòng điền đầy đủ các trường bắt buộc (*).', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await (supabase
        .from('coach_assistant_registrations') as any)
        .insert({
          role: 'assistant',
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          gender,
          date_of_birth: dateOfBirth,
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim() || null,
          avatar_url: avatarUrl,
          school_university: schoolUniversity.trim() || null,
          major: major.trim() || null,
          year_of_study: yearOfStudy.trim() || null,
          skills: skills.trim() || null,
          bio: bio.trim() || null,
          certifications: certifications.length > 0 ? certifications : null,
          status: 'pending'
        })

      if (error) throw error

      setSubmitStatus('success')
      toast({ title: 'Đã gửi hồ sơ ứng tuyển', description: 'Hồ sơ của bạn đã được gửi thành công đến Admin.' })
    } catch (err: any) {
      console.error('Submission error:', err)
      setSubmitStatus('failure')
      toast({ title: 'Lỗi gửi hồ sơ', description: err.message || 'Không thể lưu hồ sơ ứng tuyển.', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-gray-100 p-8 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-center text-green-500 mx-auto animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-gray-900">Nộp Hồ Sơ Thành Công!</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Cảm ơn bạn đã ứng tuyển vị trí **Trợ giảng** tại **Thái Phong Badminton Class**. Hồ sơ của bạn đang được Ban quản trị phê duyệt. Chúng tôi sẽ phản hồi lại bạn sớm qua Email hoặc Số điện thoại.
            </p>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <Button asChild className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-2.5 font-bold transition-all">
              <Link to="/">Quay lại trang chủ</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Back Link */}
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
          <ArrowLeft className="w-4 h-4" /> Quay lại trang chủ
        </Link>

        {/* Title */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 flex-shrink-0">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-xl font-extrabold text-gray-900 sm:text-2xl">Đăng Ký Tuyển Dụng Trợ Giảng</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Hỗ trợ công tác đào tạo và trải nghiệm học tập tuyệt vời cho các thế hệ học viên.
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-2xl text-xs text-orange-950 leading-relaxed font-medium flex gap-3">
          <Info className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            Vị trí Trợ giảng ưu tiên các bạn học sinh, sinh viên năng động, yêu thích bộ môn cầu lông, có tác phong sư phạm và kỹ năng làm việc nhóm tốt. Bạn sẽ hỗ trợ HLV chính trong việc quản lý lớp, chuẩn bị dụng cụ sân bãi và thị phạm động tác.
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-8">
          
          {/* Section 1: Personal Info */}
          <div className="space-y-5">
            <h2 className="font-bold text-gray-900 border-b border-gray-100 pb-2 text-sm flex items-center gap-2 text-orange-650">
              <User className="w-4 h-4" /> 1. THÔNG TIN CÁ NHÂN
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Họ đệm <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="VD: Trần Hoàng"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-sm font-semibold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tên <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nam"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-sm font-semibold"
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
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    Nam
                  </label>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      checked={gender === 'Nữ'}
                      onChange={() => setGender('Nữ')}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    Nữ
                  </label>
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ngày sinh <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  required
                  value={dateOfBirth}
                  onChange={e => setDateOfBirth(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-sm font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Số điện thoại di động <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  required
                  placeholder="VD: 091xxxxxxx"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-sm font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Địa chỉ Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  required
                  placeholder="VD: trogiang@gmail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-sm font-semibold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Địa chỉ thường trú</label>
                <input
                  type="text"
                  placeholder="VD: 45/3 Đường Phạm Thế Hiển, Phường 4, Quận 8, TP.HCM"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-sm"
                />
              </div>

              {/* Avatar Upload */}
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Ảnh chân dung (Để hiển thị profile)</label>
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer text-xs font-semibold text-gray-700">
                      <Upload className="w-4 h-4" />
                      {uploadingImage ? 'Đang xử lý...' : 'Chọn ảnh đại diện'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-gray-400 mt-1">Hỗ trợ JPG, PNG. Kích thước đề xuất 400x400px.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Education Status */}
          <div className="space-y-5">
            <h2 className="font-bold text-gray-900 border-b border-gray-100 pb-2 text-sm flex items-center gap-2 text-orange-650">
              <GraduationCap className="w-4 h-4" /> 2. THÔNG TIN HỌC VẤN / CÔNG VIỆC
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Trường đang học / Nơi làm việc</label>
                <input
                  type="text"
                  placeholder="VD: Đại học Sư phạm TDTT TPHCM"
                  value={schoolUniversity}
                  onChange={e => setSchoolUniversity(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-sm"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Chuyên ngành học (nếu có)</label>
                <input
                  type="text"
                  placeholder="VD: Giáo dục Thể chất, Quản lý thể thao"
                  value={major}
                  onChange={e => setMajor(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-sm"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Năm học hiện tại (nếu là học sinh/sinh viên)</label>
                <input
                  type="text"
                  placeholder="VD: Sinh viên năm 2 / Đang đi làm"
                  value={yearOfStudy}
                  onChange={e => setYearOfStudy(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Skills & Badminton Experience */}
          <div className="space-y-5">
            <h2 className="font-bold text-gray-900 border-b border-gray-100 pb-2 text-sm flex items-center gap-2 text-orange-650">
              <Award className="w-4 h-4" /> 3. KỸ NĂNG & KINH NGHIỆM CẦU LÔNG
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Kỹ năng bổ trợ (Ghi nhận điểm cộng tuyển dụng)</label>
                <textarea
                  rows={2}
                  placeholder="VD: Có kỹ năng giao tiếp tốt với trẻ nhỏ, biết kỹ thuật sơ cứu chấn thương cơ bản, quản lý hồ sơ..."
                  value={skills}
                  onChange={e => setSkills(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Giới thiệu ngắn về kinh nghiệm chơi cầu lông & bản thân</label>
                <textarea
                  rows={3}
                  placeholder="Mô tả số năm chơi cầu lông, trình độ cá nhân hiện tại, các hoạt động cầu lông bạn hay tham gia và tại sao bạn ứng tuyển..."
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Certifications */}
          <div className="space-y-5">
            <h2 className="font-bold text-gray-900 border-b border-gray-100 pb-2 text-sm flex items-center gap-2 text-orange-650">
              <FileText className="w-4 h-4" /> 4. CHỨNG CHỈ / KHEN THƯỞNG KHÁC (NẾU CÓ)
            </h2>
            
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="VD: Chứng chỉ Sơ cấp cứu Hội Chữ thập đỏ, Giải Ba đơn nam cấp trường..."
                  value={newCert}
                  onChange={e => setNewCert(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-sm"
                />
                <Button
                  type="button"
                  onClick={addCertification}
                  className="bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-semibold px-4"
                >
                  Thêm
                </Button>
              </div>

              {certifications.length > 0 ? (
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-150 rounded-2xl">
                  {certifications.map(cert => (
                    <span
                      key={cert}
                      className="inline-flex items-center gap-1 bg-white border border-gray-200 text-xs font-medium text-gray-700 px-2.5 py-1 rounded-full shadow-sm"
                    >
                      {cert}
                      <button
                        type="button"
                        onClick={() => removeCertification(cert)}
                        className="text-red-500 hover:text-red-700 transition-colors font-bold text-[10px] ml-1"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Chưa thêm chứng chỉ nào.</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-gray-400 italic leading-tight">
              Bằng việc bấm nút "Gửi hồ sơ tuyển dụng", bạn cam kết toàn bộ thông tin cung cấp bên trên là chính xác và hoàn toàn chịu trách nhiệm về nội dung của mình.
            </p>
            <Button
              type="submit"
              disabled={isSubmitting || uploadingImage}
              className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-orange-600/20 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Đang gửi hồ sơ...
                </>
              ) : (
                'Gửi hồ sơ tuyển dụng'
              )}
            </Button>
          </div>
          
        </form>
      </div>
    </div>
  )
}
