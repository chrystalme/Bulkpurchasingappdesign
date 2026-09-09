import {
  ArrowLeft,
  Scale,
  Image as ImageIcon,
  Video,
  FileText,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Screen } from '../../../App';
import { mockDisputes, Evidence } from '../../../lib/mockData';

interface DisputeMediationProps {
  navigate: (screen: Screen) => void;
  disputeId?: string;
  userRole?: 'buyer' | 'seller' | 'admin';
}

export function DisputeMediation({
  navigate,
  disputeId = 'DIS-001',
  userRole = 'admin',
}: DisputeMediationProps) {
  const dispute = mockDisputes.find(d => d.id === disputeId) || mockDisputes[0];

  const buyerEvidence: Evidence[] = [
    {
      id: 'EVD-001',
      transactionId: dispute.transactionId,
      uploadedBy: 'buyer',
      type: 'photo',
      url: 'https://via.placeholder.com/400x300',
      description: 'Package arrived damaged - box crushed on one side',
      timestamp: '2025-10-25T15:30:00Z',
    },
    {
      id: 'EVD-002',
      transactionId: dispute.transactionId,
      uploadedBy: 'buyer',
      type: 'photo',
      url: 'https://via.placeholder.com/400x300',
      description: 'Product showing visible damage and cracks',
      timestamp: '2025-10-25T15:35:00Z',
    },
  ];

  const sellerEvidence: Evidence[] = [
    {
      id: 'EVD-003',
      transactionId: dispute.transactionId,
      uploadedBy: 'seller',
      type: 'photo',
      url: 'https://via.placeholder.com/400x300',
      description: 'Product packaging before shipping - pristine condition',
      timestamp: '2025-10-24T10:00:00Z',
    },
    {
      id: 'EVD-004',
      transactionId: dispute.transactionId,
      uploadedBy: 'seller',
      type: 'photo',
      url: 'https://via.placeholder.com/400x300',
      description: 'Shipping label and weight confirmation',
      timestamp: '2025-10-24T10:05:00Z',
    },
  ];

  const getStatusBadge = (status: string) => {
    const config = {
      open: {
        label: 'Open',
        className: 'bg-[#0047AB]/10 text-[#0047AB] border-[#0047AB]/20',
      },
      under_review: {
        label: 'Under Review',
        className: 'bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20',
      },
      resolved: {
        label: 'Resolved',
        className: 'bg-[#6EE7B7]/10 text-[#10B981] border-[#6EE7B7]/20',
      },
    };
    const { label, className } =
      config[status as keyof typeof config] || config.open;
    return (
      <Badge variant='secondary' className={className}>
        {label}
      </Badge>
    );
  };

  const getReasonLabel = (reason: string) => {
    const labels = {
      wrong_quantity: 'Wrong Quantity',
      damaged: 'Product Damaged',
      not_as_described: 'Not as Described',
      not_received: 'Not Received',
    };
    return labels[reason as keyof typeof labels] || reason;
  };

  const getEvidenceIcon = (type: string) => {
    switch (type) {
      case 'photo':
        return ImageIcon;
      case 'video':
        return Video;
      case 'document':
        return FileText;
      default:
        return FileText;
    }
  };

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
              Dispute {dispute.id}
            </h1>
            <p className='text-xs text-gray-500'>Mediation Review</p>
          </div>
          <Scale className='w-6 h-6 text-[#0047AB]' />
        </div>
      </div>

      <div className='p-4 max-w-4xl mx-auto space-y-4'>
        {/* Dispute Status */}
        <Card className='p-4'>
          <div className='flex items-start justify-between mb-3'>
            <div className='flex-1'>
              <div className='flex items-center gap-2 mb-2'>
                <h3 className='font-semibold text-gray-900'>Dispute Details</h3>
                {getStatusBadge(dispute.status)}
              </div>
              <div className='space-y-1 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-gray-600'>Reason:</span>
                  <span className='font-medium text-gray-900'>
                    {getReasonLabel(dispute.reason)}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600'>Opened:</span>
                  <span className='font-medium text-gray-900'>
                    {new Date(dispute.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600'>Transaction:</span>
                  <span className='font-medium text-[#0047AB]'>
                    {dispute.transactionId}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {dispute.status === 'under_review' && (
            <div className='mt-4 bg-[#FACC15]/5 border border-[#FACC15]/20 rounded-lg p-3 flex gap-3'>
              <Clock className='w-5 h-5 text-[#FACC15] flex-shrink-0' />
              <div>
                <p className='text-sm font-medium text-gray-900'>
                  Review in Progress
                </p>
                <p className='text-xs text-gray-600'>
                  Our team is carefully reviewing all evidence. Expected
                  resolution within 3-5 business days.
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Timeline of Events */}
        <Card className='p-4'>
          <h3 className='font-semibold text-gray-900 mb-4'>
            Timeline of Events
          </h3>
          <div className='space-y-3'>
            <div className='flex gap-3'>
              <div className='flex-shrink-0 w-2 h-2 rounded-full bg-[#10B981] mt-1.5' />
              <div className='flex-1'>
                <p className='text-sm font-medium text-gray-900'>
                  Order Placed & Paid
                </p>
                <p className='text-xs text-gray-500'>Oct 24, 2025 at 9:00 AM</p>
              </div>
            </div>
            <div className='flex gap-3'>
              <div className='flex-shrink-0 w-2 h-2 rounded-full bg-[#10B981] mt-1.5' />
              <div className='flex-1'>
                <p className='text-sm font-medium text-gray-900'>
                  Seller Shipped Order
                </p>
                <p className='text-xs text-gray-500'>
                  Oct 24, 2025 at 11:00 AM
                </p>
              </div>
            </div>
            <div className='flex gap-3'>
              <div className='flex-shrink-0 w-2 h-2 rounded-full bg-[#10B981] mt-1.5' />
              <div className='flex-1'>
                <p className='text-sm font-medium text-gray-900'>
                  Package Delivered
                </p>
                <p className='text-xs text-gray-500'>Oct 25, 2025 at 2:00 PM</p>
              </div>
            </div>
            <div className='flex gap-3'>
              <div className='flex-shrink-0 w-2 h-2 rounded-full bg-[#FB7185] mt-1.5' />
              <div className='flex-1'>
                <p className='text-sm font-medium text-gray-900'>
                  Dispute Opened
                </p>
                <p className='text-xs text-gray-500'>Oct 25, 2025 at 2:30 PM</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Evidence Panels */}
        <Tabs defaultValue='buyer' className='w-full'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='buyer'>
              Buyer Evidence ({buyerEvidence.length})
            </TabsTrigger>
            <TabsTrigger value='seller'>
              Seller Evidence ({sellerEvidence.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value='buyer' className='mt-4'>
            <Card className='p-4'>
              <h3 className='font-semibold text-gray-900 mb-4'>
                Buyer's Evidence
              </h3>
              <div className='space-y-4'>
                {buyerEvidence.map(evidence => {
                  const Icon = getEvidenceIcon(evidence.type);
                  return (
                    <Card key={evidence.id} className='p-4 bg-gray-50'>
                      <div className='flex gap-3'>
                        <div className='flex-shrink-0'>
                          <div className='w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center'>
                            <Icon className='w-8 h-8 text-gray-500' />
                          </div>
                        </div>
                        <div className='flex-1'>
                          <div className='flex items-start justify-between mb-2'>
                            <Badge variant='secondary' className='text-xs'>
                              {evidence.type}
                            </Badge>
                            <span className='text-xs text-gray-500'>
                              {new Date(evidence.timestamp).toLocaleString(
                                'en-US',
                                {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                },
                              )}
                            </span>
                          </div>
                          <p className='text-sm text-gray-900 mb-2'>
                            {evidence.description}
                          </p>
                          <Button variant='outline' size='sm'>
                            View Full Evidence
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value='seller' className='mt-4'>
            <Card className='p-4'>
              <h3 className='font-semibold text-gray-900 mb-4'>
                Seller's Evidence
              </h3>
              <div className='space-y-4'>
                {sellerEvidence.map(evidence => {
                  const Icon = getEvidenceIcon(evidence.type);
                  return (
                    <Card key={evidence.id} className='p-4 bg-gray-50'>
                      <div className='flex gap-3'>
                        <div className='flex-shrink-0'>
                          <div className='w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center'>
                            <Icon className='w-8 h-8 text-gray-500' />
                          </div>
                        </div>
                        <div className='flex-1'>
                          <div className='flex items-start justify-between mb-2'>
                            <Badge variant='secondary' className='text-xs'>
                              {evidence.type}
                            </Badge>
                            <span className='text-xs text-gray-500'>
                              {new Date(evidence.timestamp).toLocaleString(
                                'en-US',
                                {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                },
                              )}
                            </span>
                          </div>
                          <p className='text-sm text-gray-900 mb-2'>
                            {evidence.description}
                          </p>
                          <Button variant='outline' size='sm'>
                            View Full Evidence
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Admin Decision (Only for admin role) */}
        {userRole === 'admin' && (
          <Card className='p-4'>
            <h3 className='font-semibold text-gray-900 mb-4'>
              Platform Decision
            </h3>
            <div className='space-y-4'>
              <div className='grid grid-cols-3 gap-3'>
                <Button variant='outline' className='h-20 flex-col gap-2'>
                  <span className='text-[#10B981]'>✓</span>
                  <span className='text-sm'>Refund Buyer</span>
                </Button>
                <Button variant='outline' className='h-20 flex-col gap-2'>
                  <span className='text-[#0047AB]'>⚖</span>
                  <span className='text-sm'>Partial Split</span>
                </Button>
                <Button variant='outline' className='h-20 flex-col gap-2'>
                  <span className='text-[#10B981]'>✓</span>
                  <span className='text-sm'>Release to Seller</span>
                </Button>
              </div>
              <div>
                <Label
                  htmlFor='admin-notes'
                  className='text-sm font-medium text-gray-700 mb-2'
                >
                  Admin Notes
                </Label>
                <textarea
                  id='admin-notes'
                  className='w-full border border-gray-200 rounded-lg p-3 text-sm'
                  rows={4}
                  placeholder='Enter decision rationale and notes...'
                />
              </div>
              <Button className='w-full bg-[#0047AB] hover:bg-[#0047AB]/90 text-white'>
                Submit Decision
              </Button>
            </div>
          </Card>
        )}

        {/* Info for Users */}
        {userRole !== 'admin' && (
          <Card className='p-4 bg-gray-50 border-gray-200'>
            <div className='flex gap-3'>
              <AlertCircle className='w-5 h-5 text-gray-500 flex-shrink-0' />
              <div>
                <h4 className='font-medium text-gray-900 mb-1 text-sm'>
                  What to Expect
                </h4>
                <p className='text-xs text-gray-600 mb-2'>
                  Our mediation team reviews all evidence objectively and makes
                  fair decisions based on platform policies.
                </p>
                <ul className='space-y-1 text-xs text-gray-600'>
                  <li>
                    • You'll be notified via email when a decision is made
                  </li>
                  <li>• Resolution typically takes 2-5 business days</li>
                  <li>• All decisions are final and binding</li>
                  <li>
                    • Funds will be distributed according to the resolution
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
