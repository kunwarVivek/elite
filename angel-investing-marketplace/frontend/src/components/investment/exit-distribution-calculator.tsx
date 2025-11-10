import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CurrencyDisplay } from './currency-display'
import { PercentageDisplay } from './percentage-display'
import { Badge } from '@/components/ui/badge'
import { TrendingUp } from 'lucide-react'

interface DistributionEntry {
  stakeholderId: string
  stakeholderName: string
  stakeholderType: string
  liquidationPreference: number
  liquidationPayout: number
  remainingProceeds: number
  participationPayout: number
  totalPayout: number
  returnMultiple: number
}

interface WaterfallAnalysis {
  exitProceeds: number
  totalDistributed: number
  distributions: DistributionEntry[]
  remainingProceeds: number
}

interface ExitDistributionCalculatorProps {
  analysis: WaterfallAnalysis
  title?: string
}

export function ExitDistributionCalculator({
  analysis,
  title = 'Exit Distribution Waterfall',
}: ExitDistributionCalculatorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>
          Distribution of exit proceeds according to liquidation preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Exit Proceeds</p>
            <CurrencyDisplay value={analysis.exitProceeds} className="text-2xl" />
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total Distributed</p>
            <CurrencyDisplay value={analysis.totalDistributed} className="text-2xl" />
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Remaining</p>
            <CurrencyDisplay value={analysis.remainingProceeds} className="text-2xl" />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stakeholder</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Liquidation Pref.</TableHead>
                <TableHead className="text-right">Participation</TableHead>
                <TableHead className="text-right">Total Payout</TableHead>
                <TableHead className="text-right">Return Multiple</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analysis.distributions.map((dist) => (
                <TableRow key={dist.stakeholderId}>
                  <TableCell className="font-medium">{dist.stakeholderName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {dist.stakeholderType.charAt(0) +
                        dist.stakeholderType.slice(1).toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <CurrencyDisplay value={dist.liquidationPayout} />
                  </TableCell>
                  <TableCell className="text-right">
                    <CurrencyDisplay value={dist.participationPayout} />
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    <CurrencyDisplay value={dist.totalPayout} />
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-medium">{dist.returnMultiple.toFixed(2)}x</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
