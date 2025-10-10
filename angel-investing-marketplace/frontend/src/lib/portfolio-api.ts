import { apiClient } from './api-client'
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
  PortfolioResponse,
  PortfolioSummaryResponse,
  PortfolioPerformanceResponse,
  AssetAllocationResponse,
  RiskMetricsResponse,
  RecentActivityResponse,
  BenchmarkComparisonResponse,
  ExitStrategy,
  PortfolioGoal,
  TaxDocument,
  PortfolioSettings
} from '../types/portfolio'

export class PortfolioAPI {
  // Portfolio Management
  static async getPortfolios(): Promise<PortfolioResponse> {
    return apiClient.get<Portfolio[]>('/v1/portfolios')
  }

  static async getPortfolio(id: string): Promise<PortfolioResponse> {
    return apiClient.get<Portfolio>(`/v1/portfolios/${id}`)
  }

  static async getPortfolioSummary(): Promise<PortfolioSummaryResponse> {
    return apiClient.get<PortfolioSummary>('/v1/portfolios/summary')
  }

  static async getPortfolioPerformance(portfolioId: string, period: string = '1Y'): Promise<PortfolioPerformanceResponse> {
    return apiClient.get<PortfolioPerformance[]>(`/v1/portfolios/${portfolioId}/performance`, { period })
  }

  static async getAssetAllocation(portfolioId: string): Promise<AssetAllocationResponse> {
    return apiClient.get<AssetAllocation[]>(`/v1/portfolios/${portfolioId}/allocation`)
  }

  static async getRiskMetrics(portfolioId: string): Promise<RiskMetricsResponse> {
    return apiClient.get<RiskMetrics>(`/v1/portfolios/${portfolioId}/risk-metrics`)
  }

  static async getRecentActivity(portfolioId: string, page: number = 1, limit: number = 20): Promise<RecentActivityResponse> {
    return apiClient.get<RecentActivity[]>(`/v1/portfolios/${portfolioId}/activity`, { page, limit })
  }

  // Investment Management
  static async getInvestments(filters?: InvestmentFilters, sort?: InvestmentSortOptions, page: number = 1, limit: number = 20): Promise<any> {
    const params = {
      ...filters,
      ...sort,
      page,
      limit
    }
    return apiClient.get<Investment[]>('/v1/investments', params)
  }

  static async getInvestment(id: string): Promise<any> {
    return apiClient.get<Investment>(`/v1/investments/${id}`)
  }

  static async getInvestmentPerformance(id: string): Promise<any> {
    return apiClient.get(`/v1/investments/${id}/performance`)
  }

  static async requestExit(id: string, exitData: Partial<ExitStrategy>): Promise<any> {
    return apiClient.post(`/v1/investments/${id}/exit`, exitData)
  }

  // Analytics & Reporting
  static async getBenchmarkComparison(portfolioId: string, benchmark: string, period: string = '1Y'): Promise<BenchmarkComparisonResponse> {
    return apiClient.get<BenchmarkComparison[]>(`/v1/portfolios/${portfolioId}/benchmarks`, { benchmark, period })
  }

  static async getPortfolioAnalytics(portfolioId: string): Promise<any> {
    return apiClient.get(`/v1/portfolios/${portfolioId}/analytics`)
  }

  static async getTaxDocuments(portfolioId: string, taxYear?: number): Promise<any> {
    const params = taxYear ? { tax_year: taxYear } : {}
    return apiClient.get<TaxDocument[]>(`/v1/portfolios/${portfolioId}/tax-documents`, params)
  }

  static async generateTaxReport(portfolioId: string, taxYear: number, documentType: string): Promise<any> {
    return apiClient.post(`/v1/portfolios/${portfolioId}/tax-reports`, { tax_year: taxYear, document_type: documentType })
  }

  static async exportPortfolioData(portfolioId: string, format: 'pdf' | 'csv' | 'xlsx' = 'pdf'): Promise<any> {
    return apiClient.post(`/v1/portfolios/${portfolioId}/export`, { format })
  }

  // Portfolio Optimization
  static async getRebalancingRecommendations(portfolioId: string): Promise<any> {
    return apiClient.get(`/v1/portfolios/${portfolioId}/rebalancing`)
  }

  static async getDiversificationAnalysis(portfolioId: string): Promise<any> {
    return apiClient.get(`/v1/portfolios/${portfolioId}/diversification`)
  }

  static async getRiskAnalysis(portfolioId: string): Promise<any> {
    return apiClient.get(`/v1/portfolios/${portfolioId}/risk-analysis`)
  }

  // Goals and Settings
  static async getPortfolioGoals(portfolioId: string): Promise<any> {
    return apiClient.get<PortfolioGoal[]>(`/v1/portfolios/${portfolioId}/goals`)
  }

  static async createPortfolioGoal(portfolioId: string, goal: Partial<PortfolioGoal>): Promise<any> {
    return apiClient.post(`/v1/portfolios/${portfolioId}/goals`, goal)
  }

  static async updatePortfolioGoal(portfolioId: string, goalId: string, goal: Partial<PortfolioGoal>): Promise<any> {
    return apiClient.put(`/v1/portfolios/${portfolioId}/goals/${goalId}`, goal)
  }

  static async deletePortfolioGoal(portfolioId: string, goalId: string): Promise<any> {
    return apiClient.delete(`/v1/portfolios/${portfolioId}/goals/${goalId}`)
  }

  static async getPortfolioSettings(): Promise<any> {
    return apiClient.get<PortfolioSettings>('/v1/portfolios/settings')
  }

  static async updatePortfolioSettings(settings: Partial<PortfolioSettings>): Promise<any> {
    return apiClient.put('/v1/portfolios/settings', settings)
  }

  // Alerts and Notifications
  static async getPortfolioAlerts(): Promise<any> {
    return apiClient.get('/v1/portfolios/alerts')
  }

  static async createPortfolioAlert(portfolioId: string, alert: any): Promise<any> {
    return apiClient.post(`/v1/portfolios/${portfolioId}/alerts`, alert)
  }

  static async updateAlert(alertId: string, isRead: boolean): Promise<any> {
    return apiClient.put(`/v1/portfolios/alerts/${alertId}`, { is_read: isRead })
  }

  static async deleteAlert(alertId: string): Promise<any> {
    return apiClient.delete(`/v1/portfolios/alerts/${alertId}`)
  }

  // Document Management
  static async uploadPortfolioDocument(portfolioId: string, file: File, documentType: string): Promise<any> {
    return apiClient.uploadFile(`/v1/portfolios/${portfolioId}/documents`, file, { document_type: documentType })
  }

  static async getPortfolioDocuments(portfolioId: string): Promise<any> {
    return apiClient.get(`/v1/portfolios/${portfolioId}/documents`)
  }

  static async deletePortfolioDocument(portfolioId: string, documentId: string): Promise<any> {
    return apiClient.delete(`/v1/portfolios/${portfolioId}/documents/${documentId}`)
  }
}