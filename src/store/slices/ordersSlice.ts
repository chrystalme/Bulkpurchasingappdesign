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

// Thunks
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.orders.getAll();
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
        state.orders = action.payload;
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
        state.currentOrder = action.payload;
        const index = state.orders.findIndex((o) => o.id === action.payload.id);
        if (index !== -1) {
          state.orders[index] = action.payload;
        } else {
          state.orders.push(action.payload);
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
        state.orders.push(action.payload);
        state.currentOrder = action.payload;
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
        const index = state.orders.findIndex((o) => o.id === action.payload.id);
        if (index !== -1) {
          state.orders[index] = action.payload;
        }
        if (state.currentOrder?.id === action.payload.id) {
          state.currentOrder = action.payload;
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
