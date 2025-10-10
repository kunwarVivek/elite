import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient } from '@/lib/api-client'
import type {
  Pitch,
  PitchFormData,
  CreatePitchRequest,
  UpdatePitchRequest,
  PitchListResponse,
  PitchDetailResponse,
  PitchAnalyticsResponse,
  PitchFilters,
  PitchStatus,
  Document,
  Comment
} from '@/types/pitch'

interface PitchState {
  // State
  pitches: Pitch[]
  currentPitch: Pitch | null
  pitchAnalytics: any | null
  isLoading: boolean
  isCreating: boolean
  isUpdating: boolean
  error: string | null
  filters: PitchFilters
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }

  // Actions
  setFilters: (filters: Partial<PitchFilters>) => void
  clearFilters: () => void
  setCurrentPitch: (pitch: Pitch | null) => void

  // API Actions
  fetchPitches: (filters?: PitchFilters) => Promise<void>
  fetchPitch: (id: string) => Promise<void>
  fetchPitchAnalytics: (id: string) => Promise<void>
  createPitch: (data: CreatePitchRequest) => Promise<Pitch>
  updatePitch: (id: string, data: UpdatePitchRequest) => Promise<Pitch>
  deletePitch: (id: string) => Promise<void>
  publishPitch: (id: string) => Promise<void>
  pausePitch: (id: string) => Promise<void>
  uploadPitchDocument: (pitchId: string, file: File, documentType: string) => Promise<Document>
  addComment: (pitchId: string, content: string) => Promise<Comment>

  // Utility Actions
  clearError: () => void
  resetState: () => void
}

const defaultFilters: PitchFilters = {
  page: 1,
  limit: 20,
  sort_by: 'created_at',
  sort_order: 'desc'
}

const defaultPagination = {
  page: 1,
  limit: 20,
  total: 0,
  total_pages: 0
}

export const usePitchStore = create<PitchState>()(
  persist(
    (set, get) => ({
      // Initial State
      pitches: [],
      currentPitch: null,
      pitchAnalytics: null,
      isLoading: false,
      isCreating: false,
      isUpdating: false,
      error: null,
      filters: defaultFilters,
      pagination: defaultPagination,

      // Actions
      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters }
        }))
      },

      clearFilters: () => {
        set({ filters: defaultFilters })
      },

      setCurrentPitch: (pitch) => {
        set({ currentPitch: pitch })
      },

      // API Actions
      fetchPitches: async (filters) => {
        set({ isLoading: true, error: null })

        try {
          const currentFilters = filters || get().filters
          const response = await apiClient.get<PitchListResponse>('/pitches', currentFilters)

          set({
            pitches: response.data.pitches,
            pagination: response.data.pagination,
            isLoading: false
          })
        } catch (error: any) {
          set({
            error: error.message || 'Failed to fetch pitches',
            isLoading: false
          })
          throw error
        }
      },

      fetchPitch: async (id) => {
        set({ isLoading: true, error: null })

        try {
          const response = await apiClient.get<PitchDetailResponse>(`/pitches/${id}`)

          set({
            currentPitch: response.data.pitch,
            isLoading: false
          })
        } catch (error: any) {
          set({
            error: error.message || 'Failed to fetch pitch',
            isLoading: false
          })
          throw error
        }
      },

      fetchPitchAnalytics: async (id) => {
        try {
          const response = await apiClient.get<PitchAnalyticsResponse>(`/pitches/${id}/analytics`)

          set({
            pitchAnalytics: response.data.analytics
          })
        } catch (error: any) {
          set({
            error: error.message || 'Failed to fetch pitch analytics'
          })
          throw error
        }
      },

      createPitch: async (data) => {
        set({ isCreating: true, error: null })

        try {
          const response = await apiClient.post<Pitch>('/pitches', data)

          const newPitch = response.data

          set((state) => ({
            pitches: [newPitch, ...state.pitches],
            isCreating: false
          }))

          return newPitch
        } catch (error: any) {
          set({
            error: error.message || 'Failed to create pitch',
            isCreating: false
          })
          throw error
        }
      },

      updatePitch: async (id, data) => {
        set({ isUpdating: true, error: null })

        try {
          const response = await apiClient.put<Pitch>(`/pitches/${id}`, data)

          const updatedPitch = response.data

          set((state) => ({
            pitches: state.pitches.map(pitch =>
              pitch.id === id ? updatedPitch : pitch
            ),
            currentPitch: state.currentPitch?.id === id ? updatedPitch : state.currentPitch,
            isUpdating: false
          }))

          return updatedPitch
        } catch (error: any) {
          set({
            error: error.message || 'Failed to update pitch',
            isUpdating: false
          })
          throw error
        }
      },

      deletePitch: async (id) => {
        try {
          await apiClient.delete(`/pitches/${id}`)

          set((state) => ({
            pitches: state.pitches.filter(pitch => pitch.id !== id),
            currentPitch: state.currentPitch?.id === id ? null : state.currentPitch
          }))
        } catch (error: any) {
          set({
            error: error.message || 'Failed to delete pitch'
          })
          throw error
        }
      },

      publishPitch: async (id) => {
        try {
          await apiClient.post(`/pitches/${id}/publish`)

          set((state) => ({
            pitches: state.pitches.map(pitch =>
              pitch.id === id ? { ...pitch, status: 'ACTIVE' as PitchStatus } : pitch
            ),
            currentPitch: state.currentPitch?.id === id
              ? { ...state.currentPitch, status: 'ACTIVE' as PitchStatus }
              : state.currentPitch
          }))
        } catch (error: any) {
          set({
            error: error.message || 'Failed to publish pitch'
          })
          throw error
        }
      },

      pausePitch: async (id) => {
        try {
          await apiClient.post(`/pitches/${id}/pause`)

          set((state) => ({
            pitches: state.pitches.map(pitch =>
              pitch.id === id ? { ...pitch, status: 'DRAFT' as PitchStatus } : pitch
            ),
            currentPitch: state.currentPitch?.id === id
              ? { ...state.currentPitch, status: 'DRAFT' as PitchStatus }
              : state.currentPitch
          }))
        } catch (error: any) {
          set({
            error: error.message || 'Failed to pause pitch'
          })
          throw error
        }
      },

      uploadPitchDocument: async (pitchId, file, documentType) => {
        try {
          const response = await apiClient.uploadFile<Document>(
            `/documents/upload`,
            file,
            { pitch_id: pitchId, file_type: documentType }
          )

          return response.data
        } catch (error: any) {
          set({
            error: error.message || 'Failed to upload document'
          })
          throw error
        }
      },

      addComment: async (pitchId, content) => {
        try {
          const response = await apiClient.post<Comment>(`/pitches/${pitchId}/comments`, {
            content
          })

          // Refresh pitch to get updated comments
          await get().fetchPitch(pitchId)

          return response.data
        } catch (error: any) {
          set({
            error: error.message || 'Failed to add comment'
          })
          throw error
        }
      },

      // Utility Actions
      clearError: () => {
        set({ error: null })
      },

      resetState: () => {
        set({
          pitches: [],
          currentPitch: null,
          pitchAnalytics: null,
          isLoading: false,
          isCreating: false,
          isUpdating: false,
          error: null,
          filters: defaultFilters,
          pagination: defaultPagination
        })
      }
    }),
    {
      name: 'pitch-storage',
      partialize: (state) => ({
        filters: state.filters,
        // Don't persist sensitive data like current pitch or loading states
      })
    }
  )
)