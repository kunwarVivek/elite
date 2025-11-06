import React, { useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Download,
  Calendar,
  RefreshCw,
  ArrowLeft,
  Shield,
  Users,
  DollarSign,
  Activity,
  AlertTriangle,
  MessageSquare,
  Eye,
} from 'lucide-react';
import { cn, formatNumber, formatDate, formatTimeAgo } from '@/lib/utils';

/**
 * Approval Detail View
 * Comprehensive view of a single approval request
 * Supports approve, reject, and request info actions
 */

interface ApprovalDetail {
  id: string;
  type: 'ACCREDITATION' | 'KYC' | 'TRANSACTION';
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'INFO_REQUESTED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  submittedAt: string;
  assignedTo?: string;
  assignedToName?: string;
  slaDeadline: string;
  hoursRemaining: number;

  // Type-specific data
  accreditationData?: {
    method: string;
    annualIncome?: number;
    netWorth?: number;
    licenseType?: string;
    licenseNumber?: string;
  };
  kycData?: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationality: string;
    address: string;
    idType: string;
    idNumber: string;
    isPEP: boolean;
    riskScore: number;
  };
  transactionData?: {
    investmentId: string;
    investmentName: string;
    amount: number;
    transactionType: string;
  };

  // Supporting documents
  documents: Array<{
    id: string;
    type: string;
    name: string;
    uploadedAt: string;
    url: string;
  }>;

  // History
  history: Array<{
    id: string;
    action: string;
    actorName: string;
    timestamp: string;
    notes?: string;
  }>;
}

