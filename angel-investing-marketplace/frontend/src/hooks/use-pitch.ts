import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usePitchStore } from '@/stores/pitch.store'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import type {
  Pitch,
  PitchFilters,
  CreatePitchRequest,
  UpdatePitchRequest,
  PitchStatus
} from '@/types/pitch'

// Query keys for React Query
export const pitchQueryKeys = {
  all: ['pitches'] as const,
  lists: () => [...pitchQueryKeys.all, 'list'] as const,
  list: (filters: PitchFilters) => [...pitchQueryKeys.lists(), filters] as const,
  details: () => [...pitchQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...pitchQueryKeys.details(), id] as const,
  analytics: (id: string) => [...pitchQueryKeys.all, 'analytics', id] as const,
}

// Hook for fetching pitches list
export function usePitches(filters?: PitchFilters) {
  const storeFilters = usePitchStore((state) => state.filters)
  const finalFilters = filters || storeFilters

  return useQuery({
    queryKey: pitchQueryKeys.list(finalFilters),
    queryFn: async () => {
      const response = await apiClient.get('/pitches', finalFilters)
      return response.data
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Hook for fetching single pitch
export function usePitch(id: string) {
  const setCurrentPitch = usePitchStore((state) => state.setCurrentPitch)

  return useQuery({
    queryKey: pitchQueryKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get(`/pitches/${id}`)
      return response.data.pitch
    },
    onSuccess: (pitch) => {
      setCurrentPitch(pitch)
    },
    enabled: !!id,
  })
}

// Hook for fetching pitch analytics
export function usePitchAnalytics(id: string) {
  return useQuery({
    queryKey: pitchQueryKeys.analytics(id),
    queryFn: async () => {
      const response = await apiClient.get(`/pitches/${id}/analytics`)
      return response.data.analytics
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// Hook for creating pitch
export function useCreatePitch() {
  const queryClient = useQueryClient()
  const storeFilters = usePitchStore((state) => state.filters)

  return useMutation({
    mutationFn: async (data: CreatePitchRequest) => {
      const response = await apiClient.post<Pitch>('/pitches', data)
      return response.data
    },
    onSuccess: (newPitch) => {
      // Invalidate and refetch pitches list
      queryClient.invalidateQueries({ queryKey: pitchQueryKeys.lists() })

      // Add the new pitch to the store
      usePitchStore.getState().pitches.unshift(newPitch)

      toast.success('Pitch created successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create pitch')
    },
  })
}

// Hook for updating pitch
export function useUpdatePitch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePitchRequest }) => {
      const response = await apiClient.put<Pitch>(`/pitches/${id}`, data)
      return response.data
    },
    onSuccess: (updatedPitch) => {
      // Update the pitch in the list
      queryClient.invalidateQueries({ queryKey: pitchQueryKeys.lists() })

      // Update the current pitch if it's the same one
      const currentPitch = usePitchStore.getState().currentPitch
      if (currentPitch?.id === updatedPitch.id) {
        usePitchStore.getState().setCurrentPitch(updatedPitch)
      }

      toast.success('Pitch updated successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update pitch')
    },
  })
}

// Hook for deleting pitch
export function useDeletePitch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/pitches/${id}`)
    },
    onSuccess: (_, deletedId) => {
      // Remove pitch from list
      queryClient.invalidateQueries({ queryKey: pitchQueryKeys.lists() })

      // Clear current pitch if it's the deleted one
      const currentPitch = usePitchStore.getState().currentPitch
      if (currentPitch?.id === deletedId) {
        usePitchStore.getState().setCurrentPitch(null)
      }

      toast.success('Pitch deleted successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete pitch')
    },
  })
}

// Hook for publishing pitch
export function usePublishPitch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/pitches/${id}/publish`)
    },
    onSuccess: (_, publishedId) => {
      // Update pitch status in all queries
      queryClient.invalidateQueries({ queryKey: pitchQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: pitchQueryKeys.detail(publishedId) })

      toast.success('Pitch published successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to publish pitch')
    },
  })
}

// Hook for pausing pitch
export function usePausePitch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/pitches/${id}/pause`)
    },
    onSuccess: (_, pausedId) => {
      // Update pitch status in all queries
      queryClient.invalidateQueries({ queryKey: pitchQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: pitchQueryKeys.detail(pausedId) })

      toast.success('Pitch paused successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to pause pitch')
    },
  })
}

// Hook for uploading pitch document
export function useUploadPitchDocument() {
  return useMutation({
    mutationFn: async ({ pitchId, file, documentType }: {
      pitchId: string
      file: File
      documentType: string
    }) => {
      const response = await apiClient.uploadFile(
        '/documents/upload',
        file,
        { pitch_id: pitchId, file_type: documentType }
      )
      return response.data
    },
    onSuccess: (_, { pitchId }) => {
      // Refresh pitch data to include new document
      queryClient.invalidateQueries({ queryKey: pitchQueryKeys.detail(pitchId) })
      toast.success('Document uploaded successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to upload document')
    },
  })
}

// Hook for adding comment to pitch
export function useAddComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ pitchId, content }: { pitchId: string; content: string }) => {
      const response = await apiClient.post(`/pitches/${pitchId}/comments`, { content })
      return response.data
    },
    onSuccess: (_, { pitchId }) => {
      // Refresh pitch data to include new comment
      queryClient.invalidateQueries({ queryKey: pitchQueryKeys.detail(pitchId) })
      toast.success('Comment added successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add comment')
    },
  })
}

// Custom hook that combines store state with React Query
export function usePitchStore() {
  const store = usePitchStore()

  return {
    ...store,
    // Add computed properties
    hasPitches: store.pitches.length > 0,
    activePitches: store.pitches.filter(pitch => pitch.status === 'ACTIVE'),
    draftPitches: store.pitches.filter(pitch => pitch.status === 'DRAFT'),
    fundedPitches: store.pitches.filter(pitch => pitch.status === 'FUNDED'),
  }
}