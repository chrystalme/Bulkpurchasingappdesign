import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient, CartAllocation, CartItemData } from '../../lib/api';

export type { CartAllocation, CartItemData };

export interface CartState {
  groupId: string | null;
  items: CartItemData[];
  loading: boolean;
  error: string | null;
}

const initialState: CartState = {
  groupId: null,
  items: [],
  loading: false,
  error: null,
};

// ============================================
// ASYNC THUNKS
// ============================================

export const fetchGroupCart = createAsyncThunk<
  { groupId: string; items: CartItemData[] },
  string,
  { rejectValue: string }
>('cart/fetchGroupCart', async (groupId, { rejectWithValue }) => {
  try {
    const response = await apiClient.cart.get(groupId);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.error || 'Failed to fetch cart');
  } catch (err: any) {
    return rejectWithValue(err.message || 'Failed to fetch cart');
  }
});

export const addToGroupCart = createAsyncThunk<
  { groupId: string; items: CartItemData[] },
  { groupId: string; productId: string; quantity: number; memberId?: string },
  { rejectValue: string }
>('cart/addToGroupCart', async ({ groupId, productId, quantity, memberId }, { rejectWithValue }) => {
  try {
    const response = await apiClient.cart.addItem(groupId, { productId, quantity, memberId });
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.error || 'Failed to add item to cart');
  } catch (err: any) {
    return rejectWithValue(err.message || 'Failed to add item to cart');
  }
});

export const updateCartQuantity = createAsyncThunk<
  { groupId: string; items: CartItemData[] },
  { groupId: string; productId: string; delta?: number; quantity?: number },
  { rejectValue: string }
>('cart/updateCartQuantity', async ({ groupId, productId, delta, quantity }, { rejectWithValue }) => {
  try {
    const response = await apiClient.cart.updateQuantity(groupId, productId, { delta, quantity });
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.error || 'Failed to update quantity');
  } catch (err: any) {
    return rejectWithValue(err.message || 'Failed to update quantity');
  }
});

export const updateCartAllocation = createAsyncThunk<
  { groupId: string; items: CartItemData[] },
  { groupId: string; productId: string; memberId: string; quantity?: number; paid?: boolean },
  { rejectValue: string }
>('cart/updateCartAllocation', async ({ groupId, productId, memberId, quantity, paid }, { rejectWithValue }) => {
  try {
    const response = await apiClient.cart.updateAllocation(groupId, productId, memberId, { quantity, paid });
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.error || 'Failed to update allocation');
  } catch (err: any) {
    return rejectWithValue(err.message || 'Failed to update allocation');
  }
});

export const setMemberCartPayment = createAsyncThunk<
  { groupId: string; items: CartItemData[] },
  { groupId: string; memberId: string; paid: boolean },
  { rejectValue: string }
>('cart/setMemberCartPayment', async ({ groupId, memberId, paid }, { rejectWithValue }) => {
  try {
    const response = await apiClient.cart.updatePayment(groupId, { memberId, paid });
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.error || 'Failed to update payment');
  } catch (err: any) {
    return rejectWithValue(err.message || 'Failed to update payment');
  }
});

export const markAllCartPaid = createAsyncThunk<
  { groupId: string; items: CartItemData[] },
  string,
  { rejectValue: string }
>('cart/markAllCartPaid', async (groupId, { rejectWithValue }) => {
  try {
    const response = await apiClient.cart.updatePayment(groupId, { markAll: true, paid: true });
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.error || 'Failed to mark all paid');
  } catch (err: any) {
    return rejectWithValue(err.message || 'Failed to mark all paid');
  }
});

export const removeCartItem = createAsyncThunk<
  { groupId: string; items: CartItemData[] },
  { groupId: string; productId: string },
  { rejectValue: string }
>('cart/removeCartItem', async ({ groupId, productId }, { rejectWithValue }) => {
  try {
    const response = await apiClient.cart.removeItem(groupId, productId);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.error || 'Failed to remove item');
  } catch (err: any) {
    return rejectWithValue(err.message || 'Failed to remove item');
  }
});

export const clearCartBackend = createAsyncThunk<
  { groupId: string },
  string,
  { rejectValue: string }
>('cart/clearCartBackend', async (groupId, { rejectWithValue }) => {
  try {
    const response = await apiClient.cart.clear(groupId);
    if (response.success) {
      return { groupId };
    }
    return rejectWithValue(response.error || 'Failed to clear cart');
  } catch (err: any) {
    return rejectWithValue(err.message || 'Failed to clear cart');
  }
});

