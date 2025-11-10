import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from './currency-input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PercentageDisplay } from './percentage-display'
import { CurrencyDisplay } from './currency-display'
import { Calculator } from 'lucide-react'

interface DilutionResult {
  stakeholderId: string
  entityName: string
  currentOwnership: number
  newOwnership: number
  dilution: number
}

interface DilutionCalculatorProps {
  startupId: string
  onCalculate: (newInvestment: number, preMoneyValuation: number) => Promise<{
    preMoneyValuation: number
    newInvestmentAmount: number
    postMoneyValuation: number
    dilutionImpact: DilutionResult[]
  }>
}

export function DilutionCalculator({ startupId, onCalculate }: DilutionCalculatorProps) {
  const [newInvestment, setNewInvestment] = useState(0)
  const [preMoneyValuation, setPreMoneyValuation] = useState(0)
  const [results, setResults] = useState<{
    preMoneyValuation: number
    newInvestmentAmount: number
    postMoneyValuation: number
    dilutionImpact: DilutionResult[]
  } | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  const handleCalculate = async () => {
    if (newInvestment <= 0 || preMoneyValuation <= 0) return

    setIsCalculating(true)
    try {
      const result = await onCalculate(newInvestment, preMoneyValuation)
      setResults(result)
    } catch (error) {
      console.error('Error calculating dilution:', error)
    } finally {
      setIsCalculating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Dilution Calculator
        </CardTitle>
        <CardDescription>
          Model the impact of a new investment round on existing ownership
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <CurrencyInput
            label="New Investment Amount"
            value={newInvestment}
            onChange={setNewInvestment}
            placeholder="0.00"
          />
          <CurrencyInput
            label="Pre-Money Valuation"
            value={preMoneyValuation}
            onChange={setPreMoneyValuation}
            placeholder="0.00"
          />
        </div>

        <Button
          onClick={handleCalculate}
          disabled={isCalculating || newInvestment <= 0 || preMoneyValuation <= 0}
          className="w-full"
        >
          {isCalculating ? 'Calculating...' : 'Calculate Dilution'}
        </Button>

        {results && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Pre-Money Valuation</p>
                <CurrencyDisplay value={results.preMoneyValuation} className="text-xl" />
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">New Investment</p>
                <CurrencyDisplay value={results.newInvestmentAmount} className="text-xl" />
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Post-Money Valuation</p>
                <CurrencyDisplay value={results.postMoneyValuation} className="text-xl" />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stakeholder</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                    <TableHead className="text-right">New</TableHead>
                    <TableHead className="text-right">Dilution</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.dilutionImpact.map((impact) => (
                    <TableRow key={impact.stakeholderId}>
                      <TableCell className="font-medium">{impact.entityName}</TableCell>
                      <TableCell className="text-right">
                        <PercentageDisplay value={impact.currentOwnership} />
                      </TableCell>
                      <TableCell className="text-right">
                        <PercentageDisplay value={impact.newOwnership} />
                      </TableCell>
                      <TableCell className="text-right">
                        <PercentageDisplay value={impact.dilution} showSign />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
