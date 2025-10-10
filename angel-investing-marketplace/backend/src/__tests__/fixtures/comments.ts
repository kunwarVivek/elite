import { Comment } from '@prisma/client';

export function createMockComment(overrides?: Partial<Comment>): Comment {
  const defaultComment: Comment = {
    id: overrides?.id || `comment-${Math.random().toString(36).substr(2, 9)}`,
    pitchId: overrides?.pitchId || 'pitch-id',
    userId: overrides?.userId || 'user-id',
    content: overrides?.content || 'This is a test comment',
    isApproved: overrides?.isApproved ?? true,
    createdAt: overrides?.createdAt || new Date(),
    updatedAt: overrides?.updatedAt || new Date(),
  };

  return {
    ...defaultComment,
    ...overrides,
  };
}
