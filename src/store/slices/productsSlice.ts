import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Product } from '../../lib/types';
import { apiClient } from '../../lib/api';

interface ProductsFilter {
  category?: string;
  vendor_id?: number;
}

interface ProductsState {
  products: Product[];
  filter: ProductsFilter;
  loading: boolean;
  error: string | null;
  categories: string[];
}

const initialState: ProductsState = {
  products: [],
  filter: {},
  loading: false,
  error: null,
  categories: [],
};

// Thunks
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (filter?: ProductsFilter, { rejectWithValue }) => {
    try {
      const response = await apiClient.products.getAll(filter);
      return response.data || [];
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchProductById = createAsyncThunk(
  'products/fetchProductById',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await apiClient.products.getById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchCategories = createAsyncThunk(
  'products/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.products.getCategories();
      return response.data || [];
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Slice
const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setFilter: (state, action) => {
      state.filter = action.payload;
    },
    clearProducts: (state) => {
      state.products = [];
      state.filter = {};
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Products
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Product By ID
    builder
      .addCase(fetchProductById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.products.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.products[index] = action.payload;
        } else {
          state.products.push(action.payload);
        }
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Categories
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilter, clearProducts, clearError } = productsSlice.actions;
export default productsSlice.reducer;
