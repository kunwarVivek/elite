import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient } from '@/lib/api-client'

interface User {
  id: string
  email: string
  name: string
  role: 'investor' | 'founder' | 'admin'
  avatar?: string
  verified: boolean
  createdAt: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  clearError: () => void
  refreshUser: () => Promise<void>
}

interface RegisterData {
  name: string
  email: string
  password: string
  role: 'investor' | 'founder'
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })

        try {
          const response = await apiClient.post<{ user: User; token: string }>('/auth/login', {
            email,
            password,
          })

          const { user, token } = response.data

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          })

          // Store token in localStorage for API client
          localStorage.setItem('auth_token', token)
        } catch (error: any) {
          set({
            error: error.message || 'Login failed',
            isLoading: false,
          })
          throw error
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null })

        try {
          const response = await apiClient.post<{ user: User; token: string }>('/auth/register', data)

          const { user, token } = response.data

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          })

          // Store token in localStorage for API client
          localStorage.setItem('auth_token', token)
        } catch (error: any) {
          set({
            error: error.message || 'Registration failed',
            isLoading: false,
          })
          throw error
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        })
        localStorage.removeItem('auth_token')
      },

      clearError: () => {
        set({ error: null })
      },

      refreshUser: async () => {
        const { token } = get()
        if (!token) return

        try {
          const response = await apiClient.get<User>('/auth/me')
          set({ user: response.data })
        } catch (error) {
          // If refresh fails, logout user
          get().logout()
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)