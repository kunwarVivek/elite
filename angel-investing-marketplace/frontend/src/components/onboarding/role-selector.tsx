import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, Shield, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types/onboarding';

interface RoleSelectorProps {
  selectedRole?: UserRole;
  onRoleSelect: (role: UserRole) => void;
  onContinue: () => void;
  className?: string;
}

const roleOptions = [
  {
    key: 'investor' as UserRole,
    title: 'Investor',
    subtitle: 'Invest in startups',
    description: 'Browse and invest in promising early-stage companies. Access exclusive deal flow and diversify your portfolio.',
    features: [
      'Access to curated startup deals',
      'SEC-accredited investor verification',
      'Portfolio tracking and analytics',
      'Network with founders and co-investors',
    ],
    benefits: [
      'Diversified investment opportunities',
      'Due diligence support',
      'Co-investment options',
      'Exit strategy guidance',
    ],
    estimatedTime: '15-20 minutes',
    icon: TrendingUp,
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    key: 'founder' as UserRole,
    title: 'Founder',
    subtitle: 'Raise capital for your startup',
    description: 'Connect with qualified investors and raise capital for your startup. Get exposure to our network of active angel investors.',
    features: [
      'Access to qualified investor network',
      'Pitch deck optimization tools',
      'Investor matching algorithm',
      'Funding round management',
    ],
    benefits: [
      'Strategic investor relationships',
      'Faster fundraising process',
      'Mentorship opportunities',
      'Extended network access',
    ],
    estimatedTime: '20-25 minutes',
    icon: Users,
    color: 'bg-green-50 border-green-200 hover:bg-green-100',
    iconColor: 'text-green-600',
  },
];

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  selectedRole,
  onRoleSelect,
  onContinue,
  className,
}) => {
  const canContinue = selectedRole !== undefined;

  return (
    <div className={cn('max-w-4xl mx-auto', className)}>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Welcome to AngelInvest
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Join our exclusive community of investors and entrepreneurs.
          Choose your role to get started with a personalized onboarding experience.
        </p>
      </div>

      {/* Role Selection Cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {roleOptions.map((role) => {
          const Icon = role.icon;
          const isSelected = selectedRole === role.key;

          return (
            <Card
              key={role.key}
              className={cn(
                'relative cursor-pointer transition-all duration-200',
                role.color,
                isSelected && 'ring-2 ring-primary ring-offset-2',
                !isSelected && 'hover:shadow-lg'
              )}
              onClick={() => onRoleSelect(role.key)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={cn('p-2 rounded-lg bg-white/50', role.iconColor)}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{role.title}</CardTitle>
                      <CardDescription className="text-sm font-medium">
                        {role.subtitle}
                      </CardDescription>
                    </div>
                  </div>
                  {isSelected && (
                    <Badge variant="default" className="bg-primary">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Selected
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {role.description}
                </p>

                {/* Features */}
                <div>
                  <h4 className="font-medium text-sm mb-2">Features:</h4>
                  <ul className="space-y-1">
                    {role.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-muted-foreground">
                        <CheckCircle className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Benefits */}
                <div>
                  <h4 className="font-medium text-sm mb-2">Benefits:</h4>
                  <ul className="space-y-1">
                    {role.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-center text-sm text-muted-foreground">
                        <CheckCircle className="w-3 h-3 text-blue-500 mr-2 flex-shrink-0" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Estimated Time */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 mr-1" />
                    Setup time: {role.estimatedTime}
                  </div>
                  {isSelected && (
                    <ArrowRight className="w-4 h-4 text-primary" />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Continue Button */}
      <div className="flex justify-center">
        <Button
          onClick={onContinue}
          disabled={!canContinue}
          size="lg"
          className="px-8"
        >
          Continue with {selectedRole === 'investor' ? 'Investor' : 'Founder'} Onboarding
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Additional Info */}
      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          Not sure which role fits you?{' '}
          <button className="text-primary hover:underline">
            Learn more about our platform
          </button>
        </p>
      </div>
    </div>
  );
};