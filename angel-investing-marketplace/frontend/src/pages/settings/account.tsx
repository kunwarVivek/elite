import { useState, useEffect } from 'react';
import { User, Mail, Download, Trash2, Save, AlertCircle, Shield, Eye, EyeOff } from 'lucide-react';

interface AccountSettings {
  email: string;
  username: string;
  emailVerified: boolean;
  accountCreatedAt: Date;
  privacy: {
    profileVisibility: 'PUBLIC' | 'PRIVATE' | 'INVESTORS_ONLY';
    showInvestmentHistory: boolean;
    showPortfolio: boolean;
    allowMessaging: boolean;
  };
}

export default function AccountSettingsPage() {
  const [settings, setSettings] = useState<AccountSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchAccountSettings();
  }, []);

  const fetchAccountSettings = async () => {
    try {
      const response = await fetch('/api/users/account-settings');
      const data = await response.json();
      setSettings(data.data);
    } catch (error) {
      console.error('Failed to fetch account settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      setSaving(true);
      await fetch('/api/users/account-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      setExporting(true);
      const response = await fetch('/api/users/export-data', {
        method: 'POST',
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `account-data-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE MY ACCOUNT') {
      return;
    }

    try {
      await fetch('/api/users/me', {
        method: 'DELETE',
      });
      // Redirect to logout
      window.location.href = '/logout';
    } catch (error) {
      console.error('Failed to delete account:', error);
    }
  };

  if (loading || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading account settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="mt-2 text-gray-600">Manage your account preferences and privacy settings</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Account Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={settings.email}
                    disabled
                    className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {settings.emailVerified ? (
                    <span className="flex items-center text-sm text-green-600">
                      <Shield className="h-4 w-4 mr-1" />
                      Email verified
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Verify email
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={settings.username}
                    onChange={(e) => setSettings({ ...settings, username: e.target.value })}
                    className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Member Since</label>
                <p className="text-gray-900">
                  {new Date(settings.accountCreatedAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Privacy Settings
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Visibility
                </label>
                <select
                  value={settings.privacy.profileVisibility}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      privacy: {
                        ...settings.privacy,
                        profileVisibility: e.target.value as 'PUBLIC' | 'PRIVATE' | 'INVESTORS_ONLY',
                      },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PUBLIC">Public - Anyone can view</option>
                  <option value="INVESTORS_ONLY">Investors Only - Only verified investors</option>
                  <option value="PRIVATE">Private - Only me</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Show Investment History</span>
                    <p className="text-xs text-gray-500">Allow others to see your past investments</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        privacy: {
                          ...settings.privacy,
                          showInvestmentHistory: !settings.privacy.showInvestmentHistory,
                        },
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                      settings.privacy.showInvestmentHistory ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        settings.privacy.showInvestmentHistory ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>

                <label className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Show Portfolio</span>
                    <p className="text-xs text-gray-500">Display your portfolio publicly</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        privacy: {
                          ...settings.privacy,
                          showPortfolio: !settings.privacy.showPortfolio,
                        },
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                      settings.privacy.showPortfolio ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        settings.privacy.showPortfolio ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>

                <label className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Allow Messaging</span>
                    <p className="text-xs text-gray-500">Let other users send you messages</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        privacy: {
                          ...settings.privacy,
                          allowMessaging: !settings.privacy.allowMessaging,
                        },
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                      settings.privacy.allowMessaging ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        settings.privacy.allowMessaging ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>
              </div>
            </div>
          </div>

          {/* Data Export */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Download className="h-5 w-5" />
              Data Export
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Download a copy of all your data including profile information, investments, and activity history.
            </p>
            <button
              type="button"
              onClick={handleExportData}
              disabled={exporting}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export My Data
                </>
              )}
            </button>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-lg shadow-sm border-2 border-red-200 p-6">
            <h2 className="text-lg font-semibold text-red-600 mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Danger Zone
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Delete Account</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete My Account
                  </button>
                ) : (
                  <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
                    <p className="text-sm font-medium text-red-800 mb-3">
                      Are you absolutely sure? Type "DELETE MY ACCOUNT" to confirm:
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE MY ACCOUNT"
                      className="w-full px-4 py-2 border border-red-300 rounded-lg mb-3 focus:ring-2 focus:ring-red-500"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== 'DELETE MY ACCOUNT'}
                        className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        Confirm Deletion
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText('');
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-4">
            {saved && (
              <span className="text-green-600 font-medium flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Settings saved
              </span>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
