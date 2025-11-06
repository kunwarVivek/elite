import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { CheckCircle, DollarSign, Briefcase, FileText, Shield, Info } from 'lucide-react';

/**
 * Accreditation Start Page
 * Entry point for investor accreditation process
 * Explains SEC requirements and available methods
 */
export function AccreditationStartPage() {
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const accreditationMethods = [
    {
      id: 'INCOME',
      title: 'Income-Based',
      description: 'Annual income of $200K+ (individual) or $300K+ (joint)',
      icon: DollarSign,
      requirements: [
        'Tax returns for past 2 years',
        'W-2 forms or equivalent',
        'Expectation of same income level this year',
      ],
      minIncome: 200000,
    },
    {
      id: 'NET_WORTH',
      title: 'Net Worth-Based',
      description: 'Net worth of $1M+ (excluding primary residence)',
      icon: Briefcase,
      requirements: [
        'Bank statements',
        'Investment account statements',
        'Asset and liability documentation',
      ],
      minNetWorth: 1000000,
    },
    {
      id: 'PROFESSIONAL',
      title: 'Professional Certification',
      description: 'Series 7, 65, or 82 license holder',
      icon: FileText,
      requirements: [
        'Valid license certificate',
        'License verification',
        'Professional credentials',
      ],
    },
    {
      id: 'THIRD_PARTY_VERIFICATION',
      title: 'Third-Party Verification',
      description: 'Verification through approved service',
      icon: Shield,
      requirements: [
        'Identity verification',
        'Financial documentation',
        'Third-party attestation',
      ],
    },
  ];

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
  };

  const handleContinue = () => {
    if (!selectedMethod) {
      alert('Please select an accreditation method');
      return;
    }

    // Navigate to appropriate verification page
    if (selectedMethod === 'INCOME') {
      navigate({ to: '/accreditation/income-verification' });
    } else if (selectedMethod === 'NET_WORTH') {
      navigate({ to: '/accreditation/net-worth-verification' });
    } else {
      navigate({ to: '/accreditation/document-upload' });
    }
  };

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Accredited Investor Verification</h1>
        <p className="text-muted-foreground">
          To invest in private offerings, SEC regulations require verification of your accredited investor status.
        </p>
      </div>

      {/* Information Alert */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>What is an Accredited Investor?</strong>
          <br />
          An accredited investor meets specific financial criteria set by the SEC and is permitted to invest in unregistered securities offerings.
          This verification helps ensure you have the financial sophistication and capacity to understand and bear the risks of private investments.
        </AlertDescription>
      </Alert>

      {/* Benefits Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Benefits of Accreditation</CardTitle>
          <CardDescription>
            Access exclusive investment opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold">Access Private Deals</h4>
                <p className="text-sm text-muted-foreground">Invest in startups and private companies</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold">Join Syndicates</h4>
                <p className="text-sm text-muted-foreground">Participate in group investments</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold">Secondary Trading</h4>
                <p className="text-sm text-muted-foreground">Buy and sell private company shares</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold">Portfolio Diversification</h4>
                <p className="text-sm text-muted-foreground">Expand investment opportunities</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Methods */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-4">Choose Your Verification Method</h2>
        <p className="text-muted-foreground mb-6">
          Select the method that best applies to your situation. You only need to qualify through one method.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          {accreditationMethods.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedMethod === method.id;

            return (
              <Card
                key={method.id}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handleMethodSelect(method.id)}
              >
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{method.title}</CardTitle>
                      <CardDescription>{method.description}</CardDescription>
                    </div>
                    {isSelected && (
                      <CheckCircle className="h-6 w-6 text-primary" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold mb-2">Required Documents:</p>
                    <ul className="space-y-1">
                      {method.requirements.map((req, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-center">
                          <span className="mr-2">•</span>
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Important Information */}
      <Alert className="mb-6" variant="default">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Your financial information is encrypted and securely stored. We will review your application within 2-3 business days.
          Accreditation is valid for one year and requires annual renewal.
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => navigate({ to: '/dashboard' })}
        >
          Cancel
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!selectedMethod}
        >
          Continue with {selectedMethod ? accreditationMethods.find(m => m.id === selectedMethod)?.title : 'Selected Method'}
        </Button>
      </div>

      {/* Help Section */}
      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Need Help?</h3>
        <p className="text-sm text-muted-foreground mb-2">
          If you're unsure which method to choose or need assistance with the verification process, our support team is here to help.
        </p>
        <Button variant="link" className="p-0 h-auto">
          Contact Support →
        </Button>
      </div>
    </div>
  );
}
