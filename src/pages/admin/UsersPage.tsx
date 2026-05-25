import { useEffect, useState } from 'react'
import { Plus, Users, Shield, Dumbbell, GraduationCap, Pencil, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate } from '@/lib/utils'
import type { Profile, UserRole } from '@/types'

interface UserRow extends Profile {
  email?: string
  coach?: { id: string; specialty: string | null; experience_years: number; status: string } | null
  student?: { id: string; skill_level: string | null; status: string } | null
}

const ROLE_ICONS: Record<UserRole, React.ElementType> = {
  admin:   Shield,
  coach:   Dumbbell,
  student: GraduationCap,
}
const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin', coach: 'HLV', student: 'Học viên',
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
  const { session } = useAuthContext()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const [createDialog, setCreateDialog] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [editDialog, setEditDialog] = useState<{ open: boolean; user: UserRow | null }>({ open: false, user: null })
  const [editForm, setEditForm] = useState({ full_name: '', phone: '' })

  async function loadUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        coach:coaches(id, specialty, experience_years, status),
        student:students(id, skill_level, status)
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
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editForm.full_name.trim(), phone: editForm.phone.trim() || null } as never)
      .eq('id', editDialog.user.id)

    if (error) {
      toast({ title: 'Lỗi cập nhật', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Đã cập nhật thông tin' })
      setEditDialog({ open: false, user: null })
      await loadUsers()
    }
    setSaving(false)
  }

  function openEdit(user: UserRow) {
    setEditForm({ full_name: user.full_name, phone: user.phone ?? '' })
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
      <div className="divide-y divide-gray-100 mt-1">
        {list.map(user => {
          const RoleIcon = ROLE_ICONS[user.role]
          return (
            <div key={user.id} className="flex items-center gap-3 py-3 px-1 hover:bg-gray-50 rounded-xl transition-colors">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-semibold">
                  {user.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
                <p className="text-xs text-gray-400">
                  {user.phone ?? 'Chưa có SĐT'} · {formatDate(user.created_at)}
                </p>
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
                  user.role === 'admin'   ? 'bg-purple-100 text-purple-700' :
                  user.role === 'coach'   ? 'bg-court-100 text-court-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  <RoleIcon className="w-3 h-3" />
                  {ROLE_LABELS[user.role]}
                </span>
                <button
                  onClick={() => openEdit(user)}
                  className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
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
        <Button
          onClick={() => setCreateDialog(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white gap-2"
        >
          <Plus className="w-4 h-4" /> Thêm người dùng
        </Button>
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

        <Tabs defaultValue="all">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">Tất cả ({filtered.length})</TabsTrigger>
            <TabsTrigger value="admin">Admin ({filtered.filter(u => u.role === 'admin').length})</TabsTrigger>
            <TabsTrigger value="coach">HLV ({filtered.filter(u => u.role === 'coach').length})</TabsTrigger>
            <TabsTrigger value="student">Học viên ({filtered.filter(u => u.role === 'student').length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all">{renderTab('all')}</TabsContent>
          <TabsContent value="admin">{renderTab('admin')}</TabsContent>
          <TabsContent value="coach">{renderTab('coach')}</TabsContent>
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
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa thông tin</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Họ và tên</Label>
              <Input className="mt-1" value={editForm.full_name} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div>
              <Label>Số điện thoại</Label>
              <Input className="mt-1" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, user: null })}>Hủy</Button>
            <Button
              onClick={saveEdit}
              disabled={!editForm.full_name.trim() || saving}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              {saving ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
