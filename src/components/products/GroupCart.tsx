import { useEffect, useState, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Separator } from '../ui/separator';
import {
  ArrowLeft,
  Minus,
  Plus,
  Trash2,
  Users,
  CheckCircle2,
  Clock,
  Check,
  CreditCard,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import type { Screen } from '../../App';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { fetchProducts } from '../../store/slices/productsSlice';
import { fetchGroupById } from '../../store/slices/groupsSlice';
import { selectProducts, selectProductsLoading } from '../../store/selectors/productsSelectors';
import { getProductImage } from '../../lib/productImages';
import { mockMembers } from '../../lib/mockData';
import {
  setCartGroup,
  removeItem,
  updateQuantity,
  toggleAllocationPaid,
  setMemberPaymentStatus,
  markAllPaid,
} from '../../store/slices/cartSlice';
import type { GroupMember } from '../../lib/types';
import { toast } from 'sonner';

interface GroupCartProps {
  navigate: (screen: Screen, groupId?: string) => void;
  groupId: string | null;
}

export function GroupCart({ navigate, groupId }: GroupCartProps) {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const [error] = useState<string | null>(null);

  const products = useAppSelector(selectProducts);
  const loading = useAppSelector(selectProductsLoading);
  const cartItems = useAppSelector(state => state.cart.items);
  const cartGroupId = useAppSelector(state => state.cart.groupId);
  const currentGroup = useAppSelector(state => state.groups.currentGroup);

  // Combine group members or fallback to mock members from the Figma design
  const members: any[] = useMemo(() => {
    if (currentGroup?.members && currentGroup.members.length > 0) {
      return currentGroup.members;
    }
    return mockMembers.map(m => ({
      id: m.id,
      user_id: m.id,
      name: m.name,
      avatar: m.avatar,
      role: 'member' as const,
      joined_at: new Date().toISOString(),
      email: `${m.name.toLowerCase()}@example.com`,
    }));
  }, [currentGroup?.members]);

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
    toast.info('Item removed from cart');
  };

  const handleTogglePaid = (productId: string, memberId: string) => {
    dispatch(toggleAllocationPaid({ productId, memberId }));
  };

  const handleToggleMemberOverallPaid = (memberId: string, currentPaid: boolean) => {
    dispatch(setMemberPaymentStatus({ memberId, paid: !currentPaid }));
    toast.success(`Updated payment fulfillment for member`);
  };

  const handleMarkAllPaid = () => {
    dispatch(markAllPaid());
    toast.success('All member purchase orders marked as paid!');
  };

  // Helper to ensure each cartItem has allocations showing member contributions towards MOQ
  const getItemAllocations = (cartItem: any, productMoq: number) => {
    if (cartItem.allocations && cartItem.allocations.length > 0) {
      return cartItem.allocations;
    }

    // Default distribution among members if not explicitly set
    const totalQty = cartItem.quantity;
    const count = Math.min(members.length, 3);
    const baseQty = Math.max(1, Math.floor(totalQty / count));
    const remainder = totalQty - baseQty * count;

    return members.slice(0, count).map((m, idx) => ({
      memberId: m.user_id || m.id,
      quantity: idx === 0 ? baseQty + remainder : baseQty,
      paid: idx === 0, // First member paid as initial state
    }));
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const product = cartProducts.find(p => p.id?.toString() === item.productId);
      return total + (product ? product.bulkPrice * item.quantity : 0);
    }, 0);
  };

  const calculateMemberShare = (member: any) => {
    const memberId = member.user_id || member.id;
    return cartItems.reduce((total, item) => {
      const product = cartProducts.find(p => p.id?.toString() === item.productId);
      const allocs = getItemAllocations(item, product?.moq || 10);
      const allocation = allocs.find((a: any) => a.memberId === memberId);
      return total + (product && allocation ? product.bulkPrice * allocation.quantity : 0);
    }, 0);
  };

  const isMemberFullyPaid = (member: any) => {
    const memberId = member.user_id || member.id;
    let hasAllocations = false;
    for (const item of cartItems) {
      const product = cartProducts.find(p => p.id?.toString() === item.productId);
      const allocs = getItemAllocations(item, product?.moq || 10);
      const allocation = allocs.find((a: any) => a.memberId === memberId);
      if (allocation) {
        hasAllocations = true;
        if (!allocation.paid) return false;
      }
    }
    return hasAllocations;
  };

  const subtotal = calculateSubtotal();
  const shipping = cartItems.length > 0 ? 5.0 : 0;
  const total = subtotal + shipping;

  // Calculate fulfillment stats
  const participatingMembers = members.filter(m => calculateMemberShare(m) > 0);
  const paidMembers = participatingMembers.filter(m => isMemberFullyPaid(m));
  const fulfillmentPercentage =
    participatingMembers.length > 0
      ? Math.round((paidMembers.length / participatingMembers.length) * 100)
      : 0;

  const currentUserMember = members.find(
    m => (user && m.user_id === user.id) || (user && m.id === user.id)
  );
  const currentUserShare = currentUserMember ? calculateMemberShare(currentUserMember) : 0;
  const isCurrentUserPaid = currentUserMember ? isMemberFullyPaid(currentUserMember) : false;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F4F5]">
        <div className="bg-white border-b border-gray-200 p-4 lg:p-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('group-detail', groupId || undefined)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h3 className="text-lg font-semibold text-gray-900">Group Cart</h3>
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
              onClick={() => navigate('group-detail', groupId || undefined)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h3 className="text-lg font-semibold text-gray-900">Group Cart</h3>
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
    <div className="min-h-screen bg-[#F4F4F5] pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 lg:p-6 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 max-w-6xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('group-detail', groupId || undefined)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Group Cart & MOQ Fulfillment</h1>
            <p className="text-xs text-gray-500">
              {currentGroup?.name || 'Group Purchase Order'} • {cartItems.length} product{cartItems.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge className="bg-[#0047AB] text-white">
              {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-6 max-w-6xl mx-auto">
        {cartItems.length === 0 ? (
          <Card className="p-12 text-center bg-white border-dashed border-2">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">Your Group Cart is Empty</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              Add products from the marketplace to start pooling quantities towards wholesale MOQ with your group members.
            </p>
            <Button
              className="bg-[#0047AB] hover:bg-[#0047AB]/90 text-white"
              onClick={() => navigate('products', groupId || undefined)}
            >
              Browse Wholesale Products
            </Button>
          </Card>
        ) : (
          <div className="lg:grid lg:grid-cols-3 lg:gap-6 space-y-6 lg:space-y-0">
            {/* Left Column - Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartProducts.map(product => {
                const cartItem = cartItems.find(item => item.productId === product.id?.toString());
                if (!cartItem) return null;

                const targetMoq = product.moq || 10;
                const currentQty = cartItem.quantity;
                const progressPct = Math.min(100, Math.round((currentQty / targetMoq) * 100));
                const isMoqReached = currentQty >= targetMoq;
                const allocations = getItemAllocations(cartItem, targetMoq);

                return (
                  <Card key={product.id} className="overflow-hidden border-gray-200 shadow-sm bg-white">
                    <CardContent className="p-5">
                      {/* Product Header Row */}
                      <div className="flex gap-4">
                        <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden border border-gray-200">
                          <ImageWithFallback
                            src={getProductImage(product.image)}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">
                                {product.name}
                              </h3>
                              <p className="text-xs text-gray-500 mb-2">
                                Vendor: <span className="font-medium text-gray-700">{product.vendorName || 'Verified Supplier'}</span>
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-gray-400 hover:text-red-600 -mt-1 -mr-1"
                              onClick={() => handleRemoveItem(product.id?.toString() || '')}
                              title="Remove product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold text-[#0047AB]">₦{product.bulkPrice}</span>
                            <span className="text-xs text-gray-400 line-through">₦{product.retailPrice}</span>
                            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                              Save ₦{(product.retailPrice - product.bulkPrice).toFixed(0)}/unit
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* MOQ Progress Section */}
                      <div className="mt-4 p-3 bg-blue-50/60 rounded-xl border border-blue-100/80">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-[#0047AB]" />
                            <span className="font-semibold text-gray-800">
                              Wholesale MOQ Target: <span className="text-[#0047AB]">{targetMoq} units</span>
                            </span>
                          </div>
                          {isMoqReached ? (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 text-xs flex items-center gap-1">
                              <Check className="w-3 h-3" /> MOQ Unlocked ({currentQty}/{targetMoq})
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border border-amber-300 text-xs">
                              {targetMoq - currentQty} more needed ({currentQty}/{targetMoq})
                            </Badge>
                          )}
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isMoqReached ? 'bg-emerald-500' : 'bg-[#0047AB]'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center justify-between mt-4 py-2 border-y border-gray-100">
                        <span className="text-sm font-medium text-gray-700">Group Total Quantity</span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-gray-700"
                            onClick={() => handleUpdateQuantity(product.id?.toString() || '', -1)}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </Button>
                          <span className="w-10 text-center font-bold text-gray-900">{cartItem.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-gray-700"
                            onClick={() => handleUpdateQuantity(product.id?.toString() || '', 1)}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Member Allocations towards MOQ & Payment Status */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-[#0047AB]" />
                            <span className="text-sm font-semibold text-gray-900">
                              Member Contributions & Fulfillment
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {allocations.filter((a: any) => a.paid).length} of {allocations.length} paid
                          </span>
                        </div>

                        <div className="space-y-2">
                          {allocations.map((allocation: any) => {
                            const member = members.find(
                              m => m.user_id === allocation.memberId || m.id === allocation.memberId
                            );
                            const memberName = member?.name || 'Group Member';
                            const initial = memberName ? memberName[0].toUpperCase() : 'M';
                            const isCurrentUser =
                              user &&
                              (user.id === allocation.memberId ||
                                user.email === member?.email ||
                                (currentUserMember &&
                                  (currentUserMember.user_id === allocation.memberId ||
                                    currentUserMember.id === allocation.memberId)));
                            const memberCost = allocation.quantity * product.bulkPrice;
                            const isPaid = !!allocation.paid;

                            return (
                              <div
                                key={allocation.memberId}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-gray-200/70 bg-gray-50/50 hover:bg-gray-50 transition-colors gap-3"
                              >
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-9 w-9 ring-2 ring-white shadow-xs">
                                    <AvatarImage src={member?.avatar} alt={memberName} />
                                    <AvatarFallback>{initial}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-sm font-semibold text-gray-900">
                                        {memberName}
                                      </span>
                                      {isCurrentUser && (
                                        <span className="text-[10px] bg-blue-100 text-[#0047AB] px-1.5 py-0.2 rounded font-medium">
                                          You
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {allocation.quantity} units towards MOQ ({Math.round((allocation.quantity / targetMoq) * 100)}%)
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200/50">
                                  <div className="text-right">
                                    <div className="text-[11px] text-gray-500">Cost Share</div>
                                    <div className="text-sm font-bold text-[#0047AB]">
                                      ₦{memberCost.toFixed(2)}
                                    </div>
                                  </div>

                                  {/* Paid / Unpaid Badge */}
                                  <Badge
                                    className={`px-2.5 py-1 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors select-none ${
                                      isPaid
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                        : 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                                    }`}
                                    onClick={() => handleTogglePaid(product.id.toString(), allocation.memberId)}
                                    title="Click to toggle Paid / Unpaid fulfillment"
                                  >
                                    {isPaid ? (
                                      <>
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        Paid
                                      </>
                                    ) : (
                                      <>
                                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                                        Unpaid
                                      </>
                                    )}
                                  </Badge>

                                  <Button
                                    size="sm"
                                    variant={isPaid ? 'ghost' : 'outline'}
                                    className={`h-7 text-xs px-2.5 ${
                                      isPaid
                                        ? 'text-gray-500 hover:text-red-600'
                                        : 'text-[#0047AB] border-blue-200 hover:bg-blue-50 font-medium'
                                    }`}
                                    onClick={() => handleTogglePaid(product.id.toString(), allocation.memberId)}
                                  >
                                    {isPaid ? 'Mark Unpaid' : isCurrentUser ? 'Pay Share' : 'Mark Paid'}
                                  </Button>
                                </div>
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

            {/* Right Column - Summary & Fulfillment */}
            <div className="lg:col-span-1 space-y-4">
              {/* Fulfillment Progress Tracker Card */}
              <Card className="bg-gradient-to-br from-[#0047AB]/5 to-[#6EE7B7]/10 border-blue-100">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Order Fulfillment Status
                    </h4>
                    <span className="text-xs font-bold text-[#0047AB]">{fulfillmentPercentage}%</span>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${fulfillmentPercentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-600 pt-1">
                    <span>
                      {paidMembers.length} of {participatingMembers.length} members paid
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] text-[#0047AB] hover:text-[#0047AB]/80 p-0"
                      onClick={handleMarkAllPaid}
                    >
                      Mark All Paid
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Split Cost by Member Card */}
              <Card className="border-gray-200 shadow-sm bg-white">
                <CardContent className="p-4">
                  <h4 className="font-bold text-gray-900 text-sm mb-3">Cost Split by Member</h4>
                  <div className="space-y-3">
                    {participatingMembers.map(member => {
                      const share = calculateMemberShare(member);
                      const initial = member.name ? member.name[0].toUpperCase() : 'M';
                      const isPaid = isMemberFullyPaid(member);
                      const memberId = member.user_id || member.id;
                      const isCurrentUser = user && (user.id === memberId || user.email === member.email);

                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-gray-50/80 border border-gray-100"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-7 w-7 flex-shrink-0">
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback>{initial}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-900 truncate">
                                {member.name} {isCurrentUser && <span className="text-blue-600">(You)</span>}
                              </p>
                              <p className="text-[11px] text-[#0047AB] font-bold">₦{share.toFixed(2)}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              className={`text-[10px] px-2 py-0.5 cursor-pointer ${
                                isPaid
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : 'bg-amber-100 text-amber-800 border-amber-200'
                              }`}
                              onClick={() => handleToggleMemberOverallPaid(memberId, isPaid)}
                            >
                              {isPaid ? 'Paid' : 'Unpaid'}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Order Summary Card */}
              <Card className="border-gray-200 shadow-sm bg-white">
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-bold text-gray-900 text-sm">Order Summary</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-semibold text-gray-900">₦{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Shipping</span>
                      <span className="font-semibold text-gray-900">₦{shipping.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">Total Group Cost</span>
                      <span className="text-lg font-extrabold text-[#0047AB]">₦{total.toFixed(2)}</span>
                    </div>

                    <div className="bg-[#FACC15]/20 rounded-lg p-3 text-xs text-amber-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-700 flex-shrink-0" />
                      <span>
                        Group savings of ₦
                        {cartItems
                          .reduce((sum, item) => {
                            const product = cartProducts.find(p => p.id?.toString() === item.productId);
                            return (
                              sum +
                              (product ? (product.retailPrice - product.bulkPrice) * item.quantity : 0)
                            );
                          }, 0)
                          .toFixed(2)}{' '}
                        with wholesale bulk pricing!
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Checkout Action Buttons */}
              <div className="space-y-2 pt-1">
                {currentUserShare > 0 && !isCurrentUserPaid && (
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-11"
                    onClick={() => {
                      if (currentUserMember) {
                        handleToggleMemberOverallPaid(
                          currentUserMember.user_id || currentUserMember.id,
                          false
                        );
                        toast.success('Your share has been paid!');
                      }
                    }}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pay My Share (₦{currentUserShare.toFixed(2)})
                  </Button>
                )}

                <Button
                  className="w-full bg-[#0047AB] hover:bg-[#0047AB]/90 text-white font-semibold h-11"
                  disabled={cartItems.length === 0}
                  onClick={() => navigate('checkout')}
                >
                  Proceed to Group Checkout
                </Button>

                <Button
                  variant="outline"
                  className="w-full text-gray-700 h-10"
                  onClick={() => navigate('products', groupId || undefined)}
                >
                  Continue Shopping
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}