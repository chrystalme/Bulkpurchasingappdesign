import { ArrowLeft, Package, Shield, Clock, Info, AlertCircle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { EscrowTimeline } from '../EscrowTimeline';
import { EscrowStatusBadge } from '../EscrowStatusBadge';
import { CountdownTimer } from '../CountdownTimer';
import { InfoCard } from '../InfoCard';
import { Screen } from '../../../App';
import { mockEscrowTransactions } from '../../../lib/mockData';

interface BuyerTransactionDashboardProps {
  navigate: (screen: Screen) => void;
  transactionId?: string;
}

export function BuyerTransactionDashboard({ 
  navigate,
  transactionId = 'ESC-001'
}: BuyerTransactionDashboardProps) {
  // In a real app, fetch transaction by ID
  const transaction = mockEscrowTransactions.find(t => t.id === transactionId) || mockEscrowTransactions[0];

  const canInspect = transaction.status === 'pending_inspection' && transaction.deliveredAt;

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('tracking')} className="p-1">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900">Transaction {transaction.id}</h1>
            <p className="text-xs text-gray-500">Escrow Protected</p>
          </div>
          <Shield className="w-6 h-6 text-[#0047AB]" />
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {/* Status Badge */}
        <div className="flex justify-center">
          <EscrowStatusBadge status={transaction.status} />
        </div>

        {/* Inspection Window Timer */}
        {transaction.status === 'pending_inspection' && transaction.inspectionDeadline && (
          <InfoCard
            icon={Clock}
            title="Inspection Window Active"
            description="You have a limited time to inspect your order and confirm quality."
            variant="warning"
          >
            <CountdownTimer 
              targetDate={transaction.inspectionDeadline}
              label="Time remaining:"
              className="mt-2"
            />
            <div className="mt-4 flex gap-2">
              <Button 
                onClick={() => navigate('escrow-inspection')}
                className="flex-1 bg-[#0047AB] hover:bg-[#0047AB]/90 text-white"
              >
                Start Inspection
              </Button>
            </div>
          </InfoCard>
        )}

        {/* Auto-Release Warning */}
        {transaction.status === 'pending_inspection' && transaction.autoReleaseAt && (
          <Card className="p-4 bg-[#FACC15]/5 border-[#FACC15]/20">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-[#FACC15] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">Auto-Release Notice</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Funds will be automatically released to the seller if no action is taken before the deadline.
                </p>
                <CountdownTimer 
                  targetDate={transaction.autoReleaseAt}
                  label="Auto-release in:"
                />
              </div>
            </div>
          </Card>
        )}

        {/* Transaction Timeline */}
        <Card className="p-4 md:p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Transaction Progress</h3>
          <EscrowTimeline transaction={transaction} />
        </Card>

        {/* Escrow Status */}
        <Card className="p-4">
          <div className="flex items-start gap-3 mb-4">
            <Shield className="w-5 h-5 text-[#0047AB] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Escrow Status</h3>
              <p className="text-sm text-gray-600">
                {transaction.status === 'locked' && 'Your funds are secured. Seller cannot access them until delivery is confirmed.'}
                {transaction.status === 'pending_inspection' && 'Funds are locked pending your inspection. Review your order before the deadline.'}
                {transaction.status === 'released' && 'Funds have been released to the seller. Transaction complete.'}
                {transaction.status === 'disputed' && 'Transaction is under dispute review. Evidence is being evaluated.'}
              </p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Amount Locked</span>
              <span className="font-semibold text-gray-900">${transaction.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Escrow Fee</span>
              <span className="font-semibold text-gray-900">${transaction.escrowFee.toFixed(2)}</span>
            </div>
          </div>
        </Card>

        {/* Shipment Details */}
        {transaction.trackingId && (
          <Card className="p-4">
            <div className="flex items-start gap-3 mb-3">
              <Package className="w-5 h-5 text-gray-700 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Shipment Details</h3>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tracking ID</span>
                <span className="font-medium text-[#0047AB]">{transaction.trackingId}</span>
              </div>
              {transaction.courier && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Courier</span>
                  <span className="font-medium text-gray-900">{transaction.courier}</span>
                </div>
              )}
              {transaction.deliveredAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivered</span>
                  <span className="font-medium text-gray-900">
                    {new Date(transaction.deliveredAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Product Info */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Order Details</h3>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-600">Product</p>
              <p className="font-medium text-gray-900">{transaction.productName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Seller</p>
              <p className="font-medium text-gray-900">{transaction.sellerName}</p>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        {canInspect && (
          <div className="space-y-2 pt-2">
            <Button 
              onClick={() => navigate('escrow-inspection')}
              className="w-full bg-[#0047AB] hover:bg-[#0047AB]/90 text-white h-12"
            >
              Inspect & Confirm Delivery
            </Button>
            <Button 
              onClick={() => navigate('escrow-dispute')}
              variant="outline"
              className="w-full border-[#FB7185] text-[#FB7185] hover:bg-[#FB7185]/10 h-12"
            >
              Report an Issue
            </Button>
          </div>
        )}

        {/* Help */}
        <Card className="p-4 bg-gray-50 border-gray-200">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-gray-500 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-gray-900 mb-1 text-sm">Need Help?</h4>
              <p className="text-xs text-gray-600">
                If you have questions about the escrow process or need assistance, contact our support team.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
