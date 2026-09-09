# Redux Slices Documentation

This document describes the 5 Redux slices created for proper data hydration and centralized state management.

## Overview

All slices follow Redux Toolkit patterns with:
- **Thunks**: Async operations for API calls via `apiClient`
- **Actions**: Synchronous state mutations
- **Selectors**: Memoized state accessors
- **Loading/Error States**: Built-in for async operations

---

## 1. Products Slice

**File**: `src/store/slices/productsSlice.ts`

### State Structure
```typescript
{
  products: Product[];
  filter: { category?: string; vendor_id?: number };
  loading: boolean;
  error: string | null;
  categories: string[];
}
```

### Thunks
- `fetchProducts(filter?)` - Get all products with optional filters
- `fetchProductById(id)` - Get a specific product
- `fetchCategories()` - Get all product categories

### Actions
- `setFilter(filter)` - Update products filter
- `clearProducts()` - Clear all products and filters
- `clearError()` - Clear error state

### Selectors
```typescript
selectProducts(state) // All products
selectProductsLoading(state) // Loading state
selectProductsError(state) // Error message
selectProductsByVendor(vendorId) // Filter by vendor
selectCategories(state) // Available categories
selectProductFilter(state) // Current filter
```

### Usage Example
```typescript
// In component
const dispatch = useAppDispatch();
const products = useAppSelector(selectProducts);
const loading = useAppSelector(selectProductsLoading);

useEffect(() => {
  dispatch(fetchProducts({ category: 'electronics' }));
}, []);
```

---

## 2. Vendors Slice

**File**: `src/store/slices/vendorsSlice.ts`

### State Structure
```typescript
{
  vendors: Vendor[];
  currentVendor: Vendor | null;
  dashboard: VendorStats | null;
  orders: VendorOrder[];
  customers: VendorCustomer[];
  loading: boolean;
  error: string | null;
}
```

### Thunks
- `fetchVendors()` - Get all vendors
- `fetchVendorById(id)` - Get specific vendor details
- `fetchVendorDashboard(vendorId)` - Get vendor stats/dashboard
- `fetchVendorOrders(vendorId)` - Get vendor's orders
- `fetchVendorCustomers(vendorId)` - Get vendor's customers

### Actions
- `setCurrentVendor(vendor)` - Set active vendor
- `clearVendor()` - Clear vendor data
- `clearError()` - Clear error state

### Selectors
```typescript
selectVendors(state) // All vendors
selectCurrentVendor(state) // Active vendor
selectDashboard(state) // Vendor dashboard stats
selectOrders(state) // Vendor's orders
selectCustomers(state) // Vendor's customers
selectVendorsLoading(state) // Loading state
selectVendorsError(state) // Error message
```

---

## 3. Orders Slice

**File**: `src/store/slices/ordersSlice.ts`

### State Structure
```typescript
{
  orders: Order[];
  currentOrder: Order | null;
  loading: boolean;
  error: string | null;
  pagination: { page: number; total: number };
}
```

### Thunks
- `fetchOrders()` - Get all orders
- `fetchOrderById(id)` - Get specific order
- `createOrder({ items, groupId })` - Create new order
- `updateOrderStatus({ id, status })` - Update order status

### Actions
- `setCurrentOrder(order)` - Set active order
- `clearOrders()` - Clear all orders
- `clearError()` - Clear error state

### Selectors
```typescript
selectOrders(state) // All orders
selectCurrentOrder(state) // Active order
selectOrdersLoading(state) // Loading state
selectOrdersError(state) // Error message
selectOrdersPagination(state) // Pagination info
```

---

## 4. Escrow Slice

**File**: `src/store/slices/escrowSlice.ts`

### State Structure
```typescript
{
  transactions: EscrowTransaction[];
  currentTransaction: EscrowTransaction | null;
  filter: { type?: 'seller' | 'buyer' | 'all' };
  loading: boolean;
  error: string | null;
}
```

### Thunks
- `fetchTransactions(type?)` - Get escrow transactions (seller/buyer/all)
- `fetchTransactionById(id)` - Get specific transaction
- `createEscrowTransaction({ orderId, sellerId, amount, escrowFee })` - Create transaction
- `updateTransactionStatus({ id, status, trackingId?, courier? })` - Update status

### Actions
- `setFilter(filter)` - Set transaction filter
- `setCurrentTransaction(transaction)` - Set active transaction
- `clearTransactions()` - Clear all transactions
- `clearError()` - Clear error state

### Selectors
```typescript
selectTransactions(state) // All transactions
selectTransactionById(id) // Get by ID
selectCurrentTransaction(state) // Active transaction
selectEscrowLoading(state) // Loading state
selectEscrowError(state) // Error message
selectEscrowFilter(state) // Current filter
```

---

## 5. Users Slice

**File**: `src/store/slices/usersSlice.ts`

### State Structure
```typescript
{
  users: User[];
  stats: UserStats | null;
  loading: boolean;
  error: string | null;
}
```

### UserStats
```typescript
{
  total: number;
  active: number;
  superUsers: number;
  admins: number;
  vendors: number;
  members: number;
}
```

### Thunks
- `fetchUsers()` - Get all users (admin only)
- `fetchUserStats()` - Get user statistics

### Actions
- `clearUsers()` - Clear all users and stats
- `clearError()` - Clear error state

### Selectors
```typescript
selectUsers(state) // All users
selectUserStats(state) // User statistics
selectUsersLoading(state) // Loading state
selectUsersError(state) // Error message
```

---

## Integration Points

### Store Configuration
Updated in `src/store/store.ts`:
```typescript
export const store = configureStore({
  reducer: {
    groups: groupsReducer,
    products: productsReducer,
    vendors: vendorsReducer,
    orders: ordersReducer,
    escrow: escrowReducer,
    users: usersReducer,
  },
});
```

### Exports
- **Slices & Thunks**: `src/store/slices/index.ts`
- **Selectors**: `src/store/selectors/index.ts`
- **Main Store**: `src/store/index.ts`

### Usage in Components
```typescript
import { 
  useAppDispatch, 
  useAppSelector,
  fetchProducts,
  selectProducts,
  selectProductsLoading
} from '@/store';

function ProductList() {
  const dispatch = useAppDispatch();
  const products = useAppSelector(selectProducts);
  const loading = useAppSelector(selectProductsLoading);

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  if (loading) return <div>Loading...</div>;
  return (
    <ul>
      {products.map(p => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}
```

---

## API Client Integration

All thunks use `apiClient` for consistency:
- Products: `apiClient.products.*`
- Vendors: `apiClient.vendors.*`
- Orders: `apiClient.orders.*`
- Escrow: `apiClient.escrow.*`
- Users: `apiClient.users.*`

Error handling is centralized with proper error messages and rejection values.

---

## Benefits

✅ **Centralized State**: Single source of truth for all data
✅ **Type Safety**: Full TypeScript support with proper types
✅ **Consistency**: All slices follow same Redux Toolkit pattern
✅ **Reusability**: Selectors can be composed and memoized
✅ **Testability**: Pure reducers and selectors are easy to test
✅ **Performance**: Built-in optimization opportunities with Redux DevTools
