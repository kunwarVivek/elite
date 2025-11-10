import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Building2,
  User,
  FileText,
} from 'lucide-react'
import { format } from 'date-fns'

export const Route = createFileRoute('/admin/approvals')({
  component: AdminApprovalsPage,
})

function AdminApprovalsPage() {
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [dialogAction, setDialogAction] = useState<'approve' | 'reject' | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  // Mock data - replace with actual API call
  const pendingStartups = [
    {
      id: '1',
      type: 'STARTUP_VERIFICATION',
      companyName: 'TechVenture AI',
      founder: 'Sarah Johnson',
      email: 'sarah@techventure.ai',
      description: 'AI-powered customer service automation platform',
      industry: 'AI/ML',
      stage: 'SEED',
      fundingTarget: 500000,
      submittedAt: new Date('2025-01-08'),
      priority: 'HIGH',
      documents: ['pitch_deck.pdf', 'financials.xlsx', 'incorporation_docs.pdf'],
    },
    {
      id: '2',
      type: 'STARTUP_VERIFICATION',
      companyName: 'HealthTech Solutions',
      founder: 'Michael Chen',
      email: 'michael@healthtech.io',
      description: 'Telemedicine platform for rural healthcare',
      industry: 'Healthcare',
      stage: 'PRE_SEED',
      fundingTarget: 250000,
      submittedAt: new Date('2025-01-09'),
      priority: 'MEDIUM',
      documents: ['pitch_deck.pdf', 'team_bios.pdf'],
    },
    {
      id: '3',
      type: 'STARTUP_VERIFICATION',
      companyName: 'GreenEnergy Systems',
      founder: 'Emma Davis',
      email: 'emma@greenenergy.com',
      description: 'Solar panel installation marketplace',
      industry: 'Clean Energy',
      stage: 'SEED',
      fundingTarget: 1000000,
      submittedAt: new Date('2025-01-10'),
      priority: 'HIGH',
      documents: ['pitch_deck.pdf', 'market_analysis.pdf', 'patents.pdf'],
    },
  ]

  const pendingInvestors = [
    {
      id: '4',
      type: 'INVESTOR_VERIFICATION',
      name: 'Robert Anderson',
      email: 'robert@anderson.com',
      accreditationType: 'NET_WORTH',
      investmentRange: '$50K - $100K',
      industries: ['SaaS', 'Fintech'],
      submittedAt: new Date('2025-01-09'),
      priority: 'MEDIUM',
      documents: ['bank_statement.pdf', 'tax_returns_2024.pdf'],
    },
    {
      id: '5',
      type: 'INVESTOR_VERIFICATION',
      name: 'Lisa Martinez',
      email: 'lisa@martinez-ventures.com',
      accreditationType: 'INCOME',
      investmentRange: '$100K - $500K',
      industries: ['Healthcare', 'AI/ML', 'Climate'],
      submittedAt: new Date('2025-01-10'),
      priority: 'HIGH',
      documents: ['income_verification.pdf', 'investment_history.pdf'],
    },
  ]

  const recentlyProcessed = [
    {
      id: '6',
      type: 'STARTUP_VERIFICATION',
      companyName: 'DataFlow Analytics',
      status: 'APPROVED',
      processedAt: new Date('2025-01-07'),
      processedBy: 'Admin User',
    },
    {
      id: '7',
      type: 'INVESTOR_VERIFICATION',
      name: 'James Wilson',
      status: 'REJECTED',
      rejectionReason: 'Unable to verify accreditation status',
      processedAt: new Date('2025-01-07'),
      processedBy: 'Admin User',
    },
    {
      id: '8',
      type: 'STARTUP_VERIFICATION',
      companyName: 'MobileFirst Apps',
      status: 'APPROVED',
      processedAt: new Date('2025-01-06'),
      processedBy: 'Admin User',
    },
  ]

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
      case 'LOW':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
      case 'REJECTED':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  const handleApprove = (item: any) => {
    setSelectedItem(item)
    setDialogAction('approve')
    setShowDialog(true)
  }

  const handleReject = (item: any) => {
    setSelectedItem(item)
    setDialogAction('reject')
    setRejectionReason('')
    setShowDialog(true)
  }

  const confirmAction = () => {
    // TODO: Implement actual API call
    console.log(dialogAction, selectedItem, rejectionReason)
    setShowDialog(false)
    setSelectedItem(null)
    setDialogAction(null)
    setRejectionReason('')
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Approval Queue</h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Review and approve pending verifications
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Startups</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingStartups.length}</div>
              <p className="text-xs text-muted-foreground">
                {pendingStartups.filter((s) => s.priority === 'HIGH').length} high priority
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Investors</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingInvestors.length}</div>
              <p className="text-xs text-muted-foreground">
                {pendingInvestors.filter((i) => i.priority === 'HIGH').length} high priority
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Review Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2.3 hrs</div>
              <p className="text-xs text-muted-foreground">Target: &lt; 4 hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">87%</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="startups" className="space-y-6">
          <TabsList>
            <TabsTrigger value="startups">
              Pending Startups ({pendingStartups.length})
            </TabsTrigger>
            <TabsTrigger value="investors">
              Pending Investors ({pendingInvestors.length})
            </TabsTrigger>
            <TabsTrigger value="history">Recently Processed</TabsTrigger>
          </TabsList>

          {/* Pending Startups Tab */}
          <TabsContent value="startups" className="space-y-4">
            {pendingStartups.map((startup) => (
              <Card key={startup.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-xl">{startup.companyName}</CardTitle>
                        <Badge className={getPriorityBadgeColor(startup.priority)} variant="secondary">
                          {startup.priority}
                        </Badge>
                        <Badge variant="outline">{startup.stage}</Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>
                          <strong>Founder:</strong> {startup.founder}
                        </span>
                        <span>•</span>
                        <span>{startup.email}</span>
                        <span>•</span>
                        <span>
                          <strong>Industry:</strong> {startup.industry}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        Submitted {format(startup.submittedAt, 'MMM dd, yyyy')}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{startup.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Funding Target:</span>
                    <span className="text-lg font-bold text-blue-600">
                      ${startup.fundingTarget.toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <FileText className="h-4 w-4" />
                      Documents ({startup.documents.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {startup.documents.map((doc, index) => (
                        <Button key={index} variant="outline" size="sm">
                          {doc}
                          <ExternalLink className="ml-2 h-3 w-3" />
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={() => handleApprove(startup)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReject(startup)}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Pending Investors Tab */}
          <TabsContent value="investors" className="space-y-4">
            {pendingInvestors.map((investor) => (
              <Card key={investor.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-xl">{investor.name}</CardTitle>
                        <Badge className={getPriorityBadgeColor(investor.priority)} variant="secondary">
                          {investor.priority}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span>{investor.email}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        Submitted {format(investor.submittedAt, 'MMM dd, yyyy')}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Accreditation Type
                      </div>
                      <div className="mt-1 text-base font-medium">
                        {investor.accreditationType === 'NET_WORTH' ? 'Net Worth' : 'Income'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Investment Range
                      </div>
                      <div className="mt-1 text-base font-medium">{investor.investmentRange}</div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                      Investment Interests
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {investor.industries.map((industry, index) => (
                        <Badge key={index} variant="secondary">
                          {industry}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <FileText className="h-4 w-4" />
                      Verification Documents ({investor.documents.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {investor.documents.map((doc, index) => (
                        <Button key={index} variant="outline" size="sm">
                          {doc}
                          <ExternalLink className="ml-2 h-3 w-3" />
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={() => handleApprove(investor)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReject(investor)}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Recently Processed Tab */}
          <TabsContent value="history" className="space-y-4">
            {recentlyProcessed.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">
                        {item.type === 'STARTUP_VERIFICATION' ? item.companyName : item.name}
                      </CardTitle>
                      <Badge className={getStatusBadgeColor(item.status)} variant="secondary">
                        {item.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(item.processedAt, 'MMM dd, yyyy HH:mm')}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start justify-between text-sm">
                    <div>
                      <div className="text-gray-600 dark:text-gray-400">Processed by {item.processedBy}</div>
                      {item.status === 'REJECTED' && item.rejectionReason && (
                        <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                          <AlertCircle className="mt-0.5 h-4 w-4 text-red-600" />
                          <div>
                            <div className="font-medium text-red-900 dark:text-red-300">Rejection Reason</div>
                            <div className="text-red-700 dark:text-red-400">{item.rejectionReason}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Action Confirmation Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {dialogAction === 'approve' ? 'Approve Verification' : 'Reject Verification'}
              </DialogTitle>
              <DialogDescription>
                {dialogAction === 'approve' ? (
                  <>
                    Are you sure you want to approve{' '}
                    {selectedItem?.companyName || selectedItem?.name}? This will grant them full
                    platform access.
                  </>
                ) : (
                  <>
                    Please provide a reason for rejecting{' '}
                    {selectedItem?.companyName || selectedItem?.name}. This will be shared with the
                    user.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            {dialogAction === 'reject' && (
              <div className="space-y-2">
                <Label htmlFor="reason">Rejection Reason *</Label>
                <Textarea
                  id="reason"
                  placeholder="Explain why this verification is being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                />
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button
                variant={dialogAction === 'approve' ? 'default' : 'destructive'}
                onClick={confirmAction}
                disabled={dialogAction === 'reject' && !rejectionReason.trim()}
              >
                {dialogAction === 'approve' ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
