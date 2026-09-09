import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Order } from '../../lib/types';
import { apiClient } from '../../lib/api';

interface OrdersPagination {
  page: number;
  total: number;
}

interface OrdersState {
  orders: Order[];
  currentOrder: Order | null;
  loading: boolean;
  error: string | null;
  pagination: OrdersPagination;
}

const initialState: OrdersState = {
  orders: [],
  currentOrder: null,
  loading: false,
  error: null,
  pagination: { page: 1, total: 0 },
};

// Backend returns raw snake_case columns (o.*). Map them to the
// camelCase Order contract the UI is typed against.
const normalizeOrder = (row: any): Order => ({
  id: row.id,
  groupId: row.group_id ? String(row.group_id) : '',
  status: row.status,
  items: row.items || [],
  total: parseFloat(row.total_amount) || 0,
  createdAt: row.created_at,
  estimatedDelivery: row.estimated_delivery,
});

// Thunks
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.orders.getAll();
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch orders.');
      }
      return response.data || [];
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchOrderById = createAsyncThunk(
  'orders/fetchOrderById',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await apiClient.orders.getById(id);
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch order.');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async ({ items, groupId }: { items: any[]; groupId: number }, { rejectWithValue }) => {
    try {
      const response = await apiClient.orders.create(items, groupId);
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to create order.');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const updateOrderStatus = createAsyncThunk(
  'orders/updateOrderStatus',
  async ({ id, status }: { id: number; status: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.orders.updateStatus(id, status);
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to update order status.');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Slice
const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setCurrentOrder: (state, action) => {
      state.currentOrder = action.payload;
    },
    clearOrders: (state) => {
      state.orders = [];
      state.currentOrder = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Orders
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = (action.payload as any[]).map(normalizeOrder);
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Order By ID
    builder
      .addCase(fetchOrderById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.loading = false;
        const order = normalizeOrder(action.payload);
        state.currentOrder = order;
        const index = state.orders.findIndex((o) => o.id === order.id);
        if (index !== -1) {
          state.orders[index] = order;
        } else {
          state.orders.push(order);
        }
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create Order
    builder
      .addCase(createOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.loading = false;
        const order = normalizeOrder(action.payload);
        state.orders = [order, ...state.orders];
        state.currentOrder = order;
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Order Status
    builder
      .addCase(updateOrderStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        state.loading = false;
        const order = normalizeOrder(action.payload);
        const index = state.orders.findIndex((o) => o.id === order.id);
        if (index !== -1) {
          state.orders[index] = order;
        }
        if (state.currentOrder?.id === order.id) {
          state.currentOrder = order;
        }
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setCurrentOrder, clearOrders, clearError } = ordersSlice.actions;
export default ordersSlice.reducer;
