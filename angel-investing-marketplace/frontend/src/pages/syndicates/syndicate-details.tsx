import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  ArrowLeft,
  Users,
  Award,
  DollarSign,
  TrendingUp,
  Building2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Target,
  Calendar,
  BarChart3,
  FileText,
  Loader2,
  Info,
} from 'lucide-react';
import { cn, formatNumber, formatDate } from '@/lib/utils';

/**
 * Syndicate Details Page
 * Comprehensive view of a single syndicate
 * Shows deals, members, performance, and join functionality
 */

interface SyndicateDetails {
  id: string;
  name: string;
  description: string;
  leadInvestor: {
    id: string;
    name: string;
    avatar?: string;
    bio?: string;
    credentials?: string;
    deals: number;
    totalInvested: number;
  };
  targetAmount: number;
  currentAmount: number;
  memberCount: number;
  maxMembers?: number;
  carryPercentage: number;
  managementFee: number;
  minimumInvestment: number;
  status: 'FORMING' | 'ACTIVE' | 'CLOSED' | 'LIQUIDATED';
  focus: string[];
  createdAt: string;
  terms: string;

  deals: Array<{
    id: string;
    startupName: string;
    amount: number;
    date: string;
    status: string;
  }>;

  members: Array<{
    id: string;
    name: string;
    avatar?: string;
    investment: number;
    joinedAt: string;
  }>;

  performance: {
    totalReturn: number;
    returnPercent: number;
    avgDealSize: number;
    successRate: number;
  };
}

