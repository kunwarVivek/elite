import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Progress } from '../../components/ui/progress';
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  FileText,
  Calendar,
  RefreshCw,
  Download,
  ExternalLink,
  Shield,
  Info
} from 'lucide-react';
import { cn, formatDate, formatTimeAgo } from '@/lib/utils';

/**
 * Accreditation Status Dashboard
 * Shows current accreditation status, timeline, documents, and renewal information
 */

type AccreditationStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'RENEWAL_REQUIRED';

interface AccreditationData {
  id: string;
  userId: string;
  status: AccreditationStatus;
  method: string;
  submittedAt: string;
  reviewedAt?: string;
  expiresAt?: string;
  reviewNotes?: string;
  documents: Array<{
    id: string;
    type: string;
    url: string;
    uploadedAt: string;
  }>;
  timeline: Array<{
    status: string;
    timestamp: string;
    note?: string;
  }>;
}

const STATUS_CONFIG = {
  PENDING: {
    icon: Clock,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    label: 'Pending Review',
    description: 'Your application has been submitted and is awaiting review.',
  },
  UNDER_REVIEW: {
    icon: RefreshCw,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    label: 'Under Review',
    description: 'Our compliance team is currently reviewing your application.',
  },
  APPROVED: {
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    label: 'Approved',
    description: 'Congratulations! Your accreditation has been approved.',
  },
  REJECTED: {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    label: 'Rejected',
    description: 'Your application was not approved. Please review the notes below.',
  },
  EXPIRED: {
    icon: AlertCircle,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    label: 'Expired',
    description: 'Your accreditation has expired. Please submit a renewal application.',
  },
  RENEWAL_REQUIRED: {
    icon: AlertCircle,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    label: 'Renewal Required',
    description: 'Your accreditation will expire soon. Please renew to maintain access.',
  },
};

