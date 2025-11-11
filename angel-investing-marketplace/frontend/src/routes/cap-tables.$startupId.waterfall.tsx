import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useCapTableStore } from '@/stores/cap-table-store'
import { ExitDistributionCalculator, CurrencyInput } from '@/components/investment'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Calculator } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/cap-tables/$startupId/waterfall')({
  component: WaterfallAnalysisPage,
})

function WaterfallAnalysisPage() {
  const { startupId } = Route.useParams()
  const { calculateWaterfall, waterfallAnalysis, isLoading, fetchByStartup } = useCapTableStore()
  const [exitProceeds, setExitProceeds] = useState(0)
  const [hasCalculated, setHasCalculated] = useState(false)

  useEffect(() => {
    fetchByStartup(startupId)
  }, [startupId])

  const handleCalculate = async () => {
    if (exitProceeds <= 0) {
      toast.error('Please enter a valid exit proceeds amount')
      return
    }

    try {
      await calculateWaterfall(startupId, { exitProceeds })
      setHasCalculated(true)
    } catch (error) {
      toast.error('Failed to calculate waterfall distribution')
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Link to="/cap-tables/$startupId" params={{ startupId }}>
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Cap Table
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Waterfall Analysis</h1>
        <p className="text-muted-foreground">
          Calculate distribution of exit proceeds based on liquidation preferences
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Exit Proceeds Calculator
            </CardTitle>
            <CardDescription>
              Enter the total exit proceeds to calculate the waterfall distribution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CurrencyInput
              label="Total Exit Proceeds"
              value={exitProceeds}
              onChange={setExitProceeds}
              helperText="The total amount from the exit event (acquisition, IPO, etc.)"
            />
            <Button onClick={handleCalculate} disabled={isLoading} className="w-full">
              {isLoading ? 'Calculating...' : 'Calculate Distribution'}
            </Button>
          </CardContent>
        </Card>

        {waterfallAnalysis && hasCalculated && (
          <ExitDistributionCalculator analysis={waterfallAnalysis} />
        )}
      </div>
    </div>
  )
}
