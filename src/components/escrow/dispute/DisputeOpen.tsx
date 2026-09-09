import { useState } from 'react';
import { ArrowLeft, AlertTriangle, Send, Upload } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { EvidenceUploader } from '../EvidenceUploader';
import { InfoCard } from '../InfoCard';
import { Screen } from '../../../App';
import { mockEscrowTransactions } from '../../../lib/mockData';
import { toast } from 'sonner';

interface DisputeOpenProps {
  navigate: (screen: Screen) => void;
  transactionId?: string;
}

export function DisputeOpen({
  navigate,
  transactionId = 'ESC-001',
}: DisputeOpenProps) {
  const transaction =
    mockEscrowTransactions.find(t => t.id === transactionId) ||
    mockEscrowTransactions[0];

  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [uploadedEvidence, setUploadedEvidence] = useState<any[]>([]);
  const [sellerMessage, setSellerMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = () => {
    if (!reason || !description || uploadedEvidence.length === 0) {
      toast.error('Please complete all required fields and upload evidence');
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      toast.success(
        'Dispute submitted successfully. Our team will review within 24 hours.',
      );
      navigate('escrow-buyer-dashboard');
    }, 2000);
  };

  return (
    <div className='min-h-screen bg-[#F4F4F5] pb-6'>
      {/* Header */}
      <div className='bg-white border-b border-gray-200 p-4 sticky top-0 z-10'>
        <div className='flex items-center gap-3'>
          <button onClick={() => navigate('escrow-inspection')} className='p-1'>
            <ArrowLeft className='w-5 h-5 text-gray-700' />
          </button>
          <div className='flex-1'>
            <h1 className='font-semibold text-gray-900'>Open Dispute</h1>
            <p className='text-xs text-gray-500'>
              Report an issue with your order
            </p>
          </div>
          <AlertTriangle className='w-6 h-6 text-[#FB7185]' />
        </div>
      </div>

      <div className='p-4 max-w-2xl mx-auto space-y-4'>
        {/* Warning */}
        <InfoCard
          icon={AlertTriangle}
          title='Before Opening a Dispute'
          description='Disputes should only be opened for legitimate issues. False claims may impact your trust score.'
          variant='warning'
        />

        {/* Order Info */}
        <Card className='p-4'>
          <h3 className='font-semibold text-gray-900 mb-3'>Order Details</h3>
          <div className='space-y-2'>
            <div>
              <p className='text-sm text-gray-600'>Transaction ID</p>
              <p className='font-medium text-gray-900'>{transaction.id}</p>
            </div>
            <div>
              <p className='text-sm text-gray-600'>Product</p>
              <p className='font-medium text-gray-900'>
                {transaction.productName}
              </p>
            </div>
            <div>
              <p className='text-sm text-gray-600'>Seller</p>
              <p className='font-medium text-gray-900'>
                {transaction.sellerName}
              </p>
            </div>
            <div>
              <p className='text-sm text-gray-600'>Amount in Escrow</p>
              <p className='font-semibold text-[#0047AB]'>
                ${transaction.amount.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>

        {/* Dispute Form */}
        <Card className='p-4'>
          <h3 className='font-semibold text-gray-900 mb-4'>
            Dispute Information
          </h3>

          {/* Reason */}
          <div className='mb-4'>
            <Label
              htmlFor='reason'
              className='text-sm font-medium text-gray-700 mb-2'
            >
              Dispute Reason <span className='text-[#FB7185]'>*</span>
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id='reason'>
                <SelectValue placeholder='Select a reason' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='wrong_quantity'>
                  Wrong Quantity Received
                </SelectItem>
                <SelectItem value='damaged'>
                  Product Damaged or Defective
                </SelectItem>
                <SelectItem value='not_as_described'>
                  Not as Described
                </SelectItem>
                <SelectItem value='not_received'>
                  Product Not Received
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className='mb-4'>
            <Label
              htmlFor='description'
              className='text-sm font-medium text-gray-700 mb-2'
            >
              Detailed Description <span className='text-[#FB7185]'>*</span>
            </Label>
            <Textarea
              id='description'
              placeholder='Explain the issue in detail. Include specific information about what went wrong...'
              value={description}
              onChange={e => setDescription(e.target.value)}
              className='h-32'
            />
            <p className='text-xs text-gray-500 mt-1'>
              Be specific and accurate. This will help our team resolve the
              dispute fairly.
            </p>
          </div>

          {/* Evidence Upload */}
          <div>
            <Label className='text-sm font-medium text-gray-700 mb-2'>
              Upload Evidence <span className='text-[#FB7185]'>*</span>
            </Label>
            <p className='text-xs text-gray-600 mb-3'>
              Provide clear photos or videos showing the issue. Evidence is
              critical for dispute resolution.
            </p>
            <EvidenceUploader
              onUpload={setUploadedEvidence}
              maxFiles={10}
              allowedTypes={['photo', 'video']}
              required={true}
            />
          </div>
        </Card>

        {/* Message Seller (Optional) */}
        <Card className='p-4'>
          <h3 className='font-semibold text-gray-900 mb-2'>
            Contact Seller (Optional)
          </h3>
          <p className='text-sm text-gray-600 mb-3'>
            Sometimes issues can be resolved directly with the seller before
            escalating to a dispute.
          </p>
          <Textarea
            placeholder='Send a message to the seller...'
            value={sellerMessage}
            onChange={e => setSellerMessage(e.target.value)}
            className='h-24 mb-3'
          />
          <Button variant='outline' size='sm' className='w-full'>
            <Send className='w-4 h-4 mr-2' />
            Send Message to Seller
          </Button>
        </Card>

        {/* Dispute Process */}
        <Card className='p-4 bg-gray-50 border-gray-200'>
          <h4 className='font-medium text-gray-900 mb-3 text-sm'>
            How Dispute Resolution Works
          </h4>
          <div className='space-y-3'>
            <div className='flex gap-3'>
              <div className='flex-shrink-0 w-6 h-6 rounded-full bg-[#0047AB] text-white flex items-center justify-center text-xs font-semibold'>
                1
              </div>
              <div>
                <p className='text-sm font-medium text-gray-900'>
                  Submit Evidence
                </p>
                <p className='text-xs text-gray-600'>
                  You provide details and evidence of the issue
                </p>
              </div>
            </div>
            <div className='flex gap-3'>
              <div className='flex-shrink-0 w-6 h-6 rounded-full bg-[#0047AB] text-white flex items-center justify-center text-xs font-semibold'>
                2
              </div>
              <div>
                <p className='text-sm font-medium text-gray-900'>
                  Seller Response
                </p>
                <p className='text-xs text-gray-600'>
                  Seller has 48 hours to provide counter-evidence
                </p>
              </div>
            </div>
            <div className='flex gap-3'>
              <div className='flex-shrink-0 w-6 h-6 rounded-full bg-[#0047AB] text-white flex items-center justify-center text-xs font-semibold'>
                3
              </div>
              <div>
                <p className='text-sm font-medium text-gray-900'>Team Review</p>
                <p className='text-xs text-gray-600'>
                  Our moderators review all evidence objectively
                </p>
              </div>
            </div>
            <div className='flex gap-3'>
              <div className='flex-shrink-0 w-6 h-6 rounded-full bg-[#10B981] text-white flex items-center justify-center text-xs font-semibold'>
                4
              </div>
              <div>
                <p className='text-sm font-medium text-gray-900'>Resolution</p>
                <p className='text-xs text-gray-600'>
                  Decision made: full refund, partial refund, or release to
                  seller
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Important Notes */}
        <Card className='p-4 border-[#FB7185]/20 bg-[#FB7185]/5'>
          <h4 className='font-medium text-gray-900 mb-2 text-sm'>
            ⚠️ Important Notes
          </h4>
          <ul className='space-y-1 text-xs text-gray-600'>
            <li>
              • Disputes must be opened within the 72-hour inspection window
            </li>
            <li>
              • All evidence is immutable and cannot be changed after submission
            </li>
            <li>
              • False or fraudulent claims will result in account suspension
            </li>
            <li>• Platform decisions are final and binding</li>
            <li>• Resolution typically takes 2-5 business days</li>
          </ul>
        </Card>

        {/* Submit Button */}
        <div className='space-y-3 pt-2'>
          <Button
            onClick={handleSubmit}
            disabled={isProcessing}
            className='w-full bg-[#FB7185] hover:bg-[#FB7185]/90 text-white h-12'
          >
            {isProcessing ? (
              <div className='flex items-center gap-2'>
                <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                Submitting Dispute...
              </div>
            ) : (
              <>
                <AlertTriangle className='w-5 h-5 mr-2' />
                Submit Dispute
              </>
            )}
          </Button>
          <Button
            onClick={() => navigate('escrow-inspection')}
            variant='outline'
            className='w-full h-12'
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
