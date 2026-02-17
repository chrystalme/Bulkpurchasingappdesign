import { configureStore } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import groupsReducer from './slices/groupsSlice';
import productsReducer from './slices/productsSlice';
import vendorsReducer from './slices/vendorsSlice';
import ordersReducer from './slices/ordersSlice';
import escrowReducer from './slices/escrowSlice';
import usersReducer from './slices/usersSlice';
import chatReducer from './slices/chatSlice';
import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import navigationReducer from './slices/navigationSlice';
import { chatSocketMiddleware } from './middleware/chatSocketMiddleware';

// Persist config for auth (tokens and user)
const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['user', 'accessToken', 'refreshToken'],
};

// Persist config for navigation
const navigationPersistConfig = {
  key: 'navigation',
  storage,
  whitelist: ['currentScreen', 'selectedGroupId'],
};

// Persist config for cart
const cartPersistConfig = {
  key: 'cart',
  storage,
  whitelist: ['groupId', 'items'],
};

// Persist config for chat (only selected conversation)
const chatPersistConfig = {
  key: 'chat',
  storage,
  whitelist: ['selectedConversationId'],
};

export const store = configureStore({
  reducer: {
    groups: groupsReducer,
    products: productsReducer,
    vendors: vendorsReducer,
    orders: ordersReducer,
    escrow: escrowReducer,
    users: usersReducer,
    chat: persistReducer(chatPersistConfig, chatReducer),
    auth: persistReducer(authPersistConfig, authReducer),
    cart: persistReducer(cartPersistConfig, cartReducer),
    navigation: persistReducer(navigationPersistConfig, navigationReducer),
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(chatSocketMiddleware),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
