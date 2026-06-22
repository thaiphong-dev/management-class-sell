import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileBottomBar } from './MobileBottomBar'
import { useAuthContext } from '@/contexts/AuthContext'

export function AppLayout() {
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const { profile } = useAuthContext()

  // Reset scroll position on route change (fixes mobile sidebar nav UX)
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  // Request browser notification permission for Admin and Coach users
  useEffect(() => {
    if (profile && (profile.role === 'admin' || profile.role === 'coach')) {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            console.log('Notification permission granted.')
          }
        })
      }
    }
  }, [profile])

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
        <Header />
        <main ref={mainRef} className="flex-1 overflow-y-auto p-5 pb-24 lg:pb-5">
          <Outlet />
        </main>
        <MobileBottomBar />
      </div>
    </div>
  )
}
