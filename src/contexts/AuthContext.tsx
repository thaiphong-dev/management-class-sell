import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import type { Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  profileError: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [profileError, setProfileError] = useState(false)
  const lastFetchedUserId = useRef<string | null>(null)

  const fetchProfile = useCallback(async (userId: string) => {
    setProfileError(false)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Failed to fetch profile:', error.message)
      setProfile(null)
      setProfileError(true)
    } else {
      setProfile(data)
      setProfileError(false)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    let active = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!active) return
      setSession(s)
      if (s) {
        if (lastFetchedUserId.current !== s.user.id) {
          lastFetchedUserId.current = s.user.id
          setIsLoading(true)
          fetchProfile(s.user.id)
        }
      } else {
        lastFetchedUserId.current = null
        setProfile(null)
        setProfileError(false)
        setIsLoading(false)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, profile, isLoading, profileError, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}
