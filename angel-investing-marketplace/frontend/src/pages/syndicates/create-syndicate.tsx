import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useForm, useFieldArray } from 'react-hook-form';
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
  ArrowRight,
  Users,
  DollarSign,
  Target,
  Info,
  Loader2,
  Check,
  Plus,
  X,
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';

/**
 * Create Syndicate Page
 * Multi-step form for lead investors to create investment syndicates
 */

const syndicateSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(50, 'Description must be at least 50 characters'),
  targetAmount: z.number().min(50000, 'Target must be at least $50,000'),
  minimumInvestment: z.number().min(5000, 'Minimum must be at least $5,000'),
  carryPercentage: z.number().min(0).max(30, 'Carry must be between 0-30%'),
  managementFee: z.number().min(0).max(5, 'Management fee must be between 0-5%'),
  maxMembers: z.number().optional(),
  focus: z.array(z.string()).min(1, 'Select at least one focus area'),
  terms: z.string().min(100, 'Terms must be at least 100 characters'),
});

type SyndicateFormData = z.infer<typeof syndicateSchema>;

const FOCUS_OPTIONS = [
  'SaaS', 'Fintech', 'Healthcare', 'AI/ML', 'Enterprise',
  'Consumer', 'CleanTech', 'EdTech', 'Deep Tech', 'Biotech',
];

const STEPS = [
  { title: 'Basic Info', description: 'Name and description' },
  { title: 'Structure', description: 'Financial terms' },
  { title: 'Focus', description: 'Investment areas' },
  { title: 'Terms', description: 'Legal terms' },
];

