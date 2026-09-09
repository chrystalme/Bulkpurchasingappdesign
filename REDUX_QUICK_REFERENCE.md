# Redux Slices Quick Reference

## File Locations

```
src/store/
├── store.ts                    # Redux store configuration
├── hooks.ts                    # useAppDispatch, useAppSelector
├── index.ts                    # Central exports
├── slices/
│   ├── groupsSlice.ts         # Groups (existing)
│   ├── productsSlice.ts       # NEW - Products
│   ├── vendorsSlice.ts        # NEW - Vendors
│   ├── ordersSlice.ts         # NEW - Orders
│   ├── escrowSlice.ts         # NEW - Escrow
│   ├── usersSlice.ts          # NEW - Users
│   └── index.ts               # Slice exports
└── selectors/
    ├── productsSelectors.ts
    ├── vendorsSelectors.ts
    ├── ordersSelectors.ts
    ├── escrowSelectors.ts
    ├── usersSelectors.ts
    └── index.ts               # Selector exports
```

---

## Import Quick Reference

```typescript
// From @/store (recommended)
import {
  store,
  useAppDispatch,
  useAppSelector,
  // Thunks
  fetchProducts,
  fetchVendors,
  fetchOrders,
  fetchTransactions,
  fetchUsers,
  // Selectors
  selectProducts,
  selectVendors,
  selectOrders,
  selectTransactions,
  selectUsers,
} from '@/store';
```

---

## Thunks Quick Reference

| Slice | Thunk | Params | Returns |
|-------|-------|--------|---------|
| **Products** | fetchProducts | filter? | Product[] |
| | fetchProductById | id | Product |
| | fetchCategories | - | string[] |
| **Vendors** | fetchVendors | - | Vendor[] |
| | fetchVendorById | id | Vendor |
| | fetchVendorDashboard | vendorId | VendorStats |
| | fetchVendorOrders | vendorId | VendorOrder[] |
| | fetchVendorCustomers | vendorId | VendorCustomer[] |
| **Orders** | fetchOrders | - | Order[] |
| | fetchOrderById | id | Order |
| | createOrder | {items, groupId} | Order |
| | updateOrderStatus | {id, status} | Order |
| **Escrow** | fetchTransactions | type? | Transaction[] |
| | fetchTransactionById | id | Transaction |
| | createEscrowTransaction | {orderId, sellerId, amount, escrowFee} | Transaction |
| | updateTransactionStatus | {id, status, trackingId?, courier?} | Transaction |
| **Users** | fetchUsers | - | User[] |
| | fetchUserStats | - | UserStats |

---

## Selectors Quick Reference

### Products
- `selectProducts` → Product[]
- `selectProductsLoading` → boolean
- `selectProductsError` → string | null
- `selectProductsByVendor(id)` → Product[]
- `selectCategories` → string[]
- `selectProductFilter` → {category?, vendor_id?}

### Vendors
- `selectVendors` → Vendor[]
- `selectCurrentVendor` → Vendor | null
- `selectDashboard` → VendorStats | null
- `selectOrders` → VendorOrder[]
- `selectCustomers` → VendorCustomer[]
- `selectVendorsLoading` → boolean
- `selectVendorsError` → string | null

### Orders
- `selectOrders` → Order[]
- `selectCurrentOrder` → Order | null
- `selectOrdersLoading` → boolean
- `selectOrdersError` → string | null
- `selectOrdersPagination` → {page, total}

### Escrow
- `selectTransactions` → Transaction[]
- `selectTransactionById(id)` → Transaction | undefined
- `selectCurrentTransaction` → Transaction | null
- `selectEscrowLoading` → boolean
- `selectEscrowError` → string | null
- `selectEscrowFilter` → {type?}

### Users
- `selectUsers` → User[]
- `selectUserStats` → UserStats | null
- `selectUsersLoading` → boolean
- `selectUsersError` → string | null

---

## Common Usage Patterns