export function AccreditationStatusDashboard() {
  const navigate = useNavigate();
  const [accreditation, setAccreditation] = useState<AccreditationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAccreditationStatus();
  }, []);

  const fetchAccreditationStatus = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/accreditation/status', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No accreditation found
          setAccreditation(null);
          return;
        }
        throw new Error('Failed to fetch accreditation status');
      }

      const result = await response.json();
      setAccreditation(result.data);
    } catch (err: any) {
      console.error('Error fetching accreditation:', err);
      setError(err.message || 'Failed to load accreditation status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenewal = () => {
    navigate({ to: '/accreditation/start' });
  };

  const handleReapply = () => {
    navigate({ to: '/accreditation/start' });
  };

  const downloadDocument = async (documentId: string) => {
    // TODO: Implement document download
    alert('Document download feature coming soon!');
  };

  const calculateDaysUntilExpiry = (expiresAt: string): number => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading accreditation status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchAccreditationStatus} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  // No accreditation found - show start page
  if (!accreditation) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Accreditation Status</CardTitle>
            <CardDescription>You haven't submitted an accreditation application yet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                To invest in private offerings, you need to verify your accredited investor status.
                This is a requirement under SEC Regulation D.
              </AlertDescription>
            </Alert>
            <Button onClick={() => navigate({ to: '/accreditation/start' })}>
              Start Accreditation Process
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[accreditation.status];
  const StatusIcon = statusConfig.icon;
  const daysUntilExpiry = accreditation.expiresAt ? calculateDaysUntilExpiry(accreditation.expiresAt) : null;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Accreditation Status</h1>
        <p className="text-muted-foreground">
          Track your accredited investor verification application
        </p>
      </div>

      {/* Status Card */}
      <Card className={cn('mb-6', statusConfig.border)}>
        <CardHeader className={statusConfig.bg}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={cn('p-3 rounded-full', statusConfig.bg, 'border-2', statusConfig.border)}>
                <StatusIcon className={cn('h-6 w-6', statusConfig.color)} />
              </div>
              <div>
                <CardTitle className={statusConfig.color}>{statusConfig.label}</CardTitle>
                <CardDescription>{statusConfig.description}</CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAccreditationStatus}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Method</p>
              <p className="font-semibold">{accreditation.method.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Submitted</p>
              <p className="font-semibold">{formatDate(accreditation.submittedAt)}</p>
              <p className="text-xs text-muted-foreground">{formatTimeAgo(accreditation.submittedAt)}</p>
            </div>
            {accreditation.reviewedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Reviewed</p>
                <p className="font-semibold">{formatDate(accreditation.reviewedAt)}</p>
                <p className="text-xs text-muted-foreground">{formatTimeAgo(accreditation.reviewedAt)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expiry Warning */}
      {accreditation.status === 'APPROVED' && isExpiringSoon && (
        <Alert className="mb-6 border-orange-600 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <strong>Renewal Required:</strong> Your accreditation will expire in {daysUntilExpiry} days
            (on {formatDate(accreditation.expiresAt!)}). Please renew to maintain your accredited investor status.
          </AlertDescription>
        </Alert>
      )}

      {/* Expiry Info (Approved) */}
      {accreditation.status === 'APPROVED' && accreditation.expiresAt && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Accreditation Validity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valid Until</p>
                <p className="text-lg font-semibold">{formatDate(accreditation.expiresAt)}</p>
                {daysUntilExpiry !== null && daysUntilExpiry > 0 && (
                  <p className="text-sm text-muted-foreground">{daysUntilExpiry} days remaining</p>
                )}
              </div>
              <Button onClick={handleRenewal} variant={isExpiringSoon ? 'default' : 'outline'}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Renew Accreditation
              </Button>
            </div>
            <Progress
              value={daysUntilExpiry !== null ? Math.max(0, (daysUntilExpiry / 365) * 100) : 0}
              className="mt-4"
            />
          </CardContent>
        </Card>
      )}

      {/* Review Notes (if rejected or requires more info) */}
      {accreditation.reviewNotes && (
        <Alert className="mb-6" variant={accreditation.status === 'REJECTED' ? 'destructive' : 'default'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Review Notes:</strong>
            <p className="mt-2">{accreditation.reviewNotes}</p>
            {accreditation.status === 'REJECTED' && (
              <Button onClick={handleReapply} className="mt-4" variant="outline">
                Submit New Application
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Application Timeline</CardTitle>
            <CardDescription>Track the progress of your application</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {accreditation.timeline.map((event, index) => {
                const isLast = index === accreditation.timeline.length - 1;
                return (
                  <div key={index} className="flex">
                    <div className="flex flex-col items-center mr-4">
                      <div
                        className={cn(
                          'w-3 h-3 rounded-full border-2',
                          isLast ? 'bg-primary border-primary' : 'bg-muted border-muted-foreground'
                        )}
                      />
                      {!isLast && <div className="w-0.5 h-full bg-muted mt-1" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-semibold text-sm">{event.status.replace('_', ' ')}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(event.timestamp)}</p>
                      {event.note && (
                        <p className="text-sm text-muted-foreground mt-1">{event.note}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Submitted Documents</CardTitle>
            <CardDescription>Documents provided with your application</CardDescription>
          </CardHeader>
          <CardContent>
            {accreditation.documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents found</p>
            ) : (
              <div className="space-y-3">
                {accreditation.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{doc.type.replace('_', ' ')}</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {formatTimeAgo(doc.uploadedAt)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadDocument(doc.id)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Benefits Card (if approved) */}
      {accreditation.status === 'APPROVED' && (
        <Card className="mt-6 border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center text-green-700">
              <Shield className="h-5 w-5 mr-2" />
              Accredited Investor Benefits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Access Private Investments</p>
                  <p className="text-sm text-muted-foreground">
                    Browse and invest in exclusive startup opportunities
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Join Syndicates</p>
                  <p className="text-sm text-muted-foreground">
                    Participate in group investments led by experienced angels
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Secondary Market Access</p>
                  <p className="text-sm text-muted-foreground">
                    Buy and sell shares in private companies
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Portfolio Management</p>
                  <p className="text-sm text-muted-foreground">
                    Track performance and manage your investments
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <Button onClick={() => navigate({ to: '/deals' })}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Browse Available Investments
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            If you have questions about your accreditation status or need to update your information,
            please contact our support team.
          </p>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => navigate({ to: '/support' })}>
              Contact Support
            </Button>
            <Button variant="outline" onClick={() => navigate({ to: '/faq/accreditation' })}>
              View FAQ
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
