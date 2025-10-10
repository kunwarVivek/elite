import React, { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { MoreVertical, Reply, Phone, Video, Info, Paperclip, Send, Smile, Download, MessageCircle, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageInput } from './message-input';
import { TypingIndicator } from './typing-indicator';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  subject: string;
  content: string;
  messageType: 'GENERAL' | 'PITCH_DISCUSSION' | 'INVESTMENT' | 'SYNDICATE';
  isUrgent: boolean;
  attachments?: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }>;
  parentMessageId?: string;
  sentAt: string;
  isRead: boolean;
  readAt?: string;
  sender?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
  };
}

interface Conversation {
  id: string;
  subject: string;
  participants: Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
  }>;
  messageType: 'GENERAL' | 'PITCH_DISCUSSION' | 'INVESTMENT' | 'SYNDICATE';
  pitchId?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MessageThreadProps {
  conversation: Conversation | null;
  messages: Message[];
  currentUserId: string;
  onSendMessage: (content: string, attachments?: File[]) => void;
  onMarkAsRead: (messageIds: string[]) => void;
  onLoadMoreMessages?: () => void;
  isLoading?: boolean;
  hasMoreMessages?: boolean;
}

export const MessageThread: React.FC<MessageThreadProps> = ({
  conversation,
  messages,
  currentUserId,
  onSendMessage,
  onMarkAsRead,
  onLoadMoreMessages,
  isLoading = false,
  hasMoreMessages = false,
}) => {
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when they come into view
  useEffect(() => {
    const unreadMessages = messages.filter(msg => !msg.isRead && msg.senderId !== currentUserId);
    if (unreadMessages.length > 0) {
      onMarkAsRead(unreadMessages.map(msg => msg.id));
    }
  }, [messages, currentUserId, onMarkAsRead]);

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true });
    } else {
      return format(date, 'MMM d, yyyy \'at\' h:mm a');
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    if (scrollTop === 0 && hasMoreMessages && onLoadMoreMessages) {
      onLoadMoreMessages();
    }
  };

  if (!conversation) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-lg font-medium mb-2">Select a conversation</p>
            <p className="text-sm">Choose a conversation from the sidebar to start messaging</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={conversation.participants[0]?.avatar} />
            <AvatarFallback>
              {conversation.participants[0]?.name?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">
              {conversation.participants.map(p => p.name).join(', ')}
            </h3>
            <p className="text-sm text-gray-500">
              {conversation.participants.length > 1
                ? `${conversation.participants.length} participants`
                : conversation.participants[0]?.email
              }
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Info className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Archive className="h-4 w-4 mr-2" />
                Archive Conversation
              </DropdownMenuItem>
              <DropdownMenuItem>
                Mark as Unread
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                Delete Conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" onScrollCapture={handleScroll} ref={scrollAreaRef}>
        <div className="space-y-4">
          {hasMoreMessages && (
            <div className="text-center">
              <Button variant="outline" size="sm" onClick={onLoadMoreMessages} disabled={isLoading}>
                {isLoading ? 'Loading...' : 'Load More Messages'}
              </Button>
            </div>
          )}

          {messages.map((message, index) => {
            const isOwnMessage = message.senderId === currentUserId;
            const showAvatar = !isOwnMessage && (index === 0 || messages[index - 1].senderId !== message.senderId);
            const showTimestamp = index === messages.length - 1 || messages[index + 1].senderId !== message.senderId;

            return (
              <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                  {!isOwnMessage && showAvatar && (
                    <Avatar className="h-8 w-8 mt-1 mr-2 flex-shrink-0">
                      <AvatarImage src={message.sender?.avatar} />
                      <AvatarFallback className="text-xs">
                        {message.sender?.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className={`flex flex-col ${!isOwnMessage && !showAvatar ? 'ml-10' : ''}`}>
                    {/* Message Bubble */}
                    <div
                      className={`relative px-4 py-2 rounded-lg max-w-full break-words ${
                        isOwnMessage
                          ? 'bg-blue-500 text-white rounded-br-none'
                          : 'bg-gray-100 text-gray-900 rounded-bl-none'
                      }`}
                    >
                      {message.isUrgent && (
                        <Badge variant="destructive" className="mb-2 text-xs">
                          Urgent
                        </Badge>
                      )}

                      {message.content && (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}

                      {/* Attachments */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {message.attachments.map((attachment) => (
                            <div key={attachment.id} className="flex items-center space-x-2 p-2 bg-black bg-opacity-10 rounded">
                              <Paperclip className="h-4 w-4" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{attachment.fileName}</p>
                                <p className="text-xs opacity-75">
                                  {(attachment.fileSize / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Message Actions */}
                      <div className={`flex items-center justify-between mt-2 ${isOwnMessage ? 'text-white' : 'text-gray-500'}`}>
                        <span className="text-xs opacity-75">
                          {formatMessageTime(message.sentAt)}
                        </span>
                        {isOwnMessage && (
                          <div className="flex items-center space-x-1">
                            {message.isRead && (
                              <span className="text-xs">Read</span>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-75 hover:opacity-100">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Reply className="h-3 w-3 mr-2" />
                                  Reply
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  Forward
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Timestamp for non-own messages */}
                    {!isOwnMessage && showTimestamp && (
                      <span className="text-xs text-gray-400 mt-1 px-2">
                        {formatMessageTime(message.sentAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && typingUsers.length > 0 && (
            <div className="flex justify-start">
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs">
                  {typingUsers.length === 1
                    ? `${typingUsers[0]} is typing...`
                    : `${typingUsers.length} people are typing...`
                  }
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t bg-white">
        <MessageInput
          onSendMessage={onSendMessage}
          placeholder={`Message ${conversation.participants.map(p => p.name).join(', ')}...`}
          disabled={isLoading}
        />
      </div>
    </div>
  );
};