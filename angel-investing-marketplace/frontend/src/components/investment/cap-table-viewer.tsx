import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

interface CapTableEntry {
  id: string
  stakeholderName: string
  stakeholderType: 'FOUNDER' | 'INVESTOR' | 'EMPLOYEE' | 'ADVISOR'
  securityType: 'COMMON' | 'PREFERRED' | 'OPTION' | 'WARRANT' | 'SAFE' | 'CONVERTIBLE_NOTE'
  sharesOwned: number
  ownershipPercentage: number
  pricePerShare?: number
  investmentAmount?: number
}

interface CapTableViewerProps {
  entries: CapTableEntry[]
  totalShares: number
  postMoneyValuation?: number
  title?: string
  showInvestmentAmount?: boolean
}

export function CapTableViewer({
  entries,
  totalShares,
  postMoneyValuation,
  title = 'Capitalization Table',
  showInvestmentAmount = true,
}: CapTableViewerProps) {
  const getStakeholderTypeBadge = (type: CapTableEntry['stakeholderType']) => {
    const variants: Record<CapTableEntry['stakeholderType'], string> = {
      FOUNDER: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
      INVESTOR: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
      EMPLOYEE: 'bg-green-500/10 text-green-700 dark:text-green-400',
      ADVISOR: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
    }

    return (
      <Badge variant="secondary" className={variants[type]}>
        {type.charAt(0) + type.slice(1).toLowerCase()}
      </Badge>
    )
  }

  const getSecurityTypeBadge = (type: CapTableEntry['securityType']) => {
    return (
      <Badge variant="outline">
        {type === 'CONVERTIBLE_NOTE' ? 'Conv. Note' : type.charAt(0) + type.slice(1).toLowerCase()}
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Shares</p>
            <p className="text-lg font-semibold">{totalShares.toLocaleString()}</p>
            {postMoneyValuation && (
              <>
                <p className="text-sm text-muted-foreground mt-2">Post-Money Valuation</p>
                <CurrencyDisplay value={postMoneyValuation} className="text-lg" />
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stakeholder</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Security</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Ownership %</TableHead>
                {showInvestmentAmount && (
                  <TableHead className="text-right">Investment</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.stakeholderName}</TableCell>
                  <TableCell>{getStakeholderTypeBadge(entry.stakeholderType)}</TableCell>
                  <TableCell>{getSecurityTypeBadge(entry.securityType)}</TableCell>
                  <TableCell className="text-right">
                    {entry.sharesOwned.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <PercentageDisplay value={entry.ownershipPercentage} />
                  </TableCell>
                  {showInvestmentAmount && (
                    <TableCell className="text-right">
                      {entry.investmentAmount ? (
                        <CurrencyDisplay value={entry.investmentAmount} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
