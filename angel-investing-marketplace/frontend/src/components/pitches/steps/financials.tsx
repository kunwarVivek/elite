import { UseFormReturn } from 'react-hook-form'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, Calendar, PiggyBank } from 'lucide-react'
import type { PitchFormData } from '@/hooks/use-pitch-form'

interface FinancialsStepProps {
  form: UseFormReturn<PitchFormData>
}

export function FinancialsStep({ form }: FinancialsStepProps) {
  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) || 0 : value
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Financial Projections
        </CardTitle>
        <CardDescription>
          Provide your financial projections and explain how you'll use the investment funds.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Revenue Projections */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold">Revenue Projections</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Year 1 Revenue */}
            <FormField
              control={form.control}
              name="year1_revenue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Year 1 Revenue ($)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="100000"
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-muted-foreground">
                    Projected revenue for the first 12 months
                  </p>
                </FormItem>
              )}
            />

            {/* Year 2 Revenue */}
            <FormField
              control={form.control}
              name="year2_revenue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Year 2 Revenue ($)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="500000"
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-muted-foreground">
                    Projected revenue for the second year
                  </p>
                </FormItem>
              )}
            />

            {/* Year 3 Revenue */}
            <FormField
              control={form.control}
              name="year3_revenue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Year 3 Revenue ($)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="2000000"
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-muted-foreground">
                    Projected revenue for the third year
                  </p>
                </FormItem>
              )}
            />
          </div>

          {/* Revenue Visualization */}
          {(form.watch('year1_revenue') || form.watch('year2_revenue') || form.watch('year3_revenue')) && (
            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
              <h4 className="font-medium text-green-900 dark:text-green-100 mb-3">
                Revenue Growth Projection
              </h4>
              <div className="space-y-2">
                {form.watch('year1_revenue') && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-800 dark:text-green-200">Year 1:</span>
                    <span className="font-semibold text-green-900 dark:text-green-100">
                      {formatCurrency(form.watch('year1_revenue') || 0)}
                    </span>
                  </div>
                )}
                {form.watch('year2_revenue') && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-800 dark:text-green-200">Year 2:</span>
                    <span className="font-semibold text-green-900 dark:text-green-100">
                      {formatCurrency(form.watch('year2_revenue') || 0)}
                    </span>
                  </div>
                )}
                {form.watch('year3_revenue') && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-800 dark:text-green-200">Year 3:</span>
                    <span className="font-semibold text-green-900 dark:text-green-100">
                      {formatCurrency(form.watch('year3_revenue') || 0)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Cost Structure */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Cost Structure & Metrics</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Monthly Burn Rate */}
            <FormField
              control={form.control}
              name="monthly_burn_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Monthly Burn Rate ($)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="50000"
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-muted-foreground">
                    Your average monthly operating expenses
                  </p>
                </FormItem>
              )}
            />

            {/* Runway Months */}
            <FormField
              control={form.control}
              name="runway_months"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Current Runway (Months)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="12"
                      min="0"
                      max="60"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-muted-foreground">
                    How many months can you operate with current funds?
                  </p>
                </FormItem>
              )}
            />
          </div>

          {/* Break-even Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Break-even Months */}
            <FormField
              control={form.control}
              name="break_even_months"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Break-even Timeline (Months)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="18"
                      min="1"
                      max="60"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-muted-foreground">
                    When do you expect to become profitable?
                  </p>
                </FormItem>
              )}
            />

            {/* Year 1 Profit */}
            <FormField
              control={form.control}
              name="year1_profit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Year 1 Profit/Loss ($)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="-50000"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-muted-foreground">
                    Expected profit or loss for the first year
                  </p>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Use of Funds */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Use of Investment Funds</h3>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
              Based on your funding amount of <strong>{formatCurrency(form.watch('funding_amount') || 0)}</strong>,
              here's how you might allocate these funds:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-300">Product Development:</span>
                  <span className="font-medium">{formatCurrency((form.watch('funding_amount') || 0) * 0.4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-300">Marketing & Sales:</span>
                  <span className="font-medium">{formatCurrency((form.watch('funding_amount') || 0) * 0.25)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-300">Operations:</span>
                  <span className="font-medium">{formatCurrency((form.watch('funding_amount') || 0) * 0.2)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-300">Team Expansion:</span>
                  <span className="font-medium">{formatCurrency((form.watch('funding_amount') || 0) * 0.1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-300">Working Capital:</span>
                  <span className="font-medium">{formatCurrency((form.watch('funding_amount') || 0) * 0.05)}</span>
                </div>
              </div>
            </div>

            <Badge variant="outline" className="mt-3">
              These are suggested allocations - adjust based on your specific needs
            </Badge>
          </div>
        </div>

        {/* Financial Assumptions */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Key Financial Assumptions</h3>

          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Important:</strong> Be transparent about the assumptions underlying your projections.
              Consider including information about:
            </p>
            <ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 space-y-1">
              <li>• Customer acquisition cost and lifetime value assumptions</li>
              <li>• Pricing strategy and revenue model</li>
              <li>• Market penetration and growth assumptions</li>
              <li>• Cost structure and scalability factors</li>
              <li>• Key milestones that will drive revenue growth</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}