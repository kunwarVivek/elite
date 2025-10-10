import { useState, useEffect, useCallback } from 'react';
import { useWebSocketStore } from '@/stores/websocket.store';
import { apiClient } from '@/lib/api-client';

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

interface SendMessageData {
  receiverId: string;
  pitchId?: string;
  subject: string;
  content: string;
  messageType?: string;
  isUrgent?: boolean;
  attachments?: File[];
  parentMessageId?: string;
}

interface UseMessagingOptions {
  autoConnect?: boolean;
  enableRealTime?: boolean;
}

export const useMessaging = (options: UseMessagingOptions = {}) => {
  const { autoConnect = true, enableRealTime = true } = options;
  const { socket, isConnected, sendMessage, onNotification } = useWebSocketStore();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load conversations
  const loadConversations = useCallback(async (filters?: {
    participantId?: string;
    pitchId?: string;
    isArchived?: boolean;
    hasUnread?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/api/v1/messages', {
        params: {
          ...filters,
          page: filters?.page || 1,
          limit: filters?.limit || 20,
        },
      });

      setConversations(response.data.conversations || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load conversations');
      console.error('Error loading conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load conversation messages
  const loadConversation = useCallback(async (conversationId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/api/v1/messages/${conversationId}`);
      const conversationData = response.data;

      setCurrentConversation({
        id: conversationData.id,
        subject: conversationData.subject,
        participants: conversationData.participants,
        messageType: conversationData.message_type,
        pitchId: conversationData.pitch_id,
        isArchived: conversationData.is_archived,
        createdAt: conversationData.created_at,
        updatedAt: conversationData.updated_at,
      });

      setMessages(conversationData.messages || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load conversation');
      console.error('Error loading conversation:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send message
  const sendMessageToConversation = useCallback(async (
    conversationId: string,
    content: string,
    attachments?: File[]
  ) => {
    setError(null);

    try {
      const formData = new FormData();
      formData.append('content', content);
      if (attachments) {
        attachments.forEach((file, index) => {
          formData.append(`attachments[${index}]`, file);
        });
      }

      const response = await apiClient.post(`/api/v1/messages/${conversationId}/send`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Add message to local state
      const newMessage: Message = {
        id: response.data.id,
        conversationId,
        senderId: 'current-user', // This would come from auth context
        receiverId: currentConversation?.participants[0]?.id || '',
        subject: response.data.subject,
        content,
        messageType: currentConversation?.messageType || 'GENERAL',
        isUrgent: false,
        sentAt: response.data.sent_at,
        isRead: true,
        attachments: attachments?.map((file, index) => ({
          id: `temp-${index}`,
          fileName: file.name,
          fileUrl: URL.createObjectURL(file),
          fileSize: file.size,
          mimeType: file.type,
        })),
      };

      setMessages(prev => [...prev, newMessage]);

      // Update conversation last message
      setConversations(prev => prev.map(conv =>
        conv.id === conversationId
          ? {
              ...conv,
              lastMessage: {
                id: newMessage.id,
                content: newMessage.content,
                senderId: newMessage.senderId,
                sentAt: newMessage.sentAt,
                isRead: true,
              },
              updatedAt: newMessage.sentAt,
            }
          : conv
      ));

      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send message');
      console.error('Error sending message:', err);
      throw err;
    }
  }, [currentConversation]);

  // Start new conversation
  const startConversation = useCallback(async (data: SendMessageData) => {
    setError(null);

    try {
      const formData = new FormData();
      formData.append('receiverId', data.receiverId);
      if (data.pitchId) formData.append('pitchId', data.pitchId);
      formData.append('subject', data.subject);
      formData.append('content', data.content);
      if (data.messageType) formData.append('messageType', data.messageType);
      if (data.isUrgent) formData.append('isUrgent', 'true');
      if (data.parentMessageId) formData.append('parentMessageId', data.parentMessageId);

      if (data.attachments) {
        data.attachments.forEach((file, index) => {
          formData.append(`attachments[${index}]`, file);
        });
      }

      const response = await apiClient.post('/api/v1/messages/send', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Reload conversations to include the new one
      await loadConversations();

      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start conversation');
      console.error('Error starting conversation:', err);
      throw err;
    }
  }, [loadConversations]);

  // Mark messages as read
  const markAsRead = useCallback(async (messageIds: string[]) => {
    try {
      await apiClient.post('/api/v1/messages/mark-read', { messageIds });

      // Update local state
      setMessages(prev => prev.map(msg =>
        messageIds.includes(msg.id)
          ? { ...msg, isRead: true, readAt: new Date().toISOString() }
          : msg
      ));

      // Update conversation unread count
      if (currentConversation) {
        const unreadMessages = messages.filter(msg => !msg.isRead && messageIds.includes(msg.id));
        setConversations(prev => prev.map(conv =>
          conv.id === currentConversation.id
            ? { ...conv, unreadCount: Math.max(0, conv.unreadCount - unreadMessages.length) }
            : conv
        ));
      }
    } catch (err: any) {
      console.error('Error marking messages as read:', err);
    }
  }, [currentConversation, messages]);

  // Archive conversation
  const archiveConversation = useCallback(async (conversationId: string, archive: boolean = true) => {
    try {
      await apiClient.post(`/api/v1/messages/${conversationId}/archive`, { archive });

      // Update local state
      setConversations(prev => prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, isArchived: archive }
          : conv
      ));

      if (currentConversation?.id === conversationId) {
        setCurrentConversation(prev => prev ? { ...prev, isArchived: archive } : null);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to archive conversation');
      console.error('Error archiving conversation:', err);
    }
  }, [currentConversation]);

  // Set up real-time listeners
  useEffect(() => {
    if (!enableRealTime || !isConnected) return;

    const handleNewMessage = (data: any) => {
      // Add new message to appropriate conversation
      if (data.conversationId === currentConversation?.id) {
        const newMessage: Message = {
          id: data.messageId,
          conversationId: data.conversationId,
          senderId: data.senderId,
          receiverId: data.receiverId,
          subject: data.subject,
          content: data.content,
          messageType: data.messageType,
          isUrgent: data.isUrgent,
          sentAt: data.sentAt,
          isRead: data.senderId === 'current-user', // Current user messages are read
        };

        setMessages(prev => [...prev, newMessage]);
      }

      // Update conversation in list
      setConversations(prev => prev.map(conv =>
        conv.id === data.conversationId
          ? {
              ...conv,
              lastMessage: {
                id: data.messageId,
                content: data.content,
                senderId: data.senderId,
                sentAt: data.sentAt,
                isRead: data.senderId === 'current-user',
              },
              unreadCount: data.senderId === 'current-user'
                ? conv.unreadCount
                : conv.unreadCount + 1,
              updatedAt: data.sentAt,
            }
          : conv
      ));
    };

    const handleTypingIndicator = (data: any) => {
      // Handle typing indicators - this would be implemented based on your real-time needs
      console.log('Typing indicator:', data);
    };

    // Set up event listeners
    socket?.on('new_message', handleNewMessage);
    socket?.on('typing', handleTypingIndicator);

    return () => {
      socket?.off('new_message', handleNewMessage);
      socket?.off('typing', handleTypingIndicator);
    };
  }, [enableRealTime, isConnected, socket, currentConversation]);

  // Auto-connect to WebSocket if enabled
  useEffect(() => {
    if (autoConnect && enableRealTime) {
      // This would typically get the token from auth context
      const token = localStorage.getItem('authToken');
      if (token && !isConnected) {
        // WebSocket connection would be handled by the store
      }
    }
  }, [autoConnect, enableRealTime, isConnected]);

  return {
    // State
    conversations,
    currentConversation,
    messages,
    isLoading,
    error,

    // Actions
    loadConversations,
    loadConversation,
    sendMessage: sendMessageToConversation,
    startConversation,
    markAsRead,
    archiveConversation,

    // Utilities
    clearError: () => setError(null),
    refreshConversations: () => loadConversations(),
  };
};