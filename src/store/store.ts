import { configureStore } from '@reduxjs/toolkit';
import groupsReducer from './slices/groupsSlice';
import productsReducer from './slices/productsSlice';
import vendorsReducer from './slices/vendorsSlice';
import ordersReducer from './slices/ordersSlice';
import escrowReducer from './slices/escrowSlice';
import usersReducer from './slices/usersSlice';

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

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
