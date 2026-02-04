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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newDisputeForm, setNewDisputeForm] = useState({
    transactionId: '',
    reason: 'wrong_quantity' as const,
    description: '',
  });

  const loadDisputes = async () => {
    try {
      setLoading(true);
      setError(null);
      // Mock data - in production this would call: await apiClient.escrow.getDisputes()
      // For now we'll use mock data to demonstrate the UI
      const mockDisputes: DisputeWithTransaction[] = [
        {
          id: 'disp-001',
          transactionId: 'txn-12345',
          reason: 'damaged',
          buyerEvidence: [],
          sellerEvidence: [],
          status: 'open',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          amount: 1250,
          buyerName: 'John Doe',
          sellerName: 'ABC Supplies',
        },
        {
          id: 'disp-002',
          transactionId: 'txn-12346',
          reason: 'not_as_described',
          buyerEvidence: [],
          sellerEvidence: [],
          status: 'under_review',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          amount: 850,
          buyerName: 'Jane Smith',
          sellerName: 'XYZ Trading',
        },
        {
          id: 'disp-003',
          transactionId: 'txn-12347',
          reason: 'wrong_quantity',
          buyerEvidence: [],
          sellerEvidence: [],
          status: 'resolved',
          resolution: 'partial_split',
          resolvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          amount: 2100,
          buyerName: 'Bob Johnson',
          sellerName: 'Global Imports',
        },
      ];
      setDisputes(mockDisputes);
    } catch (err) {
      setError((err as Error).message || 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisputes();
  }, []);

  const handleCreateDispute = () => {
    if (!newDisputeForm.transactionId || !newDisputeForm.description) {
      alert('Please fill in all fields');
      return;
    }
    // In production: await apiClient.escrow.createDispute(newDisputeForm)
    const newDispute: DisputeWithTransaction = {
      id: `disp-${Date.now()}`,
      transactionId: newDisputeForm.transactionId,
      reason: newDisputeForm.reason,
      buyerEvidence: [],
      sellerEvidence: [],
      status: 'open',
      createdAt: new Date().toISOString(),
      adminNotes: newDisputeForm.description,
      buyerName: 'Current User',
      sellerName: 'Seller Name',
    };
    setDisputes([newDispute, ...disputes]);
    setIsCreateOpen(false);
    setNewDisputeForm({
      transactionId: '',
      reason: 'wrong_quantity',
      description: '',
    });
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
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create Dispute
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Dispute</DialogTitle>
              <DialogDescription>
                File a new dispute for a transaction
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction ID
                </label>
                <Input
                  placeholder="Enter transaction ID"
                  value={newDisputeForm.transactionId}
                  onChange={(e) => setNewDisputeForm({ ...newDisputeForm, transactionId: e.target.value })}
                  className="text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <select
                  value={newDisputeForm.reason}
                  onChange={(e) => setNewDisputeForm({ ...newDisputeForm, reason: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                >
                  <option value="wrong_quantity">Wrong Quantity</option>
                  <option value="damaged">Damaged</option>
                  <option value="not_as_described">Not as Described</option>
                  <option value="not_received">Not Received</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Textarea
                  placeholder="Describe the dispute details"
                  value={newDisputeForm.description}
                  onChange={(e) => setNewDisputeForm({ ...newDisputeForm, description: e.target.value })}
                  className="text-gray-900"
                />
              </div>
              <Button
                onClick={handleCreateDispute}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Create Dispute
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
                      {new Date(dispute.createdAt).toLocaleDateString('en-US', {
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
                                    Created: {new Date(selectedDispute.createdAt).toLocaleDateString('en-US')}
                                    {selectedDispute.resolvedAt && ` • Resolved: ${new Date(selectedDispute.resolvedAt).toLocaleDateString('en-US')}`}
                                  </p>
                                </div>
                              </div>
                            </div>
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
