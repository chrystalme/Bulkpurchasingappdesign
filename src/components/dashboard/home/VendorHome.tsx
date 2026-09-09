import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchVendorDashboard,
  fetchVendorOrders,
} from '../../../store/slices/vendorsSlice';
import {
  selectDashboard,
  selectVendorOrders,
  selectVendorsLoading,
} from '../../../store/selectors';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import {
  Plus,
  ChevronRight,
  TrendingUp,
  Package,
  AlertCircle,
  MessageCircle,
  Users,
  Loader2,
} from 'lucide-react';
import type { Screen } from '../../../App';
import { useAuth } from '../../../contexts/AuthContext';
import { LoadingState } from '../../ui/LoadingState';
import { StatCard } from './StatCard';
import { ActivityFeed } from './ActivityFeed';

interface VendorHomeProps {
  navigate: (screen: Screen, id?: string) => void;
}

export function VendorHome({ navigate }: VendorHomeProps) {
  const { user } = useAuth();
  const dispatch = useAppDispatch();

  const dashboard = useAppSelector(selectDashboard);
  const vendorOrders = useAppSelector(selectVendorOrders);
  const loading = useAppSelector(selectVendorsLoading);

  useEffect(() => {
    if (user?.vendor_id) {
      dispatch(fetchVendorDashboard(user.vendor_id));
      dispatch(fetchVendorOrders(user.vendor_id));
    }
  }, [dispatch, user?.vendor_id]);

  const pendingOrders = vendorOrders.filter(
    o => o.status === 'pending' || o.status === 'payment_confirmed',
  );
  const recentDisputes = []; // Would come from disputes slice

  const vendorStats = {
    monthlyRevenue: dashboard?.revenue || 0,
    pendingOrders: pendingOrders.length,
    averageRating: dashboard?.rating || 4.5,
    totalDisputes: recentDisputes.length,
  };

  const activityItems = pendingOrders.slice(0, 3).map(order => ({
    id: order.id,
    title: `Order #${order.order_number || 'N/A'}`,
    description: `from ${order.buyerName || 'Unknown'} - ${order.status === 'payment_confirmed' ? 'Ready to ship' : 'Awaiting payment'}`,
    timestamp: order.created_at || 'Recently',
    badge: {
      label: order.status === 'payment_confirmed' ? 'Ship Now' : 'Pending',
      variant:
        order.status === 'payment_confirmed'
          ? ('default' as const)
          : ('secondary' as const),
    },
    onClick: () => navigate('vendor-orders'),
  }));

  return (
    <div className="pb-4 text-black">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#101eb9] to-[#6EE7B7] p-6 lg:p-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-gray-500">
              Welcome back, {user?.name || 'Vendor'} 👋
            </h2>
            <p className="text-white/80 text-sm mt-1">
              Manage your products and orders
            </p>
          </div>
          <Avatar className="h-12 w-12 border-2 border-white">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback>{user?.name?.[0] || 'V'}</AvatarFallback>
          </Avatar>
        </div>

        {/* Sales Dashboard Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Revenue (MTD)"
            value={`₦${(vendorStats.monthlyRevenue / 1000).toFixed(0)}K`}
            color="primary"
          />
          <StatCard
            icon={<Package className="w-5 h-5" />}
            label="Pending Orders"
            value={vendorStats.pendingOrders}
            color="primary"
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Avg Rating"
            value={vendorStats.averageRating}
            color="primary"
          />
          <StatCard
            icon={<AlertCircle className="w-5 h-5" />}
            label="Open Disputes"
            value={vendorStats.totalDisputes}
            color="primary"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 lg:px-8 mt-6">
        <h3 className="mb-4 text-sm font-semibold text-gray-600">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => navigate('vendor-add-product')}
            className="h-20 flex flex-col items-center justify-center gap-2 bg-[#10B981] hover:bg-[#059669]"
          >
            <Plus className="w-6 h-6" />
            <span className="text-xs">Add Product</span>
          </Button>
          <Button
            onClick={() => navigate('vendor-orders')}
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
          >
            <Package className="w-6 h-6" />
            <span className="text-xs">View Orders</span>
          </Button>
          <Button
            onClick={() => navigate('vendor-customers')}
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
          >
            <Users className="w-6 h-6" />
            <span className="text-xs">Customers</span>
          </Button>
          <Button
            onClick={() => navigate('chat-dashboard')}
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="text-xs">Messages</span>
          </Button>
        </div>
      </div>

      {/* Pending Orders Section */}
      <div className="px-4 lg:px-8 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#10B981]" />
            Pending Orders
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('vendor-orders')}
            className="text-[#10B981]"
          >
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {loading ? (
          <LoadingState count={2} />
        ) : pendingOrders.length === 0 ? (
          <Card className="bg-gray-50">
            <CardContent className="p-8 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No pending orders</p>
              <p className="text-gray-400 text-sm mt-1">
                Orders will appear here when they are placed
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingOrders.slice(0, 3).map(order => (
              <Card
                key={order.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate('vendor-orders')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900">
                          Order #{order.order_number || 'N/A'}
                        </p>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            order.status === 'payment_confirmed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {order.status === 'payment_confirmed'
                            ? 'Ready to Ship'
                            : 'Pending'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {order.buyerName || 'Buyer'}
                      </p>
                    </div>
                    <Package className="w-5 h-5 text-[#10B981] flex-shrink-0" />
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500">Order Total</span>
                    <span className="font-semibold text-[#10B981]">
                      ₦{Number(order.total_amount).toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Products Section */}
      <div className="px-4 lg:px-8 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#10B981]" />
            Your Products
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('vendor-products')}
            className="text-[#10B981]"
          >
            Manage
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {loading ? (
          <LoadingState count={2} />
        ) : (
          <Card className="bg-gradient-to-br from-[#10B981]/5 to-[#6EE7B7]/5 border-[#10B981]/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#10B981] flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    Manage Your Catalog
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Add, edit, or remove products from your catalog
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('vendor-add-product')}
                    className="text-[#10B981] border-[#10B981]/20"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add New Product
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Activity/Alerts Section */}
      <div className="px-4 lg:px-8 mt-6 pb-4">
        <h3 className="mb-4">Recent Activity</h3>
        <ActivityFeed
          items={activityItems.length > 0 ? activityItems : []}
          emptyMessage="No recent activity"
          loading={loading}
        />
      </div>
    </div>
  );
}
