import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Video, Info, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MessageThread } from '@/components/messaging/message-thread';
import { useMessaging } from '@/hooks/use-messaging';
import { useRealtime } from '@/hooks/use-realtime';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const Conversation: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();

  const {
    currentConversation,
    messages,
    isLoading,
    error,
    loadConversation,
    sendMessage,
    markAsRead,
    archiveConversation,
    clearError,
  } = useMessaging({
    autoConnect: true,
    enableRealTime: true,
  });

  const { sendTypingIndicator, joinRoom, leaveRoom } = useRealtime({
    enablePresence: true,
    enableTypingIndicators: true,
  });

  // Load conversation on mount
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
      joinRoom(conversationId, 'conversation');
    }

    return () => {
      if (conversationId) {
        leaveRoom(conversationId, 'conversation');
      }
    };
  }, [conversationId, loadConversation, joinRoom, leaveRoom]);

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if (!conversationId || !currentConversation) return;

    try {
      await sendMessage(conversationId, content, attachments);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleMarkAsRead = async (messageIds: string[]) => {
    try {
      await markAsRead(messageIds);
    } catch (err) {
      console.error('Failed to mark messages as read:', err);
    }
  };

  const handleArchiveConversation = async () => {
    if (!conversationId) return;

    try {
      await archiveConversation(conversationId, true);
      navigate('/messaging');
    } catch (err) {
      console.error('Failed to archive conversation:', err);
    }
  };

  const handleBackToInbox = () => {
    navigate('/messaging');
  };

  if (!conversationId) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-900 mb-2">Invalid Conversation</p>
          <p className="text-gray-500 mb-4">This conversation doesn't exist or is no longer available.</p>
          <Button onClick={handleBackToInbox}>Back to Messages</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={handleBackToInbox}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Messages
            </Button>

            {currentConversation && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">
                    {currentConversation.participants[0]?.name?.charAt(0) || '?'}
                  </span>
                </div>
                <div>
                  <h1 className="font-semibold text-gray-900">
                    {currentConversation.participants.map(p => p.name).join(', ')}
                  </h1>
                  <p className="text-sm text-gray-500">
                    {currentConversation.participants.length > 1
                      ? `${currentConversation.participants.length} participants`
                      : currentConversation.participants[0]?.email
                    }
                  </p>
                </div>
              </div>
            )}
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
                <DropdownMenuItem onClick={handleArchiveConversation}>
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
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="ghost" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Message Thread */}
      <div className="flex-1 overflow-hidden">
        <MessageThread
          conversation={currentConversation}
          messages={messages}
          currentUserId="current-user" // This would come from auth context
          onSendMessage={handleSendMessage}
          onMarkAsRead={handleMarkAsRead}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};