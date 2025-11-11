import { create } from 'zustand'
import { capTableApi, CapTable, WaterfallAnalysis, DilutionAnalysis } from '@/lib/cap-table-api'

interface CapTableStore {
  capTables: CapTable[]
  currentCapTable: CapTable | null
  waterfallAnalysis: WaterfallAnalysis | null
  dilutionAnalysis: DilutionAnalysis | null
  isLoading: boolean
  error: string | null

  fetchLatest: (startupId: string) => Promise<void>
  fetchHistory: (startupId: string) => Promise<void>
  fetchById: (id: string) => Promise<void>
  create: (data: any) => Promise<CapTable | null>
  addStakeholder: (id: string, data: any) => Promise<void>
  calculateDilution: (startupId: string, data: any) => Promise<void>
  calculateWaterfall: (startupId: string, data: any) => Promise<void>
  exportToCarta: (id: string, format?: 'json' | 'csv') => Promise<any>
  clearError: () => void
  reset: () => void
}

export const useCapTableStore = create<CapTableStore>((set) => ({
  capTables: [],
  currentCapTable: null,
  waterfallAnalysis: null,
  dilutionAnalysis: null,
  isLoading: false,
  error: null,

  fetchLatest: async (startupId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await capTableApi.getLatest(startupId)
      set({ currentCapTable: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  fetchHistory: async (startupId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await capTableApi.getHistory(startupId)
      set({ capTables: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  fetchById: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await capTableApi.getById(id)
      set({ currentCapTable: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  create: async (data: any) => {
    set({ isLoading: true, error: null })
    try {
      const response = await capTableApi.create(data)
      set({ currentCapTable: response.data, isLoading: false })
      return response.data
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      return null
    }
  },

  addStakeholder: async (id: string, data: any) => {
    set({ isLoading: true, error: null })
    try {
      await capTableApi.addStakeholder(id, data)
      // Refetch the cap table to get updated data
      const response = await capTableApi.getById(id)
      set({ currentCapTable: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  calculateDilution: async (startupId: string, data: any) => {
    set({ isLoading: true, error: null })
    try {
      const response = await capTableApi.calculateDilution(startupId, data)
      set({ dilutionAnalysis: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  calculateWaterfall: async (startupId: string, data: any) => {
    set({ isLoading: true, error: null })
    try {
      const response = await capTableApi.calculateWaterfall(startupId, data)
      set({ waterfallAnalysis: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  exportToCarta: async (id: string, format = 'json') => {
    set({ isLoading: true, error: null })
    try {
      const response = await capTableApi.exportToCarta(id, format)
      set({ isLoading: false })
      return response.data
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      return null
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    capTables: [],
    currentCapTable: null,
    waterfallAnalysis: null,
    dilutionAnalysis: null,
    isLoading: false,
    error: null,
  }),
}))
