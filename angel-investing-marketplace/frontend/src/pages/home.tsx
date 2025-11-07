import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  TrendingUp,
  Briefcase,
  Users,
  DollarSign,
  Bell,
  ArrowRight,
  Activity,
  Target,
  Award,
  Calendar,
} from 'lucide-react';

interface DashboardStats {
  totalInvestments: number;
  portfolioValue: number;
  activeInvestments: number;
  totalReturn: number;
  syndicatesJoined: number;
  unreadNotifications: number;
}

interface RecentActivity {
  id: string;
  type: 'investment' | 'update' | 'trade' | 'syndicate';
  title: string;
  description: string;
  timestamp: Date;
  amount?: number;
}

interface QuickAction {
  title: string;
  description: string;
  icon: any;
  link: string;
  color: string;
}

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch user info
      const userRes = await fetch('/api/users/me');
      const userData = await userRes.json();
      setUser(userData.data);

      // Fetch dashboard stats
      const statsRes = await fetch('/api/dashboard/stats');
      const statsData = await statsRes.json();
      setStats(statsData.data);

      // Fetch recent activity
      const activityRes = await fetch('/api/dashboard/activity?limit=5');
      const activityData = await activityRes.json();
      setRecentActivity(activityData.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions: QuickAction[] =
    user?.role === 'FOUNDER'
      ? [
          {
            title: 'Create Pitch',
            description: 'Launch your fundraising campaign',
            icon: Target,
            link: '/pitches/create',
            color: 'blue',
          },
          {
            title: 'Post Update',
            description: 'Share news with your investors',
            icon: Calendar,
            link: '/updates/create',
            color: 'green',
          },
          {
            title: 'Manage Pitch',
            description: 'View and edit your pitches',
            icon: Briefcase,
            link: '/pitches/dashboard',
            color: 'purple',
          },
          {
            title: 'View Analytics',
            description: 'Track investor engagement',
            icon: Activity,
            link: '/pitches/analytics',
            color: 'orange',
          },
        ]
      : [
          {
            title: 'Browse Investments',
            description: 'Discover new opportunities',
            icon: TrendingUp,
            link: '/investments/marketplace',
            color: 'blue',
          },
          {
            title: 'My Portfolio',
            description: 'Track your investments',
            icon: Briefcase,
            link: '/portfolio/dashboard',
            color: 'green',
          },
          {
            title: 'Browse Syndicates',
            description: 'Join investment groups',
            icon: Users,
            link: '/syndicates/browse',
            color: 'purple',
          },
          {
            title: 'Secondary Market',
            description: 'Trade shares',
            icon: DollarSign,
            link: '/marketplace/browse-shares',
            color: 'orange',
          },
        ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'investment':
        return <DollarSign className="h-5 w-5 text-blue-600" />;
      case 'update':
        return <Bell className="h-5 w-5 text-green-600" />;
      case 'trade':
        return <TrendingUp className="h-5 w-5 text-purple-600" />;
      case 'syndicate':
        return <Users className="h-5 w-5 text-orange-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user?.name || 'User'}! 👋
              </h1>
              <p className="mt-1 text-gray-600">
                {user?.role === 'FOUNDER'
                  ? "Manage your fundraising and investor relationships"
                  : "Here's what's happening with your investments"}
              </p>
            </div>
            <Link
              to="/notifications"
              className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              <Bell className="h-6 w-6" />
              {stats && stats.unreadNotifications > 0 && (
                <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center">
                  {stats.unreadNotifications}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        {user?.role !== 'FOUNDER' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Portfolio Value</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(stats.portfolioValue)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Briefcase className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-sm text-green-600 font-medium">
                  {formatPercentage(stats.totalReturn)}
                </span>
                <span className="text-sm text-gray-600 ml-2">total return</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Investments</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stats.activeInvestments}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-sm text-gray-600">
                  {stats.totalInvestments} total investments
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Syndicates Joined</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stats.syndicatesJoined}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-4">
                <Link
                  to="/syndicates/browse"
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  Browse more →
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Notifications</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stats.unreadNotifications}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Bell className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <div className="mt-4">
                <Link
                  to="/notifications"
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  View all →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link
                  key={index}
                  to={action.link}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition group"
                >
                  <div className={`p-3 bg-${action.color}-100 rounded-lg inline-block mb-4`}>
                    <Icon className={`h-6 w-6 text-${action.color}-600`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                  <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
                    Get started
                    <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
            <Link
              to="/social/activity"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all activity →
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {recentActivity.length === 0 ? (
              <div className="p-12 text-center">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No recent activity</p>
                <p className="text-sm text-gray-500 mt-2">
                  {user?.role === 'FOUNDER'
                    ? 'Start by creating your first pitch'
                    : 'Start by browsing investment opportunities'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="p-6 hover:bg-gray-50 transition flex items-start"
                  >
                    <div className="flex-shrink-0 mt-1">{getActivityIcon(activity.type)}</div>
                    <div className="ml-4 flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                          <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                        </div>
                        {activity.amount && (
                          <span className="text-sm font-semibold text-gray-900 ml-4">
                            {formatCurrency(activity.amount)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(activity.timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
