import { UseFormReturn } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  CheckCircle,
  DollarSign,
  Users,
  FileText,
  TrendingUp,
  Calendar,
  Edit,
  Eye,
  AlertCircle
} from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/lib/pitch-utils'
import type { PitchFormData } from '@/hooks/use-pitch-form'

interface ReviewStepProps {
  form: UseFormReturn<PitchFormData>
  onEditStep: (step: string) => void
}

export function ReviewStep({ form }: ReviewStepProps) {
  const formData = form.getValues()

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) || 0 : value
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num)
  }

  const formatPercentage = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) || 0 : value
    return `${num.toFixed(1)}%`
  }

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Pitch Summary
          </CardTitle>
          <CardDescription>
            Review all the information you've entered before publishing your pitch.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Basic Information
              </h3>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-7">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pitch Title</p>
                <p className="text-base">{formData.title || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Funding Amount</p>
                <p className="text-base font-semibold text-green-600">
                  {formatCurrency(formData.funding_amount || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Equity Offered</p>
                <p className="text-base">{formatPercentage(formData.equity_offered || 0)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Minimum Investment</p>
                <p className="text-base">{formatCurrency(formData.minimum_investment || 0)}</p>
              </div>
            </div>

            <div className="pl-7">
              <p className="text-sm font-medium text-muted-foreground mb-2">Executive Summary</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {formData.summary || 'No summary provided'}
              </p>
            </div>
          </div>

          <Separator />

          {/* Pitch Content */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Pitch Content
              </h3>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-7">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Problem Statement</p>
                <p className="text-sm leading-relaxed">
                  {formData.problem_statement ?
                    (formData.problem_statement.length > 150
                      ? `${formData.problem_statement.substring(0, 150)}...`
                      : formData.problem_statement
                    ) : 'Not provided'
                  }
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Solution</p>
                <p className="text-sm leading-relaxed">
                  {formData.solution ?
                    (formData.solution.length > 150
                      ? `${formData.solution.substring(0, 150)}...`
                      : formData.solution
                    ) : 'Not provided'
                  }
                </p>
              </div>
            </div>

            <div className="pl-7">
              <p className="text-sm font-medium text-muted-foreground mb-2">Market Opportunity</p>
              <p className="text-sm leading-relaxed">
                {formData.market_opportunity ?
                  (formData.market_opportunity.length > 150
                    ? `${formData.market_opportunity.substring(0, 150)}...`
                    : formData.market_opportunity
                  ) : 'Not provided'
                }
              </p>
            </div>
          </div>

          <Separator />

          {/* Financial Projections */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Financial Projections
              </h3>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>

            <div className="pl-7">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Year 1 Revenue</p>
                  <p className="text-base">
                    {formData.year1_revenue ? formatCurrency(formData.year1_revenue) : 'Not projected'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Year 2 Revenue</p>
                  <p className="text-base">
                    {formData.year2_revenue ? formatCurrency(formData.year2_revenue) : 'Not projected'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Year 3 Revenue</p>
                  <p className="text-base">
                    {formData.year3_revenue ? formatCurrency(formData.year3_revenue) : 'Not projected'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Monthly Burn Rate</p>
                  <p className="text-base">
                    {formData.monthly_burn_rate ? formatCurrency(formData.monthly_burn_rate) : 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Runway</p>
                  <p className="text-base">
                    {formData.runway_months ? `${formData.runway_months} months` : 'Not specified'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Team Information */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Team Information
              </h3>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>

            <div className="pl-7">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Team Size</p>
                  <p className="text-base">
                    {formData.current_team_size ? `${formData.current_team_size} members` : 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Technical Team</p>
                  <p className="text-base">
                    {formData.technical_team_size ? `${formData.technical_team_size} members` : 'Not specified'}
                  </p>
                </div>
              </div>

              {formData.founder_background && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Founder Background</p>
                  <p className="text-sm leading-relaxed">
                    {formData.founder_background.length > 200
                      ? `${formData.founder_background.substring(0, 200)}...`
                      : formData.founder_background
                    }
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Documents */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-600" />
                Supporting Documents
              </h3>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>

            <div className="pl-7">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Pitch deck uploaded</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Financial projections uploaded</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <span className="text-sm">Legal documents pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <span className="text-sm">Additional documents optional</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Investment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Investment Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(formData.funding_amount || 0)}
              </p>
              <p className="text-sm text-muted-foreground">Funding Goal</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                {formatPercentage(formData.equity_offered || 0)}
              </p>
              <p className="text-sm text-muted-foreground">Equity Offered</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                {formData.minimum_investment ? formatCurrency(formData.minimum_investment) : '—'}
              </p>
              <p className="text-sm text-muted-foreground">Min Investment</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                {formData.funding_amount && formData.minimum_investment
                  ? Math.floor(formData.funding_amount / formData.minimum_investment)
                  : '—'
                }
              </p>
              <p className="text-sm text-muted-foreground">Max Investors</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Pre-submission Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm">All required fields completed</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm">Financial projections reviewed</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm">Pitch deck uploaded</span>
            </div>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <span className="text-sm">Legal documents recommended</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <AlertCircle className="h-5 w-5" />
            Important Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-amber-700 dark:text-amber-300 space-y-2">
          <p>• Your pitch will be reviewed by our team before being published to investors</p>
          <p>• Make sure all information is accurate and up-to-date</p>
          <p>• You can edit your pitch after submission but changes may require re-review</p>
          <p>• Consider having your pitch deck and financials reviewed by a professional</p>
        </CardContent>
      </Card>
    </div>
  )
}