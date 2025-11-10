import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CurrencyDisplay } from './currency-display'
import { PercentageDisplay } from './percentage-display'
import { InvestmentStatusBadge } from './investment-status-badge'
import { FileText, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'

interface AgreementCardProps {
  type: 'SAFE' | 'NOTE'
  id: string
  investmentAmount: number
  status: any
  createdAt: string
  investor?: {
    name: string
    email: string
  }
  startup?: {
    name: string
  }
  valuationCap?: number
  discountRate?: number
  interestRate?: number
  maturityDate?: string
  onView?: () => void
  onConvert?: () => void
  onEdit?: () => void
}

export function AgreementCard({
  type,
  id,
  investmentAmount,
  status,
  createdAt,
  investor,
  startup,
  valuationCap,
  discountRate,
  interestRate,
  maturityDate,
  onView,
  onConvert,
  onEdit,
}: AgreementCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">
                {type === 'SAFE' ? 'SAFE Agreement' : 'Convertible Note'}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {format(new Date(createdAt), 'MMM dd, yyyy')}
            </p>
          </div>
          <InvestmentStatusBadge status={status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Investment Amount</p>
            <CurrencyDisplay value={investmentAmount} className="text-lg" />
          </div>

          {type === 'SAFE' && valuationCap && (
            <div>
              <p className="text-sm text-muted-foreground">Valuation Cap</p>
              <CurrencyDisplay value={valuationCap} className="text-lg" />
            </div>
          )}

          {type === 'SAFE' && discountRate !== undefined && (
            <div>
              <p className="text-sm text-muted-foreground">Discount Rate</p>
              <PercentageDisplay value={discountRate} className="text-lg" />
            </div>
          )}

          {type === 'NOTE' && interestRate !== undefined && (
            <div>
              <p className="text-sm text-muted-foreground">Interest Rate</p>
              <PercentageDisplay value={interestRate} className="text-lg" />
            </div>
          )}

          {type === 'NOTE' && maturityDate && (
            <div>
              <p className="text-sm text-muted-foreground">Maturity Date</p>
              <p className="text-lg font-medium">
                {format(new Date(maturityDate), 'MMM dd, yyyy')}
              </p>
            </div>
          )}
        </div>

        {investor && (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm font-medium">{investor.name}</p>
            <p className="text-xs text-muted-foreground">{investor.email}</p>
          </div>
        )}

        {startup && (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm font-medium">{startup.name}</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        {onView && (
          <Button variant="outline" size="sm" onClick={onView}>
            <ExternalLink className="mr-2 h-4 w-4" />
            View Details
          </Button>
        )}
        {onConvert && status === 'ACTIVE' && (
          <Button variant="default" size="sm" onClick={onConvert}>
            Convert
          </Button>
        )}
        {onEdit && status === 'ACTIVE' && (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
