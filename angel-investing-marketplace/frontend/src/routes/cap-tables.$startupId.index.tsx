import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useCapTableStore } from '@/stores/cap-table-store'
import { CapTableViewer, FinancialMetricCard } from '@/components/investment'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Download, TrendingUp, Users, DollarSign } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/cap-tables/$startupId/')({
  component: CapTablePage,
})

function CapTablePage() {
  const { startupId } = Route.useParams()
  const { currentCapTable, isLoading, fetchByStartup, exportToCarta } = useCapTableStore()

  useEffect(() => {
    fetchByStartup(startupId)
  }, [startupId])

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const result = await exportToCarta(currentCapTable?.id || '', format)
      // Handle download
      const blob = new Blob([JSON.stringify(result, null, 2)], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cap-table-${startupId}.${format}`
      a.click()
      toast.success(`Cap table exported as ${format.toUpperCase()}`)
    } catch (error) {
      toast.error('Failed to export cap table')
    }
  }

  if (isLoading || !currentCapTable) {
    return (
      <div className="container mx-auto py-8">
        <Skeleton className="mb-8 h-10 w-64" />
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-[600px]" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cap Table</h1>
          <p className="text-muted-foreground">
            Version {currentCapTable.version} • Last updated:{' '}
            {new Date(currentCapTable.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/cap-tables/$startupId/dilution" params={{ startupId }}>
            <Button variant="outline">
              <TrendingUp className="mr-2 h-4 w-4" />
              Dilution Analysis
            </Button>
          </Link>
          <Link to="/cap-tables/$startupId/waterfall" params={{ startupId }}>
            <Button variant="outline">
              <DollarSign className="mr-2 h-4 w-4" />
              Waterfall Analysis
            </Button>
          </Link>
          <Button variant="outline" onClick={() => handleExport('json')}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <FinancialMetricCard
          title="Total Shares Outstanding"
          value={currentCapTable.totalShares}
          type="number"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <FinancialMetricCard
          title="Fully Diluted Shares"
          value={currentCapTable.fullyDilutedShares}
          type="number"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        {currentCapTable.postMoneyValuation && (
          <FinancialMetricCard
            title="Post-Money Valuation"
            value={currentCapTable.postMoneyValuation}
            type="currency"
            icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          />
        )}
      </div>

      <Tabs defaultValue="current">
        <TabsList>
          <TabsTrigger value="current">Current Cap Table</TabsTrigger>
          <TabsTrigger value="fully-diluted">Fully Diluted</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="mt-6">
          <CapTableViewer
            entries={currentCapTable.entries.map((entry) => ({
              id: entry.id,
              stakeholderName: entry.stakeholder.name,
              stakeholderType: entry.stakeholderType,
              securityType: entry.securityType,
              sharesOwned: entry.sharesOwned,
              ownershipPercentage: entry.ownershipPercentage,
              pricePerShare: entry.pricePerShare,
              investmentAmount: entry.investmentAmount,
            }))}
            totalShares={currentCapTable.totalShares}
            postMoneyValuation={currentCapTable.postMoneyValuation}
            title="Current Ownership"
            showInvestmentAmount={true}
          />
        </TabsContent>

        <TabsContent value="fully-diluted" className="mt-6">
          <CapTableViewer
            entries={currentCapTable.entries.map((entry) => ({
              id: entry.id,
              stakeholderName: entry.stakeholder.name,
              stakeholderType: entry.stakeholderType,
              securityType: entry.securityType,
              sharesOwned: entry.sharesOwned,
              ownershipPercentage:
                (entry.sharesOwned / currentCapTable.fullyDilutedShares) * 100,
              pricePerShare: entry.pricePerShare,
              investmentAmount: entry.investmentAmount,
            }))}
            totalShares={currentCapTable.fullyDilutedShares}
            postMoneyValuation={currentCapTable.postMoneyValuation}
            title="Fully Diluted Ownership"
            showInvestmentAmount={true}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
