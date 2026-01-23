export interface Product {
  id: string;
  name: string;
  image: string;
  bulkPrice: number;
  retailPrice: number;
  moq: number;
  vendorId: string;
  vendorName: string;
  vendorRating: number;
  category: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  memberAllocations: { memberId: string; quantity: number }[];
}

export interface Order {
  id: string;
  groupId: string;
  status: 'ordered' | 'paid' | 'shipped' | 'delivered';
  items: CartItem[];
  total: number;
  createdAt: string;
  estimatedDelivery: string;
}