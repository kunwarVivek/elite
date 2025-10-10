import React, { useState } from 'react';
import { Smile, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Reaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

interface EmojiReactionsProps {
  reactions: Reaction[];
  onReact: (emoji: string) => void;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  variant?: 'default' | 'compact';
}

const COMMON_EMOJIS = [
  '👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🚀',
  '💯', '👏', '🤔', '😍', '🔥', '⭐', '🙏', '💪'
];

const REACTION_LABELS: Record<string, string> = {
  '👍': 'Like',
  '❤️': 'Love',
  '😂': 'Laugh',
  '😮': 'Surprised',
  '😢': 'Sad',
  '😡': 'Angry',
  '🎉': 'Celebrate',
  '🚀': 'Rocket',
  '💯': 'Perfect',
  '👏': 'Applause',
  '🤔': 'Thinking',
  '😍': 'Adore',
  '🔥': 'Fire',
  '⭐': 'Star',
  '🙏': 'Thanks',
  '💪': 'Strong'
};

export const EmojiReactions: React.FC<EmojiReactionsProps> = ({
  reactions,
  onReact,
  size = 'md',
  showLabel = false,
  variant = 'default',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-7 w-7 text-sm',
    lg: 'h-8 w-8 text-base'
  };

  const getButtonSize = () => {
    switch (size) {
      case 'sm': return 'sm';
      case 'lg': return 'lg';
      default: return 'sm';
    }
  };

  const handleReactionClick = (emoji: string) => {
    onReact(emoji);
    setIsOpen(false);
  };

  // Filter out reactions with count 0
  const visibleReactions = reactions.filter(reaction => reaction.count > 0);

  if (variant === 'compact' && visibleReactions.length === 0) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size={getButtonSize()} className="text-gray-400 hover:text-gray-600">
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="grid grid-cols-8 gap-2">
            {COMMON_EMOJIS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                className="h-8 w-8 p-0 hover:bg-gray-100"
                onClick={() => handleReactionClick(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="flex items-center space-x-1">
      {/* Existing Reactions */}
      {visibleReactions.map((reaction) => (
        <Button
          key={reaction.emoji}
          variant={reaction.userReacted ? 'default' : 'outline'}
          size={getButtonSize()}
          className={`px-2 ${sizeClasses[size]} ${
            reaction.userReacted
              ? 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'
              : 'hover:bg-gray-100'
          }`}
          onClick={() => handleReactionClick(reaction.emoji)}
        >
          <span className="mr-1">{reaction.emoji}</span>
          <span className={size === 'sm' ? 'text-xs' : ''}>{reaction.count}</span>
        </Button>
      ))}

      {/* Add Reaction Button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size={getButtonSize()}
            className={`text-gray-400 hover:text-gray-600 ${sizeClasses[size]}`}
          >
            {variant === 'compact' && visibleReactions.length > 0 ? (
              <Plus className="h-3 w-3" />
            ) : (
              <>
                <Smile className="h-3 w-3 mr-1" />
                {showLabel && <span className="text-xs">React</span>}
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="grid grid-cols-8 gap-2">
            {COMMON_EMOJIS.map((emoji) => {
              const existingReaction = reactions.find(r => r.emoji === emoji);
              const count = existingReaction?.count || 0;

              return (
                <Button
                  key={emoji}
                  variant={existingReaction?.userReacted ? 'default' : 'ghost'}
                  className={`h-8 w-8 p-0 relative ${
                    existingReaction?.userReacted
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => handleReactionClick(emoji)}
                  title={REACTION_LABELS[emoji] || emoji}
                >
                  {emoji}
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gray-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {count}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>

          {/* Quick Reactions for frequent emojis */}
          {visibleReactions.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-gray-500 mb-2">Quick reactions</p>
              <div className="flex flex-wrap gap-1">
                {visibleReactions.slice(0, 6).map((reaction) => (
                  <Button
                    key={reaction.emoji}
                    variant={reaction.userReacted ? 'default' : 'outline'}
                    size="sm"
                    className={`h-7 px-2 text-xs ${
                      reaction.userReacted
                        ? 'bg-blue-100 text-blue-700 border-blue-200'
                        : ''
                    }`}
                    onClick={() => handleReactionClick(reaction.emoji)}
                  >
                    {reaction.emoji} {reaction.count}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};