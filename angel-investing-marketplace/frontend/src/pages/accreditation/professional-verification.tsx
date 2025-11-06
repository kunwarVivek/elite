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
import { ArrowLeft, ArrowRight, Save, CheckCircle, Info, AlertCircle, Award, Shield, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Professional Certification-Based Accreditation Verification Page
 * For holders of Series 7, 65, or 82 licenses
 */

const LICENSE_TYPES = [
  {
    value: 'SERIES_7',
    label: 'Series 7 - General Securities Representative',
    description: 'FINRA license for buying and selling securities',
    organization: 'FINRA',
  },
  {
    value: 'SERIES_65',
    label: 'Series 65 - Investment Adviser Representative',
    description: 'State license for providing investment advice',
    organization: 'NASAA',
  },
  {
    value: 'SERIES_82',
    label: 'Series 82 - Private Securities Offerings Representative',
    description: 'FINRA license for private placements',
    organization: 'FINRA',
  },
];

// Form validation schema
const professionalVerificationSchema = z.object({
  licenseType: z.enum(['SERIES_7', 'SERIES_65', 'SERIES_82'], {
    errorMap: () => ({ message: 'Please select a valid license type' }),
  }),
  licenseNumber: z
    .string()
    .min(1, 'License number is required')
    .max(50, 'License number is too long'),
  issuingOrganization: z.string().min(1, 'Issuing organization is required'),
  issueDate: z.string().min(1, 'Issue date is required'),
  expiryDate: z.string().optional(),
  currentEmployer: z.string().min(1, 'Current employer is required'),
  crdNumber: z.string().optional(),
  signature: z.string().min(1, 'Signature is required'),
  iConfirmAccredited: z.boolean().refine((val) => val === true, {
    message: 'You must confirm your accredited investor status',
  }),
  understandRisks: z.boolean().refine((val) => val === true, {
    message: 'You must acknowledge understanding of investment risks',
  }),
  confirmLicenseActive: z.boolean().refine((val) => val === true, {
    message: 'You must confirm your license is active and in good standing',
  }),
}).refine(
  (data) => {
    // If expiry date is provided, make sure it's in the future
    if (data.expiryDate) {
      const expiry = new Date(data.expiryDate);
      return expiry > new Date();
    }
    return true;
  },
  {
    message: 'License must not be expired',
    path: ['expiryDate'],
  }
);

type ProfessionalVerificationForm = z.infer<typeof professionalVerificationSchema>;

const STEPS = [
  { id: 1, title: 'License Details', description: 'Enter your professional certification information' },
  { id: 2, title: 'Upload Documents', description: 'Provide license documentation' },
  { id: 3, title: 'Declaration', description: 'Confirm and sign declaration' },
];

export function ProfessionalVerificationPage() {
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
    formState: { errors },
  } = useForm<ProfessionalVerificationForm>({
    resolver: zodResolver(professionalVerificationSchema),
    defaultValues: {
      iConfirmAccredited: false,
      understandRisks: false,
      confirmLicenseActive: false,
    },
  });

  const licenseType = watch('licenseType');
  const iConfirmAccredited = watch('iConfirmAccredited');
  const understandRisks = watch('understandRisks');
  const confirmLicenseActive = watch('confirmLicenseActive');
  const expiryDate = watch('expiryDate');

  const selectedLicense = LICENSE_TYPES.find((l) => l.value === licenseType);
  const isLicenseExpired = expiryDate ? new Date(expiryDate) < new Date() : false;

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

  const onSubmit = async (data: ProfessionalVerificationForm) => {
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
          return {
            type: uploadedFile.type,
            url: `https://example.com/documents/${uploadedFile.file.name}`,
            description: uploadedFile.description || uploadedFile.file.name,
          };
        })
      );

      // Step 2: Submit accreditation application
      const payload = {
        method: 'PROFESSIONAL',
        professionalCertification: `${data.licenseType}: ${data.licenseNumber}`,
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
        <h1 className="text-3xl font-bold mb-2">Professional Certification Verification</h1>
        <p className="text-muted-foreground">
          Verify your accredited investor status through professional securities license
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
        {/* Step 1: License Details */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2" />
                Professional License Information
              </CardTitle>
              <CardDescription>
                Holders of Series 7, 65, or 82 licenses are automatically qualified as accredited investors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Info Alert */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Qualifying Licenses:</strong> Only Series 7, Series 65, and Series 82 licenses
                  qualify for automatic accreditation under SEC regulations.
                </AlertDescription>
              </Alert>

              {/* License Type Selection */}
              <div className="space-y-3">
                <Label>License Type *</Label>
                {LICENSE_TYPES.map((license) => (
                  <Card
                    key={license.value}
                    className={cn(
                      'cursor-pointer transition-all',
                      licenseType === license.value
                        ? 'border-primary ring-2 ring-primary'
                        : 'hover:border-primary/50'
                    )}
                    onClick={() => setValue('licenseType', license.value as any)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base flex items-center">
                            <Shield className="h-4 w-4 mr-2" />
                            {license.label}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {license.description}
                            <br />
                            <span className="text-xs">Issued by: {license.organization}</span>
                          </CardDescription>
                        </div>
                        {licenseType === license.value && (
                          <CheckCircle className="h-6 w-6 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </CardHeader>
                  </Card>
                ))}
                {errors.licenseType && (
                  <p className="text-sm text-red-500">{errors.licenseType.message}</p>
                )}
              </div>

              {/* License Details (conditional) */}
              {licenseType && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* License Number */}
                    <div className="space-y-2">
                      <Label htmlFor="licenseNumber">
                        License Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="licenseNumber"
                        placeholder="e.g., 1234567"
                        {...register('licenseNumber')}
                      />
                      {errors.licenseNumber && (
                        <p className="text-sm text-red-500">{errors.licenseNumber.message}</p>
                      )}
                    </div>

                    {/* CRD Number (optional) */}
                    <div className="space-y-2">
                      <Label htmlFor="crdNumber">
                        CRD Number (Optional)
                      </Label>
                      <Input
                        id="crdNumber"
                        placeholder="e.g., 1234567"
                        {...register('crdNumber')}
                      />
                      <p className="text-xs text-muted-foreground">
                        Central Registration Depository number
                      </p>
                    </div>
                  </div>

                  {/* Issuing Organization */}
                  <div className="space-y-2">
                    <Label htmlFor="issuingOrganization">
                      Issuing Organization <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="issuingOrganization"
                      placeholder={selectedLicense?.organization || 'FINRA/NASAA'}
                      defaultValue={selectedLicense?.organization}
                      {...register('issuingOrganization')}
                    />
                    {errors.issuingOrganization && (
                      <p className="text-sm text-red-500">{errors.issuingOrganization.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Issue Date */}
                    <div className="space-y-2">
                      <Label htmlFor="issueDate">
                        Issue Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="issueDate"
                        type="date"
                        {...register('issueDate')}
                      />
                      {errors.issueDate && (
                        <p className="text-sm text-red-500">{errors.issueDate.message}</p>
                      )}
                    </div>

                    {/* Expiry Date */}
                    <div className="space-y-2">
                      <Label htmlFor="expiryDate">
                        Expiry Date (if applicable)
                      </Label>
                      <Input
                        id="expiryDate"
                        type="date"
                        {...register('expiryDate')}
                      />
                      {isLicenseExpired && (
                        <p className="text-sm text-red-500">License appears to be expired</p>
                      )}
                      {errors.expiryDate && (
                        <p className="text-sm text-red-500">{errors.expiryDate.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Current Employer */}
                  <div className="space-y-2">
                    <Label htmlFor="currentEmployer">
                      Current Employer/Firm <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="currentEmployer"
                      placeholder="e.g., ABC Financial Services"
                      {...register('currentEmployer')}
                    />
                    {errors.currentEmployer && (
                      <p className="text-sm text-red-500">{errors.currentEmployer.message}</p>
                    )}
                  </div>
                </div>
              )}

              {/* FINRA BrokerCheck Link */}
              {licenseType && (licenseType === 'SERIES_7' || licenseType === 'SERIES_82') && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Verify Your License:</strong> You can verify FINRA licenses at{' '}
                    <a
                      href="https://brokercheck.finra.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center"
                    >
                      FINRA BrokerCheck
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Upload Documents */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Upload License Documentation</CardTitle>
              <CardDescription>
                Upload your license certificate, verification letter, or FINRA BrokerCheck report
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FileUpload
                files={files}
                onFilesChange={setFiles}
                maxFiles={5}
                maxSize={10 * 1024 * 1024}
                label="Professional License Documents"
                required
                documentTypeOptions={[
                  { value: 'license_certificate', label: 'License Certificate' },
                  { value: 'brokercheck_report', label: 'FINRA BrokerCheck Report' },
                  { value: 'verification_letter', label: 'Verification Letter' },
                  { value: 'employment_letter', label: 'Employment Verification' },
                  { value: 'other', label: 'Other' },
                ]}
              />

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Accepted Documents:</strong>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Original license certificate or copy</li>
                    <li>FINRA BrokerCheck report showing active license</li>
                    <li>Letter from employer confirming license status</li>
                    <li>State registration documents (for Series 65)</li>
                  </ul>
                  Documents must clearly show your name, license number, and active status.
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
                Please review and confirm your professional certification declaration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h4 className="font-semibold">Application Summary</h4>
                <div className="text-sm space-y-1">
                  <p>
                    <strong>Verification Method:</strong> Professional Certification
                  </p>
                  <p>
                    <strong>License Type:</strong> {selectedLicense?.label}
                  </p>
                  <p>
                    <strong>License Number:</strong> {watch('licenseNumber') || 'Not provided'}
                  </p>
                  <p>
                    <strong>Issuing Organization:</strong> {watch('issuingOrganization') || 'Not provided'}
                  </p>
                  <p>
                    <strong>Current Employer:</strong> {watch('currentEmployer') || 'Not provided'}
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
                    id="confirmLicenseActive"
                    checked={confirmLicenseActive}
                    onCheckedChange={(checked) => setValue('confirmLicenseActive', checked as boolean)}
                  />
                  <Label htmlFor="confirmLicenseActive" className="cursor-pointer font-normal">
                    I confirm that my professional license is currently active and in good standing. I understand
                    that my license status may be verified with the issuing organization (FINRA, NASAA, or state
                    regulatory authority).
                  </Label>
                </div>
                {errors.confirmLicenseActive && (
                  <p className="text-sm text-red-500 pl-7">{errors.confirmLicenseActive.message}</p>
                )}

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="iConfirmAccredited"
                    checked={iConfirmAccredited}
                    onCheckedChange={(checked) => setValue('iConfirmAccredited', checked as boolean)}
                  />
                  <Label htmlFor="iConfirmAccredited" className="cursor-pointer font-normal">
                    I confirm that I am an accredited investor as defined under Rule 501 of Regulation D
                    of the Securities Act of 1933. I understand that I qualify through my professional
                    certification and that providing false information may result in legal consequences.
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
                  We may verify your license status with FINRA or the issuing organization.
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
              <Button type="button" onClick={handleNext} disabled={!licenseType}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting || isLicenseExpired}>
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