const TYPE_CONFIG = {
  ACCREDITATION: {
    name: 'Accreditation Review',
    icon: Shield,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  KYC: {
    name: 'KYC/AML Review',
    icon: Users,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  TRANSACTION: {
    name: 'Transaction Review',
    icon: DollarSign,
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
};

const STATUS_CONFIG = {
  PENDING: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Pending' },
  IN_REVIEW: { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', label: 'In Review' },
  APPROVED: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Approved' },
  REJECTED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Rejected' },
  INFO_REQUESTED: { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Info Requested' },
};

export function ApprovalDetailPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const approvalId = (search as any).id;

  const [approval, setApproval] = useState<ApprovalDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);

  useEffect(() => {
    if (approvalId) {
      fetchApprovalDetail();
    }
  }, [approvalId]);

  const fetchApprovalDetail = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/admin/approvals/${approvalId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch approval details');
      }

      const result = await response.json();
      setApproval(result.data.approval);
    } catch (err: any) {
      console.error('Error fetching approval:', err);
      setError(err.message || 'Failed to load approval');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approval) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `http://localhost:3001/api/admin/approvals/${approval.id}/review`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            decision: 'APPROVED',
            notes: reviewNotes,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to approve');
      }

      alert('Approval submitted successfully');
      navigate({ to: '/admin/approval-queue' });
    } catch (err: any) {
      console.error('Error approving:', err);
      alert(err.message || 'Failed to approve');
    } finally {
      setIsSubmitting(false);
      setShowApproveDialog(false);
    }
  };

  const handleReject = async () => {
    if (!approval || !reviewNotes.trim()) {
      alert('Please provide rejection reason');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `http://localhost:3001/api/admin/approvals/${approval.id}/review`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            decision: 'REJECTED',
            notes: reviewNotes,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to reject');
      }

      alert('Rejection submitted successfully');
      navigate({ to: '/admin/approval-queue' });
    } catch (err: any) {
      console.error('Error rejecting:', err);
      alert(err.message || 'Failed to reject');
    } finally {
      setIsSubmitting(false);
      setShowRejectDialog(false);
    }
  };

  const handleRequestInfo = async () => {
    if (!approval || !reviewNotes.trim()) {
      alert('Please specify what information is needed');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `http://localhost:3001/api/admin/approvals/${approval.id}/request-info`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: reviewNotes,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to request information');
      }

      alert('Information request sent successfully');
      fetchApprovalDetail();
      setReviewNotes('');
    } catch (err: any) {
      console.error('Error requesting info:', err);
      alert(err.message || 'Failed to request information');
    } finally {
      setIsSubmitting(false);
      setShowInfoDialog(false);
    }
  };

  const downloadDocument = async (documentUrl: string, documentName: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(documentUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download document');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = documentName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Download error:', err);
      alert(err.message || 'Failed to download document');
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading approval details...</span>
        </div>
      </div>
    );
  }

  if (error || !approval) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Approval not found'}</AlertDescription>
        </Alert>
        <Button onClick={() => navigate({ to: '/admin/approval-queue' })} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Queue
        </Button>
      </div>
    );
  }

  const typeConfig = TYPE_CONFIG[approval.type];
  const statusConfig = STATUS_CONFIG[approval.status];
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig.icon;
  const isSLABreach = approval.hoursRemaining < 0;
  const canTakeAction = approval.status === 'PENDING' || approval.status === 'IN_REVIEW' || approval.status === 'INFO_REQUESTED';

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate({ to: '/admin/approval-queue' })}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Queue
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className={cn('p-4 rounded-lg', typeConfig.bg)}>
              <TypeIcon className={cn('h-8 w-8', typeConfig.color)} />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">{typeConfig.name}</h1>
              <div className="flex items-center space-x-3">
                <div className={cn('flex items-center space-x-1 px-3 py-1 rounded-lg', statusConfig.bg)}>
                  <StatusIcon className={cn('h-4 w-4', statusConfig.color)} />
                  <span className={cn('font-semibold', statusConfig.color)}>{statusConfig.label}</span>
                </div>
                {isSLABreach && (
                  <div className="flex items-center space-x-1 text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-semibold">{Math.abs(approval.hoursRemaining)}h overdue</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {canTakeAction && (
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setShowApproveDialog(true)}
                variant="default"
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button onClick={() => setShowInfoDialog(true)} variant="outline">
                <MessageSquare className="h-4 w-4 mr-2" />
                Request Info
              </Button>
              <Button
                onClick={() => setShowRejectDialog(true)}
                variant="outline"
                className="text-red-600 hover:text-red-700"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <p className="font-semibold">{approval.userName}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="font-semibold">{approval.userEmail}</p>
                  </div>
                </div>
                {approval.userPhone && (
                  <div className="flex items-start space-x-3">
                    <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <Label className="text-xs text-muted-foreground">Phone</Label>
                      <p className="font-semibold">{approval.userPhone}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <Label className="text-xs text-muted-foreground">User ID</Label>
                    <p className="font-semibold font-mono text-sm">{approval.userId}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Type-Specific Data */}
          {approval.accreditationData && (
            <Card>
              <CardHeader>
                <CardTitle>Accreditation Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Verification Method</Label>
                    <p className="font-semibold">{approval.accreditationData.method}</p>
                  </div>
                  {approval.accreditationData.annualIncome && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Annual Income</Label>
                      <p className="font-semibold text-green-600">
                        ${formatNumber(approval.accreditationData.annualIncome)}
                      </p>
                    </div>
                  )}
                  {approval.accreditationData.netWorth && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Net Worth</Label>
                      <p className="font-semibold text-green-600">
                        ${formatNumber(approval.accreditationData.netWorth)}
                      </p>
                    </div>
                  )}
                  {approval.accreditationData.licenseType && (
                    <div>
                      <Label className="text-xs text-muted-foreground">License Type</Label>
                      <p className="font-semibold">{approval.accreditationData.licenseType}</p>
                    </div>
                  )}
                  {approval.accreditationData.licenseNumber && (
                    <div>
                      <Label className="text-xs text-muted-foreground">License Number</Label>
                      <p className="font-semibold font-mono">{approval.accreditationData.licenseNumber}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {approval.kycData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>KYC/AML Details</span>
                  <div className={cn('px-3 py-1 rounded text-sm font-semibold',
                    approval.kycData.riskScore < 30 ? 'bg-green-50 text-green-600' :
                    approval.kycData.riskScore < 60 ? 'bg-yellow-50 text-yellow-600' :
                    approval.kycData.riskScore < 80 ? 'bg-orange-50 text-orange-600' :
                    'bg-red-50 text-red-600'
                  )}>
                    Risk Score: {approval.kycData.riskScore}/100
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Full Name</Label>
                    <p className="font-semibold">{approval.kycData.firstName} {approval.kycData.lastName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Date of Birth</Label>
                    <p className="font-semibold">{formatDate(approval.kycData.dateOfBirth)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Nationality</Label>
                    <p className="font-semibold">{approval.kycData.nationality}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">ID Type</Label>
                    <p className="font-semibold">{approval.kycData.idType}</p>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs text-muted-foreground">Address</Label>
                    <p className="font-semibold">{approval.kycData.address}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">ID Number</Label>
                    <p className="font-semibold font-mono">{approval.kycData.idNumber}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">PEP Status</Label>
                    <p className={cn('font-semibold', approval.kycData.isPEP ? 'text-red-600' : 'text-green-600')}>
                      {approval.kycData.isPEP ? 'Yes - Politically Exposed' : 'No'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {approval.transactionData && (
            <Card>
              <CardHeader>
                <CardTitle>Transaction Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Investment</Label>
                    <p className="font-semibold">{approval.transactionData.investmentName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Transaction Type</Label>
                    <p className="font-semibold">{approval.transactionData.transactionType}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Amount</Label>
                    <p className="font-semibold text-green-600 text-2xl">
                      ${formatNumber(approval.transactionData.amount)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Supporting Documents */}
          {approval.documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Supporting Documents</CardTitle>
                <CardDescription>{approval.documents.length} document(s) uploaded</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {approval.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-semibold">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.type} • Uploaded {formatTimeAgo(doc.uploadedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(doc.url, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadDocument(doc.url, doc.name)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Review History */}
          {approval.history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Review History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {approval.history.map((entry, index) => (
                    <div key={entry.id} className="flex items-start space-x-3 pb-4 border-b last:border-0">
                      <Activity className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold">{entry.action}</p>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(entry.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">by {entry.actorName}</p>
                        {entry.notes && (
                          <p className="text-sm mt-2 p-2 bg-muted rounded">{entry.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Submitted</Label>
                  <p className="font-semibold">{formatDate(approval.submittedAt)}</p>
                  <p className="text-xs text-muted-foreground">{formatTimeAgo(approval.submittedAt)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">SLA Deadline</Label>
                  <p className={cn('font-semibold', isSLABreach && 'text-red-600')}>
                    {formatDate(approval.slaDeadline)}
                  </p>
                  <p className={cn('text-xs', isSLABreach ? 'text-red-600 font-semibold' : 'text-muted-foreground')}>
                    {isSLABreach
                      ? `${Math.abs(approval.hoursRemaining)} hours overdue`
                      : `${approval.hoursRemaining} hours remaining`}
                  </p>
                </div>
                {approval.assignedToName && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Assigned To</Label>
                    <p className="font-semibold">{approval.assignedToName}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Review Notes */}
          {canTakeAction && (
            <Card>
              <CardHeader>
                <CardTitle>Review Notes</CardTitle>
                <CardDescription>Add notes for your decision</CardDescription>
              </CardHeader>
              <CardContent>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Enter your review notes here..."
                  className="w-full min-h-[150px] px-3 py-2 border rounded-lg resize-none"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Action Dialogs */}
      {showApproveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center text-green-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                Approve Request
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Are you sure you want to approve this request?</p>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? 'Submitting...' : 'Approve'}
                </Button>
                <Button
                  onClick={() => setShowApproveDialog(false)}
                  disabled={isSubmitting}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showRejectDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <XCircle className="h-5 w-5 mr-2" />
                Reject Request
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Are you sure you want to reject this request? Please provide a reason in the review notes.</p>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={handleReject}
                  disabled={isSubmitting || !reviewNotes.trim()}
                  variant="destructive"
                  className="flex-1"
                >
                  {isSubmitting ? 'Submitting...' : 'Reject'}
                </Button>
                <Button
                  onClick={() => setShowRejectDialog(false)}
                  disabled={isSubmitting}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showInfoDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-600">
                <MessageSquare className="h-5 w-5 mr-2" />
                Request Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Please specify what additional information is needed in the review notes.</p>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={handleRequestInfo}
                  disabled={isSubmitting || !reviewNotes.trim()}
                  className="flex-1"
                >
                  {isSubmitting ? 'Sending...' : 'Send Request'}
                </Button>
                <Button
                  onClick={() => setShowInfoDialog(false)}
                  disabled={isSubmitting}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
