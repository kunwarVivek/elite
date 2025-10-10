import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  Settings,
  Check,
  CheckCheck,
  Trash2,
  MoreVertical,
  Filter,
  Search,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationItem } from './notification-item';
import { NotificationPreferences } from './notification-preferences';

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

interface NotificationCenterProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (notificationIds: string[]) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (notificationId: string) => void;
  onNotificationClick: (notification: Notification) => void;
  isLoading?: boolean;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onNotificationClick,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'mentions' | 'investments'>('all');
  const [showPreferences, setShowPreferences] = useState(false);

  // Filter notifications based on search and filter criteria
  const filteredNotifications = notifications.filter((notification) => {
    const matchesSearch =
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filter === 'all' ||
      (filter === 'unread' && !notification.isRead) ||
      (filter === 'mentions' && notification.type === 'MENTION') ||
      (filter === 'investments' && notification.type === 'INVESTMENT');

    return matchesSearch && matchesFilter;
  });

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'MESSAGE':
        return '💬';
      case 'INVESTMENT':
        return '💰';
      case 'PITCH_UPDATE':
        return '📊';
      case 'SYSTEM':
        return '⚙️';
      case 'MENTION':
        return '@';
      case 'REACTION':
        return '👍';
      default:
        return '🔔';
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'URGENT':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'HIGH':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'MEDIUM':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (showPreferences) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Notification Settings</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreferences(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1">
          <NotificationPreferences />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-semibold">Notifications</h2>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Mark All as Read */}
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onMarkAllAsRead}
                className="text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}

            {/* Settings */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreferences(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search notifications..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={(value) => setFilter(value as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="text-xs">
              All
              {notifications.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {notifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">
              Unread
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="mentions" className="text-xs">
              Mentions
            </TabsTrigger>
            <TabsTrigger value="investments" className="text-xs">
              Investments
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Notifications List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">
                {searchQuery || filter !== 'all'
                  ? 'No notifications match your search.'
                  : 'No notifications yet. You\'ll see them here when something happens!'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => onNotificationClick(notification)}
                  onMarkAsRead={(id) => onMarkAsRead([id])}
                  onDelete={(id) => onDeleteNotification(id)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      {filteredNotifications.length > 0 && (
        <div className="p-4 border-t">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" className="text-xs">
              <Filter className="h-3 w-3 mr-1" />
              More filters
            </Button>

            <div className="flex items-center space-x-2">
              {filter === 'unread' && unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onMarkAllAsRead}
                  className="text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark visible as read
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onMarkAllAsRead}>
                    <CheckCheck className="h-4 w-4 mr-2" />
                    Mark all as read
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear all notifications
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};