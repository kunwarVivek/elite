import { create } from 'zustand'
import { apiClient } from '@/lib/api-client'

interface UserPreferences {
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
  }
  privacy: {
    showPortfolio: boolean
    showInvestments: boolean
  }
  investment: {
    minAmount: number
    maxAmount: number
    preferredSectors: string[]
  }
}

interface UserProfile {
  id: string
  name: string
  email: string
  avatar?: string
  bio?: string
  location?: string
  website?: string
  linkedin?: string
  twitter?: string
  role: 'investor' | 'founder' | 'admin'
  verified: boolean
  preferences: UserPreferences
  createdAt: string
  updatedAt: string
}

interface UserState {
  profile: UserProfile | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchProfile: () => Promise<void>
  updateProfile: (data: Partial<UserProfile>) => Promise<void>
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>
  uploadAvatar: (file: File) => Promise<string>
  clearError: () => void
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  isLoading: false,
  error: null,

  fetchProfile: async () => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiClient.get<UserProfile>('/user/profile')
      set({ profile: response.data, isLoading: false })
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch profile',
        isLoading: false,
      })
    }
  },

  updateProfile: async (data) => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiClient.put<UserProfile>('/user/profile', data)

      set((state) => ({
        profile: state.profile ? { ...state.profile, ...response.data } : response.data,
        isLoading: false,
      }))
    } catch (error: any) {
      set({
        error: error.message || 'Failed to update profile',
        isLoading: false,
      })
      throw error
    }
  },

  updatePreferences: async (preferences) => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiClient.put<UserProfile>('/user/preferences', preferences)

      set((state) => ({
        profile: state.profile ? {
          ...state.profile,
          preferences: { ...state.profile.preferences, ...response.data.preferences }
        } : null,
        isLoading: false,
      }))
    } catch (error: any) {
      set({
        error: error.message || 'Failed to update preferences',
        isLoading: false,
      })
      throw error
    }
  },

  uploadAvatar: async (file: File) => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiClient.uploadFile<{ url: string }>('/user/avatar', file)

      const avatarUrl = response.data.url

      set((state) => ({
        profile: state.profile ? { ...state.profile, avatar: avatarUrl } : null,
        isLoading: false,
      }))

      return avatarUrl
    } catch (error: any) {
      set({
        error: error.message || 'Failed to upload avatar',
        isLoading: false,
      })
      throw error
    }
  },

  clearError: () => {
    set({ error: null })
  },
}))