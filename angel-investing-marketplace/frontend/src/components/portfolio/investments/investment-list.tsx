import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  Search,
  Filter,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Eye,
  FileText,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react'
import { useInvestments, useInvestment } from '@/hooks/use-portfolio'
import { usePortfolioStore } from '@/stores/portfolio.store'
import { Investment, InvestmentStatus, InvestmentType, StartupStage } from '@/types/portfolio'
import { formatCurrency, formatPercentage, formatDate, getStatusColor, getStageColor, getPerformanceColor } from '@/lib/portfolio-utils'

interface InvestmentListProps {
  onInvestmentSelect?: (investment: Investment) => void
  showFilters?: boolean
}

function InvestmentTableRow({ investment, onSelect }: { investment: Investment; onSelect?: (investment: Investment) => void }) {
  const performance = investment.performance
  const isPositive = (performance?.total_return || 0) >= 0

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => onSelect?.(investment)}
    >
      <TableCell>
        <div>
          <div className="font-medium">{investment.pitch?.startup?.name || 'Unknown Startup'}</div>
          <div className="text-sm text-muted-foreground">
            {investment.pitch?.title || 'Investment'}
          </div>
        </div>
      </TableCell>

      <TableCell>
        <Badge className={getStatusColor(investment.status)}>
          {investment.status.replace(/_/g, ' ')}
        </Badge>
      </TableCell>

      <TableCell>
        <Badge variant="outline" className={getStageColor(investment.pitch?.startup?.stage || 'IDEA')}>
          {investment.pitch?.startup?.stage || 'Unknown'}
        </Badge>
      </TableCell>

      <TableCell className="text-right">
        <div className="font-medium">{formatCurrency(investment.amount)}</div>
        <div className="text-sm text-muted-foreground">
          {formatPercentage(investment.equity_percentage || 0)} equity
        </div>
      </TableCell>

      <TableCell className="text-right">
        <div className="font-medium">
          {formatCurrency(performance?.current_value || 0)}
        </div>
        <div className="text-sm text-muted-foreground">
          {formatDate(investment.investment_date || investment.created_at)}
        </div>
      </TableCell>

      <TableCell className="text-right">
        <div className={`font-medium ${getPerformanceColor(performance?.total_return || 0)}`}>
          {formatCurrency(performance?.total_return || 0)}
        </div>
        <div className={`text-sm ${getPerformanceColor((performance?.total_return_percentage || 0))}`}>
          {formatPercentage(performance?.total_return_percentage || 0)}
        </div>
      </TableCell>

      <TableCell className="text-right">
        <div className={`font-medium ${getPerformanceColor((performance?.multiple || 0) - 1)}`}>
          {(performance?.multiple || 0).toFixed(2)}x
        </div>
        {performance?.irr && (
          <div className={`text-sm ${getPerformanceColor(performance.irr)}`}>
            {formatPercentage(performance.irr)} IRR
          </div>
        )}
      </TableCell>

      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onSelect?.(investment)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FileText className="h-4 w-4 mr-2" />
              Documents
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ExternalLink className="h-4 w-4 mr-2" />
              Company Website
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

function InvestmentTableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-8 w-8" /></TableCell>
        </TableRow>
      ))}
    </>
  )
}

export function InvestmentList({ onInvestmentSelect, showFilters = true }: InvestmentListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('investment_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const {
    investmentFilters,
    investmentSort,
    setInvestmentFilters,
    setInvestmentSort
  } = usePortfolioStore()

  // Build filters object
  const filters = useMemo(() => {
    const filterObj: any = {}

    if (statusFilter !== 'all') {
      filterObj.status = [statusFilter as InvestmentStatus]
    }

    if (stageFilter !== 'all') {
      filterObj.startup_stage = [stageFilter as StartupStage]
    }

    return filterObj
  }, [statusFilter, stageFilter])

  // Build sort object
  const sort = useMemo(() => ({
    field: sortBy as any,
    direction: sortOrder
  }), [sortBy, sortOrder])

  const {
    data: investmentsResponse,
    isLoading,
    error,
    refetch
  } = useInvestments(filters, sort, 1, 50)

  const investments = investmentsResponse?.data || []

  // Filter investments based on search term
  const filteredInvestments = useMemo(() => {
    if (!searchTerm) return investments

    return investments.filter(investment =>
      investment.pitch?.startup?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      investment.pitch?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      investment.status.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [investments, searchTerm])

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Investment Portfolio</CardTitle>
          <CardDescription>
            Manage and track your startup investments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Unable to load investments</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Investment Portfolio</CardTitle>
            <CardDescription>
              Manage and track your startup investments
            </CardDescription>
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredInvestments.length} investment{filteredInvestments.length !== 1 ? 's' : ''}
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search investments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="ESCROW">Escrow</SelectItem>
                </SelectContent>
              </Select>

              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="IDEA">Idea</SelectItem>
                  <SelectItem value="PROTOTYPE">Prototype</SelectItem>
                  <SelectItem value="MVP">MVP</SelectItem>
                  <SelectItem value="GROWTH">Growth</SelectItem>
                  <SelectItem value="SCALE">Scale</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Startup</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right cursor-pointer" onClick={() => handleSort('amount')}>
                  Invested {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-right cursor-pointer" onClick={() => handleSort('current_value')}>
                  Current Value {sortBy === 'current_value' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-right cursor-pointer" onClick={() => handleSort('performance')}>
                  P&L {sortBy === 'performance' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-right">Multiple</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <InvestmentTableSkeleton />
              ) : filteredInvestments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchTerm || statusFilter !== 'all' || stageFilter !== 'all' ? (
                      <div>
                        <p>No investments match your filters</p>
                        <Button
                          variant="link"
                          onClick={() => {
                            setSearchTerm('')
                            setStatusFilter('all')
                            setStageFilter('all')
                          }}
                        >
                          Clear filters
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No investments yet</p>
                        <p className="text-sm">Start investing in startups to see them here</p>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvestments.map((investment) => (
                  <InvestmentTableRow
                    key={investment.id}
                    investment={investment}
                    onSelect={onInvestmentSelect}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}