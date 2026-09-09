import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  bootstrapAuth,
  login as loginThunk,
  signup as signupThunk,
  logout as logoutAction,
  updateCurrentUser as updateCurrentUserAction,
} from '../store/slices/authSlice';
import type { User, UserRole } from '../lib/types/auth.types';

/**
 * AuthContext - Thin wrapper around Redux auth slice
 * Provides backward compatibility for components using useAuth()
 * Socket connection is handled by Redux middleware
 */

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  signup: (
    email: string,
    password: string,
    name: string,
    role?: UserRole,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateCurrentUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const isLoading = useAppSelector(state => state.auth.isLoading);
  const error = useAppSelector(state => state.auth.error);

  /**
   * Bootstrap auth on mount
   */
  useEffect(() => {
    dispatch(bootstrapAuth());
  }, [dispatch]);

  const login = async (email: string, password: string) => {
    try {
      const result = await dispatch(loginThunk({ email, password })).unwrap();
      return { success: true };
    } catch (err) {
      return { success: false, error: err as string };
    }
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
    role: UserRole = 'member',
  ) => {
    try {
      const result = await dispatch(signupThunk({ email, password, name, role })).unwrap();
      return { success: true };
    } catch (err) {
      return { success: false, error: err as string };
    }
  };

  const logout = () => {
    dispatch(logoutAction());
  };

  const updateCurrentUser = (updates: Partial<User>) => {
    dispatch(updateCurrentUserAction(updates));
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      signup,
      logout,
      updateCurrentUser,
    }),
    [user, isLoading, dispatch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
