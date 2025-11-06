import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Eye,
  AlertTriangle,
  Shield,
  User,
  FileText,
  TrendingUp
} from 'lucide-react';
import { cn, formatDate, formatTimeAgo } from '@/lib/utils';

/**
 * Admin KYC Review Page
 * For admins to review, approve, or reject KYC/AML applications
 */

type KYCStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
type AMLStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'REQUIRES_REVIEW';
type PEPStatus = 'CLEAR' | 'PEP' | 'FAMILY_MEMBER' | 'CLOSE_ASSOCIATE' | 'NOT_CHECKED';
type SanctionStatus = 'CLEAR' | 'PARTIAL_MATCH' | 'FULL_MATCH' | 'NOT_CHECKED';

interface ComplianceProfile {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  kycStatus: KYCStatus;
  amlStatus: AMLStatus;
  riskScore: number;
  pepStatus: PEPStatus;
  sanctionStatus: SanctionStatus;
  createdAt: string;
  lastComplianceReview?: string;
  complianceNotes?: string;
}

const RISK_COLORS = {
  low: 'text-green-600 bg-green-50',
  medium: 'text-yellow-600 bg-yellow-50',
  high: 'text-orange-600 bg-orange-50',
  critical: 'text-red-600 bg-red-50',
};

export function AdminKYCReviewPage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ComplianceProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<ComplianceProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<ComplianceProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | KYCStatus>('ALL');

  // Review form
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | 'REQUEST_MORE_INFO'>('APPROVED');
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [profiles, searchQuery, riskFilter, statusFilter]);

  const fetchProfiles = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/compliance/admin/pending', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch compliance profiles');
      }

      const result = await response.json();
      setProfiles(result.data.profiles || []);
    } catch (err: any) {
      console.error('Error fetching profiles:', err);
      setError(err.message || 'Failed to load compliance profiles');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...profiles];

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((p) => p.kycStatus === statusFilter);
    }

    // Risk filter
    if (riskFilter !== 'ALL') {
      if (riskFilter === 'HIGH') {
        filtered = filtered.filter((p) => p.riskScore >= 60);
      } else if (riskFilter === 'MEDIUM') {
        filtered = filtered.filter((p) => p.riskScore >= 30 && p.riskScore < 60);
      } else if (riskFilter === 'LOW') {
        filtered = filtered.filter((p) => p.riskScore < 30);
      }
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.user.name.toLowerCase().includes(query) ||
          p.user.email.toLowerCase().includes(query) ||
          p.userId.toLowerCase().includes(query)
      );
    }

    setFilteredProfiles(filtered);
  };

  const getRiskLevel = (score: number): { label: string; className: string } => {
    if (score < 30) return { label: 'Low', className: RISK_COLORS.low };
    if (score < 60) return { label: 'Medium', className: RISK_COLORS.medium };
    if (score < 80) return { label: 'High', className: RISK_COLORS.high };
    return { label: 'Critical', className: RISK_COLORS.critical };
  };

  const handleSelectProfile = (profile: ComplianceProfile) => {
    setSelectedProfile(profile);
    setReviewNotes(profile.complianceNotes || '');
    setDecision('APPROVED');
  };

  const handleSubmitReview = async () => {
    if (!selectedProfile) return;

    if (decision === 'REJECTED' && !reviewNotes.trim()) {
      alert('Please provide rejection notes');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `http://localhost:3001/api/compliance/admin/${selectedProfile.userId}/review`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            decision,
            notes: reviewNotes,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      alert('Review submitted successfully!');
      setSelectedProfile(null);
      setReviewNotes('');
      fetchProfiles();
    } catch (err: any) {
      console.error('Review error:', err);
      alert(err.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading compliance profiles...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchProfiles} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const stats = {
    total: profiles.length,
    pending: profiles.filter((p) => p.kycStatus === 'PENDING').length,
    highRisk: profiles.filter((p) => p.riskScore >= 60).length,
    pepMatches: profiles.filter((p) => p.pepStatus !== 'CLEAR' && p.pepStatus !== 'NOT_CHECKED').length,
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">KYC/AML Review</h1>
          <p className="text-muted-foreground">Review and approve compliance verifications</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={fetchProfiles}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => navigate({ to: '/admin/compliance-stats' })}>
            View Statistics
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Profiles</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending Review</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>High Risk</CardDescription>
            <CardTitle className="text-3xl text-red-600">{stats.highRisk}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>PEP Matches</CardDescription>
            <CardTitle className="text-3xl text-orange-600">{stats.pepMatches}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profiles List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Search */}
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Name, email, ID..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Risk Filter */}
                <div>
                  <Label htmlFor="riskFilter">Risk Level</Label>
                  <select
                    id="riskFilter"
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value as any)}
                  >
                    <option value="ALL">All Levels</option>
                    <option value="HIGH">High Risk (60+)</option>
                    <option value="MEDIUM">Medium Risk (30-60)</option>
                    <option value="LOW">Low Risk (&lt;30)</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <Label htmlFor="statusFilter">Status</Label>
                  <select
                    id="statusFilter"
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="VERIFIED">Verified</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profiles List */}
          <div className="space-y-3">
            {filteredProfiles.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No profiles found matching your filters</p>
                </CardContent>
              </Card>
            ) : (
              filteredProfiles.map((profile) => {
                const riskLevel = getRiskLevel(profile.riskScore);
                const isSelected = selectedProfile?.id === profile.id;
                const hasAlerts =
                  profile.pepStatus !== 'CLEAR' ||
                  profile.sanctionStatus !== 'CLEAR' ||
                  profile.riskScore >= 60;

                return (
                  <Card
                    key={profile.id}
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md',
                      isSelected && 'ring-2 ring-primary',
                      hasAlerts && 'border-l-4 border-l-orange-500'
                    )}
                    onClick={() => handleSelectProfile(profile)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <User className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{profile.user.name}</CardTitle>
                            <CardDescription>{profile.user.email}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {hasAlerts && <AlertTriangle className="h-5 w-5 text-orange-600" />}
                          <span
                            className={cn(
                              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                              profile.kycStatus === 'PENDING' && 'bg-yellow-100 text-yellow-800',
                              profile.kycStatus === 'VERIFIED' && 'bg-green-100 text-green-800',
                              profile.kycStatus === 'REJECTED' && 'bg-red-100 text-red-800'
                            )}
                          >
                            {profile.kycStatus}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Risk Score</p>
                          <div className="flex items-center space-x-2">
                            <TrendingUp className={cn('h-4 w-4', riskLevel.className.split(' ')[0])} />
                            <span className={cn('font-semibold', riskLevel.className)}>
                              {profile.riskScore}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{riskLevel.label} Risk</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">PEP Status</p>
                          <p className={cn('font-medium', profile.pepStatus !== 'CLEAR' ? 'text-orange-600' : 'text-green-600')}>
                            {profile.pepStatus.replace('_', ' ')}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Sanctions</p>
                          <p className={cn('font-medium', profile.sanctionStatus !== 'CLEAR' ? 'text-red-600' : 'text-green-600')}>
                            {profile.sanctionStatus.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      {profile.lastComplianceReview && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Last reviewed {formatTimeAgo(profile.lastComplianceReview)}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Review Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            {selectedProfile ? (
              <Card>
                <CardHeader>
                  <CardTitle>Review Profile</CardTitle>
                  <CardDescription>Make a compliance decision</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* User Info */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">{selectedProfile.user.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedProfile.user.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Risk Assessment */}
                  <div className="border-t pt-4 space-y-3">
                    <div className={cn('p-3 rounded-lg', getRiskLevel(selectedProfile.riskScore).className)}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Risk Score</span>
                        <span className="text-2xl font-bold">{selectedProfile.riskScore}</span>
                      </div>
                      <p className="text-xs mt-1">{getRiskLevel(selectedProfile.riskScore).label} Risk</p>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>KYC Status:</span>
                        <span className="font-semibold">{selectedProfile.kycStatus}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>AML Status:</span>
                        <span className="font-semibold">{selectedProfile.amlStatus}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>PEP Status:</span>
                        <span className={cn('font-semibold', selectedProfile.pepStatus !== 'CLEAR' && 'text-orange-600')}>
                          {selectedProfile.pepStatus.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Sanctions:</span>
                        <span className={cn('font-semibold', selectedProfile.sanctionStatus !== 'CLEAR' && 'text-red-600')}>
                          {selectedProfile.sanctionStatus.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Decision */}
                  <div className="border-t pt-4 space-y-3">
                    <Label htmlFor="decision">Decision</Label>
                    <select
                      id="decision"
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={decision}
                      onChange={(e) => setDecision(e.target.value as any)}
                    >
                      <option value="APPROVED">Approve</option>
                      <option value="REJECTED">Reject</option>
                      <option value="REQUEST_MORE_INFO">Request More Information</option>
                    </select>
                  </div>

                  {/* Review Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="reviewNotes">
                      Review Notes {decision === 'REJECTED' && <span className="text-red-500">*</span>}
                    </Label>
                    <textarea
                      id="reviewNotes"
                      placeholder="Enter notes about your decision..."
                      className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                    />
                  </div>

                  {/* Warning for high risk */}
                  {selectedProfile.riskScore >= 60 && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>High Risk Profile:</strong> This profile has a high risk score.
                        Please review carefully before approving.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2 pt-4">
                    <Button
                      className="flex-1"
                      onClick={handleSubmitReview}
                      disabled={isSubmitting}
                      variant={decision === 'APPROVED' ? 'default' : 'destructive'}
                    >
                      {decision === 'APPROVED' && <CheckCircle className="h-4 w-4 mr-2" />}
                      {decision === 'REJECTED' && <XCircle className="h-4 w-4 mr-2" />}
                      {decision === 'REQUEST_MORE_INFO' && <FileText className="h-4 w-4 mr-2" />}
                      {isSubmitting ? 'Processing...' : 'Submit Review'}
                    </Button>
                  </div>

                  {/* View Full Details */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate({ to: `/admin/compliance/${selectedProfile.userId}` })}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Full Details
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Select a profile to review</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
