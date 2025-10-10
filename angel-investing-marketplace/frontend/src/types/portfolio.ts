// Portfolio Management Types

export interface Portfolio {
  id: string;
  investor_id: string;
  name: string;
  description?: string;
  is_public: boolean;
  total_invested: number;
  total_value: number;
  total_exits: number;
  investment_count: number;
  created_at: string;
  updated_at: string;
}

export interface Investment {
  id: string;
  investor_id: string;
  pitch_id: string;
  amount: number;
  equity_percentage: number;
  share_price?: number;
  status: InvestmentStatus;
  investment_type: InvestmentType;
  syndicate_lead_id?: string;
  terms?: Record<string, any>;
  legal_documents?: Record<string, any>;
  escrow_reference?: string;
  payment_method?: string;
  payment_reference?: string;
  investment_date?: string;
  created_at: string;
  updated_at: string;
  // Populated fields
  pitch?: Pitch;
  startup?: Startup;
  performance?: InvestmentPerformance;
}

export interface InvestmentPerformance {
  current_value: number;
  unrealized_gain_loss: number;
  unrealized_gain_loss_percentage: number;
  realized_gain_loss: number;
  realized_gain_loss_percentage: number;
  total_return: number;
  total_return_percentage: number;
  multiple: number;
  irr?: number;
  last_updated: string;
}

