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

export interface Group {
  id: string;
  name: string;
  description: string;
  members: Member[];
  joinCode: string;
  progress: number;
  moqTarget: number;
  currentQuantity: number;
  status: 'active' | 'pending' | 'completed';
}

export interface Member {
  id: string;
  name: string;
  avatar: string;
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

// Escrow System Interfaces
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

export interface Vendor {
  id: string;
  name: string;
  rating: number;
  location: string;
  image: string;
  verified: boolean;
}

// Vendor Dashboard Interfaces
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

export const mockMembers: Member[] = [
  { id: '1', name: 'Afam', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Afam' },
  { id: '2', name: 'Chioma', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chioma' },
  { id: '3', name: 'Eze', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eze' },
  { id: '4', name: 'Ngozi', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ngozi' },
];

export const mockGroups: Group[] = [
  {
    id: '1',
    name: 'Office Supplies Squad',
    description: 'Bulk buying for our co-working space',
    members: mockMembers.slice(0, 3),
    joinCode: 'OFFICE2024',
    progress: 75,
    moqTarget: 100,
    currentQuantity: 75,
    status: 'active',
  },
  {
    id: '2',
    name: 'Neighborhood Grocery',
    description: 'Fresh produce and pantry staples',
    members: mockMembers,
    joinCode: 'GROCERY123',
    progress: 40,
    moqTarget: 50,
    currentQuantity: 20,
    status: 'active',
  },
  {
    id: '3',
    name: 'Tech Accessories',
    description: 'Phone cases, chargers, and cables',
    members: mockMembers.slice(0, 2),
    joinCode: 'TECH456',
    progress: 90,
    moqTarget: 30,
    currentQuantity: 27,
    status: 'pending',
  },
];

export const mockVendors: Vendor[] = [
  {
    id: '1',
    name: 'Fresh Farm Collective',
    rating: 4.8,
    location: '2.3 km away',
    image: 'https://api.dicebear.com/7.x/initials/svg?seed=FFC',
    verified: true,
  },
  {
    id: '2',
    name: 'Tech Wholesale Hub',
    rating: 4.6,
    location: '5.1 km away',
    image: 'https://api.dicebear.com/7.x/initials/svg?seed=TWH',
    verified: true,
  },
  {
    id: '3',
    name: 'Office Essentials Plus',
    rating: 4.9,
    location: '1.8 km away',
    image: 'https://api.dicebear.com/7.x/initials/svg?seed=OEP',
    verified: true,
  },
  {
    id: '4',
    name: 'PowerCell Solutions',
    rating: 4.7,
    location: '3.5 km away',
    image: 'https://api.dicebear.com/7.x/initials/svg?seed=PCS',
    verified: true,
  },
  {
    id: '5',
    name: 'SolarTech Distributors',
    rating: 4.9,
    location: '4.0 km away',
    image: 'https://api.dicebear.com/7.x/initials/svg?seed=STD',
    verified: true,
  },
  {
    id: '6',
    name: 'Industrial Supplies Co.',
    rating: 4.8,
    location: '6.0 km away',
    image: 'https://api.dicebear.com/7.x/initials/svg?seed=ISC',
    verified: true,
  },
];

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Premium Organic Rice (25kg)',
    image: 'rice-bag',
    bulkPrice: 45.99,
    retailPrice: 65.99,
    moq: 10,
    vendorId: '1',
    vendorName: 'Fresh Farm Collective',
    vendorRating: 4.8,
    category: 'Groceries',
  },
  {
    id: '2',
    name: 'LED Light Bulbs (Pack of 24)',
    image: 'lightbulbs',
    bulkPrice: 28.99,
    retailPrice: 42.99,
    moq: 5,
    vendorId: '2',
    vendorName: 'Tech Wholesale Hub',
    vendorRating: 4.6,
    category: 'Electronics',
  },
  {
    id: '3',
    name: 'Premium Copy Paper (10 reams)',
    image: 'paper',
    bulkPrice: 35.99,
    retailPrice: 52.99,
    moq: 8,
    vendorId: '3',
    vendorName: 'Office Essentials Plus',
    vendorRating: 4.9,
    category: 'Office Supplies',
  },
  {
    id: '4',
    name: 'Olive Oil Extra Virgin (5L)',
    image: 'olive-oil',
    bulkPrice: 38.99,
    retailPrice: 54.99,
    moq: 6,
    vendorId: '1',
    vendorName: 'Fresh Farm Collective',
    vendorRating: 4.8,
    category: 'Groceries',
  },
  {
    id: '5',
    name: 'USB-C Charging Cables (20 pack)',
    image: 'usb-cables',
    bulkPrice: 42.99,
    retailPrice: 65.99,
    moq: 4,
    vendorId: '2',
    vendorName: 'Tech Wholesale Hub',
    vendorRating: 4.6,
    category: 'Electronics',
  },
  {
    id: '6',
    name: 'Multipurpose Printer Paper A4',
    image: 'printer-paper',
    bulkPrice: 29.99,
    retailPrice: 44.99,
    moq: 10,
    vendorId: '3',
    vendorName: 'Office Essentials Plus',
    vendorRating: 4.9,
    category: 'Office Supplies',
  },
  // New Products - Lithium Batteries
  {
    id: '7',
    name: 'Lithium-Ion Battery 18650 (Pack of 4)',
    image: 'battery',
    bulkPrice: 24.99,
    retailPrice: 38.99,
    moq: 5,
    vendorId: '4',
    vendorName: 'PowerCell Solutions',
    vendorRating: 4.7,
    category: 'Batteries',
  },
  {
    id: '8',
    name: 'LiFePO4 12V 100Ah Battery',
    image: 'battery',
    bulkPrice: 289.99,
    retailPrice: 399.99,
    moq: 3,
    vendorId: '4',
    vendorName: 'PowerCell Solutions',
    vendorRating: 4.7,
    category: 'Batteries',
  },
  {
    id: '9',
    name: 'Portable Power Bank 20000mAh (Pack of 10)',
    image: 'powerbank',
    bulkPrice: 149.99,
    retailPrice: 229.99,
    moq: 4,
    vendorId: '4',
    vendorName: 'PowerCell Solutions',
    vendorRating: 4.7,
    category: 'Batteries',
  },
  // Solar Products
  {
    id: '10',
    name: 'Monocrystalline Solar Panel 300W',
    image: 'solar-panel',
    bulkPrice: 175.99,
    retailPrice: 249.99,
    moq: 5,
    vendorId: '5',
    vendorName: 'SolarTech Distributors',
    vendorRating: 4.9,
    category: 'Solar Energy',
  },
  {
    id: '11',
    name: 'Solar Inverter 3000W Pure Sine Wave',
    image: 'inverter',
    bulkPrice: 425.99,
    retailPrice: 599.99,
    moq: 3,
    vendorId: '5',
    vendorName: 'SolarTech Distributors',
    vendorRating: 4.9,
    category: 'Solar Energy',
  },
  {
    id: '12',
    name: 'Solar Charge Controller MPPT 60A',
    image: 'controller',
    bulkPrice: 89.99,
    retailPrice: 129.99,
    moq: 6,
    vendorId: '5',
    vendorName: 'SolarTech Distributors',
    vendorRating: 4.9,
    category: 'Solar Energy',
  },
  {
    id: '13',
    name: 'Solar LED Street Light 100W (Pack of 5)',
    image: 'street-light',
    bulkPrice: 349.99,
    retailPrice: 499.99,
    moq: 4,
    vendorId: '5',
    vendorName: 'SolarTech Distributors',
    vendorRating: 4.9,
    category: 'Solar Energy',
  },
  {
    id: '14',
    name: 'Portable Solar Generator 500Wh',
    image: 'solar-generator',
    bulkPrice: 399.99,
    retailPrice: 549.99,
    moq: 3,
    vendorId: '5',
    vendorName: 'SolarTech Distributors',
    vendorRating: 4.9,
    category: 'Solar Energy',
  },
  // More Electronics
  {
    id: '15',
    name: 'Wireless Security Camera (Pack of 4)',
    image: 'camera',
    bulkPrice: 199.99,
    retailPrice: 299.99,
    moq: 5,
    vendorId: '2',
    vendorName: 'Tech Wholesale Hub',
    vendorRating: 4.6,
    category: 'Electronics',
  },
  {
    id: '16',
    name: 'Smart LED Bulbs RGB (Pack of 12)',
    image: 'smart-bulb',
    bulkPrice: 89.99,
    retailPrice: 129.99,
    moq: 6,
    vendorId: '2',
    vendorName: 'Tech Wholesale Hub',
    vendorRating: 4.6,
    category: 'Electronics',
  },
  {
    id: '17',
    name: 'Bluetooth Speakers Waterproof (Pack of 8)',
    image: 'speaker',
    bulkPrice: 159.99,
    retailPrice: 239.99,
    moq: 4,
    vendorId: '2',
    vendorName: 'Tech Wholesale Hub',
    vendorRating: 4.6,
    category: 'Electronics',
  },
  // Industrial/Construction
  {
    id: '18',
    name: 'Heavy Duty Extension Cords 50ft (Pack of 10)',
    image: 'extension-cord',
    bulkPrice: 124.99,
    retailPrice: 179.99,
    moq: 5,
    vendorId: '6',
    vendorName: 'Industrial Supplies Co.',
    vendorRating: 4.8,
    category: 'Industrial',
  },
  {
    id: '19',
    name: 'LED Work Lights 50W (Pack of 6)',
    image: 'work-light',
    bulkPrice: 139.99,
    retailPrice: 199.99,
    moq: 4,
    vendorId: '6',
    vendorName: 'Industrial Supplies Co.',
    vendorRating: 4.8,
    category: 'Industrial',
  },
  {
    id: '20',
    name: 'Rechargeable Drill Battery 20V (Pack of 8)',
    image: 'drill-battery',
    bulkPrice: 219.99,
    retailPrice: 319.99,
    moq: 3,
    vendorId: '4',
    vendorName: 'PowerCell Solutions',
    vendorRating: 4.7,
    category: 'Batteries',
  },
];

export const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    groupId: '1',
    status: 'shipped',
    items: [],
    total: 215.96,
    createdAt: '2025-10-28',
    estimatedDelivery: '2025-11-05',
  },
  {
    id: 'ORD-002',
    groupId: '2',
    status: 'paid',
    items: [],
    total: 152.48,
    createdAt: '2025-10-30',
    estimatedDelivery: '2025-11-07',
  },
];

// Mock Escrow Data
export const mockEscrowTransactions: EscrowTransaction[] = [
  {
    id: 'ESC-001',
    orderId: 'ORD-001',
    buyerId: '1',
    sellerId: '3',
    amount: 215.96,
    escrowFee: 6.48,
    status: 'pending_inspection',
    createdAt: '2025-10-28T10:00:00Z',
    paidAt: '2025-10-28T10:05:00Z',
    shippedAt: '2025-10-29T14:30:00Z',
    deliveredAt: '2025-11-02T16:45:00Z',
    inspectionDeadline: '2025-11-05T16:45:00Z',
    autoReleaseAt: '2025-11-05T16:45:00Z',
    productName: 'Premium Copy Paper (10 reams)',
    sellerName: 'Office Essentials Plus',
    sellerVerified: true,
    trackingId: 'TRK-9876543210',
    courier: 'FastShip Express',
  },
  {
    id: 'ESC-002',
    orderId: 'ORD-002',
    buyerId: '2',
    sellerId: '1',
    amount: 152.48,
    escrowFee: 4.57,
    status: 'locked',
    createdAt: '2025-10-30T08:20:00Z',
    paidAt: '2025-10-30T08:25:00Z',
    shippedAt: '2025-10-31T11:15:00Z',
    productName: 'Premium Organic Rice (25kg)',
    sellerName: 'Fresh Farm Collective',
    sellerVerified: true,
    trackingId: 'TRK-1234567890',
    courier: 'QuickDeliver Co.',
  },
];

export const mockTrustScores: TrustScore[] = [
  {
    userId: '1',
    score: 92,
    completedTransactions: 47,
    totalTransactions: 50,
    disputeRate: 2,
    buyerRating: 4.8,
    sellerRating: 4.6,
    verifications: {
      idVerified: true,
      businessVerified: false,
      emailVerified: true,
      phoneVerified: true,
    },
  },
  {
    userId: '2',
    score: 88,
    completedTransactions: 32,
    totalTransactions: 35,
    disputeRate: 3,
    buyerRating: 4.7,
    sellerRating: 4.5,
    verifications: {
      idVerified: true,
      businessVerified: true,
      emailVerified: true,
      phoneVerified: true,
    },
  },
];

export const mockDisputes: Dispute[] = [
  {
    id: 'DIS-001',
    transactionId: 'ESC-003',
    reason: 'damaged',
    buyerEvidence: [],
    sellerEvidence: [],
    status: 'under_review',
    createdAt: '2025-10-25T14:30:00Z',
  },
];

// Mock Vendor Dashboard Data
export const mockVendorStats: VendorStats = {
  totalRevenue: 45820.50,
  monthlyRevenue: 12450.75,
  totalOrders: 156,
  pendingOrders: 8,
  totalProducts: 14,
  totalCustomers: 89,
  averageRating: 4.8,
  totalReviews: 142,
};

export const mockVendorOrders: VendorOrder[] = [
  {
    id: 'VORD-001',
    productId: '10',
    productName: 'Monocrystalline Solar Panel 300W',
    customerName: 'Afam',
    quantity: 10,
    totalAmount: 1759.90,
    status: 'confirmed',
    orderDate: '2026-01-14T10:30:00Z',
    escrowStatus: 'locked',
  },
  {
    id: 'VORD-002',
    productId: '11',
    productName: 'Solar Inverter 3000W Pure Sine Wave',
    customerName: 'Chioma',
    quantity: 5,
    totalAmount: 2129.95,
    status: 'shipped',
    orderDate: '2026-01-13T14:20:00Z',
    escrowStatus: 'locked',
  },
  {
    id: 'VORD-003',
    productId: '12',
    productName: 'Solar Charge Controller MPPT 60A',
    customerName: 'Eze',
    quantity: 8,
    totalAmount: 719.92,
    status: 'delivered',
    orderDate: '2026-01-12T09:15:00Z',
    escrowStatus: 'pending_inspection',
  },
  {
    id: 'VORD-004',
    productId: '14',
    productName: 'Portable Solar Generator 500Wh',
    customerName: 'Ngozi',
    quantity: 6,
    totalAmount: 2399.94,
    status: 'pending',
    orderDate: '2026-01-15T08:45:00Z',
  },
  {
    id: 'VORD-005',
    productId: '13',
    productName: 'Solar LED Street Light 100W (Pack of 5)',
    customerName: 'Office Supplies Squad',
    quantity: 12,
    totalAmount: 4199.88,
    status: 'confirmed',
    orderDate: '2026-01-14T16:00:00Z',
    escrowStatus: 'locked',
  },
];

export const mockVendorCustomers: VendorCustomer[] = [
  {
    id: '1',
    name: 'Afam',
    email: 'afam@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Afam',
    totalOrders: 12,
    totalSpent: 5420.50,
    lastOrderDate: '2026-01-14T10:30:00Z',
    trustScore: 92,
  },
  {
    id: '2',
    name: 'Chioma',
    email: 'chioma@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chioma',
    totalOrders: 8,
    totalSpent: 3890.25,
    lastOrderDate: '2026-01-13T14:20:00Z',
    trustScore: 88,
  },
  {
    id: '3',
    name: 'Eze',
    email: 'eze@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eze',
    totalOrders: 15,
    totalSpent: 7250.80,
    lastOrderDate: '2026-01-12T09:15:00Z',
    trustScore: 95,
  },
  {
    id: '4',
    name: 'Ngozi',
    email: 'ngozi@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ngozi',
    totalOrders: 6,
    totalSpent: 2150.40,
    lastOrderDate: '2026-01-15T08:45:00Z',
    trustScore: 85,
  },
];