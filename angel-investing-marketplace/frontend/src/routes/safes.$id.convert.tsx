import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useSafeStore } from '@/stores/safe-store'
import { useEquityRoundStore } from '@/stores/equity-round-store'
import { CurrencyInput, CurrencyDisplay, PercentageDisplay } from '@/components/investment'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, TrendingUp, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/safes/$id/convert')({
  component: ConvertSafePage,
})

function ConvertSafePage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const {
    currentSafe,
    isLoading: safeLoading,
    fetchById,
    convertSafe,
    calculateConversion,
    conversionCalculation,
  } = useSafeStore()
  const { activeRounds, fetchActive } = useEquityRoundStore()

  const [formData, setFormData] = useState({
    roundId: '',
    pricePerShare: 0,
    roundValuation: 0,
  })

  const [hasCalculated, setHasCalculated] = useState(false)

  useEffect(() => {
    fetchById(id)
    fetchActive()
  }, [id])

  const handleCalculate = async () => {
    if (formData.roundValuation <= 0 || formData.pricePerShare <= 0) {
      toast.error('Please enter valid round valuation and price per share')
      return
    }

    try {
      await calculateConversion(id, {
        roundValuation: formData.roundValuation,
        pricePerShare: formData.pricePerShare,
      })
      setHasCalculated(true)
    } catch (error) {
      toast.error('Failed to calculate conversion')
    }
  }

  const handleConvert = async () => {
    if (!formData.roundId) {
      toast.error('Please select an equity round')
      return
    }

    if (!hasCalculated) {
      toast.error('Please calculate conversion first')
      return
    }

    try {
      await convertSafe(id, formData)
      toast.success('SAFE converted successfully')
      navigate({ to: '/safes/$id', params: { id } })
    } catch (error) {
      toast.error('Failed to convert SAFE')
    }
  }

  if (safeLoading || !currentSafe) {
    return <div>Loading...</div>
  }

  if (currentSafe.status !== 'ACTIVE') {
    return (
      <div className="container mx-auto max-w-3xl py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This SAFE cannot be converted because it is not active.
          </AlertDescription>
        </Alert>
        <Link to="/safes/$id" params={{ id }}>
          <Button className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to SAFE Details
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <Link to="/safes/$id" params={{ id }}>
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to SAFE Details
        </Button>
      </Link>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Convert SAFE to Equity
            </CardTitle>
            <CardDescription>
              Convert this SAFE agreement into equity shares based on the equity round terms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="mb-3 font-semibold">SAFE Terms</h4>
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Investment Amount</span>
                  <CurrencyDisplay value={currentSafe.investmentAmount} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SAFE Type</span>
                  <span className="font-medium">
                    {currentSafe.type === 'POST_MONEY' ? 'Post-Money' : 'Pre-Money'}
                  </span>
                </div>
                {currentSafe.valuationCap && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valuation Cap</span>
                    <CurrencyDisplay value={currentSafe.valuationCap} />
                  </div>
                )}
                {currentSafe.discountRate !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount Rate</span>
                    <PercentageDisplay value={currentSafe.discountRate} />
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roundId">Select Equity Round *</Label>
                <Select
                  value={formData.roundId}
                  onValueChange={(value) => setFormData({ ...formData, roundId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an equity round" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeRounds.map((round) => (
                      <SelectItem key={round.id} value={round.id}>
                        {round.roundName} - {round.roundType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <CurrencyInput
                label="Round Valuation *"
                value={formData.roundValuation}
                onChange={(value) => setFormData({ ...formData, roundValuation: value })}
                helperText="Post-money valuation of the equity round"
              />

              <div className="space-y-2">
                <Label htmlFor="pricePerShare">Price Per Share *</Label>
                <Input
                  id="pricePerShare"
                  type="number"
                  step="0.01"
                  value={formData.pricePerShare || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, pricePerShare: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                />
                <p className="text-sm text-muted-foreground">
                  Share price in the equity round
                </p>
              </div>

              <Button
                onClick={handleCalculate}
                disabled={safeLoading}
                variant="outline"
                className="w-full"
              >
                Calculate Conversion
              </Button>
            </div>

            {conversionCalculation && hasCalculated && (
              <>
                <Separator />
                <div className="space-y-4 rounded-lg border-2 border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
                  <h4 className="flex items-center gap-2 font-semibold text-green-900 dark:text-green-100">
                    <TrendingUp className="h-5 w-5" />
                    Conversion Results
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-green-700 dark:text-green-300">Shares Issued</p>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                        {conversionCalculation.sharesIssued.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Effective Price Per Share
                      </p>
                      <CurrencyDisplay
                        value={conversionCalculation.effectivePricePerShare}
                        className="text-2xl text-green-900 dark:text-green-100"
                      />
                    </div>
                    <div>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Post-Conversion Ownership
                      </p>
                      <PercentageDisplay
                        value={conversionCalculation.postConversionOwnership}
                        className="text-2xl text-green-900 dark:text-green-100"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button onClick={handleConvert} disabled={safeLoading} className="flex-1">
                    {safeLoading ? 'Converting...' : 'Confirm Conversion'}
                  </Button>
                  <Link to="/safes/$id" params={{ id }}>
                    <Button variant="outline">Cancel</Button>
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
