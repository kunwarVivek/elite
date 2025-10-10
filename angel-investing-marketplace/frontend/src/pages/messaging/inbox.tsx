import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MessageCircle, Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ConversationList } from '@/components/messaging/conversation-list';
import { MessageThread } from '@/components/messaging/message-thread';
import { useMessaging } from '@/hooks/use-messaging';
import { useRealtime } from '@/hooks/use-realtime';

export const Inbox: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedConversationId = searchParams.get('conversation');

  const {
    conversations,
    currentConversation,
    messages,
    isLoading,
    error,
    loadConversations,
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

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load conversation when selected
  useEffect(() => {
    if (selectedConversationId) {
      loadConversation(selectedConversationId);
      joinRoom(selectedConversationId, 'conversation');
    }

    return () => {
      if (selectedConversationId) {
        leaveRoom(selectedConversationId, 'conversation');
      }
    };
  }, [selectedConversationId, loadConversation, joinRoom, leaveRoom]);

  const handleConversationSelect = (conversationId: string) => {
    setSearchParams({ conversation: conversationId });
  };

  const handleNewMessage = () => {
    navigate('/messaging/new');
  };

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if (!selectedConversationId || !currentConversation) return;

    try {
      await sendMessage(selectedConversationId, content, attachments);
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

  const handleArchiveConversation = async (conversationId: string) => {
    try {
      await archiveConversation(conversationId, true);
    } catch (err) {
      console.error('Failed to archive conversation:', err);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (selectedConversationId) {
      sendTypingIndicator(selectedConversationId, isTyping);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MessageCircle className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
              <p className="text-sm text-gray-500">
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button onClick={handleNewMessage} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Message
            </Button>
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

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Conversations Sidebar */}
          <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
            <div className="h-full bg-white border-r">
              <ConversationList
                conversations={conversations}
                selectedConversationId={selectedConversationId || undefined}
                onConversationSelect={handleConversationSelect}
                onNewMessage={handleNewMessage}
                onArchiveConversation={handleArchiveConversation}
                isLoading={isLoading}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Message Thread */}
          <ResizablePanel defaultSize={70}>
            <div className="h-full bg-white">
              <MessageThread
                conversation={currentConversation}
                messages={messages}
                currentUserId="current-user" // This would come from auth context
                onSendMessage={handleSendMessage}
                onMarkAsRead={handleMarkAsRead}
                isLoading={isLoading}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};