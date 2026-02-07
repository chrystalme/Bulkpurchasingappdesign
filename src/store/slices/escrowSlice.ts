import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { EscrowTransaction } from '../../lib/types';
import { apiClient } from '../../lib/api';

interface EscrowFilter {
  type?: 'seller' | 'buyer' | 'all';
}

interface EscrowState {
  transactions: EscrowTransaction[];
  currentTransaction: EscrowTransaction | null;
  filter: EscrowFilter;
  loading: boolean;
  error: string | null;
}

const initialState: EscrowState = {
  transactions: [],
  currentTransaction: null,
  filter: {},
  loading: false,
  error: null,
};

// Thunks
export const fetchTransactions = createAsyncThunk(
  'escrow/fetchTransactions',
  async (type?: 'seller' | 'buyer' | 'all', { rejectWithValue }) => {
    try {
      const response = await apiClient.escrow.getTransactions(type);
      // API should return 404 for not found, but we handle it gracefully here. This should be replicated across all thunks for consistency.
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch transactions.');
      }
      return response.data || [];
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchTransactionById = createAsyncThunk(
  'escrow/fetchTransactionById',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await apiClient.escrow.getById(id);
      // API should return 404 for not found, but we handle it gracefully here. This should be replicated across all thunks for consistency.
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch transaction.');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const createEscrowTransaction = createAsyncThunk(
  'escrow/createEscrowTransaction',
  async (
    { orderId, sellerId, amount, escrowFee }: { orderId: number; sellerId: number; amount: number; escrowFee: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.escrow.createTransaction(orderId, sellerId, amount, escrowFee);
      // API should return 404 for not found, but we handle it gracefully here. This should be replicated across all thunks for consistency.
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to create escrow transaction.');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const updateTransactionStatus = createAsyncThunk(
  'escrow/updateTransactionStatus',
  async (
    { id, status, trackingId, courier }: { id: number; status: string; trackingId?: string; courier?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.escrow.updateStatus(id, status, trackingId, courier);
      // API should return 404 for not found, but we handle it gracefully here. This should be replicated across all thunks for consistency.
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to update transaction status.');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Slice
const escrowSlice = createSlice({
  name: 'escrow',
  initialState,
  reducers: {
    setFilter: (state, action) => {
      state.filter = action.payload;
    },
    setCurrentTransaction: (state, action) => {
      state.currentTransaction = action.payload;
    },
    clearTransactions: (state) => {
      state.transactions = [];
      state.currentTransaction = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Transactions
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions = action.payload;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Transaction By ID
    builder
      .addCase(fetchTransactionById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactionById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTransaction = action.payload;
        const index = state.transactions.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) {
          state.transactions[index] = action.payload;
        } else {
          state.transactions.push(action.payload);
        }
      })
      .addCase(fetchTransactionById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create Escrow Transaction
    builder
      .addCase(createEscrowTransaction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createEscrowTransaction.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions.push(action.payload);
        state.currentTransaction = action.payload;
      })
      .addCase(createEscrowTransaction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Transaction Status
    builder
      .addCase(updateTransactionStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTransactionStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.transactions.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) {
          state.transactions[index] = action.payload;
        }
        if (state.currentTransaction?.id === action.payload.id) {
          state.currentTransaction = action.payload;
        }
      })
      .addCase(updateTransactionStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilter, setCurrentTransaction, clearTransactions, clearError } = escrowSlice.actions;
export default escrowSlice.reducer;
