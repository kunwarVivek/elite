import { useState, useEffect } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import {
  Building2,
  Users,
  DollarSign,
  Calendar,
  FileText,
  Download,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Mail,
  Phone,
  Clock,
} from 'lucide-react';

interface SpvDetails {
  id: string;
  name: string;
  slug: string;
  description: string;
  targetRaise: number;
  committed: number;
  minimumInvestment: number;
  maximumInvestment?: number;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'FUNDED';
  dealType: string;
  targetCompany: string;
  targetCompanyDescription: string;
  investorCount: number;
  deadline: Date;
  closingDate?: Date;
  managementFee: number;
  carriedInterest: number;
  setupCost: number;
  createdAt: Date;
  userRole: 'LEAD' | 'INVESTOR' | 'ADMIN' | null;
  userCommitment?: number;
  leadInvestor: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  documents: {
    id: string;
    name: string;
    type: string;
    size: number;
    uploadedAt: Date;
  }[];
  investors: {
    id: string;
    name: string;
    avatarUrl?: string;
    commitment: number;
    joinedAt: Date;
  }[];
  updates: {
    id: string;
    title: string;
    content: string;
    createdAt: Date;
  }[];
}

export default function SpvDetailsPage() {
  const { slug } = useParams({ from: '/spvs/$slug' });
  const [spv, setSpv] = useState<SpvDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'investors' | 'documents' | 'updates'>('overview');

  useEffect(() => {
    fetchSpvDetails();
  }, [slug]);

  const fetchSpvDetails = async () => {
    try {
      const response = await fetch(`/api/spvs/${slug}`);
      const data = await response.json();
      setSpv(data.data);
    } catch (error) {
      console.error('Failed to fetch SPV details:', error);
    } finally {
      setLoading(false);
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const calculateProgress = () => {
    if (!spv) return 0;
    return Math.min((spv.committed / spv.targetRaise) * 100, 100);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading SPV details...</p>
        </div>
      </div>
    );
  }

  if (!spv) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">SPV Not Found</h2>
          <p className="text-gray-600 mb-6">The SPV you're looking for doesn't exist or you don't have access.</p>
          <Link
            to="/spvs/dashboard"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            to="/spvs/dashboard"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{spv.name}</h1>
                <span className={`text-sm px-3 py-1 rounded-full font-medium ${getStatusColor(spv.status)}`}>
                  {spv.status}
                </span>
              </div>
              <p className="text-lg text-gray-600 mb-2">{spv.targetCompany}</p>
              <p className="text-sm text-gray-500">{spv.dealType}</p>
            </div>
            {spv.status === 'ACTIVE' && !spv.userCommitment && (
              <Link
                to={`/spvs/${spv.slug}/invest`}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
              >
                Invest Now
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Fundraising Progress</h2>
                <span className="text-2xl font-bold text-blue-600">
                  {calculateProgress().toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all"
                  style={{ width: `${calculateProgress()}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Committed</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(spv.committed)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Target</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(spv.targetRaise)}</p>
                </div>
              </div>
            </div>

            {/* User Commitment */}
            {spv.userCommitment && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Your Commitment</h3>
                </div>
                <p className="text-3xl font-bold text-blue-600 mb-2">{formatCurrency(spv.userCommitment)}</p>
                <p className="text-sm text-gray-600">
                  You've committed to this SPV. Thank you for your participation!
                </p>
              </div>
            )}

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="border-b">
                <div className="flex">
                  {(['overview', 'investors', 'documents', 'updates'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition ${
                        activeTab === tab
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">About the SPV</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">{spv.description}</p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Target Company</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">{spv.targetCompanyDescription}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Management Fee</p>
                        <p className="text-lg font-semibold text-gray-900">{spv.managementFee}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Carried Interest</p>
                        <p className="text-lg font-semibold text-gray-900">{spv.carriedInterest}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Setup Cost</p>
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(spv.setupCost)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Investors</p>
                        <p className="text-lg font-semibold text-gray-900">{spv.investorCount}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Investors Tab */}
                {activeTab === 'investors' && (
                  <div className="space-y-3">
                    {spv.investors.map((investor) => (
                      <div key={investor.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          {investor.avatarUrl ? (
                            <img src={investor.avatarUrl} alt={investor.name} className="w-10 h-10 rounded-full" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-semibold">
                                {investor.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{investor.name}</p>
                            <p className="text-sm text-gray-600">
                              Joined {new Date(investor.joinedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(investor.commitment)}</p>
                          <p className="text-xs text-gray-500">Committed</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Documents Tab */}
                {activeTab === 'documents' && (
                  <div className="space-y-3">
                    {spv.documents.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600">No documents available</p>
                      </div>
                    ) : (
                      spv.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-gray-600" />
                            <div>
                              <p className="font-medium text-gray-900">{doc.name}</p>
                              <p className="text-sm text-gray-600">
                                {formatFileSize(doc.size)} • {new Date(doc.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                            <Download className="h-5 w-5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Updates Tab */}
                {activeTab === 'updates' && (
                  <div className="space-y-4">
                    {spv.updates.length === 0 ? (
                      <div className="text-center py-8">
                        <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600">No updates yet</p>
                      </div>
                    ) : (
                      spv.updates.map((update) => (
                        <div key={update.id} className="border-b border-gray-200 pb-4 last:border-0">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900">{update.title}</h4>
                            <span className="text-sm text-gray-500">
                              {new Date(update.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap">{update.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Key Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Details</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Investment Range</p>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(spv.minimumInvestment)}
                      {spv.maximumInvestment && ` - ${formatCurrency(spv.maximumInvestment)}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Deadline</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(spv.deadline).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {spv.closingDate && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Expected Closing</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(spv.closingDate).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Investors</p>
                    <p className="font-semibold text-gray-900">{spv.investorCount} investors</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lead Investor */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Investor</h2>
              <div className="flex items-start gap-3">
                {spv.leadInvestor.avatarUrl ? (
                  <img
                    src={spv.leadInvestor.avatarUrl}
                    alt={spv.leadInvestor.name}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-purple-600 font-semibold text-lg">
                      {spv.leadInvestor.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-1">{spv.leadInvestor.name}</p>
                  <a
                    href={`mailto:${spv.leadInvestor.email}`}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Mail className="h-3 w-3" />
                    {spv.leadInvestor.email}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
