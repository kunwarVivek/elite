import { useEffect } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Edit,
  Share2,
  Download,
  Eye,
  MessageCircle,
  Users,
  Calendar,
  DollarSign,
  Target,
  TrendingUp,
  ExternalLink,
  Building,
  MapPin,
  Globe,
  Award,
  FileText,
  BarChart3,
  Heart,
  Flag,
} from 'lucide-react'
import { usePitch, usePitchAnalytics } from '@/hooks/use-pitch'
import { PitchStatusBadge } from '@/components/pitches/pitch-status-badge'
import { PitchAnalytics } from '@/components/pitches/pitch-analytics'
import { formatCurrency, formatPercentage, formatRelativeTime, calculateInvestmentProgress } from '@/lib/pitch-utils'

export function PitchDetail() {
  const { id } = useParams({ from: '/pitches/$id' })
  const { data: pitch, isLoading, error, fetchPitch } = usePitch(id)
  const { data: analytics } = usePitchAnalytics(id)

  useEffect(() => {
    if (id) {
      fetchPitch()
    }
  }, [id, fetchPitch])

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="h-6 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error || !pitch) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-destructive">
          <CardContent className="p-6 text-center">
            <p className="text-destructive mb-4">Failed to load pitch details</p>
            <Button onClick={() => fetchPitch()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const fundingProgress = calculateInvestmentProgress(pitch)

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Back Navigation */}
      <div className="flex items-center gap-4">
        <Link to="/pitches">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-2">
          <PitchStatusBadge status={pitch.status} />
          <span className="text-sm text-muted-foreground">
            Created {formatRelativeTime(pitch.created_at)}
          </span>
        </div>
      </div>

      {/* Pitch Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={pitch.startup?.logo_url} />
                  <AvatarFallback className="text-lg">
                    {pitch.startup?.name?.slice(0, 2).toUpperCase() || 'ST'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-3xl font-bold">{pitch.title}</h1>
                  <p className="text-xl text-muted-foreground">{pitch.startup?.name}</p>
                  <div className="flex items-center gap-4 mt-2">
                    {pitch.startup?.industry && (
                      <Badge variant="secondary">{pitch.startup.industry}</Badge>
                    )}
                    {pitch.startup?.stage && (
                      <Badge variant="outline">{pitch.startup.stage}</Badge>
                    )}
                    {pitch.is_featured && (
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500">
                        Featured
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline">
                <Heart className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Link to={`/pitches/${pitch.id}/edit`}>
                <Button>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Pitch
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Executive Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Executive Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {pitch.summary}
              </p>
            </CardContent>
          </Card>

          {/* Pitch Content Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="financials">Financials</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Problem & Solution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Problem</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {pitch.problem_statement}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Solution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {pitch.solution}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Market Opportunity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Market Opportunity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {pitch.market_opportunity}
                  </p>
                </CardContent>
              </Card>

              {/* Competitive Analysis */}
              {pitch.competitive_analysis && (
                <Card>
                  <CardHeader>
                    <CardTitle>Competitive Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {pitch.competitive_analysis}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="financials" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Projections</CardTitle>
                  <CardDescription>
                    Revenue and growth projections for the next 3 years
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Revenue Projections */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {pitch.financial_projections.year1_revenue
                          ? formatCurrency(pitch.financial_projections.year1_revenue)
                          : '—'
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">Year 1 Revenue</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {pitch.financial_projections.year2_revenue
                          ? formatCurrency(pitch.financial_projections.year2_revenue)
                          : '—'
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">Year 2 Revenue</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {pitch.financial_projections.year3_revenue
                          ? formatCurrency(pitch.financial_projections.year3_revenue)
                          : '—'
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">Year 3 Revenue</p>
                    </div>
                  </div>

                  {/* Additional Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-lg font-semibold">
                        {pitch.financial_projections.break_even_months || '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">Break-even (months)</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">
                        {formatCurrency(pitch.financial_projections.monthly_burn_rate || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Monthly Burn Rate</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">
                        {pitch.financial_projections.runway_months || '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">Runway (months)</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">
                        {formatCurrency(pitch.financial_projections.year1_profit || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Year 1 Profit/Loss</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="team" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Founder Info */}
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={pitch.startup?.founder?.avatar_url} />
                      <AvatarFallback>
                        {pitch.startup?.founder?.name?.slice(0, 2).toUpperCase() || 'FO'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-semibold">{pitch.startup?.founder?.name}</h4>
                      <p className="text-sm text-muted-foreground">Founder & CEO</p>
                      {pitch.startup?.founder && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Member since {formatRelativeTime(pitch.startup.founder.created_at)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Company Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Company: {pitch.startup?.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Founded: {pitch.startup?.founded_date || 'Not specified'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Team Size: {pitch.startup?.team_size || 'Not specified'}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{pitch.startup?.website_url || 'No website'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {pitch.startup?.is_verified ? 'Verified Startup' : 'Unverified Startup'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Supporting Documents
                  </CardTitle>
                  <CardDescription>
                    Pitch deck and additional documentation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pitch.documents && pitch.documents.length > 0 ? (
                      pitch.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{doc.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatFileSize(doc.file_size)} • {formatRelativeTime(doc.created_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No documents uploaded yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Investment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Investment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Funding Goal</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(pitch.funding_amount)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Equity Offered</span>
                  <span className="text-lg font-bold">
                    {formatPercentage(pitch.equity_offered)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Min Investment</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(pitch.minimum_investment)}
                  </span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress</span>
                  <span className="font-medium">
                    {fundingProgress.percentage.toFixed(0)}%
                  </span>
                </div>
                <Progress value={fundingProgress.percentage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(fundingProgress.amount)} of {formatCurrency(pitch.funding_amount)} raised
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center">
                  <p className="text-lg font-bold">
                    {pitch.investment_summary?.investor_count || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Investors</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{pitch.view_count}</p>
                  <p className="text-xs text-muted-foreground">Views</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Views</span>
                </div>
                <span className="font-medium">{pitch.view_count}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Comments</span>
                </div>
                <span className="font-medium">{pitch.comments?.length || 0}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Investors</span>
                </div>
                <span className="font-medium">
                  {pitch.investment_summary?.investor_count || 0}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Created</span>
                </div>
                <span className="font-medium text-xs">
                  {formatRelativeTime(pitch.created_at)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to={`/pitches/${pitch.id}/edit`} className="w-full">
                <Button variant="outline" className="w-full justify-start">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Pitch
                </Button>
              </Link>

              <Button variant="outline" className="w-full justify-start">
                <Share2 className="h-4 w-4 mr-2" />
                Share Pitch
              </Button>

              <Button variant="outline" className="w-full justify-start">
                <Flag className="h-4 w-4 mr-2" />
                Report Issue
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Analytics Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Analytics
          </CardTitle>
          <CardDescription>
            Detailed analytics and insights for this pitch
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PitchAnalytics pitch={pitch} analytics={analytics} />
        </CardContent>
      </Card>
    </div>
  )
}