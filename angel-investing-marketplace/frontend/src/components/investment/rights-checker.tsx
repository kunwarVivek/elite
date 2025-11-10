import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InvestorRight {
  name: string
  hasRight: boolean
  status: 'ACTIVE' | 'EXERCISED' | 'WAIVED' | 'EXPIRED'
  description?: string
  expiryDate?: string
}

interface RightsCheckerProps {
  rights: InvestorRight[]
  investorName?: string
  className?: string
}

export function RightsChecker({ rights, investorName, className }: RightsCheckerProps) {
  const getStatusBadge = (status: InvestorRight['status']) => {
    const variants = {
      ACTIVE: 'bg-green-500/10 text-green-700 dark:text-green-400',
      EXERCISED: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
      WAIVED: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
      EXPIRED: 'bg-red-500/10 text-red-700 dark:text-red-400',
    }

    return (
      <Badge variant="secondary" className={variants[status]}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </Badge>
    )
  }

  const getStatusIcon = (hasRight: boolean, status: InvestorRight['status']) => {
    if (!hasRight) {
      return <XCircle className="h-5 w-5 text-red-500" />
    }
    if (status === 'EXPIRED') {
      return <AlertCircle className="h-5 w-5 text-orange-500" />
    }
    return <CheckCircle2 className="h-5 w-5 text-green-500" />
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>
          {investorName ? `${investorName}'s Rights` : 'Investor Rights'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rights.map((right, index) => (
            <div
              key={index}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-3',
                !right.hasRight && 'opacity-60'
              )}
            >
              {getStatusIcon(right.hasRight, right.status)}
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{right.name}</h4>
                  {getStatusBadge(right.status)}
                </div>
                {right.description && (
                  <p className="text-sm text-muted-foreground">{right.description}</p>
                )}
                {right.expiryDate && right.status === 'ACTIVE' && (
                  <p className="text-xs text-muted-foreground">
                    Expires: {new Date(right.expiryDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
