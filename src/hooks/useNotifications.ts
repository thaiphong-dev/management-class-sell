import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'

export interface Notification {
  id: string
  title: string
  body: string
  type: string
  read_at: string | null
  created_at: string
  metadata: Record<string, unknown> | null
}

interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
}

export function useNotifications(): UseNotificationsReturn {
  const { profile } = useAuthContext()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    if (!profile) return

    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, body, type, read_at, created_at, metadata')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(15)

    if (error) {
      console.error('Failed to fetch notifications:', error.message)
      setIsLoading(false)
      return
    }

    setNotifications((data ?? []) as Notification[])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Realtime subscription
  useEffect(() => {
    if (!profile) return

    const channel = supabase
      .channel(`notifications:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification
          setNotifications(prev => [newNotif, ...prev].slice(0, 15))

          // Trigger native browser/OS desktop notification
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(newNotif.title, {
                body: newNotif.body || '',
                icon: '/pwa-192x192.png',
                tag: newNotif.id,
              })
            } catch (err) {
              console.error('Failed to show native notification:', err)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const updated = payload.new as Notification
          setNotifications(prev =>
            prev.map(n => (n.id === updated.id ? updated : n))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  const markAsRead = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() } as never)
      .eq('id', id)
      .is('read_at', null)

    if (error) {
      console.error('Failed to mark notification as read:', error.message)
      return
    }
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    )
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!profile) return

    const now = new Date().toISOString()
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: now } as never)
      .eq('user_id', profile.id)
      .is('read_at', null)

    if (error) {
      console.error('Failed to mark all notifications as read:', error.message)
      return
    }
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? now })))
  }, [profile])

  const unreadCount = notifications.filter(n => n.read_at === null).length

  return { notifications, unreadCount, isLoading, markAsRead, markAllAsRead }
}
