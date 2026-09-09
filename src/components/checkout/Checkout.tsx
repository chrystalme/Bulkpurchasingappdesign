import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import {
  ArrowLeft,
  CreditCard,
  Wallet,
  Users,
  CheckCircle2,
  Shield,
  Loader2,
} from 'lucide-react';
import type { Screen } from '../../App';
import { selectProducts } from '../../store/selectors/productsSelectors';
import { createOrder } from '../../store/slices/ordersSlice';
import { createEscrowTransaction } from '../../store/slices/escrowSlice';
import { clearCart } from '../../store/slices/cartSlice';
import { toast } from 'sonner';

interface CheckoutProps {
  navigate: (screen: Screen) => void;
}

export function Checkout({ navigate }: CheckoutProps) {
  const dispatch = useAppDispatch();
  const [paymentMethod, setPaymentMethod] = useState<'full' | 'split'>('full');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cartItems = useAppSelector(state => state.cart.items);
  const cartGroupId = useAppSelector(state => state.cart.groupId);
  const currentGroup = useAppSelector(state => state.groups.currentGroup);
  const products = useAppSelector(selectProducts);

  const itemsWithDetails = cartItems.map(item => {
    const product = products.find(p => p.id?.toString() === item.productId);
    const price = product ? (product.bulkPrice ?? (product as any).bulk_price ?? 0) : 0;
    return {
      ...item,
      product,
      price,
      total: price * item.quantity,
    };
  });

  const subtotal = itemsWithDetails.reduce((sum, item) => sum + item.total, 0);
  const shipping = cartItems.length > 0 ? 5.0 : 0;
  const total = subtotal + shipping;
  const members = currentGroup?.members || [];
  const memberCount = members.length > 0 ? members.length : 3;
  const perMemberCost = total / memberCount;

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      toast.error('Cart is empty. Please add products first.');
      return;
    }

    try {
      setIsSubmitting(true);

      const orderPayload = itemsWithDetails.map(item => ({
        product_id: item.productId,
        quantity: item.quantity,
        price: item.price,
      }));

      const orderResultAction: any = await dispatch(
        createOrder({ items: orderPayload, groupId: cartGroupId || undefined } as any)
      );

      if (createOrder.rejected.match(orderResultAction)) {
        throw new Error(orderResultAction.payload || 'Order creation failed');
      }

      const createdOrder = orderResultAction.payload;
      const orderId = createdOrder?.id || createdOrder?.data?.id;

      const firstProduct = itemsWithDetails[0]?.product;
      const sellerId =
        firstProduct?.vendorId ||
        (firstProduct as any)?.vendor_id ||
        '00000000-0000-0000-0000-000000000001';
      const escrowFee = Number((total * 0.03).toFixed(2));

      if (orderId) {
        await dispatch(
          createEscrowTransaction({
            orderId,
            sellerId,
            amount: total,
            escrowFee,
          } as any)
        );
      }

      dispatch(clearCart());
      setShowConfirmation(true);
      setTimeout(() => {
        setShowConfirmation(false);
        navigate('tracking');
      }, 2000);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='min-h-screen bg-[#F4F4F5]'>
      {/* Header */}
      <div className='bg-white border-b border-gray-200 p-4 lg:p-6 sticky top-0 z-10'>
        <div className='flex items-center gap-3'>
          <Button variant='ghost' size='icon' onClick={() => navigate('cart')}>
            <ArrowLeft className='w-5 h-5' />
          </Button>
          <h3>Checkout</h3>
        </div>
      </div>

      <div className='p-4 lg:p-6'>
        <div className='max-w-3xl mx-auto space-y-4'>
          {/* Escrow Protection Banner */}
          <Card className='bg-gradient-to-br from-[#0047AB]/5 to-[#6EE7B7]/5 border-[#0047AB]/20'>
            <CardContent className='p-4'>
              <div className='flex items-start gap-3'>
                <Shield className='w-5 h-5 text-[#0047AB] flex-shrink-0 mt-0.5' />
                <div className='flex-1'>
                  <h4 className='font-semibold text-gray-900 mb-1'>
                    Protected by Escrow
                  </h4>
                  <p className='text-sm text-gray-600 mb-3'>
                    Your payment is secured until delivery is confirmed. Safe
                    for both buyers and sellers.
                  </p>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => navigate('escrow-checkout')}
                    className='text-[#0047AB] border-[#0047AB]/20'
                  >
                    Learn More & Pay with Escrow
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardContent className='p-4'>
              <h4 className='mb-3 font-semibold'>Order Summary</h4>
              <div className='space-y-2'>
                {itemsWithDetails.map(item => (
                  <div key={item.productId} className='flex items-center justify-between text-sm'>
                    <span className='text-gray-600 truncate max-w-[200px]'>
                      {item.product?.name || 'Product'} × {item.quantity}
                    </span>
                    <span>₦{item.total.toFixed(2)}</span>
                  </div>
                ))}
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-gray-600'>Shipping</span>
                  <span>₦{shipping.toFixed(2)}</span>
                </div>
                <Separator />
                <div className='flex items-center justify-between font-semibold'>
                  <span>Total</span>
                  <span className='text-[#0047AB]'>₦{total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardContent className='p-4'>
              <h4 className='mb-4'>Payment Method</h4>
              <RadioGroup
                value={paymentMethod}
                onValueChange={setPaymentMethod}
              >
                <div className='space-y-3'>
                  <div className='flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50'>
                    <RadioGroupItem value='full' id='full' />
                    <Label
                      htmlFor='full'
                      className='flex items-center gap-3 flex-1 cursor-pointer'
                    >
                      <div className='w-10 h-10 bg-[#0047AB]/10 rounded-full flex items-center justify-center'>
                        <CreditCard className='w-5 h-5 text-[#0047AB]' />
                      </div>
                      <div className='flex-1'>
                        <div>Pay Full Amount</div>
                        <div className='text-sm text-gray-500'>
                          You pay the total amount
                        </div>
                      </div>
                      <span className='text-[#0047AB]'>
                        ₦{total.toFixed(2)}
                      </span>
                    </Label>
                  </div>

                  <div className='flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50'>
                    <RadioGroupItem value='split' id='split' />
                    <Label
                      htmlFor='split'
                      className='flex items-center gap-3 flex-1 cursor-pointer'
                    >
                      <div className='w-10 h-10 bg-[#6EE7B7]/20 rounded-full flex items-center justify-center'>
                        <Users className='w-5 h-5 text-[#0047AB]' />
                      </div>
                      <div className='flex-1'>
                        <div>Split Among Members</div>
                        <div className='text-sm text-gray-500'>
                          Each member pays their share
                        </div>
                      </div>
                      <span className='text-[#0047AB]'>
                        ₦{perMemberCost.toFixed(2)}/person
                      </span>
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Split Details */}
          {paymentMethod === 'split' && members.length > 0 && (
            <Card className='bg-gradient-to-br from-[#0047AB]/5 to-[#6EE7B7]/5'>
              <CardContent className='p-4'>
                <h4 className='mb-3 font-semibold'>Payment Split</h4>
                <div className='space-y-3'>
                  {members.map((member, index) => (
                    <div
                      key={member.id}
                      className='flex items-center justify-between'
                    >
                      <div className='flex items-center gap-3'>
                        <Avatar className='h-8 w-8'>
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>{member.name ? member.name[0].toUpperCase() : 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className='text-sm font-medium'>{member.name}</div>
                          <div className='text-xs text-gray-500'>
                            {index === 0 ? 'Admin - Collector' : 'Member'}
                          </div>
                        </div>
                      </div>
                      <span className='text-[#0047AB] font-semibold'>
                        ₦{perMemberCost.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Details */}
          <Card>
            <CardContent className='p-4'>
              <h4 className='mb-4'>Card Details</h4>
              <div className='space-y-3'>
                <div className='space-y-2'>
                  <Label htmlFor='cardNumber'>Card Number</Label>
                  <div className='relative'>
                    <Input
                      id='cardNumber'
                      placeholder='1234 5678 9012 3456'
                      className='pl-10'
                    />
                    <CreditCard className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-3'>
                  <div className='space-y-2'>
                    <Label htmlFor='expiry'>Expiry Date</Label>
                    <Input id='expiry' placeholder='MM/YY' />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='cvv'>CVV</Label>
                    <Input
                      id='cvv'
                      placeholder='123'
                      type='password'
                      maxLength={3}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Address */}
          <Card>
            <CardContent className='p-4'>
              <h4 className='mb-3'>Delivery Address</h4>
              <div className='bg-gray-50 rounded-lg p-3'>
                <p className='text-sm'>
                  123 Main Street, Victoria Island
                  <br />
                  Lagos, Nigeria
                  <br />
                  +234 801 234 5678
                </p>
                <Button
                  variant='link'
                  className='p-0 h-auto mt-2 text-[#0047AB]'
                >
                  Change Address
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Place Order Button */}
          <Button
            className='w-full bg-[#0047AB] hover:bg-[#0047AB]/90 text-white font-medium'
            size='lg'
            disabled={isSubmitting || cartItems.length === 0}
            onClick={handlePlaceOrder}
          >
            {isSubmitting ? (
              <div className='flex items-center gap-2'>
                <Loader2 className='w-4 h-4 animate-spin' />
                Processing Order...
              </div>
            ) : (
              <>
                <Wallet className='w-4 h-4 mr-2' />
                Place Order - ₦{paymentMethod === 'full' ? total.toFixed(2) : perMemberCost.toFixed(2)}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-center'>
              <div className='w-16 h-16 bg-[#6EE7B7]/20 rounded-full flex items-center justify-center mx-auto mb-4'>
                <CheckCircle2 className='w-10 h-10 text-[#6EE7B7]' />
              </div>
              Order Placed Successfully!
            </DialogTitle>
          </DialogHeader>
          <div className='text-center space-y-2'>
            <p className='text-gray-600'>
              Your group order has been confirmed and is being processed.
            </p>
            <p className='text-sm text-gray-500'>
              You'll receive updates on your order status.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
