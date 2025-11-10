import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useSafeStore } from '@/stores/safe-store'
import { useAuthStore } from '@/stores/auth-store'
import { AgreementCard } from '@/components/investment'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Filter } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useState } from 'react'

export const Route = createFileRoute('/safes/')({
  component: SafesListPage,
})

function SafesListPage() {
  const { user } = useAuthStore()
  const { safes, isLoading, fetchSafesByInvestor, fetchSafesByStartup } = useSafeStore()
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    if (user?.role === 'INVESTOR') {
      fetchSafesByInvestor(user.id)
    } else if (user?.role === 'FOUNDER') {
      // Assuming user has startupId
      const startupId = (user as any).startupId
      if (startupId) {
        fetchSafesByStartup(startupId)
      }
    }
  }, [user])

  const filteredSafes =
    statusFilter === 'all' ? safes : safes.filter((safe) => safe.status === statusFilter)

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SAFE Agreements</h1>
          <p className="text-muted-foreground">
            Manage your Simple Agreements for Future Equity
          </p>
        </div>
        {user?.role === 'FOUNDER' && (
          <Link to="/safes/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New SAFE
            </Button>
          </Link>
        )}
      </div>

      <div className="mb-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="CONVERTED">Converted</SelectItem>
              <SelectItem value="DISSOLVED">Dissolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-[300px]" />
          ))}
        </div>
      ) : filteredSafes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <h3 className="mb-2 text-lg font-semibold">No SAFE agreements found</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {statusFilter !== 'all'
              ? 'Try changing the filter to see more results'
              : 'Get started by creating your first SAFE agreement'}
          </p>
          {user?.role === 'FOUNDER' && statusFilter === 'all' && (
            <Link to="/safes/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create SAFE Agreement
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSafes.map((safe) => (
            <Link key={safe.id} to="/safes/$id" params={{ id: safe.id }}>
              <AgreementCard
                type="SAFE"
                id={safe.id}
                investmentAmount={safe.investmentAmount}
                status={safe.status}
                createdAt={safe.createdAt}
                investor={safe.investor}
                startup={safe.startup}
                valuationCap={safe.valuationCap}
                discountRate={safe.discountRate}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
