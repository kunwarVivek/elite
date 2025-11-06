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
import {
  ArrowLeft,
  ArrowRight,
  Save,
  CheckCircle,
  Info,
  AlertCircle,
  User,
  MapPin,
  FileText,
  Briefcase,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * KYC Submission Form
 * Multi-step Know Your Customer verification form
 * Required for regulatory compliance (AML/CFT)
 */

// Form validation schema
const kycSubmissionSchema = z.object({
  // Personal Information
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  middleName: z.string().optional(),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  nationality: z.string().min(1, 'Nationality is required'),
  countryOfResidence: z.string().min(1, 'Country of residence is required'),

  // Contact Information
  phoneNumber: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Valid email is required'),

  // Address
  addressLine1: z.string().min(1, 'Address line 1 is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State/Province is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),

  // Identification
  idType: z.enum(['PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID', 'OTHER'], {
    errorMap: () => ({ message: 'Please select ID type' }),
  }),
  idNumber: z.string().min(1, 'ID number is required'),
  idIssuingCountry: z.string().min(1, 'ID issuing country is required'),
  idExpiryDate: z.string().optional(),

  // Employment & Source of Funds
  occupation: z.string().min(1, 'Occupation is required'),
  employer: z.string().optional(),
  industryType: z.string().min(1, 'Industry type is required'),
  sourceOfFunds: z.string().min(1, 'Source of funds is required'),
  sourceOfFundsDetails: z.string().min(10, 'Please provide more details (minimum 10 characters)'),

  // PEP Declaration
  isPEP: z.boolean().default(false),
  pepDetails: z.string().optional(),

  // Terms
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to terms and conditions',
  }),
  agreeToDataProcessing: z.boolean().refine((val) => val === true, {
    message: 'You must agree to data processing',
  }),
  certifyTruthfulness: z.boolean().refine((val) => val === true, {
    message: 'You must certify the information is truthful',
  }),
}).refine(
  (data) => {
    // If PEP, details required
    if (data.isPEP && !data.pepDetails) {
      return false;
    }
    return true;
  },
  {
    message: 'Please provide PEP details',
    path: ['pepDetails'],
  }
).refine(
  (data) => {
    // Date of birth must be at least 18 years ago
    if (data.dateOfBirth) {
      const dob = new Date(data.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      return age >= 18;
    }
    return true;
  },
  {
    message: 'You must be at least 18 years old',
    path: ['dateOfBirth'],
  }
);

type KycSubmissionForm = z.infer<typeof kycSubmissionSchema>;

const STEPS = [
  { id: 1, title: 'Personal Info', description: 'Basic information' },
  { id: 2, title: 'Address', description: 'Residential address' },
  { id: 3, title: 'Identification', description: 'ID documents' },
  { id: 4, title: 'Employment', description: 'Source of funds' },
  { id: 5, title: 'Declaration', description: 'Terms and confirmation' },
];

const ID_TYPES = [
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'DRIVERS_LICENSE', label: "Driver's License" },
  { value: 'NATIONAL_ID', label: 'National ID Card' },
  { value: 'OTHER', label: 'Other Government ID' },
];

const INDUSTRY_TYPES = [
  'Technology',
  'Finance',
  'Healthcare',
  'Real Estate',
  'Retail',
  'Manufacturing',
  'Education',
  'Legal',
  'Consulting',
  'Media & Entertainment',
  'Other',
];

const SOURCE_OF_FUNDS_OPTIONS = [
  'Employment Income',
  'Business Income',
  'Investment Returns',
  'Inheritance',
  'Savings',
  'Real Estate',
  'Other',
];

