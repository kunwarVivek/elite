import React from 'react';
import { Check, Circle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OnboardingStep, UserRole } from '@/types/onboarding';

interface ProgressTrackerProps {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  userRole?: UserRole;
  className?: string;
  onStepClick?: (step: OnboardingStep) => void;
  showStepLabels?: boolean;
}

const getStepOrder = (role: UserRole): Array<{ key: OnboardingStep; label: string; description: string }> => {
  if (role === 'investor') {
    return [
      { key: 'role-selection', label: 'Role', description: 'Choose your path' },
      { key: 'registration', label: 'Account', description: 'Create your account' },
      { key: 'email-verification', label: 'Verify', description: 'Confirm your email' },
      { key: 'investor-personal-info', label: 'Personal', description: 'Basic information' },
      { key: 'investor-financial-info', label: 'Financial', description: 'Qualifications' },
      { key: 'investor-accreditation', label: 'Accreditation', description: 'Verify eligibility' },
      { key: 'investor-kyc', label: 'Identity', description: 'KYC verification' },
      { key: 'investor-preferences', label: 'Preferences', description: 'Investment settings' },
      { key: 'investor-agreements', label: 'Agreements', description: 'Terms & conditions' },
    ];
  } else {
    return [
      { key: 'role-selection', label: 'Role', description: 'Choose your path' },
      { key: 'registration', label: 'Account', description: 'Create your account' },
      { key: 'email-verification', label: 'Verify', description: 'Confirm your email' },
      { key: 'founder-company-info', label: 'Company', description: 'Business details' },
      { key: 'founder-info', label: 'Founder', description: 'Your background' },
      { key: 'founder-company-verification', label: 'Verification', description: 'Company documents' },
      { key: 'founder-team-info', label: 'Team', description: 'Team members' },
      { key: 'founder-kyc', label: 'Identity', description: 'KYC verification' },
      { key: 'founder-agreements', label: 'Agreements', description: 'Terms & conditions' },
    ];
  }
};

const getStepIcon = (step: OnboardingStep, isCompleted: boolean, isCurrent: boolean) => {
  if (isCompleted) {
    return <Check className="w-5 h-5 text-white" />;
  }

  if (isCurrent) {
    return <Circle className="w-5 h-5 text-primary fill-current" />;
  }

  return <Circle className="w-5 h-5 text-muted-foreground" />;
};

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  currentStep,
  completedSteps,
  userRole,
  className,
  onStepClick,
  showStepLabels = true,
}) => {
  if (!userRole) {
    return null;
  }

  const steps = getStepOrder(userRole);
  const currentIndex = steps.findIndex(step => step.key === currentStep);

  return (
    <div className={cn('w-full', className)}>
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Progress</span>
          <span>{completedSteps.length} of {steps.length} steps</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${(completedSteps.length / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Indicators */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.key);
          const isCurrent = step.key === currentStep;
          const isClickable = onStepClick && (isCompleted || index <= currentIndex);

          return (
            <div key={step.key} className="flex items-center space-x-4">
              {/* Step Circle */}
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200',
                  isCompleted && 'bg-primary border-primary',
                  isCurrent && !isCompleted && 'border-primary',
                  !isCompleted && !isCurrent && 'border-muted-foreground',
                  isClickable && 'cursor-pointer hover:bg-primary/10'
                )}
                onClick={isClickable ? () => onStepClick(step.key) : undefined}
              >
                {getStepIcon(step.key, isCompleted, isCurrent)}
              </div>

              {/* Step Content */}
              {showStepLabels && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={cn(
                        'text-sm font-medium',
                        isCompleted || isCurrent ? 'text-foreground' : 'text-muted-foreground'
                      )}>
                        {step.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {step.description}
                      </p>
                    </div>

                    {/* Arrow for current step */}
                    {isCurrent && index < steps.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-primary ml-2" />
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Current Step Info */}
      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <h3 className="font-medium text-sm mb-1">
          Current Step: {steps[currentIndex]?.label}
        </h3>
        <p className="text-xs text-muted-foreground">
          {steps[currentIndex]?.description}
        </p>
      </div>
    </div>
  );
};