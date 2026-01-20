# 🔌 Frontend Integration Guide

How to connect your React frontend to the new Express + PostgreSQL backend.

## 📋 Overview

Your frontend currently uses mock data from `/lib/mockData.ts` and `/lib/auth.ts`. This guide shows you how to replace that with real API calls to your backend.

## 🎯 Integration Strategy

**Phase 1: API Service Layer** ✅ (You'll do this)
- Create API client
- Handle authentication tokens
- Centralize API calls

**Phase 2: Replace Auth System** ✅
- Update `AuthContext` to use real API
- Store JWT tokens
- Handle login/signup/logout

**Phase 3: Replace Mock Data** ✅
- Products → API calls
- Orders → API calls
- Vendors → API calls
- Escrow → API calls

---

## Step 1: Create API Service

Create `/lib/api.ts`:

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiClient {
  private getAuthHeader(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Authentication
  auth = {
    login: async (email: string, password: string) => {
      const data = await this.request<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      return data;
    },

    signup: async (email: string, password: string, name: string, role = 'member') => {
      const data = await this.request<any>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, name, role }),
      });
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      return data;
    },

    me: async () => {
      return this.request<any>('/auth/me');
    },

    logout: () => {
      localStorage.removeItem('auth_token');
    },
  };

  // Products
  products = {
    getAll: async (filters?: { category?: string; vendor_id?: number }) => {
      const params = new URLSearchParams(filters as any);
      return this.request<any>(`/products?${params}`);
    },

    getById: async (id: number) => {
      return this.request<any>(`/products/${id}`);
    },

    getCategories: async () => {
      return this.request<any>('/products/categories');
    },

    create: async (productData: any) => {
      return this.request<any>('/products', {
        method: 'POST',
        body: JSON.stringify(productData),
      });
    },

    update: async (id: number, updates: any) => {
      return this.request<any>(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    delete: async (id: number) => {
      return this.request<any>(`/products/${id}`, {
        method: 'DELETE',
      });
    },
  };

  // Orders
  orders = {
    getAll: async () => {
      return this.request<any>('/orders');
    },

    getById: async (id: number) => {
      return this.request<any>(`/orders/${id}`);
    },

    create: async (items: any[], groupId?: number) => {
      return this.request<any>('/orders', {
        method: 'POST',
        body: JSON.stringify({ items, group_id: groupId }),
      });
    },

    updateStatus: async (id: number, status: string) => {
      return this.request<any>(`/orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
    },
  };

  // Vendors
  vendors = {
    getAll: async () => {
      return this.request<any>('/vendors');
    },

    getById: async (id: number) => {
      return this.request<any>(`/vendors/${id}`);
    },

    getDashboard: async (id: number) => {
      return this.request<any>(`/vendors/${id}/dashboard`);
    },

    getOrders: async (id: number) => {
      return this.request<any>(`/vendors/${id}/orders`);
    },

    getCustomers: async (id: number) => {
      return this.request<any>(`/vendors/${id}/customers`);
    },
  };

  // Escrow
  escrow = {
    getTransactions: async (type?: 'buyer' | 'seller' | 'all') => {
      const params = type ? `?type=${type}` : '';
      return this.request<any>(`/escrow/transactions${params}`);
    },

    getById: async (id: number) => {
      return this.request<any>(`/escrow/transactions/${id}`);
    },

    create: async (orderId: number, sellerId: number, amount: number, escrowFee: number) => {
      return this.request<any>('/escrow/transactions', {
        method: 'POST',
        body: JSON.stringify({
          order_id: orderId,
          seller_id: sellerId,
          amount,
          escrow_fee: escrowFee,
        }),
      });
    },

    updateStatus: async (id: number, status: string, trackingId?: string, courier?: string) => {
      return this.request<any>(`/escrow/transactions/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, tracking_id: trackingId, courier }),
      });
    },

    confirmDelivery: async (id: number) => {
      return this.request<any>(`/escrow/transactions/${id}/confirm-delivery`, {
        method: 'POST',
      });
    },

    releaseFunds: async (id: number) => {
      return this.request<any>(`/escrow/transactions/${id}/release`, {
        method: 'POST',
      });
    },
  };

  // Users (Admin)
  users = {
    getAll: async () => {
      return this.request<any>('/users');
    },

    getStats: async () => {
      return this.request<any>('/users/stats');
    },

    getById: async (id: number) => {
      return this.request<any>(`/users/${id}`);
    },

    create: async (userData: any) => {
      return this.request<any>('/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },

    update: async (id: number, updates: any) => {
      return this.request<any>(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    delete: async (id: number) => {
      return this.request<any>(`/users/${id}`, {
        method: 'DELETE',
      });
    },

    activate: async (id: number) => {
      return this.request<any>(`/users/${id}/activate`, {
        method: 'POST',
      });
    },

    deactivate: async (id: number) => {
      return this.request<any>(`/users/${id}/deactivate`, {
        method: 'POST',
      });
    },
  };
}

export const api = new ApiClient();
```

---

## Step 2: Update AuthContext

Update `/contexts/AuthContext.tsx`:

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { User } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string, role?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const response = await api.auth.me();
          if (response.success) {
            setUser(response.user);
            setIsAuthenticated(true);
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('auth_token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.auth.login(email, password);
      
      if (response.success) {
        setUser(response.user);
        setIsAuthenticated(true);
        return { success: true };
      }
      
      return { success: false, error: response.error || 'Login failed' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  const signup = async (email: string, password: string, name: string, role = 'member') => {
    try {
      const response = await api.auth.signup(email, password, name, role);
      
      if (response.success) {
        setUser(response.user);
        setIsAuthenticated(true);
        return { success: true };
      }
      
      return { success: false, error: response.error || 'Signup failed' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Signup failed' };
    }
  };

  const logout = () => {
    api.auth.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

---

## Step 3: Update Components to Use API

### ProductCatalog Component

Update `/components/products/ProductCatalog.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { Product } from '../../lib/mockData';

export function ProductCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    loadProducts();
  }, [selectedCategory]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = selectedCategory !== 'All' ? { category: selectedCategory } : {};
      const response = await api.products.getAll(filters);
      
      // Map backend response to frontend format
      const mappedProducts = response.products.map((p: any) => ({
        id: p.id.toString(),
        name: p.name,
        image: p.image,
        bulkPrice: parseFloat(p.bulk_price),
        retailPrice: parseFloat(p.retail_price),
        moq: p.moq,
        vendorId: p.vendor_id?.toString(),
        vendorName: p.vendor_name,
        vendorRating: p.vendor_rating,
        category: p.category,
      }));
      
      setProducts(mappedProducts);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
      console.error('Load products error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading products...</div>;
  if (error) return <div>Error: {error}</div>;

  // ... rest of component
}
```

### VendorDashboard Component

Update `/components/vendor/VendorDashboard.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

export function VendorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.vendor_id) {
      loadDashboard();
    }
  }, [user]);

  const loadDashboard = async () => {
    try {
      const response = await api.vendors.getDashboard(user!.vendor_id!);
      setStats(response.stats);
    } catch (error) {
      console.error('Load dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading dashboard...</div>;

  // ... rest of component using stats
}
```

### OrderTracking Component

Update `/components/orders/OrderTracking.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

export function OrderTracking() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await api.orders.getAll();
      
      // Map to frontend format
      const mappedOrders = response.orders.map((o: any) => ({
        id: o.order_number,
        groupId: o.group_id?.toString(),
        status: o.status,
        items: JSON.parse(o.items || '[]'),
        total: parseFloat(o.total_amount),
        createdAt: new Date(o.created_at).toLocaleDateString(),
        estimatedDelivery: new Date(o.estimated_delivery).toLocaleDateString(),
      }));
      
      setOrders(mappedOrders);
    } catch (error) {
      console.error('Load orders error:', error);
    } finally {
      setLoading(false);
    }
  };

  // ... rest of component
}
```

---

## Step 4: Environment Configuration

Create `.env` in your frontend root:

```env
VITE_API_URL=http://localhost:3001/api
```

---

## Step 5: Handle CORS (Already configured!)

Your backend already has CORS enabled for `http://localhost:5173`. If your frontend runs on a different port, update `/server/.env`:

