import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Progress } from '../../components/ui/progress';
import {
  ArrowLeft,
  Building2,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Calendar,
  MapPin,
  Globe,
  Linkedin,
  Twitter,
  Download,
  FileText,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Heart,
  Share2,
  MessageSquare,
  BarChart3,
  Clock,
  Star,
  Award,
} from 'lucide-react';
import { cn, formatNumber, formatDate, formatTimeAgo } from '@/lib/utils';

/**
 * Investment Details Page
 * Comprehensive view of a single investment opportunity
 * Includes pitch details, startup info, team, documents, and investment CTA
 */

interface PitchDetails {
  id: string;
  startupId: string;
  startup: {
    id: string;
    name: string;
    industry: string;
    stage: string;
    location: string;
    website?: string;
    linkedin?: string;
    twitter?: string;
    logo?: string;
    description: string;
    longDescription: string;
    teamSize: number;
    foundedYear: number;
    team: Array<{
      id: string;
      name: string;
      role: string;
      bio: string;
      linkedin?: string;
      avatar?: string;
    }>;
  };
  title: string;
  description: string;
  longPitch: string;
  fundingGoal: number;
  minInvestment: number;
  maxInvestment?: number;
  currentFunding: number;
  investorCount: number;
  equityOffered: number;
  valuation: number;
  status: string;
  deadline?: string;
  createdAt: string;
  highlights: string[];
  useOfFunds: Array<{
    category: string;
    percentage: number;
    amount: number;
    description: string;
  }>;
  metrics: {
    revenue?: number;
    revenueGrowth?: number;
    customers?: number;
    customerGrowth?: number;
    mrr?: number;
    arr?: number;
    runway?: number;
  };
  documents: Array<{
    id: string;
    type: string;
    name: string;
    url: string;
    uploadedAt: string;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
}

export function InvestmentDetailsPage() {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const pitchId = (params as any).id;

  const [pitch, setPitch] = useState<PitchDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (pitchId) {
      fetchPitchDetails();
    }
  }, [pitchId]);

  const fetchPitchDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/pitches/${pitchId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch investment details');
      }

      const result = await response.json();
      setPitch(result.data.pitch);
    } catch (err: any) {
      console.error('Error fetching pitch:', err);
      setError(err.message || 'Failed to load investment details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvest = () => {
    if (!pitch) return;
    navigate({ to: `/investments/${pitch.id}/commit` });
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    // TODO: Implement save functionality with API call
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: pitch?.startup.name,
        text: pitch?.title,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const getFundingProgress = (): number => {
    if (!pitch) return 0;
    return (pitch.currentFunding / pitch.fundingGoal) * 100;
  };

  const getDaysRemaining = (): number | null => {
    if (!pitch?.deadline) return null;
    const now = new Date();
    const end = new Date(pitch.deadline);
    const diffTime = end.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading investment details...</span>
        </div>
      </div>
    );
  }

  if (error || !pitch) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Investment not found'}</AlertDescription>
        </Alert>
        <Button onClick={() => navigate({ to: '/investments' })} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Marketplace
        </Button>
      </div>
    );
  }

  const progress = getFundingProgress();
  const daysRemaining = getDaysRemaining();
  const isFunded = progress >= 100;

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <Button
        variant="ghost"
        onClick={() => navigate({ to: '/investments' })}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Marketplace
      </Button>

      {/* Hero Section */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-4 flex-1">
            <div className="flex-shrink-0 w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              {pitch.startup.logo ? (
                <img src={pitch.startup.logo} alt={pitch.startup.name} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <Building2 className="h-12 w-12 text-white" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{pitch.startup.name}</h1>
              <p className="text-xl text-muted-foreground mb-3">{pitch.title}</p>
              <div className="flex items-center space-x-3">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded font-semibold">{pitch.startup.industry}</span>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded font-semibold">{pitch.startup.stage}</span>
                <div className="flex items-center text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{pitch.startup.location}</span>
                </div>
                {pitch.startup.website && (
                  <a href={pitch.startup.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    <Globe className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Heart className={cn('h-4 w-4', isSaved && 'fill-red-600 text-red-600')} />
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Funding Goal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">${formatNumber(pitch.fundingGoal)}</p>
              <p className="text-xs text-muted-foreground mt-1">${formatNumber(pitch.currentFunding)} raised</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Valuation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">${formatNumber(pitch.valuation)}</p>
              <p className="text-xs text-muted-foreground mt-1">Pre-money</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Min Investment</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">${formatNumber(pitch.minInvestment)}</p>
              {pitch.maxInvestment && (
                <p className="text-xs text-muted-foreground mt-1">Max: ${formatNumber(pitch.maxInvestment)}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Equity Offered</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{pitch.equityOffered}%</p>
              <p className="text-xs text-muted-foreground mt-1">of company</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Progress & CTA */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-2xl font-bold mb-1">{progress.toFixed(0)}% Funded</p>
              <p className="text-sm text-muted-foreground">
                {pitch.investorCount} {pitch.investorCount === 1 ? 'investor' : 'investors'}
                {daysRemaining !== null && ` • ${daysRemaining} days remaining`}
              </p>
            </div>
            <Button size="lg" onClick={handleInvest} disabled={isFunded} className="px-8">
              {isFunded ? 'Fully Funded' : 'Invest Now'}
            </Button>
          </div>
          <Progress value={Math.min(progress, 100)} className="h-3" />
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex items-center space-x-2 mb-6 border-b">
        {['overview', 'financials', 'team', 'documents'].map((tab) => (
          <Button
            key={tab}
            variant="ghost"
            className={cn(
              'rounded-none border-b-2 border-transparent',
              activeTab === tab && 'border-primary'
            )}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'overview' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>About {pitch.startup.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-line">{pitch.longPitch}</p>
                </CardContent>
              </Card>

              {pitch.highlights && pitch.highlights.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Highlights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {pitch.highlights.map((highlight, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {pitch.useOfFunds && pitch.useOfFunds.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Use of Funds</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {pitch.useOfFunds.map((item, index) => (
                        <div key={index}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold">{item.category}</span>
                            <span className="font-bold text-green-600">{item.percentage}%</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-600"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {pitch.faqs && pitch.faqs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Frequently Asked Questions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {pitch.faqs.map((faq, index) => (
                        <div key={index} className="pb-4 border-b last:border-0">
                          <h4 className="font-semibold mb-2">{faq.question}</h4>
                          <p className="text-sm text-muted-foreground">{faq.answer}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {activeTab === 'financials' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Key Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {pitch.metrics.revenue && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Annual Revenue</p>
                        <p className="text-2xl font-bold">${formatNumber(pitch.metrics.revenue)}</p>
                        {pitch.metrics.revenueGrowth && (
                          <p className="text-sm text-green-600 mt-1">+{pitch.metrics.revenueGrowth}% YoY</p>
                        )}
                      </div>
                    )}
                    {pitch.metrics.customers && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Customers</p>
                        <p className="text-2xl font-bold">{formatNumber(pitch.metrics.customers)}</p>
                        {pitch.metrics.customerGrowth && (
                          <p className="text-sm text-green-600 mt-1">+{pitch.metrics.customerGrowth}% MoM</p>
                        )}
                      </div>
                    )}
                    {pitch.metrics.mrr && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Monthly Recurring Revenue</p>
                        <p className="text-2xl font-bold">${formatNumber(pitch.metrics.mrr)}</p>
                      </div>
                    )}
                    {pitch.metrics.arr && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Annual Recurring Revenue</p>
                        <p className="text-2xl font-bold">${formatNumber(pitch.metrics.arr)}</p>
                      </div>
                    )}
                    {pitch.metrics.runway && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Runway</p>
                        <p className="text-2xl font-bold">{pitch.metrics.runway} months</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === 'team' && pitch.startup.team && (
            <Card>
              <CardHeader>
                <CardTitle>Meet the Team</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {pitch.startup.team.map((member) => (
                    <div key={member.id} className="flex items-start space-x-4 pb-6 border-b last:border-0">
                      <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-white text-xl font-bold">
                            {member.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-bold">{member.name}</h4>
                          {member.linkedin && (
                            <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600">
                              <Linkedin className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{member.role}</p>
                        <p className="text-sm">{member.bio}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'documents' && (
            <Card>
              <CardHeader>
                <CardTitle>Investment Documents</CardTitle>
                <CardDescription>Review pitch deck and supporting materials</CardDescription>
              </CardHeader>
              <CardContent>
                {pitch.documents && pitch.documents.length > 0 ? (
                  <div className="space-y-3">
                    {pitch.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-semibold">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.type} • Uploaded {formatTimeAgo(doc.uploadedAt)}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => window.open(doc.url, '_blank')}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No documents available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Investment Terms */}
          <Card>
            <CardHeader>
              <CardTitle>Investment Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <span className="font-semibold">Equity</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b">
                  <span className="text-sm text-muted-foreground">Min Investment</span>
                  <span className="font-semibold">${formatNumber(pitch.minInvestment)}</span>
                </div>
                {pitch.maxInvestment && (
                  <div className="flex items-center justify-between pb-2 border-b">
                    <span className="text-sm text-muted-foreground">Max Investment</span>
                    <span className="font-semibold">${formatNumber(pitch.maxInvestment)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pb-2 border-b">
                  <span className="text-sm text-muted-foreground">Valuation</span>
                  <span className="font-semibold">${formatNumber(pitch.valuation)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Equity Offered</span>
                  <span className="font-semibold">{pitch.equityOffered}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b">
                  <span className="text-sm text-muted-foreground">Founded</span>
                  <span className="font-semibold">{pitch.startup.foundedYear}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b">
                  <span className="text-sm text-muted-foreground">Team Size</span>
                  <span className="font-semibold">{pitch.startup.teamSize} people</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b">
                  <span className="text-sm text-muted-foreground">Location</span>
                  <span className="font-semibold">{pitch.startup.location}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Stage</span>
                  <span className="font-semibold">{pitch.startup.stage}</span>
                </div>
              </div>

              {(pitch.startup.website || pitch.startup.linkedin || pitch.startup.twitter) && (
                <div className="flex items-center space-x-2 mt-4 pt-4 border-t">
                  {pitch.startup.website && (
                    <a href={pitch.startup.website} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">
                        <Globe className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                  {pitch.startup.linkedin && (
                    <a href={pitch.startup.linkedin} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">
                        <Linkedin className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                  {pitch.startup.twitter && (
                    <a href={pitch.startup.twitter} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">
                        <Twitter className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Risk Warning */}
          <Alert className="border-orange-600 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Investment Risk:</strong> Investing in startups is high-risk. You may lose your entire investment. Only invest what you can afford to lose.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
