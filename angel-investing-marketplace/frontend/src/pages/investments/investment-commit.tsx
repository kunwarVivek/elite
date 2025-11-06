import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
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
  ArrowLeft,
  Building2,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Info,
  RefreshCw,
  ArrowRight,
  Shield,
  FileText,
  Check,
  Loader2,
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';

/**
 * Investment Commitment Page
 * Multi-step investment commitment form
 * Validates accreditation status and captures investment details
 */

const commitmentSchema = z.object({
  amount: z.number().positive('Investment amount must be positive'),
  investmentType: z.enum(['DIRECT', 'SYNDICATE']),
  syndicateId: z.string().optional(),
  agreementAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the investment agreement',
  }),
  riskAcknowledged: z.boolean().refine((val) => val === true, {
    message: 'You must acknowledge the investment risks',
  }),
  accreditationConfirmed: z.boolean().refine((val) => val === true, {
    message: 'You must confirm your accreditation status',
  }),
});

type CommitmentFormData = z.infer<typeof commitmentSchema>;

interface PitchSummary {
  id: string;
  startup: {
    name: string;
    logo?: string;
  };
  title: string;
  minInvestment: number;
  maxInvestment?: number;
  equityOffered: number;
  valuation: number;
  fundingGoal: number;
}

interface AccreditationStatus {
  isAccredited: boolean;
  status: string;
  expiresAt?: string;
  method?: string;
}

const STEPS = [
  { title: 'Amount', description: 'Choose investment amount' },
  { title: 'Review', description: 'Review investment terms' },
  { title: 'Agreements', description: 'Accept legal terms' },
  { title: 'Confirm', description: 'Confirm your investment' },
];