export function KycSubmissionPage() {
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
  } = useForm<KycSubmissionForm>({
    resolver: zodResolver(kycSubmissionSchema),
    defaultValues: {
      isPEP: false,
      agreeToTerms: false,
      agreeToDataProcessing: false,
      certifyTruthfulness: false,
    },
  });

  const isPEP = watch('isPEP');
  const idType = watch('idType');
  const agreeToTerms = watch('agreeToTerms');
  const agreeToDataProcessing = watch('agreeToDataProcessing');
  const certifyTruthfulness = watch('certifyTruthfulness');

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
    // TODO: Save to localStorage or API
    alert('Draft saved successfully!');
  };

  const onSubmit = async (data: KycSubmissionForm) => {
    // Validate files
    if (files.length === 0) {
      setApiError('Please upload at least one identification document');
      setCurrentStep(3);
      return;
    }

    setIsSubmitting(true);
    setApiError(null);

    try {
      // Step 1: Upload files (TODO: implement actual file upload)
      const uploadedDocuments = files.map((file) => ({
        type: file.type,
        url: `https://example.com/kyc-docs/${file.file.name}`,
      }));

      // Step 2: Submit KYC
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        nationality: data.nationality,
        address: {
          line1: data.addressLine1,
          line2: data.addressLine2,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country,
        },
        identification: {
          type: data.idType,
          number: data.idNumber,
          issuingCountry: data.idIssuingCountry,
          expiryDate: data.idExpiryDate,
          documents: uploadedDocuments,
        },
        phoneNumber: data.phoneNumber,
        occupation: data.occupation,
        sourceOfFunds: `${data.sourceOfFunds}: ${data.sourceOfFundsDetails}`,
      };

      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/compliance/kyc/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit KYC verification');
      }

      // Success!
      alert(`KYC verification submitted successfully! Status: ${result.data.kycStatus}`);
      navigate({ to: '/compliance/kyc-status' });
    } catch (error: any) {
      console.error('Submission error:', error);
      setApiError(error.message || 'An error occurred while submitting KYC verification');
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
          onClick={() => navigate({ to: '/dashboard' })}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold mb-2">KYC Verification</h1>
        <p className="text-muted-foreground">
          Complete your Know Your Customer verification to comply with AML/CFT regulations
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
                  'w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center border-2 text-xs',
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

      {/* Info Alert */}
      <Alert className="mb-6">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Data Privacy:</strong> All information is encrypted and stored securely.
          We comply with GDPR and other data protection regulations.
        </AlertDescription>
      </Alert>

      {/* Error Alert */}
      {apiError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Provide your legal name and date of birth as shown on your government-issued ID
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    {...register('firstName')}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-500">{errors.firstName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    {...register('lastName')}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-500">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="middleName">Middle Name (Optional)</Label>
                <Input
                  id="middleName"
                  placeholder="Michael"
                  {...register('middleName')}
                />
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">
                  Date of Birth <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  {...register('dateOfBirth')}
                />
                {errors.dateOfBirth && (
                  <p className="text-sm text-red-500">{errors.dateOfBirth.message}</p>
                )}
                <p className="text-xs text-muted-foreground">You must be at least 18 years old</p>
              </div>

              {/* Nationality */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nationality">
                    Nationality <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="nationality"
                    placeholder="United States"
                    {...register('nationality')}
                  />
                  {errors.nationality && (
                    <p className="text-sm text-red-500">{errors.nationality.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="countryOfResidence">
                    Country of Residence <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="countryOfResidence"
                    placeholder="United States"
                    {...register('countryOfResidence')}
                  />
                  {errors.countryOfResidence && (
                    <p className="text-sm text-red-500">{errors.countryOfResidence.message}</p>
                  )}
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john.doe@example.com"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    {...register('phoneNumber')}
                  />
                  {errors.phoneNumber && (
                    <p className="text-sm text-red-500">{errors.phoneNumber.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Address */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Residential Address
              </CardTitle>
              <CardDescription>
                Provide your current residential address
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="addressLine1">
                  Address Line 1 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="addressLine1"
                  placeholder="123 Main Street"
                  {...register('addressLine1')}
                />
                {errors.addressLine1 && (
                  <p className="text-sm text-red-500">{errors.addressLine1.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
                <Input
                  id="addressLine2"
                  placeholder="Apt 4B"
                  {...register('addressLine2')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">
                    City <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="city"
                    placeholder="New York"
                    {...register('city')}
                  />
                  {errors.city && (
                    <p className="text-sm text-red-500">{errors.city.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">
                    State/Province <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="state"
                    placeholder="NY"
                    {...register('state')}
                  />
                  {errors.state && (
                    <p className="text-sm text-red-500">{errors.state.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postalCode">
                    Postal Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="postalCode"
                    placeholder="10001"
                    {...register('postalCode')}
                  />
                  {errors.postalCode && (
                    <p className="text-sm text-red-500">{errors.postalCode.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">
                    Country <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="country"
                    placeholder="United States"
                    {...register('country')}
                  />
                  {errors.country && (
                    <p className="text-sm text-red-500">{errors.country.message}</p>
                  )}
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Your address should match the address on your proof of residence document
                  (utility bill, bank statement, etc.)
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Identification */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Identification Documents
              </CardTitle>
              <CardDescription>
                Upload a government-issued photo ID
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="idType">
                  ID Type <span className="text-red-500">*</span>
                </Label>
                <select
                  id="idType"
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  {...register('idType')}
                >
                  <option value="">Select ID type...</option>
                  {ID_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.idType && (
                  <p className="text-sm text-red-500">{errors.idType.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="idNumber">
                    ID Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="idNumber"
                    placeholder="Enter ID number"
                    {...register('idNumber')}
                  />
                  {errors.idNumber && (
                    <p className="text-sm text-red-500">{errors.idNumber.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="idIssuingCountry">
                    Issuing Country <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="idIssuingCountry"
                    placeholder="United States"
                    {...register('idIssuingCountry')}
                  />
                  {errors.idIssuingCountry && (
                    <p className="text-sm text-red-500">{errors.idIssuingCountry.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="idExpiryDate">Expiry Date (if applicable)</Label>
                <Input
                  id="idExpiryDate"
                  type="date"
                  {...register('idExpiryDate')}
                />
              </div>

              <FileUpload
                files={files}
                onFilesChange={setFiles}
                maxFiles={3}
                maxSize={10 * 1024 * 1024}
                label="Upload ID Documents"
                required
                documentTypeOptions={[
                  { value: 'id_front', label: 'ID Front' },
                  { value: 'id_back', label: 'ID Back' },
                  { value: 'proof_of_address', label: 'Proof of Address' },
                  { value: 'selfie', label: 'Selfie with ID' },
                ]}
              />

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Required Documents:</strong>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Clear photo of ID (front and back if applicable)</li>
                    <li>Proof of address (utility bill, bank statement, within 3 months)</li>
                    <li>Selfie holding your ID (optional but recommended)</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Employment & Source of Funds */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Briefcase className="h-5 w-5 mr-2" />
                Employment & Source of Funds
              </CardTitle>
              <CardDescription>
                Required for anti-money laundering (AML) compliance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="occupation">
                  Occupation <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="occupation"
                  placeholder="e.g., Software Engineer"
                  {...register('occupation')}
                />
                {errors.occupation && (
                  <p className="text-sm text-red-500">{errors.occupation.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="employer">Employer Name (Optional)</Label>
                <Input
                  id="employer"
                  placeholder="e.g., ABC Company Inc."
                  {...register('employer')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industryType">
                  Industry Type <span className="text-red-500">*</span>
                </Label>
                <select
                  id="industryType"
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  {...register('industryType')}
                >
                  <option value="">Select industry...</option>
                  {INDUSTRY_TYPES.map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </select>
                {errors.industryType && (
                  <p className="text-sm text-red-500">{errors.industryType.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sourceOfFunds">
                  Primary Source of Funds <span className="text-red-500">*</span>
                </Label>
                <select
                  id="sourceOfFunds"
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  {...register('sourceOfFunds')}
                >
                  <option value="">Select source...</option>
                  {SOURCE_OF_FUNDS_OPTIONS.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
                {errors.sourceOfFunds && (
                  <p className="text-sm text-red-500">{errors.sourceOfFunds.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sourceOfFundsDetails">
                  Source of Funds Details <span className="text-red-500">*</span>
                </Label>
                <textarea
                  id="sourceOfFundsDetails"
                  placeholder="Please provide details about your source of funds for investments..."
                  className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  {...register('sourceOfFundsDetails')}
                />
                {errors.sourceOfFundsDetails && (
                  <p className="text-sm text-red-500">{errors.sourceOfFundsDetails.message}</p>
                )}
              </div>

              {/* PEP Declaration */}
              <div className="border-t pt-6 space-y-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="isPEP"
                    checked={isPEP}
                    onCheckedChange={(checked) => setValue('isPEP', checked as boolean)}
                  />
                  <Label htmlFor="isPEP" className="cursor-pointer font-normal">
                    I am a Politically Exposed Person (PEP) or a family member/close associate of a PEP
                  </Label>
                </div>

                {isPEP && (
                  <div className="space-y-2 pl-7">
                    <Label htmlFor="pepDetails">
                      PEP Details <span className="text-red-500">*</span>
                    </Label>
                    <textarea
                      id="pepDetails"
                      placeholder="Please provide details about your PEP status..."
                      className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      {...register('pepDetails')}
                    />
                    {errors.pepDetails && (
                      <p className="text-sm text-red-500">{errors.pepDetails.message}</p>
                    )}
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <strong>What is a PEP?</strong> A Politically Exposed Person is someone who holds
                        or has held a prominent public position, such as a government official, military leader,
                        or senior executive of a state-owned enterprise.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Declaration */}
        {currentStep === 5 && (
          <Card>
            <CardHeader>
              <CardTitle>Declaration and Consent</CardTitle>
              <CardDescription>
                Please review and confirm your information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h4 className="font-semibold">Application Summary</h4>
                <div className="text-sm space-y-1">
                  <p>
                    <strong>Name:</strong> {watch('firstName')} {watch('lastName')}
                  </p>
                  <p>
                    <strong>Date of Birth:</strong> {watch('dateOfBirth')}
                  </p>
                  <p>
                    <strong>Nationality:</strong> {watch('nationality')}
                  </p>
                  <p>
                    <strong>ID Type:</strong> {watch('idType')}
                  </p>
                  <p>
                    <strong>Occupation:</strong> {watch('occupation')}
                  </p>
                  <p>
                    <strong>Documents:</strong> {files.length} file{files.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Declarations */}
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="agreeToTerms"
                    checked={agreeToTerms}
                    onCheckedChange={(checked) => setValue('agreeToTerms', checked as boolean)}
                  />
                  <Label htmlFor="agreeToTerms" className="cursor-pointer font-normal">
                    I agree to the Terms and Conditions and Privacy Policy
                  </Label>
                </div>
                {errors.agreeToTerms && (
                  <p className="text-sm text-red-500 pl-7">{errors.agreeToTerms.message}</p>
                )}

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="agreeToDataProcessing"
                    checked={agreeToDataProcessing}
                    onCheckedChange={(checked) => setValue('agreeToDataProcessing', checked as boolean)}
                  />
                  <Label htmlFor="agreeToDataProcessing" className="cursor-pointer font-normal">
                    I consent to the processing of my personal data for KYC/AML verification purposes
                    in accordance with applicable data protection laws
                  </Label>
                </div>
                {errors.agreeToDataProcessing && (
                  <p className="text-sm text-red-500 pl-7">{errors.agreeToDataProcessing.message}</p>
                )}

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="certifyTruthfulness"
                    checked={certifyTruthfulness}
                    onCheckedChange={(checked) => setValue('certifyTruthfulness', checked as boolean)}
                  />
                  <Label htmlFor="certifyTruthfulness" className="cursor-pointer font-normal">
                    I certify that all information provided is true, complete, and accurate to the best of
                    my knowledge. I understand that providing false information may result in legal consequences.
                  </Label>
                </div>
                {errors.certifyTruthfulness && (
                  <p className="text-sm text-red-500 pl-7">{errors.certifyTruthfulness.message}</p>
                )}
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Your KYC verification will be reviewed by our compliance team within 24-48 hours.
                  You will receive email notifications about the status of your verification.
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit KYC Verification'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
