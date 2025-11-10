import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CurrencyDisplay } from './currency-display'
import { PercentageDisplay } from './percentage-display'
import { CheckCircle2, XCircle, FileText } from 'lucide-react'
import { format } from 'date-fns'

interface TermSheet {
  id: string
  version: number
  investmentAmount: number
  valuation: number
  pricePerShare: number
  boardSeats: number
  proRataRights: boolean
  liquidationPreference: number
  dividendRate?: number
  antidilutionProvision: 'FULL_RATCHET' | 'WEIGHTED_AVERAGE' | 'NONE'
  dragAlongRights: boolean
  tagAlongRights: boolean
  redemptionRights: boolean
  preemptiveRights: boolean
  coSaleRights: boolean
  noShopClause: boolean
  exclusivityPeriod: number
  status: 'DRAFT' | 'PROPOSED' | 'UNDER_NEGOTIATION' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  closingConditions: string[]
  expiryDate?: string
  acceptedAt?: string
  createdAt: string
}

interface TermSheetViewerProps {
  termSheet: TermSheet
}

export function TermSheetViewer({ termSheet }: TermSheetViewerProps) {
  const getStatusBadge = (status: TermSheet['status']) => {
    const variants = {
      DRAFT: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
      PROPOSED: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
      UNDER_NEGOTIATION: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
      ACCEPTED: 'bg-green-500/10 text-green-700 dark:text-green-400',
      REJECTED: 'bg-red-500/10 text-red-700 dark:text-red-400',
      EXPIRED: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
    }

    return (
      <Badge variant="secondary" className={variants[status]}>
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const RightIndicator = ({ hasRight }: { hasRight: boolean }) => (
    hasRight ? (
      <CheckCircle2 className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    )
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-muted-foreground" />
            <div>
              <CardTitle>Term Sheet v{termSheet.version}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Created {format(new Date(termSheet.createdAt), 'MMM dd, yyyy')}
              </p>
            </div>
          </div>
          {getStatusBadge(termSheet.status)}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Financial Terms */}
        <div>
          <h3 className="mb-3 font-semibold">Financial Terms</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Investment Amount</p>
              <CurrencyDisplay value={termSheet.investmentAmount} className="text-xl" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valuation</p>
              <CurrencyDisplay value={termSheet.valuation} className="text-xl" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Price Per Share</p>
              <CurrencyDisplay value={termSheet.pricePerShare} className="text-xl" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Liquidation Preference</p>
              <span className="text-xl font-medium">{termSheet.liquidationPreference}x</span>
            </div>
            {termSheet.dividendRate !== undefined && (
              <div>
                <p className="text-sm text-muted-foreground">Dividend Rate</p>
                <PercentageDisplay value={termSheet.dividendRate} className="text-xl" />
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Governance */}
        <div>
          <h3 className="mb-3 font-semibold">Governance</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Board Seats</span>
              <span className="font-medium">{termSheet.boardSeats}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Anti-Dilution Protection</span>
              <Badge variant="outline">
                {termSheet.antidilutionProvision.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Investor Rights */}
        <div>
          <h3 className="mb-3 font-semibold">Investor Rights</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Pro-Rata Rights</span>
              <RightIndicator hasRight={termSheet.proRataRights} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Drag-Along Rights</span>
              <RightIndicator hasRight={termSheet.dragAlongRights} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Tag-Along Rights</span>
              <RightIndicator hasRight={termSheet.tagAlongRights} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Redemption Rights</span>
              <RightIndicator hasRight={termSheet.redemptionRights} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Preemptive Rights</span>
              <RightIndicator hasRight={termSheet.preemptiveRights} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Co-Sale Rights</span>
              <RightIndicator hasRight={termSheet.coSaleRights} />
            </div>
          </div>
        </div>

        <Separator />

        {/* Terms & Conditions */}
        <div>
          <h3 className="mb-3 font-semibold">Terms & Conditions</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">No-Shop Clause</span>
              <RightIndicator hasRight={termSheet.noShopClause} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Exclusivity Period</span>
              <span className="font-medium">{termSheet.exclusivityPeriod} days</span>
            </div>
            {termSheet.expiryDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expiry Date</span>
                <span className="font-medium">
                  {format(new Date(termSheet.expiryDate), 'MMM dd, yyyy')}
                </span>
              </div>
            )}
          </div>
        </div>

        {termSheet.closingConditions.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="mb-3 font-semibold">Closing Conditions</h3>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {termSheet.closingConditions.map((condition, index) => (
                  <li key={index}>{condition}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
