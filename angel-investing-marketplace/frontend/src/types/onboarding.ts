export type UserRole = 'investor' | 'founder';

export type OnboardingStep =
  | 'role-selection'
  | 'registration'
  | 'email-verification'
  | 'investor-personal-info'
  | 'investor-financial-info'
  | 'investor-accreditation'
  | 'investor-kyc'
  | 'investor-preferences'
  | 'investor-agreements'
  | 'founder-company-info'
  | 'founder-info'
  | 'founder-company-verification'
  | 'founder-team-info'
  | 'founder-kyc'
  | 'founder-agreements'
  | 'complete';

export interface OnboardingState {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  userRole?: UserRole;
  userData: Partial<UserRegistrationData & InvestorData & FounderData>;
  verificationStatus: {
    emailVerified: boolean;
    kycVerified: boolean;
    accreditationVerified?: boolean;
    companyVerified?: boolean;
  };
}

export interface UserRegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  agreedToTerms: boolean;
  agreedToPrivacy: boolean;
}

export interface InvestorData {
  // Personal Information
  dateOfBirth: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  citizenship: string;

  // Financial Information
  annualIncome: number;
  netWorth: number;
  liquidNetWorth: number;
  investmentExperience: 'none' | 'limited' | 'moderate' | 'extensive';
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';

  // Accreditation
  accreditationMethod: 'income' | 'net-worth' | 'license' | 'entity';
  accreditationDocuments: File[];

  // Investment Preferences
  preferredInvestmentRange: {
    min: number;
    max: number;
  };
  preferredSectors: string[];
  preferredStages: string[];
  geographicPreferences: string[];

  // KYC Documents
  identityDocument: File;
  proofOfAddress: File;
  additionalDocuments?: File[];
}

export interface FounderData {
  // Company Information
  companyName: string;
  companyWebsite?: string;
  foundingDate: string;
  businessStage: 'idea' | 'mvp' | 'early-traction' | 'scaling' | 'mature';
  industry: string;
  description: string;

  // Founder Information
  title: string;
  linkedIn?: string;
  yearsOfExperience: number;
  previousCompanies?: string[];
  education?: string;

  // Company Verification
  businessRegistrationNumber: string;
  taxId: string;
  legalStructure: 'llc' | 'corporation' | 'partnership' | 'sole-proprietorship';
  incorporationState: string;
  companyDocuments: File[];

  // Team Information
  teamMembers: Array<{
    name: string;
    title: string;
    email: string;
    linkedIn?: string;
  }>;

  // KYC Documents
  identityDocument: File;
  proofOfAddress: File;
  additionalDocuments?: File[];
}

export interface DocumentUpload {
  id: string;
  type: 'identity' | 'address' | 'financial' | 'accreditation' | 'company' | 'other';
  file: File;
  status: 'uploading' | 'uploaded' | 'verifying' | 'verified' | 'rejected';
  uploadProgress?: number;
  verificationNotes?: string;
}

export interface VerificationStatus {
  id: string;
  type: 'email' | 'kyc' | 'accreditation' | 'company';
  status: 'pending' | 'in-review' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  notes?: string;
  documents?: string[];
}

export interface OnboardingProgress {
  totalSteps: number;
  completedSteps: number;
  currentStepIndex: number;
  estimatedTimeRemaining?: number;
}