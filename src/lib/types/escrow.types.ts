export interface EscrowProductLine {
  productName: string;
  quantity: number;
  price: number;
}

export interface EscrowTransaction {
  id: string;
  transactionNumber?: string;
  orderId: string;
  orderNumber?: string;
  orderStatus?: string;
  buyerId: string;
  buyerName?: string;
  buyerEmail?: string;
  sellerId: string;
  sellerName: string;
  sellerEmail?: string;
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
  products?: EscrowProductLine[];
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
