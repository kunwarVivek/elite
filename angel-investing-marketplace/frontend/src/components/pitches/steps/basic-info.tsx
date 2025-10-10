import { UseFormReturn } from 'react-hook-form'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { PitchFormData } from '@/hooks/use-pitch-form'

interface BasicInfoStepProps {
  form: UseFormReturn<PitchFormData>
}

export function BasicInfoStep({ form }: BasicInfoStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
        <CardDescription>
          Start with the fundamental details of your pitch. This information will be visible to investors.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pitch Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-semibold">
                Pitch Title *
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Revolutionary AI-Powered Healthcare Platform"
                  className="text-lg"
                  {...field}
                />
              </FormControl>
              <FormMessage />
              <p className="text-sm text-muted-foreground">
                A compelling title that captures the essence of your startup and value proposition.
              </p>
            </FormItem>
          )}
        />

        {/* Pitch Summary */}
        <FormField
          control={form.control}
          name="summary"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-semibold">
                Executive Summary *
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide a concise overview of your business, including what you do, your target market, and why you're raising funds..."
                  className="min-h-[120px] resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
              <p className="text-sm text-muted-foreground">
                A compelling summary that explains your business in 2-3 paragraphs. This is often the first thing investors read.
              </p>
            </FormItem>
          )}
        />

        {/* Funding Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Funding Amount */}
          <FormField
            control={form.control}
            name="funding_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-semibold">
                  Funding Amount ($) *
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="500000"
                    min="1000"
                    max="100000000"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
                <p className="text-sm text-muted-foreground">
                  Total amount you're looking to raise in this round.
                </p>
              </FormItem>
            )}
          />

          {/* Equity Offered */}
          <FormField
            control={form.control}
            name="equity_offered"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-semibold">
                  Equity Offered (%) *
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="10"
                    min="0.1"
                    max="50"
                    step="0.1"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
                <p className="text-sm text-muted-foreground">
                  Percentage of equity you're offering for this investment.
                </p>
              </FormItem>
            )}
          />

          {/* Minimum Investment */}
          <FormField
            control={form.control}
            name="minimum_investment"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-semibold">
                  Minimum Investment ($) *
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="10000"
                    min="100"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
                <p className="text-sm text-muted-foreground">
                  Minimum amount an investor can contribute.
                </p>
              </FormItem>
            )}
          />
        </div>

        {/* Investment Calculation Display */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium mb-2">Investment Overview</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Pre-money Valuation</p>
              <p className="font-semibold">
                {form.watch('funding_amount') && form.watch('equity_offered')
                  ? `$${(form.watch('funding_amount') / (form.watch('equity_offered') / 100)).toLocaleString()}`
                  : '—'
                }
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Post-money Valuation</p>
              <p className="font-semibold">
                {form.watch('funding_amount') && form.watch('equity_offered')
                  ? `$${((form.watch('funding_amount') / (form.watch('equity_offered') / 100)) + form.watch('funding_amount')).toLocaleString()}`
                  : '—'
                }
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Price per Share</p>
              <p className="font-semibold">
                {form.watch('funding_amount') && form.watch('equity_offered')
                  ? `$${(form.watch('funding_amount') / (form.watch('equity_offered') / 100) / 1000000).toFixed(2)}`
                  : '—'
                }
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Max Investors</p>
              <p className="font-semibold">
                {form.watch('funding_amount') && form.watch('minimum_investment')
                  ? Math.floor(form.watch('funding_amount') / form.watch('minimum_investment'))
                  : '—'
                }
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}