export interface Pitch {
  id: string;
  startup_id: string;
  title: string;
  slug: string;
  summary?: string;
  problem_statement?: string;
  solution?: string;
  market_opportunity?: string;
  competitive_analysis?: string;
  financial_projections?: Record<string, any>;
  funding_amount: number;
  equity_offered?: number;
  minimum_investment: number;
  status: PitchStatus;
  pitch_deck_url?: string;
  video_url?: string;
  tags?: string[];
  view_count: number;
  is_featured: boolean;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Startup {
  id: string;
  name: string;
  slug: string;
  description?: string;
  industry?: string;
  stage: StartupStage;
  funding_goal: number;
  current_funding: number;
  founder_id: string;
  website_url?: string;
  logo_url?: string;
  team_size?: number;
  founded_date?: string;
  business_model?: string;
  target_market?: string;
  competitive_advantage?: string;
  financial_data?: Record<string, any>;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PortfolioSummary {
  total_portfolios: number;
  total_invested: number;
  total_current_value: number;
  total_unrealized_gain_loss: number;
  total_realized_gain_loss: number;
  total_return: number;
  total_return_percentage: number;
  average_irr: number;
  best_performer?: Investment;
  worst_performer?: Investment;
  top_sector?: string;
  diversification_score: number;
}

export interface PortfolioPerformance {
  portfolio_id: string;
  date: string;
  value: number;
  invested_amount: number;
  gain_loss: number;
  gain_loss_percentage: number;
  daily_change: number;
  daily_change_percentage: number;
}

export interface AssetAllocation {
  sector: string;
  amount_invested: number;
  current_value: number;
  percentage: number;
  investment_count: number;
  average_performance: number;
}

export interface GeographicAllocation {
  country: string;
  amount_invested: number;
  current_value: number;
  percentage: number;
  investment_count: number;
}

export interface RiskMetrics {
  portfolio_risk_score: number; // 1-10 scale
  volatility: number; // Standard deviation of returns
  sharpe_ratio: number;
  max_drawdown: number;
  beta: number;
  var_95: number; // Value at Risk 95%
  diversification_ratio: number;
  concentration_risk: number;
}

export interface RecentActivity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  amount?: number;
  investment_id?: string;
  pitch_id?: string;
  startup_id?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface ExitStrategy {
  investment_id: string;
  preferred_exit_type: ExitType;
  target_timeline: number; // months
  target_multiple: number;
  target_irr: number;
  minimum_acceptable_return: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PortfolioGoal {
  id: string;
  portfolio_id: string;
  name: string;
  description?: string;
  target_amount: number;
  target_date: string;
  current_amount: number;
  progress_percentage: number;
  is_achieved: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaxDocument {
  id: string;
  investment_id: string;
  user_id: string;
  tax_year: number;
  document_type: TaxDocumentType;
  file_url: string;
  file_name: string;
  file_size: number;
  generated_at: string;
  expires_at?: string;
}

export interface BenchmarkComparison {
  benchmark_name: string;
  benchmark_type: BenchmarkType;
  current_value: number;
  portfolio_value: number;
  difference: number;
  difference_percentage: number;
  period_return: number;
  portfolio_period_return: number;
  alpha: number;
  beta: number;
  correlation: number;
}

export interface PortfolioAlert {
  id: string;
  user_id: string;
  type: AlertType;
  title: string;
  message: string;
  is_read: boolean;
  action_url?: string;
  priority: AlertPriority;
  expires_at?: string;
  created_at: string;
}

// Enums
export enum InvestmentStatus {
  PENDING = 'PENDING',
  ESCROW = 'ESCROW',
  DUE_DILIGENCE = 'DUE_DILIGENCE',
  LEGAL_REVIEW = 'LEGAL_REVIEW',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum InvestmentType {
  DIRECT = 'DIRECT',
  SYNDICATE = 'SYNDICATE'
}

export enum PitchStatus {
  DRAFT = 'DRAFT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ACTIVE = 'ACTIVE',
  FUNDED = 'FUNDED',
  CLOSED = 'CLOSED',
  WITHDRAWN = 'WITHDRAWN'
}

export enum StartupStage {
  IDEA = 'IDEA',
  PROTOTYPE = 'PROTOTYPE',
  MVP = 'MVP',
  GROWTH = 'GROWTH',
  SCALE = 'SCALE'
}

export enum ActivityType {
  INVESTMENT_MADE = 'INVESTMENT_MADE',
  INVESTMENT_UPDATED = 'INVESTMENT_UPDATED',
  EXIT_COMPLETED = 'EXIT_COMPLETED',
  VALUATION_UPDATE = 'VALUATION_UPDATE',
  COMPANY_UPDATE = 'COMPANY_UPDATE',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED'
}

export enum ExitType {
  IPO = 'IPO',
  ACQUISITION = 'ACQUISITION',
  SECONDARY_SALE = 'SECONDARY_SALE',
  BUYBACK = 'BUYBACK',
  LIQUIDATION = 'LIQUIDATION'
}

export enum TaxDocumentType {
  SCHEDULE_K1 = 'SCHEDULE_K1',
  FORM_1099 = 'FORM_1099',
  CAPITAL_GAINS_LOSSES = 'CAPITAL_GAINS_LOSSES',
  ANNUAL_SUMMARY = 'ANNUAL_SUMMARY'
}

export enum BenchmarkType {
  S_P_500 = 'S_P_500',
  NASDAQ = 'NASDAQ',
  DOW_JONES = 'DOW_JONES',
  RUSSELL_2000 = 'RUSSELL_2000',
  VC_INDEX = 'VC_INDEX',
  ANGEL_INDEX = 'ANGEL_INDEX'
}

export enum AlertType {
  PRICE_CHANGE = 'PRICE_CHANGE',
  VALUATION_UPDATE = 'VALUATION_UPDATE',
  COMPANY_NEWS = 'COMPANY_NEWS',
  EXIT_OPPORTUNITY = 'EXIT_OPPORTUNITY',
  PORTFOLIO_MILESTONE = 'PORTFOLIO_MILESTONE',
  SYSTEM_NOTIFICATION = 'SYSTEM_NOTIFICATION'
}

export enum AlertPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

// API Response Types
export interface PortfolioResponse {
  success: boolean;
  data: Portfolio | Portfolio[];
  message?: string;
  errors?: any[];
  meta?: {
    timestamp: string;
    version: string;
    request_id: string;
  };
}

export interface PortfolioSummaryResponse {
  success: boolean;
  data: PortfolioSummary;
}

export interface PortfolioPerformanceResponse {
  success: boolean;
  data: PortfolioPerformance[];
}

export interface AssetAllocationResponse {
  success: boolean;
  data: AssetAllocation[];
}

export interface RiskMetricsResponse {
  success: boolean;
  data: RiskMetrics;
}

export interface RecentActivityResponse {
  success: boolean;
  data: RecentActivity[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface BenchmarkComparisonResponse {
  success: boolean;
  data: BenchmarkComparison[];
}

// Filter and Sort Types
export interface InvestmentFilters {
  status?: InvestmentStatus[];
  investment_type?: InvestmentType[];
  min_amount?: number;
  max_amount?: number;
  startup_stage?: StartupStage[];
  industry?: string[];
  date_from?: string;
  date_to?: string;
}

export interface InvestmentSortOptions {
  field: 'amount' | 'investment_date' | 'current_value' | 'performance' | 'created_at';
  direction: 'asc' | 'desc';
}

export interface PortfolioSettings {
  default_view: 'overview' | 'performance' | 'allocations' | 'analytics';
  currency: string;
  risk_tolerance: 'conservative' | 'moderate' | 'aggressive';
  notifications: {
    price_alerts: boolean;
    company_updates: boolean;
    exit_opportunities: boolean;
    portfolio_reports: boolean;
  };
  privacy: {
    show_portfolio_publicly: boolean;
    show_performance_publicly: boolean;
    allow_contact_from_founders: boolean;
  };
}