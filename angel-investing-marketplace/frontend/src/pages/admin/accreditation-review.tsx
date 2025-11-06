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
  Clock,
  Search,
  Filter,
  Download,
  Eye,
  RefreshCw,
  AlertCircle,
  FileText,
  User,
  DollarSign,
  Briefcase,
  Award
} from 'lucide-react';
import { cn, formatDate, formatTimeAgo, formatNumber } from '@/lib/utils';

/**
 * Admin Accreditation Review Page
 * For admins to review, approve, or reject accreditation applications
 */

type AccreditationMethod = 'INCOME' | 'NET_WORTH' | 'PROFESSIONAL' | 'THIRD_PARTY_VERIFICATION';
type AccreditationStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

interface AccreditationApplication {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  method: AccreditationMethod;
  status: AccreditationStatus;
  submittedAt: string;
  annualIncome?: number;
  netWorth?: number;
  professionalCertification?: string;
  documents: Array<{
    id: string;
    type: string;
    url: string;
  }>;
}

const METHOD_CONFIG = {
  INCOME: {
    icon: DollarSign,
    label: 'Income-Based',
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  NET_WORTH: {
    icon: Briefcase,
    label: 'Net Worth',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  PROFESSIONAL: {
    icon: Award,
    label: 'Professional',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  THIRD_PARTY_VERIFICATION: {
    icon: FileText,
    label: 'Third-Party',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
};

export function AccreditationReviewPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<AccreditationApplication[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<AccreditationApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<AccreditationApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AccreditationStatus | 'ALL'>('PENDING');
  const [methodFilter, setMethodFilter] = useState<AccreditationMethod | 'ALL'>('ALL');

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [applications, searchQuery, statusFilter, methodFilter]);

  const fetchApplications = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/accreditation/admin/pending', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }

      const result = await response.json();
      setApplications(result.data.profiles || []);
    } catch (err: any) {
      console.error('Error fetching applications:', err);
      setError(err.message || 'Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...applications];

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }

    // Method filter
    if (methodFilter !== 'ALL') {
      filtered = filtered.filter((app) => app.method === methodFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (app) =>
          app.userName.toLowerCase().includes(query) ||
          app.userEmail.toLowerCase().includes(query) ||
          app.id.toLowerCase().includes(query)
      );
    }

    setFilteredApplications(filtered);
  };

  const handleReview = (application: AccreditationApplication) => {
    setSelectedApplication(application);
    setReviewNotes('');
  };

  const handleApprove = async () => {
    if (!selectedApplication) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `http://localhost:3001/api/accreditation/admin/verify/${selectedApplication.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            approved: true,
            notes: reviewNotes,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to approve application');
      }

      alert('Application approved successfully!');
      setSelectedApplication(null);
      setReviewNotes('');
      fetchApplications();
    } catch (err: any) {
      console.error('Error approving application:', err);
      alert(err.message || 'Failed to approve application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApplication) return;
    if (!reviewNotes.trim()) {
      alert('Please provide rejection notes');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `http://localhost:3001/api/accreditation/admin/verify/${selectedApplication.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            approved: false,
            notes: reviewNotes,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to reject application');
      }

      alert('Application rejected.');
      setSelectedApplication(null);
      setReviewNotes('');
      fetchApplications();
    } catch (err: any) {
      console.error('Error rejecting application:', err);
      alert(err.message || 'Failed to reject application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadDocument = (documentUrl: string) => {
    window.open(documentUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading applications...</span>
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
        <Button onClick={fetchApplications} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Accreditation Review</h1>
          <p className="text-muted-foreground">Review and approve investor accreditation applications</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={fetchApplications}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => navigate({ to: '/admin/accreditation-stats' })}>
            View Statistics
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Applications</CardDescription>
            <CardTitle className="text-3xl">{applications.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending Review</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">
              {applications.filter((a) => a.status === 'PENDING').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Approved</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {applications.filter((a) => a.status === 'APPROVED').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Rejected</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {applications.filter((a) => a.status === 'REJECTED').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Applications List */}
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
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                {/* Method Filter */}
                <div>
                  <Label htmlFor="methodFilter">Method</Label>
                  <select
                    id="methodFilter"
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={methodFilter}
                    onChange={(e) => setMethodFilter(e.target.value as any)}
                  >
                    <option value="ALL">All Methods</option>
                    <option value="INCOME">Income-Based</option>
                    <option value="NET_WORTH">Net Worth</option>
                    <option value="PROFESSIONAL">Professional</option>
                    <option value="THIRD_PARTY_VERIFICATION">Third-Party</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Applications List */}
          <div className="space-y-3">
            {filteredApplications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No applications found matching your filters</p>
                </CardContent>
              </Card>
            ) : (
              filteredApplications.map((application) => {
                const methodConfig = METHOD_CONFIG[application.method];
                const MethodIcon = methodConfig.icon;
                const isSelected = selectedApplication?.id === application.id;

                return (
                  <Card
                    key={application.id}
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md',
                      isSelected && 'ring-2 ring-primary'
                    )}
                    onClick={() => handleReview(application)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={cn('p-2 rounded-lg', methodConfig.bg)}>
                            <MethodIcon className={cn('h-5 w-5', methodConfig.color)} />
                          </div>
                          <div>
                            <CardTitle className="text-base">{application.userName}</CardTitle>
                            <CardDescription>{application.userEmail}</CardDescription>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={cn(
                              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                              application.status === 'PENDING' && 'bg-yellow-100 text-yellow-800',
                              application.status === 'UNDER_REVIEW' && 'bg-blue-100 text-blue-800',
                              application.status === 'APPROVED' && 'bg-green-100 text-green-800',
                              application.status === 'REJECTED' && 'bg-red-100 text-red-800'
                            )}
                          >
                            {application.status}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-muted-foreground">Method: </span>
                          <span className="font-medium">{methodConfig.label}</span>
                        </div>
                        <div className="text-muted-foreground">
                          {formatTimeAgo(application.submittedAt)}
                        </div>
                      </div>
                      {application.annualIncome && (
                        <div className="text-sm mt-2">
                          <span className="text-muted-foreground">Income: </span>
                          <span className="font-medium">${formatNumber(application.annualIncome)}</span>
                        </div>
                      )}
                      {application.netWorth && (
                        <div className="text-sm mt-2">
                          <span className="text-muted-foreground">Net Worth: </span>
                          <span className="font-medium">${formatNumber(application.netWorth)}</span>
                        </div>
                      )}
                      {application.professionalCertification && (
                        <div className="text-sm mt-2">
                          <span className="text-muted-foreground">License: </span>
                          <span className="font-medium">{application.professionalCertification}</span>
                        </div>
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
            {selectedApplication ? (
              <Card>
                <CardHeader>
                  <CardTitle>Review Application</CardTitle>
                  <CardDescription>Review and make a decision</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Applicant Info */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">{selectedApplication.userName}</p>
                        <p className="text-xs text-muted-foreground">{selectedApplication.userEmail}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <p className="text-sm">
                      <strong>Method:</strong> {METHOD_CONFIG[selectedApplication.method].label}
                    </p>
                    <p className="text-sm">
                      <strong>Submitted:</strong> {formatDate(selectedApplication.submittedAt)}
                    </p>
                    <p className="text-sm">
                      <strong>Status:</strong> {selectedApplication.status}
                    </p>
                  </div>

                  {/* Documents */}
                  <div className="border-t pt-4">
                    <p className="font-semibold mb-2">Documents ({selectedApplication.documents.length})</p>
                    <div className="space-y-2">
                      {selectedApplication.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-2 border rounded hover:bg-muted/50"
                        >
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{doc.type.replace('_', ' ')}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadDocument(doc.url)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Review Notes */}
                  <div className="border-t pt-4">
                    <Label htmlFor="reviewNotes">Review Notes</Label>
                    <textarea
                      id="reviewNotes"
                      placeholder="Enter notes about your decision..."
                      className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-2"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2 pt-4">
                    <Button
                      className="flex-1"
                      onClick={handleApprove}
                      disabled={isSubmitting}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={handleReject}
                      disabled={isSubmitting}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Select an application to review</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
