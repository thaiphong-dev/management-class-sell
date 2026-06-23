import { useEffect, useState } from 'react'
import { Plus, Users, Shield, Dumbbell, GraduationCap, Pencil, Search, CreditCard } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate, cn } from '@/lib/utils'
import type { Profile, UserRole } from '@/types'

interface UserRow extends Profile {
  email?: string
  coach?: { 
    id: string
    specialty: string | null
    experience_years: number
    status: string
    certifications: string[] | null
    bio: string | null
  } | null
  assistant?: {
    id: string
    school_university: string | null
    major: string | null
    year_of_study: string | null
    skills: string | null
    bio: string | null
    certifications: string[] | null
    status: string
  } | null
  student?: { 
    id: string
    skill_level: string | null
    status: string 
    student_packages?: Array<{
      id: string
      status: string
      expires_at: string | null
      sessions_remaining: number | null
      sessions_total: number | null
      packages: { name: string } | null
    }>
  } | null
}

const ROLE_ICONS: Record<UserRole, React.ElementType> = {
  admin:   Shield,
  coach:   Dumbbell,
  assistant: Users,
  student: GraduationCap,
  parent:  Users,
}
const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin', coach: 'HLV', assistant: 'Trợ giảng', student: 'Học viên', parent: 'Phụ huynh',
}
const SKILL_LABELS: Record<string, string> = {
  beginner: 'Cơ bản', intermediate: 'Trung cấp', advanced: 'Nâng cao',
}

const EMPTY_FORM = {
  email: '', password: '', full_name: '', phone: '',
  role: 'student' as UserRole,
  specialty: '', experience_years: '0', skill_level: 'beginner',
}

