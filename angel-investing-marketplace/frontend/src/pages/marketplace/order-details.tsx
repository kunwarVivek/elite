import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@tantml:router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Progress } from '../../components/ui/progress';
import {
  Building2,
  TrendingUp,
  DollarSign,
  Calendar,
  Users,
  ArrowLeft,
  ShoppingCart,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Award,
  Clock,
  FileText,
  MapPin,
  Briefcase,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { cn, formatCurrency, formatDate, formatTimeAgo } from '@/lib/utils';

/**
 * Secondary Marketplace - Order Details
 * View detailed information about a share listing
 */

interface OrderDetails {
  id: string;
  quantity: number;
  pricePerShare: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  expiresAt?: string;
  conditions?: any;
  shareCertificate: {
    id: string;
    totalShares: number;
    certificateNumber: string;
    sharePrice: number;
    totalValue: number;
    issuedDate: string;
    isTransferable: boolean;
    restrictions?: any;
    investment: {
      id: string;
      amount: number;
      investmentDate: string;
      pitch: {
        id: string;
        title: string;
        summary: string;
        fundingAmount: number;
        minimumInvestment: number;
        startup: {
          id: string;
          name: string;
          industry: string;
          stage: string;
          logoUrl?: string;
          description?: string;
          websiteUrl?: string;
          teamSize?: number;
          foundedDate?: string;
        };
      };
    };
    spv: {
      id: string;
      name: string;
      legalName: string;
      jurisdiction: string;
      totalCapital: number;
      syndicate: {
        id: string;
        name: string;
        leadInvestor: {
          id: string;
          name: string;
        };
      };
    };
  };
  seller: {
    id: string;
    name: string;
    email: string;
  };
  trades: Array<{
    id: string;
    quantity: number;
    pricePerShare: number;
    totalAmount: number;
    status: string;
    createdAt: string;
    buyer: {
      id: string;
      name: string;
    };
  }>;
}

export function OrderDetailsPage() {
  const navigate = useNavigate();
  const { orderId } = useParams({ strict: false });
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/marketplace/orders/${orderId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }

      const result = await response.json();
      setOrder(result.data.order);
    } catch (err: any) {
      console.error('Error fetching order:', err);
      setError(err.message || 'Failed to load order details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuyShares = () => {
    navigate({ to: `/marketplace/buy/${orderId}` });
  };

  const getDaysUntilExpiry = (expiresAt?: string): number | null => {
    if (!expiresAt) return null;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getFilledPercentage = (): number => {
    if (!order) return 0;
    const totalTraded = order.trades
      .filter((t) => t.status === 'EXECUTED' || t.status === 'SETTLED')
      .reduce((sum, trade) => sum + trade.quantity, 0);
    const originalQuantity = order.quantity + totalTraded;
    return originalQuantity > 0 ? (totalTraded / originalQuantity) * 100 : 0;
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading order details...</span>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Order not found'}</AlertDescription>
        </Alert>
        <Button onClick={() => navigate({ to: '/marketplace' })} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Marketplace
        </Button>
      </div>
    );
  }

  const startup = order.shareCertificate.investment.pitch.startup;
  const pitch = order.shareCertificate.investment.pitch;
  const daysUntilExpiry = getDaysUntilExpiry(order.expiresAt);
  const filledPercentage = getFilledPercentage();

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate({ to: '/marketplace' })} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Marketplace
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  {startup.logoUrl ? (
                    <img
                      src={startup.logoUrl}
                      alt={startup.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Building2 className="h-10 w-10 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-2">{startup.name}</h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Briefcase className="h-4 w-4" />
                      <span>{startup.industry}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Award className="h-4 w-4" />
                      <span>{startup.stage}</span>
                    </div>
                    {startup.teamSize && (
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{startup.teamSize} employees</span>
                      </div>
                    )}
                  </div>
                  {startup.description && (
                    <p className="mt-3 text-muted-foreground">{startup.description}</p>
                  )}
                  {startup.websiteUrl && (
                    <Button
                      variant="link"
                      className="pl-0 mt-2"
                      onClick={() => window.open(startup.websiteUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Visit Website
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle>Share Offering Details</CardTitle>
              <CardDescription>Information about this share listing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Price Per Share</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(parseFloat(order.pricePerShare.toString()))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Available Shares</p>
                  <p className="text-2xl font-bold">{order.quantity.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Value</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(parseFloat(order.totalAmount.toString()))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Original Price</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(parseFloat(order.shareCertificate.sharePrice.toString()))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Certificate #</p>
                  <p className="text-lg font-semibold font-mono">
                    {order.shareCertificate.certificateNumber}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Listed Date</p>
                  <p className="text-lg font-semibold">{formatDate(order.createdAt)}</p>
                </div>
              </div>

              {/* Progress Bar if Partially Filled */}
              {order.status === 'PARTIALLY_FILLED' && filledPercentage > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Filled</span>
                    <span className="text-sm text-muted-foreground">
                      {filledPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={filledPercentage} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Investment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Original Investment</CardTitle>
              <CardDescription>Details about the original investment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Investment Amount</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(parseFloat(order.shareCertificate.investment.amount.toString()))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Investment Date</p>
                    <p className="text-lg font-semibold">
                      {formatDate(order.shareCertificate.investment.investmentDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Shares</p>
                    <p className="text-lg font-semibold">
                      {order.shareCertificate.totalShares.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Issued Date</p>
                    <p className="text-lg font-semibold">
                      {formatDate(order.shareCertificate.issuedDate)}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-2">{pitch.title}</h4>
                  <p className="text-sm text-muted-foreground">{pitch.summary}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SPV Information */}
          <Card>
            <CardHeader>
              <CardTitle>SPV & Syndicate Details</CardTitle>
              <CardDescription>Legal structure information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">SPV Name</p>
                  <p className="font-semibold">{order.shareCertificate.spv.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Legal Entity</p>
                  <p className="font-semibold">{order.shareCertificate.spv.legalName}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Jurisdiction</p>
                    <p className="font-semibold">{order.shareCertificate.spv.jurisdiction}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Capital</p>
                    <p className="font-semibold">
                      {formatCurrency(parseFloat(order.shareCertificate.spv.totalCapital.toString()))}
                    </p>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Syndicate</p>
                  <p className="font-semibold">{order.shareCertificate.spv.syndicate.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Led by {order.shareCertificate.spv.syndicate.leadInvestor.name}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trade History */}
          {order.trades.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Trades</CardTitle>
                <CardDescription>Transaction history for this listing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.trades.map((trade) => (
                    <div
                      key={trade.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-semibold">
                          {trade.quantity.toLocaleString()} shares @ {formatCurrency(parseFloat(trade.pricePerShare.toString()))}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatTimeAgo(trade.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(parseFloat(trade.totalAmount.toString()))}
                        </p>
                        <span
                          className={cn(
                            'text-xs px-2 py-1 rounded',
                            trade.status === 'SETTLED' && 'bg-green-100 text-green-800',
                            trade.status === 'EXECUTED' && 'bg-blue-100 text-blue-800',
                            trade.status === 'PENDING' && 'bg-yellow-100 text-yellow-800'
                          )}
                        >
                          {trade.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Action Card */}
          <Card>
            <CardHeader>
              <CardTitle>Purchase Shares</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Status Indicators */}
                {daysUntilExpiry !== null && daysUntilExpiry < 7 && (
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      {daysUntilExpiry > 0
                        ? `Expires in ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'day' : 'days'}`
                        : 'Listing expired'}
                    </AlertDescription>
                  </Alert>
                )}

                {order.status === 'ACTIVE' && (
                  <>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm font-semibold mb-2">Available to Purchase</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {order.quantity.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">shares</p>
                    </div>

                    <Button onClick={handleBuyShares} className="w-full" size="lg">
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      Buy Shares
                    </Button>
                  </>
                )}

                {order.status === 'FILLED' && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>This listing has been completely filled</AlertDescription>
                  </Alert>
                )}

                {order.status === 'CANCELLED' && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>This listing has been cancelled</AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Seller Info */}
          <Card>
            <CardHeader>
              <CardTitle>Seller Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {order.seller.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-semibold">{order.seller.name}</p>
                  <p className="text-sm text-muted-foreground">Verified Seller</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Important Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Important Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Settlement:</strong> All trades settle within T+3 business days
                  </AlertDescription>
                </Alert>
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Platform Fee:</strong> 2% fee applies to all secondary market trades
                  </AlertDescription>
                </Alert>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Transferable:</strong> Share certificate is transferable
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
