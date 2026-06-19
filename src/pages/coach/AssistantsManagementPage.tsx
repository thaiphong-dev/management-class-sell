import { useEffect, useState } from 'react'
import { Users, Trash2, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate } from '@/lib/utils'
import type { Profile } from '@/types'

interface AssistantWithAssignment {
  id: string
  assigned_at: string
  assistant: {
    id: string
    full_name: string
    phone: string | null
  }
}

export default function AssistantsManagementPage() {
  const { profile } = useAuthContext()
  const { toast } = useToast()

  const [assignedAssistants, setAssignedAssistants] = useState<AssistantWithAssignment[]>([])
  const [allAssistants, setAllAssistants] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>('')

  async function loadData() {
    if (!profile) return
    setIsLoading(true)

    // 1. Fetch assigned assistants for this coach
    const { data: assignedData, error: assignedError } = await (supabase.from('coach_assistants') as any)
      .select('id, assigned_at, assistant:profiles!assistant_id(id, full_name, phone)')
      .eq('coach_id', profile.id)

    if (assignedError) {
      console.error('Error fetching assigned assistants:', assignedError.message)
      toast({ title: 'Lỗi tải danh sách trợ giảng', description: assignedError.message, variant: 'destructive' })
      setIsLoading(false)
      return
    }

    // 2. Fetch all assistants in the system to allow adding
    const { data: allData, error: allError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'assistant')

    if (allError) {
      console.error('Error fetching all assistants:', allError.message)
    }

    setAssignedAssistants((assignedData ?? []) as any)
    setAllAssistants((allData ?? []) as Profile[])
    setIsLoading(false)
  }

  useEffect(() => {
    if (profile) {
      loadData()
    }
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAddAssistant() {
    if (!profile || !selectedAssistantId) return
    setSaving(true)

    const { error } = await (supabase.from('coach_assistants') as any)
      .insert({
        coach_id: profile.id,
        assistant_id: selectedAssistantId
      })

    if (error) {
      toast({ title: 'Lỗi thêm trợ giảng', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Đã thêm trợ giảng vào nhóm' })
      setAddDialogOpen(false)
      setSelectedAssistantId('')
      await loadData()
    }
    setSaving(false)
  }

  async function handleRemoveAssistant(assignmentId: string, name: string) {
    if (!confirm(`Bạn có chắc chắn muốn gỡ trợ giảng ${name} khỏi nhóm của mình?`)) return

    const { error } = await (supabase.from('coach_assistants') as any)
      .delete()
      .eq('id', assignmentId)

    if (error) {
      toast({ title: 'Lỗi gỡ trợ giảng', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Đã gỡ trợ giảng thành công' })
      await loadData()
    }
  }

  // Filter out assistants already assigned to this coach
  const assignedIds = new Set(assignedAssistants.map(a => a.assistant?.id).filter(Boolean))
  const availableAssistants = allAssistants.filter(a => !assignedIds.has(a.id))

  const filteredAssigned = assignedAssistants.filter(a =>
    a.assistant?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    (a.assistant?.phone ?? '').includes(search)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Quản lý Trợ giảng</h2>
          <p className="text-sm text-gray-500 mt-0.5">Quản lý đội ngũ trợ giảng dưới quyền của bạn</p>
        </div>
        {profile?.role === 'coach' && (
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white gap-2"
          >
            <UserPlus className="w-4 h-4" /> Thêm trợ giảng
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="relative mb-4">
          <Input
            placeholder="Tìm theo tên hoặc số điện thoại..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="animate-pulse h-14 bg-gray-100 rounded-xl" />)}
          </div>
        ) : filteredAssigned.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Chưa có trợ giảng nào được gán</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredAssigned.map(item => (
              <div key={item.id} className="flex items-center gap-3 py-3 hover:bg-gray-50 rounded-xl transition-colors px-1">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-650 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-semibold">
                    {item.assistant?.full_name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.assistant?.full_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {item.assistant?.phone ?? 'Chưa có SĐT'} · Gán ngày {formatDate(item.assigned_at)}
                  </p>
                </div>
                {profile?.role === 'coach' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleRemoveAssistant(item.id, item.assistant?.full_name)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={addDialogOpen} onOpenChange={open => !open && setAddDialogOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm trợ giảng vào nhóm</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Chọn trợ giảng</Label>
              <Select
                value={selectedAssistantId}
                onValueChange={setSelectedAssistantId}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Chọn trợ giảng hệ thống" />
                </SelectTrigger>
                <SelectContent>
                  {availableAssistants.length === 0 ? (
                    <SelectItem value="none" disabled>Không có trợ giảng khả dụng</SelectItem>
                  ) : (
                    availableAssistants.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.full_name} {a.phone ? `(${a.phone})` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Hủy</Button>
            <Button
              onClick={handleAddAssistant}
              disabled={!selectedAssistantId || selectedAssistantId === 'none' || saving}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              {saving ? 'Đang thêm...' : 'Thêm vào nhóm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
