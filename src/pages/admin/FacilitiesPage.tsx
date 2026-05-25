import { useEffect, useState } from 'react'
import { Plus, Building2, Map, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Facility, Court } from '@/types'

interface FacilityWithCourts extends Facility {
  courts: Court[]
}

interface FacilityFormData {
  id?: string
  name: string
  address: string
  phone: string
  description: string
  status: 'active' | 'inactive'
}

interface CourtFormData {
  id?: string
  name: string
  court_number: string
  status: 'available' | 'maintenance' | 'closed'
}

const EMPTY_FACILITY: FacilityFormData  = { name: '', address: '', phone: '', description: '', status: 'active' }
const EMPTY_COURT: CourtFormData        = { name: '', court_number: '', status: 'available' }

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active:      { label: 'Hoạt động',  className: 'bg-green-100 text-green-700 border-green-200' },
  inactive:    { label: 'Tạm đóng',   className: 'bg-gray-100 text-gray-600 border-gray-200' },
  available:   { label: 'Trống',      className: 'bg-green-100 text-green-700 border-green-200' },
  maintenance: { label: 'Bảo trì',   className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  closed:      { label: 'Đóng',       className: 'bg-red-100 text-red-700 border-red-200' },
}

export default function FacilitiesPage() {
  const { toast } = useToast()
  const [facilities, setFacilities] = useState<FacilityWithCourts[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Dialog states
  const [facilityDialog, setFacilityDialog] = useState<{ open: boolean; data: FacilityFormData }>({
    open: false, data: { ...EMPTY_FACILITY },
  })
  const [courtDialog, setCourtDialog] = useState<{ open: boolean; facilityId: string; data: CourtFormData }>({
    open: false, facilityId: '', data: { ...EMPTY_COURT },
  })
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'facility' | 'court'; id: string } | null>(null)

  async function loadFacilities() {
    const { data, error } = await supabase
      .from('facilities')
      .select('*, courts(*)')
      .order('name')
    if (error) {
      console.error('Failed to load facilities:', error.message)
      toast({ title: 'Lỗi tải dữ liệu', description: error.message, variant: 'destructive' })
    } else {
      // BUG-P2-006: sort courts by court_number then name for consistent ordering
      const result = ((data ?? []) as FacilityWithCourts[]).map(f => ({
        ...f,
        courts: [...f.courts].sort((a, b) =>
          (a.court_number ?? 999) - (b.court_number ?? 999) || a.name.localeCompare(b.name)
        ),
      }))
      setFacilities(result)
      // Auto-expand if only 1 facility
      if (result.length === 1) setExpanded(new Set([result[0].id]))
    }
    setIsLoading(false)
  }

  useEffect(() => { loadFacilities() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function saveFacility() {
    setSaving(true)
    const { id, ...payload } = facilityDialog.data
    const base = {
      name: payload.name.trim(),
      address: payload.address.trim() || null,
      phone: payload.phone.trim() || null,
      description: payload.description.trim() || null,
      status: payload.status,
    }

    // Double cast needed: Supabase v2 TypeScript infers insert/update param as `never` for complex table generics
    const { error } = id
      ? await supabase.from('facilities').update(base as never).eq('id', id)
      : await supabase.from('facilities').insert(base as never)

    if (error) {
      toast({ title: 'Lỗi lưu cơ sở', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: id ? 'Đã cập nhật cơ sở' : 'Đã thêm cơ sở mới' })
      setFacilityDialog({ open: false, data: { ...EMPTY_FACILITY } })
      await loadFacilities()
    }
    setSaving(false)
  }

  async function saveCourt() {
    setSaving(true)
    const { id, facilityId } = { id: courtDialog.data.id, facilityId: courtDialog.facilityId }
    const base = {
      facility_id: facilityId,
      name: courtDialog.data.name.trim(),
      court_number: courtDialog.data.court_number ? parseInt(courtDialog.data.court_number) : null,
      status: courtDialog.data.status,
    }

    const { error } = id
      ? await supabase.from('courts').update(base as never).eq('id', id)
      : await supabase.from('courts').insert(base as never)

    if (error) {
      toast({ title: 'Lỗi lưu sân', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: id ? 'Đã cập nhật sân' : 'Đã thêm sân mới' })
      setCourtDialog({ open: false, facilityId: '', data: { ...EMPTY_COURT } })
      await loadFacilities()
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteConfirm) return
    setSaving(true)
    const { type, id } = deleteConfirm
    const table = type === 'facility' ? 'facilities' : 'courts'
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) {
      toast({ title: 'Lỗi xóa', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: type === 'facility' ? 'Đã xóa cơ sở' : 'Đã xóa sân' })
      await loadFacilities()
    }
    setDeleteConfirm(null)
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Cơ sở & Sân</h2>
          <p className="text-sm text-gray-500 mt-0.5">Quản lý địa điểm và sân tập</p>
        </div>
        <Button
          onClick={() => setFacilityDialog({ open: true, data: { ...EMPTY_FACILITY } })}
          className="bg-primary-600 hover:bg-primary-700 text-white gap-2"
        >
          <Plus className="w-4 h-4" /> Thêm cơ sở
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="animate-pulse h-20 bg-gray-100 rounded-2xl" />)}
        </div>
      ) : facilities.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Chưa có cơ sở nào</p>
          <p className="text-gray-400 text-sm mt-1">Thêm cơ sở đầu tiên để bắt đầu</p>
        </div>
      ) : (
        <div className="space-y-4">
          {facilities.map(facility => (
            <div key={facility.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Facility header */}
              <div className="flex items-center gap-3 px-5 py-4">
                <button
                  onClick={() => toggleExpand(facility.id)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {expanded.has(facility.id)
                    ? <ChevronDown className="w-5 h-5" />
                    : <ChevronRight className="w-5 h-5" />}
                </button>
                <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{facility.name}</p>
                  {facility.address && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Map className="w-3 h-3" /> {facility.address}
                    </p>
                  )}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_BADGE[facility.status]?.className}`}>
                  {STATUS_BADGE[facility.status]?.label}
                </span>
                <span className="text-xs text-gray-400">{facility.courts.length} sân</span>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => setFacilityDialog({
                      open: true,
                      data: { id: facility.id, name: facility.name, address: facility.address ?? '', phone: facility.phone ?? '', description: facility.description ?? '', status: facility.status },
                    })}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ type: 'facility', id: facility.id })}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Courts list */}
              {expanded.has(facility.id) && (
                <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Danh sách sân</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCourtDialog({ open: true, facilityId: facility.id, data: { ...EMPTY_COURT } })}
                      className="h-7 text-xs gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm sân
                    </Button>
                  </div>
                  {facility.courts.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Chưa có sân nào trong cơ sở này</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {facility.courts.map(court => (
                        <div key={court.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{court.name}</p>
                            {court.court_number && (
                              <p className="text-xs text-gray-400">Sân số {court.court_number}</p>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_BADGE[court.status]?.className}`}>
                            {STATUS_BADGE[court.status]?.label}
                          </span>
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => setCourtDialog({
                                open: true, facilityId: facility.id,
                                data: { id: court.id, name: court.name, court_number: court.court_number?.toString() ?? '', status: court.status },
                              })}
                              className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ type: 'court', id: court.id })}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Facility Dialog */}
      <Dialog open={facilityDialog.open} onOpenChange={open => !open && setFacilityDialog({ open: false, data: { ...EMPTY_FACILITY } })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{facilityDialog.data.id ? 'Chỉnh sửa cơ sở' : 'Thêm cơ sở mới'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Tên cơ sở *</Label>
              <Input
                className="mt-1"
                placeholder="Ví dụ: Trung tâm Cầu lông ABC"
                value={facilityDialog.data.name}
                onChange={e => setFacilityDialog(prev => ({ ...prev, data: { ...prev.data, name: e.target.value } }))}
              />
            </div>
            <div>
              <Label>Địa chỉ</Label>
              <Input
                className="mt-1"
                placeholder="123 Đường ABC, Quận 1, TP.HCM"
                value={facilityDialog.data.address}
                onChange={e => setFacilityDialog(prev => ({ ...prev, data: { ...prev.data, address: e.target.value } }))}
              />
            </div>
            <div>
              <Label>Số điện thoại</Label>
              <Input
                className="mt-1"
                placeholder="0901 234 567"
                value={facilityDialog.data.phone}
                onChange={e => setFacilityDialog(prev => ({ ...prev, data: { ...prev.data, phone: e.target.value } }))}
              />
            </div>
            <div>
              <Label>Trạng thái</Label>
              <Select
                value={facilityDialog.data.status}
                onValueChange={v => setFacilityDialog(prev => ({ ...prev, data: { ...prev.data, status: v as 'active' | 'inactive' } }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Hoạt động</SelectItem>
                  <SelectItem value="inactive">Tạm đóng</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFacilityDialog({ open: false, data: { ...EMPTY_FACILITY } })}>Hủy</Button>
            <Button
              onClick={saveFacility}
              disabled={!facilityDialog.data.name.trim() || saving}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              {saving ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Court Dialog */}
      <Dialog open={courtDialog.open} onOpenChange={open => !open && setCourtDialog({ open: false, facilityId: '', data: { ...EMPTY_COURT } })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{courtDialog.data.id ? 'Chỉnh sửa sân' : 'Thêm sân mới'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Tên sân *</Label>
              <Input
                className="mt-1"
                placeholder="Ví dụ: Sân A1"
                value={courtDialog.data.name}
                onChange={e => setCourtDialog(prev => ({ ...prev, data: { ...prev.data, name: e.target.value } }))}
              />
            </div>
            <div>
              <Label>Số thứ tự</Label>
              <Input
                className="mt-1"
                type="number"
                min={1}
                placeholder="1"
                value={courtDialog.data.court_number}
                onChange={e => setCourtDialog(prev => ({ ...prev, data: { ...prev.data, court_number: e.target.value } }))}
              />
            </div>
            <div>
              <Label>Trạng thái</Label>
              <Select
                value={courtDialog.data.status}
                onValueChange={v => setCourtDialog(prev => ({ ...prev, data: { ...prev.data, status: v as Court['status'] } }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Trống</SelectItem>
                  <SelectItem value="maintenance">Bảo trì</SelectItem>
                  <SelectItem value="closed">Đóng</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCourtDialog({ open: false, facilityId: '', data: { ...EMPTY_COURT } })}>Hủy</Button>
            <Button
              onClick={saveCourt}
              disabled={!courtDialog.data.name.trim() || saving}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              {saving ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={open => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.type === 'facility'
                ? 'Bạn có chắc muốn xóa cơ sở này? Hành động không thể hoàn tác và sẽ ảnh hưởng đến tất cả sân thuộc cơ sở.'
                : 'Bạn có chắc muốn xóa sân này? Hành động không thể hoàn tác.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
