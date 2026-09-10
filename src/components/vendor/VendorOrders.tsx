import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Search, Package, Shield } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Screen } from '../../App';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { fetchVendorOrders } from '../../store/slices/vendorsSlice';
import {
  selectVendorOrders,
  selectVendorsLoading,
  selectVendorsError,
} from '../../store/selectors/vendorsSelectors';
import type { VendorOrder } from '../../lib/types';
import { apiClient } from '../../lib/api';
import { toast } from 'sonner';
import { formatDate } from '../../lib/formatters';

interface VendorOrdersProps {
  navigate: (screen: Screen) => void;
}

export function VendorOrders({ navigate }: VendorOrdersProps) {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const allOrders = useSelector(selectVendorOrders);
  const loading = useSelector(selectVendorsLoading);
  const error = useSelector(selectVendorsError);

  useEffect(() => {
    const vendorId = user?.vendor_id;
    if (vendorId) {
      dispatch(fetchVendorOrders(vendorId) as any);
    }
  }, [user?.vendor_id, dispatch]);

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      await apiClient.orders.updateStatus(orderId, status);
      toast.success(`Order ${status === 'confirmed' ? 'confirmed' : 'rejected'}`);
      const vendorId = user?.vendor_id;
      if (vendorId) {
        dispatch(fetchVendorOrders(vendorId) as any);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update order status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20';
      case 'confirmed':
        return 'bg-[#0047AB]/10 text-[#0047AB] border-[#0047AB]/20';
      case 'shipped':
        return 'bg-[#6EE7B7]/10 text-[#10B981] border-[#6EE7B7]/20';
      case 'delivered':
        return 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20';
      case 'cancelled':
        return 'bg-[#FB7185]/10 text-[#FB7185] border-[#FB7185]/20';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filterOrders = (status: string) => {
    let filtered = allOrders;
    if (status !== 'all') {
      filtered = filtered.filter(order => order.status === status);
    }
    if (searchQuery) {
      filtered = filtered.filter(
        order =>
          order.product_name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          order.customer_name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          order.id.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
    return filtered;
  };

  const orders = filterOrders(activeTab);
  const pendingCount = allOrders.filter(o => o.status === 'pending').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F4F5] pb-6">
        <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate('vendor-dashboard')}
              className="p-1"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div className="flex-1">
              <h1 className="font-semibold text-gray-900">Orders</h1>
              <p className="text-xs text-gray-500">Loading...</p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <LoadingState count={3} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F4F4F5] pb-6">
        <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate('vendor-dashboard')}
              className="p-1"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div className="flex-1">
              <h1 className="font-semibold text-gray-900">Orders</h1>
              <p className="text-xs text-gray-500">
                {allOrders.length} total orders
              </p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <ErrorState
            title="Failed to load orders"
            description={error}
            onRetry={() => {
              const vendorId = user?.vendor_id;
              if (vendorId) dispatch(fetchVendorOrders(vendorId));
            }}
            showRetry={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('vendor-dashboard')} className="p-1">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900">Orders</h1>
            <p className="text-xs text-gray-500">
              {allOrders.length} total orders
            </p>
          </div>
          {pendingCount > 0 && (
            <Badge className="bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20">
              {pendingCount} pending
            </Badge>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by order ID, product, or customer..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
            <TabsTrigger value="shipped">Shipped</TabsTrigger>
            <TabsTrigger value="delivered">Delivered</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-3">
            {orders.length === 0 ? (
              <Card className="p-8">
                <div className="text-center">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-2">No orders found</p>
                  <p className="text-sm text-gray-500">
                    {searchQuery
                      ? 'Try a different search term'
                      : 'No orders in this category yet'}
                  </p>
                </div>
              </Card>
            ) : (
              orders.map(order => (
                <Card key={order.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900">
                          {order.order_number}
                        </p>
                        <Badge
                          variant="secondary"
                          className={getStatusColor(order.status)}
                        >
                          {order.status}
                        </Badge>
                        {order.escrow_status && (
                          <Badge
                            variant="secondary"
                            className="bg-[#0047AB]/10 text-[#0047AB] border-[#0047AB]/20"
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            Escrow
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-900 mb-1">
                        {order.product_name}
                      </p>
                      <p className="text-xs text-gray-600">
                        Customer: {order.customer_name} • Qty: {order.quantity}{' '}
                        units
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-600">Order Date</p>
                      <p className="text-sm text-gray-900">
                        {formatDate(order.order_date, 
                          'en-US',
                          {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          },
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Total Amount</p>
                      <p className="text-lg font-semibold text-[#10B981]">
                        ₦{(parseFloat(order.total_amount) || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {order.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        className="flex-1 bg-[#10B981] hover:bg-[#10B981]/90 text-white"
                        onClick={() => handleUpdateStatus(order.id, 'confirmed')}
                      >
                        Confirm Order
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-[#FB7185] border-[#FB7185]/20 hover:bg-[#FB7185]/10"
                        onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                      >
                        Reject
                      </Button>
                    </div>
                  )}

                  {order.status === 'confirmed' && (
                    <div className="mt-3">
                      <Button
                        size="sm"
                        className="w-full bg-[#0047AB] hover:bg-[#0047AB]/90"
                        onClick={() => navigate('escrow-seller-upload')}
                      >
                        Mark as Shipped
                      </Button>
                    </div>
                  )}
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
