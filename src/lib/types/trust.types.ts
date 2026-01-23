export interface TrustScore {
  userId: string;
  score: number;
  completedTransactions: number;
  totalTransactions: number;
  disputeRate: number;
  buyerRating: number;
  sellerRating: number;
  verifications: {
    idVerified: boolean;
    businessVerified: boolean;
    emailVerified: boolean;
    phoneVerified: boolean;
  };
}