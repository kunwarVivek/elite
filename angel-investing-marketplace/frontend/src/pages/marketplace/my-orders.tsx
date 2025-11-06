import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  Building2,
  DollarSign,
  Calendar,
  Plus,
  X,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { cn, formatCurrency, formatDate, formatTimeAgo } from '@/lib/utils';

interface Order {
  id: string;
  quantity: number;
  pricePerShare: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  expiresAt?: string;
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
  trades: Array<{
    id: string;
    quantity: number;
    totalAmount: number;
    status: string;
  }>;
}

export function MyOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/marketplace/orders', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!response.ok) throw new Error('Failed to fetch orders');
      const result = await response.json();
      setOrders(result.data.orders || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/marketplace/orders/${orderId}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!response.ok) throw new Error('Failed to cancel order');
      await fetchOrders();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (filter === 'ALL') return true;
    return order.status === filter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'FILLED': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'CANCELLED': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'PARTIALLY_FILLED': return <Clock className="h-4 w-4 text-yellow-600" />;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">My Sell Orders</h1>
          <p className="text-lg text-muted-foreground">Manage your share listings</p>
        </div>
        <Button onClick={() => navigate({ to: '/marketplace/create-order' })}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Order
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center space-x-2 mb-6">
        {['ALL', 'ACTIVE', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status.replace('_', ' ')}
          </Button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Orders</h3>
            <p className="text-muted-foreground mb-6">You haven't created any sell orders yet.</p>
            <Button onClick={() => navigate({ to: '/marketplace/create-order' })}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Order
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const startup = order.shareCertificate.investment.pitch.startup;
            return (
              <Card key={order.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        {startup.logoUrl ? (
                          <img src={startup.logoUrl} alt={startup.name} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <Building2 className="h-6 w-6 text-white" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{startup.name}</h3>
                        <p className="text-sm text-muted-foreground">{startup.industry}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(order.status)}
                      <span className={cn(
                        'text-sm font-semibold',
                        order.status === 'ACTIVE' && 'text-blue-600',
                        order.status === 'FILLED' && 'text-green-600',
                        order.status === 'CANCELLED' && 'text-red-600',
                        order.status === 'PARTIALLY_FILLED' && 'text-yellow-600'
                      )}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mt-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Available</p>
                      <p className="text-lg font-bold">{order.quantity.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Price/Share</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(parseFloat(order.pricePerShare.toString()))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Value</p>
                      <p className="text-lg font-bold">{formatCurrency(parseFloat(order.totalAmount.toString()))}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Listed</p>
                      <p className="text-lg font-bold">{formatTimeAgo(order.createdAt)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-6 pt-6 border-t">
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      {order.trades.length > 0 && (
                        <span>{order.trades.length} trade(s)</span>
                      )}
                      {order.expiresAt && (
                        <span>Expires {formatDate(order.expiresAt)}</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate({ to: `/marketplace/orders/${order.id}` })}
                      >
                        View Details
                      </Button>
                      {(order.status === 'ACTIVE' || order.status === 'PARTIALLY_FILLED') && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancelOrder(order.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
