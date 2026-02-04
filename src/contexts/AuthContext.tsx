import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, authService } from '../lib/auth';

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        // Verify user still exists and is active
        const dbUser = authService.getUserById(parsedUser.id);
        if (dbUser && dbUser.isActive) {
          setUser(dbUser);
        } else {
          localStorage.removeItem('currentUser');
        }
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('currentUser');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const result = authService.login(email, password);
    
    if (result.success && result.user) {
      setUser(result.user);
      localStorage.setItem('currentUser', JSON.stringify(result.user));
    }
    
    return { success: result.success, error: result.error };
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
    role: UserRole = 'member'
  ): Promise<{ success: boolean; error?: string }> => {
    const result = authService.signup(email, password, name, role);
    
    if (result.success && result.user) {
      setUser(result.user);
      localStorage.setItem('currentUser', JSON.stringify(result.user));
    }
    
    return { success: result.success, error: result.error };
  };

  const logout = () => {
    setUser(null);
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
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        updateCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
