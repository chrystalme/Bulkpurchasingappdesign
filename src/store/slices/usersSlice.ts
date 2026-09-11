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
  /** True while a create/update/delete/activate mutation is in flight. */
  saving: boolean;
}

const initialState: UsersState = {
  users: [],
  stats: null,
  loading: false,
  error: null,
  saving: false,
};

// Thunks
export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.users.getAll();
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch users.');
      }
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
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch user stats.');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const createUser = createAsyncThunk(
  'users/createUser',
  async (
    payload: {
      email: string;
      password: string;
      name: string;
      role: User['role'];
      vendorId?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.users.create(payload);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to create user.');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const updateUser = createAsyncThunk(
  'users/updateUser',
  async (
    { id, changes }: { id: string; changes: Partial<User> & { password?: string } },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.users.update(id, changes);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to update user.');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const deleteUser = createAsyncThunk(
  'users/deleteUser',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.users.delete(id);
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to delete user.');
      }
      return id;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const setUserActive = createAsyncThunk(
  'users/setUserActive',
  async (
    { id, isActive }: { id: string; isActive: boolean },
    { rejectWithValue }
  ) => {
    try {
      const response = isActive
        ? await apiClient.users.activate(id)
        : await apiClient.users.deactivate(id);
      if (!response.success || !response.data) {
        return rejectWithValue(
          response.error ||
            `Failed to ${isActive ? 'activate' : 'deactivate'} user.`
        );
      }
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

    // Mutations — keep the list in sync locally so the page doesn't need a
    // full refetch to reflect the change the admin just made.
    const upsertUser = (state: UsersState, user: User) => {
      const index = state.users.findIndex((u) => u.id === user.id);
      if (index !== -1) {
        state.users[index] = user;
      } else {
        state.users.unshift(user);
      }
    };

    builder
      .addCase(createUser.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.saving = false;
        upsertUser(state, action.payload);
      })
      .addCase(createUser.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(updateUser.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.saving = false;
        upsertUser(state, action.payload);
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(deleteUser.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.saving = false;
        state.users = state.users.filter((u) => u.id !== action.payload);
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(setUserActive.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(setUserActive.fulfilled, (state, action) => {
        state.saving = false;
        upsertUser(state, action.payload);
      })
      .addCase(setUserActive.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearUsers, clearError } = usersSlice.actions;
export default usersSlice.reducer;
