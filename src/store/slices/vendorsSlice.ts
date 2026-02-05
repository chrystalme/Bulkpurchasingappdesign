import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Vendor, VendorStats, VendorOrder, VendorCustomer } from '../../lib/types';
import { apiClient } from '../../lib/api';

interface VendorsState {
  vendors: Vendor[];
  currentVendor: Vendor | null;
  dashboard: VendorStats | null;
  products: any[];
  orders: VendorOrder[];
  customers: VendorCustomer[];
  loading: boolean;
  error: string | null;
}

const initialState: VendorsState = {
  vendors: [],
  currentVendor: null,
  dashboard: null,
  products: [],
  orders: [],
  customers: [],
  loading: false,
  error: null,
};

// Thunks
export const fetchVendors = createAsyncThunk(
  'vendors/fetchVendors',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.vendors.getAll();
      return response.data || [];
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchVendorById = createAsyncThunk(
  'vendors/fetchVendorById',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await apiClient.vendors.getById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchVendorDashboard = createAsyncThunk(
  'vendors/fetchVendorDashboard',
  async (vendorId: number, { rejectWithValue }) => {
    try {
      const response = await apiClient.vendors.getDashboard(vendorId);
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchVendorOrders = createAsyncThunk(
  'vendors/fetchVendorOrders',
  async (vendorId: number, { rejectWithValue }) => {
    try {
      const response = await apiClient.vendors.getOrders(vendorId);
      return response.data || [];
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchVendorProducts = createAsyncThunk(
  'vendors/fetchVendorProducts',
  async (vendorId: number, { rejectWithValue }) => {
    try {
      const response = await apiClient.products.getAll({ vendor_id: vendorId });
      return response.data || [];
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchVendorCustomers = createAsyncThunk(
  'vendors/fetchVendorCustomers',
  async (vendorId: number, { rejectWithValue }) => {
    try {
      const response = await apiClient.vendors.getCustomers(vendorId);
      return response.data || [];
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Slice
const vendorsSlice = createSlice({
  name: 'vendors',
  initialState,
  reducers: {
    setCurrentVendor: (state, action) => {
      state.currentVendor = action.payload;
    },
    clearVendor: (state) => {
      state.currentVendor = null;
      state.dashboard = null;
      state.products = [];
      state.orders = [];
      state.customers = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Vendors
    builder
      .addCase(fetchVendors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVendors.fulfilled, (state, action) => {
        state.loading = false;
        state.vendors = action.payload;
      })
      .addCase(fetchVendors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Vendor By ID
    builder
      .addCase(fetchVendorById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVendorById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentVendor = action.payload;
      })
      .addCase(fetchVendorById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Vendor Dashboard
    builder
      .addCase(fetchVendorDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVendorDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboard = action.payload;
      })
      .addCase(fetchVendorDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Vendor Products
    builder
      .addCase(fetchVendorProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVendorProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchVendorProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Vendor Orders
    builder
      .addCase(fetchVendorOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVendorOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
      })
      .addCase(fetchVendorOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Vendor Customers
    builder
      .addCase(fetchVendorCustomers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVendorCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.customers = action.payload;
      })
      .addCase(fetchVendorCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setCurrentVendor, clearVendor, clearError } = vendorsSlice.actions;
export default vendorsSlice.reducer;
