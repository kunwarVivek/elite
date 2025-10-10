import React, { useState, useRef, useEffect } from 'react';
import { Send, X, AtSign, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MentionSuggestion {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
}

interface CommentFormProps {
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  initialValue?: string;
  placeholder?: string;
  submitLabel?: string;
  autoFocus?: boolean;
  isLoading?: boolean;
  isEditing?: boolean;
  showAvatar?: boolean;
  compact?: boolean;
}

export const CommentForm: React.FC<CommentFormProps> = ({
  onSubmit,
  onCancel,
  initialValue = '',
  placeholder = 'Write a comment...',
  submitLabel = 'Post',
  autoFocus = false,
  isLoading = false,
  isEditing = false,
  showAvatar = true,
  compact = false,
}) => {
  const [content, setContent] = useState(initialValue);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Mock mention suggestions - in real app, this would come from API
  const mockMentionSuggestions: MentionSuggestion[] = [
    { id: '1', name: 'John Smith', email: 'john@example.com', role: 'INVESTOR' },
    { id: '2', name: 'Sarah Johnson', email: 'sarah@example.com', role: 'FOUNDER' },
    { id: '3', name: 'Mike Chen', email: 'mike@example.com', role: 'INVESTOR' },
  ];

  const handleContentChange = (value: string) => {
    setContent(value);

    // Check for mention trigger
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase();
      setMentionQuery(query);
      setShowMentionSuggestions(true);

      const filtered = mockMentionSuggestions.filter(user =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
      setMentionSuggestions(filtered);
      setSelectedMentionIndex(-1);
    } else {
      setShowMentionSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentionSuggestions && mentionSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev =>
          prev < mentionSuggestions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev =>
          prev > 0 ? prev - 1 : mentionSuggestions.length - 1
        );
      } else if (e.key === 'Enter' && selectedMentionIndex >= 0) {
        e.preventDefault();
        insertMention(mentionSuggestions[selectedMentionIndex]);
      } else if (e.key === 'Escape') {
        setShowMentionSuggestions(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const insertMention = (user: MentionSuggestion) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = content.slice(0, cursorPosition);
    const textAfterCursor = content.slice(cursorPosition);

    // Find the @ and query text to replace
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      const mentionStart = cursorPosition - mentionMatch[0].length;
      const newContent = content.slice(0, mentionStart) + `@${user.name} ` + textAfterCursor;
      setContent(newContent);
      setShowMentionSuggestions(false);

      // Set cursor position after the inserted mention
      setTimeout(() => {
        textarea.setSelectionRange(mentionStart + user.name.length + 2, mentionStart + user.name.length + 2);
        textarea.focus();
      }, 0);
    }
  };

  const handleSubmit = () => {
    if (content.trim() && !isLoading) {
      onSubmit(content.trim());
      if (!isEditing) {
        setContent('');
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className={`flex space-x-3 ${compact ? 'space-x-2' : ''}`}>
        {/* Avatar */}
        {showAvatar && (
          <Avatar className={`${compact ? 'h-6 w-6' : 'h-8 w-8'} flex-shrink-0`}>
            <AvatarImage src="/placeholder-avatar.jpg" />
            <AvatarFallback className="text-xs">You</AvatarFallback>
          </Avatar>
        )}

        {/* Input Area */}
        <div className="flex-1 relative">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              className={`min-h-[${compact ? '32px' : '80px'} resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500 pr-20`}
              rows={compact ? 1 : 3}
            />

            {/* Character Count */}
            {content.length > 500 && (
              <div className="absolute bottom-2 left-3 text-xs text-gray-400">
                {content.length}/1000
              </div>
            )}

            {/* Action Buttons */}
            <div className={`absolute bottom-2 right-2 flex items-center space-x-1`}>
              {/* Mention Button */}
              <Button
                variant="ghost"
                size="sm"
                className={`${compact ? 'h-6 w-6 p-0' : 'h-8 w-8 p-0'}`}
                onClick={() => {
                  const textarea = textareaRef.current;
                  if (textarea) {
                    const cursorPos = textarea.selectionStart;
                    setContent(prev => prev.slice(0, cursorPos) + '@' + prev.slice(cursorPos));
                    setTimeout(() => {
                      textarea.setSelectionRange(cursorPos + 1, cursorPos + 1);
                      textarea.focus();
                    }, 0);
                  }
                }}
                disabled={isLoading}
              >
                <AtSign className={`${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />
              </Button>

              {/* Emoji Button */}
              <Button
                variant="ghost"
                size="sm"
                className={`${compact ? 'h-6 w-6 p-0' : 'h-8 w-8 p-0'}`}
                disabled={isLoading}
              >
                <Smile className={`${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />
              </Button>

              {/* Send/Submit Button */}
              <Button
                size="sm"
                className={`${compact ? 'h-6 px-2' : 'h-8 px-3'}`}
                onClick={handleSubmit}
                disabled={isLoading || !content.trim()}
              >
                <Send className={`${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />
                {!compact && <span className="ml-1">{submitLabel}</span>}
              </Button>
            </div>
          </div>

          {/* Mention Suggestions */}
          {showMentionSuggestions && mentionSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
              {mentionSuggestions.map((user, index) => (
                <div
                  key={user.id}
                  className={`flex items-center space-x-2 p-2 cursor-pointer hover:bg-gray-50 ${
                    index === selectedMentionIndex ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => insertMention(user)}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="text-xs">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <span className="text-xs text-gray-400">{user.role}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cancel Button for editing */}
        {isEditing && onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
            className="px-2"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};