import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PortfolioAPI } from '../lib/portfolio-api'
import {
  Portfolio,
  Investment,
  PortfolioSummary,
  PortfolioPerformance,
  AssetAllocation,
  RiskMetrics,
  RecentActivity,
  BenchmarkComparison,
  InvestmentFilters,
  InvestmentSortOptions,
  ExitStrategy,
  PortfolioGoal,
  TaxDocument,
  PortfolioSettings
} from '../types/portfolio'

// Query Keys
export const portfolioKeys = {
  all: ['portfolios'] as const,
  lists: () => [...portfolioKeys.all, 'list'] as const,
  list: (filters: string) => [...portfolioKeys.lists(), { filters }] as const,
  details: () => [...portfolioKeys.all, 'detail'] as const,
  detail: (id: string) => [...portfolioKeys.details(), id] as const,
  summary: () => [...portfolioKeys.all, 'summary'] as const,
  performance: (portfolioId: string) => [...portfolioKeys.all, 'performance', portfolioId] as const,
  allocation: (portfolioId: string) => [...portfolioKeys.all, 'allocation', portfolioId] as const,
  riskMetrics: (portfolioId: string) => [...portfolioKeys.all, 'risk-metrics', portfolioId] as const,
  activity: (portfolioId: string) => [...portfolioKeys.all, 'activity', portfolioId] as const,
  investments: (filters?: InvestmentFilters) => [...portfolioKeys.all, 'investments', filters] as const,
  investment: (id: string) => [...portfolioKeys.all, 'investment', id] as const,
  analytics: (portfolioId: string) => [...portfolioKeys.all, 'analytics', portfolioId] as const,
  benchmarks: (portfolioId: string, benchmark: string) => [...portfolioKeys.all, 'benchmarks', portfolioId, benchmark] as const,
  goals: (portfolioId: string) => [...portfolioKeys.all, 'goals', portfolioId] as const,
  settings: () => [...portfolioKeys.all, 'settings'] as const,
  alerts: () => [...portfolioKeys.all, 'alerts'] as const,
  documents: (portfolioId: string) => [...portfolioKeys.all, 'documents', portfolioId] as const,
}

// Portfolio Hooks
export function usePortfolios() {
  return useQuery({
    queryKey: portfolioKeys.lists(),
    queryFn: () => PortfolioAPI.getPortfolios(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function usePortfolio(id: string) {
  return useQuery({
    queryKey: portfolioKeys.detail(id),
    queryFn: () => PortfolioAPI.getPortfolio(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function usePortfolioSummary() {
  return useQuery({
    queryKey: portfolioKeys.summary(),
    queryFn: () => PortfolioAPI.getPortfolioSummary(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function usePortfolioPerformance(portfolioId: string, period: string = '1Y') {
  return useQuery({
    queryKey: portfolioKeys.performance(portfolioId),
    queryFn: () => PortfolioAPI.getPortfolioPerformance(portfolioId, period),
    enabled: !!portfolioId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  })
}

export function useAssetAllocation(portfolioId: string) {
  return useQuery({
    queryKey: portfolioKeys.allocation(portfolioId),
    queryFn: () => PortfolioAPI.getAssetAllocation(portfolioId),
    enabled: !!portfolioId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  })
}

export function useRiskMetrics(portfolioId: string) {
  return useQuery({
    queryKey: portfolioKeys.riskMetrics(portfolioId),
    queryFn: () => PortfolioAPI.getRiskMetrics(portfolioId),
    enabled: !!portfolioId,
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}

export function useRecentActivity(portfolioId: string, page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: portfolioKeys.activity(portfolioId),
    queryFn: () => PortfolioAPI.getRecentActivity(portfolioId, page, limit),
    enabled: !!portfolioId,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

// Investment Hooks
export function useInvestments(
  filters?: InvestmentFilters,
  sort?: InvestmentSortOptions,
  page: number = 1,
  limit: number = 20
) {
  return useQuery({
    queryKey: portfolioKeys.investments(filters),
    queryFn: () => PortfolioAPI.getInvestments(filters, sort, page, limit),
    keepPreviousData: true,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useInvestment(id: string) {
  return useQuery({
    queryKey: portfolioKeys.investment(id),
    queryFn: () => PortfolioAPI.getInvestment(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useInvestmentPerformance(id: string) {
  return useQuery({
    queryKey: [...portfolioKeys.investment(id), 'performance'],
    queryFn: () => PortfolioAPI.getInvestmentPerformance(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Analytics Hooks
export function useBenchmarkComparison(portfolioId: string, benchmark: string, period: string = '1Y') {
  return useQuery({
    queryKey: portfolioKeys.benchmarks(portfolioId, benchmark),
    queryFn: () => PortfolioAPI.getBenchmarkComparison(portfolioId, benchmark, period),
    enabled: !!portfolioId && !!benchmark,
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}

export function usePortfolioAnalytics(portfolioId: string) {
  return useQuery({
    queryKey: portfolioKeys.analytics(portfolioId),
    queryFn: () => PortfolioAPI.getPortfolioAnalytics(portfolioId),
    enabled: !!portfolioId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  })
}

// Goals Hooks
export function usePortfolioGoals(portfolioId: string) {
  return useQuery({
    queryKey: portfolioKeys.goals(portfolioId),
    queryFn: () => PortfolioAPI.getPortfolioGoals(portfolioId),
    enabled: !!portfolioId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useCreatePortfolioGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ portfolioId, goal }: { portfolioId: string; goal: Partial<PortfolioGoal> }) =>
      PortfolioAPI.createPortfolioGoal(portfolioId, goal),
    onSuccess: (_, { portfolioId }) => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.goals(portfolioId) })
      queryClient.invalidateQueries({ queryKey: portfolioKeys.summary() })
    },
  })
}

export function useUpdatePortfolioGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ portfolioId, goalId, goal }: { portfolioId: string; goalId: string; goal: Partial<PortfolioGoal> }) =>
      PortfolioAPI.updatePortfolioGoal(portfolioId, goalId, goal),
    onSuccess: (_, { portfolioId }) => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.goals(portfolioId) })
    },
  })
}

export function useDeletePortfolioGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ portfolioId, goalId }: { portfolioId: string; goalId: string }) =>
      PortfolioAPI.deletePortfolioGoal(portfolioId, goalId),
    onSuccess: (_, { portfolioId }) => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.goals(portfolioId) })
    },
  })
}

// Settings Hooks
export function usePortfolioSettings() {
  return useQuery({
    queryKey: portfolioKeys.settings(),
    queryFn: () => PortfolioAPI.getPortfolioSettings(),
    staleTime: 30 * 60 * 1000, // 30 minutes
  })
}

export function useUpdatePortfolioSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settings: Partial<PortfolioSettings>) => PortfolioAPI.updatePortfolioSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.settings() })
    },
  })
}

