import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from '@tanstack/react-router';
import {
  Users,
  DollarSign,
  TrendingUp,
  Shield,
  Calendar,
  Award,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface Syndicate {
  id: string;
  name: string;
  slug: string;
  description: string;
  focus: string[];
  minimumInvestment: number;
  memberCount: number;
  totalDeployed: number;
  averageReturn: number;
  dealsCompleted: number;
  status: 'ACTIVE' | 'CLOSED' | 'INVITE_ONLY';
  leadInvestor: {
    id: string;
    name: string;
    bio: string;
    avatarUrl?: string;
    trackRecord: string;
  };
  benefits: string[];
  requirements: string[];
  fees: {
    managementFee: number;
    carriedInterest: number;
    setupFee?: number;
  };
  membershipType: 'OPEN' | 'APPLICATION' | 'INVITE_ONLY';
  isMember: boolean;
  hasApplied: boolean;
}

export default function JoinSyndicatePage() {
  const { slug } = useParams({ from: '/syndicates/$slug/join' });
  const navigate = useNavigate();
  const [syndicate, setSyndicate] = useState<Syndicate | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetchSyndicate();
  }, [slug]);

  const fetchSyndicate = async () => {
    try {
      const response = await fetch(`/api/syndicates/${slug}`);
      const data = await response.json();
      setSyndicate(data.data);
    } catch (error) {
      console.error('Failed to fetch syndicate:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!syndicate) return;

    if (syndicate.membershipType === 'OPEN') {
      // Direct join - proceed to commitment
      navigate({ to: `/syndicates/${syndicate.slug}/commit` });
    } else if (syndicate.membershipType === 'APPLICATION') {
      // Apply to join
      try {
        setJoining(true);
        await fetch(`/api/syndicates/${syndicate.id}/apply`, {
          method: 'POST',
        });
        alert('Application submitted! The lead investor will review and respond soon.');
        fetchSyndicate();
      } catch (error) {
        console.error('Failed to apply:', error);
      } finally {
        setJoining(false);
      }
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
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading syndicate...</p>
        </div>
      </div>
    );
  }

  if (!syndicate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Syndicate Not Found</h2>
          <p className="text-gray-600 mb-6">The syndicate you're looking for doesn't exist.</p>
          <Link
            to="/syndicates/browse"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Browse Syndicates
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
            to="/syndicates/browse"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Browse
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{syndicate.name}</h1>
              <p className="text-lg text-gray-600">{syndicate.description}</p>
            </div>
            {syndicate.isMember ? (
              <span className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 font-semibold rounded-lg">
                <CheckCircle className="h-5 w-5" />
                Member
              </span>
            ) : syndicate.hasApplied ? (
              <span className="px-4 py-2 bg-yellow-100 text-yellow-800 font-semibold rounded-lg">
                Application Pending
              </span>
            ) : (
              <span className={`px-4 py-2 rounded-lg font-semibold ${
                syndicate.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-800'
                  : syndicate.status === 'INVITE_ONLY'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {syndicate.status === 'INVITE_ONLY' ? 'Invite Only' : syndicate.status}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                  <Users className="h-4 w-4" />
                  Members
                </div>
                <p className="text-2xl font-bold text-gray-900">{syndicate.memberCount}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                  <DollarSign className="h-4 w-4" />
                  Deployed
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(syndicate.totalDeployed)}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                  <TrendingUp className="h-4 w-4" />
                  Avg Return
                </div>
                <p className="text-2xl font-bold text-green-600">{formatPercentage(syndicate.averageReturn)}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                  <Award className="h-4 w-4" />
                  Deals
                </div>
                <p className="text-2xl font-bold text-gray-900">{syndicate.dealsCompleted}</p>
              </div>
            </div>

            {/* About */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">About This Syndicate</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Investment Focus</h3>
                  <div className="flex flex-wrap gap-2">
                    {syndicate.focus.map((item, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Lead Investor */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Lead Investor</h2>
              <div className="flex items-start gap-4">
                {syndicate.leadInvestor.avatarUrl ? (
                  <img
                    src={syndicate.leadInvestor.avatarUrl}
                    alt={syndicate.leadInvestor.name}
                    className="w-16 h-16 rounded-full"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-purple-600 font-semibold text-xl">
                      {syndicate.leadInvestor.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{syndicate.leadInvestor.name}</h3>
                  <p className="text-gray-700 mb-3">{syndicate.leadInvestor.bio}</p>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-sm font-semibold text-gray-900 mb-1">Track Record</p>
                    <p className="text-sm text-gray-700">{syndicate.leadInvestor.trackRecord}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                Member Benefits
              </h2>
              <ul className="space-y-3">
                {syndicate.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Requirements */}
            {syndicate.requirements.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Shield className="h-6 w-6 text-blue-600" />
                  Membership Requirements
                </h2>
                <ul className="space-y-3">
                  {syndicate.requirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Join CTA */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Join This Syndicate</h2>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between pb-3 border-b">
                  <span className="text-gray-600">Minimum Investment</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(syndicate.minimumInvestment)}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Fees</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Management Fee</span>
                      <span className="font-semibold text-gray-900">{syndicate.fees.managementFee}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Carried Interest</span>
                      <span className="font-semibold text-gray-900">{syndicate.fees.carriedInterest}%</span>
                    </div>
                    {syndicate.fees.setupFee && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Setup Fee</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(syndicate.fees.setupFee)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {syndicate.isMember ? (
                <Link
                  to={`/syndicates/${syndicate.slug}`}
                  className="w-full px-6 py-3 bg-gray-100 text-gray-800 font-semibold rounded-lg text-center block hover:bg-gray-200 transition"
                >
                  View Syndicate Dashboard
                </Link>
              ) : syndicate.hasApplied ? (
                <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 font-medium">Application Under Review</p>
                  <p className="text-sm text-yellow-600 mt-1">You'll be notified once reviewed</p>
                </div>
              ) : syndicate.status === 'INVITE_ONLY' ? (
                <div className="text-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-purple-800 font-medium">Invite Only</p>
                  <p className="text-sm text-purple-600 mt-1">Contact the lead investor for an invitation</p>
                </div>
              ) : syndicate.status === 'CLOSED' ? (
                <div className="text-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-gray-800 font-medium">Closed</p>
                  <p className="text-sm text-gray-600 mt-1">This syndicate is not accepting new members</p>
                </div>
              ) : (
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {joining ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      {syndicate.membershipType === 'OPEN' ? 'Join Now' : 'Apply to Join'}
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              )}

              <p className="text-xs text-gray-500 text-center mt-4">
                By joining, you agree to the syndicate terms and fee structure
              </p>
            </div>

            {/* Membership Type Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    {syndicate.membershipType === 'OPEN'
                      ? 'Open Membership'
                      : syndicate.membershipType === 'APPLICATION'
                      ? 'Application Required'
                      : 'Invite Only'}
                  </p>
                  <p className="text-sm text-blue-800">
                    {syndicate.membershipType === 'OPEN'
                      ? 'Anyone can join this syndicate immediately'
                      : syndicate.membershipType === 'APPLICATION'
                      ? 'Applications are reviewed by the lead investor'
                      : 'You need an invitation from the lead investor'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
