import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  Building2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  BarChart3,
  Activity,
} from 'lucide-react';
import { cn, formatCurrency, formatTimeAgo } from '@/lib/utils';

/**
 * Order Book Page
 * Real-time order book for a specific company
 */

interface OrderBookEntry {
  id: string;
  quantity: number;
  pricePerShare: number;
  totalAmount: number;
  createdAt: string;
  seller: {
    id: string;
    name: string;
  };
  shareCertificate: {
    investment: {
      pitch: {
        startup: {
          id: string;
          name: string;
          industry: string;
          logoUrl?: string;
        };
      };
    };
  };
}

interface OrderBookStats {
  totalVolume: number;
  avgPrice: number;
  lowestAsk: number;
  highestAsk: number;
  ordersCount: number;
}

export function OrderBookPage() {
  const navigate = useNavigate();
  const { companyId } = useParams({ strict: false });
  const [orders, setOrders] = useState<OrderBookEntry[]>([]);
  const [stats, setStats] = useState<OrderBookStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (companyId) {
      fetchOrderBook();
    }
  }, [companyId]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchOrderBook();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, companyId]);

  const fetchOrderBook = async () => {
    if (!companyId) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/marketplace/order-book/${companyId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order book');
      }

      const result = await response.json();
      setOrders(result.data.orders || []);
      setStats(result.data.stats || null);
    } catch (err: any) {
      console.error('Error fetching order book:', err);
      setError(err.message || 'Failed to load order book');
    } finally {
      setIsLoading(false);
    }
  };

  const getPriceChange = (currentPrice: number): { value: number; isPositive: boolean } => {
    if (!stats || stats.avgPrice === 0) return { value: 0, isPositive: true };
    const change = ((currentPrice - stats.avgPrice) / stats.avgPrice) * 100;
    return { value: Math.abs(change), isPositive: change >= 0 };
  };

  const getVolumeAtPrice = (price: number): number => {
    return orders
      .filter((order) => parseFloat(order.pricePerShare.toString()) === price)
      .reduce((sum, order) => sum + order.quantity, 0);
  };

  const groupedOrders = orders.reduce((acc, order) => {
    const price = parseFloat(order.pricePerShare.toString());
    if (!acc[price]) {
      acc[price] = {
        price,
        totalQuantity: 0,
        orders: [],
      };
    }
    acc[price].totalQuantity += order.quantity;
    acc[price].orders.push(order);
    return acc;
  }, {} as Record<number, { price: number; totalQuantity: number; orders: OrderBookEntry[] }>);

  const priceLevels = Object.values(groupedOrders).sort((a, b) => a.price - b.price);

  const company = orders[0]?.shareCertificate?.investment?.pitch?.startup;

  if (isLoading && orders.length === 0) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading order book...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <Button variant="ghost" onClick={() => navigate({ to: '/marketplace' })} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Marketplace
      </Button>

      {/* Company Header */}
      {company && (
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt={company.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-4xl font-bold">{company.name}</h1>
                <p className="text-lg text-muted-foreground">{company.industry}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={autoRefresh ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <Activity className="h-4 w-4 mr-2" />
                {autoRefresh ? 'Auto-Refresh On' : 'Auto-Refresh Off'}
              </Button>
              <Button variant="outline" size="sm" onClick={fetchOrderBook}>
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Market Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Volume</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalVolume.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">shares</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Average Price</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(stats.avgPrice)}</p>
              <p className="text-xs text-muted-foreground">per share</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Lowest Ask</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.lowestAsk)}</p>
              <p className="text-xs text-muted-foreground">best price</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Highest Ask</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.highestAsk)}</p>
              <p className="text-xs text-muted-foreground">top price</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active Orders</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.ordersCount}</p>
              <p className="text-xs text-muted-foreground">listings</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Book - Price Levels */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Order Book</CardTitle>
              <CardDescription>All active sell orders grouped by price</CardDescription>
            </CardHeader>
            <CardContent>
              {priceLevels.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No active orders in the order book</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Header */}
                  <div className="grid grid-cols-4 gap-4 pb-2 border-b text-sm font-semibold text-muted-foreground">
                    <div>Price</div>
                    <div className="text-right">Volume</div>
                    <div className="text-right">Total Value</div>
                    <div className="text-right">Orders</div>
                  </div>

                  {/* Price Levels */}
                  {priceLevels.map((level) => {
                    const priceChange = getPriceChange(level.price);
                    const totalValue = level.price * level.totalQuantity;
                    const volumePercentage = stats
                      ? (level.totalQuantity / stats.totalVolume) * 100
                      : 0;

                    return (
                      <div
                        key={level.price}
                        className="grid grid-cols-4 gap-4 py-3 border-b hover:bg-gray-50 transition-colors relative"
                      >
                        {/* Volume Bar Background */}
                        <div
                          className="absolute inset-0 bg-blue-50 opacity-50"
                          style={{ width: `${volumePercentage}%` }}
                        />

                        <div className="relative z-10">
                          <p className="font-semibold">{formatCurrency(level.price)}</p>
                          <div className="flex items-center space-x-1 text-xs">
                            {priceChange.isPositive ? (
                              <TrendingUp className="h-3 w-3 text-green-600" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-600" />
                            )}
                            <span
                              className={cn(
                                priceChange.isPositive ? 'text-green-600' : 'text-red-600'
                              )}
                            >
                              {priceChange.value.toFixed(2)}%
                            </span>
                          </div>
                        </div>

                        <div className="text-right relative z-10">
                          <p className="font-semibold">{level.totalQuantity.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {volumePercentage.toFixed(1)}%
                          </p>
                        </div>

                        <div className="text-right relative z-10">
                          <p className="font-semibold">{formatCurrency(totalValue)}</p>
                        </div>

                        <div className="text-right relative z-10">
                          <p className="font-semibold">{level.orders.length}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Recent Listings</CardTitle>
              <CardDescription>Latest orders added to the book</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No recent listings</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 10).map((order) => (
                    <div
                      key={order.id}
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate({ to: `/marketplace/orders/${order.id}` })}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">
                          {order.quantity.toLocaleString()} shares
                        </span>
                        <span className="text-sm font-bold text-green-600">
                          {formatCurrency(parseFloat(order.pricePerShare.toString()))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{order.seller.name}</span>
                        <span>{formatTimeAgo(order.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Market Info */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Market Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <Alert>
                  <DollarSign className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Spread:</strong>{' '}
                    {stats ? formatCurrency(stats.highestAsk - stats.lowestAsk) : 'N/A'}
                  </AlertDescription>
                </Alert>
                <Alert>
                  <Activity className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Updated:</strong> Real-time (refreshes every 10s)
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
