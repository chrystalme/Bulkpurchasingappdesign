import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../lib/api';
import type { User, UserRole } from '../../lib/types/auth.types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: true,
  error: null,
};

// Bootstrap auth from localStorage
export const bootstrapAuth = createAsyncThunk(
  'auth/bootstrapAuth',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        return { user: null, accessToken: null, refreshToken: null };
      }

      const response = await apiClient.auth.me();
      if (response.success && response.user) {
        const refreshToken = localStorage.getItem('refresh_token');
        return {
          user: response.user,
          accessToken: token,
          refreshToken: refreshToken || null,
        };
      } else {
        // Clear invalid token
        apiClient.auth.logout();
        return { user: null, accessToken: null, refreshToken: null };
      }
    } catch (error) {
      apiClient.auth.logout();
      return rejectWithValue((error as Error).message);
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.auth.login(email, password);
      if (!response.success || !response.user) {
        return rejectWithValue(response.error || 'Login failed');
      }

      const accessToken = response.accessToken || localStorage.getItem('auth_token');
      const refreshToken = response.refreshToken || localStorage.getItem('refresh_token');

      return {
        user: response.user,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const signup = createAsyncThunk(
  'auth/signup',
  async (
    {
      email,
      password,
      name,
      role = 'member',
    }: { email: string; password: string; name: string; role?: UserRole },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.auth.signup(email, password, name, role);
      if (!response.success || !response.user) {
        return rejectWithValue(response.error || 'Signup failed');
      }

      const accessToken = response.accessToken || localStorage.getItem('auth_token');
      const refreshToken = response.refreshToken || localStorage.getItem('refresh_token');

      return {
        user: response.user,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.error = null;
      // Clear localStorage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('userId');
    },
    updateCurrentUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
      localStorage.setItem('auth_token', action.payload);
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Bootstrap Auth
    builder
      .addCase(bootstrapAuth.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
      })
      .addCase(bootstrapAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
      });

    // Login
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        // Store tokens in localStorage
        if (action.payload.accessToken) {
          localStorage.setItem('auth_token', action.payload.accessToken);
        }
        if (action.payload.refreshToken) {
          localStorage.setItem('refresh_token', action.payload.refreshToken);
        }
        if (action.payload.user?.id) {
          localStorage.setItem('userId', action.payload.user.id);
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Signup
    builder
      .addCase(signup.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        // Store tokens in localStorage
        if (action.payload.accessToken) {
          localStorage.setItem('auth_token', action.payload.accessToken);
        }
        if (action.payload.refreshToken) {
          localStorage.setItem('refresh_token', action.payload.refreshToken);
        }
        if (action.payload.user?.id) {
          localStorage.setItem('userId', action.payload.user.id);
        }
      })
      .addCase(signup.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { logout, updateCurrentUser, setAccessToken, clearError } = authSlice.actions;
export default authSlice.reducer;
