import type { UserRole, User } from './types';

// Mock user database (mutable)
let users: User[] = [
  {
    id: 'user-1',
    email: 'super@admin.com',
    password: 'super123',
    name: 'Super User',
    role: 'superUser',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Super',
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true,
  },
  {
    id: 'user-2',
    email: 'admin@savetogether.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
    createdAt: '2024-01-15T00:00:00Z',
    isActive: true,
  },
  {
    id: 'user-3',
    email: 'vendor@solartech.com',
    password: 'vendor123',
    name: 'SolarTech Distributors',
    role: 'vendor',
    vendorId: '5',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=STD',
    createdAt: '2024-02-01T00:00:00Z',
    isActive: true,
  },
  {
    id: 'user-4',
    email: 'vendor@powercell.com',
    password: 'vendor123',
    name: 'PowerCell Solutions',
    role: 'vendor',
    vendorId: '4',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=PCS',
    createdAt: '2024-02-10T00:00:00Z',
    isActive: true,
  },
  {
    id: 'user-5',
    email: 'afam@example.com',
    password: 'member123',
    name: 'Afam',
    role: 'member',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Afam',
    createdAt: '2024-03-01T00:00:00Z',
    isActive: true,
    trustScore: 92,
  },
  {
    id: 'user-6',
    email: 'chioma@example.com',
    password: 'member123',
    name: 'Chioma',
    role: 'member',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chioma',
    createdAt: '2024-03-05T00:00:00Z',
    isActive: true,
    trustScore: 88,
  },
];

// Authentication functions
export const authService = {
  // Get all users
  getAllUsers: (): User[] => {
    return users.map(u => ({ ...u, password: '********' })); // Hide passwords
  },

  // Get user by ID
  getUserById: (id: string): User | undefined => {
    const user = users.find(u => u.id === id);
    if (user) {
      return { ...user, password: '********' };
    }
    return undefined;
  },

  // Login
  login: (email: string, password: string): { success: boolean; user?: User; error?: string } => {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!user.isActive) {
      return { success: false, error: 'Account is deactivated' };
    }

    if (user.password !== password) {
      return { success: false, error: 'Invalid password' };
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return { success: true, user: { ...userWithoutPassword, password: '********' } };
  },

  // Sign up
  signup: (
    email: string,
    password: string,
    name: string,
    role: UserRole = 'member'
  ): { success: boolean; user?: User; error?: string } => {
    // Check if email already exists
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: 'Email already exists' };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Invalid email format' };
    }

    // Validate password length
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    // Create new user
    const newUser: User = {
      id: `user-${Date.now()}`,
      email,
      password,
      name,
      role,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
      createdAt: new Date().toISOString(),
      isActive: true,
      ...(role === 'member' && { trustScore: 0 }),
    };

    users.push(newUser);

    const { password: _, ...userWithoutPassword } = newUser;
    return { success: true, user: { ...userWithoutPassword, password: '********' } };
  },

  // Create user (admin function)
  createUser: (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    vendorId?: string
  ): { success: boolean; user?: User; error?: string } => {
    // Check if email already exists
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: 'Email already exists' };
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      email,
      password,
      name,
      role,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
      createdAt: new Date().toISOString(),
      isActive: true,
      ...(vendorId && { vendorId }),
      ...(role === 'member' && { trustScore: 0 }),
    };

    users.push(newUser);

    const { password: _, ...userWithoutPassword } = newUser;
    return { success: true, user: { ...userWithoutPassword, password: '********' } };
  },

  // Update user
  updateUser: (
    id: string,
    updates: Partial<Omit<User, 'id' | 'createdAt'>>
  ): { success: boolean; user?: User; error?: string } => {
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      return { success: false, error: 'User not found' };
    }

    users[userIndex] = { ...users[userIndex], ...updates };

    const { password: _, ...userWithoutPassword } = users[userIndex];
    return { success: true, user: { ...userWithoutPassword, password: '********' } };
  },

  // Delete user
  deleteUser: (id: string): { success: boolean; error?: string } => {
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      return { success: false, error: 'User not found' };
    }

    // Prevent deleting the last superUser
    const user = users[userIndex];
    if (user.role === 'superUser') {
      const superUserCount = users.filter(u => u.role === 'superUser').length;
      if (superUserCount <= 1) {
        return { success: false, error: 'Cannot delete the last super user' };
      }
    }

    users.splice(userIndex, 1);
    return { success: true };
  },

  // Deactivate user (soft delete)
  deactivateUser: (id: string): { success: boolean; error?: string } => {
    const result = authService.updateUser(id, { isActive: false });
    return { success: result.success, error: result.error };
  },

  // Activate user
  activateUser: (id: string): { success: boolean; error?: string } => {
    const result = authService.updateUser(id, { isActive: true });
    return { success: result.success, error: result.error };
  },

  // Get users by role
  getUsersByRole: (role: UserRole): User[] => {
    return users
      .filter(u => u.role === role)
      .map(u => ({ ...u, password: '********' }));
  },

  // Get active users count
  getActiveUsersCount: (): number => {
    return users.filter(u => u.isActive).length;
  },

  // Get stats
  getStats: () => {
    return {
      total: users.length,
      active: users.filter(u => u.isActive).length,
      superUsers: users.filter(u => u.role === 'superUser').length,
      admins: users.filter(u => u.role === 'admin').length,
      vendors: users.filter(u => u.role === 'vendor').length,
      members: users.filter(u => u.role === 'member').length,
    };
  },
};

// Role-based permissions
export const permissions = {
  canManageUsers: (role: UserRole): boolean => {
    return role === 'superUser' || role === 'admin';
  },

  canDeleteUsers: (role: UserRole): boolean => {
    return role === 'superUser';
  },

  canAccessVendorDashboard: (role: UserRole): boolean => {
    return role === 'vendor' || role === 'superUser' || role === 'admin';
  },

  canManageProducts: (role: UserRole): boolean => {
    return role === 'vendor' || role === 'superUser';
  },

  canAccessAdminPanel: (role: UserRole): boolean => {
    return role === 'superUser' || role === 'admin';
  },
};
