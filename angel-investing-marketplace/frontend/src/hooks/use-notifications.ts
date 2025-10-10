import { useState, useEffect, useCallback } from 'react';
import { useWebSocketStore } from '@/stores/websocket.store';
import { apiClient } from '@/lib/api-client';

interface Notification {
  id: string;
  type: 'MESSAGE' | 'INVESTMENT' | 'PITCH_UPDATE' | 'SYSTEM' | 'MENTION' | 'REACTION';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  title: string;
  content: string;
  actionUrl?: string;
  imageUrl?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  data?: Record<string, any>;
  channels: string[];
}

interface NotificationPreferences {
  email?: {
    enabled?: boolean;
    frequency?: string;
    types?: string[];
  };
  push?: {
    enabled?: boolean;
    types?: string[];
  };
  sms?: {
    enabled?: boolean;
    types?: string[];
  };
  inApp?: {
    enabled?: boolean;
    showBadge?: boolean;
    soundEnabled?: boolean;
    types?: string[];
  };
  quietHours?: {
    enabled?: boolean;
    startTime?: string;
    endTime?: string;
    timezone?: string;
    daysOfWeek?: number[];
  };
  weeklyDigest?: {
    enabled?: boolean;
    dayOfWeek?: number;
    time?: string;
    includePortfolio?: boolean;
    includeMarketNews?: boolean;
  };
}

interface UseNotificationsOptions {
  autoConnect?: boolean;
  enableRealTime?: boolean;
  enableSound?: boolean;
}

export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const { autoConnect = true, enableRealTime = true, enableSound = true } = options;
  const { socket, isConnected, sendMessage } = useWebSocketStore();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Load notifications
  const loadNotifications = useCallback(async (filters?: {
    isRead?: boolean;
    type?: string;
    priority?: string;
    channel?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/api/v1/notifications', {
        params: {
          ...filters,
          page: filters?.page || 1,
          limit: filters?.limit || 20,
        },
      });

      setNotifications(response.data.notifications || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load notifications');
      console.error('Error loading notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load notification preferences
  const loadPreferences = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/v1/notifications/preferences');
      setPreferences(response.data.preferences || {});
    } catch (err: any) {
      console.error('Error loading notification preferences:', err);
    }
  }, []);

  // Update notification preferences
  const updatePreferences = useCallback(async (newPreferences: NotificationPreferences) => {
    setError(null);

    try {
      await apiClient.put('/api/v1/notifications/preferences', newPreferences);
      setPreferences(newPreferences);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update preferences');
      console.error('Error updating preferences:', err);
      throw err;
    }
  }, []);

  // Mark notifications as read
  const markAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      await apiClient.put('/api/v1/notifications/read', { notificationIds });

      // Update local state
      setNotifications(prev => prev.map(notification =>
        notificationIds.includes(notification.id)
          ? { ...notification, isRead: true, readAt: new Date().toISOString() }
          : notification
      ));
    } catch (err: any) {
      console.error('Error marking notifications as read:', err);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async (beforeDate?: string) => {
    try {
      const response = await apiClient.put('/api/v1/notifications/read-all', { beforeDate });

      // Update local state
      setNotifications(prev => prev.map(notification => ({
        ...notification,
        isRead: true,
        readAt: new Date().toISOString(),
      })));

      return response.data.marked_count;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to mark all as read');
      console.error('Error marking all notifications as read:', err);
      throw err;
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await apiClient.delete(`/api/v1/notifications/${notificationId}`);

      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete notification');
      console.error('Error deleting notification:', err);
    }
  }, []);

  // Send test notification
  const sendTestNotification = useCallback(async (type: string = 'SYSTEM_ANNOUNCEMENT', channel: string = 'IN_APP') => {
    try {
      const response = await apiClient.post('/api/v1/notifications/test', { type, channel });
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send test notification');
      console.error('Error sending test notification:', err);
      throw err;
    }
  }, []);

  // Get notification summary
  const getNotificationSummary = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/v1/notifications/summary');
      return response.data;
    } catch (err: any) {
      console.error('Error getting notification summary:', err);
      return null;
    }
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (!enableSound) return;

    try {
      // Create audio context for notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (err) {
      console.error('Error playing notification sound:', err);
    }
  }, [enableSound]);

  // Set up real-time listeners
  useEffect(() => {
    if (!enableRealTime || !isConnected) return;

    const handleNewNotification = (notificationData: any) => {
      const newNotification: Notification = {
        id: notificationData.id,
        type: notificationData.type,
        priority: notificationData.priority,
        title: notificationData.title,
        content: notificationData.content,
        actionUrl: notificationData.actionUrl,
        imageUrl: notificationData.imageUrl,
        isRead: false,
        createdAt: notificationData.createdAt,
        channels: notificationData.channels || ['IN_APP'],
        data: notificationData.data,
      };

      setNotifications(prev => [newNotification, ...prev]);

      // Play sound for new notifications
      if (preferences.inApp?.soundEnabled !== false) {
        playNotificationSound();
      }

      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new window.Notification(newNotification.title, {
          body: newNotification.content,
          icon: '/favicon.ico',
          badge: '/badge-icon.png',
          tag: newNotification.id,
        });
      }
    };

    // Set up event listeners
    socket?.on('notification', handleNewNotification);

    return () => {
      socket?.off('notification', handleNewNotification);
    };
  }, [enableRealTime, isConnected, socket, preferences.inApp?.soundEnabled, playNotificationSound]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }, []);

  // Auto-load data on mount
  useEffect(() => {
    loadNotifications();
    loadPreferences();

    // Request notification permission
    requestNotificationPermission();
  }, [loadNotifications, loadPreferences, requestNotificationPermission]);

  return {
    // State
    notifications,
    preferences,
    unreadCount,
    isLoading,
    error,

    // Actions
    loadNotifications,
    loadPreferences,
    updatePreferences,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    sendTestNotification,
    getNotificationSummary,
    requestNotificationPermission,

    // Utilities
    clearError: () => setError(null),
    refreshNotifications: () => loadNotifications(),
    playNotificationSound,
  };
};