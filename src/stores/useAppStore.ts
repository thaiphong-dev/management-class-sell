import { create } from 'zustand'

interface AppStore {
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  activeChildId: string | null
  setActiveChildId: (id: string | null) => void
}

export const useAppStore = create<AppStore>((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  activeChildId: localStorage.getItem('tpb_active_child_id'),
  setActiveChildId: (id) => {
    if (id) {
      localStorage.setItem('tpb_active_child_id', id)
    } else {
      localStorage.removeItem('tpb_active_child_id')
    }
    set({ activeChildId: id })
  },
}))
