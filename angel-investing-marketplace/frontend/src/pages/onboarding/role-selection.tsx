import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useOnboarding } from '@/hooks/use-onboarding';
import { RoleSelector } from '@/components/onboarding/role-selector';
import { ProgressTracker } from '@/components/onboarding/progress-tracker';

export const RoleSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateUserRole, goToNextStep } = useOnboarding();

  const handleRoleSelect = (role: 'investor' | 'founder') => {
    updateUserRole(role);
  };

  const handleContinue = () => {
    if (state.userRole) {
      goToNextStep();
      // Navigate to registration page
      navigate({ to: '/onboarding/registration' });
    }
  };

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
          {/* Progress Sidebar - Mobile */}
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
                <h3 className="font-medium mb-3">Need Help Choosing?</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    <strong>Investors:</strong> If you're looking to invest in startups
                    and have the financial qualifications, this path is for you.
                  </p>
                  <p>
                    <strong>Founders:</strong> If you're building a startup and need
                    to raise capital from qualified investors, choose this option.
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Questions? Contact our support team for guidance.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <RoleSelector
              selectedRole={state.userRole}
              onRoleSelect={handleRoleSelect}
              onContinue={handleContinue}
            />
          </div>
        </div>
      </div>
    </div>
  );
};