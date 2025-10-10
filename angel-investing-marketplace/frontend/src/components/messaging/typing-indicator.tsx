import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TypingUser {
  id: string;
  name: string;
  avatar?: string;
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
  currentUserId?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  typingUsers,
  currentUserId,
}) => {
  // Filter out current user from typing indicators
  const filteredUsers = typingUsers.filter(user => user.id !== currentUserId);

  if (filteredUsers.length === 0) {
    return null;
  }

  const getTypingText = () => {
    if (filteredUsers.length === 1) {
      return `${filteredUsers[0].name} is typing...`;
    } else if (filteredUsers.length === 2) {
      return `${filteredUsers[0].name} and ${filteredUsers[1].name} are typing...`;
    } else {
      return `${filteredUsers[0].name} and ${filteredUsers.length - 1} others are typing...`;
    }
  };

  return (
    <div className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-500">
      {/* Typing Animation */}
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>

      {/* User Avatars */}
      <div className="flex -space-x-1">
        {filteredUsers.slice(0, 3).map((user) => (
          <Avatar key={user.id} className="h-5 w-5 border-2 border-white">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="text-xs">
              {user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>

      {/* Typing Text */}
      <span className="text-xs">{getTypingText()}</span>
    </div>
  );
};