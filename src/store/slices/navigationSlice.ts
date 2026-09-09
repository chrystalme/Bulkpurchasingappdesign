import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Screen } from '../../App';

interface NavigationState {
  currentScreen: Screen;
  selectedGroupId: string | null;
  restorationComplete: boolean;
  /** Where a guest was headed when they hit an auth-gated screen —
   *  restored after login so the flow continues where they left off. */
  pendingScreen: Screen | null;
  pendingGroupId: string | null;
}

const initialState: NavigationState = {
  currentScreen: 'welcome',
  selectedGroupId: null,
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
      action: PayloadAction<{ screen: Screen; groupId?: string }>
    ) => {
      state.currentScreen = action.payload.screen;
      if (action.payload.groupId !== undefined) {
        state.selectedGroupId = action.payload.groupId;
      }
    },
    setSelectedGroupId: (state, action: PayloadAction<string | null>) => {
      state.selectedGroupId = action.payload;
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
  setRestorationComplete,
  setPendingNavigation,
  clearPendingNavigation,
  restoreFromPersistedState,
} = navigationSlice.actions;

export default navigationSlice.reducer;
