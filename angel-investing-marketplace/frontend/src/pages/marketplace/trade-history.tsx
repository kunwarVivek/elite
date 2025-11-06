import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  Building2,
  DollarSign,
  Calendar,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Download,
} from 'lucide-react';
import { cn, formatCurrency, formatDate, formatTimeAgo } from '@/lib/utils';

/**
 * Trade History Page
 * View all completed and pending trades
 */

interface Trade {
  id: string;
  quantity: number;
  pricePerShare: number;
  totalAmount: number;
  fees: number;
  status: string;
  executedAt?: string;
  settlementDate?: string;
  createdAt: string;
  order: {
    id: string;
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
    seller: {
      id: string;
      name: string;
    };
  };
}

interface TradeSummary {
  totalTrades: number;
  totalInvested: number;
  totalFees: number;
  pendingSettlement: number;
}

export function TradeHistoryPage() {
  const navigate = useNavigate();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [summary, setSummary] = useState<TradeSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => {
    fetchTrades();
  }, []);

  useEffect(() => {
    if (trades.length > 0) {
      calculateSummary();
    }
  }, [trades]);

  const fetchTrades = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/marketplace/trades', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch trades');
      }

      const result = await response.json();
      setTrades(result.data.trades || []);
    } catch (err: any) {
      console.error('Error fetching trades:', err);
      setError(err.message || 'Failed to load trade history');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSummary = () => {
    const totalTrades = trades.length;
    const totalInvested = trades.reduce(
      (sum, trade) => sum + parseFloat(trade.totalAmount.toString()),
      0
    );
    const totalFees = trades.reduce((sum, trade) => sum + parseFloat(trade.fees.toString()), 0);
    const pendingSettlement = trades.filter(
      (t) => t.status === 'PENDING' || t.status === 'EXECUTED'
    ).length;

    setSummary({
      totalTrades,
      totalInvested,
      totalFees,
      pendingSettlement,
    });
  };

  const filteredTrades = trades.filter((trade) => {
    if (filter === 'ALL') return true;
    return trade.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SETTLED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'EXECUTED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'FAILED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SETTLED':
        return <CheckCircle className="h-4 w-4" />;
      case 'EXECUTED':
        return <TrendingUp className="h-4 w-4" />;
      case 'PENDING':
        return <Clock className="h-4 w-4" />;
      case 'FAILED':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getDaysUntilSettlement = (settlementDate?: string): number | null => {
    if (!settlementDate) return null;
    const now = new Date();
    const settlement = new Date(settlementDate);
    const diffTime = settlement.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading trade history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Trade History</h1>
          <p className="text-lg text-muted-foreground">
            View all your completed and pending trades
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={fetchTrades}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Trades</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{summary.totalTrades}</p>
              <p className="text-xs text-muted-foreground mt-1">all time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Invested</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatCurrency(summary.totalInvested)}</p>
              <p className="text-xs text-muted-foreground mt-1">including fees</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Fees Paid</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">{formatCurrency(summary.totalFees)}</p>
              <p className="text-xs text-muted-foreground mt-1">platform fees</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Pending Settlement</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-600">{summary.pendingSettlement}</p>
              <p className="text-xs text-muted-foreground mt-1">trades awaiting settlement</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center space-x-2 mb-6">
        {['ALL', 'PENDING', 'EXECUTED', 'SETTLED', 'FAILED', 'CANCELLED'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status}
          </Button>
        ))}
      </div>

      {/* Trades List */}
      {filteredTrades.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Trades Yet</h3>
            <p className="text-muted-foreground mb-6">
              {filter === 'ALL'
                ? "You haven't made any trades yet. Start by browsing the marketplace!"
                : `No ${filter.toLowerCase()} trades found.`}
            </p>
            <Button onClick={() => navigate({ to: '/marketplace' })}>Browse Marketplace</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTrades.map((trade) => {
            const startup = trade.order.shareCertificate.investment.pitch.startup;
            const daysUntilSettlement = getDaysUntilSettlement(trade.settlementDate);

            return (
              <Card key={trade.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    {/* Company Info */}
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        {startup.logoUrl ? (
                          <img
                            src={startup.logoUrl}
                            alt={startup.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Building2 className="h-6 w-6 text-white" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{startup.name}</h3>
                        <p className="text-sm text-muted-foreground">{startup.industry}</p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center space-x-2">
                      <span
                        className={cn(
                          'px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 border',
                          getStatusColor(trade.status)
                        )}
                      >
                        {getStatusIcon(trade.status)}
                        <span>{trade.status}</span>
                      </span>
                    </div>
                  </div>

                  {/* Trade Details */}
                  <div className="grid grid-cols-5 gap-4 mt-6 pt-6 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Shares</p>
                      <p className="text-lg font-bold">{trade.quantity.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Price/Share</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(parseFloat(trade.pricePerShare.toString()))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Subtotal</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(parseFloat(trade.totalAmount.toString()))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Fees</p>
                      <p className="text-lg font-bold text-red-600">
                        {formatCurrency(parseFloat(trade.fees.toString()))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(
                          parseFloat(trade.totalAmount.toString()) +
                            parseFloat(trade.fees.toString())
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="flex items-center justify-between mt-6 pt-6 border-t">
                    <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Traded {formatTimeAgo(trade.createdAt)}</span>
                      </div>
                      {trade.executedAt && (
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="h-4 w-4" />
                          <span>Executed {formatDate(trade.executedAt)}</span>
                        </div>
                      )}
                      {trade.settlementDate && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          {daysUntilSettlement !== null && daysUntilSettlement > 0 ? (
                            <span>Settles in {daysUntilSettlement} days</span>
                          ) : (
                            <span>Settlement {formatDate(trade.settlementDate)}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate({
                            to: `/marketplace/orders/${trade.order.id}`,
                          })
                        }
                      >
                        View Order
                      </Button>
                    </div>
                  </div>

                  {/* Settlement Warning */}
                  {trade.status === 'PENDING' && (
                    <Alert className="mt-4">
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        This trade is pending execution. Funds are held in escrow.
                      </AlertDescription>
                    </Alert>
                  )}

                  {trade.status === 'EXECUTED' && daysUntilSettlement !== null && (
                    <Alert className="mt-4">
                      <TrendingUp className="h-4 w-4" />
                      <AlertDescription>
                        Trade executed successfully. Settlement in {daysUntilSettlement} business
                        days.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
