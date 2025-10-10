import React, { createContext, useContext, useEffect, ReactNode } from 'react'
import { Session } from 'better-auth'
import { useAuthStore } from '@/stores/auth.store'
import { useUserStore } from '@/stores/user.store'
import { useWebSocketStore } from '@/stores/websocket.store'
import { authHelpers } from '@/lib/auth'

interface AuthContextType {
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  user: any
  login: (email: string, password: string) => Promise<void>
  register: (data: any) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = React.useState<Session | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  const {
    user,
    isAuthenticated,
    login: storeLogin,
    register: storeRegister,
    logout: storeLogout,
  } = useAuthStore()

  const { fetchProfile } = useUserStore()
  const { connect, disconnect } = useWebSocketStore()

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const currentSession = await authHelpers.getSession()
        setSession(currentSession)

        if (currentSession?.user) {
          // Sync with Zustand store
          useAuthStore.setState({
            user: currentSession.user as any,
            token: currentSession.token || null,
            isAuthenticated: true,
          })

          // Fetch user profile
          await fetchProfile()

          // Connect to WebSocket
          connect(currentSession.token)
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [fetchProfile, connect])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const result = await authHelpers.signIn(email, password)

      if (result.data?.user) {
        setSession(result.data)
        await storeLogin(email, password)
        await fetchProfile()
        connect(result.data.token)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (data: any) => {
    setIsLoading(true)
    try {
      const result = await authHelpers.signUp(
        data.email,
        data.password,
        data.name,
        data.role
      )

      if (result.data?.user) {
        setSession(result.data)
        await storeRegister(data)
        await fetchProfile()
        connect(result.data.token)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      await authHelpers.signOut()
      setSession(null)
      storeLogout()
      disconnect()
    } finally {
      setIsLoading(false)
    }
  }

  const refreshSession = async () => {
    try {
      const currentSession = await authHelpers.getSession()
      setSession(currentSession)

      if (currentSession?.user) {
        useAuthStore.setState({
          user: currentSession.user as any,
          token: currentSession.token || null,
          isAuthenticated: true,
        })
        await fetchProfile()
        connect(currentSession.token)
      } else {
        storeLogout()
        disconnect()
      }
    } catch (error) {
      console.error('Failed to refresh session:', error)
      storeLogout()
      disconnect()
    }
  }

  const value: AuthContextType = {
    session,
    isLoading,
    isAuthenticated,
    user,
    login,
    register,
    logout,
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}