### Pattern 1: Fetch & Display Data
```typescript
function Component() {
  const dispatch = useAppDispatch();
  const data = useAppSelector(selectData);
  const loading = useAppSelector(selectDataLoading);

  useEffect(() => {
    dispatch(fetchData());
  }, [dispatch]);

  if (loading) return <Spinner />;
  return <List data={data} />;
}
```

### Pattern 2: Fetch by ID
```typescript
function DetailComponent() {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const item = useAppSelector(selectCurrentItem);

  useEffect(() => {
    dispatch(fetchItemById(id));
  }, [id, dispatch]);

  return <Detail item={item} />;
}
```

### Pattern 3: Create & Handle Response
```typescript
function FormComponent() {
  const dispatch = useAppDispatch();

  const handleSubmit = async (data) => {
    const result = await dispatch(createItem(data));
    if (result.payload) {
      // Success
      navigate(`/items/${result.payload.id}`);
    } else if (result.payload === undefined) {
      // Error from thunk
      console.error(result.error);
    }
  };

  return <Form onSubmit={handleSubmit} />;
}
```

### Pattern 4: Error Handling
```typescript
function ComponentWithErrorHandling() {
  const error = useAppSelector(selectError);

  if (error) {
    return <ErrorBanner message={error} />;
  }

  return <Content />;
}
```

### Pattern 5: Filter & Select
```typescript
function FilteredList() {
  const dispatch = useAppDispatch();
  const products = useAppSelector(selectProducts);
  const filter = useAppSelector(selectProductFilter);

  const handleFilterChange = (newFilter) => {
    dispatch(setFilter(newFilter));
    dispatch(fetchProducts(newFilter));
  };

  return <FilteredProducts products={products} onFilter={handleFilterChange} />;
}
```

---

## State Structure Reference

```typescript
// Products
{
  products: Product[];
  filter: { category?: string; vendor_id?: number };
  loading: boolean;
  error: string | null;
  categories: string[];
}

// Vendors
{
  vendors: Vendor[];
  currentVendor: Vendor | null;
  dashboard: VendorStats | null;
  orders: VendorOrder[];
  customers: VendorCustomer[];
  loading: boolean;
  error: string | null;
}

// Orders
{
  orders: Order[];
  currentOrder: Order | null;
  loading: boolean;
  error: string | null;
  pagination: { page: number; total: number };
}

// Escrow
{
  transactions: EscrowTransaction[];
  currentTransaction: EscrowTransaction | null;
  filter: { type?: 'seller' | 'buyer' | 'all' };
  loading: boolean;
  error: string | null;
}

// Users
{
  users: User[];
  stats: UserStats | null;
  loading: boolean;
  error: string | null;
}
```

---

## Actions Quick Reference

| Slice | Action | Payload |
|-------|--------|---------|
| **Products** | setFilter | {category?, vendor_id?} |
| | clearProducts | - |
| **Vendors** | setCurrentVendor | Vendor |
| | clearVendor | - |
| **Orders** | setCurrentOrder | Order |
| | clearOrders | - |
| **Escrow** | setFilter | {type?} |
| | setCurrentTransaction | Transaction |
| | clearTransactions | - |
| **Users** | clearUsers | - |

---

## Tips & Tricks

1. **Always use selectors** for accessing state - they're memoized and efficient
2. **Thunks automatically update state** - no need for manual dispatch of actions
3. **Error states** are automatically managed - check `selectDataError`
4. **Loading states** track async operations - use for spinners/skeletons
5. **Compose selectors** for complex derived state
6. **Use TypeScript types** - all responses are properly typed

---

## Testing

```typescript
// Example test
import { fetchProducts, selectProducts } from '@/store';

it('fetches products', async () => {
  const dispatch = useAppDispatch();
  await dispatch(fetchProducts());
  const products = store.getState().products.products;
  expect(products.length).toBeGreaterThan(0);
});
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Type errors | Ensure you're importing from `@/store` |
| State not updating | Check DevTools - verify thunk is dispatching |
| Infinite loops | Add proper dependencies to useEffect |
| Stale data | Call fetch thunk in useEffect with proper deps |
| Memory leaks | Cleanup selectors in useEffect return |

---

**Last Updated:** 2024
**Status:** Production Ready ✅
