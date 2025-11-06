import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  Users,
  Search,
  MapPin,
  TrendingUp,
  DollarSign,
  Building2,
  RefreshCw,
  AlertCircle,
  UserPlus,
  Mail,
  Filter,
  ChevronLeft,
  ChevronRight,
  Network as NetworkIcon,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

/**
 * Network Discovery Page
 * Find and connect with other investors
 */

interface NetworkMember {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  createdAt: string;
  profile: {
    bio?: string;
    location?: string;
    investmentRangeMin?: number;
    investmentRangeMax?: number;
    preferredIndustries?: string[];
  } | null;
  investmentCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function NetworkPage() {
  const navigate = useNavigate();
  const [network, setNetwork] = useState<NetworkMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    fetchNetwork(pagination.page);
  }, [pagination.page]);

  const fetchNetwork = async (page: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `http://localhost:3001/api/social/network?page=${page}&limit=${pagination.limit}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch network');
      }

      const result = await response.json();
      setNetwork(result.data.network || []);
      setPagination(result.data.pagination);
    } catch (err: any) {
      console.error('Error fetching network:', err);
      setError(err.message || 'Failed to load network');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredNetwork = network.filter((member) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(query) ||
      member.profile?.location?.toLowerCase().includes(query) ||
      member.profile?.preferredIndustries?.some((ind) => ind.toLowerCase().includes(query))
    );
  });

  if (isLoading && network.length === 0) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading network...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <NetworkIcon className="h-10 w-10 text-blue-500" />
          <h1 className="text-4xl font-bold">Investor Network</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Discover and connect with fellow angel investors
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Total Investors</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pagination.total.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Active Investors</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {network.filter((m) => m.investmentCount > 0).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <span>New This Week</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {
                network.filter(
                  (m) =>
                    new Date(m.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                ).length
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, location, or industry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
        <Button variant="outline" onClick={() => fetchNetwork(pagination.page)}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Network Grid */}
      {filteredNetwork.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Investors Found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? 'No investors match your search. Try different keywords.'
                : 'The network is empty. Check back soon!'}
            </p>
            {searchQuery && (
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Clear Search
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {filteredNetwork.map((member) => (
              <Card
                key={member.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate({ to: `/social/profiles/${member.id}` })}
              >
                <CardHeader>
                  <div className="flex items-start space-x-4">
                    {/* Avatar */}
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={member.avatarUrl} alt={member.name} />
                      <AvatarFallback className="text-lg">
                        {member.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg truncate">{member.name}</h3>
                      <Badge variant="secondary" className="mt-1">
                        {member.role}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {/* Bio */}
                  {member.profile?.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {member.profile.bio}
                    </p>
                  )}

                  {/* Location */}
                  {member.profile?.location && (
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground mb-3">
                      <MapPin className="h-4 w-4" />
                      <span>{member.profile.location}</span>
                    </div>
                  )}

                  {/* Investment Range */}
                  {member.profile?.investmentRangeMin && member.profile?.investmentRangeMax && (
                    <div className="flex items-center space-x-1 text-sm mb-3">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-600">
                        {formatCurrency(member.profile.investmentRangeMin)} -{' '}
                        {formatCurrency(member.profile.investmentRangeMax)}
                      </span>
                    </div>
                  )}

                  {/* Investment Count */}
                  <div className="flex items-center space-x-1 text-sm mb-4">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-600">
                      {member.investmentCount} investment{member.investmentCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Preferred Industries */}
                  {member.profile?.preferredIndustries &&
                    member.profile.preferredIndustries.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground mb-2">Interests:</p>
                        <div className="flex flex-wrap gap-1">
                          {member.profile.preferredIndustries.slice(0, 3).map((industry) => (
                            <Badge key={industry} variant="outline" className="text-xs">
                              {industry}
                            </Badge>
                          ))}
                          {member.profile.preferredIndustries.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{member.profile.preferredIndustries.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate({ to: `/social/profiles/${member.id}` });
                      }}
                    >
                      View Profile
                    </Button>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Implement messaging
                      }}
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Implement connections
                      }}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} investors
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() => handlePageChange(pagination.page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.page <= 3) {
                          pageNum = i + 1;
                        } else if (pagination.page >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = pagination.page - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={pagination.page === pageNum ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === pagination.totalPages}
                      onClick={() => handlePageChange(pagination.page + 1)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* CTA Section */}
      <Card className="mt-8 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="py-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-2">Build Your Network</h3>
              <p className="text-muted-foreground">
                Connect with investors to share insights and co-invest in opportunities
              </p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => navigate({ to: '/social/profile/edit' })}>
                Edit Profile
              </Button>
              <Button onClick={() => navigate({ to: '/investments/marketplace' })}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Explore Deals
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
