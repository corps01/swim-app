import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  getAuthUser,
  signIn as signInRequest,
  signOut as signOutRequest,
  signUp as signUpRequest,
  subscribeToAuthChanges,
  type AuthUser,
} from '../lib/auth'
import { formatAppError } from '../lib/errors'
import { getSupabaseClient } from '../lib/supabase'
import type { UserRole } from '../types/database'

const PROFILE_SETUP_MESSAGE =
  'Password sign-in succeeded in Supabase Auth, but SplashPass could not load your row in Table Editor → profiles (same UUID as Authentication → Users). Run docs/supabase-rls.sql in the SQL editor, or insert that profile row manually, then sign in again.'

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  error: string | null
  signedIn: boolean
  isInstructor: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (fullName: string, email: string, password: string, role: UserRole) => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
  bypassAuth: (role: UserRole) => void
}

const DEV_BYPASS_USERS: Record<UserRole, AuthUser> = {
  parent: {
    id: '00000000-0000-4000-8000-000000000001',
    fullName: 'Test Parent',
    role: 'parent',
  },
  instructor: {
    id: '00000000-0000-4000-8000-000000000002',
    fullName: 'Test Instructor',
    role: 'instructor',
  },
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function loadAuthUser(): Promise<AuthUser | null> {
  return getAuthUser()
}

async function assertSignedInUser(): Promise<AuthUser> {
  const nextUser = await loadAuthUser()
  if (nextUser) return nextUser

  const supabase = getSupabaseClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (authUser) {
    throw new Error(PROFILE_SETUP_MESSAGE)
  }

  throw new Error('Sign-in failed. Check your email and password.')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const bypassUser = useRef<AuthUser | null>(null)

  const refresh = useCallback(async () => {
    if (bypassUser.current) {
      setUser(bypassUser.current)
      setError(null)
      setLoading(false)
      return
    }

    try {
      const nextUser = await loadAuthUser()
      setUser(nextUser)
      setError(null)
    } catch (err) {
      const message = formatAppError(err)
      setError(message)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    return subscribeToAuthChanges(() => {
      void refresh()
    })
  }, [refresh])

  const signIn = useCallback(async (email: string, password: string) => {
    bypassUser.current = null
    setError(null)
    await signInRequest(email, password)
    try {
      const nextUser = await assertSignedInUser()
      setUser(nextUser)
      setError(null)
    } catch (err) {
      const message = formatAppError(err)
      setError(message)
      setUser(null)
      throw err
    }
  }, [])

  const signUp = useCallback(
    async (fullName: string, email: string, password: string, role: UserRole) => {
      bypassUser.current = null
      setError(null)
      await signUpRequest(fullName, email, password, role)
      try {
        const nextUser = await assertSignedInUser()
        setUser(nextUser)
        setError(null)
      } catch (err) {
        const message = formatAppError(err)
        setError(message)
        setUser(null)
        throw err
      }
    },
    [],
  )

  const signOut = useCallback(async () => {
    const wasBypass = Boolean(bypassUser.current)
    bypassUser.current = null
    setError(null)
    setUser(null)
    if (!wasBypass) {
      await signOutRequest()
    }
  }, [])

  const bypassAuth = useCallback((role: UserRole) => {
    if (!import.meta.env.DEV) return
    bypassUser.current = DEV_BYPASS_USERS[role]
    setUser(bypassUser.current)
    setError(null)
    setLoading(false)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      signedIn: Boolean(user),
      isInstructor: user?.role === 'instructor',
      signIn,
      signUp,
      signOut,
      refresh,
      bypassAuth,
    }),
    [user, loading, error, signIn, signUp, signOut, refresh, bypassAuth],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
