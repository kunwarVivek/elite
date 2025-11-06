import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useForm, useFieldArray } from 'react-hook-form';
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
import {
  ArrowLeft,
  ArrowRight,
  Save,
  CheckCircle,
  Info,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  PieChart
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';

/**
 * Net Worth-Based Accreditation Verification Page
 * Multi-step wizard for net worth-based investor accreditation
 * Requirement: $1M+ net worth excluding primary residence
 */

// Asset and Liability types
const ASSET_TYPES = [
  { value: 'cash', label: 'Cash & Cash Equivalents' },
  { value: 'securities', label: 'Stocks, Bonds & Securities' },
  { value: 'retirement', label: 'Retirement Accounts (401k, IRA)' },
  { value: 'real_estate', label: 'Real Estate (excluding primary residence)' },
  { value: 'business', label: 'Business Ownership' },
  { value: 'other', label: 'Other Assets' },
];

const LIABILITY_TYPES = [
  { value: 'mortgage', label: 'Mortgage (excluding primary residence)' },
  { value: 'personal_loan', label: 'Personal Loans' },
  { value: 'credit_card', label: 'Credit Card Debt' },
  { value: 'student_loan', label: 'Student Loans' },
  { value: 'business_loan', label: 'Business Loans' },
  { value: 'other', label: 'Other Liabilities' },
];

// Form validation schema
const assetSchema = z.object({
  type: z.string().min(1, 'Asset type is required'),
  description: z.string().min(1, 'Description is required'),
  value: z.number().positive('Value must be positive'),
});

const liabilitySchema = z.object({
  type: z.string().min(1, 'Liability type is required'),
  description: z.string().min(1, 'Description is required'),
  value: z.number().positive('Value must be positive'),
});

const netWorthVerificationSchema = z.object({
  assets: z.array(assetSchema).min(1, 'At least one asset is required'),
  liabilities: z.array(liabilitySchema).default([]),
  excludePrimaryResidence: z.boolean().default(true),
  signature: z.string().min(1, 'Signature is required'),
  iConfirmAccredited: z.boolean().refine((val) => val === true, {
    message: 'You must confirm your accredited investor status',
  }),
  understandRisks: z.boolean().refine((val) => val === true, {
    message: 'You must acknowledge understanding of investment risks',
  }),
}).refine(
  (data) => {
    // Calculate net worth
    const totalAssets = data.assets.reduce((sum, asset) => sum + asset.value, 0);
    const totalLiabilities = data.liabilities.reduce((sum, liability) => sum + liability.value, 0);
    const netWorth = totalAssets - totalLiabilities;
    return netWorth >= 1000000;
  },
  {
    message: 'Net worth must be at least $1,000,000 (excluding primary residence)',
    path: ['assets'],
  }
);

type NetWorthVerificationForm = z.infer<typeof netWorthVerificationSchema>;

const STEPS = [
  { id: 1, title: 'Assets', description: 'List your assets' },
  { id: 2, title: 'Liabilities', description: 'List your liabilities' },
  { id: 3, title: 'Upload Documents', description: 'Provide supporting documentation' },
  { id: 4, title: 'Declaration', description: 'Confirm and sign declaration' },
];

export function NetWorthVerificationPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<NetWorthVerificationForm>({
    resolver: zodResolver(netWorthVerificationSchema),
    defaultValues: {
      assets: [{ type: '', description: '', value: 0 }],
      liabilities: [],
      excludePrimaryResidence: true,
      iConfirmAccredited: false,
      understandRisks: false,
    },
  });

  const { fields: assetFields, append: appendAsset, remove: removeAsset } = useFieldArray({
    control,
    name: 'assets',
  });

  const { fields: liabilityFields, append: appendLiability, remove: removeLiability } = useFieldArray({
    control,
    name: 'liabilities',
  });

  const assets = watch('assets');
  const liabilities = watch('liabilities');
  const iConfirmAccredited = watch('iConfirmAccredited');
  const understandRisks = watch('understandRisks');

  // Calculate totals
  const totalAssets = assets.reduce((sum, asset) => sum + (asset.value || 0), 0);
  const totalLiabilities = liabilities.reduce((sum, liability) => sum + (liability.value || 0), 0);
  const netWorth = totalAssets - totalLiabilities;
  const meetsNetWorthRequirement = netWorth >= 1000000;

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
    // TODO: Save draft to localStorage or API
    alert('Draft saved successfully! You can continue this application later.');
  };

  const onSubmit = async (data: NetWorthVerificationForm) => {
    // Validate files on final submission
    if (files.length === 0) {
      setApiError('Please upload at least one supporting document');
      setCurrentStep(3);
      return;
    }

    setIsSubmitting(true);
    setApiError(null);

    try {
      // Step 1: Upload files and get URLs
      const uploadedDocuments = await Promise.all(
        files.map(async (uploadedFile) => {
          // TODO: Replace with actual file upload to backend/S3
          return {
            type: uploadedFile.type,
            url: `https://example.com/documents/${uploadedFile.file.name}`,
            description: uploadedFile.description || uploadedFile.file.name,
          };
        })
      );

      // Step 2: Submit accreditation application
      const payload = {
        method: 'NET_WORTH',
        netWorth,
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
    <div className="container max-w-5xl mx-auto py-8 px-4">
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
        <h1 className="text-3xl font-bold mb-2">Net Worth-Based Verification</h1>
        <p className="text-muted-foreground">
          Verify your accredited investor status through net worth ($1M+ excluding primary residence)
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

      {/* Net Worth Summary Card (Always visible) */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <PieChart className="h-5 w-5 mr-2" />
            Net Worth Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <TrendingUp className="h-6 w-6 mx-auto text-green-600 mb-2" />
              <p className="text-sm text-muted-foreground">Total Assets</p>
              <p className="text-2xl font-bold text-green-700">${formatNumber(totalAssets)}</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <TrendingDown className="h-6 w-6 mx-auto text-red-600 mb-2" />
              <p className="text-sm text-muted-foreground">Total Liabilities</p>
              <p className="text-2xl font-bold text-red-700">${formatNumber(totalLiabilities)}</p>
            </div>
            <div className={cn(
              "text-center p-4 rounded-lg border-2",
              meetsNetWorthRequirement
                ? "bg-blue-50 border-blue-600"
                : "bg-orange-50 border-orange-600"
            )}>
              <PieChart className={cn(
                "h-6 w-6 mx-auto mb-2",
                meetsNetWorthRequirement ? "text-blue-600" : "text-orange-600"
              )} />
              <p className="text-sm text-muted-foreground">Net Worth</p>
              <p className={cn(
                "text-2xl font-bold",
                meetsNetWorthRequirement ? "text-blue-700" : "text-orange-700"
              )}>${formatNumber(netWorth)}</p>
              <p className="text-xs mt-1">
                {meetsNetWorthRequirement ? (
                  <span className="text-green-600">✓ Meets requirement</span>
                ) : (
                  <span className="text-orange-600">✗ Below $1M minimum</span>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {apiError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Assets */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>List Your Assets</CardTitle>
              <CardDescription>
                Include all assets EXCEPT your primary residence. Examples: investment accounts, rental properties,
                business ownership, cash, retirement accounts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> Per SEC regulations, your primary residence value should NOT be included
                  in net worth calculations for accreditation purposes.
                </AlertDescription>
              </Alert>

              {/* Asset List */}
              <div className="space-y-4">
                {assetFields.map((field, index) => (
                  <div key={field.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Asset #{index + 1}</h4>
                      {assetFields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAsset(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor={`assets.${index}.type`}>Asset Type *</Label>
                        <select
                          id={`assets.${index}.type`}
                          className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          {...register(`assets.${index}.type`)}
                        >
                          <option value="">Select type...</option>
                          {ASSET_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        {errors.assets?.[index]?.type && (
                          <p className="text-sm text-red-500 mt-1">
                            {errors.assets[index]?.type?.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor={`assets.${index}.description`}>Description *</Label>
                        <Input
                          id={`assets.${index}.description`}
                          placeholder="e.g., Fidelity Investment Account"
                          {...register(`assets.${index}.description`)}
                        />
                        {errors.assets?.[index]?.description && (
                          <p className="text-sm text-red-500 mt-1">
                            {errors.assets[index]?.description?.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor={`assets.${index}.value`}>Value ($) *</Label>
                        <Input
                          id={`assets.${index}.value`}
                          type="number"
                          placeholder="0"
                          {...register(`assets.${index}.value`, { valueAsNumber: true })}
                        />
                        {errors.assets?.[index]?.value && (
                          <p className="text-sm text-red-500 mt-1">
                            {errors.assets[index]?.value?.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => appendAsset({ type: '', description: '', value: 0 })}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Asset
                </Button>
              </div>

              {errors.assets?.root && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.assets.root.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Liabilities */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>List Your Liabilities</CardTitle>
              <CardDescription>
                Include all debts and liabilities EXCEPT primary residence mortgage.
                Examples: rental property mortgages, loans, credit card debt.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Liability List */}
              {liabilityFields.length === 0 ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    No liabilities added yet. If you have any debts or liabilities (excluding primary residence mortgage),
                    please add them below. Otherwise, you can proceed to the next step.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {liabilityFields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-4 space-y-3 bg-red-50/30">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">Liability #{index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLiability(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor={`liabilities.${index}.type`}>Liability Type *</Label>
                          <select
                            id={`liabilities.${index}.type`}
                            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            {...register(`liabilities.${index}.type`)}
                          >
                            <option value="">Select type...</option>
                            {LIABILITY_TYPES.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <Label htmlFor={`liabilities.${index}.description`}>Description *</Label>
                          <Input
                            id={`liabilities.${index}.description`}
                            placeholder="e.g., Business Line of Credit"
                            {...register(`liabilities.${index}.description`)}
                          />
                        </div>

                        <div>
                          <Label htmlFor={`liabilities.${index}.value`}>Amount ($) *</Label>
                          <Input
                            id={`liabilities.${index}.value`}
                            type="number"
                            placeholder="0"
                            {...register(`liabilities.${index}.value`, { valueAsNumber: true })}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={() => appendLiability({ type: '', description: '', value: 0 })}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Liability
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Upload Documents */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Supporting Documents</CardTitle>
              <CardDescription>
                Upload bank statements, investment account statements, property appraisals, or other documentation
                supporting your net worth calculation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FileUpload
                files={files}
                onFilesChange={setFiles}
                maxFiles={10}
                maxSize={10 * 1024 * 1024}
                label="Net Worth Documentation"
                required
                documentTypeOptions={[
                  { value: 'bank_statement', label: 'Bank Statement' },
                  { value: 'investment_statement', label: 'Investment Account Statement' },
                  { value: 'property_appraisal', label: 'Property Appraisal' },
                  { value: 'business_valuation', label: 'Business Valuation' },
                  { value: 'loan_statement', label: 'Loan Statement' },
                  { value: 'other', label: 'Other' },
                ]}
              />

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Accepted Documents:</strong>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Recent bank and investment account statements (within 90 days)</li>
                    <li>Property appraisals or tax assessments</li>
                    <li>Business ownership documentation and valuations</li>
                    <li>Loan statements for liabilities</li>
                  </ul>
                  All documents must clearly show account holder name, institution, and values.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Declaration */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Declaration and Signature</CardTitle>
              <CardDescription>
                Please review and confirm your net worth declaration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h4 className="font-semibold">Application Summary</h4>
                <div className="text-sm space-y-1">
                  <p>
                    <strong>Verification Method:</strong> Net Worth-Based
                  </p>
                  <p>
                    <strong>Total Assets:</strong> ${formatNumber(totalAssets)}
                  </p>
                  <p>
                    <strong>Total Liabilities:</strong> ${formatNumber(totalLiabilities)}
                  </p>
                  <p className="text-lg font-bold pt-2">
                    <strong>Net Worth:</strong> ${formatNumber(netWorth)}
                  </p>
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
                    of the Securities Act of 1933. I certify that the net worth information provided is accurate
                    and that my primary residence has been excluded from this calculation. I understand that
                    providing false information may result in legal consequences.
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
              <Button type="submit" disabled={isSubmitting || !meetsNetWorthRequirement}>
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
