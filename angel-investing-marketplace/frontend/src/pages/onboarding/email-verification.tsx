import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProgressTracker } from '@/components/onboarding/progress-tracker';

import { useOnboarding } from '@/hooks/use-onboarding';
import { emailVerificationSchema, EmailVerificationFormData } from '@/lib/validations/onboarding';
import { apiClient } from '@/lib/api-client';

export const EmailVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateVerificationStatus, goToNextStep, goToPreviousStep } = useOnboarding();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<EmailVerificationFormData>({
    resolver: zodResolver(emailVerificationSchema),
  });

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Auto-redirect if already verified
  useEffect(() => {
    if (state.verificationStatus.emailVerified) {
      navigate({ to: '/onboarding/investor-personal-info' });
    }
  }, [state.verificationStatus.emailVerified, navigate]);

  const onSubmit = async (data: EmailVerificationFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await apiClient.post('/auth/verify-email', {
        token: data.token,
        email: state.userData.email,
      });

      updateVerificationStatus({ emailVerified: true });
      setSuccess(true);

      // Auto-advance after 2 seconds
      setTimeout(() => {
        goToNextStep();
        const nextStep = state.userRole === 'investor'
          ? '/onboarding/investor-personal-info'
          : '/onboarding/founder-company-info';
        navigate({ to: nextStep });
      }, 2000);

    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0 || !state.userData.email) return;

    setIsLoading(true);
    setError(null);

    try {
      await apiClient.post('/auth/resend-verification', {
        email: state.userData.email,
      });

      setEmailSent(true);
      setResendCooldown(60); // 60 second cooldown

    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!state.userData.email) {
    navigate({ to: '/onboarding/registration' });
    return null;
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-700 mb-2">Email Verified!</h2>
              <p className="text-muted-foreground">
                Your email has been successfully verified. Redirecting you to the next step...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
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
                <h3 className="font-medium mb-3">Email Verification</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    We've sent a verification code to <strong>{state.userData.email}</strong>.
                    Enter the 6-digit code below to verify your email address.
                  </p>
                  <div className="space-y-2">
                    <p className="font-medium">Didn't receive the email?</p>
                    <ul className="text-xs space-y-1 ml-4">
                      <li>• Check your spam/junk folder</li>
                      <li>• Wait a few minutes for delivery</li>
                      <li>• Click "Resend" to get a new code</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Form */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <Card className="max-w-md mx-auto">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Verify Your Email</CardTitle>
                <CardDescription>
                  Enter the 6-digit verification code sent to<br />
                  <strong>{state.userData.email}</strong>
                </CardDescription>
              </CardHeader>

              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {emailSent && (
                  <Alert className="mb-6">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Verification email sent successfully! Please check your inbox.
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="token">Verification Code</Label>
                    <Input
                      id="token"
                      {...register('token')}
                      className="text-center text-2xl tracking-widest"
                      placeholder="000000"
                      maxLength={6}
                      autoComplete="one-time-code"
                    />
                    {errors.token && (
                      <p className="text-sm text-destructive">{errors.token.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Verifying...' : 'Verify Email'}
                  </Button>
                </form>

                {/* Resend Section */}
                <div className="mt-6 pt-6 border-t text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Didn't receive the code?
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResendEmail}
                    disabled={resendCooldown > 0 || isLoading}
                    className="w-full"
                  >
                    {resendCooldown > 0 ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Resend in {resendCooldown}s
                      </>
                    ) : (
                      'Resend Verification Email'
                    )}
                  </Button>
                </div>

                {/* Back Button */}
                <div className="mt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={goToPreviousStep}
                    className="w-full"
                  >
                    Back to Registration
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