import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useCapTableStore } from '@/stores/cap-table-store'
import { DilutionCalculator } from '@/components/investment'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/cap-tables/$startupId/dilution')({
  component: DilutionAnalysisPage,
})

function DilutionAnalysisPage() {
  const { startupId } = Route.useParams()
  const { calculateDilution, dilutionAnalysis, isLoading, fetchByStartup } = useCapTableStore()

  useEffect(() => {
    fetchByStartup(startupId)
  }, [startupId])

  const handleCalculate = async (newInvestment: number, preMoneyValuation: number) => {
    await calculateDilution(startupId, { newInvestmentAmount: newInvestment, preMoneyValuation })
    return dilutionAnalysis!
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
        <h1 className="text-3xl font-bold">Dilution Analysis</h1>
        <p className="text-muted-foreground">
          Model the impact of new investment on existing shareholders
        </p>
      </div>

      <DilutionCalculator startupId={startupId} onCalculate={handleCalculate} />
    </div>
  )
}
