import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocketStore } from '@/stores/websocket.store';

interface UserPresence {
  userId: string;
  userName: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: string;
  currentActivity?: string;
}

interface TypingUser {
  userId: string;
  userName: string;
  conversationId: string;
  timestamp: string;
}

interface UseRealtimeOptions {
  enablePresence?: boolean;
  enableTypingIndicators?: boolean;
  typingTimeout?: number;
}

export const useRealtime = (options: UseRealtimeOptions = {}) => {
  const {
    enablePresence = true,
    enableTypingIndicators = true,
    typingTimeout = 3000,
  } = options;

  const { socket, isConnected, sendMessage, joinRoom, leaveRoom } = useWebSocketStore();

  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [currentUserPresence, setCurrentUserPresence] = useState<UserPresence | null>(null);

  const typingTimeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const activityCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // Update user presence
  const updatePresence = useCallback((status: UserPresence['status'], activity?: string) => {
    if (!isConnected) return;

    const presenceData = {
      status,
      activity,
      timestamp: new Date().toISOString(),
    };

    sendMessage('update_presence', presenceData);
    setCurrentUserPresence(prev => prev ? {
      ...prev,
      status,
      lastSeen: new Date().toISOString(),
      currentActivity: activity,
    } : null);
  }, [isConnected, sendMessage]);

  // Join a room (conversation, pitch, etc.)
  const joinRoomChannel = useCallback((roomId: string, roomType: 'conversation' | 'pitch' | 'syndicate' = 'conversation') => {
    if (!isConnected) return;

    joinRoom(`${roomType}:${roomId}`);
  }, [isConnected, joinRoom]);

  // Leave a room
  const leaveRoomChannel = useCallback((roomId: string, roomType: 'conversation' | 'pitch' | 'syndicate' = 'conversation') => {
    if (!isConnected) return;

    leaveRoom(`${roomType}:${roomId}`);
  }, [isConnected, leaveRoom]);

  // Send typing indicator
  const sendTypingIndicator = useCallback((conversationId: string, isTyping: boolean = true) => {
    if (!isConnected || !enableTypingIndicators) return;

    sendMessage('typing', {
      conversationId,
      isTyping,
      timestamp: new Date().toISOString(),
    });

    if (isTyping) {
      // Set timeout to stop typing indicator
      const timeoutKey = `${conversationId}`;
      const existingTimeout = typingTimeoutRefs.current.get(timeoutKey);

      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const timeout = setTimeout(() => {
        sendTypingIndicator(conversationId, false);
        typingTimeoutRefs.current.delete(timeoutKey);
      }, typingTimeout);

      typingTimeoutRefs.current.set(timeoutKey, timeout);
    } else {
      // Clear timeout if manually stopping
      const timeoutKey = `${conversationId}`;
      const existingTimeout = typingTimeoutRefs.current.get(timeoutKey);

      if (existingTimeout) {
        clearTimeout(existingTimeout);
        typingTimeoutRefs.current.delete(timeoutKey);
      }
    }
  }, [isConnected, enableTypingIndicators, sendMessage, typingTimeout]);

  // Get typing users for a specific conversation
  const getTypingUsersForConversation = useCallback((conversationId: string) => {
    return typingUsers.filter(user => user.conversationId === conversationId);
  }, [typingUsers]);

  // Check if user is online
  const isUserOnline = useCallback((userId: string) => {
    return onlineUsers.some(user => user.userId === userId && user.status === 'online');
  }, [onlineUsers]);

  // Get user presence
  const getUserPresence = useCallback((userId: string) => {
    return onlineUsers.find(user => user.userId === userId);
  }, [onlineUsers]);

  // Activity tracking
  useEffect(() => {
    if (!enablePresence) return;

    const handleActivity = () => {
      updatePresence('online', 'active');
    };

    const handleInactivity = () => {
      updatePresence('away');
    };

    let activityTimeout: NodeJS.Timeout;

    const resetActivityTimeout = () => {
      clearTimeout(activityTimeout);
      handleActivity();

      activityTimeout = setTimeout(handleInactivity, 5 * 60 * 1000); // 5 minutes
    };

    // Track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, resetActivityTimeout, true);
    });

    // Initial activity check
    resetActivityTimeout();

    return () => {
      clearTimeout(activityTimeout);
      events.forEach(event => {
        document.removeEventListener(event, resetActivityTimeout, true);
      });
    };
  }, [enablePresence, updatePresence]);

  // Periodic presence updates
  useEffect(() => {
    if (!enablePresence || !isConnected) return;

    const interval = setInterval(() => {
      if (currentUserPresence?.status === 'online') {
        updatePresence('online', currentUserPresence.currentActivity);
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [enablePresence, isConnected, currentUserPresence, updatePresence]);

  // Set up WebSocket event listeners
  useEffect(() => {
    if (!isConnected) return;

    const handleUserJoined = (data: { userId: string; userName: string; room: string }) => {
      console.log('User joined:', data);
    };

    const handleUserLeft = (data: { userId: string; userName: string; room: string }) => {
      console.log('User left:', data);
    };

    const handlePresenceUpdate = (data: UserPresence) => {
      setOnlineUsers(prev => {
        const existingIndex = prev.findIndex(user => user.userId === data.userId);

        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = data;
          return updated;
        } else {
          return [...prev, data];
        }
      });

      // Update current user presence if it's about them
      if (data.userId === currentUserPresence?.userId) {
        setCurrentUserPresence(data);
      }
    };

    const handleTypingUpdate = (data: TypingUser & { isTyping: boolean }) => {
      if (!enableTypingIndicators) return;

      setTypingUsers(prev => {
        if (data.isTyping) {
          const existingIndex = prev.findIndex(
            user => user.userId === data.userId && user.conversationId === data.conversationId
          );

          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = data;
            return updated;
          } else {
            return [...prev, data];
          }
        } else {
          return prev.filter(
            user => !(user.userId === data.userId && user.conversationId === data.conversationId)
          );
        }
      });
    };

    const handleUserOnlineStatus = (data: { userId: string; status: UserPresence['status'] }) => {
      setOnlineUsers(prev => prev.map(user =>
        user.userId === data.userId
          ? { ...user, status: data.status, lastSeen: new Date().toISOString() }
          : user
      ));
    };

    // Set up event listeners
    socket?.on('user_joined', handleUserJoined);
    socket?.on('user_left', handleUserLeft);
    socket?.on('presence_update', handlePresenceUpdate);
    socket?.on('typing', handleTypingUpdate);
    socket?.on('user_status_change', handleUserOnlineStatus);

    return () => {
      socket?.off('user_joined', handleUserJoined);
      socket?.off('user_left', handleUserLeft);
      socket?.off('presence_update', handlePresenceUpdate);
      socket?.off('typing', handleTypingUpdate);
      socket?.off('user_status_change', handleUserOnlineStatus);
    };
  }, [isConnected, socket, enableTypingIndicators, currentUserPresence]);

  // Set initial presence when connected
  useEffect(() => {
    if (isConnected && enablePresence) {
      updatePresence('online', 'connected');
    }
  }, [isConnected, enablePresence, updatePresence]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      typingTimeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      typingTimeoutRefs.current.clear();

      if (activityCheckInterval.current) {
        clearInterval(activityCheckInterval.current);
      }
    };
  }, []);

  return {
    // State
    onlineUsers,
    typingUsers,
    currentUserPresence,
    isConnected,

    // Actions
    updatePresence,
    joinRoom: joinRoomChannel,
    leaveRoom: leaveRoomChannel,
    sendTypingIndicator,

    // Utilities
    getTypingUsersForConversation,
    isUserOnline,
    getUserPresence,
  };
};