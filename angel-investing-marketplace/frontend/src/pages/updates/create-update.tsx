import React, { useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  PlusCircle,
  Save,
  Send,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  X,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';

/**
 * Create Update Page
 * Create company updates for investors
 */

const updateSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title must be less than 200 characters'),
  excerpt: z.string().min(20, 'Excerpt must be at least 20 characters').max(300, 'Excerpt must be less than 300 characters'),
  content: z.string().min(50, 'Content must be at least 50 characters'),
  updateType: z.enum(['MILESTONE', 'FINANCIAL', 'PRODUCT', 'TEAM', 'FUNDRAISING', 'MARKET', 'GENERAL']),
});

type UpdateFormData = z.infer<typeof updateSchema>;

const UPDATE_TYPES = [
  { value: 'MILESTONE', label: 'Milestone', description: 'Company achievements and milestones' },
  { value: 'FINANCIAL', label: 'Financial', description: 'Revenue, profitability, funding' },
  { value: 'PRODUCT', label: 'Product', description: 'Product launches and updates' },
  { value: 'TEAM', label: 'Team', description: 'Team growth and key hires' },
  { value: 'FUNDRAISING', label: 'Fundraising', description: 'Funding rounds and capital raises' },
  { value: 'MARKET', label: 'Market', description: 'Market expansion and trends' },
  { value: 'GENERAL', label: 'General', description: 'General company updates' },
];

export function CreateUpdatePage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [publishMode, setPublishMode] = useState<'draft' | 'publish'>('draft');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateFormData>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      updateType: 'GENERAL',
    },
  });

  const updateType = watch('updateType');

  const onSubmit = async (data: UpdateFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Get startup ID from token or user context
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId || payload.id;

      // Create the update
      const response = await fetch('http://localhost:3001/api/company-updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          tags,
          authorId: userId,
          // Note: startupId should come from the authenticated user's startup
          // This is a simplified version - in production, get startupId from user context
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create update');
      }

      const result = await response.json();
      const updateId = result.data.update.id;

      // Publish if requested
      if (publishMode === 'publish') {
        const publishResponse = await fetch(`http://localhost:3001/api/company-updates/${updateId}/publish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!publishResponse.ok) {
          throw new Error('Update created but failed to publish');
        }
      }

      setSuccess(true);
      setTimeout(() => {
        navigate({ to: '/updates/manage' });
      }, 1500);
    } catch (err: any) {
      console.error('Error creating update:', err);
      setError(err.message || 'Failed to create update');
    } finally {
      setIsLoading(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate({ to: '/updates/manage' })}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Updates
        </Button>
        <div className="flex items-center space-x-3 mb-2">
          <PlusCircle className="h-10 w-10 text-blue-500" />
          <h1 className="text-4xl font-bold">Create Update</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Share important news and updates with your investors
        </p>
      </div>

      {/* Success Alert */}
      {success && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Update {publishMode === 'publish' ? 'published' : 'saved as draft'} successfully! Redirecting...
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
            <CardTitle>Update Details</CardTitle>
            <CardDescription>Provide the key information about this update</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Update Type */}
            <div>
              <Label htmlFor="updateType">Update Type *</Label>
              <Select
                value={updateType}
                onValueChange={(value) => setValue('updateType', value as any)}
              >
                <SelectTrigger className={errors.updateType ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select update type" />
                </SelectTrigger>
                <SelectContent>
                  {UPDATE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.updateType && (
                <p className="text-sm text-red-500 mt-1">{errors.updateType.message}</p>
              )}
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., We just closed our Series A!"
                {...register('title')}
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
              )}
            </div>

            {/* Excerpt */}
            <div>
              <Label htmlFor="excerpt">Excerpt *</Label>
              <Textarea
                id="excerpt"
                placeholder="Brief summary that will appear in feeds..."
                rows={3}
                {...register('excerpt')}
                className={errors.excerpt ? 'border-red-500' : ''}
              />
              {errors.excerpt && (
                <p className="text-sm text-red-500 mt-1">{errors.excerpt.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">20-300 characters</p>
            </div>

            {/* Content */}
            <div>
              <Label htmlFor="content">Full Content *</Label>
              <Textarea
                id="content"
                placeholder="Write your full update here. Share the details with your investors..."
                rows={10}
                {...register('content')}
                className={errors.content ? 'border-red-500' : ''}
              />
              {errors.content && (
                <p className="text-sm text-red-500 mt-1">{errors.content.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">Minimum 50 characters</p>
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
            <CardDescription>Add tags to help investors discover your update</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="pr-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Add Tag */}
            <div className="flex space-x-2">
              <Input
                placeholder="Add tag (e.g., growth, hiring, revenue)"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button type="button" onClick={addTag}>
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: '/updates/manage' })}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="outline"
            disabled={isLoading}
            onClick={() => setPublishMode('draft')}
          >
            {isLoading && publishMode === 'draft' ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save as Draft
              </>
            )}
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            onClick={() => setPublishMode('publish')}
          >
            {isLoading && publishMode === 'publish' ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Publish Now
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
