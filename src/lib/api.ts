import type {
  Product,
  Order,
  Vendor,
  VendorStats,
  VendorOrder,
  VendorCustomer,
  EscrowTransaction,
  Evidence,
  Dispute,
  User,
  TrustScore,
  Group,
  GroupMember,
  CreateGroupPayload,
  UpdateGroupPayload,
  AddMemberPayload,
  UpdateMemberRolePayload,
  JoinGroupPayload
} from "./types";

const API_URL = 'http://localhost:3001/api'; //import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  // message?: string;
  token?: string;
  user?: User;
  error?: string;
}

// Specific response types for different endpoints
interface AuthResponse extends ApiResponse<null> {
  token: string;
  user: User;
}

interface ProductsResponse extends ApiResponse<Product[]> {}
interface ProductResponse extends ApiResponse<Product> {}
interface CategoriesResponse extends ApiResponse<string[]> {}

interface OrdersResponse extends ApiResponse<Order[]> {}
interface OrderResponse extends ApiResponse<Order> {}

interface VendorsResponse extends ApiResponse<Vendor[]> {}
interface VendorResponse extends ApiResponse<Vendor> {}
interface VendorStatsResponse extends ApiResponse<VendorStats> {}
interface VendorOrdersResponse extends ApiResponse<VendorOrder[]> {}
interface VendorCustomersResponse extends ApiResponse<VendorCustomer[]> {}

interface EscrowTransactionsResponse extends ApiResponse<EscrowTransaction[]> {}
interface EscrowTransactionResponse extends ApiResponse<EscrowTransaction> {}

interface GroupsResponse extends ApiResponse<Group[]> {}
interface GroupResponse extends ApiResponse<Group> {}
interface GroupListResponse {
  success: boolean;
  groups: Group[];
}

interface UsersResponse extends ApiResponse<User[]> {}
interface UserResponse extends ApiResponse<User> {}
interface UserStatsResponse extends ApiResponse<{total: number; active: number; superUsers: number; admins: number; vendors: number; members: number}> {}

