import { useEffect, useState } from 'react'
import { Save, Settings, Phone, Mail, Globe, Sparkles, BookOpen, CreditCard, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface LandingSettings {
  id?: string
  hero_title: string
  hero_subtitle: string
  center_intro: string
  contact_phone: string
  contact_email: string
  zalo_url: string
  facebook_url: string
  bank_id: string
  bank_account: string
  bank_account_name: string
  bank_bin: string
  bank_branch?: string
}

const SUPPORTED_BANKS = [
  { id: 'MSB', name: 'MSB (Maritime Bank)', bin: '970426' },
  { id: 'MB', name: 'MBBank (Quân Đội)', bin: '970422' },
  { id: 'VCB', name: 'Vietcombank', bin: '970436' },
  { id: 'VietinBank', name: 'VietinBank', bin: '970415' },
  { id: 'Techcombank', name: 'Techcombank', bin: '970407' },
  { id: 'BIDV', name: 'BIDV', bin: '970418' },
  { id: 'ACB', name: 'ACB', bin: '970416' },
  { id: 'Agribank', name: 'Agribank', bin: '970405' },
  { id: 'TPBank', name: 'TPBank', bin: '970423' },
  { id: 'VPBank', name: 'VPBank', bin: '970432' },
  { id: 'Sacombank', name: 'Sacombank', bin: '970403' },
  { id: 'VIB', name: 'VIB', bin: '970441' },
  { id: 'SHB', name: 'SHB', bin: '970443' },
]

export default function AdminSettingsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<LandingSettings>({
    hero_title: '',
    hero_subtitle: '',
    center_intro: '',
    contact_phone: '',
    contact_email: '',
    zalo_url: '',
    facebook_url: '',
    bank_id: 'MSB',
    bank_account: '',
    bank_account_name: '',
    bank_bin: '970426',
    bank_branch: '',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [qrLoading, setQrLoading] = useState(true)

  useEffect(() => {
    setQrLoading(true)
  }, [settings.bank_id, settings.bank_account, settings.bank_bin])

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data, error } = await (supabase
          .from('landing_settings') as any)
          .select('*')
          .limit(1)
          .maybeSingle()

        if (error) {
          console.error('Failed to load landing settings:', error.message)
          toast({ title: 'Lỗi tải cấu hình', description: error.message, variant: 'destructive' })
          return
        }

        if (data) {
          setSettings({
            hero_title: data.hero_title || '',
            hero_subtitle: data.hero_subtitle || '',
            center_intro: data.center_intro || '',
            contact_phone: data.contact_phone || '',
            contact_email: data.contact_email || '',
            zalo_url: data.zalo_url || '',
            facebook_url: data.facebook_url || '',
            bank_id: data.bank_id || 'MSB',
            bank_account: data.bank_account || '',
            bank_account_name: data.bank_account_name || '',
            bank_bin: data.bank_bin || '970426',
            bank_branch: data.bank_branch || '',
            id: data.id
          })
        }
      } catch (err) {
        console.error('Error loading settings:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [toast])

  async function handleSave() {
    setIsSaving(true)
    try {
      const payload = {
        hero_title: settings.hero_title.trim(),
        hero_subtitle: settings.hero_subtitle.trim(),
        center_intro: settings.center_intro.trim(),
        contact_phone: settings.contact_phone.trim(),
        contact_email: settings.contact_email.trim(),
        zalo_url: settings.zalo_url.trim(),
        facebook_url: settings.facebook_url.trim(),
        bank_id: settings.bank_id.trim(),
        bank_account: settings.bank_account.trim(),
        bank_account_name: settings.bank_account_name.trim().toUpperCase(),
        bank_bin: settings.bank_bin.trim(),
        bank_branch: settings.bank_branch?.trim() || null,
        updated_at: new Date().toISOString()
      }

      let res
      if (settings.id) {
        res = await (supabase
          .from('landing_settings') as any)
          .update(payload)
          .eq('id', settings.id)
          .select('*')
          .single()
      } else {
        res = await (supabase
          .from('landing_settings') as any)
          .insert(payload)
          .select('*')
          .single()
      }

      if (res.error) {
        console.error('Failed to save settings:', res.error.message)
        toast({ title: 'Lỗi lưu cấu hình', description: res.error.message, variant: 'destructive' })
      } else {
        setSettings(res.data as LandingSettings)
        toast({ title: 'Thành công', description: 'Cấu hình trang chủ đã được cập nhật thành công.' })
      }
    } catch (err: any) {
      console.error('Error saving settings:', err)
      toast({ title: 'Lỗi lưu cấu hình', description: err.message || 'Lỗi không xác định', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse h-8 w-48 bg-gray-200 rounded-lg" />
        <div className="animate-pulse h-[400px] bg-white rounded-2xl border border-gray-200" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-500" /> Cấu hình trang chủ
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Quản lý nội dung hiển thị trên trang chủ Landing Page</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving || !settings.hero_title || !settings.hero_subtitle}
          className="bg-primary-600 hover:bg-primary-700 text-white gap-2"
        >
          <Save className="w-4 h-4" /> {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Banner Hero */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2 border-b border-gray-100 pb-3">
            <Sparkles className="w-4 h-4 text-amber-500" /> Banner chính (Hero Section)
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="hero_title">Tiêu đề chính *</Label>
              <Input
                id="hero_title"
                className="mt-1"
                placeholder="VD: Học Cầu Lông Cùng Thái Phong Badminton Class"
                value={settings.hero_title}
                onChange={e => setSettings(prev => ({ ...prev, hero_title: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="hero_subtitle">Tiêu đề phụ / Mô tả ngắn *</Label>
              <Input
                id="hero_subtitle"
                className="mt-1"
                placeholder="VD: Chương trình đào tạo chuyên nghiệp từ cơ bản đến nâng cao..."
                value={settings.hero_subtitle}
                onChange={e => setSettings(prev => ({ ...prev, hero_subtitle: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Giới thiệu */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2 border-b border-gray-100 pb-3">
            <BookOpen className="w-4 h-4 text-blue-500" /> Giới thiệu trung tâm
          </h3>
          <div>
            <Label htmlFor="center_intro">Lời giới thiệu chung</Label>
            <Textarea
              id="center_intro"
              className="mt-1 min-h-[120px] resize-y"
              placeholder="Nhập bài viết ngắn giới thiệu về Thái Phong Badminton Class..."
              value={settings.center_intro}
              onChange={e => setSettings(prev => ({ ...prev, center_intro: e.target.value }))}
            />
          </div>
        </div>

        {/* Thông tin liên hệ & Mạng xã hội */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2 border-b border-gray-100 pb-3">
            <Phone className="w-4 h-4 text-green-500" /> Thông tin liên hệ & Mạng xã hội
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_phone" className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-400" /> Số điện thoại Hotline
              </Label>
              <Input
                id="contact_phone"
                className="mt-1"
                placeholder="VD: 0901234567"
                value={settings.contact_phone}
                onChange={e => setSettings(prev => ({ ...prev, contact_phone: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="contact_email" className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-gray-400" /> Email liên hệ
              </Label>
              <Input
                id="contact_email"
                className="mt-1"
                type="email"
                placeholder="VD: contact@thaiphong.dev"
                value={settings.contact_email}
                onChange={e => setSettings(prev => ({ ...prev, contact_email: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="zalo_url" className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-gray-400" /> Link chat Zalo
              </Label>
              <Input
                id="zalo_url"
                className="mt-1"
                placeholder="VD: https://zalo.me/sdt-cua-ban"
                value={settings.zalo_url}
                onChange={e => setSettings(prev => ({ ...prev, zalo_url: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="facebook_url" className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-gray-400" /> Link Facebook Fanpage
              </Label>
              <Input
                id="facebook_url"
                className="mt-1"
                placeholder="VD: https://facebook.com/thaiphongbadminton"
                value={settings.facebook_url}
                onChange={e => setSettings(prev => ({ ...prev, facebook_url: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Thông tin nhận thanh toán */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2 border-b border-gray-100 pb-3">
            <CreditCard className="w-4 h-4 text-primary-500" /> Thông tin nhận thanh toán
          </h3>
          <p className="text-xs text-gray-500 -mt-1">Hiển thị trên trang thanh toán khi học viên đăng ký lớp học</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bank_id">Ngân hàng *</Label>
              <div className="mt-1">
                <Select
                  value={settings.bank_id}
                  onValueChange={val => {
                    const matchedBank = SUPPORTED_BANKS.find(b => b.id === val)
                    setSettings(prev => ({
                      ...prev,
                      bank_id: val,
                      bank_bin: matchedBank ? matchedBank.bin : prev.bank_bin
                    }))
                  }}
                >
                  <SelectTrigger className="w-full bg-white border border-gray-200 rounded-xl text-sm font-semibold h-10 focus:ring-2 focus:ring-primary-500/50">
                    <SelectValue placeholder="-- Chọn ngân hàng --" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_BANKS.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="bank_account">Số tài khoản *</Label>
              <Input
                id="bank_account"
                className="mt-1"
                placeholder="Nhập số tài khoản nhận tiền..."
                value={settings.bank_account}
                onChange={e => setSettings(prev => ({ ...prev, bank_account: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="bank_account_name">Tên chủ tài khoản *</Label>
              <Input
                id="bank_account_name"
                className="mt-1"
                placeholder="VD: TU THAI PHONG (Viết hoa không dấu)"
                value={settings.bank_account_name}
                onChange={e => setSettings(prev => ({ ...prev, bank_account_name: e.target.value.toUpperCase() }))}
              />
            </div>
            <div>
              <Label htmlFor="bank_branch">Chi nhánh</Label>
              <Input
                id="bank_branch"
                className="mt-1"
                placeholder="VD: CN Hà Nội"
                value={settings.bank_branch || ''}
                onChange={e => setSettings(prev => ({ ...prev, bank_branch: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="bank_bin">Mã BIN ngân hàng</Label>
              <Input
                id="bank_bin"
                className="mt-1 bg-gray-50 text-gray-500 cursor-not-allowed"
                placeholder="Tự điền khi chọn ngân hàng"
                value={settings.bank_bin}
                readOnly
              />
            </div>
            
            {/* VietQR Test Preview */}
            <div className="sm:col-span-2 border-t border-gray-150/60 pt-4 flex flex-col items-center justify-center gap-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
              <p className="text-xs font-bold text-gray-700">Xem trước mã QR VietQR thử nghiệm</p>
              {settings.bank_id && settings.bank_account ? (
                <div className="relative w-44 h-44 bg-white border border-gray-200 rounded-xl overflow-hidden flex items-center justify-center p-2 shadow-sm">
                  {qrLoading && (
                    <Loader2 className="w-6 h-6 animate-spin text-red-650 absolute" />
                  )}
                  <img
                    src={`https://img.vietqr.io/image/${settings.bank_bin || settings.bank_id}-${settings.bank_account}-compact2.png?amount=5000&addInfo=TESTQR&accountName=${encodeURIComponent(settings.bank_account_name || '')}`}
                    alt="VietQR Test Preview"
                    className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${qrLoading ? 'opacity-0' : 'opacity-100'}`}
                    onLoad={() => setQrLoading(false)}
                  />
                </div>
              ) : (
                <div className="w-44 h-44 bg-gray-100 border border-dashed border-gray-200 rounded-xl flex items-center justify-center text-center p-4">
                  <p className="text-[11px] text-gray-400">Vui lòng chọn ngân hàng và số tài khoản để hiển thị QR test</p>
                </div>
              )}
              <p className="text-[10px] text-gray-450 text-center max-w-xs leading-relaxed">
                Mã QR hiển thị quét thử chuyển khoản 5,000đ với nội dung "TESTQR". Hãy quét thử bằng ứng dụng ngân hàng để kiểm tra tính chính xác của tài khoản nhận tiền.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
