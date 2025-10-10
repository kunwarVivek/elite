import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProgressTracker } from '@/components/onboarding/progress-tracker';

import { useOnboarding } from '@/hooks/use-onboarding';
import { userRegistrationSchema, UserRegistrationFormData } from '@/lib/validations/onboarding';
import { apiClient } from '@/lib/api-client';

export const RegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateUserData, goToNextStep, goToPreviousStep } = useOnboarding();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<UserRegistrationFormData>({
    resolver: zodResolver(userRegistrationSchema),
    defaultValues: {
      email: state.userData.email || '',
      firstName: state.userData.firstName || '',
      lastName: state.userData.lastName || '',
      phone: state.userData.phone || '',
      agreedToTerms: false,
      agreedToPrivacy: false,
    },
  });

  const agreedToTerms = watch('agreedToTerms');
  const agreedToPrivacy = watch('agreedToPrivacy');

  const onSubmit = async (data: UserRegistrationFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Call registration API
      const response = await apiClient.post('/auth/register', {
        ...data,
        userRole: state.userRole,
      });

      // Update onboarding state with user data
      updateUserData(data);

      // Go to next step and navigate to email verification
      goToNextStep();
      navigate({ to: '/onboarding/email-verification' });

    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!state.userRole) {
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
                <h3 className="font-medium mb-3">Account Setup</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Create your secure account with a strong password.
                    We'll send you a verification email to confirm your identity.
                  </p>
                  <div className="space-y-2">
                    <p className="font-medium">Password requirements:</p>
                    <ul className="text-xs space-y-1 ml-4">
                      <li>• At least 8 characters</li>
                      <li>• One uppercase letter</li>
                      <li>• One lowercase letter</li>
                      <li>• One number</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Registration Form */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-2xl">Create Your Account</CardTitle>
                <CardDescription>
                  Join AngelInvest as a {state.userRole === 'investor' ? 'valued investor' : 'promising founder'}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Name Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="firstName"
                          {...register('firstName')}
                          className="pl-10"
                          placeholder="Enter your first name"
                        />
                      </div>
                      {errors.firstName && (
                        <p className="text-sm text-destructive">{errors.firstName.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="lastName"
                          {...register('lastName')}
                          className="pl-10"
                          placeholder="Enter your last name"
                        />
                      </div>
                      {errors.lastName && (
                        <p className="text-sm text-destructive">{errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        {...register('email')}
                        className="pl-10"
                        placeholder="Enter your email address"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>

                  {/* Phone (Optional) */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        {...register('phone')}
                        className="pl-10"
                        placeholder="Enter your phone number"
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone.message}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        {...register('password')}
                        className="pl-10 pr-10"
                        placeholder="Create a strong password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password.message}</p>
                    )}
                  </div>

                  {/* Agreements */}
                  <div className="space-y-4">
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="agreedToTerms"
                        checked={agreedToTerms}
                        onCheckedChange={(checked) => setValue('agreedToTerms', !!checked)}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="agreedToTerms" className="text-sm font-normal">
                          I agree to the{' '}
                          <a href="/terms" className="text-primary hover:underline" target="_blank">
                            Terms of Service
                          </a>{' '}
                          *
                        </Label>
                      </div>
                    </div>
                    {errors.agreedToTerms && (
                      <p className="text-sm text-destructive">{errors.agreedToTerms.message}</p>
                    )}

                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="agreedToPrivacy"
                        checked={agreedToPrivacy}
                        onCheckedChange={(checked) => setValue('agreedToPrivacy', !!checked)}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="agreedToPrivacy" className="text-sm font-normal">
                          I agree to the{' '}
                          <a href="/privacy" className="text-primary hover:underline" target="_blank">
                            Privacy Policy
                          </a>{' '}
                          *
                        </Label>
                      </div>
                    </div>
                    {errors.agreedToPrivacy && (
                      <p className="text-sm text-destructive">{errors.agreedToPrivacy.message}</p>
                    )}
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
                      type="submit"
                      disabled={isLoading || !agreedToTerms || !agreedToPrivacy}
                    >
                      {isLoading ? 'Creating Account...' : 'Create Account'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};