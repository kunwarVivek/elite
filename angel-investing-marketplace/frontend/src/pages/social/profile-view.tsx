import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  User,
  MapPin,
  Calendar,
  Briefcase,
  DollarSign,
  TrendingUp,
  Users,
  Building2,
  ExternalLink,
  Linkedin,
  Twitter,
  Globe,
  Mail,
  RefreshCw,
  AlertCircle,
  Award,
  Target,
  Activity,
  Edit,
} from 'lucide-react';
import { cn, formatCurrency, formatTimeAgo } from '@/lib/utils';

/**
 * Profile View Page
 * View investor profiles with stats, syndicates, and recent investments
 */

interface UserProfile {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string;
    createdAt: string;
  };
  profile: {
    bio?: string;
    location?: string;
    linkedinUrl?: string;
    twitterUrl?: string;
    websiteUrl?: string;
    investmentRangeMin?: number;
    investmentRangeMax?: number;
    preferredIndustries?: string[];
  } | null;
  stats: {
    totalInvestments: number;
    totalInvested: number;
    industries: string[];
    stages: string[];
  };
  syndicatesLed: Array<{
    id: string;
    name: string;
    status: string;
    investorCount: number;
    currentAmount: number;
  }>;
  recentInvestments: Array<{
    id: string;
    amount: number;
    status: string;
    createdAt: string;
    pitch: {
      startup: {
        id: string;
        name: string;
        industry: string;
        stage: string;
        logoUrl?: string;
      };
    };
  }>;
}

export function ProfileViewPage() {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const userId = params.userId as string;

  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get current user ID from token or storage
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.userId || payload.id);
      } catch (err) {
        console.error('Error parsing token:', err);
      }
    }

    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/social/profiles/${userId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const result = await response.json();
      setProfileData(result.data);
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const isOwnProfile = currentUserId === userId;

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Profile not found'}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => navigate({ to: '/social/network' })}>
            <Users className="h-4 w-4 mr-2" />
            Browse Network
          </Button>
        </div>
      </div>
    );
  }

  const { user, profile, stats, syndicatesLed, recentInvestments } = profileData;

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {/* Profile Header */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-6">
              {/* Avatar */}
              <Avatar className="h-24 w-24">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback className="text-2xl">
                  {user.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* User Info */}
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold">{user.name}</h1>
                  <Badge variant="secondary">{user.role}</Badge>
                </div>

                {profile?.bio && (
                  <p className="text-muted-foreground mb-4 max-w-2xl">{profile.bio}</p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {profile?.location && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
                  {profile?.investmentRangeMin && profile?.investmentRangeMax && (
                    <div className="flex items-center space-x-1">
                      <DollarSign className="h-4 w-4" />
                      <span>
                        {formatCurrency(profile.investmentRangeMin)} -{' '}
                        {formatCurrency(profile.investmentRangeMax)} per deal
                      </span>
                    </div>
                  )}
                </div>

                {/* Social Links */}
                {(profile?.linkedinUrl || profile?.twitterUrl || profile?.websiteUrl) && (
                  <div className="flex items-center space-x-3 mt-4">
                    {profile?.linkedinUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(profile.linkedinUrl, '_blank')}
                      >
                        <Linkedin className="h-4 w-4 mr-2" />
                        LinkedIn
                      </Button>
                    )}
                    {profile?.twitterUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(profile.twitterUrl, '_blank')}
                      >
                        <Twitter className="h-4 w-4 mr-2" />
                        Twitter
                      </Button>
                    )}
                    {profile?.websiteUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(profile.websiteUrl, '_blank')}
                      >
                        <Globe className="h-4 w-4 mr-2" />
                        Website
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              {isOwnProfile ? (
                <Button onClick={() => navigate({ to: '/social/profile/edit' })}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button variant="outline">
                    <Mail className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                  <Button>
                    <Users className="h-4 w-4 mr-2" />
                    Connect
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Total Investments</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalInvestments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Total Invested</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(stats.totalInvested)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center space-x-2">
              <Briefcase className="h-4 w-4" />
              <span>Industries</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.industries.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Syndicates Led</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{syndicatesLed.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="investments" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="investments">
            <TrendingUp className="h-4 w-4 mr-2" />
            Investments
          </TabsTrigger>
          <TabsTrigger value="syndicates">
            <Users className="h-4 w-4 mr-2" />
            Syndicates
          </TabsTrigger>
          <TabsTrigger value="interests">
            <Target className="h-4 w-4 mr-2" />
            Interests
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="h-4 w-4 mr-2" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Investments Tab */}
        <TabsContent value="investments">
          <Card>
            <CardHeader>
              <CardTitle>Recent Investments</CardTitle>
              <CardDescription>Latest {recentInvestments.length} investments</CardDescription>
            </CardHeader>
            <CardContent>
              {recentInvestments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No investments yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentInvestments.map((investment) => (
                    <div
                      key={investment.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => navigate({ to: `/pitches/${investment.pitch.startup.id}` })}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          {investment.pitch.startup.logoUrl ? (
                            <img
                              src={investment.pitch.startup.logoUrl}
                              alt={investment.pitch.startup.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Building2 className="h-6 w-6 text-white" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold">{investment.pitch.startup.name}</h4>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <span>{investment.pitch.startup.industry}</span>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs">
                              {investment.pitch.startup.stage}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{formatCurrency(Number(investment.amount))}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatTimeAgo(investment.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Syndicates Tab */}
        <TabsContent value="syndicates">
          <Card>
            <CardHeader>
              <CardTitle>Syndicates Led</CardTitle>
              <CardDescription>Investment groups managed by this investor</CardDescription>
            </CardHeader>
            <CardContent>
              {syndicatesLed.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No syndicates led yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {syndicatesLed.map((syndicate) => (
                    <div
                      key={syndicate.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => navigate({ to: `/syndicates/${syndicate.id}` })}
                    >
                      <div>
                        <h4 className="font-semibold mb-1">{syndicate.name}</h4>
                        <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>{syndicate.investorCount} investors</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-4 w-4" />
                            <span>{formatCurrency(Number(syndicate.currentAmount))}</span>
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={syndicate.status === 'ACTIVE' ? 'default' : 'secondary'}
                      >
                        {syndicate.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interests Tab */}
        <TabsContent value="interests">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Preferred Industries</CardTitle>
                <CardDescription>Sectors of interest</CardDescription>
              </CardHeader>
              <CardContent>
                {profile?.preferredIndustries && profile.preferredIndustries.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.preferredIndustries.map((industry) => (
                      <Badge key={industry} variant="secondary">
                        {industry}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No preferred industries specified</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Investment Stages</CardTitle>
                <CardDescription>Past investment stages</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.stages.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {stats.stages.map((stage) => (
                      <Badge key={stage} variant="outline">
                        {stage}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No investment stages yet</p>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Portfolio Diversification</CardTitle>
                <CardDescription>Industries invested in</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.industries.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {stats.industries.map((industry) => (
                      <Badge key={industry} variant="secondary">
                        {industry}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No portfolio diversification yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest actions and engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Activity feed coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
