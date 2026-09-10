import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Screen } from '../../App';

interface NavigationState {
  currentScreen: Screen;
  selectedGroupId: string | null;
  /** Product the vendor opened from the products list, for its detail/edit pages. */
  selectedProductId: string | null;
  restorationComplete: boolean;
  /** Where a guest was headed when they hit an auth-gated screen —
   *  restored after login so the flow continues where they left off. */
  pendingScreen: Screen | null;
  pendingGroupId: string | null;
}

const initialState: NavigationState = {
  currentScreen: 'welcome',
  selectedGroupId: null,
  selectedProductId: null,
  restorationComplete: false,
  pendingScreen: null,
  pendingGroupId: null,
};

const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    navigate: (
      state,
      action: PayloadAction<{
        screen: Screen;
        groupId?: string;
        productId?: string | null;
      }>
    ) => {
      state.currentScreen = action.payload.screen;
      if (action.payload.groupId !== undefined) {
        state.selectedGroupId = action.payload.groupId;
      }
      if (action.payload.productId !== undefined) {
        state.selectedProductId = action.payload.productId;
      }
    },
    setSelectedGroupId: (state, action: PayloadAction<string | null>) => {
      state.selectedGroupId = action.payload;
    },
    setSelectedProductId: (state, action: PayloadAction<string | null>) => {
      state.selectedProductId = action.payload;
    },
    setRestorationComplete: (state, action: PayloadAction<boolean>) => {
      state.restorationComplete = action.payload;
    },
    setPendingNavigation: (
      state,
      action: PayloadAction<{ screen: Screen; groupId?: string | null }>
    ) => {
      state.pendingScreen = action.payload.screen;
      state.pendingGroupId = action.payload.groupId ?? null;
    },
    clearPendingNavigation: (state) => {
      state.pendingScreen = null;
      state.pendingGroupId = null;
    },
    restoreFromPersistedState: (
      state,
      action: PayloadAction<{
        screen: Screen | null;
        groupId: string | null;
      }>
    ) => {
      if (action.payload.screen) {
        state.currentScreen = action.payload.screen;
      }
      if (action.payload.groupId) {
        state.selectedGroupId = action.payload.groupId;
      }
      state.restorationComplete = true;
    },
  },
});

export const {
  navigate,
  setSelectedGroupId,
  setSelectedProductId,
  setRestorationComplete,
  setPendingNavigation,
  clearPendingNavigation,
  restoreFromPersistedState,
} = navigationSlice.actions;

export default navigationSlice.reducer;
