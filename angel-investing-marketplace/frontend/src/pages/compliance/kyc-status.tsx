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
  RefreshCw,
  Shield,
  Info,
  AlertTriangle,
  TrendingUp,
  FileText,
  Calendar
} from 'lucide-react';
import { cn, formatDate, formatTimeAgo } from '@/lib/utils';

/**
 * KYC Status Dashboard
 * Shows KYC/AML verification status, risk assessment, and screening results
 */

type KYCStatus = 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'REQUIRES_REVIEW';
type AMLStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'REQUIRES_REVIEW';
type PEPStatus = 'CLEAR' | 'PEP' | 'FAMILY_MEMBER' | 'CLOSE_ASSOCIATE' | 'NOT_CHECKED';
type SanctionStatus = 'CLEAR' | 'PARTIAL_MATCH' | 'FULL_MATCH' | 'NOT_CHECKED';

interface ComplianceStatus {
  kycStatus: KYCStatus;
  kycVerifiedAt?: string;
  amlStatus: AMLStatus;
  amlVerifiedAt?: string;
  riskScore: number;
  pepStatus: PEPStatus;
  sanctionStatus: SanctionStatus;
  lastReview?: string;
  nextReview?: string;
  needsRescreening: boolean;
  latestScreening?: {
    id: string;
    action: string;
    status: string;
    createdAt: string;
  };
}

const KYC_STATUS_CONFIG = {
  NOT_SUBMITTED: {
    icon: Clock,
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    label: 'Not Submitted',
    description: 'You haven\'t submitted KYC verification yet.',
  },
  PENDING: {
    icon: Clock,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    label: 'Pending Verification',
    description: 'Your KYC verification is being processed.',
  },
  VERIFIED: {
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    label: 'Verified',
    description: 'Your identity has been successfully verified.',
  },
  REJECTED: {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    label: 'Verification Failed',
    description: 'Your KYC verification was not approved.',
  },
  REQUIRES_REVIEW: {
    icon: AlertCircle,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    label: 'Manual Review Required',
    description: 'Your application requires manual review by our compliance team.',
  },
};

const AML_STATUS_CONFIG = {
  PENDING: { label: 'Pending', color: 'text-yellow-600' },
  PASSED: { label: 'Passed', color: 'text-green-600' },
  FAILED: { label: 'Failed', color: 'text-red-600' },
  REQUIRES_REVIEW: { label: 'Requires Review', color: 'text-orange-600' },
};

const PEP_STATUS_CONFIG = {
  CLEAR: { label: 'Clear', color: 'text-green-600', icon: CheckCircle },
  PEP: { label: 'PEP Identified', color: 'text-red-600', icon: AlertTriangle },
  FAMILY_MEMBER: { label: 'PEP Family Member', color: 'text-orange-600', icon: AlertTriangle },
  CLOSE_ASSOCIATE: { label: 'PEP Close Associate', color: 'text-orange-600', icon: AlertTriangle },
  NOT_CHECKED: { label: 'Not Checked', color: 'text-gray-600', icon: Clock },
};

const SANCTION_STATUS_CONFIG = {
  CLEAR: { label: 'Clear', color: 'text-green-600', icon: CheckCircle },
  PARTIAL_MATCH: { label: 'Partial Match', color: 'text-orange-600', icon: AlertTriangle },
  FULL_MATCH: { label: 'Full Match', color: 'text-red-600', icon: XCircle },
  NOT_CHECKED: { label: 'Not Checked', color: 'text-gray-600', icon: Clock },
};

