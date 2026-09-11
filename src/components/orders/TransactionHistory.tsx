import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { TableLoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { 
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { fetchTransactions } from '../../store/slices/escrowSlice';
import { selectTransactions, selectTransactionsLoading, selectEscrowError } from '../../store/selectors/escrowSelectors';
import type { EscrowTransaction } from '../../lib/types/escrow.types';
import { useAuth } from '../../contexts/AuthContext';

type SortField = 'date' | 'amount';
type SortOrder = 'asc' | 'desc';
type FilterStatus = 'all' | 'locked' | 'pending_inspection' | 'released' | 'disputed' | 'refunded';

const STATUS_LABELS: Record<string, string> = {
  locked: 'Locked',
  pending_inspection: 'Pending Inspection',
  released: 'Released',
  disputed: 'Disputed',
  refunded: 'Refunded',
};

const STATUS_VARIANTS: Record<string, string> = {
  locked: 'bg-yellow-100 text-yellow-800',
  pending_inspection: 'bg-blue-100 text-blue-800',
  released: 'bg-green-100 text-green-800',
  disputed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString();
};

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatMoney = (value?: number) => `₦${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function TransactionHistory() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superUser';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<EscrowTransaction | null>(null);
  const itemsPerPage = 10;

  const transactions = useSelector(selectTransactions);
  const loading = useSelector(selectTransactionsLoading);
  const error = useSelector(selectEscrowError);

  useEffect(() => {
    dispatch(fetchTransactions() as any);
  }, [dispatch]);

  const filteredTransactions = transactions.filter((tx) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      !query ||
      tx.id.toLowerCase().includes(query) ||
      (tx.transactionNumber || '').toLowerCase().includes(query) ||
      (tx.orderNumber || '').toLowerCase().includes(query) ||
      (tx.productName || '').toLowerCase().includes(query) ||
      (tx.sellerName || '').toLowerCase().includes(query) ||
      (tx.buyerName || '').toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let compareValue = 0;
    if (sortField === 'date') {
      compareValue =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortField === 'amount') {
      compareValue = (a.amount || 0) - (b.amount || 0);
    }
    if (Number.isNaN(compareValue)) compareValue = 0;
    return sortOrder === 'asc' ? compareValue : -compareValue;
  });

  const paginatedTransactions = sortedTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);

  const getStatusBadge = (status: string) => (
    <Badge className={STATUS_VARIANTS[status] || 'bg-gray-100 text-gray-800'}>
      {STATUS_LABELS[status] || status}
    </Badge>
  );

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleRetry = async () => {
    dispatch(fetchTransactions() as any);
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-12" />
        <TableLoadingState />
      </div>
    );
  }

  if (error && transactions.length === 0) {
    return <ErrorState onRetry={handleRetry} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {isAdmin ? 'Platform Transactions' : 'Transaction History'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isAdmin
            ? 'Every escrow transaction on the platform'
            : 'View and manage your escrow transactions'}
        </p>
        {isAdmin && (
          <Badge
            variant="secondary"
            className="mt-2 bg-[#0047AB]/10 text-[#0047AB] border-[#0047AB]/20"
          >
            <ShieldCheck className="w-3 h-3 mr-1" />
            Platform-wide view
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>
            {sortedTransactions.length} transaction{sortedTransactions.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Search by ID, order, product, buyer or seller..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="text-gray-900 placeholder:text-gray-500"
            />
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as FilterStatus);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="text-gray-900">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="locked">Locked</SelectItem>
                <SelectItem value="pending_inspection">Pending Inspection</SelectItem>
                <SelectItem value="released">Released</SelectItem>
                <SelectItem value="disputed">Disputed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paginatedTransactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No transactions found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Reference</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Product</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Buyer</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Seller</th>
                      <th
                        className="text-left px-4 py-3 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                        onClick={() => toggleSort('amount')}
                      >
                        <div className="flex items-center gap-2">
                          Amount
                          {sortField === 'amount' && (
                            sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                      <th
                        className="text-left px-4 py-3 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                        onClick={() => toggleSort('date')}
                      >
                        <div className="flex items-center gap-2">
                          Date
                          {sortField === 'date' && (
                            sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTransactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900 font-mono text-xs">
                          {tx.transactionNumber || tx.id.slice(0, 8)}
                          {tx.orderNumber && (
                            <span className="block text-gray-500">{tx.orderNumber}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{tx.productName}</td>
                        <td className="px-4 py-3 text-gray-700">{tx.buyerName || '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{tx.sellerName || '—'}</td>
                        <td className="px-4 py-3 text-gray-900 font-semibold">
                          {formatMoney(tx.amount)}
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(tx.status)}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {formatDate(tx.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700"
                            onClick={() => setSelectedTransaction(tx)}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="text-gray-700"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="text-gray-700"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="mt-4">
              <ErrorState onRetry={handleRetry} showRetry={true} />
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionDetailsDialog
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-900 text-right break-words">{value}</span>
    </div>
  );
}

function TransactionDetailsDialog({
  transaction,
  onClose,
}: {
  transaction: EscrowTransaction | null;
  onClose: () => void;
}) {
  if (!transaction) return null;
  const tx = transaction;
  const products = tx.products || [];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Transaction Details
            <Badge className={STATUS_VARIANTS[tx.status] || 'bg-gray-100 text-gray-800'}>
              {STATUS_LABELS[tx.status] || tx.status}
            </Badge>
          </DialogTitle>
          <DialogDescription className="font-mono">
            {tx.transactionNumber || tx.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <section>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">Order</h4>
            <DetailRow label="Order number" value={tx.orderNumber || '—'} />
            <DetailRow label="Order status" value={tx.orderStatus || '—'} />
            <DetailRow label="Created" value={formatDateTime(tx.createdAt)} />
          </section>

          <Separator />

          <section>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">Parties</h4>
            <DetailRow label="Buyer" value={tx.buyerName || '—'} />
            <DetailRow label="Buyer email" value={tx.buyerEmail || '—'} />
            <DetailRow label="Seller" value={tx.sellerName || '—'} />
            <DetailRow label="Seller email" value={tx.sellerEmail || '—'} />
          </section>

          <Separator />

          <section>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">Amounts</h4>
            <DetailRow label="Escrow amount" value={formatMoney(tx.amount)} />
            <DetailRow label="Escrow fee" value={formatMoney(tx.escrowFee)} />
            <DetailRow
              label="Total held"
              value={
                <span className="font-semibold">
                  {formatMoney((tx.amount || 0) + (tx.escrowFee || 0))}
                </span>
              }
            />
          </section>

          {products.length > 0 && (
            <>
              <Separator />
              <section>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Items</h4>
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Product</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Qty</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Unit price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((item, index) => (
                        <tr key={index} className="border-t border-gray-100">
                          <td className="px-3 py-2 text-gray-900">{item.productName}</td>
                          <td className="px-3 py-2 text-right text-gray-700">{item.quantity}</td>
                          <td className="px-3 py-2 text-right text-gray-700">
                            {formatMoney(item.price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          <Separator />

          <section>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">Timeline</h4>
            <DetailRow label="Paid" value={formatDateTime(tx.paidAt)} />
            <DetailRow label="Shipped" value={formatDateTime(tx.shippedAt)} />
            <DetailRow label="Delivered" value={formatDateTime(tx.deliveredAt)} />
            <DetailRow label="Inspection deadline" value={formatDateTime(tx.inspectionDeadline)} />
            <DetailRow label="Auto-release" value={formatDateTime(tx.autoReleaseAt)} />
            <DetailRow label="Released" value={formatDateTime(tx.releasedAt)} />
          </section>

          {(tx.courier || tx.trackingId) && (
            <>
              <Separator />
              <section>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Shipping</h4>
                <DetailRow label="Courier" value={tx.courier || '—'} />
                <DetailRow label="Tracking ID" value={tx.trackingId || '—'} />
              </section>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
