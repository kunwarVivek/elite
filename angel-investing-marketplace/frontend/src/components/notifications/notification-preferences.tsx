import React, { useState } from 'react';
import { Bell, Mail, Smartphone, Volume2, Clock, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface NotificationPreferencesData {
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

const NOTIFICATION_TYPES = [
  { id: 'messages', label: 'Direct Messages', description: 'New messages and replies' },
  { id: 'mentions', label: 'Mentions', description: 'When someone mentions you' },
  { id: 'reactions', label: 'Reactions', description: 'Emoji reactions to your content' },
  { id: 'pitch_updates', label: 'Pitch Updates', description: 'Updates on pitches you follow' },
  { id: 'investment_updates', label: 'Investment Updates', description: 'Investment progress and milestones' },
  { id: 'system', label: 'System Notifications', description: 'Platform updates and announcements' },
  { id: 'weekly_digest', label: 'Weekly Digest', description: 'Weekly summary of activity' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export const NotificationPreferences: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreferencesData>({
    email: {
      enabled: true,
      frequency: 'immediate',
      types: ['messages', 'mentions', 'investment_updates'],
    },
    push: {
      enabled: true,
      types: ['messages', 'mentions', 'reactions'],
    },
    sms: {
      enabled: false,
      types: ['investment_updates'],
    },
    inApp: {
      enabled: true,
      showBadge: true,
      soundEnabled: true,
      types: ['messages', 'mentions', 'reactions', 'pitch_updates'],
    },
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00',
      timezone: 'UTC',
      daysOfWeek: [0, 6], // Weekend
    },
    weeklyDigest: {
      enabled: true,
      dayOfWeek: 1, // Monday
      time: '09:00',
      includePortfolio: true,
      includeMarketNews: false,
    },
  });

  const [isSaving, setIsSaving] = useState(false);

  const updatePreference = (category: keyof NotificationPreferencesData, key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  const toggleNotificationType = (category: keyof NotificationPreferencesData, typeId: string) => {
    const currentTypes = preferences[category]?.types || [];
    const newTypes = currentTypes.includes(typeId)
      ? currentTypes.filter(t => t !== typeId)
      : [...currentTypes, typeId];

    updatePreference(category, 'types', newTypes);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Save preferences to backend
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      console.log('Saving preferences:', preferences);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Notification Preferences</h2>
        <p className="text-gray-600">Customize how and when you receive notifications</p>
      </div>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Email Notifications</span>
          </CardTitle>
          <CardDescription>
            Receive notifications via email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email-enabled">Enable email notifications</Label>
            <Switch
              id="email-enabled"
              checked={preferences.email?.enabled || false}
              onCheckedChange={(checked) => updatePreference('email', 'enabled', checked)}
            />
          </div>

          {preferences.email?.enabled && (
            <>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={preferences.email?.frequency || 'immediate'}
                  onValueChange={(value) => updatePreference('email', 'frequency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="hourly">Hourly digest</SelectItem>
                    <SelectItem value="daily">Daily digest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Notification types</Label>
                {NOTIFICATION_TYPES.map((type) => (
                  <div key={type.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{type.label}</div>
                      <div className="text-xs text-gray-500">{type.description}</div>
                    </div>
                    <Switch
                      checked={preferences.email?.types?.includes(type.id) || false}
                      onCheckedChange={() => toggleNotificationType('email', type.id)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5" />
            <span>Push Notifications</span>
          </CardTitle>
          <CardDescription>
            Receive push notifications on your devices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="push-enabled">Enable push notifications</Label>
            <Switch
              id="push-enabled"
              checked={preferences.push?.enabled || false}
              onCheckedChange={(checked) => updatePreference('push', 'enabled', checked)}
            />
          </div>

          {preferences.push?.enabled && (
            <div className="space-y-3">
              <Label>Notification types</Label>
              {NOTIFICATION_TYPES.filter(type => type.id !== 'weekly_digest').map((type) => (
                <div key={type.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{type.label}</div>
                    <div className="text-xs text-gray-500">{type.description}</div>
                  </div>
                  <Switch
                    checked={preferences.push?.types?.includes(type.id) || false}
                    onCheckedChange={() => toggleNotificationType('push', type.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* In-App Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>In-App Notifications</span>
          </CardTitle>
          <CardDescription>
            Notifications shown within the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="inapp-enabled">Enable in-app notifications</Label>
            <Switch
              id="inapp-enabled"
              checked={preferences.inApp?.enabled || false}
              onCheckedChange={(checked) => updatePreference('inApp', 'enabled', checked)}
            />
          </div>

          {preferences.inApp?.enabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-badge">Show badge count</Label>
                  <Switch
                    id="show-badge"
                    checked={preferences.inApp?.showBadge || false}
                    onCheckedChange={(checked) => updatePreference('inApp', 'showBadge', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="sound-enabled">Sound notifications</Label>
                  <Switch
                    id="sound-enabled"
                    checked={preferences.inApp?.soundEnabled || false}
                    onCheckedChange={(checked) => updatePreference('inApp', 'soundEnabled', checked)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Notification types</Label>
                {NOTIFICATION_TYPES.filter(type => type.id !== 'weekly_digest').map((type) => (
                  <div key={type.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{type.label}</div>
                      <div className="text-xs text-gray-500">{type.description}</div>
                    </div>
                    <Switch
                      checked={preferences.inApp?.types?.includes(type.id) || false}
                      onCheckedChange={() => toggleNotificationType('inApp', type.id)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Quiet Hours</span>
          </CardTitle>
          <CardDescription>
            Set times when you don't want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="quiet-hours-enabled">Enable quiet hours</Label>
            <Switch
              id="quiet-hours-enabled"
              checked={preferences.quietHours?.enabled || false}
              onCheckedChange={(checked) => updatePreference('quietHours', 'enabled', checked)}
            />
          </div>

          {preferences.quietHours?.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start time</Label>
                <Select
                  value={preferences.quietHours?.startTime || '22:00'}
                  onValueChange={(value) => updatePreference('quietHours', 'startTime', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, '0');
                      return (
                        <SelectItem key={hour} value={`${hour}:00`}>
                          {hour}:00
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>End time</Label>
                <Select
                  value={preferences.quietHours?.endTime || '08:00'}
                  onValueChange={(value) => updatePreference('quietHours', 'endTime', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, '0');
                      return (
                        <SelectItem key={hour} value={`${hour}:00`}>
                          {hour}:00
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Digest */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Volume2 className="h-5 w-5" />
            <span>Weekly Digest</span>
          </CardTitle>
          <CardDescription>
            Receive a weekly summary of your activity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="digest-enabled">Enable weekly digest</Label>
            <Switch
              id="digest-enabled"
              checked={preferences.weeklyDigest?.enabled || false}
              onCheckedChange={(checked) => updatePreference('weeklyDigest', 'enabled', checked)}
            />
          </div>

          {preferences.weeklyDigest?.enabled && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Day of week</Label>
                  <Select
                    value={preferences.weeklyDigest?.dayOfWeek?.toString() || '1'}
                    onValueChange={(value) => updatePreference('weeklyDigest', 'dayOfWeek', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Time</Label>
                  <Select
                    value={preferences.weeklyDigest?.time || '09:00'}
                    onValueChange={(value) => updatePreference('weeklyDigest', 'time', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="09:00">9:00 AM</SelectItem>
                      <SelectItem value="17:00">5:00 PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Include in digest</Label>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Portfolio updates</span>
                  <Switch
                    checked={preferences.weeklyDigest?.includePortfolio || false}
                    onCheckedChange={(checked) => updatePreference('weeklyDigest', 'includePortfolio', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Market news</span>
                  <Switch
                    checked={preferences.weeklyDigest?.includeMarketNews || false}
                    onCheckedChange={(checked) => updatePreference('weeklyDigest', 'includeMarketNews', checked)}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
};