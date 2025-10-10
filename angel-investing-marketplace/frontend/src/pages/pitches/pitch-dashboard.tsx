import { useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Plus,
  Search,
  Filter,
  TrendingUp,
  Eye,
  Users,
  DollarSign,
  Calendar,
  Activity,
  BarChart3,
  Settings,
} from 'lucide-react'
import { usePitches, usePitchStore } from '@/hooks/use-pitch'
import { PitchCard } from '@/components/pitches/pitch-card'
import { PitchStatusBadge } from '@/components/pitches/pitch-status-badge'
import { formatCurrency, formatRelativeTime, getPitchesStatistics } from '@/lib/pitch-utils'
import type { PitchStatus } from '@/types/pitch'

export function PitchDashboard() {
  const {
    pitches,
    isLoading,
    error,
    filters,
    setFilters,
    fetchPitches,
  } = usePitchStore()

  const { data: pitchesData } = usePitches(filters)

  useEffect(() => {
    fetchPitches()
  }, [fetchPitches])

  const handleStatusFilter = (status: string) => {
    if (status === 'all') {
      setFilters({ status: undefined })
    } else {
      setFilters({ status: [status as PitchStatus] })
    }
  }

  const handleSearch = (search: string) => {
    setFilters({ search: search || undefined, page: 1 })
  }

  const handleSort = (sortBy: string) => {
    setFilters({
      sort_by: sortBy as any,
      sort_order: filters.sort_order === 'asc' ? 'desc' : 'asc'
    })
  }

  const statistics = getPitchesStatistics(pitches)

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-6 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-destructive">
          <CardContent className="p-6 text-center">
            <p className="text-destructive mb-4">Failed to load pitches</p>
            <Button onClick={() => fetchPitches()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pitch Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your investment pitches and track their performance
          </p>
        </div>
        <Link to="/pitches/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create New Pitch
          </Button>
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pitches</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.total}</div>
            <p className="text-xs text-muted-foreground">
              Across all statuses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Pitches</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statistics.byStatus.ACTIVE || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently seeking investment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Funding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(statistics.totalFunding)}
            </div>
            <p className="text-xs text-muted-foreground">
              Combined funding goals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(statistics.averageViews)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per pitch
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pitches..."
                  className="pl-10"
                  value={filters.search || ''}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>

            <Select onValueChange={handleStatusFilter} defaultValue="all">
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="FUNDED">Funded</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select onValueChange={handleSort} value={filters.sort_by}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Date Created</SelectItem>
                <SelectItem value="updated_at">Last Updated</SelectItem>
                <SelectItem value="funding_amount">Funding Amount</SelectItem>
                <SelectItem value="view_count">View Count</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Status Overview Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">
            All Pitches ({statistics.total})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active ({statistics.byStatus.ACTIVE || 0})
          </TabsTrigger>
          <TabsTrigger value="draft">
            Drafts ({statistics.byStatus.DRAFT || 0})
          </TabsTrigger>
          <TabsTrigger value="funded">
            Funded ({statistics.byStatus.FUNDED || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {pitches.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No pitches yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first pitch to start attracting investors
                </p>
                <Link to="/pitches/create">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Pitch
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pitches.map((pitch) => (
                <Link key={pitch.id} to={`/pitches/${pitch.id}`}>
                  <PitchCard
                    pitch={pitch}
                    variant="default"
                    showActions={true}
                  />
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pitches
              .filter(pitch => pitch.status === 'ACTIVE')
              .map((pitch) => (
                <Link key={pitch.id} to={`/pitches/${pitch.id}`}>
                  <PitchCard
                    pitch={pitch}
                    variant="default"
                    showActions={true}
                  />
                </Link>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="draft" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pitches
              .filter(pitch => pitch.status === 'DRAFT')
              .map((pitch) => (
                <Link key={pitch.id} to={`/pitches/${pitch.id}/edit`}>
                  <PitchCard
                    pitch={pitch}
                    variant="default"
                    showActions={true}
                  />
                </Link>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="funded" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pitches
              .filter(pitch => pitch.status === 'FUNDED')
              .map((pitch) => (
                <Link key={pitch.id} to={`/pitches/${pitch.id}`}>
                  <PitchCard
                    pitch={pitch}
                    variant="featured"
                    showActions={false}
                  />
                </Link>
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      {pitches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks for managing your pitches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link to="/pitches/create">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Pitch
                </Button>
              </Link>

              <Link to="/pitches/analytics">
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
              </Link>

              <Button variant="outline" className="w-full justify-start">
                <Settings className="h-4 w-4 mr-2" />
                Pitch Settings
              </Button>

              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Investor Relations
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}