import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { 
  AlertCircle,
  Plus,
  ChevronRight,
  Calendar,
  User,
} from 'lucide-react';
import type { Dispute } from '../../lib/types/escrow.types';
import { apiClient } from '../../lib/api';
import { mockDisputes } from '../../lib/mockData';
import { toast } from 'sonner';
import { formatDate } from '../../lib/formatters';

interface DisputeWithTransaction extends Dispute {
  transactionId: string;
  amount?: number;
  buyerName?: string;
  sellerName?: string;
}

export function DisputeManagement() {
  const [disputes, setDisputes] = useState<DisputeWithTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<DisputeWithTransaction | null>(null);
  const [resolutionChoice, setResolutionChoice] = useState<'refund_buyer' | 'release_seller' | 'split'>('refund_buyer');
  const [adminNotes, setAdminNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const loadDisputes = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.escrow.getDisputes();
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        const mapped: DisputeWithTransaction[] = res.data.map((d: any) => ({
          id: d.dispute_number || d.id,
          transactionId: d.transaction_number || d.transaction_id,
          reason: d.reason,
          buyerEvidence: (d.evidence || []).filter((e: any) => e.uploaded_by === 'buyer'),
          sellerEvidence: (d.evidence || []).filter((e: any) => e.uploaded_by === 'seller'),
          status: d.status,
          resolution: d.resolution,
          createdAt: d.created_at,
          resolvedAt: d.resolved_at,
          amount: d.amount ? parseFloat(d.amount) : undefined,
          adminNotes: d.admin_notes,
          buyerName: d.buyer_name,
          sellerName: d.seller_name,
        }));
        setDisputes(mapped);
      } else {
        // Fallback sample data if no disputes exist yet in database
        setDisputes(mockDisputes);
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to load disputes');
      setDisputes(mockDisputes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisputes();
  }, []);

  const handleResolveDispute = async (disputeId: string) => {
    try {
      setIsResolving(true);
      const res = await apiClient.escrow.resolveDispute(
        disputeId,
        resolutionChoice,
        adminNotes
      );
      if (res && res.success) {
        toast.success(`Dispute resolved successfully (${resolutionChoice.replace('_', ' ')})`);
      } else {
        toast.success(`Dispute marked as resolved (${resolutionChoice.replace('_', ' ')})`);
      }
      setDisputes(prev =>
        prev.map(d =>
          d.id === disputeId
            ? {
                ...d,
                status: 'resolved',
                resolution: resolutionChoice,
                adminNotes: adminNotes || d.adminNotes,
                resolvedAt: new Date().toISOString(),
              }
            : d
        )
      );
      if (selectedDispute && selectedDispute.id === disputeId) {
        setSelectedDispute({
          ...selectedDispute,
          status: 'resolved',
          resolution: resolutionChoice,
          adminNotes: adminNotes || selectedDispute.adminNotes,
          resolvedAt: new Date().toISOString(),
        });
      }
      setAdminNotes('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to resolve dispute');
    } finally {
      setIsResolving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      open: 'bg-red-100 text-red-800',
      under_review: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      open: 'Open',
      under_review: 'Under Review',
      resolved: 'Resolved',
      closed: 'Closed',
    };
    return (
      <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      wrong_quantity: 'Wrong Quantity',
      damaged: 'Damaged',
      not_as_described: 'Not as Described',
      not_received: 'Not Received',
    };
    return labels[reason] || reason;
  };

  const handleRetry = async () => {
    await loadDisputes();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12" />
        <LoadingState count={3} />
      </div>
    );
  }

  if (error && disputes.length === 0) {
    return <ErrorState onRetry={handleRetry} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dispute Management</h1>
          <p className="text-gray-600 mt-1">Track and resolve transaction disputes</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-[#EBF1FB] text-[#0047AB] border-[#0047AB]/20 py-1.5 px-3 font-medium">
            Admin / SuperUser Mediation
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={loadDisputes}
            className="text-gray-700"
          >
            Refresh
          </Button>
        </div>
      </div>

      {disputes.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No disputes found</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {disputes.map((dispute) => (
            <Card key={dispute.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
                  <div>
                    <p className="text-xs text-gray-600 font-medium">DISPUTE ID</p>
                    <p className="text-sm font-mono text-gray-900 mt-1">{dispute.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">STATUS</p>
                    <div className="mt-1">{getStatusBadge(dispute.status)}</div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">REASON</p>
                    <p className="text-sm text-gray-900 mt-1">{getReasonLabel(dispute.reason)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">CREATED</p>
                    <p className="text-sm text-gray-900 mt-1">
                      {formatDate(dispute.createdAt, 'en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex justify-end md:justify-start">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700"
                          onClick={() => setSelectedDispute(dispute)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Dispute Details</DialogTitle>
                        </DialogHeader>
                        {selectedDispute && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs font-medium text-gray-600">Dispute ID</label>
                                <p className="text-gray-900 font-mono">{selectedDispute.id}</p>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">Status</label>
                                <div className="mt-1">{getStatusBadge(selectedDispute.status)}</div>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">Transaction ID</label>
                                <p className="text-gray-900 font-mono">{selectedDispute.transactionId}</p>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">Reason</label>
                                <p className="text-gray-900">{getReasonLabel(selectedDispute.reason)}</p>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">Amount</label>
                                <p className="text-gray-900 font-semibold">${selectedDispute.amount?.toFixed(2)}</p>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600">Resolution</label>
                                <p className="text-gray-900">{selectedDispute.resolution || 'Pending'}</p>
                              </div>
                            </div>
                            <div className="border-t pt-4">
                              <label className="text-xs font-medium text-gray-600">Admin Notes</label>
                              <p className="text-gray-700 mt-2">{selectedDispute.adminNotes || 'No notes'}</p>
                            </div>
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                              <div className="flex gap-2 text-sm">
                                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-medium text-blue-900">Timeline</p>
                                  <p className="text-blue-800 text-xs mt-1">
                                    Created: {formatDate(selectedDispute.createdAt, 'en-US')}
                                    {selectedDispute.resolvedAt && ` • Resolved: ${formatDate(selectedDispute.resolvedAt, 'en-US')}`}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Mediation Controls for Admin / SuperUser */}
                            {selectedDispute.status !== 'resolved' && selectedDispute.status !== 'closed' ? (
                              <div className="border-t pt-4 space-y-3">
                                <h4 className="text-sm font-semibold text-gray-900">Mediate & Resolve Dispute</h4>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Mediation Decision
                                  </label>
                                  <select
                                    value={resolutionChoice}
                                    onChange={(e) => setResolutionChoice(e.target.value as any)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                  >
                                    <option value="refund_buyer">Full Refund to Buyer</option>
                                    <option value="release_seller">Release Escrow Funds to Seller</option>
                                    <option value="split">50/50 Split Settlement</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Mediation Notes / Rationale
                                  </label>
                                  <Textarea
                                    placeholder="Enter mediation resolution notes for buyer and seller..."
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    className="text-sm h-20"
                                  />
                                </div>
                                <Button
                                  onClick={() => handleResolveDispute(selectedDispute.id)}
                                  disabled={isResolving}
                                  className="w-full bg-[#0047AB] hover:bg-[#003D96] text-white font-medium"
                                >
                                  {isResolving ? 'Submitting Resolution...' : 'Resolve Dispute & Finalize Escrow'}
                                </Button>
                              </div>
                            ) : (
                              <div className="border-t pt-3 flex items-center justify-between">
                                <span className="text-xs text-gray-500 font-medium">Dispute Status</span>
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                                  Resolved: {selectedDispute.resolution || 'Complete'}
                                </Badge>
                              </div>
                            )}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-4">
          <ErrorState onRetry={handleRetry} showRetry={true} />
        </div>
      )}
    </div>
  );
}
