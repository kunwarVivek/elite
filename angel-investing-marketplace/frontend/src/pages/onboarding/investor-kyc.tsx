import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Shield, FileText, Camera, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProgressTracker } from '@/components/onboarding/progress-tracker';
import { DocumentUploader } from '@/components/onboarding/document-uploader';

import { useOnboarding } from '@/hooks/use-onboarding';
import { DocumentUpload } from '@/types/onboarding';

export const InvestorKycPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateUserData, goToNextStep, goToPreviousStep } = useOnboarding();
  const [uploadedFiles, setUploadedFiles] = useState<DocumentUpload[]>([]);

  const handleFileSelect = (file: File) => {
    const newFile: DocumentUpload = {
      id: Math.random().toString(36).substr(2, 9),
      type: file.type.startsWith('image/') ? 'identity' : 'other',
      file,
      status: 'uploading',
      uploadProgress: 0,
    };

    setUploadedFiles(prev => [...prev, newFile]);

    // Simulate upload completion
    setTimeout(() => {
      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === newFile.id
            ? { ...f, status: 'uploaded', uploadProgress: 100 }
            : f
        )
      );
    }, 2000);
  };

  const handleFileRemove = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleContinue = () => {
    // Update user data with uploaded files
    const identityDocument = uploadedFiles.find(f => f.type === 'identity')?.file;
    const proofOfAddress = uploadedFiles.find(f => f.type === 'address')?.file;

    if (identityDocument && proofOfAddress) {
      updateUserData({
        identityDocument,
        proofOfAddress,
        additionalDocuments: uploadedFiles.filter(f => f.type !== 'identity' && f.type !== 'address').map(f => f.file),
      });

      goToNextStep();
      navigate({ to: '/onboarding/investor-preferences' });
    }
  };

  const hasRequiredDocuments = uploadedFiles.filter(f =>
    f.type === 'identity' || f.type === 'address'
  ).length >= 2;

  if (state.userRole !== 'investor') {
    navigate({ to: '/onboarding/role-selection' });
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Progress */}
      <div className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AI</span>
              </div>
              <span className="font-semibold text-lg">AngelInvest</span>
            </div>

            <div className="hidden md:block">
              <ProgressTracker
                currentStep={state.currentStep}
                completedSteps={state.completedSteps}
                userRole={state.userRole}
                showStepLabels={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Progress Sidebar */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="sticky top-24">
              <div className="md:hidden mb-6">
                <ProgressTracker
                  currentStep={state.currentStep}
                  completedSteps={state.completedSteps}
                  userRole={state.userRole}
                />
              </div>

              {/* Help Section */}
              <div className="bg-muted/30 rounded-lg p-6">
                <h3 className="font-medium mb-3">KYC Verification</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    KYC (Know Your Customer) verification is required by law for all investors.
                    We need to verify your identity and address to comply with regulations.
                  </p>
                  <div className="space-y-2">
                    <p className="font-medium">Required Documents:</p>
                    <ul className="text-xs space-y-1 ml-4">
                      <li>• Government-issued photo ID</li>
                      <li>• Proof of address (utility bill, bank statement)</li>
                      <li>• Documents must be clear and current</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* KYC Form */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <Card className="max-w-4xl mx-auto">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Identity Verification</CardTitle>
                    <CardDescription>
                      Upload documents to verify your identity and complete KYC requirements
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Document Types */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Government ID */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Camera className="w-4 h-4 text-muted-foreground" />
                      <h3 className="font-medium">Government-Issued ID</h3>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>Upload a clear photo of your:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Driver's license</li>
                        <li>Passport</li>
                        <li>State ID card</li>
                      </ul>
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded">
                      <p><strong>Requirements:</strong></p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Photo must be clear and readable</li>
                        <li>Include all corners of the document</li>
                        <li>Document must not be expired</li>
                        <li>File size under 10MB</li>
                      </ul>
                    </div>
                  </div>

                  {/* Proof of Address */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <h3 className="font-medium">Proof of Address</h3>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>Upload a recent document showing your address:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Utility bill (electric, gas, water)</li>
                        <li>Bank statement</li>
                        <li>Lease agreement</li>
                        <li>Government correspondence</li>
                      </ul>
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded">
                      <p><strong>Requirements:</strong></p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Document must be less than 3 months old</li>
                        <li>Must show your full name and address</li>
                        <li>Utility bills must show current address</li>
                        <li>File size under 10MB</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Document Uploader */}
                <DocumentUploader
                  onFileSelect={handleFileSelect}
                  onFileRemove={handleFileRemove}
                  uploadedFiles={uploadedFiles}
                  maxFiles={5}
                  acceptedTypes={['image/jpeg', 'image/png', 'application/pdf']}
                  maxSize={10}
                  title="Upload Your Documents"
                  description="Upload clear photos or scans of your identity and address documents"
                  required
                />

                {/* Important Notice */}
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> All documents are encrypted and stored securely.
                    We use bank-level security to protect your personal information.
                    Your documents will only be used for identity verification purposes.
                  </AlertDescription>
                </Alert>

                {/* Processing Time */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Verification Timeline</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>• Document verification typically takes 2-5 minutes</p>
                    <p>• You'll receive an email confirmation once verified</p>
                    <p>• In rare cases, manual review may take up to 24 hours</p>
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goToPreviousStep}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleContinue}
                    disabled={!hasRequiredDocuments}
                  >
                    Continue to Investment Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};