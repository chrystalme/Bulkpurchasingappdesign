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
  UserRole,
  TrustScore,
  Group,
  GroupMember,
  CreateGroupPayload,
  UpdateGroupPayload,
  AddMemberPayload,
  UpdateMemberRolePayload,
  JoinGroupPayload,
  DiscoverableGroup,
  JoinRequest,
} from './types';

const API_URL = 'http://localhost:3001/api'; //import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  // message?: string;
  accessToken?: string;
  user?: User;
  error?: string;
}

export interface CartAllocation {
  id?: string;
  memberId: string;
  memberName?: string;
  memberAvatar?: string;
  quantity: number;
  paid?: boolean;
}

export interface CartItemData {
  id?: string;
  productId: string;
  quantity: number;
  allocations: CartAllocation[];
}

/**
 * Product rows as they come off the wire: snake_case keys, numeric columns
 * (prices) serialised as strings, joined vendor columns alongside.
 * See FRONTEND_INTEGRATION_GUIDE.md for the column → field mapping.
 */
type RawProduct = Record<string, unknown>;

function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Map an API product row onto the app's `Product` contract, so no screen has to
 * know both spellings. Unknown columns are kept for anything not modelled yet.
 */
function normalizeProduct(raw: RawProduct): Product {
  return {
    ...raw,
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    image: String(raw.image ?? ''),
    category: String(raw.category ?? ''),
    moq: toNumber(raw.moq),
    bulkPrice: toNumber(raw.bulkPrice ?? raw.bulk_price),
    retailPrice: toNumber(raw.retailPrice ?? raw.retail_price),
    vendorId: String(raw.vendorId ?? raw.vendor_id ?? ''),
    vendorName: String(raw.vendorName ?? raw.vendor_name ?? ''),
    vendorRating: toNumber(raw.vendorRating ?? raw.vendor_rating),
  } as Product;
}

/**
 * Map the app's `Product` (camelCase) onto the snake_case request body the
 * products routes validate. `vendor_id` is only sent when creating.
 */
function toProductPayload(
  product: Partial<Product>,
  isCreate = false,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const put = (key: string, value: unknown) => {
    if (value !== undefined) payload[key] = value;
  };

  put('name', product.name);
  put('image', product.image);
  put('category', product.category);
  put('moq', product.moq);
  put('bulk_price', product.bulkPrice);
  put('retail_price', product.retailPrice);
  if (isCreate) put('vendor_id', product.vendorId);

  return payload;
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
interface UserStatsResponse extends ApiResponse<{
  total: number;
  active: number;
  superUsers: number;
  admins: number;
  vendors: number;
  members: number;
}> {}

// --- Payload normalisers -------------------------------------------------
// The API answers in snake_case while the app consumes camelCase (escrow) or
// the DB-shaped User type. Normalise at this boundary so every caller gets
// the shape its types promise, and so a missing field degrades gracefully
// instead of crashing a screen on `undefined.toLocaleDateString()`.

const asNumber = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
};

function normaliseEscrowTransaction(raw: any): EscrowTransaction {
  const products: any[] = Array.isArray(raw?.products)
    ? raw.products.filter((p: any) => p && p.product_name)
    : [];
  const productNames = products.map((p: any) => String(p.product_name));

  return {
    id: String(raw?.id ?? ''),
    transactionNumber: raw?.transaction_number ?? undefined,
    orderId: String(raw?.order_id ?? ''),
    orderNumber: raw?.order_number ?? undefined,
    orderStatus: raw?.order_status ?? undefined,
    buyerId: String(raw?.buyer_id ?? ''),
    buyerName: raw?.buyer_name ?? undefined,
    buyerEmail: raw?.buyer_email ?? undefined,
    sellerId: String(raw?.seller_id ?? ''),
    sellerName: raw?.seller_name ?? '',
    sellerEmail: raw?.seller_email ?? undefined,
    amount: asNumber(raw?.amount),
    escrowFee: asNumber(raw?.escrow_fee ?? raw?.escrowFee),
    status: raw?.status ?? 'locked',
    createdAt: raw?.created_at ?? raw?.createdAt ?? '',
    paidAt: raw?.paid_at ?? raw?.paidAt ?? undefined,
    shippedAt: raw?.shipped_at ?? raw?.shippedAt ?? undefined,
    deliveredAt: raw?.delivered_at ?? raw?.deliveredAt ?? undefined,
    inspectionDeadline:
      raw?.inspection_deadline ?? raw?.inspectionDeadline ?? undefined,
    autoReleaseAt: raw?.auto_release_at ?? raw?.autoReleaseAt ?? undefined,
    releasedAt: raw?.released_at ?? raw?.releasedAt ?? undefined,
    productName: productNames.length ? productNames.join(', ') : 'Group Order',
    products: products.map((p: any) => ({
      productName: String(p.product_name),
      quantity: asNumber(p.quantity),
      price: asNumber(p.price),
    })),
    sellerVerified: Boolean(raw?.seller_verified ?? raw?.sellerVerified ?? false),
    trackingId: raw?.tracking_id ?? raw?.trackingId ?? undefined,
    courier: raw?.courier ?? undefined,
  };
}

