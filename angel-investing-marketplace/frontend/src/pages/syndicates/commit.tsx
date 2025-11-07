import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from '@tanstack/react-router';
import {
  DollarSign,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Info,
  Calculator,
} from 'lucide-react';

interface SyndicateCommitment {
  syndicate: {
    id: string;
    name: string;
    slug: string;
    minimumInvestment: number;
    maximumInvestment?: number;
    fees: {
      managementFee: number;
      carriedInterest: number;
      setupFee?: number;
    };
  };
}

export default function SyndicateCommitmentPage() {
  const { slug } = useParams({ from: '/syndicates/$slug/commit' });
  const navigate = useNavigate();
  const [data, setData] = useState<SyndicateCommitment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [commitmentAmount, setCommitmentAmount] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [slug]);

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/syndicates/${slug}`);
      const result = await response.json();
      setData({ syndicate: result.data });
    } catch (error) {
      console.error('Failed to fetch syndicate:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateAmount = () => {
    const amount = parseFloat(commitmentAmount);

    if (!commitmentAmount || isNaN(amount)) {
      setError('Please enter a valid amount');
      return false;
    }

    if (!data) return false;

    if (amount < data.syndicate.minimumInvestment) {
      setError(`Minimum investment is ${formatCurrency(data.syndicate.minimumInvestment)}`);
      return false;
    }

    if (data.syndicate.maximumInvestment && amount > data.syndicate.maximumInvestment) {
      setError(`Maximum investment is ${formatCurrency(data.syndicate.maximumInvestment)}`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateAmount()) {
      return;
    }

    if (!agreedToTerms) {
      setError('Please agree to the terms and conditions');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/syndicates/${data?.syndicate.id}/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(commitmentAmount),
        }),
      });

      const result = await response.json();

      // Navigate to payment page
      navigate({
        to: `/syndicates/${slug}/payment`,
        search: { commitmentId: result.data.commitmentId },
      });
    } catch (error) {
      setError('Failed to process commitment. Please try again.');
    } finally {
      setSubmitting(false);
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

  const calculateFees = () => {
    const amount = parseFloat(commitmentAmount);
    if (!amount || isNaN(amount) || !data) {
      return {
        setupFee: 0,
        managementFee: 0,
        total: 0,
      };
    }

    const setupFee = data.syndicate.fees.setupFee || 0;
    const managementFee = (amount * data.syndicate.fees.managementFee) / 100;
    const total = amount + setupFee + managementFee;

    return {
      setupFee,
      managementFee,
      total,
    };
  };

  const fees = calculateFees();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">Failed to load syndicate information</p>
          <Link
            to="/syndicates/browse"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Browse
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <Link
          to={`/syndicates/${slug}/join`}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Commit to {data.syndicate.name}</h1>
          <p className="text-gray-600">Specify your investment commitment amount</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          {/* Investment Amount */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Investment Amount
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commitment Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 text-lg">
                    $
                  </span>
                  <input
                    type="number"
                    value={commitmentAmount}
                    onChange={(e) => {
                      setCommitmentAmount(e.target.value);
                      setError('');
                    }}
                    placeholder="0"
                    min={data.syndicate.minimumInvestment}
                    max={data.syndicate.maximumInvestment}
                    step="1000"
                    required
                    className="pl-8 w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-2xl font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
                  <span>Minimum: {formatCurrency(data.syndicate.minimumInvestment)}</span>
                  {data.syndicate.maximumInvestment && (
                    <span>Maximum: {formatCurrency(data.syndicate.maximumInvestment)}</span>
                  )}
                </div>
              </div>

              {/* Quick Amounts */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Quick Select</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    data.syndicate.minimumInvestment,
                    data.syndicate.minimumInvestment * 2,
                    data.syndicate.minimumInvestment * 5,
                  ].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setCommitmentAmount(amount.toString())}
                      className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition text-sm font-medium text-gray-700 hover:text-blue-600"
                    >
                      {formatCurrency(amount)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Fee Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Fee Breakdown
            </h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b">
                <span className="text-gray-700">Investment Amount</span>
                <span className="font-semibold text-gray-900">
                  {commitmentAmount ? formatCurrency(parseFloat(commitmentAmount)) : '$0'}
                </span>
              </div>

              {data.syndicate.fees.setupFee && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-700">Setup Fee</span>
                    <Info className="h-4 w-4 text-gray-400" />
                  </div>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(fees.setupFee)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-gray-700">
                    Management Fee ({data.syndicate.fees.managementFee}%)
                  </span>
                  <Info className="h-4 w-4 text-gray-400" />
                </div>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(fees.managementFee)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <span className="text-lg font-semibold text-gray-900">Total Due Today</span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatCurrency(fees.total)}
                </span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Additional Fee Information</p>
                  <p>
                    Carried interest ({data.syndicate.fees.carriedInterest}%) applies to profits and is
                    calculated at exit.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Terms Agreement */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Terms & Conditions</h2>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                <p className="text-sm text-gray-700 space-y-2">
                  <span className="block">
                    By committing to this syndicate, you acknowledge and agree to:
                  </span>
                  <span className="block">
                    • Your commitment is binding and subject to syndicate terms
                  </span>
                  <span className="block">
                    • Management fees of {data.syndicate.fees.managementFee}% apply annually
                  </span>
                  <span className="block">
                    • Carried interest of {data.syndicate.fees.carriedInterest}% applies to profits
                  </span>
                  <span className="block">
                    • Investments are illiquid and may be held for extended periods
                  </span>
                  <span className="block">
                    • You meet all accreditation and regulatory requirements
                  </span>
                  <span className="block">
                    • You have read and understood the syndicate documents
                  </span>
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  I have read and agree to the{' '}
                  <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                    terms and conditions
                  </a>
                  {' '}and{' '}
                  <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                    syndicate agreement
                  </a>
                </span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Link
              to={`/syndicates/${slug}/join`}
              className="px-6 py-3 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || !commitmentAmount || !agreedToTerms}
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  Continue to Payment
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
