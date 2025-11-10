import { create } from 'zustand'
import { safeApi, SafeAgreement, ConversionCalculation } from '@/lib/safe-api'

interface SafeStore {
  // State
  safes: SafeAgreement[]
  currentSafe: SafeAgreement | null
  conversionCalculation: ConversionCalculation | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchSafesByStartup: (startupId: string) => Promise<void>
  fetchSafesByInvestor: (investorId: string) => Promise<void>
  fetchSafeById: (id: string) => Promise<void>
  createSafe: (data: any) => Promise<SafeAgreement | null>
  updateSafe: (id: string, data: any) => Promise<void>
  convertSafe: (id: string, data: any) => Promise<void>
  calculateConversion: (id: string, data: any) => Promise<void>
  dissolveSafe: (id: string, reason: string) => Promise<void>
  checkConversionTriggers: (startupId: string, roundAmount?: number) => Promise<any>
  clearError: () => void
  reset: () => void
}

export const useSafeStore = create<SafeStore>((set, get) => ({
  // Initial state
  safes: [],
  currentSafe: null,
  conversionCalculation: null,
  isLoading: false,
  error: null,

  // Fetch SAFEs by startup
  fetchSafesByStartup: async (startupId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await safeApi.getByStartup(startupId)
      set({ safes: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch SAFEs', isLoading: false })
    }
  },

  // Fetch SAFEs by investor
  fetchSafesByInvestor: async (investorId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await safeApi.getByInvestor(investorId)
      set({ safes: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch SAFEs', isLoading: false })
    }
  },

  // Fetch SAFE by ID
  fetchSafeById: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await safeApi.getById(id)
      set({ currentSafe: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch SAFE', isLoading: false })
    }
  },

  // Create SAFE
  createSafe: async (data: any) => {
    set({ isLoading: true, error: null })
    try {
      const response = await safeApi.create(data)
      set((state) => ({
        safes: [...state.safes, response.data],
        currentSafe: response.data,
        isLoading: false,
      }))
      return response.data
    } catch (error: any) {
      set({ error: error.message || 'Failed to create SAFE', isLoading: false })
      return null
    }
  },

  // Update SAFE
  updateSafe: async (id: string, data: any) => {
    set({ isLoading: true, error: null })
    try {
      const response = await safeApi.update(id, data)
      set((state) => ({
        safes: state.safes.map((safe) =>
          safe.id === id ? response.data : safe
        ),
        currentSafe: state.currentSafe?.id === id ? response.data : state.currentSafe,
        isLoading: false,
      }))
    } catch (error: any) {
      set({ error: error.message || 'Failed to update SAFE', isLoading: false })
    }
  },

  // Convert SAFE
  convertSafe: async (id: string, data: any) => {
    set({ isLoading: true, error: null })
    try {
      const response = await safeApi.convert(id, data)
      set((state) => ({
        safes: state.safes.map((safe) =>
          safe.id === id ? response.data.safe : safe
        ),
        currentSafe: state.currentSafe?.id === id ? response.data.safe : state.currentSafe,
        isLoading: false,
      }))
    } catch (error: any) {
      set({ error: error.message || 'Failed to convert SAFE', isLoading: false })
    }
  },

  // Calculate conversion
  calculateConversion: async (id: string, data: any) => {
    set({ isLoading: true, error: null })
    try {
      const response = await safeApi.calculateConversion(id, data)
      set({ conversionCalculation: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message || 'Failed to calculate conversion', isLoading: false })
    }
  },

  // Dissolve SAFE
  dissolveSafe: async (id: string, reason: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await safeApi.dissolve(id, reason)
      set((state) => ({
        safes: state.safes.map((safe) =>
          safe.id === id ? response.data : safe
        ),
        currentSafe: state.currentSafe?.id === id ? response.data : state.currentSafe,
        isLoading: false,
      }))
    } catch (error: any) {
      set({ error: error.message || 'Failed to dissolve SAFE', isLoading: false })
    }
  },

  // Check conversion triggers
  checkConversionTriggers: async (startupId: string, roundAmount?: number) => {
    set({ isLoading: true, error: null })
    try {
      const response = await safeApi.checkConversionTriggers(startupId, roundAmount)
      set({ isLoading: false })
      return response.data
    } catch (error: any) {
      set({ error: error.message || 'Failed to check conversion triggers', isLoading: false })
      return []
    }
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Reset store
  reset: () => set({
    safes: [],
    currentSafe: null,
    conversionCalculation: null,
    isLoading: false,
    error: null,
  }),
}))
