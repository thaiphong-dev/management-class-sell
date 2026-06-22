import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthContext } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Camera, Loader2 } from 'lucide-react'

interface ProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị viên',
  coach: 'Huấn luyện viên',
  assistant: 'Trợ giảng',
  student: 'Học viên',
  parent: 'Phụ huynh',
}

const compressImageToBlob = (file: File, maxWidth = 400, maxHeight = 400, quality = 0.8): Promise<Blob> => {
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

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { profile, session, refreshProfile } = useAuthContext()
  const { toast } = useToast()

  // Form states
  const [phone, setPhone] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Initialize phone when profile or open changes
  useEffect(() => {
    if (profile) {
      setPhone(profile.phone || '')
    }
  }, [profile, open])

  if (!profile) return null

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      // 1. Compress image
      const blob = await compressImageToBlob(file)

      // 2. Upload to Supabase Storage bucket 'image'
      const fileExt = 'jpg'
      const fileName = `avatars/${profile.id}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('image')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (uploadError) throw uploadError

      // 3. Get Public URL
      const { data: urlData } = supabase.storage
        .from('image')
        .getPublicUrl(fileName)

      const publicUrl = urlData.publicUrl

      // 4. Update profiles table
      const { error: updateError } = await (supabase
        .from('profiles') as any)
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)

      if (updateError) throw updateError

      // 5. Refresh profile state
      await refreshProfile()
      toast({
        title: 'Cập nhật ảnh đại diện thành công',
        description: 'Ảnh hồ sơ của bạn đã được cập nhật thành công.',
      })
    } catch (error: any) {
      console.error('Lỗi cập nhật ảnh đại diện:', error)
      toast({
        title: 'Lỗi cập nhật ảnh',
        description: error.message || 'Có lỗi xảy ra khi tải ảnh lên.',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Update phone if changed
      if (phone !== (profile.phone || '')) {
        const { error: updateError } = await (supabase
          .from('profiles') as any)
          .update({ phone: phone.trim() })
          .eq('id', profile.id)

        if (updateError) throw updateError
      }

      // 2. Update password if filled
      if (newPassword) {
        if (newPassword.length < 6) {
          toast({
            title: 'Mật khẩu quá ngắn',
            description: 'Mật khẩu mới phải có tối thiểu 6 ký tự.',
            variant: 'destructive',
          })
          setLoading(false)
          return
        }

        if (newPassword !== confirmPassword) {
          toast({
            title: 'Mật khẩu không khớp',
            description: 'Xác nhận mật khẩu mới không trùng khớp.',
            variant: 'destructive',
          })
          setLoading(false)
          return
        }

        const { error: authError } = await supabase.auth.updateUser({
          password: newPassword,
        })

        if (authError) throw authError
      }

      // 3. Refresh profile state
      await refreshProfile()

      toast({
        title: 'Cập nhật tài khoản thành công',
        description: 'Thông tin hồ sơ và bảo mật của bạn đã được lưu.',
      })

      setNewPassword('')
      setConfirmPassword('')
      onOpenChange(false)
    } catch (error: any) {
      console.error('Lỗi cập nhật tài khoản:', error)
      toast({
        title: 'Lỗi cập nhật tài khoản',
        description: error.message || 'Không thể lưu các thay đổi.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-3xl p-5 border border-gray-100 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-gray-100">
          <DialogTitle className="text-base font-bold text-gray-800">
            Hồ sơ & Bảo mật
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          {/* Avatar block */}
          <div className="flex flex-col items-center gap-2 pb-2">
            <div className="relative group">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover border-2 border-red-500/10 shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-2xl font-black shadow-md select-none">
                  {profile.full_name.charAt(0).toUpperCase()}
                </div>
              )}

              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full cursor-pointer shadow-lg transition-transform duration-200 hover:scale-105 flex items-center justify-center border border-white"
              >
                {uploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={uploading || loading}
                  className="hidden"
                />
              </label>
            </div>
            <span className="text-[10px] text-gray-400">Hỗ trợ JPG, PNG. Nén tự động.</span>
          </div>

          {/* Profile fields */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Họ và tên</Label>
              <div className="text-xs font-semibold text-gray-800 py-2 px-3 bg-gray-50 rounded-xl border border-gray-100 truncate">
                {profile.full_name}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Vai trò</Label>
              <div className="py-1.5 px-3 bg-red-50 text-red-600 rounded-xl border border-red-100 text-xs font-black uppercase tracking-wider text-center">
                {ROLE_LABELS[profile.role] || profile.role}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Email đăng nhập</Label>
            <div className="text-xs font-semibold text-gray-500 py-2 px-3 bg-gray-50/70 rounded-xl border border-gray-100 truncate">
              {session?.user?.email || 'N/A'}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="phone-input" className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Số điện thoại</Label>
            <Input
              id="phone-input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Nhập số điện thoại"
              disabled={loading}
              className="rounded-xl border-gray-200/80 focus:border-red-500 focus:ring-red-500/20 text-xs py-2 h-auto"
            />
          </div>

          {/* Password fields */}
          <div className="pt-2 border-t border-gray-100 space-y-3">
            <Label className="text-[10px] uppercase tracking-wider text-gray-600 font-bold block mb-1">
              Đổi mật khẩu (Để trống nếu không đổi)
            </Label>
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <Label htmlFor="new-password" className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Mật khẩu mới</Label>
                <Input
                  type="password"
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  disabled={loading}
                  className="rounded-xl border-gray-200/80 focus:border-red-500 focus:ring-red-500/20 text-xs py-2 h-auto"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirm-password" className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Xác nhận</Label>
                <Input
                  type="password"
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  disabled={loading}
                  className="rounded-xl border-gray-200/80 focus:border-red-500 focus:ring-red-500/20 text-xs py-2 h-auto"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 h-auto text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 mt-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Lưu thay đổi
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
