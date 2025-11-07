import { useState, useEffect } from 'react';
import { CreditCard, Building2, Plus, Trash2, CheckCircle, Star, AlertCircle } from 'lucide-react';

interface BankAccount {
  id: string;
  type: 'BANK_ACCOUNT';
  bankName: string;
  accountType: 'CHECKING' | 'SAVINGS';
  last4: string;
  isDefault: boolean;
  isVerified: boolean;
  addedAt: Date;
}

interface Card {
  id: string;
  type: 'CARD';
  brand: 'VISA' | 'MASTERCARD' | 'AMEX' | 'DISCOVER';
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  addedAt: Date;
}

type PaymentMethod = BankAccount | Card;

interface AddBankForm {
  routingNumber: string;
  accountNumber: string;
  confirmAccountNumber: string;
  accountType: 'CHECKING' | 'SAVINGS';
}

interface AddCardForm {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  zipCode: string;
}

export default function PaymentMethodsPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddBank, setShowAddBank] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [adding, setAdding] = useState(false);

  const [bankForm, setBankForm] = useState<AddBankForm>({
    routingNumber: '',
    accountNumber: '',
    confirmAccountNumber: '',
    accountType: 'CHECKING',
  });

  const [cardForm, setCardForm] = useState<AddCardForm>({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    zipCode: '',
  });

  const [error, setError] = useState('');

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/payment-methods');
      const data = await response.json();
      setPaymentMethods(data.data || []);
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (bankForm.accountNumber !== bankForm.confirmAccountNumber) {
      setError('Account numbers do not match');
      return;
    }

    try {
      setAdding(true);
      await fetch('/api/payment-methods/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routingNumber: bankForm.routingNumber,
          accountNumber: bankForm.accountNumber,
          accountType: bankForm.accountType,
        }),
      });

      setBankForm({
        routingNumber: '',
        accountNumber: '',
        confirmAccountNumber: '',
        accountType: 'CHECKING',
      });
      setShowAddBank(false);
      fetchPaymentMethods();
    } catch (error) {
      setError('Failed to add bank account. Please check your details.');
    } finally {
      setAdding(false);
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      setAdding(true);
      await fetch('/api/payment-methods/card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardForm),
      });

      setCardForm({
        cardNumber: '',
        expiryMonth: '',
        expiryYear: '',
        cvv: '',
        zipCode: '',
      });
      setShowAddCard(false);
      fetchPaymentMethods();
    } catch (error) {
      setError('Failed to add card. Please check your details.');
    } finally {
      setAdding(false);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      await fetch(`/api/payment-methods/${methodId}/set-default`, {
        method: 'POST',
      });
      fetchPaymentMethods();
    } catch (error) {
      console.error('Failed to set default payment method:', error);
    }
  };

  const handleDelete = async (methodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    try {
      await fetch(`/api/payment-methods/${methodId}`, {
        method: 'DELETE',
      });
      fetchPaymentMethods();
    } catch (error) {
      console.error('Failed to delete payment method:', error);
    }
  };

  const getCardBrandLogo = (brand: string) => {
    // In a real app, return actual card brand SVGs
    return brand;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment methods...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payment Methods</h1>
          <p className="mt-2 text-gray-600">Manage your bank accounts and payment cards</p>
        </div>

        <div className="space-y-6">
          {/* Add New Payment Method */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Payment Method</h2>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddBank(true);
                  setShowAddCard(false);
                  setError('');
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition flex items-center justify-center gap-2 text-gray-700 hover:text-blue-600 font-medium"
              >
                <Building2 className="h-5 w-5" />
                Add Bank Account
              </button>
              <button
                onClick={() => {
                  setShowAddCard(true);
                  setShowAddBank(false);
                  setError('');
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition flex items-center justify-center gap-2 text-gray-700 hover:text-blue-600 font-medium"
              >
                <CreditCard className="h-5 w-5" />
                Add Credit/Debit Card
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Add Bank Account Form */}
            {showAddBank && (
              <form onSubmit={handleAddBank} className="mt-4 border-t pt-4 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Bank Account Details
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
                  <select
                    value={bankForm.accountType}
                    onChange={(e) =>
                      setBankForm({ ...bankForm, accountType: e.target.value as 'CHECKING' | 'SAVINGS' })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CHECKING">Checking</option>
                    <option value="SAVINGS">Savings</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Routing Number</label>
                  <input
                    type="text"
                    value={bankForm.routingNumber}
                    onChange={(e) => setBankForm({ ...bankForm, routingNumber: e.target.value })}
                    placeholder="9 digits"
                    maxLength={9}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                  <input
                    type="text"
                    value={bankForm.accountNumber}
                    onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Account Number</label>
                  <input
                    type="text"
                    value={bankForm.confirmAccountNumber}
                    onChange={(e) => setBankForm({ ...bankForm, confirmAccountNumber: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={adding}
                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    {adding ? 'Adding...' : 'Add Bank Account'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddBank(false);
                      setBankForm({
                        routingNumber: '',
                        accountNumber: '',
                        confirmAccountNumber: '',
                        accountType: 'CHECKING',
                      });
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Add Card Form */}
            {showAddCard && (
              <form onSubmit={handleAddCard} className="mt-4 border-t pt-4 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Card Details
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
                  <input
                    type="text"
                    value={cardForm.cardNumber}
                    onChange={(e) => setCardForm({ ...cardForm, cardNumber: e.target.value })}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                    <input
                      type="text"
                      value={cardForm.expiryMonth}
                      onChange={(e) => setCardForm({ ...cardForm, expiryMonth: e.target.value })}
                      placeholder="MM"
                      maxLength={2}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                    <input
                      type="text"
                      value={cardForm.expiryYear}
                      onChange={(e) => setCardForm({ ...cardForm, expiryYear: e.target.value })}
                      placeholder="YYYY"
                      maxLength={4}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">CVV</label>
                    <input
                      type="text"
                      value={cardForm.cvv}
                      onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value })}
                      placeholder="123"
                      maxLength={4}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                  <input
                    type="text"
                    value={cardForm.zipCode}
                    onChange={(e) => setCardForm({ ...cardForm, zipCode: e.target.value })}
                    placeholder="12345"
                    maxLength={10}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={adding}
                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    {adding ? 'Adding...' : 'Add Card'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCard(false);
                      setCardForm({
                        cardNumber: '',
                        expiryMonth: '',
                        expiryYear: '',
                        cvv: '',
                        zipCode: '',
                      });
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Saved Payment Methods */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Saved Payment Methods</h2>
            {paymentMethods.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No payment methods added yet</p>
                <p className="text-sm text-gray-500 mt-1">Add a bank account or card to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className={`border-2 rounded-lg p-4 ${
                      method.isDefault ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-white rounded-lg border border-gray-200">
                          {method.type === 'BANK_ACCOUNT' ? (
                            <Building2 className="h-6 w-6 text-gray-700" />
                          ) : (
                            <CreditCard className="h-6 w-6 text-gray-700" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {method.type === 'BANK_ACCOUNT' ? (
                              <>
                                <span className="font-semibold text-gray-900">
                                  {method.bankName} {method.accountType}
                                </span>
                                {method.isVerified ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                                    Pending Verification
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                <span className="font-semibold text-gray-900">
                                  {getCardBrandLogo(method.brand)} •••• {method.last4}
                                </span>
                              </>
                            )}
                            {method.isDefault && (
                              <span className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                                <Star className="h-3 w-3 fill-current" />
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {method.type === 'BANK_ACCOUNT'
                              ? `Account ending in ${method.last4}`
                              : `Expires ${method.expiryMonth.toString().padStart(2, '0')}/${method.expiryYear}`}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Added {new Date(method.addedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!method.isDefault && (
                          <button
                            onClick={() => handleSetDefault(method.id)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(method.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
