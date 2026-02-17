import React,{ useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import {
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  Star,
  TrendingUp,
  Plus,
  Eye,
  Settings,
  BarChart3,
} from 'lucide-react';
import type { Screen } from '../../App';
import { useAuth } from '../../contexts/AuthContext';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchVendorDashboard,
  fetchVendorOrders,
  fetchVendorCustomers,
  fetchProducts,
} from '../../store/slices';
import {
  selectDashboard,
  selectVendorOrders,
  selectVendorCustomers,
  selectProductsByVendor,
  selectVendorsLoading,
  selectVendorsError,
} from '../../store/selectors';

interface VendorDashboardProps {
  navigate: (screen: Screen) => void;
}

export function VendorDashboard({ navigate }: VendorDashboardProps) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const dispatch = useAppDispatch();

  // Early return if auth is loading or user is not a vendor
  if (isAuthLoading) {
    return (
      <div className='min-h-screen bg-[#F4F4F5] p-4 lg:p-6'>
        <LoadingState count={5} />
      </div>
    );
  }

  if (!user || !user.vendor_id) {
    return (
      <div className='min-h-screen bg-[#F4F4F5] p-4 lg:p-6'>
        <ErrorState
          title='Access Denied'
          description='You are not associated with a vendor account.'
        />
      </div>
    );
  }

  const vendorId = user.vendor_id;

  const stats = useAppSelector(selectDashboard);
  const orders = useAppSelector(selectVendorOrders);
  const customers = useAppSelector(selectVendorCustomers);
  const loading = useAppSelector(selectVendorsLoading);
  const error = useAppSelector(selectVendorsError);
  const products = useAppSelector(selectProductsByVendor(vendorId));

  useEffect(() => {
    if (vendorId) {
      dispatch(fetchVendorDashboard(vendorId));
      dispatch(fetchVendorOrders(vendorId));
      dispatch(fetchVendorCustomers(vendorId));
      dispatch(fetchProducts({ vendor_id: vendorId }));
    }
  }, [dispatch, vendorId]);

  const handleRetry = () => {
    if (vendorId) {
      dispatch(fetchVendorDashboard(vendorId));
      dispatch(fetchVendorOrders(vendorId));
      dispatch(fetchVendorCustomers(vendorId));
      dispatch(fetchProducts({ vendor_id: vendorId }));
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-[#F4F4F5] p-4 lg:p-6'>
        <LoadingState count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen bg-[#F4F4F5] p-4 lg:p-6'>
        <ErrorState
          title='Failed to load dashboard'
          description={error}
          onRetry={handleRetry}
          showRetry={true}
        />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className='min-h-screen bg-[#F4F4F5] p-4 lg:p-6'>
        <ErrorState
          title='No dashboard data'
          description='Could not retrieve dashboard information'
          onRetry={handleRetry}
          showRetry={true}
        />
      </div>
    );
  }

  const recentOrders = orders.slice(0, 5);
  const topCustomers = customers.slice(0, 4);
  const vendorProducts = products.slice(0, 4);

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

  return (
    <div className='min-h-screen bg-[#F4F4F5] pb-6'>
      {/* Header */}
      <div className='bg-gradient-to-r from-[#0047AB] to-[#6EE7B7] p-6 lg:p-8 rounded-b-3xl'>
        <div className='flex items-center justify-between mb-6'>
          <div>
            <h2 className='text-white mb-1'>SolarTech Distributors</h2>
            <p className='text-white/80 text-sm'>Vendor Dashboard</p>
          </div>
          <div className='flex gap-2'>
            <Button
              variant='ghost'
              size='icon'
              className='text-white hover:bg-white/20'
            >
              <Settings className='w-5 h-5' />
            </Button>
            <Avatar className='h-12 w-12 border-2 border-white'>
              <AvatarImage src='https://api.dicebear.com/7.x/initials/svg?seed=STD' />
              <AvatarFallback>SD</AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Quick Stats */}
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
          <Card className='bg-white/10 border-white/20 backdrop-blur-sm'>
            <CardContent className='p-4'>
              <div className='flex items-center gap-3 mb-2'>
                <div className='w-10 h-10 rounded-full bg-white/20 flex items-center justify-center'>
                  <DollarSign className='w-5 h-5 text-white' />
                </div>
                <div className='flex-1'>
                  <p className='text-white/80 text-xs'>Total Revenue</p>
                  <p className='text-white font-semibold'>
                    ${(stats.totalRevenue / 1000).toFixed(1)}k
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='bg-white/10 border-white/20 backdrop-blur-sm'>
            <CardContent className='p-4'>
              <div className='flex items-center gap-3 mb-2'>
                <div className='w-10 h-10 rounded-full bg-white/20 flex items-center justify-center'>
                  <ShoppingCart className='w-5 h-5 text-white' />
                </div>
                <div className='flex-1'>
                  <p className='text-white/80 text-xs'>Total Orders</p>
                  <p className='text-white font-semibold'>
                    {stats.totalOrders}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='bg-white/10 border-white/20 backdrop-blur-sm'>
            <CardContent className='p-4'>
              <div className='flex items-center gap-3 mb-2'>
                <div className='w-10 h-10 rounded-full bg-white/20 flex items-center justify-center'>
                  <Package className='w-5 h-5 text-white' />
                </div>
                <div className='flex-1'>
                  <p className='text-white/80 text-xs'>Products</p>
                  <p className='text-white font-semibold'>
                    {stats.totalProducts}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='bg-white/10 border-white/20 backdrop-blur-sm'>
            <CardContent className='p-4'>
              <div className='flex items-center gap-3 mb-2'>
                <div className='w-10 h-10 rounded-full bg-white/20 flex items-center justify-center'>
                  <Star className='w-5 h-5 text-[#FACC15]' />
                </div>
                <div className='flex-1'>
                  <p className='text-white/80 text-xs'>Rating</p>
                  <p className='text-white font-semibold'>
                    {stats.averageRating}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className='p-4 lg:p-6 space-y-4'>
        {/* Monthly Performance */}
        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between mb-4'>
              <div>
                <h3 className='font-semibold text-gray-900'>This Month</h3>
                <p className='text-sm text-gray-600'>January 2026</p>
              </div>
              <TrendingUp className='w-5 h-5 text-[#10B981]' />
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <p className='text-xs text-gray-600 mb-1'>Revenue</p>
                <p className='text-xl font-semibold text-gray-900'>
                  ${stats.monthlyRevenue.toLocaleString()}
                </p>
                <p className='text-xs text-[#10B981] mt-1'>
                  +12% from last month
                </p>
              </div>
              <div>
                <p className='text-xs text-gray-600 mb-1'>Pending Orders</p>
                <p className='text-xl font-semibold text-gray-900'>
                  {stats.pendingOrders}
                </p>
                <p className='text-xs text-[#FACC15] mt-1'>
                  Requires attention
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
          <Button
            onClick={() => navigate('vendor-add-product')}
            className='h-auto py-4 flex-col gap-2 bg-[#0047AB] hover:bg-[#0047AB]/90'
          >
            <Plus className='w-5 h-5' />
            <span className='text-sm'>Add Product</span>
          </Button>
          <Button
            onClick={() => navigate('vendor-products')}
            variant='outline'
            className='h-auto py-4 flex-col gap-2'
          >
            <Package className='w-5 h-5' />
            <span className='text-sm'>My Products</span>
          </Button>
          <Button
            onClick={() => navigate('vendor-orders')}
            variant='outline'
            className='h-auto py-4 flex-col gap-2'
          >
            <ShoppingCart className='w-5 h-5' />
            <span className='text-sm'>Orders</span>
          </Button>
          <Button
            onClick={() => navigate('vendor-customers')}
            variant='outline'
            className='h-auto py-4 flex-col gap-2'
          >
            <Users className='w-5 h-5' />
            <span className='text-sm'>Customers</span>
          </Button>
        </div>

        {/* Recent Orders */}
        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='font-semibold text-gray-900'>Recent Orders</h3>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => navigate('vendor-orders')}
                className='text-[#0047AB]'
              >
                View All
              </Button>
            </div>
            <div className='space-y-3'>
              {recentOrders.map(order => (
                <div
                  key={order.id}
                  className='flex items-start justify-between p-3 bg-gray-50 rounded-lg'
                >
                  <div className='flex-1'>
                    <div className='flex items-center gap-2 mb-1'>
                      <p className='text-sm font-medium text-gray-900'>
                        {order.productName}
                      </p>
                    </div>
                    <div className='flex items-center gap-2 text-xs text-gray-600'>
                      <span>{order.customerName}</span>
                      <span>•</span>
                      <span>Qty: {order.quantity}</span>
                      <span>•</span>
                      <span>
                        {new Date(order.orderDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className='flex flex-col items-end gap-2'>
                    <Badge
                      variant='secondary'
                      className={getStatusColor(order.status)}
                    >
                      {order.status}
                    </Badge>
                    <p className='text-sm font-semibold text-gray-900'>
                      ${order.totalAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='font-semibold text-gray-900'>Top Products</h3>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => navigate('vendor-products')}
                className='text-[#0047AB]'
              >
                Manage
              </Button>
            </div>
            <div className='space-y-3'>
              {vendorProducts.slice(0, 4).map(product => (
                <div
                  key={product.id}
                  className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'
                >
                  <div className='flex items-center gap-3 flex-1'>
                    <div className='w-12 h-12 rounded-lg bg-[#0047AB]/10 flex items-center justify-center'>
                      <Package className='w-6 h-6 text-[#0047AB]' />
                    </div>
                    <div className='flex-1'>
                      <p className='text-sm font-medium text-gray-900'>
                        {product.name}
                      </p>
                      <p className='text-xs text-gray-600'>
                        MOQ: {product.moq} units
                      </p>
                    </div>
                  </div>
                  <div className='text-right'>
                    <p className='text-sm font-semibold text-[#10B981]'>
                      ${product.bulkPrice}
                    </p>
                    <p className='text-xs text-gray-500 line-through'>
                      ${product.retailPrice}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='font-semibold text-gray-900'>Top Customers</h3>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => navigate('vendor-customers')}
                className='text-[#0047AB]'
              >
                View All
              </Button>
            </div>
            <div className='space-y-3'>
              {topCustomers.map(customer => (
                <div
                  key={customer.id}
                  className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'
                >
                  <div className='flex items-center gap-3 flex-1'>
                    <Avatar className='h-10 w-10'>
                      <AvatarImage src={customer.avatar} />
                      <AvatarFallback>{customer.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className='flex-1'>
                      <p className='text-sm font-medium text-gray-900'>
                        {customer.name}
                      </p>
                      <p className='text-xs text-gray-600'>
                        {customer.totalOrders} orders
                      </p>
                    </div>
                  </div>
                  <div className='text-right'>
                    <p className='text-sm font-semibold text-gray-900'>
                      ${customer.totalSpent.toLocaleString()}
                    </p>
                    <div className='flex items-center gap-1 text-xs text-gray-600'>
                      <Star className='w-3 h-3 text-[#FACC15]' fill='#FACC15' />
                      <span>{customer.trustScore}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
