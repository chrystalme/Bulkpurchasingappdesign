import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  DollarSign,
  Truck,
  Shield,
  MessageSquare,
  Download,
} from 'lucide-react';
import { DetailLoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { fetchTransactionById } from '../../store/slices/escrowSlice';
import { selectCurrentTransaction, selectEscrowLoading, selectEscrowError } from '../../store/selectors/escrowSelectors';
import type { EscrowTransaction } from '../../lib/types';

interface EscrowDetailsProps {
  transactionId?: string;
  navigate?: (screen: string) => void;
}

export function EscrowTransactionDetails({
  transactionId = '1',
  navigate,
}: EscrowDetailsProps) {
  const dispatch = useDispatch();
  
  const transaction = useSelector(selectCurrentTransaction);
  const loading = useSelector(selectEscrowLoading);
  const error = useSelector(selectEscrowError);

  useEffect(() => {
    dispatch(fetchTransactionById(parseInt(transactionId)) as any);
  }, [transactionId, dispatch]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock };
      case 'held':
        return { bg: 'bg-blue-100', text: 'text-blue-800', icon: Shield };
      case 'shipped':
        return { bg: 'bg-purple-100', text: 'text-purple-800', icon: Truck };
      case 'delivered':
        return { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle };
      case 'disputed':
        return { bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle };
      case 'released':
        return { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock };
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <DetailLoadingState />
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <ErrorState
          title="Failed to load transaction"
          description={error || 'Transaction not found'}
          onRetry={() => dispatch(fetchTransactionById(parseInt(transactionId)) as any)}
          showRetry={true}
        />
      </div>
    );
  }

  const statusColor = getStatusColor(transaction.status);
  const StatusIcon = statusColor.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0047AB] to-[#6EE7B7] p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-6">
          {navigate && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => navigate('escrow')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-white mb-1 text-3xl font-bold">Escrow Transaction</h1>
            <p className="text-white/80">Transaction #{transaction.transaction_number}</p>
          </div>
        </div>

        {/* Quick Status */}
        <div className="flex items-center gap-2">
          <Badge className={`${statusColor.bg} ${statusColor.text}`}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
          </Badge>
          <span className="text-white/80">
            {transaction.status === 'held' && 'Funds are securely held'}
            {transaction.status === 'released' && 'Funds have been released to seller'}
            {transaction.status === 'disputed' && 'Dispute is under review'}
            {transaction.status === 'shipped' && 'Order has been shipped'}
            {transaction.status === 'delivered' && 'Order delivered successfully'}
          </span>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Main Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Amount */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Escrow Amount</p>
                  <p className="text-2xl font-bold text-[#0047AB]">
                    ₦{transaction.amount.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fee */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Escrow Fee</p>
                  <p className="text-2xl font-bold text-[#0047AB]">
                    ₦{transaction.escrow_fee.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Net Amount */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Net Amount</p>
                  <p className="text-2xl font-bold text-[#0047AB]">
                    ₦{(transaction.amount - transaction.escrow_fee).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Parties Involved */}
        <Card>
          <CardHeader>
            <CardTitle>Parties Involved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Buyer */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-700">Buyer</h4>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>B</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">Buyer Information</p>
                    <p className="text-sm text-gray-600">ID: {transaction.buyer_id}</p>
                  </div>
                </div>
              </div>

              {/* Seller */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-700">Seller</h4>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>S</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">Seller Information</p>
                    <p className="text-sm text-gray-600">ID: {transaction.seller_id}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: 'Created', date: transaction.created_at, icon: FileText },
                { label: 'Paid', date: transaction.paid_at, icon: DollarSign },
                { label: 'Shipped', date: transaction.shipped_at, icon: Truck },
                { label: 'Delivered', date: transaction.delivered_at, icon: CheckCircle },
                { label: 'Released', date: transaction.released_at, icon: CheckCircle },
              ].map((item, idx) => {
                const Icon = item.icon;
                const isCompleted = item.date !== null;
                return (
                  <div key={idx} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`p-2 rounded-full ${
                          isCompleted
                            ? 'bg-green-100'
                            : 'bg-gray-100'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 ${
                            isCompleted
                              ? 'text-green-600'
                              : 'text-gray-400'
                          }`}
                        />
                      </div>
                      {idx < 4 && (
                        <div
                          className={`w-1 h-8 ${
                            isCompleted ? 'bg-green-200' : 'bg-gray-200'
                          }`}
                        />
                      )}
                    </div>
                    <div className="pt-2">
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-gray-600">
                        {item.date ? formatDate(item.date) : 'Pending'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Shipping Info */}
        {transaction.tracking_id && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Shipping Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">Tracking ID</Label>
                  <p className="font-mono font-medium">{transaction.tracking_id}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Courier</Label>
                  <p className="font-medium">{transaction.courier || 'Not specified'}</p>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Track Shipment
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="details" className="space-y-4">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            {transaction.status === 'disputed' && (
              <TabsTrigger value="dispute">Dispute</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="details">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Transaction Number</p>
                    <p className="font-mono font-medium">{transaction.transaction_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="font-medium capitalize">{transaction.status}</p>
                  </div>
                  {transaction.inspection_deadline && (
                    <div>
                      <p className="text-sm text-gray-600">Inspection Deadline</p>
                      <p className="font-medium">
                        {formatDate(transaction.inspection_deadline)}
                      </p>
                    </div>
                  )}
                  {transaction.auto_release_at && (
                    <div>
                      <p className="text-sm text-gray-600">Auto Release Date</p>
                      <p className="font-medium">
                        {formatDate(transaction.auto_release_at)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No messages yet</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {transaction.status === 'disputed' && (
            <TabsContent value="dispute">
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-red-900 mb-2">Dispute Under Review</h4>
                      <p className="text-red-800 text-sm">
                        This transaction has an active dispute. The support team is reviewing the case.
                        You can track the progress here.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {transaction.status === 'delivered' && (
            <Button className="bg-[#6EE7B7] hover:bg-[#6EE7B7]/90 text-[#0047AB]">
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirm Delivery
            </Button>
          )}
          {transaction.status === 'shipped' && (
            <Button className="bg-[#0047AB] hover:bg-[#0047AB]/90">
              <Truck className="w-4 h-4 mr-2" />
              Mark as Delivered
            </Button>
          )}
          <Button variant="outline">
            <MessageSquare className="w-4 h-4 mr-2" />
            Contact Support
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download Receipt
          </Button>
        </div>
      </div>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-sm font-medium text-gray-700 ${className || ''}`}>{children}</p>;
}
