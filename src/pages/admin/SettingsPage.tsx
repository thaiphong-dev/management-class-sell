import { useEffect, useState } from 'react'
import { Save, Settings, Phone, Mail, Globe, Sparkles, BookOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface LandingSettings {
  id?: string
  hero_title: string
  hero_subtitle: string
  center_intro: string
  contact_phone: string
  contact_email: string
  zalo_url: string
  facebook_url: string
}

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
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data, error } = await supabase
          .from('landing_settings')
          .select('*')
          .limit(1)
          .maybeSingle()

        if (error) {
          console.error('Failed to load landing settings:', error.message)
          toast({ title: 'Lỗi tải cấu hình', description: error.message, variant: 'destructive' })
          return
        }

        if (data) {
          setSettings(data as LandingSettings)
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
        updated_at: new Date().toISOString()
      }

      let res
      if (settings.id) {
        res = await supabase
          .from('landing_settings')
          .update(payload as never)
          .eq('id', settings.id)
          .select('*')
          .single()
      } else {
        res = await supabase
          .from('landing_settings')
          .insert(payload as never)
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
      </div>
    </div>
  )
}
