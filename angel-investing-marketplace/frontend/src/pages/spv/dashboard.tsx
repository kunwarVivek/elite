import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
  FileText,
  ArrowRight,
  Filter,
  Search,
} from 'lucide-react';

interface Spv {
  id: string;
  name: string;
  slug: string;
  targetRaise: number;
  committed: number;
  investorCount: number;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'FUNDED';
  dealType: string;
  targetCompany: string;
  minimumInvestment: number;
  deadline: Date;
  managementFee: number;
  carriedInterest: number;
  createdAt: Date;
  userRole: 'LEAD' | 'INVESTOR' | 'ADMIN';
  userCommitment?: number;
}

type StatusFilter = 'all' | 'ACTIVE' | 'CLOSED' | 'FUNDED';

export default function SpvDashboardPage() {
  const [spvs, setSpvs] = useState<Spv[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSpvs();
  }, [filter]);

  const fetchSpvs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter);
      }

      const response = await fetch(`/api/spvs/my-spvs?${params.toString()}`);
      const data = await response.json();
      setSpvs(data.data || []);
    } catch (error) {
      console.error('Failed to fetch SPVs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800';
      case 'FUNDED':
        return 'bg-blue-100 text-blue-800';
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'LEAD':
        return 'bg-purple-100 text-purple-800';
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
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

  const calculateProgress = (committed: number, target: number) => {
    return Math.min((committed / target) * 100, 100);
  };

  const filteredSpvs = spvs.filter((spv) =>
    spv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    spv.targetCompany.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCommitted = spvs.reduce((sum, spv) => sum + (spv.userCommitment || 0), 0);
  const activeCount = spvs.filter((s) => s.status === 'ACTIVE').length;
  const leadingCount = spvs.filter((s) => s.userRole === 'LEAD').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading SPV dashboard...</p>
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
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Building2 className="h-8 w-8 text-blue-600" />
                My SPVs
              </h1>
              <p className="mt-1 text-gray-600">Manage your Special Purpose Vehicles</p>
            </div>
            <Link
              to="/spvs/create"
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Building2 className="h-5 w-5" />
              Create SPV
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Committed</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalCommitted)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">Across {spvs.length} SPVs</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active SPVs</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{activeCount}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">Currently fundraising</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Leading</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{leadingCount}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">SPVs you lead</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search SPVs..."
                className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-600" />
              <div className="flex gap-2">
                {(['all', 'ACTIVE', 'CLOSED', 'FUNDED'] as StatusFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      filter === f
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {f === 'all' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SPV List */}
        {filteredSpvs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No SPVs found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery
                ? 'Try adjusting your search criteria'
                : "You haven't joined or created any SPVs yet"}
            </p>
            <Link
              to="/spvs/browse"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
            >
              Browse SPVs
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredSpvs.map((spv) => (
              <Link
                key={spv.id}
                to={`/spvs/${spv.slug}`}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition">
                        {spv.name}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(spv.status)}`}>
                        {spv.status}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleColor(spv.userRole)}`}>
                        {spv.userRole}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{spv.targetCompany}</p>
                    <p className="text-xs text-gray-500">{spv.dealType}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(spv.committed)} / {formatCurrency(spv.targetRaise)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${calculateProgress(spv.committed, spv.targetRaise)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {calculateProgress(spv.committed, spv.targetRaise).toFixed(1)}% funded
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b">
                  <div>
                    <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                      <Users className="h-3 w-3" />
                      Investors
                    </div>
                    <p className="text-lg font-semibold text-gray-900">{spv.investorCount}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                      <DollarSign className="h-3 w-3" />
                      Min Investment
                    </div>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(spv.minimumInvestment)}</p>
                  </div>
                </div>

                {/* User Commitment */}
                {spv.userCommitment && (
                  <div className="bg-blue-50 rounded-lg p-3 mb-4">
                    <p className="text-xs text-gray-600 mb-1">Your Commitment</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(spv.userCommitment)}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Deadline: {new Date(spv.deadline).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                  <div className="flex items-center gap-4">
                    <span>{spv.managementFee}% mgmt fee</span>
                    <span>{spv.carriedInterest}% carry</span>
                  </div>
                </div>

                {/* View Details */}
                <div className="mt-4 pt-4 border-t flex items-center justify-end text-blue-600 font-medium text-sm group-hover:translate-x-1 transition">
                  View Details
                  <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
