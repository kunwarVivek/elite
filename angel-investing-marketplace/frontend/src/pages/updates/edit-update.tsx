import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
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
  Save,
  Send,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  X,
  PlusCircle,
  Edit,
  Trash2,
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';

/**
 * Edit Update Page
 * Edit existing company updates
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

export function EditUpdatePage() {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const updateId = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [updateStatus, setUpdateStatus] = useState<string>('DRAFT');
  const [actionMode, setActionMode] = useState<'save' | 'publish'>('save');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateFormData>({
    resolver: zodResolver(updateSchema),
  });

  const updateType = watch('updateType');

  useEffect(() => {
    if (updateId) {
      fetchUpdate();
    }
  }, [updateId]);

  const fetchUpdate = async () => {
    setIsFetching(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/company-updates/${updateId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch update');
      }

      const result = await response.json();
      const update = result.data.update;

      // Pre-fill form
      setValue('title', update.title);
      setValue('excerpt', update.excerpt);
      setValue('content', update.content);
      setValue('updateType', update.updateType);
      setTags(update.tags || []);
      setUpdateStatus(update.status);
    } catch (err: any) {
      console.error('Error fetching update:', err);
      setError(err.message || 'Failed to load update');
    } finally {
      setIsFetching(false);
    }
  };

  const onSubmit = async (data: UpdateFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Update the update
      const response = await fetch(`http://localhost:3001/api/company-updates/${updateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          tags,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      // Publish if requested and currently a draft
      if (actionMode === 'publish' && updateStatus === 'DRAFT') {
        const publishResponse = await fetch(`http://localhost:3001/api/company-updates/${updateId}/publish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!publishResponse.ok) {
          throw new Error('Update saved but failed to publish');
        }
      }

      setSuccess(true);
      setTimeout(() => {
        navigate({ to: '/updates/manage' });
      }, 1500);
    } catch (err: any) {
      console.error('Error updating:', err);
      setError(err.message || 'Failed to update');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this update? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`http://localhost:3001/api/company-updates/${updateId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete update');
      }

      navigate({ to: '/updates/manage' });
    } catch (err: any) {
      console.error('Error deleting update:', err);
      setError(err.message || 'Failed to delete update');
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

  if (isFetching) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading update...</span>
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
          onClick={() => navigate({ to: '/updates/manage' })}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Updates
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Edit className="h-10 w-10 text-blue-500" />
              <h1 className="text-4xl font-bold">Edit Update</h1>
            </div>
            <p className="text-lg text-muted-foreground">
              Make changes to your update
            </p>
          </div>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Success Alert */}
      {success && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Update saved successfully! Redirecting...
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

      {/* Status Badge */}
      <div className="mb-6">
        <Badge variant={updateStatus === 'PUBLISHED' ? 'default' : 'secondary'}>
          Status: {updateStatus}
        </Badge>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Update Details</CardTitle>
            <CardDescription>Edit the key information about this update</CardDescription>
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
                placeholder="Write your full update here..."
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
            onClick={() => setActionMode('save')}
          >
            {isLoading && actionMode === 'save' ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
          {updateStatus === 'DRAFT' && (
            <Button
              type="submit"
              disabled={isLoading}
              onClick={() => setActionMode('publish')}
            >
              {isLoading && actionMode === 'publish' ? (
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
          )}
        </div>
      </form>
    </div>
  );
}