// Exit Strategy Hook
export function useRequestExit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ investmentId, exitData }: { investmentId: string; exitData: Partial<ExitStrategy> }) =>
      PortfolioAPI.requestExit(investmentId, exitData),
    onSuccess: (_, { investmentId }) => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.investment(investmentId) })
      queryClient.invalidateQueries({ queryKey: portfolioKeys.lists() })
      queryClient.invalidateQueries({ queryKey: portfolioKeys.summary() })
    },
  })
}

// Tax Documents Hook
export function useTaxDocuments(portfolioId: string, taxYear?: number) {
  return useQuery({
    queryKey: [...portfolioKeys.documents(portfolioId), 'tax', taxYear],
    queryFn: () => PortfolioAPI.getTaxDocuments(portfolioId, taxYear),
    enabled: !!portfolioId,
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}

export function useGenerateTaxReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ portfolioId, taxYear, documentType }: { portfolioId: string; taxYear: number; documentType: string }) =>
      PortfolioAPI.generateTaxReport(portfolioId, taxYear, documentType),
    onSuccess: (_, { portfolioId }) => {
      queryClient.invalidateQueries({ queryKey: [...portfolioKeys.documents(portfolioId), 'tax'] })
    },
  })
}

// Export Hook
export function useExportPortfolioData() {
  return useMutation({
    mutationFn: ({ portfolioId, format }: { portfolioId: string; format: 'pdf' | 'csv' | 'xlsx' }) =>
      PortfolioAPI.exportPortfolioData(portfolioId, format),
  })
}

// Alerts Hooks
export function usePortfolioAlerts() {
  return useQuery({
    queryKey: portfolioKeys.alerts(),
    queryFn: () => PortfolioAPI.getPortfolioAlerts(),
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

export function useCreatePortfolioAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ portfolioId, alert }: { portfolioId: string; alert: any }) =>
      PortfolioAPI.createPortfolioAlert(portfolioId, alert),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.alerts() })
    },
  })
}

export function useUpdateAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ alertId, isRead }: { alertId: string; isRead: boolean }) =>
      PortfolioAPI.updateAlert(alertId, isRead),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.alerts() })
    },
  })
}

export function useDeleteAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (alertId: string) => PortfolioAPI.deleteAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.alerts() })
    },
  })
}

// Documents Hooks
export function usePortfolioDocuments(portfolioId: string) {
  return useQuery({
    queryKey: portfolioKeys.documents(portfolioId),
    queryFn: () => PortfolioAPI.getPortfolioDocuments(portfolioId),
    enabled: !!portfolioId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useUploadPortfolioDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ portfolioId, file, documentType }: { portfolioId: string; file: File; documentType: string }) =>
      PortfolioAPI.uploadPortfolioDocument(portfolioId, file, documentType),
    onSuccess: (_, { portfolioId }) => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.documents(portfolioId) })
    },
  })
}

export function useDeletePortfolioDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ portfolioId, documentId }: { portfolioId: string; documentId: string }) =>
      PortfolioAPI.deletePortfolioDocument(portfolioId, documentId),
    onSuccess: (_, { portfolioId }) => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.documents(portfolioId) })
    },
  })
}