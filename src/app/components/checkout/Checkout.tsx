import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { ArrowLeft, CreditCard, Wallet, Users, CheckCircle2, Shield } from 'lucide-react';
import type { Screen } from '../../App';
import { mockMembers } from '../../lib/mockData';

interface CheckoutProps {
  navigate: (screen: Screen) => void;
}

export function Checkout({ navigate }: CheckoutProps) {
  const [paymentMethod, setPaymentMethod] = useState('full');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const subtotal = 189.96;
  const shipping = 5.00;
  const total = subtotal + shipping;
  const perMemberCost = total / 3;

  const handlePlaceOrder = () => {
    setShowConfirmation(true);
    setTimeout(() => {
      setShowConfirmation(false);
      navigate('tracking');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 lg:p-6 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('cart')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h3>Checkout</h3>
        </div>
      </div>

      <div className="p-4 lg:p-6">
        <div className="max-w-3xl mx-auto space-y-4">
        {/* Escrow Protection Banner */}
        <Card className="bg-gradient-to-br from-[#0047AB]/5 to-[#6EE7B7]/5 border-[#0047AB]/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-[#0047AB] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">Protected by Escrow</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Your payment is secured until delivery is confirmed. Safe for both buyers and sellers.
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('escrow-checkout')}
                  className="text-[#0047AB] border-[#0047AB]/20"
                >
                  Learn More & Pay with Escrow
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardContent className="p-4">
            <h4 className="mb-3">Order Summary</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">2 Products</span>
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
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardContent className="p-4">
            <h4 className="mb-4">Payment Method</h4>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <RadioGroupItem value="full" id="full" />
                  <Label htmlFor="full" className="flex items-center gap-3 flex-1 cursor-pointer">
                    <div className="w-10 h-10 bg-[#0047AB]/10 rounded-full flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-[#0047AB]" />
                    </div>
                    <div className="flex-1">
                      <div>Pay Full Amount</div>
                      <div className="text-sm text-gray-500">You pay the total amount</div>
                    </div>
                    <span className="text-[#0047AB]">₦{total.toFixed(2)}</span>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <RadioGroupItem value="split" id="split" />
                  <Label htmlFor="split" className="flex items-center gap-3 flex-1 cursor-pointer">
                    <div className="w-10 h-10 bg-[#6EE7B7]/20 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-[#0047AB]" />
                    </div>
                    <div className="flex-1">
                      <div>Split Among Members</div>
                      <div className="text-sm text-gray-500">Each member pays their share</div>
                    </div>
                    <span className="text-[#0047AB]">₦{perMemberCost.toFixed(2)}/person</span>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Split Details */}
        {paymentMethod === 'split' && (
          <Card className="bg-gradient-to-br from-[#0047AB]/5 to-[#6EE7B7]/5">
            <CardContent className="p-4">
              <h4 className="mb-3">Payment Split</h4>
              <div className="space-y-3">
                {mockMembers.slice(0, 3).map((member, index) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>{member.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm">{member.name}</div>
                        <div className="text-xs text-gray-500">
                          {index === 0 ? 'Admin - Will collect' : 'Pending'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[#0047AB]">₦{perMemberCost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Details */}
        <Card>
          <CardContent className="p-4">
            <h4 className="mb-4">Card Details</h4>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <div className="relative">
                  <Input
                    id="cardNumber"
                    placeholder="1234 5678 9012 3456"
                    className="pl-10"
                  />
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input id="expiry" placeholder="MM/YY" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input id="cvv" placeholder="123" type="password" maxLength={3} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Address */}
        <Card>
          <CardContent className="p-4">
            <h4 className="mb-3">Delivery Address</h4>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm">
                123 Main Street, Victoria Island<br />
                Lagos, Nigeria<br />
                +234 801 234 5678
              </p>
              <Button variant="link" className="p-0 h-auto mt-2 text-[#0047AB]">
                Change Address
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Place Order Button */}
        <Button
          className="w-full bg-[#0047AB] hover:bg-[#0047AB]/90"
          size="lg"
          onClick={handlePlaceOrder}
        >
          <Wallet className="w-4 h-4 mr-2" />
          Place Order - ₦{paymentMethod === 'full' ? total.toFixed(2) : perMemberCost.toFixed(2)}
        </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              <div className="w-16 h-16 bg-[#6EE7B7]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-[#6EE7B7]" />
              </div>
              Order Placed Successfully!
            </DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-2">
            <p className="text-gray-600">
              Your group order has been confirmed and is being processed.
            </p>
            <p className="text-sm text-gray-500">
              You'll receive updates on your order status.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}