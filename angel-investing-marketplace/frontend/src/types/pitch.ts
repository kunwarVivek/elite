export type PitchStatus = 'DRAFT' | 'UNDER_REVIEW' | 'ACTIVE' | 'FUNDED' | 'CLOSED' | 'WITHDRAWN'

export type StartupStage = 'IDEA' | 'PROTOTYPE' | 'MVP' | 'GROWTH' | 'SCALE'

export type DocumentType = 'PITCH_DECK' | 'BUSINESS_PLAN' | 'FINANCIAL_STATEMENT' | 'LEGAL_DOCUMENT' | 'OTHER'

export type InvestmentType = 'DIRECT' | 'SYNDICATE'

export interface Pitch {
  id: string
  startup_id: string
  title: string
  slug: string
  summary: string
  problem_statement: string
  solution: string
  market_opportunity: string
  competitive_analysis?: string
  financial_projections: FinancialProjections
  funding_amount: number
  equity_offered: number
  minimum_investment: number
  status: PitchStatus
  pitch_deck_url?: string
  video_url?: string
  tags?: string[]
  view_count: number
  is_featured: boolean
  expires_at?: string
  created_at: string
  updated_at: string

  // Populated relations
  startup?: Startup
  comments?: Comment[]
  documents?: Document[]
  investment_summary?: InvestmentSummary
}

export interface Startup {
  id: string
  name: string
  slug: string
  description: string
  industry: string
  stage: StartupStage
  funding_goal: number
  current_funding: number
  founder_id: string
  website_url?: string
  logo_url?: string
  team_size?: number
  founded_date?: string
  business_model?: string
  target_market?: string
  competitive_advantage?: string
  financial_data?: any
  is_verified: boolean
  is_active: boolean
  created_at: string
  updated_at: string

  // Populated relations
  founder?: User
}

export interface User {
  id: string
  email: string
  name: string
  role: 'FOUNDER' | 'INVESTOR' | 'SYNDICATE_LEAD' | 'ADMIN'
  avatar_url?: string
  profile_data?: any
  is_verified: boolean
  created_at: string
}

export interface FinancialProjections {
  year1_revenue?: number
  year2_revenue?: number
  year3_revenue?: number
  year1_profit?: number
  year2_profit?: number
  year3_profit?: number
  break_even_months?: number
  monthly_burn_rate?: number
  runway_months?: number
}

export interface Comment {
  id: string
  pitch_id: string
  user_id: string
  parent_comment_id?: string
  content: string
  is_approved: boolean
  likes_count: number
  created_at: string
  updated_at: string

  // Populated relations
  user?: User
  replies?: Comment[]
}

export interface Document {
  id: string
  startup_id: string
  pitch_id?: string
  name: string
  file_path: string
  file_url: string
  file_type: DocumentType
  file_size: number
  mime_type?: string
  is_public: boolean
  download_count: number
  uploaded_by: string
  created_at: string
  updated_at: string

  // Populated relations
  uploaded_by_user?: User
}

export interface InvestmentSummary {
  total_invested: number
  investor_count: number
  average_investment: number
  funding_percentage: number
}

export interface Investment {
  id: string
  investor_id: string
  pitch_id: string
  amount: number
  equity_percentage: number
  share_price?: number
  status: 'PENDING' | 'ESCROW' | 'DUE_DILIGENCE' | 'LEGAL_REVIEW' | 'COMPLETED' | 'CANCELLED'
  investment_type: InvestmentType
  syndicate_lead_id?: string
  terms?: any
  legal_documents?: any
  escrow_reference?: string
  payment_method?: string
  payment_reference?: string
  investment_date?: string
  created_at: string
  updated_at: string

  // Populated relations
  investor?: User
  pitch?: Pitch
}

export interface PitchAnalytics {
  pitch_id: string
  total_views: number
  unique_views: number
  average_time_on_page: number
  bounce_rate: number
  investor_interactions: number
  comments_count: number
  documents_downloaded: number
  conversion_rate: number
  top_referrers: string[]
  views_over_time: ViewDataPoint[]
  created_at: string
  updated_at: string
}

export interface ViewDataPoint {
  date: string
  views: number
  unique_views: number
}

export interface PitchFilters {
  status?: PitchStatus[]
  industry?: string[]
  stage?: StartupStage[]
  min_amount?: number
  max_amount?: number
  search?: string
  sort_by?: 'created_at' | 'funding_amount' | 'view_count' | 'updated_at'
  sort_order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface PitchFormData {
  // Basic Information
  startup_id?: string
  title: string
  summary: string

  // Pitch Content
  problem_statement: string
  solution: string
  market_opportunity: string
  competitive_analysis?: string

  // Financial Information
  funding_amount: number
  equity_offered: number
  minimum_investment: number
  financial_projections: FinancialProjections

  // Additional Information
  pitch_deck_url?: string
  video_url?: string
  tags?: string[]
  expires_at?: string
}

export interface CreatePitchRequest {
  startup_id: string
  title: string
  summary: string
  problem_statement: string
  solution: string
  market_opportunity: string
  competitive_analysis?: string
  financial_projections: FinancialProjections
  funding_amount: number
  equity_offered: number
  minimum_investment: number
  pitch_deck_url?: string
  video_url?: string
  tags?: string[]
  expires_at?: string
}

export interface UpdatePitchRequest extends Partial<CreatePitchRequest> {
  status?: PitchStatus
}

export interface PitchListResponse {
  pitches: Pitch[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

export interface PitchDetailResponse {
  pitch: Pitch
}

export interface PitchAnalyticsResponse {
  analytics: PitchAnalytics
}