import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearch } from '@tanstack/react-router';
import {
  CreditCard,
  Building2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Lock,
  Clock,
  DollarSign,
} from 'lucide-react';

interface PaymentMethod {
  id: string;
  type: 'BANK_ACCOUNT' | 'CARD';
  bankName?: string;
  accountType?: 'CHECKING' | 'SAVINGS';
  brand?: 'VISA' | 'MASTERCARD' | 'AMEX' | 'DISCOVER';
  last4: string;
  isDefault: boolean;
}

interface PaymentData {
  commitment: {
    id: string;
    amount: number;
    setupFee: number;
    managementFee: number;
    totalDue: number;
  };
  syndicate: {
    id: string;
    name: string;
    slug: string;
  };
  paymentMethods: PaymentMethod[];
}

export default function SyndicatePaymentPage() {
  const { slug } = useParams({ from: '/syndicates/$slug/payment' });
  const search = useSearch({ from: '/syndicates/$slug/payment' });
  const navigate = useNavigate();

  const [data, setData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchPaymentData();
  }, []);

  useEffect(() => {
    if (data?.paymentMethods.length) {
      const defaultMethod = data.paymentMethods.find((m) => m.isDefault);
      setSelectedMethodId(defaultMethod?.id || data.paymentMethods[0].id);
    }
  }, [data]);

  const fetchPaymentData = async () => {
    try {
      const commitmentId = (search as any).commitmentId;
      const response = await fetch(`/api/syndicates/commitments/${commitmentId}/payment-info`);
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Failed to fetch payment data:', error);
      setError('Failed to load payment information');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedMethodId) {
      setError('Please select a payment method');
      return;
    }

    try {
      setProcessing(true);

      const response = await fetch(`/api/syndicates/commitments/${data?.commitment.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethodId: selectedMethodId,
        }),
      });

      if (!response.ok) {
        throw new Error('Payment failed');
      }

      setSuccess(true);

      // Redirect to success page after 2 seconds
      setTimeout(() => {
        navigate({ to: `/syndicates/${slug}` });
      }, 2000);
    } catch (error) {
      setError('Payment processing failed. Please try again or contact support.');
    } finally {
      setProcessing(false);
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

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    if (method.type === 'BANK_ACCOUNT') {
      return <Building2 className="h-6 w-6 text-gray-700" />;
    }
    return <CreditCard className="h-6 w-6 text-gray-700" />;
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    if (method.type === 'BANK_ACCOUNT') {
      return `${method.bankName} ${method.accountType} ••••${method.last4}`;
    }
    return `${method.brand} ••••${method.last4}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment information...</p>
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
          <p className="text-gray-600 mb-6">Failed to load payment information</p>
          <button
            onClick={() => navigate({ to: `/syndicates/${slug}` })}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Syndicate
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-6">
              Your commitment to {data.syndicate.name} has been processed successfully.
            </p>
            <p className="text-sm text-gray-500">Redirecting to syndicate dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <button
          onClick={() => navigate({ to: `/syndicates/${slug}/commit` })}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Payment</h1>
          <p className="text-gray-600">Finalize your commitment to {data.syndicate.name}</p>
        </div>

        <form onSubmit={handlePayment} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          {/* Payment Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment Summary
            </h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Investment Amount</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(data.commitment.amount)}
                </span>
              </div>

              {data.commitment.setupFee > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Setup Fee</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(data.commitment.setupFee)}
                  </span>
                </div>
              )}

              {data.commitment.managementFee > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Management Fee</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(data.commitment.managementFee)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t">
                <span className="text-lg font-semibold text-gray-900">Total Due</span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatCurrency(data.commitment.totalDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Payment Method
            </h2>

            {data.paymentMethods.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">No payment methods on file</p>
                <button
                  type="button"
                  onClick={() => navigate({ to: '/settings/payment-methods' })}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                >
                  Add Payment Method
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {data.paymentMethods.map((method) => (
                  <label
                    key={method.id}
                    className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition ${
                      selectedMethodId === method.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.id}
                      checked={selectedMethodId === method.id}
                      onChange={(e) => setSelectedMethodId(e.target.value)}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 bg-white rounded-lg border border-gray-200">
                        {getPaymentMethodIcon(method)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{getPaymentMethodLabel(method)}</p>
                        {method.isDefault && (
                          <span className="text-xs text-blue-600">Default</span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}

                <button
                  type="button"
                  onClick={() => navigate({ to: '/settings/payment-methods' })}
                  className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-600 hover:text-blue-600 transition text-sm font-medium"
                >
                  + Add New Payment Method
                </button>
              </div>
            )}
          </div>

          {/* Security Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Secure Payment</p>
                <p>
                  Your payment information is encrypted and secure. We use bank-level security to
                  protect your transactions.
                </p>
              </div>
            </div>
          </div>

          {/* Processing Time Notice */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="font-medium mb-1">Processing Time</p>
                <p>
                  {selectedMethodId && data.paymentMethods.find((m) => m.id === selectedMethodId)?.type === 'BANK_ACCOUNT'
                    ? 'Bank transfers typically take 3-5 business days to process.'
                    : 'Card payments are processed instantly.'}
                </p>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate({ to: `/syndicates/${slug}/commit` })}
              className="px-6 py-3 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={processing || data.paymentMethods.length === 0}
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processing Payment...
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5" />
                  Pay {formatCurrency(data.commitment.totalDue)}
                </>
              )}
            </button>
          </div>

          {/* Terms */}
          <p className="text-xs text-center text-gray-500">
            By completing this payment, you confirm that you have read and agree to the syndicate
            terms and conditions. Your commitment is legally binding.
          </p>
        </form>
      </div>
    </div>
  );
}
