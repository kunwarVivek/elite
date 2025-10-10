import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon, MapPin, Globe } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProgressTracker } from '@/components/onboarding/progress-tracker';

import { useOnboarding } from '@/hooks/use-onboarding';
import { investorPersonalInfoSchema, InvestorPersonalInfoFormData } from '@/lib/validations/onboarding';
import { cn } from '@/lib/utils';

const countries = [
  'United States', 'Canada', 'United Kingdom', 'Germany', 'France',
  'Australia', 'Singapore', 'Japan', 'South Korea', 'Netherlands',
  'Switzerland', 'Sweden', 'Norway', 'Denmark', 'Finland',
  'Israel', 'United Arab Emirates', 'Hong Kong', 'Other'
];

const usStates = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming'
];

export const InvestorPersonalInfoPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateUserData, goToNextStep, goToPreviousStep } = useOnboarding();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    getValues,
  } = useForm<InvestorPersonalInfoFormData>({
    resolver: zodResolver(investorPersonalInfoSchema),
    defaultValues: {
      dateOfBirth: state.userData.dateOfBirth || '',
      address: {
        street: state.userData.address?.street || '',
        city: state.userData.address?.city || '',
        state: state.userData.address?.state || '',
        zipCode: state.userData.address?.zipCode || '',
        country: state.userData.address?.country || 'United States',
      },
      citizenship: state.userData.citizenship || 'United States',
    },
  });

  const selectedCountry = watch('address.country');
  const selectedDate = watch('dateOfBirth');

  const onSubmit = (data: InvestorPersonalInfoFormData) => {
    updateUserData(data);
    goToNextStep();
    navigate({ to: '/onboarding/investor-financial-info' });
  };

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
                <h3 className="font-medium mb-3">Personal Information</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    We need your basic personal information for regulatory compliance
                    and to verify your identity as part of the KYC process.
                  </p>
                  <div className="space-y-2">
                    <p className="font-medium">Why we need this:</p>
                    <ul className="text-xs space-y-1 ml-4">
                      <li>• Regulatory compliance (SEC requirements)</li>
                      <li>• Identity verification (KYC)</li>
                      <li>• Accreditation verification</li>
                      <li>• Tax and legal documentation</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Info Form */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-2xl">Personal Information</CardTitle>
                <CardDescription>
                  Please provide your personal details for verification and compliance purposes
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Date of Birth */}
                  <div className="space-y-2">
                    <Label>Date of Birth *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !selectedDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(new Date(selectedDate), "PPP") : "Select your date of birth"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate ? new Date(selectedDate) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setValue('dateOfBirth', format(date, 'yyyy-MM-dd'));
                            }
                          }}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.dateOfBirth && (
                      <p className="text-sm text-destructive">{errors.dateOfBirth.message}</p>
                    )}
                  </div>

                  {/* Address Section */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <Label className="text-base font-medium">Address Information</Label>
                    </div>

                    {/* Street Address */}
                    <div className="space-y-2">
                      <Label htmlFor="address.street">Street Address *</Label>
                      <Input
                        id="address.street"
                        {...register('address.street')}
                        placeholder="123 Main Street, Apt 4B"
                      />
                      {errors.address?.street && (
                        <p className="text-sm text-destructive">{errors.address.street.message}</p>
                      )}
                    </div>

                    {/* City, State, ZIP */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="address.city">City *</Label>
                        <Input
                          id="address.city"
                          {...register('address.city')}
                          placeholder="New York"
                        />
                        {errors.address?.city && (
                          <p className="text-sm text-destructive">{errors.address.city.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address.state">State *</Label>
                        {selectedCountry === 'United States' ? (
                          <Select onValueChange={(value) => setValue('address.state', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent>
                              {usStates.map((state) => (
                                <SelectItem key={state} value={state}>
                                  {state}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            id="address.state"
                            {...register('address.state')}
                            placeholder="State/Province"
                          />
                        )}
                        {errors.address?.state && (
                          <p className="text-sm text-destructive">{errors.address.state.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address.zipCode">ZIP/Postal Code *</Label>
                        <Input
                          id="address.zipCode"
                          {...register('address.zipCode')}
                          placeholder="10001"
                        />
                        {errors.address?.zipCode && (
                          <p className="text-sm text-destructive">{errors.address.zipCode.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Country */}
                    <div className="space-y-2">
                      <Label htmlFor="address.country">Country *</Label>
                      <Select onValueChange={(value) => setValue('address.country', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.address?.country && (
                        <p className="text-sm text-destructive">{errors.address.country.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Citizenship */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <Label htmlFor="citizenship">Citizenship *</Label>
                    </div>
                    <Select onValueChange={(value) => setValue('citizenship', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your citizenship" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.citizenship && (
                      <p className="text-sm text-destructive">{errors.citizenship.message}</p>
                    )}
                  </div>

                  {/* Privacy Notice */}
                  <Alert>
                    <AlertDescription className="text-sm">
                      Your personal information is encrypted and stored securely. We only use this information
                      for identity verification and regulatory compliance. See our Privacy Policy for details.
                    </AlertDescription>
                  </Alert>

                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={goToPreviousStep}
                    >
                      Back
                    </Button>
                    <Button type="submit">
                      Continue to Financial Information
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