import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Progress } from '../../components/ui/progress';
import { FileUpload, UploadedFile } from '../../components/file-upload';
import { ArrowLeft, ArrowRight, Save, CheckCircle, Info, AlertCircle, DollarSign } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';

/**
 * Income-Based Accreditation Verification Page
 * Multi-step wizard for income-based investor accreditation
 */

// Form validation schema
const incomeVerificationSchema = z.object({
  annualIncome: z
    .number({ invalid_type_error: 'Annual income must be a number' })
    .min(200000, 'Annual income must be at least $200,000 for accredited investor status'),
  jointFiling: z.boolean().default(false),
  spouseIncome: z.number().optional(),
  expectSameIncome: z.boolean().default(false),
  yearsOfIncome: z.string().min(1, 'Please specify years of income'),
  signature: z.string().min(1, 'Signature is required'),
  iConfirmAccredited: z.boolean().refine((val) => val === true, {
    message: 'You must confirm your accredited investor status',
  }),
  understandRisks: z.boolean().refine((val) => val === true, {
    message: 'You must acknowledge understanding of investment risks',
  }),
}).refine(
  (data) => {
    // If joint filing, combined income must be >= $300K
    if (data.jointFiling) {
      const totalIncome = data.annualIncome + (data.spouseIncome || 0);
      return totalIncome >= 300000;
    }
    return true;
  },
  {
    message: 'Combined income for joint filing must be at least $300,000',
    path: ['spouseIncome'],
  }
);

type IncomeVerificationForm = z.infer<typeof incomeVerificationSchema>;

const STEPS = [
  { id: 1, title: 'Income Details', description: 'Enter your annual income information' },
  { id: 2, title: 'Upload Documents', description: 'Provide supporting documentation' },
  { id: 3, title: 'Declaration', description: 'Confirm and sign declaration' },
];

