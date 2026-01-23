export interface Vendor {
  id: string;
  name: string;
  rating: number;
  location: string;
  image: string;
  verified: boolean;
}

export interface VendorStats {
  totalRevenue: number;
  monthlyRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  totalProducts: number;
  totalCustomers: number;
  averageRating: number;
  totalReviews: number;
}

export interface VendorOrder {
  id: string;
  productId: string;
  productName: string;
  customerName: string;
  quantity: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  orderDate: string;
  escrowStatus?: 'locked' | 'pending_inspection' | 'released';
}

export interface VendorCustomer {
  id: string;
  name: string;
  email: string;
  avatar: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  trustScore: number;
}