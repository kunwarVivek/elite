import { create } from 'zustand'
import { apiClient } from '@/lib/api-client'

interface Investment {
  id: string
  startupId: string
  investorId: string
  amount: number
  equity: number
  status: 'pending' | 'completed' | 'cancelled'
  createdAt: string
  startup?: {
    name: string
    logo?: string
  }
}

interface Portfolio {
  id: string
  investorId: string
  totalInvested: number
  totalValue: number
  investments: Investment[]
  createdAt: string
}

interface InvestmentState {
  investments: Investment[]
  portfolio: Portfolio | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchInvestments: () => Promise<void>
  fetchPortfolio: () => Promise<void>
  createInvestment: (data: CreateInvestmentData) => Promise<Investment>
  updateInvestmentStatus: (id: string, status: Investment['status']) => Promise<void>
  clearError: () => void
}

interface CreateInvestmentData {
  startupId: string
  amount: number
  equity: number
}

export const useInvestmentStore = create<InvestmentState>((set, get) => ({
  investments: [],
  portfolio: null,
  isLoading: false,
  error: null,

  fetchInvestments: async () => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiClient.get<Investment[]>('/investments')
      set({ investments: response.data, isLoading: false })
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch investments',
        isLoading: false,
      })
    }
  },

  fetchPortfolio: async () => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiClient.get<Portfolio>('/portfolio')
      set({ portfolio: response.data, isLoading: false })
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch portfolio',
        isLoading: false,
      })
    }
  },

  createInvestment: async (data: CreateInvestmentData) => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiClient.post<Investment>('/investments', data)
      const newInvestment = response.data

      set((state) => ({
        investments: [...state.investments, newInvestment],
        isLoading: false,
      }))

      // Refresh portfolio after creating investment
      get().fetchPortfolio()

      return newInvestment
    } catch (error: any) {
      set({
        error: error.message || 'Failed to create investment',
        isLoading: false,
      })
      throw error
    }
  },

  updateInvestmentStatus: async (id: string, status: Investment['status']) => {
    set({ error: null })

    try {
      await apiClient.patch(`/investments/${id}`, { status })

      set((state) => ({
        investments: state.investments.map((investment) =>
          investment.id === id ? { ...investment, status } : investment
        ),
      }))

      // Refresh portfolio after status update
      get().fetchPortfolio()
    } catch (error: any) {
      set({
        error: error.message || 'Failed to update investment status',
      })
      throw error
    }
  },

  clearError: () => {
    set({ error: null })
  },
}))