const STATUS_CONFIG = {
  FORMING: { color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Forming' },
  ACTIVE: { color: 'text-green-600', bg: 'bg-green-50', label: 'Active' },
  CLOSED: { color: 'text-gray-600', bg: 'bg-gray-50', label: 'Closed' },
  LIQUIDATED: { color: 'text-blue-600', bg: 'bg-blue-50', label: 'Liquidated' },
};

export function SyndicateDetailsPage() {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const syndicateId = (params as any).id;

  const [syndicate, setSyndicate] = useState<SyndicateDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinAmount, setJoinAmount] = useState<number>(0);
  const [isJoining, setIsJoining] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (syndicateId) {
      fetchSyndicateDetails();
    }
  }, [syndicateId]);

  const fetchSyndicateDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/syndicates/${syndicateId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch syndicate details');
      }

      const result = await response.json();
      setSyndicate(result.data.syndicate);
      setJoinAmount(result.data.syndicate.minimumInvestment);
    } catch (err: any) {
      console.error('Error fetching syndicate:', err);
      setError(err.message || 'Failed to load syndicate');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!syndicate) return;

    if (joinAmount < syndicate.minimumInvestment) {
      alert(`Minimum investment is $${formatNumber(syndicate.minimumInvestment)}`);
      return;
    }

    setIsJoining(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/syndicates/${syndicate.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: joinAmount }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to join syndicate');
      }

      alert('Successfully joined syndicate!');
      fetchSyndicateDetails();
      setShowJoinDialog(false);
    } catch (err: any) {
      console.error('Error joining syndicate:', err);
      alert(err.message || 'Failed to join syndicate');
    } finally {
      setIsJoining(false);
    }
  };

  const getFundingProgress = (): number => {
    if (!syndicate) return 0;
    return (syndicate.currentAmount / syndicate.targetAmount) * 100;
  };

  const canJoin = (): boolean => {
    if (!syndicate) return false;
    if (syndicate.status !== 'FORMING' && syndicate.status !== 'ACTIVE') return false;
    if (syndicate.maxMembers && syndicate.memberCount >= syndicate.maxMembers) return false;
    return true;
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading syndicate...</span>
        </div>
      </div>
    );
  }

  if (error || !syndicate) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Syndicate not found'}</AlertDescription>
        </Alert>
        <Button onClick={() => navigate({ to: '/syndicates' })} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Syndicates
        </Button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[syndicate.status];
  const progress = getFundingProgress();
  const joinable = canJoin();

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <Button
        variant="ghost"
        onClick={() => navigate({ to: '/syndicates' })}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Syndicates
      </Button>

      {/* Hero Section */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <h1 className="text-4xl font-bold">{syndicate.name}</h1>
              <span className={cn('px-3 py-1 rounded text-sm font-semibold', statusConfig.bg, statusConfig.color)}>
                {statusConfig.label}
              </span>
            </div>
            <p className="text-xl text-muted-foreground mb-4">{syndicate.description}</p>

            {/* Focus Areas */}
            <div className="flex flex-wrap gap-2">
              {syndicate.focus.map((focus) => (
                <span
                  key={focus}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm font-semibold"
                >
                  {focus}
                </span>
              ))}
            </div>
          </div>

          {joinable && (
            <Button size="lg" onClick={() => setShowJoinDialog(true)} className="px-8">
              Join Syndicate
            </Button>
          )}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Target Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">${formatNumber(syndicate.targetAmount)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                ${formatNumber(syndicate.currentAmount)} raised ({progress.toFixed(0)}%)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Members</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {syndicate.memberCount}
                {syndicate.maxMembers && `/${syndicate.maxMembers}`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Investors</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Min Investment</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">${formatNumber(syndicate.minimumInvestment)}</p>
              <p className="text-xs text-muted-foreground mt-1">Per member</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Carry</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{syndicate.carryPercentage}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                {syndicate.managementFee}% mgmt fee
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Progress Bar */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="mb-2">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-semibold">Funding Progress</span>
              <span className="font-bold">{progress.toFixed(0)}%</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn('h-full', progress >= 100 ? 'bg-green-600' : 'bg-blue-600')}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex items-center space-x-2 mb-6 border-b">
        {['overview', 'deals', 'members', 'performance'].map((tab) => (
          <Button
            key={tab}
            variant="ghost"
            className={cn(
              'rounded-none border-b-2 border-transparent',
              activeTab === tab && 'border-primary'
            )}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'overview' && (
            <>
              {/* Lead Investor */}
              <Card>
                <CardHeader>
                  <CardTitle>Lead Investor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      {syndicate.leadInvestor.avatar ? (
                        <img
                          src={syndicate.leadInvestor.avatar}
                          alt={syndicate.leadInvestor.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <Award className="h-10 w-10 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-1">{syndicate.leadInvestor.name}</h3>
                      {syndicate.leadInvestor.credentials && (
                        <p className="text-sm text-muted-foreground mb-2">{syndicate.leadInvestor.credentials}</p>
                      )}
                      {syndicate.leadInvestor.bio && (
                        <p className="text-sm mb-3">{syndicate.leadInvestor.bio}</p>
                      )}
                      <div className="flex items-center space-x-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Deals:</span>
                          <span className="font-semibold ml-1">{syndicate.leadInvestor.deals}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Invested:</span>
                          <span className="font-semibold ml-1">${formatNumber(syndicate.leadInvestor.totalInvested)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Terms */}
              <Card>
                <CardHeader>
                  <CardTitle>Syndicate Terms</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {syndicate.terms}
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === 'deals' && (
            <Card>
              <CardHeader>
                <CardTitle>Syndicate Deals</CardTitle>
                <CardDescription>{syndicate.deals.length} total deals</CardDescription>
              </CardHeader>
              <CardContent>
                {syndicate.deals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No deals yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {syndicate.deals.map((deal) => (
                      <div key={deal.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-semibold mb-1">{deal.startupName}</h4>
                          <p className="text-xs text-muted-foreground">{formatDate(deal.date)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">${formatNumber(deal.amount)}</p>
                          <span className="text-xs px-2 py-0.5 rounded bg-green-50 text-green-700">
                            {deal.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'members' && (
            <Card>
              <CardHeader>
                <CardTitle>Syndicate Members</CardTitle>
                <CardDescription>{syndicate.memberCount} members</CardDescription>
              </CardHeader>
              <CardContent>
                {syndicate.members.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No members yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {syndicate.members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            {member.avatar ? (
                              <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <span className="text-white font-bold">{member.name.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold">{member.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Joined {formatDate(member.joinedAt)}
                            </p>
                          </div>
                        </div>
                        <p className="font-bold">${formatNumber(member.investment)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'performance' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Return</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-600">
                      +${formatNumber(syndicate.performance.totalReturn)}
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      +{syndicate.performance.returnPercent.toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Avg Deal Size</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">${formatNumber(syndicate.performance.avgDealSize)}</p>
                  </CardContent>
                </Card>

                <Card className="col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{syndicate.performance.successRate.toFixed(0)}%</p>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-green-600"
                        style={{ width: `${syndicate.performance.successRate}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-semibold">{formatDate(syndicate.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={cn('font-semibold', statusConfig.color)}>{statusConfig.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Deals</span>
                  <span className="font-semibold">{syndicate.deals.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Members</span>
                  <span className="font-semibold">{syndicate.memberCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Join CTA */}
          {joinable && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle>Join This Syndicate</CardTitle>
                <CardDescription>Invest alongside experienced investors</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => setShowJoinDialog(true)}
                >
                  Join Now
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Min: ${formatNumber(syndicate.minimumInvestment)}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Info Alert */}
          <Alert className="border-blue-600 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              <strong>Carry:</strong> The lead investor receives {syndicate.carryPercentage}% of profits above your invested capital.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Join Dialog */}
      {showJoinDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Join {syndicate.name}</CardTitle>
              <CardDescription>Enter your investment amount</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="amount">Investment Amount (USD)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={joinAmount}
                    onChange={(e) => setJoinAmount(Number(e.target.value))}
                    min={syndicate.minimumInvestment}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum: ${formatNumber(syndicate.minimumInvestment)}
                  </p>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    By joining, you agree to the syndicate terms including {syndicate.carryPercentage}% carry
                    and {syndicate.managementFee}% management fee.
                  </AlertDescription>
                </Alert>

                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleJoin}
                    disabled={isJoining || joinAmount < syndicate.minimumInvestment}
                    className="flex-1"
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      'Confirm & Join'
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowJoinDialog(false)}
                    disabled={isJoining}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