class ApiClient {
  private getAuthHeader(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const URL = `${API_URL}/${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(URL, config);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw new Error(`Network error: ${(error as Error).message}`);
    }
  }

  // Auth endpoints

  auth = {
    login: async (email: string, password: string): Promise<AuthResponse> => {
      const response = await this.request<null>('auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (response.token) {
        localStorage.setItem('auth_token', response.token);
      }
      return response as unknown as AuthResponse;
    },
    signup: async (
      email: string,
      password: string,
      name: string,
      role = 'member'
    ): Promise<AuthResponse> => {
      const response = await this.request<null>('auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, name, role }),
      });
      if (response.token) {
        localStorage.setItem('auth_token', response.token);
      }
      return response as unknown as AuthResponse;
    },

    me: async (): Promise<UserResponse> => {
      const response = await this.request<User>(`auth/me`);
      return response as unknown as UserResponse;
    },
    logout: () => {
      localStorage.removeItem('auth_token');
    },
  };

  // Products endpoints

  products = {
    getAll: async (filters?: {category?: string; vendor_id?: number}): Promise<ProductsResponse> => {
      const params = new URLSearchParams(filters as any);
      const response = await this.request<Product[]>(`products?${params.toString()}`);
      return response as unknown as ProductsResponse;
    },
    getById: async (id: number): Promise<ProductResponse> => {
      const response = await this.request<Product>(`products/${id}`);
      return response as unknown as ProductResponse;
    },
    getCategories: async (): Promise<CategoriesResponse> => {
      const response = await this.request<string[]>('products/categories');
      return response as unknown as CategoriesResponse;
    },
    create: async (productData: Omit<Product, 'id'>): Promise<ProductResponse> => {
      const response = await this.request<Product>('products', {
        method: 'POST',
        body: JSON.stringify(productData),
      });
      return response as unknown as ProductResponse;
    },
    update: async (id: number, productData: Partial<Product>): Promise<ProductResponse> => {
      const response = await this.request<Product>(`products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(productData),
      });
      return response as unknown as ProductResponse;
    },
    delete: async (id: number): Promise<ApiResponse<null>> => {
      return this.request<null>(`products/${id}`, {
        method: 'DELETE',
      });
    },
  };

  // Orders endpoints

  orders = {
    getAll: async (): Promise<OrdersResponse> => {
      const response = await this.request<Order[]>('orders');
      return response as unknown as OrdersResponse;
    },
    getById: async (id: number): Promise<OrderResponse> => {
      const response = await this.request<Order>(`orders/${id}`);
      return response as unknown as OrderResponse;
    },
    create: async (orderData: any[], groupId: number): Promise<OrderResponse> => {
      const response = await this.request<Order>('orders', {
        method: 'POST',
        body: JSON.stringify({ items: orderData, group_id: groupId }),
      });
      return response as unknown as OrderResponse;
    },

    updateStatus: async(id: number, status: string): Promise<OrderResponse> => {
      const response = await this.request<Order>(`orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      return response as unknown as OrderResponse;
    },
  };

  // Vendors endpoints

  vendors = {
    getAll: async (): Promise<VendorsResponse> => {
      const response = await this.request<Vendor[]>('vendors');
      return response as unknown as VendorsResponse;
    },
    getById: async (id: number): Promise<VendorResponse> => {
      const response = await this.request<Vendor>(`vendors/${id}`);
      return response as unknown as VendorResponse;
    },
    getDashboard: async (vendorId: number): Promise<VendorStatsResponse> => {
      const response = await this.request<VendorStats>(`vendors/${vendorId}/dashboard`);
      return response as unknown as VendorStatsResponse;
    },
    getOrders: async (vendorId: number): Promise<VendorOrdersResponse> => {
      const response = await this.request<VendorOrder[]>(`vendors/${vendorId}/orders`);
      return response as unknown as VendorOrdersResponse;
    },
    getCustomers: async (vendorId: number): Promise<VendorCustomersResponse> => {
      const response = await this.request<VendorCustomer[]>(`vendors/${vendorId}/customers`);
      return response as unknown as VendorCustomersResponse;
    },
  };

  // Escrow endpoints

  escrow = {
    getTransactions: async (type?: 'seller' | 'buyer' | 'all'): Promise<EscrowTransactionsResponse> => {
      const params = type ? new URLSearchParams({ type }) : new URLSearchParams();
      const response = await this.request<EscrowTransaction[]>(`escrow/transactions?${params.toString()}`);
      return response as unknown as EscrowTransactionsResponse;
    },

    getById: async (id: number): Promise<EscrowTransactionResponse> => {
      const response = await this.request<EscrowTransaction>(`escrow/transactions/${id}`);
      return response as unknown as EscrowTransactionResponse;
    },
    createTransaction: async (orderId: number, sellerId: number, amount: number, escrowFee: number): Promise<EscrowTransactionResponse> => {
      const response = await this.request<EscrowTransaction>('escrow/transactions', {
        method: 'POST',
        body: JSON.stringify({ order_id: orderId, seller_id: sellerId, amount, escrow_fee: escrowFee }),
      });
      return response as unknown as EscrowTransactionResponse;
    },
    updateStatus: async (id: number, status: string, trackingId?: string, courier?: string): Promise<EscrowTransactionResponse> => {
      const response = await this.request<EscrowTransaction>(`escrow/transactions/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, tracking_id: trackingId, courier }),
      });
      return response as unknown as EscrowTransactionResponse;
    },
    confirmDelivery: async (id: number): Promise<EscrowTransactionResponse> => {
      const response = await this.request<EscrowTransaction>(`escrow/transactions/${id}/release `, {
        method: 'POST',
      });
      return response as unknown as EscrowTransactionResponse;
    },
  };

  // Users endpoints

  users = {
    getAll: async (): Promise<UsersResponse> => {
      const response = await this.request<User[]>('users');
      return response as unknown as UsersResponse;
    },
    getById: async (id: number): Promise<UserResponse> => {
      const response = await this.request<User>(`users/${id}`);
      return response as unknown as UserResponse;
    },
    getStats: async (): Promise<UserStatsResponse> => {
      const response = await this.request<{total: number; active: number; superUsers: number; admins: number; vendors: number; members: number}>('users/stats');
      return response as unknown as UserStatsResponse;
    },

    create: async (userData: Omit<User, 'id' | 'createdAt'>): Promise<UserResponse> => {
      const response = await this.request<User>('users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      return response as unknown as UserResponse;
    },
    update: async (id: number, userData: Partial<User>): Promise<UserResponse> => {
      const response = await this.request<User>(`users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      });
      return response as unknown as UserResponse;
    },
    delete: async (id: number): Promise<ApiResponse<null>> => {
      return this.request<null>(`users/${id}`, {
        method: 'DELETE',
      });
    },
    activate: async (id: number): Promise<UserResponse> => {
      const response = await this.request<User>(`users/${id}/activate`, {
        method: 'POST',
      });
      return response as unknown as UserResponse;
    },
    deactivate: async (id: number): Promise<UserResponse> => {
      const response = await this.request<User>(`users/${id}/deactivate`, {
        method: 'POST',
      });
      return response as unknown as UserResponse;
    },
  };

  // Groups endpoints
  groups = {
    getAll: async (): Promise<GroupListResponse> => {
      const response = await this.request<Group[]>('groups');
      return response as unknown as GroupListResponse;
    },
    getById: async (id: string): Promise<GroupResponse> => {
      const response = await this.request<Group>(`groups/${id}`);
      return response as unknown as GroupResponse;
    },
    create: async (groupData: CreateGroupPayload): Promise<GroupResponse> => {
      const response = await this.request<Group>('groups', {
        method: 'POST',
        body: JSON.stringify(groupData),
      });
      return response as unknown as GroupResponse;
    },
    update: async (id: string, groupData: UpdateGroupPayload): Promise<GroupResponse> => {
      const response = await this.request<Group>(`groups/${id}`, {
        method: 'PUT',
        body: JSON.stringify(groupData),
      });
      return response as unknown as GroupResponse;
    },
    delete: async (id: string): Promise<ApiResponse<null>> => {
      return this.request<null>(`groups/${id}`, {
        method: 'DELETE',
      });
    },
    join: async (joinData: JoinGroupPayload): Promise<GroupResponse> => {
      const response = await this.request<Group>('groups/join', {
        method: 'POST',
        body: JSON.stringify(joinData),
      });
      return response as unknown as GroupResponse;
    },
    addMember: async (groupId: string, memberData: AddMemberPayload): Promise<ApiResponse<null>> => {
      return this.request<null>(`groups/${groupId}/members`, {
        method: 'POST',
        body: JSON.stringify(memberData),
      });
    },
    removeMember: async (groupId: string, memberId: string): Promise<ApiResponse<null>> => {
      return this.request<null>(`groups/${groupId}/members/${memberId}`, {
        method: 'DELETE',
      });
    },
    updateMemberRole: async (groupId: string, memberId: string, roleData: UpdateMemberRolePayload): Promise<ApiResponse<null>> => {
      return this.request<null>(`groups/${groupId}/members/${memberId}`, {
        method: 'PUT',
        body: JSON.stringify(roleData),
      });
    },
    getMembers: async (groupId: string): Promise<ApiResponse<GroupMember[]>> => {
      const response = await this.request<GroupMember[]>(`groups/${groupId}/members`);
      return response as unknown as ApiResponse<GroupMember[]>;
    },
  }
};

export const apiClient = new ApiClient();
