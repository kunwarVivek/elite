import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  RefreshCw,
  Settings,
  TrendingUp,
  DollarSign,
  Users,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'INVESTMENT_UPDATE' | 'INVESTMENT' | 'MESSAGE' | 'PITCH_UPDATE' | 'PITCH' | 'SYNDICATE' | 'SYSTEM' | 'PAYMENT';
  title: string;
  content: string;
  isRead: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  actionUrl?: string;
  metadata?: any;
  createdAt: Date;
}

type FilterType = 'all' | 'unread' | 'investment' | 'system';

export default function NotificationsListPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') {
        if (filter === 'unread') params.append('isRead', 'false');
        if (filter === 'investment') params.append('type', 'INVESTMENT,INVESTMENT_UPDATE');
        if (filter === 'system') params.append('type', 'SYSTEM');
      }

      const response = await fetch(`/api/notifications?${params.toString()}`);
      const data = await response.json();
      setNotifications(data.data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (ids: string[]) => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: ids }),
      });
      await fetchNotifications();
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });
      await fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotifications = async (ids: string[]) => {
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: ids }),
      });
      await fetchNotifications();
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Failed to delete notifications:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'INVESTMENT':
      case 'INVESTMENT_UPDATE':
        return <DollarSign className="h-5 w-5 text-blue-600" />;
      case 'SYNDICATE':
        return <Users className="h-5 w-5 text-purple-600" />;
      case 'PITCH':
      case 'PITCH_UPDATE':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'SYSTEM':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      case 'MESSAGE':
        return <FileText className="h-5 w-5 text-indigo-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'border-l-red-500';
      case 'MEDIUM':
        return 'border-l-yellow-500';
      default:
        return 'border-l-gray-300';
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Bell className="h-8 w-8 text-blue-600" />
                Notifications
              </h1>
              <p className="mt-1 text-gray-600">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchNotifications}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                title="Refresh"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              <Link
                to="/notifications/settings"
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Filters */}
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-600" />
              <div className="flex gap-2">
                {(['all', 'unread', 'investment', 'system'] as FilterType[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      filter === f
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{selectedIds.size} selected</span>
                <button
                  onClick={() => markAsRead(Array.from(selectedIds))}
                  className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition flex items-center gap-1"
                >
                  <Check className="h-4 w-4" />
                  Mark Read
                </button>
                <button
                  onClick={() => deleteNotifications(Array.from(selectedIds))}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition flex items-center gap-1"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}

            {/* Mark All Read */}
            {selectedIds.size === 0 && unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition flex items-center gap-1"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-600">
                {filter === 'unread' ? "You're all caught up!" : 'No notifications to show'}
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-lg shadow-sm border-l-4 ${getPriorityColor(
                  notification.priority
                )} ${
                  notification.isRead ? 'border-gray-200' : 'border-gray-300 bg-blue-50/30'
                } hover:shadow-md transition`}
              >
                <div className="p-4 flex items-start gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedIds.has(notification.id)}
                    onChange={() => toggleSelection(notification.id)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />

                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3
                          className={`text-sm font-semibold ${
                            notification.isRead ? 'text-gray-700' : 'text-gray-900'
                          }`}
                        >
                          {notification.title}
                        </h3>
                        <p
                          className={`mt-1 text-sm ${
                            notification.isRead ? 'text-gray-500' : 'text-gray-600'
                          }`}
                        >
                          {notification.content}
                        </p>
                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                          <span>
                            {new Date(notification.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {notification.type.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {!notification.isRead && (
                          <button
                            onClick={() => markAsRead([notification.id])}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotifications([notification.id])}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Action Button */}
                    {notification.actionUrl && (
                      <Link
                        to={notification.actionUrl}
                        className="mt-3 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        View details →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
