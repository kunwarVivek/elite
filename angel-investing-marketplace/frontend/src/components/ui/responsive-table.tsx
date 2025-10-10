import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, MoreHorizontal } from 'lucide-react'

interface Column<T> {
  key: string
  header: string
  accessor: (item: T) => React.ReactNode
  sortable?: boolean
  className?: string
  mobileHidden?: boolean
}

interface ResponsiveTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyField: keyof T
  title?: string
  emptyMessage?: string
  onSort?: (key: string, direction: 'asc' | 'desc') => void
  sortKey?: string
  sortDirection?: 'asc' | 'desc'
  className?: string
}

export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  title,
  emptyMessage = 'No data available',
  onSort,
  sortKey,
  sortDirection,
  className,
}: ResponsiveTableProps<T>) {
  if (data.length === 0) {
    return (
      <Card className={className}>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            {emptyMessage}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">{title}</h3>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      'h-12 px-4 text-left align-middle font-medium text-muted-foreground',
                      column.className
                    )}
                  >
                    {column.sortable ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground"
                        onClick={() => onSort?.(column.key, sortDirection === 'asc' ? 'desc' : 'asc')}
                      >
                        {column.header}
                        {sortKey === column.key && (
                          sortDirection === 'asc' ?
                            <ChevronUp className="ml-1 h-3 w-3" /> :
                            <ChevronDown className="ml-1 h-3 w-3" />
                        )}
                      </Button>
                    ) : (
                      column.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={String(item[keyField])} className="border-b transition-colors hover:bg-muted/50">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'p-4 align-middle',
                        column.className
                      )}
                    >
                      {column.accessor(item)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {data.map((item) => (
          <Card key={String(item[keyField])} className="p-4">
            <div className="space-y-3">
              {columns
                .filter(column => !column.mobileHidden)
                .map((column, index) => {
                  const isFirst = index === 0
                  const isLast = index === columns.filter(col => !col.mobileHidden).length - 1

                  return (
                    <div
                      key={column.key}
                      className={cn(
                        'flex items-center justify-between',
                        !isLast && 'pb-3 border-b border-border/50'
                      )}
                    >
                      <span className={cn(
                        'font-medium text-muted-foreground',
                        isFirst && 'text-foreground'
                      )}>
                        {column.header}:
                      </span>
                      <div className="text-right">
                        {column.accessor(item)}
                      </div>
                    </div>
                  )
                })}
            </div>
          </Card>
        ))}
      </div>

      {/* Tablet View - Hybrid approach */}
      <div className="hidden md:block lg:hidden">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(columns.length, 3)}, 1fr)` }}>
          {data.map((item) => (
            <Card key={String(item[keyField])} className="p-4">
              <div className="space-y-2">
                {columns.slice(0, 6).map((column) => (
                  <div key={column.key} className="flex justify-between items-center text-sm">
                    <span className="font-medium text-muted-foreground truncate mr-2">
                      {column.header}:
                    </span>
                    <div className="flex-shrink-0">
                      {column.accessor(item)}
                    </div>
                  </div>
                ))}
                {columns.length > 6 && (
                  <div className="pt-2 border-t">
                    <Button variant="ghost" size="sm" className="w-full">
                      <MoreHorizontal className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

// Specialized table components for common use cases
export function InvestmentTable({ data, ...props }: Omit<ResponsiveTableProps<any>, 'columns'>) {
  const columns = [
    {
      key: 'startup',
      header: 'Startup',
      accessor: (item: any) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <span className="text-xs font-medium text-primary">
              {item.name?.charAt(0) || 'S'}
            </span>
          </div>
          <div>
            <div className="font-medium">{item.name}</div>
            <div className="text-sm text-muted-foreground">{item.sector}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Investment',
      accessor: (item: any) => (
        <div className="text-right">
          <div className="font-medium">${item.amount?.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">{item.shares} shares</div>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      accessor: (item: any) => new Date(item.date).toLocaleDateString(),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (item: any) => (
        <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
          {item.status}
        </Badge>
      ),
      mobileHidden: true,
    },
  ]

  return <ResponsiveTable data={data} columns={columns} {...props} />
}

export function PortfolioTable({ data, ...props }: Omit<ResponsiveTableProps<any>, 'columns'>) {
  const columns = [
    {
      key: 'company',
      header: 'Company',
      accessor: (item: any) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <span className="text-xs font-medium text-primary">
              {item.name?.charAt(0) || 'C'}
            </span>
          </div>
          <div>
            <div className="font-medium">{item.name}</div>
            <div className="text-sm text-muted-foreground">{item.sector}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'value',
      header: 'Current Value',
      accessor: (item: any) => (
        <div className="text-right">
          <div className="font-medium">${item.currentValue?.toLocaleString()}</div>
          <div className={`text-sm ${item.gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {item.gain >= 0 ? '+' : ''}{item.gain}%
          </div>
        </div>
      ),
    },
    {
      key: 'invested',
      header: 'Invested',
      accessor: (item: any) => `$${item.invested?.toLocaleString()}`,
      mobileHidden: true,
    },
    {
      key: 'lastUpdate',
      header: 'Last Update',
      accessor: (item: any) => new Date(item.lastUpdate).toLocaleDateString(),
      mobileHidden: true,
    },
  ]

  return <ResponsiveTable data={data} columns={columns} {...props} />
}