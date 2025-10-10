import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, MoreVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  onMarkAsRead: (notificationId: string) => void;
  onDelete: (notificationId: string) => void;
  compact?: boolean;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onClick,
  onMarkAsRead,
  onDelete,
  compact = false,
}) => {
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
        return 'border-l-red-500';
      case 'HIGH':
        return 'border-l-orange-500';
      case 'MEDIUM':
        return 'border-l-blue-500';
      default:
        return 'border-l-gray-300';
    }
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsRead(notification.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.actionUrl) {
      window.open(notification.actionUrl, '_blank');
    }
  };

  return (
    <div
      className={`group relative p-3 border-l-4 cursor-pointer transition-all hover:bg-gray-50 ${
        getPriorityColor(notification.priority)
      } ${
        !notification.isRead ? 'bg-blue-50 hover:bg-blue-100' : 'bg-white'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg ${
          !notification.isRead ? 'bg-blue-100' : 'bg-gray-100'
        }`}>
          {getNotificationIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Title and Priority */}
              <div className="flex items-center space-x-2 mb-1">
                <h4 className={`font-medium text-sm ${
                  !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                }`}>
                  {notification.title}
                </h4>

                {notification.priority === 'URGENT' && (
                  <Badge variant="destructive" className="text-xs">
                    Urgent
                  </Badge>
                )}

                {!notification.isRead && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </div>

              {/* Content */}
              <p className={`text-sm text-gray-600 line-clamp-2 mb-2 ${
                !notification.isRead ? 'font-medium' : ''
              }`}>
                {notification.content}
              </p>

              {/* Metadata */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </span>

                  {notification.channels.includes('PUSH') && (
                    <Badge variant="outline" className="text-xs">
                      Push
                    </Badge>
                  )}

                  {notification.channels.includes('EMAIL') && (
                    <Badge variant="outline" className="text-xs">
                      Email
                    </Badge>
                  )}
                </div>

                {/* Action Button */}
                {notification.actionUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                    onClick={handleActionClick}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Actions Menu */}
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100">
              {!notification.isRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleMarkAsRead}
                  title="Mark as read"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!notification.isRead ? (
                    <DropdownMenuItem onClick={handleMarkAsRead}>
                      Mark as read
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={handleMarkAsRead}>
                      Mark as unread
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Image Preview */}
          {notification.imageUrl && (
            <div className="mt-3">
              <img
                src={notification.imageUrl}
                alt="Notification preview"
                className="w-full h-32 object-cover rounded-lg"
              />
            </div>
          )}

          {/* Additional Data */}
          {notification.data && Object.keys(notification.data).length > 0 && (
            <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
              <pre className="text-gray-600 whitespace-pre-wrap">
                {JSON.stringify(notification.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};