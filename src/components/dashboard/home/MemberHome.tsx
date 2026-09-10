import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchGroups } from '../../../store/slices/groupsSlice';
import { fetchProducts, fetchVendors, fetchTransactions } from '../../../store/slices';
import {
  selectProducts,
  selectProductsLoading,
  selectVendors,
  selectVendorsLoading,
  selectTransactions,
  selectTransactionsLoading,
} from '../../../store/selectors';
import { Card, CardContent, CardHeader } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Progress } from '../../ui/progress';
import {
  Plus,
  ChevronRight,
  Star,
  MapPin,
  TrendingDown,
  Users,
  Shield,
  Package,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import type { Screen } from '../../../App';
import { useAuth } from '../../../contexts/AuthContext';
import { LoadingState } from '../../ui/LoadingState';
import { ImageWithFallback } from '../../figma/ImageWithFallback';
import { StatCard } from './StatCard';

interface MemberHomeProps {
  navigate: (screen: Screen, groupId?: string) => void;
}

export function MemberHome({ navigate }: MemberHomeProps) {
  const { user } = useAuth();
  const dispatch = useAppDispatch();

  const products = useAppSelector(selectProducts);
  const loadingProducts = useAppSelector(selectProductsLoading);
  const vendors = useAppSelector(selectVendors);
  const escrowTransactions = useAppSelector(selectTransactions);
  const { groups = [], loading: groupsLoading } = useAppSelector((state) => state.groups);

  useEffect(() => {
    dispatch(fetchGroups());
    dispatch(fetchProducts());
    dispatch(fetchVendors());
    dispatch(fetchTransactions('all'));
  }, [dispatch]);

  const popularDeals = products.slice(0, 3);
  const activeOrders = escrowTransactions.filter(
    (t) => t.status === 'pending_inspection' || t.status === 'locked'
  );
  const userGroups = groups.slice(0, 2);

  const memberStats = {
    activeOrders: activeOrders.length,
    groupsSaved: 24000,
    trustScore: 4.8,
  };

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0047AB] to-[#6EE7B7] p-6 lg:p-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-white">Hi, {user?.name || 'User'} 👋</h2>
            <p className="text-white/80 text-sm mt-1">Ready to save together?</p>
          </div>
          <Avatar className="h-12 w-12 border-2 border-white">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback>{user?.name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <StatCard
            icon={<Package className="w-5 h-5" />}
            label="Active Orders"
            value={memberStats.activeOrders}
            color="primary"
          />
          <StatCard
            icon={<TrendingDown className="w-5 h-5" />}
            label="Total Saved"
            value={`₦${(memberStats.groupsSaved / 1000).toFixed(0)}K`}
            color="primary"
          />
          <StatCard
            icon={<Star className="w-5 h-5" />}
            label="Trust Score"
            value={memberStats.trustScore}
            color="primary"
          />
        </div>
      </div>

      {/* Active Orders Section */}
      {activeOrders.length > 0 && (
        <div className="px-4 lg:px-8 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#0047AB]" />
              Active Orders
            </h3>
            <Badge variant="secondary" className="bg-[#0047AB]/10 text-[#0047AB]">
              {activeOrders.length}
            </Badge>
          </div>

          <div className="space-y-3">
            {activeOrders.map((transaction) => (
              <Card
                key={transaction.id}
                className="cursor-pointer hover:shadow-md transition-shadow border-[#0047AB]/20"
                onClick={() => navigate('tracking')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900">{transaction.productName}</p>
                        <Badge
                          variant="secondary"
                          className="bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20 text-xs"
                        >
                          {transaction.status === 'pending_inspection' ? 'Inspect Now' : 'In Transit'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{transaction.sellerName}</p>
                    </div>
                    <Shield className="w-5 h-5 text-[#0047AB] flex-shrink-0" />
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500">Escrow Amount</span>
                    <span className="font-semibold text-[#0047AB]">
                      ${Number(transaction.amount).toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4 lg:px-8 mt-6">
        <h3 className="mb-4 text-sm font-semibold text-gray-600">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => navigate('group-create')}
            className="h-20 flex flex-col items-center justify-center gap-2 bg-[#0047AB] hover:bg-[#003D96]"
          >
            <Plus className="w-6 h-6" />
            <span className="text-xs">Create Group</span>
          </Button>
          <Button
            onClick={() => navigate('products')}
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
          >
            <Package className="w-6 h-6" />
            <span className="text-xs">Browse Products</span>
          </Button>
          <Button
            onClick={() => navigate('tracking')}
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
          >
            <Shield className="w-6 h-6" />
            <span className="text-xs">View Orders</span>
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

      {/* My Groups */}
      <div className="px-4 lg:px-8 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3>My Groups</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('groups')}
            className="text-[#0047AB]"
          >
            See All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {groupsLoading && groups.length === 0 ? (
            <div className="flex items-center justify-center py-8 col-span-2">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              <p className="text-gray-500 ml-2">Loading groups...</p>
            </div>
          ) : userGroups.length === 0 ? (
            <div className="col-span-2 text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 mb-3">No groups yet</p>
              <Button onClick={() => navigate('group-create')} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Group
              </Button>
            </div>
          ) : (
            userGroups.map((group) => (
              <Card
                key={group.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate('group-detail', group.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4>{group.name}</h4>
                        <Badge
                          variant={group.status === 'active' ? 'default' : 'secondary'}
                          className={group.status === 'active' ? 'bg-[#6EE7B7]' : ''}
                        >
                          {group.status}
                        </Badge>
                      </div>
                      <p className="text-gray-500 text-sm">{group.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{group.member_count} members</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">MOQ Progress</span>
                      <span className="text-[#0047AB]">
                        {Math.round((group.current_quantity / group.moq_target) * 100)}%
                      </span>
                    </div>
                    <Progress
                      value={(group.current_quantity / group.moq_target) * 100}
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Popular Deals */}
      <div className="px-4 lg:px-8 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3>Popular Deals</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('products')}
            className="text-[#0047AB]"
          >
            See All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {loadingProducts ? (
          <LoadingState count={3} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {popularDeals.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate('products')}
              >
                <CardContent className="p-3">
                  <div className="w-full h-32 bg-gray-100 rounded-lg mb-3 overflow-hidden">
                    <ImageWithFallback
                      src={`https://images.unsplash.com/photo-1633536706496-873ce0d46277?w=400&h=300&fit=crop`}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h5 className="mb-2 line-clamp-2">{product.name}</h5>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-[#0047AB]">₦{product.bulkPrice}</span>
                    <span className="text-gray-400 line-through text-sm">₦{product.retailPrice}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <Badge variant="secondary" className="bg-[#FACC15]/20 text-[#0047AB]">
                      Save{' '}
                      {Math.round(
                        ((product.retailPrice - product.bulkPrice) / product.retailPrice) * 100
                      )}
                      %
                    </Badge>
                    <span className="text-gray-500">MOQ: {product.moq}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Vendors Near You */}
      <div className="px-4 lg:px-8 mt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h3>Recommended Vendors</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('products')}
            className="text-[#0047AB]"
          >
            All Vendors
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {loadingProducts ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-3">
                  <div className="w-full h-24 bg-gray-200 rounded-lg mb-3 animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {vendors.slice(0, 4).map((vendor) => (
              <Card key={vendor.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="w-full h-24 bg-gradient-to-br from-[#0047AB]/10 to-[#6EE7B7]/10 rounded-lg mb-3 flex items-center justify-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <ImageWithFallback
                        src={vendor.image || 'https://via.placeholder.com/48'}
                        alt={vendor.name}
                        className="w-12 h-12 rounded-full"
                      />
                    </div>
                  </div>
                  <h5 className="mb-1 text-sm font-medium line-clamp-1">{vendor.name}</h5>
                  <div className="flex items-center gap-1 mb-1">
                    <Star className="w-3 h-3 fill-[#FACC15] text-[#FACC15]" />
                    <span className="text-xs">{vendor.rating}</span>
                    {vendor.is_verified && (
                      <Badge variant="secondary" className="ml-auto text-xs bg-[#6EE7B7]/20">
                        ✓
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-gray-500 text-xs">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{vendor.location || 'Unknown'}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
