import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationPreferences } from '@/components/notifications/notification-preferences';
import { useNavigate } from 'react-router-dom';

export const MessagingSettings: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/messaging')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Messages
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Messaging Settings</h1>
            <p className="text-sm text-gray-500">Manage your messaging preferences and notifications</p>
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-auto">
        <NotificationPreferences />
      </div>
    </div>
  );
};