import {
  ArrowLeft,
  Shield,
  Clock,
  TrendingUp,
  Package,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { EscrowStatusBadge } from '../EscrowStatusBadge';
import { CountdownTimer } from '../CountdownTimer';
import { InfoCard } from '../InfoCard';
import { Screen } from '../../../App';
import { mockEscrowTransactions } from '../../../lib/mockData';

interface SellerAwaitingInspectionProps {
  navigate: (screen: Screen) => void;
  transactionId?: string;
}

export function SellerAwaitingInspection({
  navigate,
  transactionId = 'ESC-001',
}: SellerAwaitingInspectionProps) {
  const transaction =
    mockEscrowTransactions.find(t => t.id === transactionId) ||
    mockEscrowTransactions[0];

  return (
    <div className='min-h-screen bg-[#F4F4F5] pb-6'>
      {/* Header */}
      <div className='bg-white border-b border-gray-200 p-4 sticky top-0 z-10'>
        <div className='flex items-center gap-3'>
          <button onClick={() => navigate('home')} className='p-1'>
            <ArrowLeft className='w-5 h-5 text-gray-700' />
          </button>
          <div className='flex-1'>
            <h1 className='font-semibold text-gray-900'>
              Transaction {transaction.id}
            </h1>
            <p className='text-xs text-gray-500'>Awaiting buyer inspection</p>
          </div>
          <Shield className='w-6 h-6 text-[#0047AB]' />
        </div>
      </div>

      <div className='p-4 max-w-2xl mx-auto space-y-4'>
        {/* Status Badge */}
        <div className='flex justify-center'>
          <EscrowStatusBadge status={transaction.status} />
        </div>

        {/* Inspection Timer */}
        {transaction.inspectionDeadline && (
          <Card className='p-4 bg-[#6EE7B7]/5 border-[#6EE7B7]/20'>
            <div className='text-center'>
              <Clock className='w-8 h-8 text-[#10B981] mx-auto mb-2' />
              <h3 className='font-semibold text-gray-900 mb-2'>
                Buyer Inspection in Progress
              </h3>
              <p className='text-sm text-gray-600 mb-3'>
                The buyer is reviewing their order. Funds will be released soon.
              </p>
              <CountdownTimer
                targetDate={transaction.inspectionDeadline}
                label='Inspection window ends in:'
                className='justify-center'
              />
            </div>
          </Card>
        )}

        {/* Escrow Status */}
        <InfoCard
          icon={Shield}
          title='Funds Pending Buyer Inspection'
          description='Your payment is secured in escrow. The buyer has 72 hours to inspect and confirm the order.'
          variant='info'
        />

        {/* Seller Protection */}
        <Card className='p-4 bg-[#6EE7B7]/5 border-[#6EE7B7]/20'>
          <div className='flex gap-3 mb-3'>
            <CheckCircle2 className='w-5 h-5 text-[#10B981] flex-shrink-0 mt-0.5' />
            <div className='flex-1'>
              <h4 className='font-semibold text-gray-900 mb-1'>
                Auto-Release Protection
              </h4>
              <p className='text-sm text-gray-600'>
                Don't worry! If the buyer takes no action within the inspection
                window, funds will be automatically released to you.
              </p>
            </div>
          </div>
          {transaction.autoReleaseAt && (
            <div className='bg-white rounded-lg p-3 mt-3'>
              <CountdownTimer
                targetDate={transaction.autoReleaseAt}
                label='Auto-release in:'
                className='justify-center'
              />
            </div>
          )}
        </Card>

        {/* Order Details */}
        <Card className='p-4'>
          <h3 className='font-semibold text-gray-900 mb-4'>Order Details</h3>
          <div className='space-y-3'>
            <div>
              <p className='text-sm text-gray-600'>Product</p>
              <p className='font-medium text-gray-900'>
                {transaction.productName}
              </p>
            </div>
            <div>
              <p className='text-sm text-gray-600'>Buyer</p>
              <p className='font-medium text-gray-900'>Afam (ID Verified)</p>
            </div>
            {transaction.trackingId && (
              <div>
                <p className='text-sm text-gray-600'>Tracking Number</p>
                <p className='font-medium text-[#0047AB]'>
                  {transaction.trackingId}
                </p>
              </div>
            )}
            {transaction.deliveredAt && (
              <div>
                <p className='text-sm text-gray-600'>Delivered</p>
                <p className='font-medium text-gray-900'>
                  {new Date(transaction.deliveredAt).toLocaleDateString(
                    'en-US',
                    {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    },
                  )}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Payment Breakdown */}
        <Card className='p-4'>
          <h3 className='font-semibold text-gray-900 mb-4'>Payment Summary</h3>
          <div className='space-y-2'>
            <div className='flex justify-between text-sm'>
              <span className='text-gray-600'>Order Amount</span>
              <span className='font-medium text-gray-900'>
                ${transaction.amount.toFixed(2)}
              </span>
            </div>
            <div className='flex justify-between text-sm'>
              <span className='text-gray-600'>Platform Fee (5%)</span>
              <span className='font-medium text-gray-900'>
                -${(transaction.amount * 0.05).toFixed(2)}
              </span>
            </div>
            <div className='border-t border-gray-200 pt-2 flex justify-between'>
              <span className='font-semibold text-gray-900'>Your Payout</span>
              <span className='font-semibold text-[#10B981] text-lg'>
                ${(transaction.amount * 0.95).toFixed(2)}
              </span>
            </div>
          </div>
          <div className='mt-3 bg-gray-50 rounded-lg p-3'>
            <p className='text-xs text-gray-600 text-center'>
              Payment will be transferred to your account within 1-2 business
              days after release
            </p>
          </div>
        </Card>

        {/* What Happens Next */}
        <Card className='p-4 bg-gray-50 border-gray-200'>
          <h3 className='font-semibold text-gray-900 mb-3'>
            What Happens Next?
          </h3>
          <div className='space-y-3'>
            <div className='flex gap-3'>
              <div className='flex-shrink-0 w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600'>
                1
              </div>
              <div>
                <p className='text-sm font-medium text-gray-900'>
                  Buyer Inspects Order
                </p>
                <p className='text-xs text-gray-600'>
                  Buyer reviews quantity, quality, and condition
                </p>
              </div>
            </div>
            <div className='flex gap-3'>
              <div className='flex-shrink-0 w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600'>
                2
              </div>
              <div>
                <p className='text-sm font-medium text-gray-900'>
                  Funds Released
                </p>
                <p className='text-xs text-gray-600'>
                  Either by buyer confirmation or auto-release
                </p>
              </div>
            </div>
            <div className='flex gap-3'>
              <div className='flex-shrink-0 w-8 h-8 rounded-full bg-[#10B981] border-2 border-[#10B981] flex items-center justify-center'>
                <CheckCircle2 className='w-4 h-4 text-white' />
              </div>
              <div>
                <p className='text-sm font-medium text-gray-900'>
                  Payment Received
                </p>
                <p className='text-xs text-gray-600'>
                  Funds transferred to your account
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Dispute Note */}
        <Card className='p-4 border-[#FACC15]/20 bg-[#FACC15]/5'>
          <div className='flex gap-3'>
            <Info className='w-5 h-5 text-[#FACC15] flex-shrink-0' />
            <div>
              <h4 className='font-medium text-gray-900 mb-1 text-sm'>
                If a Dispute is Opened
              </h4>
              <p className='text-xs text-gray-600 mb-2'>
                In rare cases, the buyer may report an issue. If this happens:
              </p>
              <ul className='space-y-1 text-xs text-gray-600'>
                <li>• You'll be notified immediately via email and app</li>
                <li>• You can submit counter-evidence and explanations</li>
                <li>• Our team reviews all evidence fairly and objectively</li>
                <li>• Your shipping proof will help protect your interests</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* View Transaction History */}
        <Button
          onClick={() => navigate('profile')}
          variant='outline'
          className='w-full h-12'
        >
          View Transaction History
        </Button>
      </div>
    </div>
  );
}
