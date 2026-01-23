const API_URL = import.meta.VITE_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  // message?: string;
  error?: string;
}

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

  auth = {
    login: async (email: string, password: string) => {
      const data = await this.request<any>('auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      return data;
    },
    signup: async (
      email: string,
      password: string,
      name: string,
      role = 'member'
    ) => {
      const data = await this.request<any>('auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, name, role }),
      });
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      return data;
    },

    me: async () => {
      return this.request<any>('auth/me');
    },

    logout: () => {
      localStorage.removeItem('auth_token');
    },
  };

  products = {
    getAll: async (filters?: (category?: string; vendor_id?: number)) => {
      const params = new URLSearchParams(filters as any);
      return this.request<any>(`products?${params.toString()}`);
    },
    getById: async (id: number) => {
      return this.request<any>(`products/${id}`);
    },
    getCategories: async () => {
      return this.request<any>('products/categories');
    },
    create: async (productData: any) => {
      return this.request<any>('products', {
        method: 'POST',
        body: JSON.stringify(productData),
      });
    },
    update: async (id: number, productData: any) => {
      return this.request<any>(`products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(productData),
      });
    },
    delete: async (id: number) => {
      return this.request<any>(`products/${id}`, {
        method: 'DELETE',
      });
    },
  };

  orders = {
    getAll: async () => {
      return this.request<any>('orders');
    },
    getById: async (id: number) => {
      return this.request<any>(`orders/${id}`);
    },
    create: async (orderData: any[], groupId: number) => {
      return this.request<any>('orders', {
        method: 'POST',
        body: JSON.stringify({ items: orderData, group_id: groupId }),
      });
    },

    updateStatus: async(id: number, status: string) => {
      return this.request<any>(`orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
    },
  };

  vendors = {
    getAll: async () => {
      return this.request<any>('vendors');
    },
    getById: async (id: number) => {
      return this.request<any>(`vendors/${id}`);
    },
    getDashboard: async (vendorId: number) => {
      return this.request<any>(`vendors/${vendorId}/dashboard`);
    },
    getOrders: async (vendorId: number) => {
      return this.request<any>(`vendors/${vendorId}/orders`);
    },
    getCustomers: async (vendorId: number) => {
      return this.request<any>(`vendors/${vendorId}/customers`);
    },
  };

  escrow = {
    getTransactions: async (type?: 'seller' | 'buyer' | 'all')  => {
      const params = type ? new URLSearchParams({ type }) : new URLSearchParams();
      return this.request<any>(`escrow/transactions?${params.toString()}`);
    },

    getById: async (id: number) => {
      return this.request<any>(`escrow/transactions/${id}`);
    },
    createTransaction: async (orderId: number, sellerId: number, amount: number, escrowFee: number) => {
      return this.request<any>('escrow/transactions', {
        method: 'POST',
        body: JSON.stringify({ order_id: orderId, seller_id: sellerId, amount, escrow_fee: escrowFee }),
      });
    },
    updateStatus: async (id: number, status: string, trackingId?: string, courier?: string) => {
      return this.request<any>(`escrow/transactions/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, tracking_id: trackingId, courier }),
      });
    },
    confirmDelivery: async (id: number) => {
      return this.request<any>(`escrow/transactions/${id}/release `, {
        method: 'POST',
      });
    },
  };

  users= {
    getAll: async () => {
      return this.request<any>('users');
    },
    getById: async (id: number) => {    
      return this.request<any>(`users/${id}`);
    },
    getStats : async () => {
      return this.request<any>('users/stats');
    },

    create: async (userData: any) => {
      return this.request<any>('users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },
    update: async (id: number, userData: any) => {
      return this.request<any>(`users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      });
    },
    delete: async (id: number) => {
      return this.request<any>(`users/${id}`, {
        method: 'DELETE',
      });
    },
    activate: async (id: number) => {
      return this.request<any>(`users/${id}/activate`, {
        method: 'POST',
      });
    },
    deactivate: async (id: number) => {
      return this.request<any>(`users/${id}/deactivate`, {
        method: 'POST',
      });
    },
  }
};

export const apiClient = new ApiClient();
