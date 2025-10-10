import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Heart, ThumbsUp, ThumbsDown, MoreVertical, Flag, Edit, Trash2, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CommentForm } from './comment-form';
import { EmojiReactions } from './emoji-reactions';

interface CommentReaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
    verified?: boolean;
  };
  createdAt: string;
  updatedAt?: string;
  parentId?: string;
  pitchId: string;
  reactions: CommentReaction[];
  replies?: Comment[];
  isEdited?: boolean;
  mentions: Array<{
    id: string;
    name: string;
    startIndex: number;
    endIndex: number;
  }>;
}

interface CommentThreadProps {
  comments: Comment[];
  pitchId: string;
  currentUserId: string;
  onAddComment: (content: string, parentId?: string) => void;
  onEditComment: (commentId: string, content: string) => void;
  onDeleteComment: (commentId: string) => void;
  onReactToComment: (commentId: string, emoji: string) => void;
  onReportComment: (commentId: string, reason: string) => void;
  isLoading?: boolean;
  maxDepth?: number;
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  comments,
  pitchId,
  currentUserId,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onReactToComment,
  onReportComment,
  isLoading = false,
  maxDepth = 3,
}) => {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [showAllReplies, setShowAllReplies] = useState<Set<string>>(new Set());

  // Group comments by parent
  const topLevelComments = comments.filter(comment => !comment.parentId);
  const repliesByParent = comments.reduce((acc, comment) => {
    if (comment.parentId) {
      if (!acc[comment.parentId]) {
        acc[comment.parentId] = [];
      }
      acc[comment.parentId].push(comment);
    }
    return acc;
  }, {} as Record<string, Comment[]>);

  const toggleShowReplies = (commentId: string) => {
    const newSet = new Set(showAllReplies);
    if (newSet.has(commentId)) {
      newSet.delete(commentId);
    } else {
      newSet.add(commentId);
    }
    setShowAllReplies(newSet);
  };

  const renderComment = (comment: Comment, depth: number = 0): React.ReactNode => {
    const isOwnComment = comment.author.id === currentUserId;
    const replies = repliesByParent[comment.id] || [];
    const hasReplies = replies.length > 0;
    const shouldShowAllReplies = showAllReplies.has(comment.id);
    const visibleReplies = shouldShowAllReplies ? replies : replies.slice(0, 2);
    const hiddenRepliesCount = replies.length - 2;

    return (
      <div key={comment.id} className={`${depth > 0 ? 'ml-4 pl-4 border-l border-gray-200' : ''}`}>
        <div className="group flex space-x-3 py-3">
          {/* Avatar */}
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={comment.author.avatar} />
            <AvatarFallback className="text-xs">
              {comment.author.name.charAt(0)}
            </AvatarFallback>
          </Avatar>

          {/* Comment Content */}
          <div className="flex-1 min-w-0">
            {/* Author and Meta */}
            <div className="flex items-center space-x-2 mb-2">
              <span className="font-medium text-sm">{comment.author.name}</span>
              {comment.author.verified && (
                <Badge variant="secondary" className="text-xs">Verified</Badge>
              )}
              {comment.author.role === 'ADMIN' && (
                <Badge variant="outline" className="text-xs">Admin</Badge>
              )}
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
              {comment.isEdited && (
                <span className="text-xs text-gray-400">(edited)</span>
              )}
            </div>

            {/* Comment Text */}
            {editingComment === comment.id ? (
              <CommentForm
                initialValue={comment.content}
                onSubmit={(content) => {
                  onEditComment(comment.id, content);
                  setEditingComment(null);
                }}
                onCancel={() => setEditingComment(null)}
                placeholder="Edit comment..."
                submitLabel="Save"
                isEditing
              />
            ) : (
              <div className="text-sm text-gray-900 whitespace-pre-wrap mb-3">
                {comment.content}
              </div>
            )}

            {/* Actions and Reactions */}
            {editingComment !== comment.id && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Reply Button */}
                  {depth < maxDepth && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
                      onClick={() => setReplyingTo(comment.id)}
                    >
                      <Reply className="h-3 w-3 mr-1" />
                      Reply
                    </Button>
                  )}

                  {/* Reactions */}
                  <EmojiReactions
                    reactions={comment.reactions}
                    onReact={(emoji) => onReactToComment(comment.id, emoji)}
                    size="sm"
                  />
                </div>

                {/* Comment Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0"
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isOwnComment ? (
                      <>
                        <DropdownMenuItem onClick={() => setEditingComment(comment.id)}>
                          <Edit className="h-3 w-3 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDeleteComment(comment.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-3 w-3 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <DropdownMenuItem onClick={() => onReportComment(comment.id, 'inappropriate')}>
                        <Flag className="h-3 w-3 mr-2" />
                        Report
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Reply Form */}
            {replyingTo === comment.id && (
              <div className="mt-3">
                <CommentForm
                  onSubmit={(content) => {
                    onAddComment(content, comment.id);
                    setReplyingTo(null);
                  }}
                  onCancel={() => setReplyingTo(null)}
                  placeholder={`Reply to ${comment.author.name}...`}
                  submitLabel="Reply"
                  autoFocus
                />
              </div>
            )}
          </div>
        </div>

        {/* Replies */}
        {hasReplies && (
          <div className="mt-2">
            {visibleReplies.map((reply) => renderComment(reply, depth + 1))}

            {hiddenRepliesCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800 ml-4"
                onClick={() => toggleShowReplies(comment.id)}
              >
                {shouldShowAllReplies
                  ? 'Show less'
                  : `Show ${hiddenRepliesCount} more ${hiddenRepliesCount === 1 ? 'reply' : 'replies'}`
                }
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Comment Form for top-level comments */}
      <CommentForm
        onSubmit={(content) => onAddComment(content)}
        placeholder="Share your thoughts on this pitch..."
        submitLabel="Comment"
        isLoading={isLoading}
      />

      {/* Comments List */}
      <div className="space-y-1">
        {topLevelComments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">No comments yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          topLevelComments.map((comment) => renderComment(comment))
        )}
      </div>
    </div>
  );
};