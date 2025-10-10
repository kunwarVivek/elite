import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Search, Plus, Archive, MoreVertical, MessageCircle, Users, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    sentAt: string;
    isRead: boolean;
  };
  unreadCount: number;
  messageType: 'GENERAL' | 'PITCH_DISCUSSION' | 'INVESTMENT' | 'SYNDICATE';
  pitchId?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId?: string;
  onConversationSelect: (conversationId: string) => void;
  onNewMessage: () => void;
  onArchiveConversation: (conversationId: string) => void;
  isLoading?: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedConversationId,
  onConversationSelect,
  onNewMessage,
  onArchiveConversation,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'archived'>('all');

  // Filter conversations based on search and filter criteria
  const filteredConversations = conversations.filter((conversation) => {
    const matchesSearch =
      conversation.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.participants.some(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesFilter =
      filter === 'all' ||
      (filter === 'unread' && conversation.unreadCount > 0) ||
      (filter === 'archived' && conversation.isArchived);

    return matchesSearch && matchesFilter;
  });

  const getMessageTypeIcon = (type: Conversation['messageType']) => {
    switch (type) {
      case 'PITCH_DISCUSSION':
        return <MessageCircle className="h-4 w-4" />;
      case 'INVESTMENT':
        return <Briefcase className="h-4 w-4" />;
      case 'SYNDICATE':
        return <Users className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getMessageTypeColor = (type: Conversation['messageType']) => {
    switch (type) {
      case 'PITCH_DISCUSSION':
        return 'bg-blue-100 text-blue-800';
      case 'INVESTMENT':
        return 'bg-green-100 text-green-800';
      case 'SYNDICATE':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Messages</h2>
            <Button onClick={onNewMessage} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Message
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              className="pl-10"
              disabled
            />
          </div>
        </div>
        <div className="flex-1 p-4">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Messages</h2>
          <Button onClick={onNewMessage} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Message
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1">
          {(['all', 'unread', 'archived'] as const).map((filterType) => (
            <Button
              key={filterType}
              variant={filter === filterType ? 'default' : 'ghost'}
              size="sm"
              className="text-xs"
              onClick={() => setFilter(filterType)}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              {filterType === 'unread' && conversations.reduce((acc, conv) => acc + conv.unreadCount, 0) > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  {conversations.reduce((acc, conv) => acc + conv.unreadCount, 0)}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">
                {searchQuery || filter !== 'all'
                  ? 'No conversations match your search.'
                  : 'No conversations yet. Start a new message!'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`group relative p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedConversationId === conversation.id ? 'bg-blue-50 border border-blue-200' : ''
                  }`}
                  onClick={() => onConversationSelect(conversation.id)}
                >
                  <div className="flex items-start space-x-3">
                    {/* Avatar */}
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={conversation.participants[0]?.avatar} />
                      <AvatarFallback>
                        {conversation.participants[0]?.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-sm truncate">
                            {conversation.participants.map(p => p.name).join(', ')}
                          </h3>
                          <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs ${getMessageTypeColor(conversation.messageType)}`}>
                            {getMessageTypeIcon(conversation.messageType)}
                            <span className="capitalize">{conversation.messageType.replace('_', ' ')}</span>
                          </div>
                        </div>

                        {/* Dropdown Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchiveConversation(conversation.id); }}>
                              <Archive className="h-4 w-4 mr-2" />
                              {conversation.isArchived ? 'Unarchive' : 'Archive'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <p className="text-sm text-gray-600 truncate mb-1">
                        {conversation.subject}
                      </p>

                      {conversation.lastMessage && (
                        <p className={`text-xs truncate ${conversation.unreadCount > 0 ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                          {conversation.lastMessage.senderId === 'current-user' ? 'You: ' : ''}
                          {conversation.lastMessage.content}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">
                          {conversation.lastMessage
                            ? formatDistanceToNow(new Date(conversation.lastMessage.sentAt), { addSuffix: true })
                            : formatDistanceToNow(new Date(conversation.createdAt), { addSuffix: true })
                          }
                        </span>

                        {conversation.unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};