export function CreateSyndicatePage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SyndicateFormData>({
    resolver: zodResolver(syndicateSchema),
    defaultValues: {
      carryPercentage: 20,
      managementFee: 2,
      focus: [],
    },
  });

  const focus = watch('focus') || [];
  const carryPercentage = watch('carryPercentage');
  const managementFee = watch('managementFee');

  const toggleFocus = (area: string) => {
    const current = focus || [];
    if (current.includes(area)) {
      setValue('focus', current.filter((f) => f !== area));
    } else {
      setValue('focus', [...current, area]);
    }
  };

  const handleNext = () => {
    setError(null);
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const onSubmit = async (data: SyndicateFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/syndicates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create syndicate');
      }

      const result = await response.json();
      navigate({ to: `/syndicates/${result.data.syndicate.id}` });
    } catch (err: any) {
      console.error('Error creating syndicate:', err);
      setError(err.message || 'Failed to create syndicate');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <Button
        variant="ghost"
        onClick={() => navigate({ to: '/syndicates' })}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Syndicates
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create Syndicate</h1>
        <p className="text-muted-foreground">
          Launch your own investment syndicate and lead deals
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((step, index) => (
            <div key={index} className="flex items-center">
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
                <div className="flex-1 h-1 bg-gray-200 mx-2 mt-[-20px] w-16">
                  <div
                    className={cn('h-full', currentStep > index + 1 ? 'bg-green-600' : 'bg-gray-200')}
                    style={{ width: currentStep > index + 1 ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="pt-6">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold mb-4">Basic Information</h3>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">
                        Syndicate Name
                        <span className="text-red-600 ml-1">*</span>
                      </Label>
                      <Input
                        id="name"
                        {...register('name')}
                        placeholder="My Investment Syndicate"
                        className={cn('mt-1', errors.name && 'border-red-600')}
                      />
                      {errors.name && (
                        <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="description">
                        Description
                        <span className="text-red-600 ml-1">*</span>
                      </Label>
                      <textarea
                        id="description"
                        {...register('description')}
                        placeholder="Describe your syndicate's investment thesis, strategy, and what makes it unique..."
                        className={cn(
                          'w-full min-h-[120px] px-3 py-2 border rounded-lg resize-none mt-1',
                          errors.description && 'border-red-600'
                        )}
                      />
                      {errors.description && (
                        <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">Minimum 50 characters</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Structure */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold mb-4">Financial Structure</h3>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="targetAmount">
                          Target Amount (USD)
                          <span className="text-red-600 ml-1">*</span>
                        </Label>
                        <Input
                          id="targetAmount"
                          type="number"
                          {...register('targetAmount', { valueAsNumber: true })}
                          placeholder="500000"
                          className={cn('mt-1', errors.targetAmount && 'border-red-600')}
                        />
                        {errors.targetAmount && (
                          <p className="text-sm text-red-600 mt-1">{errors.targetAmount.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">Min: $50,000</p>
                      </div>

                      <div>
                        <Label htmlFor="minimumInvestment">
                          Minimum Investment
                          <span className="text-red-600 ml-1">*</span>
                        </Label>
                        <Input
                          id="minimumInvestment"
                          type="number"
                          {...register('minimumInvestment', { valueAsNumber: true })}
                          placeholder="10000"
                          className={cn('mt-1', errors.minimumInvestment && 'border-red-600')}
                        />
                        {errors.minimumInvestment && (
                          <p className="text-sm text-red-600 mt-1">{errors.minimumInvestment.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">Min: $5,000</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="carryPercentage">
                          Carry Percentage
                          <span className="text-red-600 ml-1">*</span>
                        </Label>
                        <Input
                          id="carryPercentage"
                          type="number"
                          {...register('carryPercentage', { valueAsNumber: true })}
                          placeholder="20"
                          className={cn('mt-1', errors.carryPercentage && 'border-red-600')}
                        />
                        {errors.carryPercentage && (
                          <p className="text-sm text-red-600 mt-1">{errors.carryPercentage.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">Standard: 20%</p>
                      </div>

                      <div>
                        <Label htmlFor="managementFee">
                          Management Fee %
                          <span className="text-red-600 ml-1">*</span>
                        </Label>
                        <Input
                          id="managementFee"
                          type="number"
                          {...register('managementFee', { valueAsNumber: true })}
                          placeholder="2"
                          className={cn('mt-1', errors.managementFee && 'border-red-600')}
                        />
                        {errors.managementFee && (
                          <p className="text-sm text-red-600 mt-1">{errors.managementFee.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">Standard: 2%</p>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="maxMembers">Max Members (Optional)</Label>
                      <Input
                        id="maxMembers"
                        type="number"
                        {...register('maxMembers', { valueAsNumber: true })}
                        placeholder="No limit"
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Leave empty for unlimited</p>
                    </div>

                    <Alert className="border-blue-600 bg-blue-50">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800 text-sm">
                        <strong>Carry:</strong> You receive {carryPercentage || 20}% of profits above invested capital.
                        <br />
                        <strong>Management Fee:</strong> {managementFee || 2}% annual fee on committed capital.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Focus */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold mb-4">Investment Focus</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select the industries and sectors your syndicate will focus on
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {FOCUS_OPTIONS.map((area) => (
                      <button
                        key={area}
                        type="button"
                        onClick={() => toggleFocus(area)}
                        className={cn(
                          'p-4 border-2 rounded-lg text-left transition-all',
                          focus.includes(area)
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{area}</span>
                          {focus.includes(area) && <Check className="h-5 w-5 text-primary" />}
                        </div>
                      </button>
                    ))}
                  </div>

                  {errors.focus && (
                    <p className="text-sm text-red-600 mt-2">{errors.focus.message}</p>
                  )}

                  {focus.length > 0 && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg">
                      <p className="text-sm font-semibold text-green-800 mb-2">
                        Selected: {focus.length} {focus.length === 1 ? 'area' : 'areas'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {focus.map((area) => (
                          <span
                            key={area}
                            className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-semibold"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Terms */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold mb-4">Legal Terms & Conditions</h3>

                  <div>
                    <Label htmlFor="terms">
                      Syndicate Terms
                      <span className="text-red-600 ml-1">*</span>
                    </Label>
                    <textarea
                      id="terms"
                      {...register('terms')}
                      placeholder="Enter the legal terms and conditions for your syndicate. Include investment criteria, decision-making process, exit strategy, and member responsibilities..."
                      className={cn(
                        'w-full min-h-[200px] px-3 py-2 border rounded-lg resize-none mt-1',
                        errors.terms && 'border-red-600'
                      )}
                    />
                    {errors.terms && (
                      <p className="text-sm text-red-600 mt-1">{errors.terms.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Minimum 100 characters</p>
                  </div>

                  <Alert className="border-orange-600 bg-orange-50 mt-4">
                    <Info className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800 text-sm">
                      <strong>Legal Notice:</strong> These terms will be binding. Consider consulting with a legal professional before creating your syndicate.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t">
              {currentStep > 1 && (
                <Button type="button" onClick={handleBack} variant="outline" disabled={isSubmitting}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}

              {currentStep < 4 ? (
                <Button type="button" onClick={handleNext} className="ml-auto">
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" className="ml-auto" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Syndicate'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
