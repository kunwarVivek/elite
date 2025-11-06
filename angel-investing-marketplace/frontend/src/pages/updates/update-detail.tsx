import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Textarea } from '../../components/ui/textarea';
import {
  ArrowLeft,
  Building2,
  Calendar,
  TrendingUp,
  Award,
  Users,
  Package,
  DollarSign,
  AlertCircle,
  RefreshCw,
  Heart,
  MessageSquare,
  ThumbsUp,
  Eye,
  Share2,
  Sparkles,
  Target,
  HelpCircle,
  Send,
  CornerDownRight,
  ExternalLink,
  Tag,
} from 'lucide-react';
import { cn, formatDate, formatTimeAgo } from '@/lib/utils';

/**
 * Company Update Details
 * View full update with reactions and comments
 * Engage with company updates
 */

interface CompanyUpdate {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  updateType: 'MILESTONE' | 'FINANCIAL' | 'PRODUCT' | 'TEAM' | 'FUNDRAISING' | 'OTHER';
  category: string;
  publishedAt: string;
  company: {
    id: string;
    name: string;
    logo?: string;
    industry: string;
    website?: string;
    description: string;
  };
  author: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
  };
  engagement: {
    views: number;
    reactions: {
      like: number;
      celebrate: number;
      support: number;
      insightful: number;
      curious: number;
    };
    comments: number;
  };
  userReaction?: 'like' | 'celebrate' | 'support' | 'insightful' | 'curious' | null;
  tags: string[];
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
  };
  replies: Reply[];
}

interface Reply {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
  };
}

interface RelatedUpdate {
  id: string;
  title: string;
  updateType: string;
  publishedAt: string;
  company: {
    name: string;
  };
}

