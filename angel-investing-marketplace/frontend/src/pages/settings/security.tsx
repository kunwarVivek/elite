import { useState, useEffect } from 'react';
import { Lock, Shield, Smartphone, Monitor, MapPin, Clock, AlertCircle, CheckCircle, X } from 'lucide-react';

interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  ipAddress: string;
  lastActive: Date;
  isCurrent: boolean;
}

interface LoginHistory {
  id: string;
  timestamp: Date;
  device: string;
  browser: string;
  location: string;
  ipAddress: string;
  success: boolean;
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  twoFactorMethod: 'SMS' | 'APP' | null;
  lastPasswordChange: Date;
  activeSessions: ActiveSession[];
  loginHistory: LoginHistory[];
}

export default function SecuritySettingsPage() {
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    fetchSecuritySettings();
  }, []);

  const fetchSecuritySettings = async () => {
    try {
      const response = await fetch('/api/users/security-settings');
      const data = await response.json();
      setSettings(data.data);
    } catch (error) {
      console.error('Failed to fetch security settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    try {
      await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      setPasswordSuccess(true);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordChange(false);
      fetchSecuritySettings();
    } catch (error) {
      setPasswordError('Failed to change password. Please check your current password.');
    }
  };

  const handleEnable2FA = async () => {
    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
      });
      const data = await response.json();
      setQrCode(data.data.qrCode);
      setShow2FASetup(true);
    } catch (error) {
      console.error('Failed to setup 2FA:', error);
    }
  };

  const handleVerify2FA = async () => {
    try {
      await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode }),
      });

      setShow2FASetup(false);
      setVerificationCode('');
      setQrCode(null);
      fetchSecuritySettings();
    } catch (error) {
      console.error('Failed to verify 2FA:', error);
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication?')) {
      return;
    }

    try {
      await fetch('/api/auth/2fa/disable', {
        method: 'POST',
      });
      fetchSecuritySettings();
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await fetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      fetchSecuritySettings();
    } catch (error) {
      console.error('Failed to revoke session:', error);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!confirm('This will log you out from all other devices. Continue?')) {
      return;
    }

    try {
      await fetch('/api/auth/sessions/revoke-all', {
        method: 'POST',
      });
      fetchSecuritySettings();
    } catch (error) {
      console.error('Failed to revoke sessions:', error);
    }
  };

  if (loading || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading security settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Security Settings</h1>
          <p className="mt-2 text-gray-600">Manage your account security and authentication</p>
        </div>

        <div className="space-y-6">
          {/* Password */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Password
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">
                  Last changed:{' '}
                  {new Date(settings.lastPasswordChange).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>

              {!showPasswordChange ? (
                <button
                  onClick={() => setShowPasswordChange(true)}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                >
                  Change Password
                </button>
              ) : (
                <form onSubmit={handlePasswordChange} className="border border-gray-200 rounded-lg p-4 space-y-4">
                  {passwordError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">{passwordError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                      }
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      required
                      minLength={8}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                      }
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                    >
                      Update Password
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordChange(false);
                        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        setPasswordError('');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {passwordSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Password changed successfully</span>
                </div>
              )}
            </div>
          </div>

          {/* Two-Factor Authentication */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Two-Factor Authentication
            </h2>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-900 font-medium mb-1">
                    {settings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {settings.twoFactorEnabled
                      ? `Using ${settings.twoFactorMethod === 'APP' ? 'authenticator app' : 'SMS'}`
                      : 'Add an extra layer of security to your account'}
                  </p>
                </div>
                <div>
                  {settings.twoFactorEnabled ? (
                    <button
                      onClick={handleDisable2FA}
                      className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition"
                    >
                      Disable
                    </button>
                  ) : (
                    <button
                      onClick={handleEnable2FA}
                      className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                    >
                      Enable 2FA
                    </button>
                  )}
                </div>
              </div>

              {show2FASetup && qrCode && (
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Setup Two-Factor Authentication</h3>
                  <ol className="text-sm text-gray-700 space-y-2 mb-4">
                    <li>1. Download an authenticator app (Google Authenticator, Authy, etc.)</li>
                    <li>2. Scan this QR code with your app</li>
                    <li>3. Enter the 6-digit code from your app</li>
                  </ol>
                  <div className="flex justify-center mb-4">
                    <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 border-4 border-white rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Verification Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="000000"
                        maxLength={6}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-lg font-mono"
                      />
                      <button
                        onClick={handleVerify2FA}
                        disabled={verificationCode.length !== 6}
                        className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        Verify
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active Sessions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Active Sessions
              </h2>
              {settings.activeSessions.length > 1 && (
                <button
                  onClick={handleRevokeAllSessions}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Revoke All
                </button>
              )}
            </div>
            <div className="space-y-3">
              {settings.activeSessions.map((session) => (
                <div
                  key={session.id}
                  className={`border rounded-lg p-4 ${
                    session.isCurrent ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Monitor className="h-4 w-4 text-gray-600" />
                        <span className="font-medium text-gray-900">{session.device}</span>
                        {session.isCurrent && (
                          <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>{session.browser}</p>
                        <p className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {session.location} • {session.ipAddress}
                        </p>
                        <p className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last active:{' '}
                          {new Date(session.lastActive).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    {!session.isCurrent && (
                      <button
                        onClick={() => handleRevokeSession(session.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                        title="Revoke session"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Login History */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Login Activity
            </h2>
            <div className="space-y-3">
              {settings.loginHistory.slice(0, 10).map((login) => (
                <div key={login.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {login.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className={`text-sm font-medium ${login.success ? 'text-gray-900' : 'text-red-600'}`}>
                          {login.success ? 'Successful login' : 'Failed login attempt'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          {new Date(login.timestamp).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p>{login.device} • {login.browser}</p>
                        <p className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {login.location} • {login.ipAddress}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
