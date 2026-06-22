import { useEffect, useState } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import {
  Loader2, Check, X, ShieldAlert, Phone, Mail, User, FileText, Dumbbell, GraduationCap, Calendar, MapPin
} from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import type { CoachAssistantRegistration } from '@/types'

type RegistrationRow = CoachAssistantRegistration

export default function AdminStaffRegistrationsPage() {
  const { session } = useAuthContext()
  const { toast } = useToast()
  
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'coach' | 'assistant'>('all')
  
  // Dialogs
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; record: RegistrationRow | null }>({ open: false, record: null })
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; record: RegistrationRow | null }>({ open: false, record: null })
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; record: RegistrationRow | null }>({ open: false, record: null })
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [tempPassword, setTempPassword] = useState('123456')
  const [rejectReason, setRejectReason] = useState('')

  async function loadRegistrations() {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('coach_assistant_registrations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRegistrations(data as RegistrationRow[])
    } catch (err: any) {
      console.error('Failed to load staff registrations:', err.message)
      toast({ title: 'Lỗi tải đơn ứng tuyển', description: err.message, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadRegistrations() }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
          phone: record.phone,
          role: record.role,
          specialty: record.specialty,
          experience_years: record.experience_years,
          bio: record.bio,
          school_university: record.school_university,
          major: record.major,
          year_of_study: record.year_of_study,
          skills: record.skills,
          certifications: record.certifications
        }),
      })

      const result = await res.json() as { success?: boolean; user_id?: string; error?: string }
      if (!res.ok || !result.success || !result.user_id) {
        throw new Error(result.error ?? 'Lỗi khi gọi chức năng tạo tài khoản nhân sự')
      }

      const authUserId = result.user_id

      // 2. Update profiles details with gender and avatar_url if present
      const profileUpdates: Record<string, any> = {
        gender: record.gender
      }
      if (record.avatar_url) {
        profileUpdates.avatar_url = record.avatar_url
      }
      
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update(profileUpdates as never)
        .eq('id', authUserId)

      if (profileUpdateError) console.error('Profile update error:', profileUpdateError.message)

      // 3. Update staff registration record
      const { error: regUpdateError } = await supabase
        .from('coach_assistant_registrations')
        .update({ status: 'approved' } as never)
        .eq('id', record.id)

      if (regUpdateError) throw regUpdateError

      // 4. Send welcome notification to newly created staff user
      const roleLabel = record.role === 'coach' ? 'Huấn luyện viên' : 'Trợ giảng'
      const { error: notiError } = await supabase
        .from('notifications')
        .insert({
          user_id: authUserId,
          title: `Đơn ứng tuyển ${roleLabel} đã được duyệt!`,
          body: `Chào mừng bạn gia nhập câu lạc bộ Thái Phong Badminton Class. Hãy bắt đầu cập nhật giáo án và lịch dạy của mình.`,
          type: 'general'
        } as never)

      if (notiError) console.error('Notification error:', notiError.message)

      toast({ title: 'Đã phê duyệt ứng tuyển', description: `Đã tạo tài khoản cho ${record.last_name} ${record.first_name} với mật khẩu tạm thời.` })
      setApproveDialog({ open: false, record: null })
      if (detailDialog.record?.id === record.id) {
        setDetailDialog({ open: false, record: null })
      }
      await loadRegistrations()
    } catch (err: any) {
      console.error(err)
      toast({ title: 'Lỗi phê duyệt', description: err.message, variant: 'destructive' })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    const record = rejectDialog.record
    if (!record) return

    setIsProcessing(true)
    try {
      const { error } = await supabase
        .from('coach_assistant_registrations')
        .update({
          status: 'rejected',
          rejection_reason: rejectReason.trim() || null
        } as never)
        .eq('id', record.id)

      if (error) throw error

      toast({ title: 'Đã từ chối đơn đăng ký', description: `Đã chuyển trạng thái đơn ứng tuyển của ${record.last_name} ${record.first_name} thành từ chối.` })
      setRejectDialog({ open: false, record: null })
      setRejectReason('')
      if (detailDialog.record?.id === record.id) {
        setDetailDialog({ open: false, record: null })
      }
      await loadRegistrations()
    } catch (err: any) {
      console.error(err)
      toast({ title: 'Lỗi cập nhật', description: err.message, variant: 'destructive' })
    } finally {
      setIsProcessing(false)
    }
  }

  const filtered = registrations.filter(r => {
    const fullName = `${r.last_name} ${r.first_name}`.toLowerCase()
    const matchesSearch = fullName.includes(search.toLowerCase()) || r.phone.includes(search) || r.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'all' || r.role === roleFilter
    return matchesSearch && matchesRole
  })

  function renderTable(list: RegistrationRow[]) {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          <p className="text-sm text-gray-500 font-medium">Đang tải dữ liệu đơn tuyển dụng...</p>
        </div>
      )
    }

    if (list.length === 0) {
      return (
        <div className="text-center py-20 bg-gray-55 rounded-2xl border border-dashed border-gray-200">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-400 text-sm font-medium">Không có hồ sơ tuyển dụng nào</p>
        </div>
      )
    }

    return (
      <>
        {/* Desktop & Tablet Table Layout */}
        <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mt-1">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead className="w-[80px]">Ảnh</TableHead>
                <TableHead>Họ và tên</TableHead>
                <TableHead>Vị trí</TableHead>
                <TableHead>Thông tin liên hệ</TableHead>
                <TableHead>Ngày đăng ký</TableHead>
                {list[0]?.status !== 'pending' && <TableHead>Chi tiết duyệt</TableHead>}
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map(row => {
                const RoleIcon = row.role === 'coach' ? Dumbbell : GraduationCap
                const roleLabel = row.role === 'coach' ? 'HLV' : 'Trợ giảng'
                
                return (
                  <TableRow key={row.id} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell>
                      <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                        {row.avatar_url ? (
                          <img src={row.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-gray-900">
                      {row.last_name} {row.first_name}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium",
                        row.role === 'coach' ? "bg-court-50 text-court-700" : "bg-orange-50 text-orange-700"
                      )}>
                        <RoleIcon className="w-3.5 h-3.5" />
                        {roleLabel}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs space-y-0.5">
                      <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                        <Phone className="w-3.5 h-3.5 text-gray-400" /> {row.phone}
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <Mail className="w-3.5 h-3.5 text-gray-400" /> {row.email}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500 font-medium">
                      {formatDate(row.created_at)}
                    </TableCell>
                    {row.status !== 'pending' && (
                      <TableCell className="text-xs">
                        {row.status === 'approved' ? (
                          <span className="text-green-600 font-medium">Đã cấp tài khoản</span>
                        ) : (
                          <div className="max-w-[200px]">
                            <span className="text-red-500 font-medium">Bị từ chối</span>
                            {row.rejection_reason && (
                              <p className="text-[10px] text-gray-400 italic truncate mt-0.5" title={row.rejection_reason}>
                                Lý do: {row.rejection_reason}
                              </p>
                            )}
                          </div>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDetailDialog({ open: true, record: row })}
                          className="h-8 text-xs font-semibold rounded-xl"
                        >
                          Chi tiết
                        </Button>
                        {row.status === 'pending' && (
                          <>
                            <button
                              onClick={() => setApproveDialog({ open: true, record: row })}
                              className="p-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors"
                              title="Phê duyệt"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setRejectDialog({ open: true, record: row })}
                              className="p-1.5 bg-red-50 hover:bg-red-150 text-red-500 rounded-lg transition-colors"
                              title="Từ chối"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card Layout */}
        <div className="flex md:hidden flex-col gap-3 mt-2">
          {list.map(row => {
            const RoleIcon = row.role === 'coach' ? Dumbbell : GraduationCap
            const roleLabel = row.role === 'coach' ? 'HLV' : 'Trợ giảng'
            
            return (
              <div key={row.id} className="flex flex-col border border-gray-150/70 rounded-2xl p-4 gap-3 bg-white shadow-2xs relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {row.avatar_url ? (
                        <img src={row.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 leading-tight">{row.last_name} {row.first_name}</h4>
                      <p className="text-[11px] text-gray-500 mt-1 font-medium">
                        Gửi lúc: {formatDate(row.created_at)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Info Block */}
                <div className="bg-gray-50/55 border border-gray-150/40 rounded-xl p-3 space-y-2 mt-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-bold text-[10px] uppercase">VỊ TRÍ</span>
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold",
                      row.role === 'coach' ? "bg-court-50 text-court-700 border border-court-200" : "bg-orange-50 text-orange-700 border border-orange-200"
                    )}>
                      <RoleIcon className="w-3 h-3" />
                      {roleLabel}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-gray-100 pt-2 mt-1">
                    <span className="text-gray-400 font-bold text-[10px] uppercase">ĐIỆN THOẠI</span>
                    <span className="font-medium text-gray-750 flex items-center gap-1"><Phone className="w-3 h-3 text-gray-450" /> {row.phone}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-gray-100 pt-2">
                    <span className="text-gray-400 font-bold text-[10px] uppercase">EMAIL</span>
                    <span className="font-medium text-gray-750 flex items-center gap-1"><Mail className="w-3 h-3 text-gray-450" /> {row.email}</span>
                  </div>
                </div>

                {/* Status/Details if Approved/Rejected */}
                {row.status !== 'pending' && (
                  <div className="flex flex-col gap-1.5 pt-1.5 border-t border-dashed border-gray-100 text-xs">
                    {row.status === 'approved' ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-100 text-green-755 border border-green-200 self-start">Đã cấp tài khoản</span>
                    ) : (
                      <div className="flex flex-col gap-1.5 w-full">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-750 border border-red-200 self-start">Bị từ chối</span>
                        {row.rejection_reason && (
                          <p className="text-[10px] text-gray-400 italic leading-relaxed mt-0.5 bg-red-50/50 p-2.5 rounded-xl border border-red-100">
                            Lý do: {row.rejection_reason}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions Row */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 mt-1">
                  <Button
                    variant="outline"
                    className="h-8 text-xs font-bold px-3 text-gray-600 rounded-xl"
                    onClick={() => setDetailDialog({ open: true, record: row })}
                  >
                    Chi tiết
                  </Button>
                  {row.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 border border-green-100 rounded-xl"
                        onClick={() => setApproveDialog({ open: true, record: row })}
                        title="Phê duyệt"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-100 rounded-xl"
                        onClick={() => setRejectDialog({ open: true, record: row })}
                        title="Từ chối"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </>
    )
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Đơn ứng tuyển HLV & Trợ giảng</h2>
          <p className="text-sm text-gray-500 mt-0.5">Duyệt hồ sơ tuyển dụng và cấp tài khoản công tác</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <Input
          placeholder="Tìm theo họ tên, số điện thoại, email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-md rounded-xl"
        />
        <div className="flex items-center gap-1.5 self-stretch md:self-auto bg-gray-50 border border-gray-150 rounded-xl p-1">
          <button
            onClick={() => setRoleFilter('all')}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
              roleFilter === 'all' ? "bg-white text-gray-950 shadow-sm" : "text-gray-500 hover:text-gray-900"
            )}
          >
            Tất cả
          </button>
          <button
            onClick={() => setRoleFilter('coach')}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
              roleFilter === 'coach' ? "bg-white text-gray-950 shadow-sm" : "text-gray-500 hover:text-gray-900"
            )}
          >
            Huấn luyện viên
          </button>
          <button
            onClick={() => setRoleFilter('assistant')}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
              roleFilter === 'assistant' ? "bg-white text-gray-950 shadow-sm" : "text-gray-500 hover:text-gray-900"
            )}
          >
            Trợ giảng
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="pending">
            Chờ duyệt ({filtered.filter(r => r.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Đã duyệt ({filtered.filter(r => r.status === 'approved').length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Đã từ chối ({filtered.filter(r => r.status === 'rejected').length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending">
          {renderTable(filtered.filter(r => r.status === 'pending'))}
        </TabsContent>
        <TabsContent value="approved">
          {renderTable(filtered.filter(r => r.status === 'approved'))}
        </TabsContent>
        <TabsContent value="rejected">
          {renderTable(filtered.filter(r => r.status === 'rejected'))}
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      <Dialog open={detailDialog.open} onOpenChange={open => !open && setDetailDialog({ open: false, record: null })}>
        <DialogContent className="sm:max-w-2xl rounded-3xl max-h-[85vh] overflow-y-auto pr-1">
          {detailDialog.record && (
            <>
              <DialogHeader className="border-b border-gray-100 pb-4">
                <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary-500" />
                  Hồ sơ ứng tuyển {detailDialog.record.role === 'coach' ? 'Huấn luyện viên' : 'Trợ giảng'}
                </DialogTitle>
                <DialogDescription>
                  Gửi lúc {formatDate(detailDialog.record.created_at)}
                </DialogDescription>
              </DialogHeader>

              {/* Profile Card Summary */}
              <div className="flex flex-col sm:flex-row items-center gap-5 bg-gray-50 border border-gray-200 rounded-2xl p-5 my-2">
                <div className="w-20 h-20 bg-white border border-gray-200 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                  {detailDialog.record.avatar_url ? (
                    <img src={detailDialog.record.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <div className="text-center sm:text-left flex-1 min-w-0">
                  <h3 className="text-base font-bold text-gray-900">{detailDialog.record.last_name} {detailDialog.record.first_name}</h3>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-1.5 text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">Giới tính: {detailDialog.record.gender}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Ngày sinh: {formatDate(detailDialog.record.date_of_birth)}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {detailDialog.record.phone}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {detailDialog.record.email}</span>
                  </div>
                  {detailDialog.record.address && (
                    <div className="flex items-center justify-center sm:justify-start gap-1 text-xs text-gray-400 mt-1">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">{detailDialog.record.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-5 text-sm py-2">
                {/* Role Specific Section */}
                {detailDialog.record.role === 'coach' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-primary-50/20 border border-primary-100 rounded-2xl p-4">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Số năm kinh nghiệm</p>
                      <p className="font-semibold text-gray-900 mt-0.5">{detailDialog.record.experience_years} năm</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lĩnh vực chuyên môn</p>
                      <p className="font-semibold text-gray-900 mt-0.5">{detailDialog.record.specialty ?? 'Chưa cập nhật'}</p>
                    </div>
                    {detailDialog.record.achievements && (
                      <div className="sm:col-span-2 border-t border-primary-100 pt-2.5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Thành tích nổi bật</p>
                        <p className="text-gray-700 mt-1 leading-relaxed whitespace-pre-line">{detailDialog.record.achievements}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-orange-50/20 border border-orange-100 rounded-2xl p-4">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Trường đang học</p>
                      <p className="font-semibold text-gray-900 mt-0.5">{detailDialog.record.school_university ?? 'Chưa cập nhật'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Chuyên ngành</p>
                      <p className="font-semibold text-gray-900 mt-0.5">{detailDialog.record.major ?? 'Chưa cập nhật'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Năm học</p>
                      <p className="font-semibold text-gray-900 mt-0.5">{detailDialog.record.year_of_study ?? 'Chưa cập nhật'}</p>
                    </div>
                    {detailDialog.record.skills && (
                      <div className="sm:col-span-3 border-t border-orange-100 pt-2.5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kỹ năng bổ trợ</p>
                        <p className="text-gray-700 mt-1 leading-relaxed">{detailDialog.record.skills}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Giới thiệu bản thân */}
                {detailDialog.record.bio && (
                  <div>
                    <h4 className="font-bold text-gray-900 text-xs border-l-2 border-primary-500 pl-2 mb-1.5">GIỚI THIỆU BẢN THÂN</h4>
                    <p className="text-gray-650 bg-gray-50 rounded-xl p-3 border border-gray-150 leading-relaxed whitespace-pre-line text-xs">
                      {detailDialog.record.bio}
                    </p>
                  </div>
                )}

                {/* Bằng cấp & Chứng chỉ */}
                {detailDialog.record.certifications && detailDialog.record.certifications.length > 0 && (
                  <div>
                    <h4 className="font-bold text-gray-900 text-xs border-l-2 border-primary-500 pl-2 mb-2">BẰNG CẤP & CHỨNG CHỈ</h4>
                    <div className="flex flex-wrap gap-2">
                      {detailDialog.record.certifications.map(cert => (
                        <span key={cert} className="bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-full border border-gray-200 shadow-sm font-medium">
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Từ chối lý do nếu trạng thái là rejected */}
                {detailDialog.record.status === 'rejected' && detailDialog.record.rejection_reason && (
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3 text-red-900 text-xs font-medium">
                    <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <div>
                      <p className="font-bold">Lý do từ chối hồ sơ ứng tuyển:</p>
                      <p className="mt-1 leading-relaxed text-red-750 font-normal">{detailDialog.record.rejection_reason}</p>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="border-t border-gray-100 pt-4 flex gap-2">
                <Button variant="outline" onClick={() => setDetailDialog({ open: false, record: null })} className="rounded-xl">
                  Đóng
                </Button>
                {detailDialog.record.status === 'pending' && (
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button
                      onClick={() => setRejectDialog({ open: true, record: detailDialog.record })}
                      className="bg-red-50 hover:bg-red-100 text-red-600 font-bold border border-red-200 rounded-xl"
                    >
                      Từ chối ứng tuyển
                    </Button>
                    <Button
                      onClick={() => setApproveDialog({ open: true, record: detailDialog.record })}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl"
                    >
                      Duyệt hồ sơ & Tạo TK
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveDialog.open} onOpenChange={open => !open && setApproveDialog({ open: false, record: null })}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-bold text-gray-900">Phê duyệt tuyển dụng</DialogTitle>
            <DialogDescription>
              Hệ thống sẽ tự động tạo tài khoản đăng nhập trên Supabase Auth và phân vai trò tương ứng trong cơ sở dữ liệu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3 text-sm">
            {approveDialog.record && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-2xl font-medium text-green-900">
                Phê duyệt ứng viên: **{approveDialog.record.last_name} {approveDialog.record.first_name}** làm **{approveDialog.record.role === 'coach' ? 'Huấn luyện viên' : 'Trợ giảng'}**.
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="temp-password">Mật khẩu đăng nhập tạm thời</Label>
              <Input
                id="temp-password"
                type="text"
                value={tempPassword}
                onChange={e => setTempPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="rounded-xl font-mono"
              />
              <p className="text-[10px] text-gray-400">Ứng viên sẽ sử dụng Email ứng tuyển và mật khẩu này để đăng nhập lần đầu.</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDialog({ open: false, record: null })}
              disabled={isProcessing}
              className="rounded-xl"
            >
              Hủy
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isProcessing || tempPassword.length < 6}
              className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Đang duyệt...
                </>
              ) : (
                'Xác nhận duyệt'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={open => !open && setRejectDialog({ open: false, record: null })}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-bold text-gray-900">Từ chối ứng tuyển</DialogTitle>
            <DialogDescription>
              Chuyển hồ sơ sang trạng thái từ chối. Bạn có thể nhập lý do để lưu vết hoặc phản hồi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3 text-sm">
            {rejectDialog.record && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl font-medium text-red-900">
                Từ chối ứng viên: **{rejectDialog.record.last_name} {rejectDialog.record.first_name}** ứng tuyển làm **{rejectDialog.record.role === 'coach' ? 'Huấn luyện viên' : 'Trợ giảng'}**.
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="reject-reason">Lý do từ chối ứng tuyển</Label>
              <textarea
                id="reject-reason"
                rows={3}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Nhập lý do chi tiết (ví dụ: Chưa đủ kinh nghiệm huấn luyện, bằng cấp chưa phù hợp...)"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialog({ open: false, record: null })}
              disabled={isProcessing}
              className="rounded-xl"
            >
              Hủy
            </Button>
            <Button
              onClick={handleReject}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Đang cập nhật...
                </>
              ) : (
                'Xác nhận từ chối'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
