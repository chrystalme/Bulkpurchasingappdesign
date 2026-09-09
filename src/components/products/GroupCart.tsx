import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { ArrowLeft, Minus, Plus, Trash2, Users } from 'lucide-react';
import type { Screen } from '../../App';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { fetchProducts } from '../../store/slices/productsSlice';
import { fetchGroupById } from '../../store/slices/groupsSlice';
import { selectProducts, selectProductsLoading, selectProductsError } from '../../store/selectors/productsSelectors';
import { getProductImage } from '../../lib/productImages';
import {
  setCartGroup,
  addItem,
  removeItem,
  updateQuantity,
  updateAllocation,
} from '../../store/slices/cartSlice';
import type { Product, GroupMember } from '../../lib/types';

interface GroupCartProps {
  navigate: (screen: Screen, groupId?: string) => void;
  groupId: string | null;
}

export function GroupCart({ navigate, groupId }: GroupCartProps) {
  const dispatch = useAppDispatch();
  const [error, setError] = useState<string | null>(null);

  const products = useAppSelector(selectProducts);
  const loading = useAppSelector(selectProductsLoading);
  const cartItems = useAppSelector(state => state.cart.items);
  const cartGroupId = useAppSelector(state => state.cart.groupId);
  const currentGroup = useAppSelector(state => state.groups.currentGroup);

  const members: GroupMember[] = currentGroup?.members || [];

  // Set cart group when component mounts or groupId changes
  useEffect(() => {
    if (groupId && cartGroupId !== groupId) {
      dispatch(setCartGroup(groupId));
    }
    if (groupId && (!currentGroup || currentGroup.id !== groupId)) {
      dispatch(fetchGroupById(groupId) as any);
    }
  }, [dispatch, groupId, cartGroupId, currentGroup]);

  useEffect(() => {
    if (products.length === 0) {
      dispatch(fetchProducts() as any);
    }
  }, [dispatch, products.length]);

  const cartProducts = products.filter(p => 
    cartItems.some(item => item.productId === p.id?.toString())
  );

  const handleUpdateQuantity = (productId: string, delta: number) => {
    dispatch(updateQuantity({ productId, delta }));
  };

  const handleRemoveItem = (productId: string) => {
    dispatch(removeItem(productId));
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const product = cartProducts.find(p => p.id?.toString() === item.productId);
      return total + (product ? product.bulkPrice * item.quantity : 0);
    }, 0);
  };

  const calculateMemberShare = (member: GroupMember) => {
    return cartItems.reduce((total, item) => {
      const product = cartProducts.find(p => p.id?.toString() === item.productId);
      const allocation = item.allocations.find(
        a => a.memberId === member.user_id || a.memberId === member.id
      );
      return total + (product && allocation ? product.bulkPrice * allocation.quantity : 0);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const shipping = 5.00;
  const total = subtotal + shipping;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F4F5]">
        <div className="bg-white border-b border-gray-200 p-4 lg:p-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('group-detail', groupId)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h3>Group Cart</h3>
          </div>
        </div>
        <div className="p-4 lg:p-6">
          <div className="max-w-4xl mx-auto">
            <LoadingState count={2} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F4F4F5]">
        <div className="bg-white border-b border-gray-200 p-4 lg:p-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('group-detail', groupId)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h3>Group Cart</h3>
          </div>
        </div>
        <div className="p-4 lg:p-6">
          <div className="max-w-4xl mx-auto">
            <ErrorState 
              title="Failed to load cart"
              description={error}
              onRetry={() => dispatch(fetchProducts() as any)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F5]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 lg:p-6 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('group-detail', groupId)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h3>Group Cart</h3>
          <Badge className="ml-auto bg-[#0047AB]">
            {cartItems.length} items
          </Badge>
        </div>
      </div>

      <div className="p-4 lg:p-6">
        <div className="max-w-4xl mx-auto lg:grid lg:grid-cols-3 lg:gap-6 space-y-4 lg:space-y-0">
          {/* Left Column - Cart Items */}
          <div className="lg:col-span-2 space-y-3">

          {cartProducts.map((product) => {
            const cartItem = cartItems.find(item => item.productId === product.id?.toString());
            if (!cartItem) return null;

            return (
              <Card key={product.id}>
                <CardContent className="p-4">
                  <div className="flex gap-3 mb-3">
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                      <ImageWithFallback
                        src={getProductImage(product.image)}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="mb-1">{product.name}</h5>
                      <p className="text-sm text-gray-500 mb-2">{product.vendorName || 'Unknown Vendor'}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[#0047AB]">₦{product.bulkPrice}</span>
                        <span className="text-gray-400 line-through text-sm">₦{product.retailPrice}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0"
                      onClick={() => handleRemoveItem(product.id?.toString() || '')}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>

                  <Separator className="my-3" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Group Quantity</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleUpdateQuantity(product.id?.toString() || '', -1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center">{cartItem.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleUpdateQuantity(product.id?.toString() || '', 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Member Allocations */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Member Split</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {cartItem.allocations.map((allocation) => {
                        const member = members.find(m => m.user_id === allocation.memberId || m.id === allocation.memberId);
                        const memberName = member?.name || 'Member';
                        const initial = memberName ? memberName[0].toUpperCase() : 'M';
                        return (
                          <div
                            key={allocation.memberId}
                            className="flex items-center gap-2 bg-gray-50 rounded-full pl-1 pr-3 py-1"
                          >
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={member?.avatar} />
                              <AvatarFallback>{initial}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{memberName}: {allocation.quantity}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>

          {/* Right Column - Summary */}
          <div className="lg:col-span-1 space-y-4">
            {/* Split Cost Calculator */}
            <Card className="bg-gradient-to-br from-[#0047AB]/5 to-[#6EE7B7]/5 lg:sticky lg:top-24">
          <CardContent className="p-4">
            <h4 className="mb-3">Cost Split by Member</h4>
            <div className="space-y-2">
              {members.slice(0, 5).map((member) => {
                const share = calculateMemberShare(member);
                if (share === 0) return null;
                const initial = member.name ? member.name[0].toUpperCase() : 'M';
                return (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>{initial}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{member.name}</span>
                    </div>
                    <span className="text-[#0047AB]">₦{share.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
          <CardContent className="p-4 space-y-3">
            <h4>Order Summary</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span>₦{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span>₦{shipping.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span>Total</span>
                <span className="text-[#0047AB]">₦{total.toFixed(2)}</span>
              </div>
              <div className="bg-[#FACC15]/20 rounded-lg p-3 text-sm">
                <span className="text-[#0047AB]">
                  You're saving ₦{(cartItems.reduce((total, item) => {
                    const product = cartProducts.find(p => p.id?.toString() === item.productId);
                    return total + (product ? (product.retailPrice - product.bulkPrice) * item.quantity : 0);
                  }, 0)).toFixed(2)} with bulk pricing! 🎉
                </span>
              </div>
            </div>
          </CardContent>
            </Card>

            {/* Checkout Button */}
            <div className="space-y-2">
          <Button
            className="w-full bg-[#0047AB] hover:bg-[#0047AB]/90"
            size="lg"
            disabled={cartItems.length === 0}
            onClick={() => navigate('checkout')}
          >
            Proceed to Checkout
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate('products', groupId)}
          >
            Continue Shopping
          </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}