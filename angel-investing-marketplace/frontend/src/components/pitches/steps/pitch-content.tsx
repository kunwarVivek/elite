import { UseFormReturn } from 'react-hook-form'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Lightbulb, Target, TrendingUp, FileText } from 'lucide-react'
import type { PitchFormData } from '@/hooks/use-pitch-form'

interface PitchContentStepProps {
  form: UseFormReturn<PitchFormData>
}

export function PitchContentStep({ form }: PitchContentStepProps) {
  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  const getCharacterCount = (text: string) => {
    return text.length
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Pitch Content
        </CardTitle>
        <CardDescription>
          Describe your business opportunity in detail. Focus on the problem you're solving, your solution, and the market potential.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Problem Statement */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-destructive" />
            <FormLabel className="text-base font-semibold">
              Problem Statement *
            </FormLabel>
          </div>

          <FormField
            control={form.control}
            name="problem_statement"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder="Describe the specific problem your target customers are facing. What pain points are you addressing? Be specific about the current solutions and their limitations..."
                    className="min-h-[150px] resize-none"
                    {...field}
                  />
                </FormControl>
                <div className="flex justify-between items-center">
                  <FormMessage />
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{getWordCount(field.value || '')} words</span>
                    <span>{getCharacterCount(field.value || '')} characters</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Clearly articulate the problem you're solving. Use specific examples and data when possible.
                </p>
              </FormItem>
            )}
          />
        </div>

        {/* Solution */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <FormLabel className="text-base font-semibold">
              Solution *
            </FormLabel>
          </div>

          <FormField
            control={form.control}
            name="solution"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder="Explain how your product or service solves the problem. What makes your approach unique? Describe your technology, methodology, or business model..."
                    className="min-h-[150px] resize-none"
                    {...field}
                  />
                </FormControl>
                <div className="flex justify-between items-center">
                  <FormMessage />
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{getWordCount(field.value || '')} words</span>
                    <span>{getCharacterCount(field.value || '')} characters</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Describe your unique solution and competitive advantages. Focus on what sets you apart from existing alternatives.
                </p>
              </FormItem>
            )}
          />
        </div>

        {/* Market Opportunity */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <FormLabel className="text-base font-semibold">
              Market Opportunity *
            </FormLabel>
          </div>

          <FormField
            control={form.control}
            name="market_opportunity"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder="Describe the size and characteristics of your target market. Include TAM, SAM, and SOM calculations. What trends support your market opportunity?..."
                    className="min-h-[150px] resize-none"
                    {...field}
                  />
                </FormControl>
                <div className="flex justify-between items-center">
                  <FormMessage />
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{getWordCount(field.value || '')} words</span>
                    <span>{getCharacterCount(field.value || '')} characters</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Quantify your market opportunity with data. Include market size, growth projections, and your go-to-market strategy.
                </p>
              </FormItem>
            )}
          />
        </div>

        {/* Competitive Analysis (Optional) */}
        <div className="space-y-4">
          <FormLabel className="text-base font-semibold">
            Competitive Analysis
          </FormLabel>
          <Badge variant="outline" className="mb-2">
            Optional
          </Badge>

          <FormField
            control={form.control}
            name="competitive_analysis"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder="Analyze your key competitors and explain your competitive advantages. What differentiates you in the market? How do you plan to capture market share?..."
                    className="min-h-[120px] resize-none"
                    {...field}
                  />
                </FormControl>
                <div className="flex justify-between items-center">
                  <FormMessage />
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{getWordCount(field.value || '')} words</span>
                    <span>{getCharacterCount(field.value || '')} characters</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Provide context about your competitive landscape and your unique positioning.
                </p>
              </FormItem>
            )}
          />
        </div>

        {/* Content Guidelines */}
        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Content Tips for Investors
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Use specific numbers and data points when possible</li>
            <li>• Focus on customer pain points and how you solve them</li>
            <li>• Highlight your unique competitive advantages</li>
            <li>• Include market validation (customer interviews, early traction, etc.)</li>
            <li>• Keep language clear and jargon-free when possible</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}