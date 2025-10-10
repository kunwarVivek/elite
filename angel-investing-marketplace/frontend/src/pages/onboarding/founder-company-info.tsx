import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Globe, Calendar, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProgressTracker } from '@/components/onboarding/progress-tracker';

import { useOnboarding } from '@/hooks/use-onboarding';
import { founderCompanyInfoSchema, FounderCompanyInfoFormData } from '@/lib/validations/onboarding';
import { cn } from '@/lib/utils';

const businessStages = [
  { value: 'idea', label: 'Idea Stage', description: 'Just an idea or concept' },
  { value: 'mvp', label: 'MVP', description: 'Minimum viable product built' },
  { value: 'early-traction', label: 'Early Traction', description: 'First users or revenue' },
  { value: 'scaling', label: 'Scaling', description: 'Growing rapidly' },
  { value: 'mature', label: 'Mature', description: 'Established business' },
];

const industries = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'E-commerce',
  'SaaS', 'Marketplace', 'Social Media', 'Gaming', 'CleanTech',
  'BioTech', 'FinTech', 'EdTech', 'Food & Beverage', 'Real Estate',
  'Transportation', 'Entertainment', 'Security', 'AI/ML', 'Other'
];

export const FounderCompanyInfoPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateUserData, goToNextStep, goToPreviousStep } = useOnboarding();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    getValues,
  } = useForm<FounderCompanyInfoFormData>({
    resolver: zodResolver(founderCompanyInfoSchema),
    defaultValues: {
      companyName: state.userData.companyName || '',
      companyWebsite: state.userData.companyWebsite || '',
      foundingDate: state.userData.foundingDate || '',
      businessStage: state.userData.businessStage || 'idea',
      industry: state.userData.industry || '',
      description: state.userData.description || '',
    },
  });

  const selectedStage = watch('businessStage');
  const selectedDate = watch('foundingDate');

  const onSubmit = (data: FounderCompanyInfoFormData) => {
    updateUserData(data);
    goToNextStep();
    navigate({ to: '/onboarding/founder-info' });
  };

  if (state.userRole !== 'founder') {
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
                <h3 className="font-medium mb-3">Company Information</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Tell us about your company so we can match you with the right investors
                    and help you create an effective fundraising profile.
                  </p>
                  <div className="space-y-2">
                    <p className="font-medium">This information helps:</p>
                    <ul className="text-xs space-y-1 ml-4">
                      <li>• Match with relevant investors</li>
                      <li>• Create your company profile</li>
                      <li>• Verify your business legitimacy</li>
                      <li>• Assess investment readiness</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Company Info Form */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Company Information</CardTitle>
                    <CardDescription>
                      Tell us about your startup to create your fundraising profile
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Company Name */}
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="companyName"
                        {...register('companyName')}
                        className="pl-10"
                        placeholder="Your Company Name"
                      />
                    </div>
                    {errors.companyName && (
                      <p className="text-sm text-destructive">{errors.companyName.message}</p>
                    )}
                  </div>

                  {/* Company Website */}
                  <div className="space-y-2">
                    <Label htmlFor="companyWebsite">Company Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="companyWebsite"
                        type="url"
                        {...register('companyWebsite')}
                        className="pl-10"
                        placeholder="https://yourcompany.com"
                      />
                    </div>
                    {errors.companyWebsite && (
                      <p className="text-sm text-destructive">{errors.companyWebsite.message}</p>
                    )}
                  </div>

                  {/* Founding Date */}
                  <div className="space-y-2">
                    <Label>Founding Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !selectedDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {selectedDate ? format(new Date(selectedDate), "PPP") : "Select your founding date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate ? new Date(selectedDate) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setValue('foundingDate', format(date, 'yyyy-MM-dd'));
                            }
                          }}
                          disabled={(date) =>
                            date > new Date() || date < new Date("2010-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.foundingDate && (
                      <p className="text-sm text-destructive">{errors.foundingDate.message}</p>
                    )}
                  </div>

                  {/* Business Stage */}
                  <div className="space-y-2">
                    <Label>Business Stage *</Label>
                    <Select onValueChange={(value) => setValue('businessStage', value as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your business stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {businessStages.map((stage) => (
                          <SelectItem key={stage.value} value={stage.value}>
                            <div>
                              <div className="font-medium">{stage.label}</div>
                              <div className="text-xs text-muted-foreground">{stage.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.businessStage && (
                      <p className="text-sm text-destructive">{errors.businessStage.message}</p>
                    )}
                  </div>

                  {/* Industry */}
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry *</Label>
                    <Select onValueChange={(value) => setValue('industry', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {industries.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.industry && (
                      <p className="text-sm text-destructive">{errors.industry.message}</p>
                    )}
                  </div>

                  {/* Company Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Company Description *</Label>
                    <Textarea
                      id="description"
                      {...register('description')}
                      placeholder="Describe your company, its mission, and what problem it solves..."
                      className="min-h-[120px]"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Minimum 50 characters</span>
                      <span>{watch('description')?.length || 0}/1000</span>
                    </div>
                    {errors.description && (
                      <p className="text-sm text-destructive">{errors.description.message}</p>
                    )}
                  </div>

                  {/* Business Stage Info */}
                  {selectedStage && (
                    <Alert>
                      <TrendingUp className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <p className="font-medium">
                            {businessStages.find(s => s.value === selectedStage)?.label} Companies
                          </p>
                          <p className="text-sm">
                            {selectedStage === 'idea' && "Great! Many successful startups began as just an idea. Focus on validating your concept and building an MVP."}
                            {selectedStage === 'mvp' && "Excellent! Having an MVP shows execution ability. Now focus on user feedback and early metrics."}
                            {selectedStage === 'early-traction' && "Impressive! Early traction is a strong signal. Focus on scaling and building a repeatable business model."}
                            {selectedStage === 'scaling' && "Fantastic! You're in growth mode. Focus on efficient scaling and building a strong team."}
                            {selectedStage === 'mature' && "Outstanding! Your business is established. Focus on optimization and market expansion."}
                          </p>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

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
                      Continue to Founder Information
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