function normaliseUser(raw: any): User {
  return {
    id: String(raw?.id ?? ''),
    email: raw?.email ?? '',
    name: raw?.name ?? '',
    role: (raw?.role ?? 'member') as UserRole,
    avatar: raw?.avatar ?? undefined,
    phone: raw?.phone ?? undefined,
    vendor_id: raw?.vendor_id ?? raw?.vendorId ?? null,
    trust_score: raw?.trust_score ?? raw?.trustScore ?? null,
    created_at: raw?.created_at ?? raw?.createdAt ?? undefined,
    is_active: raw?.is_active ?? raw?.isActive ?? true,
  };
}

class ApiClient {
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  private getAuthHeader(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async attemptTokenRefresh(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      if (data.success && data.accessToken) {
        localStorage.setItem('auth_token', data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('refresh_token', data.refreshToken);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private async refreshAndRetry<T>(
    endpoint: string,
    options: RequestInit,
  ): Promise<ApiResponse<T> | null> {
    // Deduplicate concurrent refresh attempts
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshPromise = this.attemptTokenRefresh().finally(() => {
        this.isRefreshing = false;
        this.refreshPromise = null;
      });
    }

    const success = await this.refreshPromise;
    if (!success) return null;

    // Retry the original request with the new token
    const URL = `${API_URL}/${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
        ...options.headers,
      },
    };
    const retryResponse = await fetch(URL, config);
    if (retryResponse.ok) {
      return await retryResponse.json();
    }
    return null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
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

      // Handle authentication errors - try refreshing token first
      if (response.status === 401) {
        const retryResult = await this.refreshAndRetry<T>(endpoint, options);
        if (retryResult) return retryResult;

        // Refresh failed — clear auth
        // Note: Redux middleware will handle logout and navigation
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('userId');
        
        // Dispatch logout action if store is available (avoid circular dependency)
        // The auth slice logout action will be dispatched by the component/middleware
        // For now, we'll let the component handle navigation via Redux
        return {
          success: false,
          error: 'Session expired. Please login again.',
        } as unknown as ApiResponse<T>;
      }

      // Handle forbidden errors
      if (response.status === 403) {
        console.warn(`Access denied to ${endpoint}`);
        return {
          success: false,
          error:
            'Access denied. You do not have permission to perform this action.',
        } as unknown as ApiResponse<T>;
      }

      // Handle rate limiting
      if (response.status === 429) {
        console.warn(`Rate limited on ${endpoint}`);
        return {
          success: false,
          error: 'Too many requests. Please try again later.',
        } as unknown as ApiResponse<T>;
      }

      if (!response.ok) {
        const errorMessage =
          data?.error || `Request failed with status ${response.status}`;
        console.error(`API error on ${endpoint}:`, errorMessage);
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error('API request error:', errorMessage);
      // Return user-friendly error messages, don't expose internal details
      return {
        success: false,
        error: 'Unable to complete request. Please try again later.',
      } as unknown as ApiResponse<T>;
    }
  }

  // Auth endpoints

  auth = {
    login: async (email: string, password: string): Promise<AuthResponse> => {
      const response = await this.request<null>('auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (response.accessToken) {
        localStorage.setItem('auth_token', response.accessToken);
      }
      if (response.refreshToken) {
        localStorage.setItem('refresh_token', response.refreshToken);
      }
      return response as unknown as AuthResponse;
    },
    signup: async (
      email: string,
      password: string,
      name: string,
      role = 'member',
    ): Promise<AuthResponse> => {
      const response = await this.request<null>('auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, name, role }),
      });
      if (response.accessToken) {
        localStorage.setItem('auth_token', response.accessToken);
      }
      if (response.refreshToken) {
        localStorage.setItem('refresh_token', response.refreshToken);
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
    getAll: async (filters?: {
      category?: string;
      vendor_id?: string;
    }): Promise<ProductsResponse> => {
      const params = new URLSearchParams(filters as any);
      const response = await this.request<RawProduct[]>(
        `products?${params.toString()}`,
      );
      return {
        ...response,
        data: (response.data ?? []).map(normalizeProduct),
      } as unknown as ProductsResponse;
    },
    getById: async (id: string): Promise<ProductResponse> => {
      const response = await this.request<RawProduct>(`products/${id}`);
      return {
        ...response,
        data: response.data ? normalizeProduct(response.data) : undefined,
      } as unknown as ProductResponse;
    },
    getCategories: async (): Promise<CategoriesResponse> => {
      const response = await this.request<string[]>('products/categories');
      return response as unknown as CategoriesResponse;
    },
    create: async (
      productData: Omit<Product, 'id'>,
    ): Promise<ProductResponse> => {
      const response = await this.request<RawProduct>('products', {
        method: 'POST',
        body: JSON.stringify(toProductPayload(productData, true)),
      });
      return {
        ...response,
        data: response.data ? normalizeProduct(response.data) : undefined,
      } as unknown as ProductResponse;
    },
    update: async (
      id: string,
      productData: Partial<Product>,
    ): Promise<ProductResponse> => {
      const response = await this.request<RawProduct>(`products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(toProductPayload(productData)),
      });
      return {
        ...response,
        data: response.data ? normalizeProduct(response.data) : undefined,
      } as unknown as ProductResponse;
    },
    delete: async (id: string): Promise<ApiResponse<null>> => {
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
    getById: async (id: string): Promise<OrderResponse> => {
      const response = await this.request<Order>(`orders/${id}`);
      return response as unknown as OrderResponse;
    },
    create: async (
      orderData: any[],
      groupId: string,
    ): Promise<OrderResponse> => {
      const response = await this.request<Order>('orders', {
        method: 'POST',
        body: JSON.stringify({ items: orderData, group_id: groupId }),
      });
      return response as unknown as OrderResponse;
    },

    updateStatus: async (
      id: string,
      status: string,
    ): Promise<OrderResponse> => {
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
    getById: async (id: string): Promise<VendorResponse> => {
      const response = await this.request<Vendor>(`vendors/${id}`);
      return response as unknown as VendorResponse;
    },
    getDashboard: async (vendorId: string): Promise<VendorStatsResponse> => {
      const response = await this.request<VendorStats>(
        `vendors/${vendorId}/dashboard`,
      );

      // The API answers in snake_case while the app consumes VendorStats
      // (camelCase). Normalise at this boundary so every caller gets the
      // shape its types promise, and so a missing field degrades to 0
      // instead of crashing a screen on `undefined.toLocaleString()`.
      const raw = (response?.data ?? {}) as Record<string, unknown>;
      const num = (value: unknown): number => {
        const parsed = typeof value === 'number' ? value : parseFloat(String(value));
        return Number.isFinite(parsed) ? parsed : 0;
      };
      const pick = (camel: string, snake: string) => num(raw[camel] ?? raw[snake]);
      const stats: VendorStats = {
        totalRevenue: pick('totalRevenue', 'total_revenue'),
        monthlyRevenue: pick('monthlyRevenue', 'monthly_revenue'),
        totalOrders: pick('totalOrders', 'total_orders'),
        pendingOrders: pick('pendingOrders', 'pending_orders'),
        totalProducts: pick('totalProducts', 'total_products'),
        totalCustomers: pick('totalCustomers', 'total_customers'),
        averageRating: pick('averageRating', 'average_rating'),
        totalReviews: pick('totalReviews', 'total_reviews'),
      };

      return { ...response, data: stats } as VendorStatsResponse;
    },
    getOrders: async (vendorId: string): Promise<VendorOrdersResponse> => {
      const response = await this.request<VendorOrder[]>(
        `vendors/${vendorId}/orders`,
      );
      return response as unknown as VendorOrdersResponse;
    },
    getCustomers: async (
      vendorId: string,
    ): Promise<VendorCustomersResponse> => {
      const response = await this.request<VendorCustomer[]>(
        `vendors/${vendorId}/customers`,
      );
      return response as unknown as VendorCustomersResponse;
    },
  };

  // Escrow endpoints

  escrow = {
    getTransactions: async (
      type?: 'seller' | 'buyer' | 'all',
    ): Promise<EscrowTransactionsResponse> => {
      const params = type
        ? new URLSearchParams({ type })
        : new URLSearchParams();
      const response = await this.request<EscrowTransaction[]>(
        `escrow/transactions?${params.toString()}`,
      );
      const raw = Array.isArray(response?.data) ? response.data : [];
      return {
        ...response,
        data: raw.map(normaliseEscrowTransaction),
      } as EscrowTransactionsResponse;
    },

    getById: async (id: string): Promise<EscrowTransactionResponse> => {
      const response = await this.request<EscrowTransaction>(
        `escrow/transactions/${id}`,
      );
      // This endpoint answers with `transaction`, not `data`.
      const raw = (response as any)?.data ?? (response as any)?.transaction;
      return {
        ...response,
        data: raw ? normaliseEscrowTransaction(raw) : undefined,
      } as EscrowTransactionResponse;
    },
    createTransaction: async (
      orderId: string,
      sellerId: string,
      amount: number,
      escrowFee: number,
    ): Promise<EscrowTransactionResponse> => {
      const response = await this.request<EscrowTransaction>(
        'escrow/transactions',
        {
          method: 'POST',
          body: JSON.stringify({
            order_id: orderId,
            seller_id: sellerId,
            amount,
            escrow_fee: escrowFee,
          }),
        },
      );
      return response as unknown as EscrowTransactionResponse;
    },
    updateStatus: async (
      id: string,
      status: string,
      trackingId?: string,
      courier?: string,
    ): Promise<EscrowTransactionResponse> => {
      const response = await this.request<EscrowTransaction>(
        `escrow/transactions/${id}/status`,
        {
          method: 'PUT',
          body: JSON.stringify({ status, tracking_id: trackingId, courier }),
        },
      );
      return response as unknown as EscrowTransactionResponse;
    },
    confirmDelivery: async (id: string): Promise<EscrowTransactionResponse> => {
      const response = await this.request<EscrowTransaction>(
        `escrow/transactions/${id}/confirm-delivery`,
        {
          method: 'POST',
        },
      );
      return response as unknown as EscrowTransactionResponse;
    },
    releaseFunds: async (id: string): Promise<EscrowTransactionResponse> => {
      const response = await this.request<EscrowTransaction>(
        `escrow/transactions/${id}/release`,
        {
          method: 'POST',
        },
      );
      return response as unknown as EscrowTransactionResponse;
    },
    getDisputes: async (): Promise<ApiResponse<any[]>> => {
      const response = await this.request<any[]>('escrow/disputes');
      return response;
    },
    createDispute: async (payload: {
      transactionId: string;
      reason: string;
      description?: string;
    }): Promise<ApiResponse<any>> => {
      const response = await this.request<any>('escrow/disputes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return response;
    },
    resolveDispute: async (
      id: string,
      resolution: string,
      adminNotes?: string,
    ): Promise<ApiResponse<any>> => {
      const response = await this.request<any>(`escrow/disputes/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ resolution, adminNotes }),
      });
      return response;
    },
  };

  // Users endpoints

  users = {
    getAll: async (): Promise<UsersResponse> => {
      const response = await this.request<User[]>('users');
      const raw = Array.isArray(response?.data) ? response.data : [];
      return { ...response, data: raw.map(normaliseUser) } as UsersResponse;
    },
    getById: async (id: string): Promise<UserResponse> => {
      const response = await this.request<User>(`users/${id}`);
      const raw = (response as any)?.data ?? (response as any)?.user;
      return {
        ...response,
        data: raw ? normaliseUser(raw) : undefined,
      } as UserResponse;
    },
    getStats: async (): Promise<UserStatsResponse> => {
      const response = await this.request<{
        total: number;
        active: number;
        superUsers: number;
        admins: number;
        vendors: number;
        members: number;
      }>('users/stats');
      return response as unknown as UserStatsResponse;
    },

    create: async (userData: {
      email: string;
      password: string;
      name: string;
      role: UserRole;
      vendorId?: string;
    }): Promise<UserResponse> => {
      const response = await this.request<User>('users', {
        method: 'POST',
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          name: userData.name,
          role: userData.role,
          vendorId: userData.vendorId || undefined,
        }),
      });
      // This endpoint answers with `user`, not `data`.
      const raw = (response as any)?.data ?? (response as any)?.user;
      return {
        ...response,
        data: raw ? normaliseUser(raw) : undefined,
      } as UserResponse;
    },
    update: async (
      id: string,
      userData: Partial<User> & { password?: string },
    ): Promise<UserResponse> => {
      // The app models users in the DB's snake_case shape while the API
      // expects camelCase keys. Translate at this boundary so callers can
      // keep speaking the type they were given.
      const body: Record<string, unknown> = {};
      if (userData.name !== undefined) body.name = userData.name;
      if (userData.email !== undefined) body.email = userData.email;
      if (userData.password) body.password = userData.password;
      if (userData.role !== undefined) body.role = userData.role;
      if (userData.vendor_id !== undefined) body.vendorId = userData.vendor_id ?? '';
      if (userData.is_active !== undefined) body.isActive = userData.is_active;
      if (userData.trust_score !== undefined) body.trustScore = userData.trust_score;

      const response = await this.request<User>(`users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      const raw = (response as any)?.data ?? (response as any)?.user;
      return {
        ...response,
        data: raw ? normaliseUser(raw) : undefined,
      } as UserResponse;
    },
    delete: async (id: string): Promise<ApiResponse<null>> => {
      return this.request<null>(`users/${id}`, {
        method: 'DELETE',
      });
    },
    activate: async (id: string): Promise<UserResponse> => {
      const response = await this.request<User>(`users/${id}/activate`, {
        method: 'POST',
      });
      const raw = (response as any)?.data ?? (response as any)?.user;
      return {
        ...response,
        data: raw ? normaliseUser(raw) : undefined,
      } as UserResponse;
    },
    deactivate: async (id: string): Promise<UserResponse> => {
      const response = await this.request<User>(`users/${id}/deactivate`, {
        method: 'POST',
      });
      const raw = (response as any)?.data ?? (response as any)?.user;
      return {
        ...response,
        data: raw ? normaliseUser(raw) : undefined,
      } as UserResponse;
    },
  };

  // Chat endpoints
  chat = {
    getConversations: async (filters?: {
      type?: 'group' | 'group-vendor' | 'direct';
      groupId?: string;
    }): Promise<ApiResponse<any[]>> => {
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.groupId) params.append('groupId', filters.groupId);
      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await this.request<any[]>(`chat/conversations${query}`);
      return response as unknown as ApiResponse<any[]>;
    },
    createDirectConversation: async (
      userId: string,
    ): Promise<ApiResponse<any>> => {
      return this.request<any>(`chat/conversations/direct`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
    },
    getMessages: async (
      conversationId: string,
      params?: { limit?: number; before?: string }
    ): Promise<ApiResponse<any[]>> => {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.before) queryParams.append('before', params.before);
      const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const response = await this.request<any[]>(
        `chat/conversations/${conversationId}/messages${query}`
      );
      return response as unknown as ApiResponse<any[]>;
    },
    getParticipants: async (
      conversationId: string
    ): Promise<ApiResponse<any[]>> => {
      const response = await this.request<any[]>(
        `chat/conversations/${conversationId}/participants`
      );
      return response as unknown as ApiResponse<any[]>;
    },
    markAsRead: async (conversationId: string): Promise<ApiResponse<null>> => {
      return this.request<null>(
        `chat/conversations/${conversationId}/read`,
        { method: 'PUT' }
      );
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
    update: async (
      id: string,
      groupData: UpdateGroupPayload,
    ): Promise<GroupResponse> => {
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
    addMember: async (
      groupId: string,
      memberData: AddMemberPayload,
    ): Promise<ApiResponse<null>> => {
      return this.request<null>(`groups/${groupId}/members`, {
        method: 'POST',
        body: JSON.stringify(memberData),
      });
    },
    removeMember: async (
      groupId: string,
      memberId: string,
    ): Promise<ApiResponse<null>> => {
      return this.request<null>(`groups/${groupId}/members/${memberId}`, {
        method: 'DELETE',
      });
    },
    updateMemberRole: async (
      groupId: string,
      memberId: string,
      roleData: UpdateMemberRolePayload,
    ): Promise<ApiResponse<null>> => {
      return this.request<null>(`groups/${groupId}/members/${memberId}`, {
        method: 'PUT',
        body: JSON.stringify(roleData),
      });
    },
    getMembers: async (
      groupId: string,
    ): Promise<ApiResponse<GroupMember[]>> => {
      const response = await this.request<GroupMember[]>(
        `groups/${groupId}/members`,
      );
      return response as unknown as ApiResponse<GroupMember[]>;
    },
    discover: async (search?: string): Promise<ApiResponse<DiscoverableGroup[]>> => {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await this.request<DiscoverableGroup[]>(`groups/discover${params}`);
      return response as unknown as ApiResponse<DiscoverableGroup[]>;
    },
    createJoinRequest: async (
      groupId: string,
      message?: string,
    ): Promise<ApiResponse<JoinRequest>> => {
      const response = await this.request<JoinRequest>(`groups/${groupId}/join-requests`, {
        method: 'POST',
        body: JSON.stringify({ message: message || '' }),
      });
      return response as unknown as ApiResponse<JoinRequest>;
    },
    getJoinRequests: async (
      groupId: string,
      status?: string,
    ): Promise<ApiResponse<JoinRequest[]>> => {
      const params = status ? `?status=${status}` : '';
      const response = await this.request<JoinRequest[]>(`groups/${groupId}/join-requests${params}`);
      return response as unknown as ApiResponse<JoinRequest[]>;
    },
    reviewJoinRequest: async (
      groupId: string,
      requestId: string,
      action: 'approved' | 'rejected',
    ): Promise<ApiResponse<null>> => {
      return this.request<null>(`groups/${groupId}/join-requests/${requestId}`, {
        method: 'PUT',
        body: JSON.stringify({ action }),
      });
    },
  };

  cart = {
    get: async (groupId: string): Promise<ApiResponse<{ groupId: string; items: CartItemData[] }>> => {
      return this.request<{ groupId: string; items: CartItemData[] }>(`groups/${groupId}/cart`);
    },
    addItem: async (
      groupId: string,
      data: { productId: string; quantity: number; memberId?: string },
    ): Promise<ApiResponse<{ groupId: string; items: CartItemData[] }>> => {
      return this.request<{ groupId: string; items: CartItemData[] }>(`groups/${groupId}/cart/items`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    updateQuantity: async (
      groupId: string,
      productId: string,
      data: { delta?: number; quantity?: number },
    ): Promise<ApiResponse<{ groupId: string; items: CartItemData[] }>> => {
      return this.request<{ groupId: string; items: CartItemData[] }>(`groups/${groupId}/cart/items/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    updateAllocation: async (
      groupId: string,
      productId: string,
      memberId: string,
      data: { quantity?: number; paid?: boolean },
    ): Promise<ApiResponse<{ groupId: string; items: CartItemData[] }>> => {
      return this.request<{ groupId: string; items: CartItemData[] }>(
        `groups/${groupId}/cart/items/${productId}/allocations/${memberId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(data),
        },
      );
    },
    updatePayment: async (
      groupId: string,
      data: { memberId?: string; paid?: boolean; markAll?: boolean },
    ): Promise<ApiResponse<{ groupId: string; items: CartItemData[] }>> => {
      return this.request<{ groupId: string; items: CartItemData[] }>(`groups/${groupId}/cart/allocations/payment`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    removeItem: async (
      groupId: string,
      productId: string,
    ): Promise<ApiResponse<{ groupId: string; items: CartItemData[] }>> => {
      return this.request<{ groupId: string; items: CartItemData[] }>(`groups/${groupId}/cart/items/${productId}`, {
        method: 'DELETE',
      });
    },
    clear: async (groupId: string): Promise<ApiResponse<null>> => {
      return this.request<null>(`groups/${groupId}/cart`, {
        method: 'DELETE',
      });
    },
  };
}

export const apiClient = new ApiClient();
