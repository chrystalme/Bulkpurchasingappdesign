import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, authService } from '../lib/auth';
import { authApi, ApiUser } from '../lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateCurrentUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function apiUserToUser(u: ApiUser): User {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role as UserRole,
    avatar: u.avatar,
    password: '********',
    createdAt: u.created_at || new Date().toISOString(),
    isActive: true,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('currentUser');

    if (storedToken) {
      // Verify token with server
      authApi.me()
        .then(({ user: apiUser }) => {
          const u = apiUserToUser(apiUser);
          setUser(u);
          localStorage.setItem('currentUser', JSON.stringify(u));
        })
        .catch(() => {
          // Token invalid — clear it
          localStorage.removeItem('token');
          localStorage.removeItem('currentUser');
        })
        .finally(() => setIsLoading(false));
    } else if (savedUser) {
      // Legacy in-memory session (no JWT)
      try {
        const parsedUser = JSON.parse(savedUser);
        const dbUser = authService.getUserById(parsedUser.id);
        if (dbUser && dbUser.isActive) setUser(dbUser);
        else localStorage.removeItem('currentUser');
      } catch {
        localStorage.removeItem('currentUser');
      }
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Try real API first
    try {
      const { token, user: apiUser } = await authApi.login(email, password);
      const u = apiUserToUser(apiUser);
      localStorage.setItem('token', token);
      localStorage.setItem('currentUser', JSON.stringify(u));
      setUser(u);
      return { success: true };
    } catch (apiErr) {
      // Fall back to in-memory mock when server is offline
      const result = authService.login(email, password);
      if (result.success && result.user) {
        setUser(result.user);
        localStorage.setItem('currentUser', JSON.stringify(result.user));
      }
      return { success: result.success, error: result.error };
    }
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
    role: UserRole = 'member'
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { token, user: apiUser } = await authApi.signup(name, email, password, role);
      const u = apiUserToUser(apiUser);
      localStorage.setItem('token', token);
      localStorage.setItem('currentUser', JSON.stringify(u));
      setUser(u);
      return { success: true };
    } catch (apiErr) {
      const result = authService.signup(email, password, name, role);
      if (result.success && result.user) {
        setUser(result.user);
        localStorage.setItem('currentUser', JSON.stringify(result.user));
      }
      return { success: result.success, error: result.error };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
  };

  const updateCurrentUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, signup, logout, updateCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