// ============================================
// SLICE
// ============================================

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setCartGroup: (state, action: PayloadAction<string | null>) => {
      state.groupId = action.payload;
    },
    cartUpdated: (
      state,
      action: PayloadAction<{ groupId: string; items: CartItemData[] }>
    ) => {
      if (!state.groupId || state.groupId === action.payload.groupId) {
        state.groupId = action.payload.groupId;
        state.items = action.payload.items;
      }
    },
    cartCleared: (state, action: PayloadAction<{ groupId: string }>) => {
      if (state.groupId === action.payload.groupId) {
        state.items = [];
      }
    },
    // Synchronous reducers preserved for optimistic UI / backward compatibility
    addItem: (state, action: PayloadAction<CartItemData>) => {
      const existingItem = state.items.find(
        item => item.productId === action.payload.productId
      );
      if (existingItem) {
        existingItem.quantity = action.payload.quantity;
        existingItem.allocations = action.payload.allocations;
      } else {
        state.items.push(action.payload);
      }
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.productId !== action.payload);
    },
    updateQuantity: (
      state,
      action: PayloadAction<{ productId: string; delta: number }>
    ) => {
      const item = state.items.find(item => item.productId === action.payload.productId);
      if (item) {
        item.quantity = Math.max(1, item.quantity + action.payload.delta);
      }
    },
    updateAllocation: (
      state,
      action: PayloadAction<{
        productId: string;
        memberId: string;
        quantity: number;
      }>
    ) => {
      const item = state.items.find(item => item.productId === action.payload.productId);
      if (item) {
        const allocation = item.allocations.find(
          a => a.memberId === action.payload.memberId
        );
        if (allocation) {
          allocation.quantity = action.payload.quantity;
        } else {
          item.allocations.push({
            memberId: action.payload.memberId,
            quantity: action.payload.quantity,
            paid: false,
          });
        }
      }
    },
    toggleAllocationPaid: (
      state,
      action: PayloadAction<{ productId: string; memberId: string }>
    ) => {
      const item = state.items.find(i => i.productId === action.payload.productId);
      if (item) {
        const alloc = item.allocations.find(a => a.memberId === action.payload.memberId);
        if (alloc) {
          alloc.paid = !alloc.paid;
        }
      }
    },
    setAllocationPaid: (
      state,
      action: PayloadAction<{ productId: string; memberId: string; paid: boolean }>
    ) => {
      const item = state.items.find(i => i.productId === action.payload.productId);
      if (item) {
        const alloc = item.allocations.find(a => a.memberId === action.payload.memberId);
        if (alloc) {
          alloc.paid = action.payload.paid;
        }
      }
    },
    setMemberPaymentStatus: (
      state,
      action: PayloadAction<{ memberId: string; paid: boolean }>
    ) => {
      state.items.forEach(item => {
        const alloc = item.allocations.find(a => a.memberId === action.payload.memberId);
        if (alloc) {
          alloc.paid = action.payload.paid;
        }
      });
    },
    markAllPaid: (state) => {
      state.items.forEach(item => {
        item.allocations.forEach(alloc => {
          alloc.paid = true;
        });
      });
    },
    clearCart: (state) => {
      state.items = [];
      state.groupId = null;
    },
  },
  extraReducers: (builder) => {
    // fetchGroupCart
    builder.addCase(fetchGroupCart.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchGroupCart.fulfilled, (state, action) => {
      state.loading = false;
      state.groupId = action.payload.groupId;
      state.items = action.payload.items;
    });
    builder.addCase(fetchGroupCart.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Failed to fetch cart';
    });

    // addToGroupCart
    builder.addCase(addToGroupCart.fulfilled, (state, action) => {
      state.groupId = action.payload.groupId;
      state.items = action.payload.items;
    });

    // updateCartQuantity
    builder.addCase(updateCartQuantity.fulfilled, (state, action) => {
      state.groupId = action.payload.groupId;
      state.items = action.payload.items;
    });

    // updateCartAllocation
    builder.addCase(updateCartAllocation.fulfilled, (state, action) => {
      state.groupId = action.payload.groupId;
      state.items = action.payload.items;
    });

    // setMemberCartPayment
    builder.addCase(setMemberCartPayment.fulfilled, (state, action) => {
      state.groupId = action.payload.groupId;
      state.items = action.payload.items;
    });

    // markAllCartPaid
    builder.addCase(markAllCartPaid.fulfilled, (state, action) => {
      state.groupId = action.payload.groupId;
      state.items = action.payload.items;
    });

    // removeCartItem
    builder.addCase(removeCartItem.fulfilled, (state, action) => {
      state.groupId = action.payload.groupId;
      state.items = action.payload.items;
    });

    // clearCartBackend
    builder.addCase(clearCartBackend.fulfilled, (state, action) => {
      if (state.groupId === action.payload.groupId) {
        state.items = [];
      }
    });
  },
});

export const {
  setCartGroup,
  cartUpdated,
  cartCleared,
  addItem,
  removeItem,
  updateQuantity,
  updateAllocation,
  toggleAllocationPaid,
  setAllocationPaid,
  setMemberPaymentStatus,
  markAllPaid,
  clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;
