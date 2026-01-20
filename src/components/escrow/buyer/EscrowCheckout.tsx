import { useState } from 'react';
import { ArrowLeft, Shield, Info, CheckCircle2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { InfoCard } from '../InfoCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { Screen } from '../../../App';
import { toast } from 'sonner';

interface EscrowCheckoutProps {
  navigate: (screen: Screen) => void;
  productName?: string;
  sellerName?: string;
  sellerVerified?: boolean;
  amount?: number;
}

export function EscrowCheckout({ 
  navigate,
  productName = 'Premium Copy Paper (10 reams)',
  sellerName = 'Office Essentials Plus',
  sellerVerified = true,
  amount = 215.96
}: EscrowCheckoutProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const escrowFee = amount * 0.03; // 3% escrow protection fee
  const total = amount + escrowFee;

  const handlePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      toast.success('Payment secured in escrow!');
      navigate('escrow-buyer-dashboard');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('checkout')} className="p-1">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900">Secure Payment</h1>
            <p className="text-xs text-gray-500">Protected by Escrow</p>
          </div>
          <Shield className="w-6 h-6 text-[#0047AB]" />
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {/* Product Summary */}
        <Card className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{productName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-gray-600">{sellerName}</p>
                {sellerVerified && (
                  <Badge variant="secondary" className="bg-[#6EE7B7]/10 text-[#10B981] border-[#6EE7B7]/20 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Escrow Protection Notice */}
        <InfoCard
          icon={Shield}
          title="Your Payment is Protected"
          description="Funds are held securely in escrow and only released after you confirm delivery and quality."
          variant="info"
        >
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-[#0047AB] p-0 h-auto">
                <Info className="w-4 h-4 mr-1" />
                How Escrow Works
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>How Escrow Protection Works</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0047AB] text-white flex items-center justify-center text-xs font-semibold">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Payment Secured</h4>
                      <p className="text-sm text-gray-600">Your payment is locked in escrow - seller cannot access it yet.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0047AB] text-white flex items-center justify-center text-xs font-semibold">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Seller Ships Order</h4>
                      <p className="text-sm text-gray-600">Seller receives confirmation and ships your order with tracking.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0047AB] text-white flex items-center justify-center text-xs font-semibold">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">72-Hour Inspection</h4>
                      <p className="text-sm text-gray-600">After delivery, you have 72 hours to inspect and confirm quality.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#10B981] text-white flex items-center justify-center text-xs font-semibold">
                      4
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Funds Released</h4>
                      <p className="text-sm text-gray-600">Once approved, funds are released to seller. Auto-release after 72 hours.</p>
                    </div>
                  </div>
                </div>
                <div className="bg-[#FACC15]/10 border border-[#FACC15]/20 rounded-lg p-3">
                  <p className="text-xs text-gray-700">
                    <strong>Protection Guarantee:</strong> If there's an issue, you can open a dispute within the inspection window. Our team will review evidence and ensure fair resolution.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </InfoCard>

        {/* Payment Breakdown */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Payment Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Product Price</span>
              <span className="font-medium text-gray-900">${amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 flex items-center gap-1">
                Escrow Protection Fee
                <Info className="w-3 h-3 text-gray-400" />
              </span>
              <span className="font-medium text-gray-900">${escrowFee.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between">
              <span className="font-semibold text-gray-900">Total Amount</span>
              <span className="font-semibold text-[#0047AB] text-lg">${total.toFixed(2)}</span>
            </div>
          </div>
        </Card>

        {/* Escrow Rules */}
        <Card className="p-4 bg-gray-50 border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3 text-sm">Escrow Agreement</h4>
          <ul className="space-y-2 text-xs text-gray-600">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" />
              <span>Funds are locked until delivery confirmation or 72-hour inspection period expires</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" />
              <span>You can open a dispute within 72 hours of delivery if issues arise</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" />
              <span>Auto-release occurs if no action is taken within inspection window</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" />
              <span>All disputes are reviewed by platform moderators with evidence from both parties</span>
            </li>
          </ul>
        </Card>

        {/* Payment Button */}
        <div className="space-y-3 pt-2">
          <Button 
            onClick={handlePayment} 
            disabled={isProcessing}
            className="w-full bg-[#0047AB] hover:bg-[#0047AB]/90 text-white h-12"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing Payment...
              </div>
            ) : (
              <>
                <Shield className="w-5 h-5 mr-2" />
                Pay ${total.toFixed(2)} Securely
              </>
            )}
          </Button>
          <p className="text-xs text-center text-gray-500">
            By proceeding, you agree to the escrow terms and conditions
          </p>
        </div>
      </div>
    </div>
  );
}
