import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  User,
  MapPin,
  DollarSign,
  Linkedin,
  Twitter,
  Globe,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Plus,
  X,
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';

/**
 * Profile Edit Page
 * Edit your investor profile
 */

const profileSchema = z.object({
  bio: z.string().max(500, 'Bio must be 500 characters or less').optional(),
  location: z.string().max(100, 'Location must be 100 characters or less').optional(),
  linkedinUrl: z.string().url('Invalid LinkedIn URL').optional().or(z.literal('')),
  twitterUrl: z.string().url('Invalid Twitter URL').optional().or(z.literal('')),
  websiteUrl: z.string().url('Invalid website URL').optional().or(z.literal('')),
  investmentRangeMin: z.number().min(0, 'Minimum investment must be positive').optional(),
  investmentRangeMax: z.number().min(0, 'Maximum investment must be positive').optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileEditPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [preferredIndustries, setPreferredIndustries] = useState<string[]>([]);
  const [newIndustry, setNewIndustry] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsFetching(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        navigate({ to: '/auth/login' });
        return;
      }

      // Get user ID from token
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId || payload.id;

      const response = await fetch(`http://localhost:3001/api/social/profiles/${userId}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const result = await response.json();
      const { profile } = result.data;

      // Pre-fill form with existing data
      if (profile) {
        setValue('bio', profile.bio || '');
        setValue('location', profile.location || '');
        setValue('linkedinUrl', profile.linkedinUrl || '');
        setValue('twitterUrl', profile.twitterUrl || '');
        setValue('websiteUrl', profile.websiteUrl || '');
        setValue('investmentRangeMin', profile.investmentRangeMin || undefined);
        setValue('investmentRangeMax', profile.investmentRangeMax || undefined);
        setPreferredIndustries(profile.preferredIndustries || []);
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile');
    } finally {
      setIsFetching(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('http://localhost:3001/api/social/profiles/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          preferredIndustries,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      setSuccess(true);
      setTimeout(() => {
        // Get user ID from token to redirect to profile
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.userId || payload.id;
        navigate({ to: `/social/profiles/${userId}` });
      }, 1500);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const addIndustry = () => {
    if (newIndustry.trim() && !preferredIndustries.includes(newIndustry.trim())) {
      setPreferredIndustries([...preferredIndustries, newIndustry.trim()]);
      setNewIndustry('');
    }
  };

  const removeIndustry = (industry: string) => {
    setPreferredIndustries(preferredIndustries.filter((i) => i !== industry));
  };

  if (isFetching) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate({ to: '/social/profile/me' })}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Profile
        </Button>
        <h1 className="text-4xl font-bold mb-2">Edit Profile</h1>
        <p className="text-lg text-muted-foreground">
          Update your investor profile and preferences
        </p>
      </div>

      {/* Success Alert */}
      {success && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Profile updated successfully! Redirecting...
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Basic Information</span>
            </CardTitle>
            <CardDescription>Tell others about yourself</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about your investment focus and experience..."
                rows={4}
                {...register('bio')}
                className={errors.bio ? 'border-red-500' : ''}
              />
              {errors.bio && (
                <p className="text-sm text-red-500 mt-1">{errors.bio.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">Max 500 characters</p>
            </div>

            <div>
              <Label htmlFor="location" className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>Location</span>
              </Label>
              <Input
                id="location"
                placeholder="San Francisco, CA"
                {...register('location')}
                className={errors.location ? 'border-red-500' : ''}
              />
              {errors.location && (
                <p className="text-sm text-red-500 mt-1">{errors.location.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Investment Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Investment Range</span>
            </CardTitle>
            <CardDescription>Your typical investment size per deal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="investmentRangeMin">Minimum Investment</Label>
                <Input
                  id="investmentRangeMin"
                  type="number"
                  placeholder="25000"
                  {...register('investmentRangeMin', { valueAsNumber: true })}
                  className={errors.investmentRangeMin ? 'border-red-500' : ''}
                />
                {errors.investmentRangeMin && (
                  <p className="text-sm text-red-500 mt-1">{errors.investmentRangeMin.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="investmentRangeMax">Maximum Investment</Label>
                <Input
                  id="investmentRangeMax"
                  type="number"
                  placeholder="100000"
                  {...register('investmentRangeMax', { valueAsNumber: true })}
                  className={errors.investmentRangeMax ? 'border-red-500' : ''}
                />
                {errors.investmentRangeMax && (
                  <p className="text-sm text-red-500 mt-1">{errors.investmentRangeMax.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferred Industries */}
        <Card>
          <CardHeader>
            <CardTitle>Preferred Industries</CardTitle>
            <CardDescription>Industries you're most interested in investing in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Industries */}
            {preferredIndustries.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {preferredIndustries.map((industry) => (
                  <Badge key={industry} variant="secondary" className="pr-1">
                    {industry}
                    <button
                      type="button"
                      onClick={() => removeIndustry(industry)}
                      className="ml-2 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Add New Industry */}
            <div className="flex space-x-2">
              <Input
                placeholder="Add industry (e.g., SaaS, FinTech, AI)"
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addIndustry();
                  }
                }}
              />
              <Button type="button" onClick={addIndustry}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card>
          <CardHeader>
            <CardTitle>Social Links</CardTitle>
            <CardDescription>Connect your social profiles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="linkedinUrl" className="flex items-center space-x-2">
                <Linkedin className="h-4 w-4" />
                <span>LinkedIn URL</span>
              </Label>
              <Input
                id="linkedinUrl"
                type="url"
                placeholder="https://linkedin.com/in/yourprofile"
                {...register('linkedinUrl')}
                className={errors.linkedinUrl ? 'border-red-500' : ''}
              />
              {errors.linkedinUrl && (
                <p className="text-sm text-red-500 mt-1">{errors.linkedinUrl.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="twitterUrl" className="flex items-center space-x-2">
                <Twitter className="h-4 w-4" />
                <span>Twitter/X URL</span>
              </Label>
              <Input
                id="twitterUrl"
                type="url"
                placeholder="https://twitter.com/yourhandle"
                {...register('twitterUrl')}
                className={errors.twitterUrl ? 'border-red-500' : ''}
              />
              {errors.twitterUrl && (
                <p className="text-sm text-red-500 mt-1">{errors.twitterUrl.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="websiteUrl" className="flex items-center space-x-2">
                <Globe className="h-4 w-4" />
                <span>Website URL</span>
              </Label>
              <Input
                id="websiteUrl"
                type="url"
                placeholder="https://yourwebsite.com"
                {...register('websiteUrl')}
                className={errors.websiteUrl ? 'border-red-500' : ''}
              />
              {errors.websiteUrl && (
                <p className="text-sm text-red-500 mt-1">{errors.websiteUrl.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: '/social/profile/me' })}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Profile
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