```env
CORS_ORIGIN=http://localhost:YOUR_PORT
```

---

## 🔄 Data Mapping Reference

Backend responses use snake_case, frontend uses camelCase. Here's the mapping:

| Backend | Frontend |
|---------|----------|
| `bulk_price` | `bulkPrice` |
| `retail_price` | `retailPrice` |
| `vendor_id` | `vendorId` |
| `vendor_name` | `vendorName` |
| `vendor_rating` | `vendorRating` |
| `created_at` | `createdAt` |
| `order_number` | `id` |
| `total_amount` | `total` |
| `trust_score` | `trustScore` |

---

## 🧪 Testing Integration

1. **Start Backend:**
```bash
cd server
npm run dev
```

2. **Start Frontend:**
```bash
npm run dev
```

3. **Test Login:**
- Go to login page
- Use `afam@example.com` / `password123`
- Should redirect to dashboard

4. **Test Products:**
- Navigate to product catalog
- Should show 20 products from database

5. **Test Vendor Dashboard:**
- Login as `vendor@solartech.com` / `password123`
- Should show real stats from database

---

## 🐛 Debugging Tips

### Check Network Tab
1. Open browser DevTools (F12)
2. Go to Network tab
3. Make a request
4. Look for API calls to `localhost:3001`
5. Check request/response

### Console Errors
```typescript
// Add error logging
try {
  const response = await api.products.getAll();
  console.log('Products loaded:', response);
} catch (error) {
  console.error('API Error:', error);
}
```

### CORS Issues
If you see CORS errors:
1. Check backend is running (`http://localhost:3001/health`)
2. Check `.env` has correct `CORS_ORIGIN`
3. Restart backend server

### Authentication Issues
```typescript
// Check token
console.log('Token:', localStorage.getItem('auth_token'));

// Clear token
localStorage.removeItem('auth_token');
```

---

## 📊 Migration Checklist

- [ ] Create `/lib/api.ts`
- [ ] Update `AuthContext.tsx` to use API
- [ ] Update Login component
- [ ] Update Signup component
- [ ] Update ProductCatalog to use `api.products.getAll()`
- [ ] Update VendorDashboard to use `api.vendors.getDashboard()`
- [ ] Update VendorProducts to use `api.products` methods
- [ ] Update VendorOrders to use `api.vendors.getOrders()`
- [ ] Update VendorCustomers to use `api.vendors.getCustomers()`
- [ ] Update OrderTracking to use `api.orders.getAll()`
- [ ] Update EscrowCheckout to use `api.escrow.create()`
- [ ] Update BuyerTransactionDashboard to use `api.escrow.getTransactions()`
- [ ] Update UserManagement (admin) to use `api.users` methods
- [ ] Test all features end-to-end
- [ ] Remove old mock data files (optional)

---

## 🎉 Done!

Your frontend is now connected to a real PostgreSQL database through your Express backend!

**You now have:**
- ✅ Real user authentication with JWT
- ✅ Real product data from database
- ✅ Real order tracking
- ✅ Real vendor dashboard with statistics
- ✅ Real escrow transactions
- ✅ Complete transparency - you control every query!

**Next:** Build more features, add more endpoints, scale your app! 🚀