export function KycStatusPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ComplianceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRescreening, setIsRescreening] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/compliance/status', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch KYC status');
      }

      const result = await response.json();
      setStatus(result.data);
    } catch (err: any) {
      console.error('Error fetching status:', err);
      setError(err.message || 'Failed to load KYC status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRescreen = async () => {
    setIsRescreening(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/compliance/rescreen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to request rescreening');
      }

      alert('Rescreening initiated successfully!');
      fetchStatus();
    } catch (err: any) {
      console.error('Rescreen error:', err);
      alert(err.message || 'Failed to initiate rescreening');
    } finally {
      setIsRescreening(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading KYC status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchStatus} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  // Not submitted yet
  if (!status || status.kycStatus === 'NOT_SUBMITTED') {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>KYC Verification Status</CardTitle>
            <CardDescription>You haven't submitted KYC verification yet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                KYC (Know Your Customer) verification is required to comply with anti-money laundering (AML)
                regulations and to access investment features on our platform.
              </AlertDescription>
            </Alert>
            <Button onClick={() => navigate({ to: '/compliance/kyc-submission' })}>
              Start KYC Verification
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const kycConfig = KYC_STATUS_CONFIG[status.kycStatus];
  const KYCIcon = kycConfig.icon;
  const amlConfig = AML_STATUS_CONFIG[status.amlStatus];
  const pepConfig = PEP_STATUS_CONFIG[status.pepStatus];
  const PEPIcon = pepConfig.icon;
  const sanctionConfig = SANCTION_STATUS_CONFIG[status.sanctionStatus];
  const SanctionIcon = sanctionConfig.icon;

  // Risk level categorization
  const getRiskLevel = (score: number): { label: string; color: string; bg: string } => {
    if (score < 30) return { label: 'Low Risk', color: 'text-green-600', bg: 'bg-green-50' };
    if (score < 60) return { label: 'Medium Risk', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    if (score < 80) return { label: 'High Risk', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { label: 'Very High Risk', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const riskLevel = getRiskLevel(status.riskScore);

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">KYC Verification Status</h1>
        <p className="text-muted-foreground">
          Your Know Your Customer verification and compliance status
        </p>
      </div>

      {/* Main Status Card */}
      <Card className={cn('mb-6', kycConfig.border)}>
        <CardHeader className={kycConfig.bg}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={cn('p-3 rounded-full', kycConfig.bg, 'border-2', kycConfig.border)}>
                <KYCIcon className={cn('h-6 w-6', kycConfig.color)} />
              </div>
              <div>
                <CardTitle className={kycConfig.color}>{kycConfig.label}</CardTitle>
                <CardDescription>{kycConfig.description}</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchStatus}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">KYC Status</p>
              <p className={cn('font-semibold', kycConfig.color)}>{kycConfig.label}</p>
              {status.kycVerifiedAt && (
                <p className="text-xs text-muted-foreground">Verified {formatTimeAgo(status.kycVerifiedAt)}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">AML Status</p>
              <p className={cn('font-semibold', amlConfig.color)}>{amlConfig.label}</p>
              {status.amlVerifiedAt && (
                <p className="text-xs text-muted-foreground">Checked {formatTimeAgo(status.amlVerifiedAt)}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Risk Score</p>
              <p className={cn('font-semibold', riskLevel.color)}>{status.riskScore}/100</p>
              <p className="text-xs text-muted-foreground">{riskLevel.label}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rescreening Alert */}
      {status.needsRescreening && (
        <Alert className="mb-6 border-orange-600 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <strong>Rescreening Required:</strong> Your compliance review period has expired.
            Please complete rescreening to maintain platform access.
            <Button
              onClick={handleRescreen}
              disabled={isRescreening}
              className="ml-4"
              size="sm"
            >
              {isRescreening ? 'Processing...' : 'Rescreen Now'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Review Schedule */}
      {(status.lastReview || status.nextReview) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Compliance Review Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                {status.lastReview && (
                  <div>
                    <p className="text-sm text-muted-foreground">Last Review</p>
                    <p className="font-semibold">{formatDate(status.lastReview)}</p>
                  </div>
                )}
                {status.nextReview && (
                  <div>
                    <p className="text-sm text-muted-foreground">Next Review Due</p>
                    <p className="font-semibold">{formatDate(status.nextReview)}</p>
                  </div>
                )}
              </div>
              <Button
                onClick={handleRescreen}
                disabled={isRescreening}
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {isRescreening ? 'Processing...' : 'Request Rescreen'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Assessment */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Assessment</CardTitle>
            <CardDescription>Compliance risk evaluation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Risk Score Visualization */}
            <div className={cn('p-4 rounded-lg', riskLevel.bg)}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Risk Score</span>
                <span className={cn('text-2xl font-bold', riskLevel.color)}>
                  {status.riskScore}
                </span>
              </div>
              <Progress value={status.riskScore} className="h-2" />
              <p className={cn('text-xs mt-2', riskLevel.color)}>{riskLevel.label}</p>
            </div>

            {/* PEP Status */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-2">
                <PEPIcon className={cn('h-5 w-5', pepConfig.color)} />
                <div>
                  <p className="text-sm font-medium">PEP Status</p>
                  <p className={cn('text-xs', pepConfig.color)}>{pepConfig.label}</p>
                </div>
              </div>
            </div>

            {/* Sanctions Status */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-2">
                <SanctionIcon className={cn('h-5 w-5', sanctionConfig.color)} />
                <div>
                  <p className="text-sm font-medium">Sanctions Screening</p>
                  <p className={cn('text-xs', sanctionConfig.color)}>{sanctionConfig.label}</p>
                </div>
              </div>
            </div>

            {/* Risk Explanation */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Risk Score:</strong> Based on PEP status, sanctions screening, adverse media,
                and other compliance factors. Lower scores indicate lower compliance risk.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Screening Details */}
        <Card>
          <CardHeader>
            <CardTitle>Screening Details</CardTitle>
            <CardDescription>Latest compliance screening results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status.latestScreening ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">Latest Screening</p>
                      <p className="text-xs text-muted-foreground">
                        {status.latestScreening.action}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{status.latestScreening.status}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimeAgo(status.latestScreening.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Screening Coverage</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Identity Verification</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">PEP Screening</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Sanctions Lists</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Adverse Media</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No screening data available</p>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate({ to: '/compliance/history' })}
            >
              <FileText className="h-4 w-4 mr-2" />
              View Full Screening History
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Additional Information */}
      {status.kycStatus === 'VERIFIED' && (
        <Card className="mt-6 border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center text-green-700">
              <Shield className="h-5 w-5 mr-2" />
              Verified Benefits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Full Platform Access</p>
                  <p className="text-sm text-muted-foreground">
                    Access all investment opportunities and features
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Higher Transaction Limits</p>
                  <p className="text-sm text-muted-foreground">
                    Increased investment and withdrawal limits
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Priority Support</p>
                  <p className="text-sm text-muted-foreground">
                    Faster response times for verified investors
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Secure Trading</p>
                  <p className="text-sm text-muted-foreground">
                    Compliant and secure investment environment
                  </p>
                </div>
              </div>
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
            If you have questions about your KYC status or need to update your information,
            please contact our compliance team.
          </p>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => navigate({ to: '/support' })}>
              Contact Support
            </Button>
            <Button variant="outline" onClick={() => navigate({ to: '/faq/kyc' })}>
              KYC FAQ
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