export function InvestmentCommitPage() {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const pitchId = (params as any).id;

  const [pitch, setPitch] = useState<PitchSummary | null>(null);
  const [accreditationStatus, setAccreditationStatus] = useState<AccreditationStatus | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CommitmentFormData>({
    resolver: zodResolver(commitmentSchema),
    defaultValues:{
      investmentType: 'DIRECT',
      agreementAccepted: false,
      riskAcknowledged: false,
      accreditationConfirmed: false,
    },
  });

  const amount = watch('amount');
  const investmentType = watch('investmentType');

  useEffect(() => {
    if (pitchId) {
      fetchPitchSummary();
      fetchAccreditationStatus();
    }
  }, [pitchId]);

  const fetchPitchSummary = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/pitches/${pitchId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch investment details');
      }

      const result = await response.json();
      setPitch(result.data.pitch);

      // Set minimum investment as default
      if (result.data.pitch.minInvestment) {
        setValue('amount', result.data.pitch.minInvestment);
      }
    } catch (err: any) {
      console.error('Error fetching pitch:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccreditationStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/accreditation/status', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.ok) {
        const result = await response.json();
        setAccreditationStatus(result.data);
      }
    } catch (err: any) {
      console.error('Error fetching accreditation:', err);
    }
  };

  const calculateEquityPercentage = (): number => {
    if (!pitch || !amount) return 0;
    const investmentEquity = (amount / pitch.fundingGoal) * pitch.equityOffered;
    return investmentEquity;
  };

  const calculateShareValue = (): number => {
    if (!pitch || !amount) return 0;
    return (amount / pitch.valuation) * 100;
  };

  const handleNext = () => {
    // Validate current step before proceeding
    if (currentStep === 1) {
      if (!amount || amount < (pitch?.minInvestment || 0)) {
        setError(`Minimum investment is $${formatNumber(pitch?.minInvestment || 0)}`);
        return;
      }
      if (pitch?.maxInvestment && amount > pitch.maxInvestment) {
        setError(`Maximum investment is $${formatNumber(pitch.maxInvestment)}`);
        return;
      }
      if (!accreditationStatus?.isAccredited) {
        setError('You must be an accredited investor to proceed');
        return;
      }
    }

    setError(null);
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const onSubmit = async (data: CommitmentFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/investments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pitchId,
          amount: data.amount,
          investmentType: data.investmentType,
          syndicateId: data.syndicateId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit investment');
      }

      const result = await response.json();

      // Navigate to payment page
      navigate({ to: `/investments/${pitchId}/payment/${result.data.investment.id}` });
    } catch (err: any) {
      console.error('Error submitting investment:', err);
      setError(err.message || 'Failed to submit investment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading investment details...</span>
        </div>
      </div>
    );
  }

  if (!pitch) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Investment opportunity not found</AlertDescription>
        </Alert>
        <Button onClick={() => navigate({ to: '/investments' })} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Marketplace
        </Button>
      </div>
    );
  }

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <Button
        variant="ghost"
        onClick={() => navigate({ to: `/investments/${pitchId}` })}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Investment Details
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Invest in {pitch.startup.name}</h1>
        <p className="text-muted-foreground">{pitch.title}</p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
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
                      'h-full transition-all',
                      currentStep > index + 1 ? 'bg-green-600' : 'bg-gray-200'
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

      {/* Accreditation Warning */}
      {!accreditationStatus?.isAccredited && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Accreditation Required:</strong> You must be an accredited investor to invest in this opportunity.
            <Button
              variant="link"
              className="p-0 h-auto ml-2"
              onClick={() => navigate({ to: '/accreditation' })}
            >
              Complete Accreditation
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="pt-6">
                {/* Step 1: Amount */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold mb-4">Choose Your Investment Amount</h3>

                      <div className="mb-4">
                        <Label htmlFor="amount">
                          Investment Amount (USD)
                          <span className="text-red-600 ml-1">*</span>
                        </Label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                            $
                          </span>
                          <Input
                            id="amount"
                            type="number"
                            {...register('amount', { valueAsNumber: true })}
                            className={cn('pl-7 text-lg h-12', errors.amount && 'border-red-600')}
                            placeholder="10000"
                          />
                        </div>
                        {errors.amount && (
                          <p className="text-sm text-red-600 mt-1">{errors.amount.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Min: ${formatNumber(pitch.minInvestment)}
                          {pitch.maxInvestment && ` • Max: $${formatNumber(pitch.maxInvestment)}`}
                        </p>
                      </div>

                      {/* Quick Select Buttons */}
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        {[pitch.minInvestment, 25000, 50000, 100000].map((value) => (
                          <Button
                            key={value}
                            type="button"
                            variant="outline"
                            onClick={() => setValue('amount', value)}
                            className={cn(amount === value && 'border-primary')}
                          >
                            ${formatNumber(value / 1000)}K
                          </Button>
                        ))}
                      </div>

                      <div>
                        <Label>Investment Type</Label>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          <button
                            type="button"
                            onClick={() => setValue('investmentType', 'DIRECT')}
                            className={cn(
                              'p-4 border-2 rounded-lg text-left transition-all',
                              investmentType === 'DIRECT'
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-200 hover:border-gray-300'
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold">Direct Investment</span>
                              {investmentType === 'DIRECT' && (
                                <CheckCircle className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Invest directly in the company
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setValue('investmentType', 'SYNDICATE')}
                            className={cn(
                              'p-4 border-2 rounded-lg text-left transition-all',
                              investmentType === 'SYNDICATE'
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-200 hover:border-gray-300'
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold">Through Syndicate</span>
                              {investmentType === 'SYNDICATE' && (
                                <CheckCircle className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Join a syndicate for this deal
                            </p>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Review */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold mb-4">Review Your Investment</h3>

                      <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-muted-foreground">Investment Amount</span>
                            <span className="text-2xl font-bold text-green-600">
                              ${formatNumber(amount)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm pb-2 border-b">
                            <span className="text-muted-foreground">Estimated Equity</span>
                            <span className="font-semibold">{calculateEquityPercentage().toFixed(4)}%</span>
                          </div>
                          <div className="flex items-center justify-between text-sm pt-2">
                            <span className="text-muted-foreground">Share of Company Value</span>
                            <span className="font-semibold">${formatNumber(amount * (pitch.valuation / pitch.fundingGoal))}</span>
                          </div>
                        </div>

                        <div className="p-4 border rounded-lg">
                          <h4 className="font-semibold mb-3">Investment Terms</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Company Valuation</span>
                              <span className="font-semibold">${formatNumber(pitch.valuation)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Funding Goal</span>
                              <span className="font-semibold">${formatNumber(pitch.fundingGoal)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Equity Offered</span>
                              <span className="font-semibold">{pitch.equityOffered}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Investment Type</span>
                              <span className="font-semibold">{investmentType === 'DIRECT' ? 'Direct' : 'Syndicate'}</span>
                            </div>
                          </div>
                        </div>

                        <Alert className="border-blue-600 bg-blue-50">
                          <Info className="h-4 w-4 text-blue-600" />
                          <AlertDescription className="text-blue-800">
                            Your investment will be held in escrow until the funding round closes.
                            You will receive your equity shares within 30 days of close.
                          </AlertDescription>
                        </Alert>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Agreements */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold mb-4">Investment Agreements</h3>

                      <div className="space-y-4">
                        <div className="p-4 border rounded-lg">
                          <label className="flex items-start space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              {...register('accreditationConfirmed')}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <p className="font-semibold">Accredited Investor Confirmation</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                I confirm that I am an accredited investor as defined by SEC regulations
                                and have verified my status through this platform.
                              </p>
                            </div>
                          </label>
                          {errors.accreditationConfirmed && (
                            <p className="text-sm text-red-600 mt-2">{errors.accreditationConfirmed.message}</p>
                          )}
                        </div>

                        <div className="p-4 border rounded-lg">
                          <label className="flex items-start space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              {...register('riskAcknowledged')}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <p className="font-semibold">Risk Acknowledgment</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                I understand that investing in startups is high-risk and I may lose my entire investment.
                                I acknowledge that these securities have not been registered with the SEC and are offered
                                under Regulation D.
                              </p>
                            </div>
                          </label>
                          {errors.riskAcknowledged && (
                            <p className="text-sm text-red-600 mt-2">{errors.riskAcknowledged.message}</p>
                          )}
                        </div>

                        <div className="p-4 border rounded-lg">
                          <label className="flex items-start space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              {...register('agreementAccepted')}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <p className="font-semibold">Investment Agreement</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                I have read and agree to the{' '}
                                <a href="#" className="text-blue-600 underline">Subscription Agreement</a>,{' '}
                                <a href="#" className="text-blue-600 underline">Terms of Service</a>, and{' '}
                                <a href="#" className="text-blue-600 underline">Privacy Policy</a>.
                              </p>
                            </div>
                          </label>
                          {errors.agreementAccepted && (
                            <p className="text-sm text-red-600 mt-2">{errors.agreementAccepted.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Confirm */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="text-center py-8">
                      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2">Ready to Invest!</h3>
                      <p className="text-muted-foreground mb-6">
                        Review your investment details one final time before proceeding to payment
                      </p>

                      <div className="max-w-md mx-auto p-6 bg-gray-50 rounded-lg text-left space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Company</span>
                          <span className="font-semibold">{pitch.startup.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Investment Amount</span>
                          <span className="text-lg font-bold text-green-600">${formatNumber(amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Estimated Equity</span>
                          <span className="font-semibold">{calculateEquityPercentage().toFixed(4)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Investment Type</span>
                          <span className="font-semibold">{investmentType === 'DIRECT' ? 'Direct' : 'Syndicate'}</span>
                        </div>
                      </div>

                      {error && (
                        <Alert variant="destructive" className="mt-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t">
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      onClick={handleBack}
                      variant="outline"
                      disabled={isSubmitting}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                  )}

                  {currentStep < 4 ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="ml-auto"
                      disabled={!accreditationStatus?.isAccredited && currentStep === 1}
                    >
                      Continue
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      className="ml-auto"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Proceed to Payment
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Investment Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Investment Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3 pb-4 border-b mb-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    {pitch.startup.logo ? (
                      <img src={pitch.startup.logo} alt={pitch.startup.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Building2 className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold">{pitch.startup.name}</p>
                    <p className="text-xs text-muted-foreground">{pitch.title}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Your Investment</span>
                    <span className="font-bold text-green-600">${formatNumber(amount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estimated Equity</span>
                    <span className="font-semibold">{calculateEquityPercentage().toFixed(4)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valuation</span>
                    <span className="font-semibold">${formatNumber(pitch.valuation)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Accreditation Status */}
            {accreditationStatus && (
              <Card>
                <CardHeader>
                  <CardTitle>Accreditation Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {accreditationStatus.isAccredited ? (
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-semibold">Verified</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center space-x-2 text-yellow-600 mb-2">
                        <AlertCircle className="h-5 w-5" />
                        <span className="font-semibold">Pending</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => navigate({ to: '/accreditation' })}
                      >
                        Complete Verification
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Security */}
            <Card>
              <CardHeader>
                <CardTitle>Secure Investment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-2">
                    <Shield className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-semibold">Escrow Protected</p>
                      <p className="text-xs text-muted-foreground">Funds held securely until close</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <FileText className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-semibold">Legal Documentation</p>
                      <p className="text-xs text-muted-foreground">Comprehensive agreements provided</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-semibold">SEC Compliant</p>
                      <p className="text-xs text-muted-foreground">Regulation D offering</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
