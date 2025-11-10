import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Search, MoreVertical, XCircle, Edit, Eye, ArrowLeft, DollarSign, TrendingUp, Users, CreditCard } from 'lucide-react'
import { format } from 'date-fns'

export const Route = createFileRoute('/admin/subscriptions')({
  component: AdminSubscriptionsPage,
})

function AdminSubscriptionsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [dialogAction, setDialogAction] = useState<'cancel' | 'refund' | null>(null)

  // Mock data - replace with actual API call
  const subscriptions = [
    {
      id: '1',
      user: { name: 'John Doe', email: 'john@example.com' },
      plan: 'Investor Pro',
      planTier: 'PRO',
      status: 'ACTIVE',
      price: 49,
      billingInterval: 'MONTHLY',
      currentPeriodStart: new Date('2025-01-01'),
      currentPeriodEnd: new Date('2025-02-01'),
      createdAt: new Date('2024-06-15'),
      cancelAtPeriodEnd: false,
    },
    {
      id: '2',
      user: { name: 'Jane Smith', email: 'jane@example.com' },
      plan: 'Founder Growth',
      planTier: 'GROWTH',
      status: 'ACTIVE',
      price: 159,
      billingInterval: 'ANNUAL',
      currentPeriodStart: new Date('2025-01-10'),
      currentPeriodEnd: new Date('2026-01-10'),
      createdAt: new Date('2024-08-20'),
      cancelAtPeriodEnd: false,
    },
    {
      id: '3',
      user: { name: 'Mike Johnson', email: 'mike@example.com' },
      plan: 'Investor Pro',
      planTier: 'PRO',
      status: 'TRIALING',
      price: 49,
      billingInterval: 'MONTHLY',
      currentPeriodStart: new Date('2025-01-05'),
      currentPeriodEnd: new Date('2025-01-19'),
      createdAt: new Date('2025-01-05'),
      cancelAtPeriodEnd: false,
    },
    {
      id: '4',
      user: { name: 'Sarah Williams', email: 'sarah@example.com' },
      plan: 'Investor Pro',
      planTier: 'PRO',
      status: 'PAST_DUE',
      price: 49,
      billingInterval: 'MONTHLY',
      currentPeriodStart: new Date('2024-12-15'),
      currentPeriodEnd: new Date('2025-01-15'),
      createdAt: new Date('2024-05-10'),
      cancelAtPeriodEnd: false,
    },
    {
      id: '5',
      user: { name: 'David Brown', email: 'david@example.com' },
      plan: 'Founder Growth',
      planTier: 'GROWTH',
      status: 'CANCELED',
      price: 199,
      billingInterval: 'MONTHLY',
      currentPeriodStart: new Date('2024-12-01'),
      currentPeriodEnd: new Date('2025-01-01'),
      createdAt: new Date('2024-03-15'),
      cancelAtPeriodEnd: true,
    },
  ]

  // Revenue metrics
  const metrics = {
    totalMRR: 11950,
    totalARR: 143400,
    activeSubscriptions: 152,
    trialingSubscriptions: 23,
  }

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch =
      sub.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.plan.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPlan = planFilter === 'all' || sub.planTier === planFilter
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter
    return matchesSearch && matchesPlan && matchesStatus
  })

  const getPlanBadgeColor = (tier: string) => {
    switch (tier) {
      case 'FREE':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
      case 'PRO':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      case 'GROWTH':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
      case 'ENTERPRISE':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
      case 'TRIALING':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      case 'PAST_DUE':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
      case 'CANCELED':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
      case 'UNPAID':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  const handleCancelSubscription = (subscription: any) => {
    setSelectedSubscription(subscription)
    setDialogAction('cancel')
    setShowDialog(true)
  }

  const handleRefund = (subscription: any) => {
    setSelectedSubscription(subscription)
    setDialogAction('refund')
    setShowDialog(true)
  }

  const confirmAction = () => {
    // TODO: Implement actual API call
    setShowDialog(false)
    setSelectedSubscription(null)
    setDialogAction(null)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Subscription Management</h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                {filteredSubscriptions.length} subscriptions found
              </p>
            </div>
          </div>
        </div>

        {/* Revenue Metrics */}
        <div className="mb-6 grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${metrics.totalMRR.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+12.3%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Annual Recurring Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${metrics.totalARR.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+18.5%</span> from last year
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeSubscriptions}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+8</span> this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trial Subscriptions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.trialingSubscriptions}</div>
              <p className="text-xs text-muted-foreground">
                Conversion rate: <span className="text-blue-600">12.5%</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  placeholder="Search by user, email, or plan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="FREE">Free</SelectItem>
                  <SelectItem value="PRO">Investor Pro</SelectItem>
                  <SelectItem value="GROWTH">Founder Growth</SelectItem>
                  <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="TRIALING">Trialing</SelectItem>
                  <SelectItem value="PAST_DUE">Past Due</SelectItem>
                  <SelectItem value="CANCELED">Canceled</SelectItem>
                  <SelectItem value="UNPAID">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Subscriptions Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Current Period</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{subscription.user.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {subscription.user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPlanBadgeColor(subscription.planTier)} variant="secondary">
                        {subscription.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(subscription.status)} variant="secondary">
                        {subscription.status}
                      </Badge>
                      {subscription.cancelAtPeriodEnd && (
                        <div className="mt-1 text-xs text-orange-600">Cancels at period end</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        ${subscription.price}
                        <span className="text-xs text-gray-500">
                          /{subscription.billingInterval === 'MONTHLY' ? 'mo' : 'yr'}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm capitalize">
                        {subscription.billingInterval.toLowerCase()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{format(subscription.currentPeriodStart, 'MMM dd, yyyy')}</div>
                        <div className="text-gray-500">to {format(subscription.currentPeriodEnd, 'MMM dd, yyyy')}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {format(subscription.createdAt, 'MMM dd, yyyy')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Modify Plan
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {subscription.status === 'ACTIVE' && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleCancelSubscription(subscription)}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancel Subscription
                            </DropdownMenuItem>
                          )}
                          {subscription.status === 'PAST_DUE' && (
                            <DropdownMenuItem
                              className="text-orange-600"
                              onClick={() => handleRefund(subscription)}
                            >
                              <DollarSign className="mr-2 h-4 w-4" />
                              Issue Refund
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Action Confirmation Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {dialogAction === 'cancel' ? 'Cancel Subscription' : 'Issue Refund'}
              </DialogTitle>
              <DialogDescription>
                {dialogAction === 'cancel' ? (
                  <>
                    Are you sure you want to cancel the subscription for {selectedSubscription?.user.name}?
                    They will retain access until the end of their current billing period on{' '}
                    {selectedSubscription?.currentPeriodEnd && format(selectedSubscription.currentPeriodEnd, 'MMM dd, yyyy')}.
                  </>
                ) : (
                  <>
                    Issue a refund for {selectedSubscription?.user.name}? This will refund ${selectedSubscription?.price}
                    and cancel their subscription immediately.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmAction}>
                {dialogAction === 'cancel' ? 'Cancel Subscription' : 'Issue Refund'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
