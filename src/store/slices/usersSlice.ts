import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { User } from '../../lib/types';
import { apiClient } from '../../lib/api';

interface UserStats {
  total: number;
  active: number;
  superUsers: number;
  admins: number;
  vendors: number;
  members: number;
}

interface UsersState {
  users: User[];
  stats: UserStats | null;
  loading: boolean;
  error: string | null;
}

const initialState: UsersState = {
  users: [],
  stats: null,
  loading: false,
  error: null,
};

// Thunks
export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.users.getAll();
      return response.data || [];
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchUserStats = createAsyncThunk(
  'users/fetchUserStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.users.getStats();
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Slice
const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearUsers: (state) => {
      state.users = [];
      state.stats = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Users
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch User Stats
    builder
      .addCase(fetchUserStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchUserStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearUsers, clearError } = usersSlice.actions;
export default usersSlice.reducer;
