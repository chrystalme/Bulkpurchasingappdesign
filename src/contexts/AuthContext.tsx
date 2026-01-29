// import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// import {  authService } from '../lib/auth';
// import { User, UserRole } from '../lib/types';

// interface AuthContextType {
//   user: User | null;
//   isAuthenticated: boolean;
//   isLoading: boolean;
//   login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
//   signup: (email: string, password: string, name: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>;
//   logout: () => void;
//   updateCurrentUser: (updates: Partial<User>) => void;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export function AuthProvider({ children }: { children: ReactNode }) {
//   const [user, setUser] = useState<User | null>(null);
//   const [isLoading, setIsLoading] = useState(true);

//   // Load user from localStorage on mount
//   useEffect(() => {
//     const savedUser = localStorage.getItem('currentUser');
//     if (savedUser) {
//       try {
//         const parsedUser = JSON.parse(savedUser);
//         // Verify user still exists and is active
//         const dbUser = authService.getUserById(parsedUser.id);
//         if (dbUser && dbUser.isActive) {
//           setUser(dbUser);
//         } else {
//           localStorage.removeItem('currentUser');
//         }
//       } catch (error) {
//         console.error('Error parsing saved user:', error);
//         localStorage.removeItem('currentUser');
//       }
//     }
//     setIsLoading(false);
//   }, []);

//   const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
//     const result = authService.login(email, password);
    
//     if (result.success && result.user) {
//       setUser(result.user);
//       localStorage.setItem('currentUser', JSON.stringify(result.user));
//     }
    
//     return { success: result.success, error: result.error };
//   };

//   const signup = async (
//     email: string,
//     password: string,
//     name: string,
//     role: UserRole = 'member'
//   ): Promise<{ success: boolean; error?: string }> => {
//     const result = authService.signup(email, password, name, role);
    
//     if (result.success && result.user) {
//       setUser(result.user);
//       localStorage.setItem('currentUser', JSON.stringify(result.user));
//     }
    
//     return { success: result.success, error: result.error };
//   };

//   const logout = () => {
//     setUser(null);
//     localStorage.removeItem('currentUser');
//   };

//   const updateCurrentUser = (updates: Partial<User>) => {
//     if (user) {
//       const updatedUser = { ...user, ...updates };
//       setUser(updatedUser);
//       localStorage.setItem('currentUser', JSON.stringify(updatedUser));
//     }
//   };

//   return (
//     <AuthContext.Provider
//       value={{
//         user,
//         isAuthenticated: !!user,
//         isLoading,
//         login,
//         signup,
//         logout,
//         updateCurrentUser,
//       }}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// }

// export function useAuth() {
//   const context = useContext(AuthContext);
//   if (context === undefined) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// }

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { apiClient } from '../lib/api';
import type { User, UserRole } from '../lib/types/auth.types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signup: (
    email: string,
    password: string,
    name: string,
    role?: UserRole
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateCurrentUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Rehydrate session on app load
   * Token presence is validated server-side via /auth/me
   */
  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          return;
        }

        const response = await apiClient.auth.me();
        if (response.success && response.user) {
          setUser(response.user);
        } else {
          console.error('Auth bootstrap failed: response was unsuccessful or contained no data.', response);
          localStorage.removeItem('auth_token');
          setUser(null);
        }
      } catch (error) {
        console.error('Auth bootstrap failed with an error:', error);
        localStorage.removeItem('auth_token');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.auth.login(email, password);

      if (!response.success || !response.user) {
        return { success: false, error: response.error || 'Login failed' };
      }

      setUser(response.user);
      // Token is persisted by apiClient.auth.login() in src/lib/api.ts
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
    role: UserRole = 'member'
  ) => {
    try {
      const response = await apiClient.auth.signup(
        email,
        password,
        name,
        role
      );

      if (!response.success || !response.user) {
        return { success: false, error: response.error || 'Signup failed' };
      }

      setUser(response.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  };

  const logout = () => {
    apiClient.auth.logout();
    setUser(null);
  };

  /**
   * Local optimistic update.
   * Use only for UI sync, not as a persistence mechanism.
   */
  const updateCurrentUser = (updates: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
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
    [user, isLoading]
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