export default function UsersPage() {
  const { session, profile } = useAuthContext()
  const { toast } = useToast()
  const navigate = useNavigate()
  const isAdmin = profile?.role === 'admin'
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void | Promise<void>
    confirmText?: string
    cancelText?: string
    isDestructive?: boolean
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  })
  const [users, setUsers] = useState<UserRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('all')

  const [createDialog, setCreateDialog] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [editDialog, setEditDialog] = useState<{ open: boolean; user: UserRow | null }>({ open: false, user: null })
  const [editForm, setEditForm] = useState({ 
    full_name: '', 
    phone: '',
    specialty: '',
    experience_years: '0',
    bio: '',
    certifications: [] as string[],
    school_university: '',
    major: '',
    year_of_study: '',
    skills: ''
  })
  const [newCert, setNewCert] = useState('')

  async function loadUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        coach:coaches(id, specialty, experience_years, status, certifications, bio),
        assistant:assistants(id, school_university, major, year_of_study, skills, bio, certifications, status),
        student:students(
          id, 
          skill_level, 
          status,
          student_packages(
            id,
            status,
            expires_at,
            sessions_remaining,
            sessions_total,
            packages(name)
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to load users:', error.message)
      toast({ title: 'Lỗi tải dữ liệu', description: error.message, variant: 'destructive' })
    } else {
      setUsers((data ?? []) as UserRow[])
    }
    setIsLoading(false)
  }

  useEffect(() => { loadUsers() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function setF(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function createUser() {
    setSaving(true)
    try {
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
          email: form.email.trim(),
          password: form.password,
          full_name: form.full_name.trim(),
          phone: form.phone.trim() || undefined,
          role: form.role,
          specialty: form.specialty.trim() || undefined,
          experience_years: form.role === 'coach' ? parseInt(form.experience_years) || 0 : undefined,
          skill_level: form.role === 'student' ? form.skill_level : undefined,
        }),
      })

      const result = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || !result.success) {
        throw new Error(result.error ?? 'Không thể tạo người dùng')
      }

      toast({ title: 'Đã tạo người dùng mới', description: `${form.full_name} (${ROLE_LABELS[form.role]})` })
      setCreateDialog(false)
      setForm({ ...EMPTY_FORM })
      await loadUsers()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định'
      console.error('Create user error:', msg)
      toast({ title: 'Lỗi tạo người dùng', description: msg, variant: 'destructive' })
    }
    setSaving(false)
  }

  async function saveEdit() {
    if (!editDialog.user) return
    setSaving(true)
    try {
      // 1. Update Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          full_name: editForm.full_name.trim(), 
          phone: editForm.phone.trim() || null 
        } as never)
        .eq('id', editDialog.user.id)

      if (profileError) throw profileError

      // 2. Update Role specific profile
      if (editDialog.user.role === 'coach') {
        const { error: coachError } = await supabase
          .from('coaches')
          .update({
            specialty: editForm.specialty.trim() || null,
            experience_years: parseInt(editForm.experience_years) || 0,
            bio: editForm.bio.trim() || null,
            certifications: editForm.certifications.length > 0 ? editForm.certifications : null
          } as never)
          .eq('user_id', editDialog.user.id)
        if (coachError) throw coachError
      } else if ((editDialog.user.role as string) === 'assistant') {
        const { error: assistantError } = await supabase
          .from('assistants')
          .update({
            school_university: editForm.school_university.trim() || null,
            major: editForm.major.trim() || null,
            year_of_study: editForm.year_of_study.trim() || null,
            skills: editForm.skills.trim() || null,
            bio: editForm.bio.trim() || null,
            certifications: editForm.certifications.length > 0 ? editForm.certifications : null
          } as never)
          .eq('user_id', editDialog.user.id)
        if (assistantError) throw assistantError
      }

      toast({ title: 'Đã cập nhật thông tin thành công' })
      setEditDialog({ open: false, user: null })
      await loadUsers()
    } catch (err: any) {
      toast({ title: 'Lỗi cập nhật', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function toggleUserStatus(user: UserRow) {
    const newStatus = user.status === 'inactive' ? 'active' : 'inactive'
    const confirmTitle = newStatus === 'inactive' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'
    const confirmMessage = newStatus === 'inactive' 
      ? `Bạn có chắc chắn muốn khóa tài khoản của ${user.full_name}? Người dùng này sẽ không thể đăng nhập.`
      : `Bạn có chắc chắn muốn mở khóa tài khoản của ${user.full_name}?`
      
    setConfirmState({
      open: true,
      title: confirmTitle,
      description: confirmMessage,
      isDestructive: newStatus === 'inactive',
      confirmText: newStatus === 'inactive' ? 'Khóa tài khoản' : 'Mở khóa',
      onConfirm: async () => {
        setSaving(true)
        try {
          const { error } = await (supabase as any).rpc('admin_set_user_status', {
            p_user_id: user.id,
            p_status: newStatus
          })
          if (error) throw error
          
          toast({ 
            title: newStatus === 'inactive' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản', 
            description: user.full_name 
          })
          
          if (editDialog.user?.id === user.id) {
            setEditDialog({ open: false, user: null })
          }
          await loadUsers()
        } catch (err: any) {
          toast({ title: 'Lỗi cập nhật trạng thái', description: err.message, variant: 'destructive' })
        } finally {
          setSaving(false)
        }
      }
    })
  }

  async function deleteUser(user: UserRow) {
    const confirmTitle = 'XÓA VĨNH VIỄN tài khoản'
    const confirmMessage = `CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN tài khoản của ${user.full_name}?\n\nHành động này sẽ xóa sạch thông tin tài khoản, các gói học, thông tin thanh toán, điểm danh... và KHÔNG thể khôi phục.`
    
    setConfirmState({
      open: true,
      title: confirmTitle,
      description: confirmMessage,
      isDestructive: true,
      confirmText: 'Xóa tài khoản',
      onConfirm: async () => {
        setSaving(true)
        try {
          const { error } = await (supabase as any).rpc('admin_delete_user', {
            p_user_id: user.id
          })
          if (error) throw error
          
          toast({ title: 'Đã xóa người dùng thành công', description: user.full_name })
          
          if (editDialog.user?.id === user.id) {
            setEditDialog({ open: false, user: null })
          }
          await loadUsers()
        } catch (err: any) {
          toast({ title: 'Lỗi xóa người dùng', description: err.message, variant: 'destructive' })
        } finally {
          setSaving(false)
        }
      }
    })
  }

  function openEdit(user: UserRow) {
    setEditForm({ 
      full_name: user.full_name, 
      phone: user.phone ?? '',
      specialty: user.coach?.specialty ?? '',
      experience_years: user.coach?.experience_years?.toString() ?? '0',
      bio: (user.coach?.bio ?? user.assistant?.bio ?? ''),
      certifications: (user.coach?.certifications ?? user.assistant?.certifications ?? []),
      school_university: user.assistant?.school_university ?? '',
      major: user.assistant?.major ?? '',
      year_of_study: user.assistant?.year_of_study ?? '',
      skills: user.assistant?.skills ?? ''
    })
    setNewCert('')
    setEditDialog({ open: true, user })
  }

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (u.phone ?? '').includes(search)
  )

  function renderTab(role: UserRole | 'all') {
    const list = role === 'all' ? filtered : filtered.filter(u => u.role === role)
    const Icon = role === 'all' ? Users : ROLE_ICONS[role]

    if (isLoading) {
      return (
        <div className="space-y-2 mt-4">
          {[1, 2, 3].map(i => <div key={i} className="animate-pulse h-14 bg-gray-100 rounded-xl" />)}
        </div>
      )
    }
    if (list.length === 0) {
      return (
        <div className="text-center py-12">
          <Icon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">Không có người dùng nào</p>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-3 md:block md:divide-y md:divide-gray-100 mt-1">
        {list.map(user => {
          const RoleIcon = ROLE_ICONS[user.role]
          return (
            <div key={user.id}>
              {/* Desktop & Tablet Row Layout */}
              <div className="hidden md:flex items-center gap-3 py-3 px-1 hover:bg-gray-55 rounded-xl transition-colors">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-sm font-semibold">
                      {user.full_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
                    {user.status === 'inactive' && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-655 border border-red-200 rounded font-medium">
                        Đã khóa
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    <p className="text-xs text-gray-400">
                      {user.phone ?? 'Chưa có SĐT'} · {formatDate(user.created_at)}
                    </p>
                    {user.role === 'student' && (() => {
                      const activePkg = user.student?.student_packages?.find(
                        (sp: any) => sp.status === 'active' || sp.status === 'pending_activation'
                      )
                      if (!activePkg) {
                        return <p className="text-[11px] text-gray-400 italic">Chưa có thẻ học</p>
                      }
                      const pkgName = activePkg.packages?.name ?? 'Gói học'
                      const statusLabel = activePkg.status === 'active' ? 'Đang dùng' : 'Chờ kích hoạt'
                      const sessionsText = activePkg.sessions_remaining !== null 
                        ? ` · Còn ${activePkg.sessions_remaining}/${activePkg.sessions_total} buổi` 
                        : ' · Không giới hạn buổi'
                      const expiryText = activePkg.expires_at 
                        ? ` · Hạn: ${formatDate(activePkg.expires_at)}` 
                        : (activePkg.status === 'pending_activation' ? ' · Chưa kích hoạt' : '')

                      return (
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded font-medium",
                            activePkg.status === 'active' ? "bg-green-50 text-green-600 border border-green-200" : "bg-gray-100 text-gray-500 border border-gray-200"
                          )}>
                            {statusLabel}
                          </span>
                          <span className="text-[11px] font-semibold text-gray-700">
                            {pkgName}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {sessionsText}{expiryText}
                          </span>
                        </div>
                      )
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user.role === 'student' && user.student?.skill_level && (
                    <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                      {SKILL_LABELS[user.student.skill_level] ?? user.student.skill_level}
                    </span>
                  )}
                  {user.role === 'coach' && user.coach?.experience_years !== undefined && (
                    <span className="text-xs px-2 py-0.5 bg-court-50 text-court-700 rounded-full">
                      {user.coach.experience_years} năm KN
                    </span>
                  )}
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${
                    user.role === 'admin'     ? 'bg-purple-100 text-purple-700' :
                    user.role === 'coach'     ? 'bg-court-100 text-court-700' :
                    (user.role as string) === 'assistant' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    <RoleIcon className="w-3 h-3" />
                    {ROLE_LABELS[user.role]}
                  </span>
                  {user.role === 'student' && user.student?.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/packages?tab=cards&assign_student_id=${user.student!.id}`)}
                      className="h-8 text-xs font-medium border-red-100 text-red-655 hover:bg-red-50 hover:border-red-200 gap-1 rounded-xl transition-all"
                    >
                      <CreditCard className="w-3.5 h-3.5" /> Cấp thẻ
                    </Button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => openEdit(user)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile Card Layout */}
              <div className="flex md:hidden flex-col border border-gray-150/70 rounded-2xl p-4 gap-3 bg-white shadow-2xs relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-sm font-semibold">
                          {user.full_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-gray-900 leading-tight">{user.full_name}</h4>
                        {user.status === 'inactive' && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-red-50 text-red-655 border border-red-200 rounded font-medium">
                            Đã khóa
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1 font-medium">
                        {user.phone ?? 'Chưa có SĐT'} · {formatDate(user.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Edit Button */}
                  {isAdmin && (
                    <button
                      onClick={() => openEdit(user)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl border border-gray-100 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Tags & Package Info */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-dashed border-gray-100">
                  {/* Role Tag */}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                    user.role === 'admin'     ? 'bg-purple-100 text-purple-700' :
                    user.role === 'coach'     ? 'bg-court-100 text-court-700' :
                    (user.role as string) === 'assistant' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    <RoleIcon className="w-2.5 h-2.5" />
                    {ROLE_LABELS[user.role]}
                  </span>

                  {/* Specialty / Level Tag */}
                  {user.role === 'student' && user.student?.skill_level && (
                    <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-semibold">
                      {SKILL_LABELS[user.student.skill_level] ?? user.student.skill_level}
                    </span>
                  )}
                  {user.role === 'coach' && user.coach?.experience_years !== undefined && (
                    <span className="text-[10px] px-2 py-0.5 bg-court-50 text-court-700 rounded-full font-semibold">
                      {user.coach.experience_years} năm KN
                    </span>
                  )}
                </div>

                {/* Student Package & Assign card button */}
                {user.role === 'student' && (
                  <div className="flex flex-col gap-2 bg-gray-50/50 border border-gray-150/40 rounded-xl p-2.5 mt-0.5">
                    {(() => {
                      const activePkg = user.student?.student_packages?.find(
                        (sp: any) => sp.status === 'active' || sp.status === 'pending_activation'
                      )
                      if (!activePkg) {
                        return (
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] text-gray-500 italic">Chưa có thẻ học</p>
                            {user.student?.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/admin/packages?tab=cards&assign_student_id=${user.student!.id}`)}
                                className="h-7 text-[10px] font-bold border-red-200 text-red-650 hover:bg-red-50 hover:border-red-300 gap-1 rounded-lg transition-all"
                              >
                                <CreditCard className="w-3 h-3" /> Cấp thẻ
                              </Button>
                            )}
                          </div>
                        )
                      }
                      const pkgName = activePkg.packages?.name ?? 'Gói học'
                      const statusLabel = activePkg.status === 'active' ? 'Đang dùng' : 'Chờ kích hoạt'
                      const sessionsText = activePkg.sessions_remaining !== null 
                        ? `Còn ${activePkg.sessions_remaining}/${activePkg.sessions_total} buổi` 
                        : 'Không giới hạn buổi'
                      const expiryText = activePkg.expires_at 
                        ? `Hạn: ${formatDate(activePkg.expires_at)}` 
                        : (activePkg.status === 'pending_activation' ? 'Chưa kích hoạt' : '')

                      return (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className={cn(
                                "text-[8px] px-1 py-0.5 rounded font-black tracking-wider uppercase",
                                activePkg.status === 'active' ? "bg-green-50 text-green-700 border border-green-200/80" : "bg-gray-100 text-gray-500 border border-gray-250/70"
                              )}>
                                {statusLabel}
                              </span>
                              <span className="text-xs font-bold text-gray-800">
                                {pkgName}
                              </span>
                            </div>
                            {user.student?.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/admin/packages?tab=cards&assign_student_id=${user.student!.id}`)}
                                className="h-7 text-[10px] font-bold border-red-200 text-red-650 hover:bg-red-50 hover:border-red-300 gap-1 rounded-lg transition-all"
                              >
                                <CreditCard className="w-3 h-3" /> Cấp thẻ
                              </Button>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500 font-semibold leading-tight">
                            {sessionsText} {expiryText && ` · ${expiryText}`}
                          </p>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Người dùng</h2>
          <p className="text-sm text-gray-500 mt-0.5">Quản lý tài khoản hệ thống</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setCreateDialog(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white gap-2"
          >
            <Plus className="w-4 h-4" /> Thêm người dùng
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Tìm theo tên hoặc số điện thoại..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Mobile Role Filter Dropdown */}
          <div className="md:hidden mb-4">
            <Label className="text-[10px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Lọc theo vai trò</Label>
            <Select 
              value={activeTab} 
              onValueChange={setActiveTab}
            >
              <SelectTrigger className="w-full h-10 bg-gray-50 border border-gray-250 rounded-xl text-sm font-semibold focus:ring-1 focus:ring-primary-500/20">
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-gray-200">
                <SelectItem value="all" className="font-semibold text-gray-750">Tất cả ({filtered.length})</SelectItem>
                <SelectItem value="admin" className="font-semibold text-gray-750">Admin ({filtered.filter(u => u.role === 'admin').length})</SelectItem>
                <SelectItem value="coach" className="font-semibold text-gray-750">HLV ({filtered.filter(u => u.role === 'coach').length})</SelectItem>
                <SelectItem value="assistant" className="font-semibold text-gray-750">Trợ giảng ({filtered.filter(u => (u.role as string) === 'assistant').length})</SelectItem>
                <SelectItem value="student" className="font-semibold text-gray-750">Học viên ({filtered.filter(u => u.role === 'student').length})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop & Tablet TabsList */}
          <TabsList className="hidden md:grid w-full grid-cols-5 bg-gray-100 p-1 rounded-xl">
            <TabsTrigger value="all">Tất cả ({filtered.length})</TabsTrigger>
            <TabsTrigger value="admin">Admin ({filtered.filter(u => u.role === 'admin').length})</TabsTrigger>
            <TabsTrigger value="coach">HLV ({filtered.filter(u => u.role === 'coach').length})</TabsTrigger>
            <TabsTrigger value="assistant">Trợ giảng ({filtered.filter(u => (u.role as string) === 'assistant').length})</TabsTrigger>
            <TabsTrigger value="student">Học viên ({filtered.filter(u => u.role === 'student').length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all">{renderTab('all')}</TabsContent>
          <TabsContent value="admin">{renderTab('admin')}</TabsContent>
          <TabsContent value="coach">{renderTab('coach')}</TabsContent>
          <TabsContent value="assistant">{renderTab('assistant')}</TabsContent>
          <TabsContent value="student">{renderTab('student')}</TabsContent>
        </Tabs>
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={open => { if (!open) { setCreateDialog(false); setForm({ ...EMPTY_FORM }) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm người dùng mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Họ và tên *</Label>
                <Input className="mt-1" placeholder="Nguyễn Văn A" value={form.full_name} onChange={e => setF('full_name', e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Email *</Label>
                <Input className="mt-1" type="email" placeholder="email@example.com" value={form.email} onChange={e => setF('email', e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Mật khẩu * <span className="text-gray-400 font-normal text-xs">(tối thiểu 6 ký tự)</span></Label>
                <Input className="mt-1" type="password" placeholder="Tối thiểu 6 ký tự" value={form.password} onChange={e => setF('password', e.target.value)} />
              </div>
              <div>
                <Label>Số điện thoại</Label>
                <Input className="mt-1" placeholder="0901 234 567" value={form.phone} onChange={e => setF('phone', e.target.value)} />
              </div>
              <div>
                <Label>Vai trò *</Label>
                <Select value={form.role} onValueChange={v => setF('role', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="coach">Huấn luyện viên</SelectItem>
                    <SelectItem value="assistant">Trợ giảng</SelectItem>
                    <SelectItem value="student">Học viên</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.role === 'coach' && (
                <>
                  <div>
                    <Label>Chuyên môn</Label>
                    <Input className="mt-1" placeholder="Đơn nam, Đôi..." value={form.specialty} onChange={e => setF('specialty', e.target.value)} />
                  </div>
                  <div>
                    <Label>Năm kinh nghiệm</Label>
                    <Input className="mt-1" type="number" min={0} value={form.experience_years} onChange={e => setF('experience_years', e.target.value)} />
                  </div>
                </>
              )}
              {form.role === 'student' && (
                <div className="col-span-2">
                  <Label>Trình độ</Label>
                  <Select value={form.skill_level} onValueChange={v => setF('skill_level', v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Cơ bản</SelectItem>
                      <SelectItem value="intermediate">Trung cấp</SelectItem>
                      <SelectItem value="advanced">Nâng cao</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateDialog(false); setForm({ ...EMPTY_FORM }) }}>Hủy</Button>
            <Button
              onClick={createUser}
              disabled={!form.email || form.password.length < 6 || !form.full_name || saving}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              {saving ? 'Đang tạo...' : 'Tạo tài khoản'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={open => !open && setEditDialog({ open: false, user: null })}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto pr-1">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa thông tin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Avatar display */}
            <div className="flex flex-col items-center justify-center pb-2">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm">
                {editDialog.user?.avatar_url ? (
                  <img src={editDialog.user.avatar_url} alt={editForm.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-xl font-bold">
                    {editForm.full_name.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}
              </div>
            </div>
            <div>
              <Label>Họ và tên *</Label>
              <Input className="mt-1 rounded-xl" value={editForm.full_name} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div>
              <Label>Số điện thoại</Label>
              <Input className="mt-1 rounded-xl" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
            </div>

            {/* Coach fields */}
            {editDialog.user?.role === 'coach' && (
              <>
                <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3">
                  <div>
                    <Label>Chuyên môn</Label>
                    <Input className="mt-1 rounded-xl" placeholder="VD: Đánh đôi, Đơn nam..." value={editForm.specialty} onChange={e => setEditForm(p => ({ ...p, specialty: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Số năm kinh nghiệm</Label>
                    <Input className="mt-1 rounded-xl" type="number" min="0" value={editForm.experience_years} onChange={e => setEditForm(p => ({ ...p, experience_years: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Giới thiệu (Bio)</Label>
                  <textarea
                    rows={3}
                    className="mt-1 w-full px-3 py-2 bg-gray-55 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all text-sm"
                    placeholder="Mô tả ngắn gọn về HLV..."
                    value={editForm.bio}
                    onChange={e => setEditForm(p => ({ ...p, bio: e.target.value }))}
                  />
                </div>
              </>
            )}

            {/* Assistant fields */}
            {(editDialog.user?.role as string) === 'assistant' && (
              <>
                <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3">
                  <div className="col-span-2">
                    <Label>Trường học / Đại học</Label>
                    <Input className="mt-1 rounded-xl" placeholder="VD: Đại học Sư phạm TDTT" value={editForm.school_university} onChange={e => setEditForm(p => ({ ...p, school_university: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Chuyên ngành</Label>
                    <Input className="mt-1 rounded-xl" placeholder="VD: Giáo dục thể chất" value={editForm.major} onChange={e => setEditForm(p => ({ ...p, major: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Năm học</Label>
                    <Input className="mt-1 rounded-xl" placeholder="VD: Sinh viên năm 3" value={editForm.year_of_study} onChange={e => setEditForm(p => ({ ...p, year_of_study: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Kỹ năng trợ giảng</Label>
                  <textarea
                    rows={2}
                    className="mt-1 w-full px-3 py-2 bg-gray-55 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all text-sm"
                    placeholder="Mô tả kỹ năng hỗ trợ lớp học..."
                    value={editForm.skills}
                    onChange={e => setEditForm(p => ({ ...p, skills: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Giới thiệu (Bio)</Label>
                  <textarea
                    rows={2}
                    className="mt-1 w-full px-3 py-2 bg-gray-55 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all text-sm"
                    placeholder="Mô tả ngắn gọn về trợ giảng..."
                    value={editForm.bio}
                    onChange={e => setEditForm(p => ({ ...p, bio: e.target.value }))}
                  />
                </div>
              </>
            )}

            {/* Certifications (Common to both) */}
            {(editDialog.user?.role === 'coach' || (editDialog.user?.role as string) === 'assistant') && (
              <div className="border-t border-gray-100 pt-3">
                <Label>Bằng cấp & Chứng chỉ</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="VD: Chứng chỉ BWF Cấp 1..."
                    value={newCert}
                    onChange={e => setNewCert(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), (() => {
                      if (newCert.trim() && !editForm.certifications.includes(newCert.trim())) {
                        setEditForm(p => ({ ...p, certifications: [...p.certifications, newCert.trim()] }))
                        setNewCert('')
                      }
                    })())}
                    className="rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (newCert.trim() && !editForm.certifications.includes(newCert.trim())) {
                        setEditForm(p => ({ ...p, certifications: [...p.certifications, newCert.trim()] }))
                        setNewCert('')
                      }
                    }}
                    className="rounded-xl"
                  >
                    Thêm
                  </Button>
                </div>
                {editForm.certifications.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-2 p-2 bg-gray-55 rounded-xl border border-gray-200">
                    {editForm.certifications.map(c => (
                      <span key={c} className="inline-flex items-center gap-1 bg-white text-xs text-gray-700 px-2 py-0.5 rounded-lg border border-gray-150 shadow-sm font-medium">
                        {c}
                        <button type="button" onClick={() => setEditForm(p => ({ ...p, certifications: p.certifications.filter(x => x !== c) }))} className="text-red-500 hover:text-red-700 font-bold ml-1">
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 italic mt-1">Chưa có chứng chỉ</p>
                )}
              </div>
            )}

            {/* Danger Zone & Account Status */}
            <div className="border-t border-gray-100 pt-4 space-y-4">
              <div>
                <Label className="text-sm font-semibold text-gray-700">Trạng thái tài khoản</Label>
                <div className="flex items-center justify-between mt-2 bg-gray-50 p-3 rounded-xl border border-gray-150">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-gray-800">
                      {editDialog.user?.status === 'inactive' ? 'Đã vô hiệu hóa (Khóa)' : 'Đang hoạt động'}
                    </span>
                    <span className="text-[11px] text-gray-450">
                      {editDialog.user?.status === 'inactive' 
                        ? 'Tài khoản này đang bị khóa và không thể đăng nhập.' 
                        : 'Tài khoản bình thường và có thể đăng nhập.'}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant={editDialog.user?.status === 'inactive' ? 'outline' : 'destructive'}
                    size="sm"
                    disabled={saving}
                    onClick={() => editDialog.user && toggleUserStatus(editDialog.user)}
                    className={cn(
                      "h-8 text-xs font-bold rounded-lg px-3 transition-colors",
                      editDialog.user?.status === 'inactive' 
                        ? "border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800" 
                        : "bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100 hover:text-orange-800 hover:border-orange-300"
                    )}
                  >
                    {editDialog.user?.status === 'inactive' ? 'Kích hoạt' : 'Vô hiệu hóa'}
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold text-red-650">Hành động nguy hiểm</Label>
                <div className="flex items-center justify-between mt-2 bg-red-50/30 p-3 rounded-xl border border-red-100">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-red-700">Xóa vĩnh viễn tài khoản</span>
                    <span className="text-[11px] text-gray-450 font-normal">
                      Xóa sạch mọi dữ liệu liên quan và không thể phục hồi.
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={saving}
                    onClick={() => editDialog.user && deleteUser(editDialog.user)}
                    className="h-8 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 transition-colors"
                  >
                    Xóa tài khoản
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="border-t border-gray-100 pt-3 flex gap-2">
            <Button variant="outline" onClick={() => setEditDialog({ open: false, user: null })} className="rounded-xl">Hủy</Button>
            <Button
              onClick={saveEdit}
              disabled={!editForm.full_name.trim() || saving}
              className="bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold"
            >
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmState.open} onOpenChange={(open) => setConfirmState(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl p-5 border border-gray-100 shadow-2xl">
          <DialogHeader className="pb-2 border-b border-gray-100">
            <DialogTitle className={cn(
              "text-base font-bold flex items-center gap-2",
              confirmState.isDestructive ? "text-red-650" : "text-gray-800"
            )}>
              {confirmState.title}
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 text-xs text-gray-500 leading-relaxed whitespace-pre-line">
            {confirmState.description}
          </div>
          <DialogFooter className="flex sm:justify-end gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => setConfirmState(prev => ({ ...prev, open: false }))}
              className="rounded-xl border-gray-200 text-xs px-4 h-9"
            >
              {confirmState.cancelText || 'Hủy'}
            </Button>
            <Button
              onClick={async () => {
                await confirmState.onConfirm()
                setConfirmState(prev => ({ ...prev, open: false }))
              }}
              className={cn(
                "rounded-xl text-xs px-4 h-9 text-white font-bold",
                confirmState.isDestructive 
                  ? "bg-red-600 hover:bg-red-700" 
                  : "bg-red-600 hover:bg-red-700"
              )}
            >
              {confirmState.confirmText || 'Xác nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
