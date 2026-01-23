export interface EscrowTransaction {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  escrowFee: number;
  status: 'locked' | 'pending_inspection' | 'released' | 'disputed' | 'refunded';
  createdAt: string;
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  inspectionDeadline?: string;
  autoReleaseAt?: string;
  releasedAt?: string;
  productName: string;
  sellerName: string;
  sellerVerified: boolean;
  trackingId?: string;
  courier?: string;
}

export interface Evidence {
  id: string;
  transactionId: string;
  uploadedBy: 'buyer' | 'seller';
  type: 'photo' | 'video' | 'document';
  url: string;
  description: string;
  timestamp: string;
}

export interface Dispute {
  id: string;
  transactionId: string;
  reason: 'wrong_quantity' | 'damaged' | 'not_as_described' | 'not_received';
  buyerEvidence: Evidence[];
  sellerEvidence: Evidence[];
  status: 'open' | 'under_review' | 'resolved';
  resolution?: 'refund_buyer' | 'release_seller' | 'partial_split';
  createdAt: string;
  resolvedAt?: string;
  adminNotes?: string;
}