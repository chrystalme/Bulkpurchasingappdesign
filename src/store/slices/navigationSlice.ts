import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Screen } from '../../App';

interface NavigationState {
  currentScreen: Screen;
  selectedGroupId: string | null;
  restorationComplete: boolean;
}

const initialState: NavigationState = {
  currentScreen: 'welcome',
  selectedGroupId: null,
  restorationComplete: false,
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
  restoreFromPersistedState,
} = navigationSlice.actions;

export default navigationSlice.reducer;
