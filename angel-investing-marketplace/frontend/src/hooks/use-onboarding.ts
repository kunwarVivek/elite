import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  OnboardingState,
  OnboardingStep,
  UserRole,
  UserRegistrationData,
  InvestorData,
  FounderData,
} from '@/types/onboarding';

const getInitialStep = (role?: UserRole): OnboardingStep => {
  if (!role) return 'role-selection';
  return role === 'investor' ? 'investor-personal-info' : 'founder-company-info';
};

const getStepOrder = (role: UserRole): OnboardingStep[] => {
  if (role === 'investor') {
    return [
      'role-selection',
      'registration',
      'email-verification',
      'investor-personal-info',
      'investor-financial-info',
      'investor-accreditation',
      'investor-kyc',
      'investor-preferences',
      'investor-agreements',
      'complete',
    ];
  } else {
    return [
      'role-selection',
      'registration',
      'email-verification',
      'founder-company-info',
      'founder-info',
      'founder-company-verification',
      'founder-team-info',
      'founder-kyc',
      'founder-agreements',
      'complete',
    ];
  }
};

export const useOnboarding = () => {
  const navigate = useNavigate();

  const [state, setState] = useState<OnboardingState>(() => ({
    currentStep: 'role-selection',
    completedSteps: [],
    userData: {},
    verificationStatus: {
      emailVerified: false,
      kycVerified: false,
    },
  }));

  // Load saved progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('onboarding-progress');
    if (saved) {
      try {
        const parsedState = JSON.parse(saved);
        setState(parsedState);
      } catch (error) {
        console.error('Failed to load onboarding progress:', error);
      }
    }
  }, []);

  // Save progress to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('onboarding-progress', JSON.stringify(state));
  }, [state]);

  const updateUserRole = useCallback((role: UserRole) => {
    setState(prev => ({
      ...prev,
      userRole: role,
      currentStep: getInitialStep(role),
      userData: {},
      completedSteps: [],
      verificationStatus: {
        emailVerified: false,
        kycVerified: false,
      },
    }));
  }, []);

  const goToNextStep = useCallback(() => {
    setState(prev => {
      const stepOrder = prev.userRole ? getStepOrder(prev.userRole) : ['role-selection'];
      const currentIndex = stepOrder.indexOf(prev.currentStep);

      if (currentIndex < stepOrder.length - 1) {
        const nextStep = stepOrder[currentIndex + 1];
        return {
          ...prev,
          currentStep: nextStep,
          completedSteps: [...prev.completedSteps, prev.currentStep],
        };
      }

      return prev;
    });
  }, []);

  const goToPreviousStep = useCallback(() => {
    setState(prev => {
      const stepOrder = prev.userRole ? getStepOrder(prev.userRole) : ['role-selection'];
      const currentIndex = stepOrder.indexOf(prev.currentStep);

      if (currentIndex > 0) {
        const previousStep = stepOrder[currentIndex - 1];
        return {
          ...prev,
          currentStep: previousStep,
          completedSteps: prev.completedSteps.filter(step => step !== previousStep),
        };
      }

      return prev;
    });
  }, []);

  const goToStep = useCallback((step: OnboardingStep) => {
    setState(prev => {
      const stepOrder = prev.userRole ? getStepOrder(prev.userRole) : ['role-selection'];
      const currentIndex = stepOrder.indexOf(prev.currentStep);
      const targetIndex = stepOrder.indexOf(step);

      if (targetIndex <= currentIndex || prev.completedSteps.includes(step)) {
        return {
          ...prev,
          currentStep: step,
        };
      }

      return prev;
    });
  }, []);

  const updateUserData = useCallback((data: Partial<UserRegistrationData & InvestorData & FounderData>) => {
    setState(prev => ({
      ...prev,
      userData: {
        ...prev.userData,
        ...data,
      },
    }));
  }, []);

  const updateVerificationStatus = useCallback((status: Partial<OnboardingState['verificationStatus']>) => {
    setState(prev => ({
      ...prev,
      verificationStatus: {
        ...prev.verificationStatus,
        ...status,
      },
    }));
  }, []);

  const completeStep = useCallback((step: OnboardingStep) => {
    setState(prev => ({
      ...prev,
      completedSteps: [...new Set([...prev.completedSteps, step])],
    }));
  }, []);

  const resetOnboarding = useCallback(() => {
    setState({
      currentStep: 'role-selection',
      completedSteps: [],
      userData: {},
      verificationStatus: {
        emailVerified: false,
        kycVerified: false,
      },
    });
    localStorage.removeItem('onboarding-progress');
  }, []);

  const isStepCompleted = useCallback((step: OnboardingStep) => {
    return state.completedSteps.includes(step);
  }, [state.completedSteps]);

  const isStepAccessible = useCallback((step: OnboardingStep) => {
    if (!state.userRole) return step === 'role-selection';

    const stepOrder = getStepOrder(state.userRole);
    const currentIndex = stepOrder.indexOf(state.currentStep);
    const targetIndex = stepOrder.indexOf(step);

    return targetIndex <= currentIndex || state.completedSteps.includes(step);
  }, [state.currentStep, state.completedSteps, state.userRole]);

  const getProgress = useCallback(() => {
    if (!state.userRole) {
      return {
        totalSteps: 1,
        completedSteps: state.currentStep === 'role-selection' ? 1 : 0,
        currentStepIndex: 0,
        percentage: state.currentStep === 'role-selection' ? 100 : 0,
      };
    }

    const stepOrder = getStepOrder(state.userRole);
    const currentIndex = stepOrder.indexOf(state.currentStep);

    return {
      totalSteps: stepOrder.length - 1, // Exclude 'complete' step
      completedSteps: state.completedSteps.length,
      currentStepIndex: currentIndex,
      percentage: Math.round((state.completedSteps.length / (stepOrder.length - 1)) * 100),
    };
  }, [state.currentStep, state.completedSteps.length, state.userRole]);

  return {
    state,
    updateUserRole,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    updateUserData,
    updateVerificationStatus,
    completeStep,
    resetOnboarding,
    isStepCompleted,
    isStepAccessible,
    getProgress,
  };
};