export function IncomeVerificationPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<IncomeVerificationForm>({
    resolver: zodResolver(incomeVerificationSchema),
    defaultValues: {
      jointFiling: false,
      expectSameIncome: false,
      iConfirmAccredited: false,
      understandRisks: false,
    },
  });

  const jointFiling = watch('jointFiling');
  const annualIncome = watch('annualIncome');
  const spouseIncome = watch('spouseIncome');
  const iConfirmAccredited = watch('iConfirmAccredited');
  const understandRisks = watch('understandRisks');

  const totalIncome = jointFiling ? (annualIncome || 0) + (spouseIncome || 0) : annualIncome || 0;
  const meetsIncomeRequirement = jointFiling ? totalIncome >= 300000 : (annualIncome || 0) >= 200000;

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveDraft = async () => {
    setIsDraft(true);
    // TODO: Save draft to localStorage or API
    alert('Draft saved successfully! You can continue this application later.');
  };

  const onSubmit = async (data: IncomeVerificationForm) => {
    // Validate files on final submission
    if (files.length === 0) {
      setApiError('Please upload at least one supporting document');
      setCurrentStep(2);
      return;
    }

    setIsSubmitting(true);
    setApiError(null);

    try {
      // Step 1: Upload files and get URLs
      const uploadedDocuments = await Promise.all(
        files.map(async (uploadedFile) => {
          // TODO: Replace with actual file upload to backend/S3
          // For now, simulate upload
          return {
            type: uploadedFile.type,
            url: `https://example.com/documents/${uploadedFile.file.name}`,
            description: uploadedFile.description || uploadedFile.file.name,
          };
        })
      );

      // Step 2: Submit accreditation application
      const payload = {
        method: 'INCOME',
        annualIncome: data.annualIncome,
        documents: uploadedDocuments,
        declaration: {
          iConfirmAccredited: data.iConfirmAccredited,
          understandRisks: data.understandRisks,
          signature: data.signature,
          signatureDate: new Date().toISOString(),
        },
      };

      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/accreditation/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit accreditation application');
      }

      // Success! Navigate to status page
      alert('Accreditation application submitted successfully! We will review your application within 2-3 business days.');
      navigate({ to: '/accreditation/status' });
    } catch (error: any) {
      console.error('Submission error:', error);
      setApiError(error.message || 'An error occurred while submitting your application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercentage = (currentStep / STEPS.length) * 100;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate({ to: '/accreditation/start' })}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Method Selection
        </Button>
        <h1 className="text-3xl font-bold mb-2">Income-Based Verification</h1>
        <p className="text-muted-foreground">
          Verify your accredited investor status through annual income
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">
            Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}
          </span>
          <span className="text-sm text-muted-foreground">{progressPercentage.toFixed(0)}% Complete</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
        <div className="flex justify-between mt-4">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={cn(
                'flex-1 text-center',
                currentStep === step.id && 'font-semibold',
                currentStep > step.id && 'text-green-600'
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center border-2',
                  currentStep > step.id
                    ? 'bg-green-600 border-green-600 text-white'
                    : currentStep === step.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/30 text-muted-foreground'
                )}
              >
                {currentStep > step.id ? <CheckCircle className="h-5 w-5" /> : step.id}
              </div>
              <p className="text-xs">{step.title}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {apiError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Income Details */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Income Details
              </CardTitle>
              <CardDescription>
                Individual income must be at least $200,000, or $300,000 combined for joint filing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Annual Income */}
              <div className="space-y-2">
                <Label htmlFor="annualIncome">
                  Your Annual Income <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                  <Input
                    id="annualIncome"
                    type="number"
                    placeholder="200,000"
                    className="pl-7"
                    {...register('annualIncome', { valueAsNumber: true })}
                  />
                </div>
                {errors.annualIncome && (
                  <p className="text-sm text-red-500">{errors.annualIncome.message}</p>
                )}
                {annualIncome && (
                  <p className="text-sm text-muted-foreground">
                    Formatted: ${formatNumber(annualIncome)}
                  </p>
                )}
              </div>

              {/* Joint Filing */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="jointFiling"
                  checked={jointFiling}
                  onCheckedChange={(checked) => setValue('jointFiling', checked as boolean)}
                />
                <Label htmlFor="jointFiling" className="cursor-pointer">
                  Filing jointly with spouse (requires combined income of $300,000+)
                </Label>
              </div>

              {/* Spouse Income (conditional) */}
              {jointFiling && (
                <div className="space-y-2 pl-6 border-l-2 border-primary/20">
                  <Label htmlFor="spouseIncome">
                    Spouse's Annual Income <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                    <Input
                      id="spouseIncome"
                      type="number"
                      placeholder="100,000"
                      className="pl-7"
                      {...register('spouseIncome', { valueAsNumber: true })}
                    />
                  </div>
                  {errors.spouseIncome && (
                    <p className="text-sm text-red-500">{errors.spouseIncome.message}</p>
                  )}
                </div>
              )}

              {/* Income Summary */}
              {annualIncome && (
                <Alert className={meetsIncomeRequirement ? 'border-green-600 bg-green-50' : 'border-orange-600 bg-orange-50'}>
                  <Info className={`h-4 w-4 ${meetsIncomeRequirement ? 'text-green-600' : 'text-orange-600'}`} />
                  <AlertDescription>
                    <strong>Total Income: ${formatNumber(totalIncome)}</strong>
                    <br />
                    {meetsIncomeRequirement ? (
                      <span className="text-green-700">✓ Meets accreditation requirement</span>
                    ) : (
                      <span className="text-orange-700">
                        ✗ Does not meet requirement ({jointFiling ? '$300,000' : '$200,000'} minimum)
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Years of Income */}
              <div className="space-y-2">
                <Label htmlFor="yearsOfIncome">
                  Years with this income level <span className="text-red-500">*</span>
                </Label>
                <select
                  id="yearsOfIncome"
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  {...register('yearsOfIncome')}
                >
                  <option value="">Select...</option>
                  <option value="current">Current year only</option>
                  <option value="2">Past 2 years</option>
                  <option value="3">Past 3 years</option>
                  <option value="5+">5+ years</option>
                </select>
                {errors.yearsOfIncome && (
                  <p className="text-sm text-red-500">{errors.yearsOfIncome.message}</p>
                )}
              </div>

              {/* Expectation */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="expectSameIncome"
                  checked={watch('expectSameIncome')}
                  onCheckedChange={(checked) => setValue('expectSameIncome', checked as boolean)}
                />
                <Label htmlFor="expectSameIncome" className="cursor-pointer">
                  I reasonably expect to maintain this income level in the current year
                </Label>
              </div>

              {/* Info Alert */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Required Documentation:</strong> You'll need to upload tax returns or W-2 forms
                  for the past 2 years in the next step to verify your income.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Upload Documents */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Supporting Documents</CardTitle>
              <CardDescription>
                Upload your tax returns, W-2 forms, or other income verification documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FileUpload
                files={files}
                onFilesChange={setFiles}
                maxFiles={5}
                maxSize={10 * 1024 * 1024}
                label="Income Verification Documents"
                required
                documentTypeOptions={[
                  { value: 'tax_return', label: 'Tax Return (1040)' },
                  { value: 'w2', label: 'W-2 Form' },
                  { value: 'bank_statement', label: 'Bank Statement' },
                  { value: 'pay_stub', label: 'Pay Stub' },
                  { value: 'other', label: 'Other' },
                ]}
              />

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Accepted Documents:</strong>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>IRS Form 1040 for the past 2 years</li>
                    <li>W-2 forms for the past 2 years</li>
                    <li>Bank statements showing income deposits</li>
                    <li>Employer letter confirming salary</li>
                  </ul>
                  All documents must be clear and legible. Personal information should be visible.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Declaration */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Declaration and Signature</CardTitle>
              <CardDescription>
                Please review and confirm your accreditation declaration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h4 className="font-semibold">Application Summary</h4>
                <div className="text-sm space-y-1">
                  <p>
                    <strong>Verification Method:</strong> Income-Based
                  </p>
                  <p>
                    <strong>Annual Income:</strong> ${formatNumber(annualIncome || 0)}
                  </p>
                  {jointFiling && (
                    <>
                      <p>
                        <strong>Spouse Income:</strong> ${formatNumber(spouseIncome || 0)}
                      </p>
                      <p>
                        <strong>Combined Income:</strong> ${formatNumber(totalIncome)}
                      </p>
                    </>
                  )}
                  <p>
                    <strong>Documents Uploaded:</strong> {files.length} file{files.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Declarations */}
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="iConfirmAccredited"
                    checked={iConfirmAccredited}
                    onCheckedChange={(checked) => setValue('iConfirmAccredited', checked as boolean)}
                  />
                  <Label htmlFor="iConfirmAccredited" className="cursor-pointer font-normal">
                    I confirm that I am an accredited investor as defined under Rule 501 of Regulation D
                    of the Securities Act of 1933. I understand that I must meet the income requirements
                    and that providing false information may result in legal consequences.
                  </Label>
                </div>
                {errors.iConfirmAccredited && (
                  <p className="text-sm text-red-500 pl-7">{errors.iConfirmAccredited.message}</p>
                )}

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="understandRisks"
                    checked={understandRisks}
                    onCheckedChange={(checked) => setValue('understandRisks', checked as boolean)}
                  />
                  <Label htmlFor="understandRisks" className="cursor-pointer font-normal">
                    I understand that private investments involve substantial risk, including the risk of
                    total loss of capital. I have sufficient knowledge and experience in financial matters
                    to evaluate the risks and merits of private investments.
                  </Label>
                </div>
                {errors.understandRisks && (
                  <p className="text-sm text-red-500 pl-7">{errors.understandRisks.message}</p>
                )}
              </div>

              {/* Signature */}
              <div className="space-y-2">
                <Label htmlFor="signature">
                  Electronic Signature <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="signature"
                  type="text"
                  placeholder="Type your full legal name"
                  {...register('signature')}
                />
                {errors.signature && (
                  <p className="text-sm text-red-500">{errors.signature.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  By typing your name, you agree that this constitutes a legal electronic signature.
                  Date: {new Date().toLocaleDateString()}
                </p>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Your application will be reviewed by our compliance team within 2-3 business days.
                  You will receive email notifications about the status of your application.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-6">
          <div>
            {currentStep > 1 && (
              <Button type="button" variant="outline" onClick={handlePrevious}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            )}
          </div>

          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSubmitting}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>

            {currentStep < STEPS.length ? (
              <Button type="button" onClick={handleNext}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting || !meetsIncomeRequirement}>
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
