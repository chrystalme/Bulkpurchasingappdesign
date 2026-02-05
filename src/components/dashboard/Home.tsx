import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchGroups } from '../../store/slices/groupsSlice';
import { fetchProducts, fetchVendors, fetchTransactions } from '../../store/slices';
import { selectProducts, selectProductsLoading, selectVendors, selectVendorsLoading, selectTransactions, selectTransactionsLoading } from '../../store/selectors';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Progress } from '../ui/progress';
import { Plus, ChevronRight, Star, MapPin, TrendingDown, Users, Shield, Package, MessageCircle, Loader2 } from 'lucide-react';
import type { Screen } from '../../App';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface HomeProps {
  navigate: (screen: Screen, groupId?: string) => void;
}

export function Home({ navigate }: HomeProps) {
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
  const activeEscrowTransactions = escrowTransactions.filter(
    t => t.status === 'pending_inspection' || t.status === 'locked'
  );

  // Compute user stats from Redux
  const userStats = {
    groups: groups.length,
    saved: 24000,
    rating: 4.8,
  };

  const userGroups = groups.slice(0, 2);

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
        <div className="grid grid-cols-3 lg:grid-cols-3 gap-3 mt-6">
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardContent className="p-3 text-center">
              <Users className="w-5 h-5 text-white mx-auto mb-1" />
              <div className="text-white">{userStats.groups}</div>
              <div className="text-white/80 text-xs">Groups</div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardContent className="p-3 text-center">
              <TrendingDown className="w-5 h-5 text-[#FACC15] mx-auto mb-1" />
              <div className="text-white">₦{(userStats.saved / 1000).toFixed(0)}K</div>
              <div className="text-white/80 text-xs">Saved</div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardContent className="p-3 text-center">
              <Star className="w-5 h-5 text-[#FACC15] mx-auto mb-1" />
              <div className="text-white">{userStats.rating}</div>
              <div className="text-white/80 text-xs">Rating</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Escrow Quick Access - New Section */}
      {activeEscrowTransactions.length > 0 && (
        <div className="px-4 lg:px-8 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#0047AB]" />
              Active Escrow Transactions
            </h3>
            <Badge variant="secondary" className="bg-[#0047AB]/10 text-[#0047AB]">
              {activeEscrowTransactions.length}
            </Badge>
          </div>
          
          <div className="space-y-3">
            {activeEscrowTransactions.map((transaction) => (
              <Card
                key={transaction.id}
                className="cursor-pointer hover:shadow-md transition-shadow border-[#0047AB]/20"
                onClick={() => navigate('escrow-buyer-dashboard')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900">{transaction.productName}</p>
                        <Badge variant="secondary" className="bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20 text-xs">
                          {transaction.status === 'pending_inspection' ? 'Inspect Now' : 'In Transit'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{transaction.sellerName}</p>
                    </div>
                    <Shield className="w-5 h-5 text-[#0047AB] flex-shrink-0" />
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500">Escrow Amount</span>
                    <span className="font-semibold text-[#0047AB]">${transaction.amount.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Quick Action - View Escrow Demo Flows */}
      <div className="px-4 lg:px-8 mt-6">
        <Card className="bg-gradient-to-br from-[#0047AB]/5 to-[#6EE7B7]/5 border-[#0047AB]/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#0047AB] flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">Escrow Protection System</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Explore secure transaction flows for buyers and sellers
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate('escrow-checkout')}
                    className="text-[#0047AB] border-[#0047AB]/20"
                  >
                    <Package className="w-4 h-4 mr-1" />
                    Buyer Flow
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate('escrow-seller-order')}
                    className="text-[#10B981] border-[#10B981]/20"
                  >
                    <Package className="w-4 h-4 mr-1" />
                    Seller Flow
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate('escrow-mediation')}
                    className="text-[#FB7185] border-[#FB7185]/20"
                  >
                    Dispute View
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Dashboard Access */}
      <div className="px-4 lg:px-8 mt-6">
        <Card className="bg-gradient-to-br from-[#10B981]/5 to-[#6EE7B7]/5 border-[#10B981]/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#10B981] flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">Vendor Dashboard</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Manage products, orders, and customers as a vendor
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('vendor-dashboard')}
                  className="text-[#10B981] border-[#10B981]/20"
                >
                  <Package className="w-4 h-4 mr-1" />
                  Open Vendor Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Dashboard Quick Access */}
      <div className="px-4 lg:px-8 mt-6">
        <Card className="bg-gradient-to-br from-[#0047AB]/5 to-[#6EE7B7]/5 border-[#0047AB]/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#0047AB] flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">Messages</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Chat with your groups and vendors
                </p>
                <div className="flex gap-2">
                  <Badge className="bg-[#FB7185] text-white">
                    10 unread
                  </Badge>
                  <Badge variant="outline" className="border-[#0047AB] text-[#0047AB]">
                    3 groups
                  </Badge>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('chat-dashboard')}
                  className="text-[#0047AB] border-[#0047AB]/20 mt-3"
                >
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Open Messages
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Groups */}
      <div className="px-4 lg:px-8 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3>My Groups</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('group-create')}
            className="text-[#0047AB]"
          >
            <Plus className="w-4 h-4 mr-1" />
            Create
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
              <Button onClick={() => navigate('create-group')} size="sm">
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
                    <span className="text-sm text-gray-600">
                      {group.member_count} members
                    </span>
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
                      Save {Math.round(((product.retailPrice - product.bulkPrice) / product.retailPrice) * 100)}%
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
      <div className="px-4 lg:px-8 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3>Vendors Near You</h3>
          <ChevronRight className="w-5 h-5 text-gray-400" />
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
            {vendors.map((vendor) => (
              <Card
                key={vendor.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
              >
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
                  <h5 className="mb-1">{vendor.name}</h5>
                  <div className="flex items-center gap-1 mb-1">
                    <Star className="w-3 h-3 fill-[#FACC15] text-[#FACC15]" />
                    <span className="text-sm">{vendor.rating}</span>
                    {vendor.is_verified && (
                      <Badge variant="secondary" className="ml-auto text-xs bg-[#6EE7B7]/20">
                        Verified
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-gray-500 text-sm">
                    <MapPin className="w-3 h-3" />
                    <span>{vendor.location || 'Unknown'}</span>
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