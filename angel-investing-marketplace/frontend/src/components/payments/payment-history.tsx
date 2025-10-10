import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Search,
  Filter,
  Download,
  Eye,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { formatCurrency, formatTransactionId } from '../../lib/payment-utils';
import { PaymentStatusBadge } from './payment-status';

interface PaymentTransaction {
  id: string;
  investmentId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  paymentMethod: string;
  paymentIntentId?: string;
  escrowReference?: string;
  fees: {
    platformFee: number;
    processingFee: number;
    totalFee: number;
  };
  createdAt: string;
  completedAt?: string;
  startupName: string;
  startupId: string;
}

interface PaymentHistoryProps {
  userId?: string;
  showFilters?: boolean;
  showExport?: boolean;
  onTransactionClick?: (transaction: PaymentTransaction) => void;
  compact?: boolean;
}

export function PaymentHistory({
  userId,
  showFilters = true,
  showExport = true,
  onTransactionClick,
  compact = false,
}: PaymentHistoryProps) {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<PaymentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Mock data for demonstration
  useEffect(() => {
    const mockTransactions: PaymentTransaction[] = [
      {
        id: 'txn_1',
        investmentId: 'inv_001',
        amount: 5000,
        currency: 'USD',
        status: 'COMPLETED',
        paymentMethod: 'CARD',
        paymentIntentId: 'pi_mock_123',
        escrowReference: 'escrow_inv_001_123456',
        fees: {
          platformFee: 250,
          processingFee: 145,
          totalFee: 395,
        },
        createdAt: '2024-01-15T10:30:00Z',
        completedAt: '2024-01-15T10:31:00Z',
        startupName: 'TechCorp Inc.',
        startupId: 'startup_1',
      },
      {
        id: 'txn_2',
        investmentId: 'inv_002',
        amount: 10000,
        currency: 'USD',
        status: 'PROCESSING',
        paymentMethod: 'BANK_TRANSFER',
        paymentIntentId: 'pi_mock_456',
        escrowReference: 'escrow_inv_002_123457',
        fees: {
          platformFee: 500,
          processingFee: 0,
          totalFee: 500,
        },
        createdAt: '2024-01-14T14:20:00Z',
        startupName: 'GreenEnergy Solutions',
        startupId: 'startup_2',
      },
      {
        id: 'txn_3',
        investmentId: 'inv_003',
        amount: 2500,
        currency: 'USD',
        status: 'REFUNDED',
        paymentMethod: 'CARD',
        paymentIntentId: 'pi_mock_789',
        escrowReference: 'escrow_inv_003_123458',
        fees: {
          platformFee: 125,
          processingFee: 72,
          totalFee: 197,
        },
        createdAt: '2024-01-13T09:15:00Z',
        completedAt: '2024-01-13T09:16:00Z',
        startupName: 'HealthTech Innovations',
        startupId: 'startup_3',
      },
    ];

    setTransactions(mockTransactions);
    setFilteredTransactions(mockTransactions);
    setIsLoading(false);
  }, []);

  // Filter and sort transactions
  useEffect(() => {
    let filtered = transactions.filter((transaction) => {
      const matchesSearch =
        transaction.startupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.investmentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.paymentIntentId && transaction.paymentIntentId.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || transaction.status === statusFilter;
      const matchesMethod = methodFilter === 'ALL' || transaction.paymentMethod === methodFilter;

      return matchesSearch && matchesStatus && matchesMethod;
    });

    // Sort transactions
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredTransactions(filtered);
  }, [transactions, searchTerm, statusFilter, methodFilter, sortBy, sortOrder]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'PROCESSING':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      case 'REFUNDED':
        return <TrendingDown className="h-4 w-4 text-purple-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const handleExport = () => {
    // TODO: Implement CSV/PDF export
    console.log('Exporting payment history...');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Loading payment history...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Payment History
            </CardTitle>
            <CardDescription>
              Track all your investment payments and transactions
            </CardDescription>
          </div>
          {showExport && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Filters */}
        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by startup, investment ID, or payment ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
              </SelectContent>
            </Select>

            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Methods</SelectItem>
                <SelectItem value="CARD">Credit Card</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="DIGITAL_WALLET">Digital Wallet</SelectItem>
                <SelectItem value="WIRE_TRANSFER">Wire Transfer</SelectItem>
              </SelectContent>
            </Select>

            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-');
              setSortBy(field as 'date' | 'amount' | 'status');
              setSortOrder(order as 'asc' | 'desc');
            }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="amount-desc">Highest Amount</SelectItem>
                <SelectItem value="amount-asc">Lowest Amount</SelectItem>
                <SelectItem value="status-asc">Status A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {transactions.length}
            </div>
            <div className="text-sm text-gray-600">Total Transactions</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-900">
              {transactions.filter(t => t.status === 'COMPLETED').length}
            </div>
            <div className="text-sm text-green-600">Completed</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-900">
              {formatCurrency(
                transactions
                  .filter(t => t.status === 'COMPLETED')
                  .reduce((sum, t) => sum + t.amount, 0),
                'USD'
              ).formatted}
            </div>
            <div className="text-sm text-blue-600">Total Invested</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-900">
              {formatCurrency(
                transactions
                  .filter(t => t.status === 'COMPLETED')
                  .reduce((sum, t) => sum + t.fees.totalFee, 0),
                'USD'
              ).formatted}
            </div>
            <div className="text-sm text-purple-600">Total Fees</div>
          </div>
        </div>

        {/* Transactions Table */}
        {filteredTransactions.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No transactions found matching your criteria.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Startup</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Date</TableHead>
                  {!compact && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow
                    key={transaction.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => onTransactionClick?.(transaction)}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {formatTransactionId(transaction.investmentId)}
                        </div>
                        {transaction.paymentIntentId && (
                          <div className="text-xs text-gray-500">
                            {formatTransactionId(transaction.paymentIntentId)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{transaction.startupName}</div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {formatCurrency(transaction.amount, transaction.currency).formatted}
                        </div>
                        {!compact && (
                          <div className="text-xs text-gray-500">
                            Fee: {formatCurrency(transaction.fees.totalFee, transaction.currency).formatted}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={transaction.status} size="sm" />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {transaction.paymentMethod.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </div>
                      {!compact && (
                        <div className="text-xs text-gray-500">
                          {new Date(transaction.createdAt).toLocaleTimeString()}
                        </div>
                      )}
                    </TableCell>
                    {!compact && (
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for dashboard widgets
export function PaymentHistoryCompact(props: PaymentHistoryProps) {
  return <PaymentHistory {...props} compact={true} showFilters={false} />;
}

export default PaymentHistory;