import { create } from 'zustand'
import { investorRightsApi, InvestorRights, RightsSummary } from '@/lib/investor-rights-api'

interface InvestorRightsStore {
  rights: InvestorRights[]
  currentRights: InvestorRights | null
  rightsSummary: RightsSummary | null
  isLoading: boolean
  error: string | null

  fetchByInvestment: (investmentId: string) => Promise<void>
  fetchByInvestor: (investorId: string) => Promise<void>
  fetchByStartup: (startupId: string) => Promise<void>
  fetchById: (id: string) => Promise<void>
  fetchSummary: (investorId: string) => Promise<void>
  create: (data: any) => Promise<InvestorRights | null>
  update: (id: string, data: any) => Promise<void>
  exerciseProRata: (id: string, data: any) => Promise<void>
  waiveRight: (id: string, rightType: string, reason?: string) => Promise<void>
  checkRight: (id: string, rightType: string) => Promise<boolean>
  clearError: () => void
  reset: () => void
}

export const useInvestorRightsStore = create<InvestorRightsStore>((set) => ({
  rights: [],
  currentRights: null,
  rightsSummary: null,
  isLoading: false,
  error: null,

  fetchByInvestment: async (investmentId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await investorRightsApi.getByInvestment(investmentId)
      set({ currentRights: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  fetchByInvestor: async (investorId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await investorRightsApi.getByInvestor(investorId)
      set({ rights: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  fetchByStartup: async (startupId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await investorRightsApi.getByStartup(startupId)
      set({ rights: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  fetchById: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await investorRightsApi.getById(id)
      set({ currentRights: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  fetchSummary: async (investorId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await investorRightsApi.getSummary(investorId)
      set({ rightsSummary: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  create: async (data: any) => {
    set({ isLoading: true, error: null })
    try {
      const response = await investorRightsApi.create(data)
      set((state) => ({
        rights: [...state.rights, response.data],
        currentRights: response.data,
        isLoading: false,
      }))
      return response.data
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      return null
    }
  },

  update: async (id: string, data: any) => {
    set({ isLoading: true, error: null })
    try {
      const response = await investorRightsApi.update(id, data)
      set((state) => ({
        rights: state.rights.map((r) => (r.id === id ? response.data : r)),
        currentRights: state.currentRights?.id === id ? response.data : state.currentRights,
        isLoading: false,
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  exerciseProRata: async (id: string, data: any) => {
    set({ isLoading: true, error: null })
    try {
      await investorRightsApi.exerciseProRata(id, data)
      // Refetch rights to get updated status
      const response = await investorRightsApi.getById(id)
      set((state) => ({
        rights: state.rights.map((r) => (r.id === id ? response.data : r)),
        currentRights: state.currentRights?.id === id ? response.data : state.currentRights,
        isLoading: false,
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  waiveRight: async (id: string, rightType: string, reason?: string) => {
    set({ isLoading: true, error: null })
    try {
      await investorRightsApi.waiveRight(id, { rightType, reason })
      // Refetch rights to get updated status
      const response = await investorRightsApi.getById(id)
      set((state) => ({
        rights: state.rights.map((r) => (r.id === id ? response.data : r)),
        currentRights: state.currentRights?.id === id ? response.data : state.currentRights,
        isLoading: false,
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  checkRight: async (id: string, rightType: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await investorRightsApi.checkRight(id, rightType)
      set({ isLoading: false })
      return response.data.hasRight
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      return false
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    rights: [],
    currentRights: null,
    rightsSummary: null,
    isLoading: false,
    error: null,
  }),
}))