const UPDATE_TYPE_CONFIG = {
  MILESTONE: { icon: Award, color: 'text-green-600', bg: 'bg-green-50', label: 'Milestone' },
  FINANCIAL: { icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Financial' },
  PRODUCT: { icon: Package, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Product' },
  TEAM: { icon: Users, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Team' },
  FUNDRAISING: { icon: TrendingUp, color: 'text-pink-600', bg: 'bg-pink-50', label: 'Fundraising' },
  OTHER: { icon: Building2, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Other' },
};

const REACTION_CONFIG = {
  like: { icon: ThumbsUp, label: 'Like', color: 'text-blue-600' },
  celebrate: { icon: Sparkles, label: 'Celebrate', color: 'text-yellow-600' },
  support: { icon: Heart, label: 'Support', color: 'text-red-600' },
  insightful: { icon: Target, label: 'Insightful', color: 'text-purple-600' },
  curious: { icon: HelpCircle, label: 'Curious', color: 'text-green-600' },
};

export function UpdateDetailPage() {
  const navigate = useNavigate();
  const { updateId } = useParams({ strict: false });
  const [update, setUpdate] = useState<CompanyUpdate | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [relatedUpdates, setRelatedUpdates] = useState<RelatedUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (updateId) {
      fetchUpdateDetails();
      fetchComments();
      fetchRelatedUpdates();
    }
  }, [updateId]);

  const fetchUpdateDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/updates/${updateId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch update details');
      }

      const result = await response.json();
      setUpdate(result.data.update);
    } catch (err: any) {
      console.error('Error fetching update:', err);
      setError(err.message || 'Failed to load update');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/updates/${updateId}/comments`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.ok) {
        const result = await response.json();
        setComments(result.data.comments || []);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const fetchRelatedUpdates = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/updates/${updateId}/related`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.ok) {
        const result = await response.json();
        setRelatedUpdates(result.data.updates || []);
      }
    } catch (err) {
      console.error('Error fetching related updates:', err);
    }
  };

  const handleReaction = async (reactionType: string) => {
    if (!update) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/updates/${updateId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          reactionType: update.userReaction === reactionType ? null : reactionType,
        }),
      });

      if (response.ok) {
        await fetchUpdateDetails();
      }
    } catch (err) {
      console.error('Error adding reaction:', err);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/updates/${updateId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ content: newComment }),
      });

      if (response.ok) {
        setNewComment('');
        await fetchComments();
      }
    } catch (err) {
      console.error('Error submitting comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReply = async (commentId: string) => {
    if (!replyContent.trim()) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `http://localhost:3001/api/updates/${updateId}/comments/${commentId}/reply`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({ content: replyContent }),
        }
      );

      if (response.ok) {
        setReplyContent('');
        setReplyingTo(null);
        await fetchComments();
      }
    } catch (err) {
      console.error('Error submitting reply:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share && update) {
      try {
        await navigator.share({
          title: update.title,
          text: update.excerpt,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled or failed:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading update...</span>
        </div>
      </div>
    );
  }

  if (error || !update) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Update not found'}</AlertDescription>
        </Alert>
        <Button onClick={() => navigate({ to: '/updates' })} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Updates
        </Button>
      </div>
    );
  }

  const typeConfig = UPDATE_TYPE_CONFIG[update.updateType];
  const TypeIcon = typeConfig.icon;
  const totalReactions = Object.values(update.engagement.reactions).reduce((a, b) => a + b, 0);

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate({ to: '/updates' })}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Updates
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Update Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start space-x-4 mb-4">
                <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  {update.company.logo ? (
                    <img
                      src={update.company.logo}
                      alt={update.company.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Building2 className="h-8 w-8 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h1 className="text-3xl font-bold">{update.title}</h1>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <span className="font-semibold">{update.company.name}</span>
                    <span>•</span>
                    <span>{update.company.industry}</span>
                    <span>•</span>
                    <span>{formatDate(update.publishedAt)}</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <span
                      className={cn(
                        'px-2 py-1 rounded text-xs font-semibold',
                        typeConfig.bg,
                        typeConfig.color
                      )}
                    >
                      <TypeIcon className="h-3 w-3 inline mr-1" />
                      {typeConfig.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Author Info */}
              <div className="flex items-center space-x-3 py-4 border-t border-b">
                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                  {update.author.avatar ? (
                    <img
                      src={update.author.avatar}
                      alt={update.author.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-white font-semibold text-sm">
                      {update.author.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm">{update.author.name}</p>
                  <p className="text-xs text-muted-foreground">{update.author.role}</p>
                </div>
              </div>

              {/* Engagement Stats */}
              <div className="flex items-center space-x-6 py-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Eye className="h-4 w-4" />
                  <span>{update.engagement.views} views</span>
                </div>
                <div className="flex items-center space-x-1">
                  <ThumbsUp className="h-4 w-4" />
                  <span>{totalReactions} reactions</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>{update.engagement.comments} comments</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Update Content */}
          <Card>
            <CardContent className="pt-6">
              <div className="prose max-w-none">
                <p className="text-lg text-muted-foreground mb-4">{update.excerpt}</p>
                <div className="whitespace-pre-wrap leading-relaxed">{update.content}</div>
              </div>

              {/* Tags */}
              {update.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  {update.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reactions */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">React to this update</h3>
              <div className="flex items-center space-x-3">
                {Object.entries(REACTION_CONFIG).map(([type, config]) => {
                  const Icon = config.icon;
                  const count = update.engagement.reactions[type as keyof typeof update.engagement.reactions];
                  const isActive = update.userReaction === type;

                  return (
                    <Button
                      key={type}
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleReaction(type)}
                      className={cn(
                        'flex items-center space-x-1',
                        isActive && config.color
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-xs">{config.label}</span>
                      {count > 0 && <span className="text-xs">({count})</span>}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Comments Section */}
          <Card>
            <CardHeader>
              <CardTitle>Comments ({comments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {/* New Comment */}
              <div className="mb-6">
                <Textarea
                  placeholder="Share your thoughts..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="mb-2"
                  rows={3}
                />
                <Button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting}
                  size="sm"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Post Comment
                </Button>
              </div>

              {/* Comments List */}
              <div className="space-y-6">
                {comments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No comments yet. Be the first to share your thoughts!
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="space-y-3">
                      {/* Comment */}
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                          {comment.author.avatar ? (
                            <img
                              src={comment.author.avatar}
                              alt={comment.author.name}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <span className="text-white font-semibold text-xs">
                              {comment.author.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-semibold text-sm">
                                {comment.author.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {comment.author.role}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                • {formatTimeAgo(comment.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm">{comment.content}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReplyingTo(comment.id)}
                            className="mt-1"
                          >
                            <CornerDownRight className="h-3 w-3 mr-1" />
                            Reply
                          </Button>
                        </div>
                      </div>

                      {/* Reply Form */}
                      {replyingTo === comment.id && (
                        <div className="ml-11 space-y-2">
                          <Textarea
                            placeholder="Write a reply..."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            rows={2}
                          />
                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={() => handleSubmitReply(comment.id)}
                              disabled={!replyContent.trim() || isSubmitting}
                              size="sm"
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Reply
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyContent('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Replies */}
                      {comment.replies.length > 0 && (
                        <div className="ml-11 space-y-3">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex items-start space-x-3">
                              <div className="w-7 h-7 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                                {reply.author.avatar ? (
                                  <img
                                    src={reply.author.avatar}
                                    alt={reply.author.name}
                                    className="w-full h-full object-cover rounded-full"
                                  />
                                ) : (
                                  <span className="text-white font-semibold text-xs">
                                    {reply.author.name.charAt(0)}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="font-semibold text-sm">
                                      {reply.author.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {reply.author.role}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      • {formatTimeAgo(reply.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-sm">{reply.content}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle>About {update.company.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto">
                  {update.company.logo ? (
                    <img
                      src={update.company.logo}
                      alt={update.company.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Building2 className="h-10 w-10 text-white" />
                  )}
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-lg">{update.company.name}</h3>
                  <p className="text-sm text-muted-foreground">{update.company.industry}</p>
                </div>
                <p className="text-sm text-center">{update.company.description}</p>
                {update.company.website && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(update.company.website, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visit Website
                  </Button>
                )}
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => navigate({ to: `/companies/${update.company.id}` })}
                >
                  View Company Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Share */}
          <Card>
            <CardHeader>
              <CardTitle>Share Update</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share this update
              </Button>
            </CardContent>
          </Card>

          {/* Related Updates */}
          {relatedUpdates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Related Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {relatedUpdates.map((related) => (
                    <div
                      key={related.id}
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate({ to: `/updates/${related.id}` })}
                    >
                      <h4 className="font-semibold text-sm mb-1 line-clamp-2">
                        {related.title}
                      </h4>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <span>{related.company.name}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(related.publishedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
