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
  order_number: string;
  product_id: string;
  product_name: string;
  customer_name: string;
  quantity: number;
  total_amount: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  order_date: string;
  escrow_status?: 'locked' | 'pending_inspection' | 'released';
}

export interface VendorCustomer {
  id: string;
  name: string;
  email: string;
  avatar: string;
  total_orders: string;
  total_spent: string;
  last_order_date: string;
  trust_score: number;
}
