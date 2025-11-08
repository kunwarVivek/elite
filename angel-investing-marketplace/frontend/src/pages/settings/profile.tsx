import { useState, useEffect } from 'react';
import { User, Mail, Phone, Briefcase, MapPin, Save, Upload, CheckCircle } from 'lucide-react';

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  bio: string;
  location: string;
  avatarUrl: string;
  role: 'INVESTOR' | 'FOUNDER' | 'ADMIN';
  investorProfile?: {
    investmentFocus: string[];
    ticketSize: string;
    sectors: string[];
  };
}

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/users/me');
      const data = await response.json();
      setProfile(data.data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setSaving(true);

      // Upload avatar if changed
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        const uploadRes = await fetch('/api/users/avatar', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        profile.avatarUrl = uploadData.data.url;
      }

      // Update profile
      await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="mt-2 text-gray-600">Manage your personal information and preferences</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Avatar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Photo</h2>
            <div className="flex items-center gap-6">
              <div className="relative">
                {profile.avatarUrl || avatarFile ? (
                  <img
                    src={avatarFile ? URL.createObjectURL(avatarFile) : profile.avatarUrl}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-12 w-12 text-blue-600" />
                  </div>
                )}
              </div>
              <div>
                <label className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Photo
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
                <p className="mt-2 text-sm text-gray-500">JPG, PNG or GIF. Max 5MB.</p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500">Email cannot be changed here. Contact support to change.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={profile.location}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    placeholder="City, Country"
                    className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  rows={4}
                  placeholder="Tell us about yourself..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-sm text-gray-500">Brief description for your profile. Max 500 characters.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    value={profile.role}
                    disabled
                    className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  >
                    <option value="INVESTOR">Investor</option>
                    <option value="FOUNDER">Founder</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <p className="mt-1 text-sm text-gray-500">Role cannot be changed. Contact support if needed.</p>
              </div>
            </div>
          </div>

          {/* Investor Preferences */}
          {profile.role === 'INVESTOR' && profile.investorProfile && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Investment Preferences</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Typical Ticket Size
                  </label>
                  <select
                    value={profile.investorProfile.ticketSize}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        investorProfile: { ...profile.investorProfile!, ticketSize: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="$1K-$5K">$1K - $5K</option>
                    <option value="$5K-$25K">$5K - $25K</option>
                    <option value="$25K-$100K">$25K - $100K</option>
                    <option value="$100K+">$100K+</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sectors of Interest
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['SaaS', 'FinTech', 'HealthTech', 'E-commerce', 'AI/ML', 'Blockchain', 'Consumer', 'Enterprise'].map(
                      (sector) => (
                        <label key={sector} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={profile.investorProfile?.sectors.includes(sector)}
                            onChange={(e) => {
                              const sectors = e.target.checked
                                ? [...(profile.investorProfile?.sectors || []), sector]
                                : profile.investorProfile?.sectors.filter((s) => s !== sector) || [];
                              setProfile({
                                ...profile,
                                investorProfile: { ...profile.investorProfile!, sectors },
                              });
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{sector}</span>
                        </label>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex items-center justify-end gap-4">
            {saved && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Profile updated</span>
              </div>
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
