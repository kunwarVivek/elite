import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  Portfolio,
  Investment,
  PortfolioSummary,
  PortfolioSettings,
  InvestmentFilters,
  InvestmentSortOptions,
  PortfolioGoal,
  ExitStrategy
} from '../types/portfolio'

interface PortfolioState {
  // Current selections
  selectedPortfolioId: string | null
  selectedInvestmentId: string | null

  // Filters and sorting
  investmentFilters: InvestmentFilters
  investmentSort: InvestmentSortOptions

  // UI state
  isLoading: boolean
  error: string | null

  // Actions
  setSelectedPortfolio: (portfolioId: string | null) => void
  setSelectedInvestment: (investmentId: string | null) => void
  setInvestmentFilters: (filters: Partial<InvestmentFilters>) => void
  setInvestmentSort: (sort: InvestmentSortOptions) => void
  clearFilters: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

const defaultFilters: InvestmentFilters = {}
const defaultSort: InvestmentSortOptions = {
  field: 'investment_date',
  direction: 'desc'
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      // Initial state
      selectedPortfolioId: null,
      selectedInvestmentId: null,
      investmentFilters: defaultFilters,
      investmentSort: defaultSort,
      isLoading: false,
      error: null,

      // Actions
      setSelectedPortfolio: (portfolioId: string | null) => {
        set({ selectedPortfolioId: portfolioId })
      },

      setSelectedInvestment: (investmentId: string | null) => {
        set({ selectedInvestmentId: investmentId })
      },

      setInvestmentFilters: (filters: Partial<InvestmentFilters>) => {
        set((state) => ({
          investmentFilters: { ...state.investmentFilters, ...filters }
        }))
      },

      setInvestmentSort: (sort: InvestmentSortOptions) => {
        set({ investmentSort: sort })
      },

      clearFilters: () => {
        set({ investmentFilters: defaultFilters })
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      setError: (error: string | null) => {
        set({ error })
      },
    }),
    {
      name: 'portfolio-storage',
      partialize: (state) => ({
        selectedPortfolioId: state.selectedPortfolioId,
        investmentFilters: state.investmentFilters,
        investmentSort: state.investmentSort,
      }),
    }
  )
)

// Portfolio data store for caching frequently accessed data
interface PortfolioDataState {
  portfolios: Portfolio[]
  currentPortfolio: Portfolio | null
  portfolioSummary: PortfolioSummary | null
  investments: Investment[]
  portfolioSettings: PortfolioSettings | null

  // Actions
  setPortfolios: (portfolios: Portfolio[]) => void
  setCurrentPortfolio: (portfolio: Portfolio | null) => void
  setPortfolioSummary: (summary: PortfolioSummary | null) => void
  setInvestments: (investments: Investment[]) => void
  setPortfolioSettings: (settings: PortfolioSettings | null) => void
  updateInvestment: (investmentId: string, updates: Partial<Investment>) => void
  addInvestment: (investment: Investment) => void
  removeInvestment: (investmentId: string) => void
  clearData: () => void
}

export const usePortfolioDataStore = create<PortfolioDataState>((set, get) => ({
  portfolios: [],
  currentPortfolio: null,
  portfolioSummary: null,
  investments: [],
  portfolioSettings: null,

  setPortfolios: (portfolios: Portfolio[]) => {
    set({ portfolios })
  },

  setCurrentPortfolio: (portfolio: Portfolio | null) => {
    set({ currentPortfolio: portfolio })
  },

  setPortfolioSummary: (summary: PortfolioSummary | null) => {
    set({ portfolioSummary: summary })
  },

  setInvestments: (investments: Investment[]) => {
    set({ investments })
  },

  setPortfolioSettings: (settings: PortfolioSettings | null) => {
    set({ portfolioSettings: settings })
  },

  updateInvestment: (investmentId: string, updates: Partial<Investment>) => {
    set((state) => ({
      investments: state.investments.map(investment =>
        investment.id === investmentId
          ? { ...investment, ...updates }
          : investment
      )
    }))
  },

  addInvestment: (investment: Investment) => {
    set((state) => ({
      investments: [investment, ...state.investments]
    }))
  },

  removeInvestment: (investmentId: string) => {
    set((state) => ({
      investments: state.investments.filter(investment => investment.id !== investmentId)
    }))
  },

  clearData: () => {
    set({
      portfolios: [],
      currentPortfolio: null,
      portfolioSummary: null,
      investments: [],
      portfolioSettings: null,
    })
  },
}))