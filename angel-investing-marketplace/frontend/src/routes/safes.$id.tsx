import { createFileRoute, Link, useNavigate } from '@tantml:react-router'
import { useEffect, useState } from 'react'
import { useSafeStore } from '@/stores/safe-store'
import { useAuthStore } from '@/stores/auth-store'
import {
  CurrencyDisplay,
  PercentageDisplay,
  InvestmentStatusBadge,
  InvestmentTimeline,
  DocumentList,
  ConversionCalculator,
} from '@/components/investment'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, FileText, Calculator, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

export const Route = createFileRoute('/safes/$id')({
  component: SafeDetailsPage,
})

function SafeDetailsPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    currentSafe,
    isLoading,
    fetchById,
    dissolveSafe,
    calculateConversion,
    conversionCalculation,
  } = useSafeStore()
  const [showDissolveDialog, setShowDissolveDialog] = useState(false)
  const [dissolving, setDissolving] = useState(false)

  useEffect(() => {
    fetchById(id)
  }, [id])

  const handleDissolve = async () => {
    setDissolving(true)
    try {
      await dissolveSafe(id, 'Dissolved by user')
      toast.success('SAFE agreement dissolved successfully')
      setShowDissolveDialog(false)
      navigate({ to: '/safes' })
    } catch (error) {
      toast.error('Failed to dissolve SAFE agreement')
    } finally {
      setDissolving(false)
    }
  }

  const handleCalculateConversion = async (roundValuation: number, pricePerShare: number) => {
    return await calculateConversion(id, { roundValuation, pricePerShare })
  }

  if (isLoading || !currentSafe) {
    return (
      <div className="container mx-auto py-8">
        <Skeleton className="mb-8 h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Skeleton className="h-[600px]" />
          </div>
          <div>
            <Skeleton className="h-[400px]" />
          </div>
        </div>
      </div>
    )
  }

  const canManage = user?.role === 'FOUNDER' || user?.role === 'ADMIN'
  const canConvert = currentSafe.status === 'ACTIVE' && canManage

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Link to="/safes">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to SAFEs
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">SAFE Agreement</h1>
            <p className="text-muted-foreground">
              Created {format(new Date(currentSafe.createdAt), 'MMM dd, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <InvestmentStatusBadge status={currentSafe.status} />
            {canConvert && (
              <Link to="/safes/$id/convert" params={{ id }}>
                <Button>Convert to Equity</Button>
              </Link>
            )}
            {currentSafe.status === 'ACTIVE' && canManage && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDissolveDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Dissolve
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="calculator">Conversion Calculator</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Investment Terms</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">SAFE Type</p>
                      <p className="text-lg font-medium">
                        {currentSafe.type === 'POST_MONEY' ? 'Post-Money' : 'Pre-Money'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Investment Amount</p>
                      <CurrencyDisplay value={currentSafe.investmentAmount} className="text-lg" />
                    </div>
                    {currentSafe.valuationCap && (
                      <div>
                        <p className="text-sm text-muted-foreground">Valuation Cap</p>
                        <CurrencyDisplay value={currentSafe.valuationCap} className="text-lg" />
                      </div>
                    )}
                    {currentSafe.discountRate !== undefined && (
                      <div>
                        <p className="text-sm text-muted-foreground">Discount Rate</p>
                        <PercentageDisplay value={currentSafe.discountRate} className="text-lg" />
                      </div>
                    )}
                  </div>

                  <Separator />

                  {currentSafe.terms && Object.keys(currentSafe.terms).length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium">Additional Terms</p>
                      <div className="rounded-lg bg-muted/50 p-4">
                        <pre className="text-sm">{JSON.stringify(currentSafe.terms, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {currentSafe.conversionDetails && (
                <Card>
                  <CardHeader>
                    <CardTitle>Conversion Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Shares Issued</p>
                        <p className="text-lg font-medium">
                          {currentSafe.conversionDetails.sharesIssued.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Conversion Date</p>
                        <p className="text-lg font-medium">
                          {format(
                            new Date(currentSafe.conversionDetails.conversionDate),
                            'MMM dd, yyyy'
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="calculator">
              {currentSafe.status === 'ACTIVE' ? (
                <ConversionCalculator
                  type="SAFE"
                  investmentAmount={currentSafe.investmentAmount}
                  valuationCap={currentSafe.valuationCap}
                  discountRate={currentSafe.discountRate}
                  onCalculate={handleCalculateConversion}
                />
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Calculator className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Conversion calculator is only available for active SAFE agreements
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="documents">
              <DocumentList
                documents={
                  currentSafe.documentUrls?.map((url, index) => ({
                    id: `${index}`,
                    name: `Document ${index + 1}`,
                    url,
                  })) || []
                }
                emptyMessage="No documents attached to this SAFE agreement"
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Parties
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentSafe.startup && (
                <div>
                  <p className="text-sm font-medium">Startup</p>
                  <p className="text-lg">{currentSafe.startup.name}</p>
                </div>
              )}
              {currentSafe.investor && (
                <div>
                  <p className="text-sm font-medium">Investor</p>
                  <p className="text-lg">{currentSafe.investor.name}</p>
                  <p className="text-sm text-muted-foreground">{currentSafe.investor.email}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={showDissolveDialog} onOpenChange={setShowDissolveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dissolve SAFE Agreement?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The SAFE agreement will be marked as dissolved and no
              further actions can be taken.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDissolve} disabled={dissolving}>
              {dissolving ? 'Dissolving...' : 'Dissolve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
