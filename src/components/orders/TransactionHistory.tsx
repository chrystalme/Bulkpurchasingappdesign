import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { LoadingState, TableLoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { 
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';
import { fetchTransactions } from '../../store/slices/escrowSlice';
import { selectTransactions, selectTransactionsLoading, selectEscrowError } from '../../store/selectors/escrowSelectors';
import type { EscrowTransaction } from '../../lib/types/escrow.types';

type SortField = 'date' | 'amount';
type SortOrder = 'asc' | 'desc';
type FilterStatus = 'all' | 'locked' | 'pending_inspection' | 'released' | 'disputed' | 'refunded';

export function TransactionHistory() {
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const transactions = useSelector(selectTransactions);
  const loading = useSelector(selectTransactionsLoading);
  const error = useSelector(selectEscrowError);

  useEffect(() => {
    dispatch(fetchTransactions() as any);
  }, [dispatch]);

  const filteredTransactions = transactions.filter((tx: any) => {
    const id = (tx.id?.toString() || '').toLowerCase();
    const product = (tx.productName || tx.product_name || '').toLowerCase();
    const seller = (tx.sellerName || tx.seller_name || '').toLowerCase();
    const query = searchTerm.toLowerCase();
    return id.includes(query) || product.includes(query) || seller.includes(query);
  });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let compareValue = 0;
    if (sortField === 'date') {
      compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortField === 'amount') {
      compareValue = a.amount - b.amount;
    }
    return sortOrder === 'asc' ? compareValue : -compareValue;
  });

  const paginatedTransactions = sortedTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      locked: 'bg-yellow-100 text-yellow-800',
      pending_inspection: 'bg-blue-100 text-blue-800',
      released: 'bg-green-100 text-green-800',
      disputed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      locked: 'Locked',
      pending_inspection: 'Pending Inspection',
      released: 'Released',
      disputed: 'Disputed',
      refunded: 'Refunded',
    };
    return (
      <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
        {labels[status] || status}
      </Badge>
    );
  };

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
        <h1 className="text-3xl font-bold text-gray-900">Transaction History</h1>
        <p className="text-gray-600 mt-1">View and manage all escrow transactions</p>
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
              placeholder="Search by ID, product, or seller..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="text-gray-900 placeholder:text-gray-500"
            />
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as FilterStatus)}>
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
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">ID</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Type</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Product</th>
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
                        <td className="px-4 py-3 text-gray-900 font-mono text-xs">{tx.id.slice(0, 8)}</td>
                        <td className="px-4 py-3 text-gray-700">Escrow</td>
                        <td className="px-4 py-3 text-gray-700">{(tx as any).productName || (tx as any).product_name || 'Group Order'}</td>
                        <td className="px-4 py-3 text-gray-900 font-semibold">
                          ₦{Number(tx.amount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(tx.status)}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {new Date(tx.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
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
    </div>
  );
}
