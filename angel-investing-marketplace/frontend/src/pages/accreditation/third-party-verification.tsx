import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Progress } from '../../components/ui/progress';
import {
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Shield,
  Building2,
  FileText,
  ExternalLink,
  AlertCircle,
  Info,
  Loader2,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Third-Party Verification Page
 * Accreditation verification through third-party services
 * Integrates with VerifyInvestor, AngelList, and other verification providers
 */

const thirdPartySchema = z.object({
  provider: z.enum(['VERIFY_INVESTOR', 'ANGELLIST', 'CARTA', 'OTHER']),
  verificationId: z.string().min(1, 'Verification ID is required'),
  email: z.string().email('Invalid email address'),
  consent: z.boolean().refine((val) => val === true, {
    message: 'You must consent to verification',
  }),
});

type ThirdPartyFormData = z.infer<typeof thirdPartySchema>;

interface VerificationStatus {
  status: 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED';
  verifiedAt?: string;
  expiresAt?: string;
  provider: string;
  details?: string;
}

const PROVIDERS = [
  {
    value: 'VERIFY_INVESTOR',
    name: 'VerifyInvestor',
    description: 'Instant verification through VerifyInvestor network',
    logo: Building2,
    recommended: true,
    processingTime: 'Instant',
    cost: 'Free',
    url: 'https://verifyinvestor.com',
  },
  {
    value: 'ANGELLIST',
    name: 'AngelList',
    description: 'Verify using your AngelList accreditation status',
    logo: Shield,
    recommended: true,
    processingTime: '1-2 minutes',
    cost: 'Free',
    url: 'https://angel.co',
  },
  {
    value: 'CARTA',
    name: 'Carta',
    description: 'Import verification from Carta platform',
    logo: FileText,
    recommended: false,
    processingTime: '5-10 minutes',
    cost: 'Free',
    url: 'https://carta.com',
  },
  {
    value: 'OTHER',
    name: 'Other Provider',
    description: 'Use another third-party verification service',
    logo: Building2,
    recommended: false,
    processingTime: '1-3 business days',
    cost: 'Varies',
    url: null,
  },
];

const STEPS = [
  { title: 'Select Provider', description: 'Choose verification service' },
  { title: 'Enter Details', description: 'Provide verification information' },
  { title: 'Verify', description: 'Complete verification process' },
];

export function ThirdPartyVerificationPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ThirdPartyFormData>({
    resolver: zodResolver(thirdPartySchema),
    defaultValues: {
      consent: false,
    },
  });

  const provider = watch('provider');

  useEffect(() => {
    if (selectedProvider) {
      setValue('provider', selectedProvider as any);
    }
  }, [selectedProvider, setValue]);

  const handleProviderSelect = (providerValue: string) => {
    setSelectedProvider(providerValue);
    setCurrentStep(2);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      if (currentStep === 2) {
        setSelectedProvider(null);
      }
    }
  };

  const onSubmit = async (data: ThirdPartyFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Step 1: Initiate verification
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/accreditation/third-party/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to initiate verification');
      }

      const result = await response.json();

      // If provider requires external redirect
      if (result.data.redirectUrl) {
        // Open external verification in new tab
        window.open(result.data.redirectUrl, '_blank');
        setCurrentStep(3);

        // Start polling for verification status
        pollVerificationStatus(result.data.verificationId);
      } else {
        // Direct verification completed
        setVerificationStatus(result.data.status);
        setCurrentStep(3);
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.message || 'Failed to initiate verification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pollVerificationStatus = async (verificationId: string) => {
    const maxAttempts = 60; // Poll for up to 5 minutes
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setError('Verification timeout. Please try again or contact support.');
        return;
      }

      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(
          `http://localhost:3001/api/accreditation/third-party/status/${verificationId}`,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to check status');
        }

        const result = await response.json();
        const status = result.data.status;

        setVerificationStatus(status);

        if (status.status === 'PENDING') {
          attempts++;
          setTimeout(poll, 5000); // Poll every 5 seconds
        }
      } catch (err: any) {
        console.error('Status check error:', err);
        setError('Failed to check verification status');
      }
    };

    poll();
  };

  const renderProviderSelection = () => {
    return (
      <div className="space-y-4">
        <Alert className="border-blue-600 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            Third-party verification is the fastest way to confirm your accredited investor status.
            Select a provider you've already been verified with.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PROVIDERS.map((provider) => {
            const Icon = provider.logo;

            return (
              <Card
                key={provider.value}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  selectedProvider === provider.value && 'ring-2 ring-primary',
                  provider.recommended && 'border-blue-500'
                )}
                onClick={() => handleProviderSelect(provider.value)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{provider.name}</CardTitle>
                        {provider.recommended && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded mt-1 inline-block">
                            Recommended
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{provider.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="text-muted-foreground">Processing Time</p>
                      <p className="font-semibold">{provider.processingTime}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cost</p>
                      <p className="font-semibold">{provider.cost}</p>
                    </div>
                  </div>
                  {provider.url && (
                    <Button
                      variant="link"
                      className="p-0 h-auto mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(provider.url, '_blank');
                      }}
                    >
                      Learn more
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDetailsForm = () => {
    const selectedProviderInfo = PROVIDERS.find((p) => p.value === selectedProvider);
    if (!selectedProviderInfo) return null;

    const Icon = selectedProviderInfo.logo;

    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="border-blue-500">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Icon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>{selectedProviderInfo.name}</CardTitle>
                <CardDescription>{selectedProviderInfo.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="space-y-4">
          <div>
            <Label htmlFor="verificationId">
              Verification ID / Account ID
              <span className="text-red-600 ml-1">*</span>
            </Label>
            <Input
              id="verificationId"
              {...register('verificationId')}
              placeholder={`Enter your ${selectedProviderInfo.name} verification ID`}
              className={cn(errors.verificationId && 'border-red-600')}
            />
            {errors.verificationId && (
              <p className="text-sm text-red-600 mt-1">{errors.verificationId.message}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              This can be found in your {selectedProviderInfo.name} account or verification email
            </p>
          </div>

          <div>
            <Label htmlFor="email">
              Email Address
              <span className="text-red-600 ml-1">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="Email used with verification provider"
              className={cn(errors.email && 'border-red-600')}
            />
            {errors.email && (
              <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Must match the email on your {selectedProviderInfo.name} account
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('consent')}
                className="mt-1"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold">Consent to Verification</p>
                <p className="text-xs text-muted-foreground mt-1">
                  I authorize Elite Angel Fund to verify my accreditation status through{' '}
                  {selectedProviderInfo.name}. I understand this will share my verification
                  status and related information with the platform.
                </p>
              </div>
            </label>
            {errors.consent && (
              <p className="text-sm text-red-600 mt-2">{errors.consent.message}</p>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <Button type="button" onClick={handleBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                Start Verification
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </form>
    );
  };

  const renderVerificationStatus = () => {
    if (!verificationStatus) {
      return (
        <div className="text-center py-12">
          <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
          <h3 className="text-lg font-semibold mb-2">Verifying with Provider</h3>
          <p className="text-muted-foreground">
            Please complete the verification in the opened window...
          </p>
        </div>
      );
    }

    if (verificationStatus.status === 'PENDING') {
      return (
        <div className="text-center py-12">
          <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-blue-600" />
          <h3 className="text-lg font-semibold mb-2">Verification in Progress</h3>
          <p className="text-muted-foreground">
            Waiting for confirmation from {verificationStatus.provider}...
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            This usually takes just a few seconds
          </p>
        </div>
      );
    }

    if (verificationStatus.status === 'VERIFIED') {
      return (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-green-600 mb-2">Verification Successful!</h3>
          <p className="text-muted-foreground mb-6">
            Your accredited investor status has been confirmed through {verificationStatus.provider}
          </p>

          <Alert className="border-green-600 bg-green-50 text-left max-w-md mx-auto mb-6">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <strong>Status:</strong> Accredited Investor
              {verificationStatus.expiresAt && (
                <>
                  <br />
                  <strong>Valid Until:</strong> {new Date(verificationStatus.expiresAt).toLocaleDateString()}
                </>
              )}
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-center space-x-3">
            <Button onClick={() => navigate({ to: '/accreditation/status' })}>
              View Status Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button onClick={() => navigate({ to: '/investments' })} variant="outline">
              Browse Investments
            </Button>
          </div>
        </div>
      );
    }

    if (verificationStatus.status === 'FAILED') {
      return (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
          <h3 className="text-2xl font-bold text-red-600 mb-2">Verification Failed</h3>
          <p className="text-muted-foreground mb-6">
            We couldn't verify your accreditation status through {verificationStatus.provider}
          </p>

          {verificationStatus.details && (
            <Alert variant="destructive" className="text-left max-w-md mx-auto mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{verificationStatus.details}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-center space-x-3">
            <Button onClick={() => setCurrentStep(1)} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Try Another Provider
            </Button>
            <Button onClick={() => navigate({ to: '/accreditation' })}>
              Use Different Method
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate({ to: '/accreditation' })}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Accreditation Methods
        </Button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Third-Party Verification</h1>
            <p className="text-muted-foreground">
              Verify your status through a trusted provider
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((step, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-center',
                  index < STEPS.length - 1 && 'flex-1'
                )}
              >
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm mb-1',
                      currentStep > index + 1
                        ? 'bg-green-600 text-white'
                        : currentStep === index + 1
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-gray-200 text-gray-600'
                    )}
                  >
                    {currentStep > index + 1 ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  <p className="text-xs font-semibold text-center">{step.title}</p>
                  <p className="text-xs text-muted-foreground text-center">{step.description}</p>
                </div>
                {index < STEPS.length - 1 && (
                  <div className="flex-1 h-1 bg-gray-200 mx-2 mt-[-20px]">
                    <div
                      className={cn(
                        'h-full bg-primary transition-all',
                        currentStep > index + 1 && 'bg-green-600'
                      )}
                      style={{ width: currentStep > index + 1 ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Content */}
      <Card>
        <CardContent className="pt-6">
          {currentStep === 1 && renderProviderSelection()}
          {currentStep === 2 && renderDetailsForm()}
          {currentStep === 3 && renderVerificationStatus()}
        </CardContent>
      </Card>

      {/* Help Text */}
      {currentStep === 1 && (
        <Alert className="mt-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Don't have a third-party verification?</strong>
            <br />
            You can verify your accreditation status through income, net worth, or professional
            certification methods instead.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
