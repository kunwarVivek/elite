import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from './currency-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CurrencyDisplay } from './currency-display'
import { Calculator, TrendingUp } from 'lucide-react'

interface ConversionResult {
  sharesIssued: number
  effectivePricePerShare: number
  postConversionOwnership: number
  appliedValuation?: number
  appliedDiscount?: number
}

interface ConversionCalculatorProps {
  type: 'SAFE' | 'NOTE'
  investmentAmount: number
  valuationCap?: number
  discountRate?: number
  onCalculate: (roundValuation: number, pricePerShare: number) => Promise<ConversionResult>
}

export function ConversionCalculator({
  type,
  investmentAmount,
  valuationCap,
  discountRate,
  onCalculate,
}: ConversionCalculatorProps) {
  const [roundValuation, setRoundValuation] = useState(0)
  const [pricePerShare, setPricePerShare] = useState(0)
  const [result, setResult] = useState<ConversionResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  const handleCalculate = async () => {
    if (roundValuation <= 0 || pricePerShare <= 0) return

    setIsCalculating(true)
    try {
      const calculationResult = await onCalculate(roundValuation, pricePerShare)
      setResult(calculationResult)
    } catch (error) {
      console.error('Error calculating conversion:', error)
    } finally {
      setIsCalculating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Conversion Calculator
        </CardTitle>
        <CardDescription>
          Calculate {type === 'SAFE' ? 'SAFE' : 'convertible note'} conversion terms
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Investment Amount</span>
                <CurrencyDisplay value={investmentAmount} />
              </div>
              {valuationCap && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valuation Cap</span>
                  <CurrencyDisplay value={valuationCap} />
                </div>
              )}
              {discountRate !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount Rate</span>
                  <span className="font-medium">{discountRate}%</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <CurrencyInput
              label="Round Valuation"
              value={roundValuation}
              onChange={setRoundValuation}
              placeholder="0.00"
              helperText="Post-money valuation of the equity round"
            />
            <div className="space-y-2">
              <Label>Price Per Share</Label>
              <Input
                type="number"
                value={pricePerShare || ''}
                onChange={(e) => setPricePerShare(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                step="0.01"
              />
              <p className="text-sm text-muted-foreground">
                Share price in the equity round
              </p>
            </div>
          </div>

          <Button
            onClick={handleCalculate}
            disabled={isCalculating || roundValuation <= 0 || pricePerShare <= 0}
            className="w-full"
          >
            {isCalculating ? 'Calculating...' : 'Calculate Conversion'}
          </Button>
        </div>

        {result && (
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center gap-2 text-green-600">
              <TrendingUp className="h-5 w-5" />
              <h4 className="font-semibold">Conversion Results</h4>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Shares Issued</p>
                <p className="text-2xl font-bold">{result.sharesIssued.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Effective Price Per Share</p>
                <CurrencyDisplay value={result.effectivePricePerShare} className="text-2xl" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Post-Conversion Ownership</p>
                <p className="text-2xl font-bold">{result.postConversionOwnership.toFixed(2)}%</p>
              </div>
              {result.appliedValuation && (
                <div>
                  <p className="text-sm text-muted-foreground">Applied Valuation</p>
                  <CurrencyDisplay value={result.appliedValuation} className="text-2xl" />
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
