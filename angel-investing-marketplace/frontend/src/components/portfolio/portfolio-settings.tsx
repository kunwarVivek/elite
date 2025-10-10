import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Settings,
  Bell,
  Shield,
  Palette,
  Globe,
  Database,
  Save,
  RefreshCw,
  Info,
  Eye,
  EyeOff,
  Lock,
  Unlock
} from 'lucide-react'
import { usePortfolioSettings, useUpdatePortfolioSettings } from '@/hooks/use-portfolio'
import { useTheme } from '@/providers/ThemeProvider'
import { ThemeToggle } from './theme-toggle'
import { PortfolioSettings as PortfolioSettingsType } from '@/types/portfolio'

interface PortfolioSettingsProps {
  portfolioId: string
}

function NotificationSettings() {
  const [notifications, setNotifications] = useState({
    price_alerts: true,
    company_updates: true,
    exit_opportunities: false,
    portfolio_reports: true,
    weekly_summary: true,
    market_news: false
  })

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose what notifications you want to receive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Price Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about significant price changes
              </p>
            </div>
            <Switch
              checked={notifications.price_alerts}
              onCheckedChange={(checked) => handleNotificationChange('price_alerts', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Company Updates</Label>
              <p className="text-sm text-muted-foreground">
                Receive updates from portfolio companies
              </p>
            </div>
            <Switch
              checked={notifications.company_updates}
              onCheckedChange={(checked) => handleNotificationChange('company_updates', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Exit Opportunities</Label>
              <p className="text-sm text-muted-foreground">
                Notifications about potential exit opportunities
              </p>
            </div>
            <Switch
              checked={notifications.exit_opportunities}
              onCheckedChange={(checked) => handleNotificationChange('exit_opportunities', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Portfolio Reports</Label>
              <p className="text-sm text-muted-foreground">
                Weekly and monthly portfolio performance reports
              </p>
            </div>
            <Switch
              checked={notifications.portfolio_reports}
              onCheckedChange={(checked) => handleNotificationChange('portfolio_reports', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Weekly Summary</Label>
              <p className="text-sm text-muted-foreground">
                Weekly summary of portfolio activity
              </p>
            </div>
            <Switch
              checked={notifications.weekly_summary}
              onCheckedChange={(checked) => handleNotificationChange('weekly_summary', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Market News</Label>
              <p className="text-sm text-muted-foreground">
                Relevant market news and insights
              </p>
            </div>
            <Switch
              checked={notifications.market_news}
              onCheckedChange={(checked) => handleNotificationChange('market_news', checked)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PrivacySettings() {
  const [privacy, setPrivacy] = useState({
    show_portfolio_publicly: false,
    show_performance_publicly: false,
    allow_contact_from_founders: true,
    share_anonymized_data: false
  })

  const handlePrivacyChange = (key: string, value: boolean) => {
    setPrivacy(prev => ({ ...prev, [key]: value }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Privacy & Security
        </CardTitle>
        <CardDescription>
          Control who can see your portfolio information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Public Portfolio</Label>
              <p className="text-sm text-muted-foreground">
                Allow others to view your portfolio composition
              </p>
            </div>
            <div className="flex items-center gap-2">
              {privacy.show_portfolio_publicly ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              <Switch
                checked={privacy.show_portfolio_publicly}
                onCheckedChange={(checked) => handlePrivacyChange('show_portfolio_publicly', checked)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Public Performance</Label>
              <p className="text-sm text-muted-foreground">
                Show performance metrics to other users
              </p>
            </div>
            <div className="flex items-center gap-2">
              {privacy.show_performance_publicly ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              <Switch
                checked={privacy.show_performance_publicly}
                onCheckedChange={(checked) => handlePrivacyChange('show_performance_publicly', checked)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Founder Contact</Label>
              <p className="text-sm text-muted-foreground">
                Allow startup founders to contact you directly
              </p>
            </div>
            <Switch
              checked={privacy.allow_contact_from_founders}
              onCheckedChange={(checked) => handlePrivacyChange('allow_contact_from_founders', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Analytics Data</Label>
              <p className="text-sm text-muted-foreground">
                Share anonymized data to improve platform insights
              </p>
            </div>
            <Switch
              checked={privacy.share_anonymized_data}
              onCheckedChange={(checked) => handlePrivacyChange('share_anonymized_data', checked)}
            />
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Your personal information and investment amounts are always kept private.
            Only aggregated or explicitly shared data is visible to others.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}

function DisplaySettings() {
  const { theme, setTheme } = useTheme()
  const [settings, setSettings] = useState({
    default_view: 'overview',
    currency: 'USD',
    date_format: 'MM/DD/YYYY',
    number_format: '1,234.56',
    chart_colors: 'default',
    compact_mode: false,
    animations_enabled: true
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Display & Appearance
        </CardTitle>
        <CardDescription>
          Customize how your portfolio data is displayed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Default View</Label>
            <Select
              value={settings.default_view}
              onValueChange={(value) => setSettings(prev => ({ ...prev, default_view: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Overview</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="allocations">Allocations</SelectItem>
                <SelectItem value="analytics">Analytics</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <Select
              value={settings.currency}
              onValueChange={(value) => setSettings(prev => ({ ...prev, currency: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="GBP">GBP (£)</SelectItem>
                <SelectItem value="CAD">CAD (C$)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date Format</Label>
            <Select
              value={settings.date_format}
              onValueChange={(value) => setSettings(prev => ({ ...prev, date_format: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Chart Theme</Label>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <span className="text-sm text-muted-foreground">Theme</span>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Compact Mode</Label>
              <p className="text-sm text-muted-foreground">
                Show more information in less space
              </p>
            </div>
            <Switch
              checked={settings.compact_mode}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, compact_mode: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Animations</Label>
              <p className="text-sm text-muted-foreground">
                Smooth transitions and chart animations
              </p>
            </div>
            <Switch
              checked={settings.animations_enabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, animations_enabled: checked }))}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DataSettings() {
  const [dataSettings, setDataSettings] = useState({
    auto_refresh: true,
    refresh_interval: 300, // 5 minutes
    cache_data: true,
    offline_mode: false,
    data_retention: 365 // days
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data & Performance
        </CardTitle>
        <CardDescription>
          Configure data refresh and caching preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Auto Refresh</Label>
            <div className="flex items-center gap-2">
              <Switch
                checked={dataSettings.auto_refresh}
                onCheckedChange={(checked) => setDataSettings(prev => ({ ...prev, auto_refresh: checked }))}
              />
              <span className="text-sm">Automatically refresh portfolio data</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Refresh Interval</Label>
            <Select
              value={dataSettings.refresh_interval.toString()}
              onValueChange={(value) => setDataSettings(prev => ({ ...prev, refresh_interval: parseInt(value) }))}
              disabled={!dataSettings.auto_refresh}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="60">1 minute</SelectItem>
                <SelectItem value="300">5 minutes</SelectItem>
                <SelectItem value="900">15 minutes</SelectItem>
                <SelectItem value="3600">1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Cache Data</Label>
              <p className="text-sm text-muted-foreground">
                Store portfolio data locally for faster loading
              </p>
            </div>
            <Switch
              checked={dataSettings.cache_data}
              onCheckedChange={(checked) => setDataSettings(prev => ({ ...prev, cache_data: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Offline Mode</Label>
              <p className="text-sm text-muted-foreground">
                Access cached data when offline
              </p>
            </div>
            <Switch
              checked={dataSettings.offline_mode}
              onCheckedChange={(checked) => setDataSettings(prev => ({ ...prev, offline_mode: checked }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Data Retention (days)</Label>
            <Select
              value={dataSettings.data_retention.toString()}
              onValueChange={(value) => setDataSettings(prev => ({ ...prev, data_retention: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">180 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
                <SelectItem value="730">2 years</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function PortfolioSettings({ portfolioId }: PortfolioSettingsProps) {
  const { data: settings, isLoading } = usePortfolioSettings()
  const updateSettingsMutation = useUpdatePortfolioSettings()

  const [activeTab, setActiveTab] = useState('notifications')

  const handleSaveSettings = async () => {
    try {
      await updateSettingsMutation.mutateAsync({
        default_view: 'overview',
        currency: 'USD',
        risk_tolerance: 'moderate',
        notifications: {
          price_alerts: true,
          company_updates: true,
          exit_opportunities: false,
          portfolio_reports: true
        },
        privacy: {
          show_portfolio_publicly: false,
          show_performance_publicly: false,
          allow_contact_from_founders: true
        }
      } as PortfolioSettingsType)
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-48 w-full bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Portfolio Settings
          </CardTitle>
          <CardDescription>
            Customize your portfolio experience and preferences
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="display">Display</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-6">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <PrivacySettings />
        </TabsContent>

        <TabsContent value="display" className="space-y-6">
          <DisplaySettings />
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <DataSettings />
        </TabsContent>
      </Tabs>

      <Card>
        <CardContent className="flex items-center justify-between pt-6">
          <div className="text-sm text-muted-foreground">
            Settings are automatically saved as you make changes
          </div>
          <Button onClick={handleSaveSettings} disabled={updateSettingsMutation.isPending}>
            {updateSettingsMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}