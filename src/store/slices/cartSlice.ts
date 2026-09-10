import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CartAllocation {
  memberId: string;
  quantity: number;
  paid?: boolean;
}

export interface CartItemData {
  productId: string;
  quantity: number;
  allocations: CartAllocation[];
}

interface CartState {
  groupId: string | null;
  items: CartItemData[];
}

const initialState: CartState = {
  groupId: null,
  items: [],
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setCartGroup: (state, action: PayloadAction<string | null>) => {
      state.groupId = action.payload;
    },
    addItem: (state, action: PayloadAction<CartItemData>) => {
      const existingItem = state.items.find(
        item => item.productId === action.payload.productId
      );
      if (existingItem) {
        // Update quantity and allocations
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
});

export const {
  setCartGroup,
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
