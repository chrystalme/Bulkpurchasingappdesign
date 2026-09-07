# Authentication System Guide

## Overview
This app now has a complete local authentication system with role-based access control (RBAC). User data is stored in memory and persists across page refreshes using localStorage.

## User Roles

### 1. **Super User** (superUser)
- Full system access
- Can create, edit, and delete ALL users (including admins and other super users)
- Can access vendor dashboard
- Can access admin panel
- Demo login: `super@admin.com` / `super123`

### 2. **Admin** (admin)
- Can manage vendor and member users (cannot create super users)
- Can access admin panel for user management
- Can moderate content
- Demo login: `admin@savetogether.com` / `admin123`

### 3. **Vendor** (vendor)
- Can create and manage products
- Can view and process orders
- Can manage customer relationships
- Access to vendor dashboard
- Demo logins:
  - `vendor@solartech.com` / `vendor123`
  - `vendor@powercell.com` / `vendor123`

### 4. **Member** (member)
- Standard user role
- Can join or create purchasing groups
- Can browse and purchase products
- Can chat with vendors
- Can track orders and leave reviews
- Demo login: `afam@example.com` / `member123`

## Features

### Authentication
- ✅ **Login/Logout**: Secure authentication with email and password
- ✅ **Sign Up**: New users can register as members
- ✅ **Session Persistence**: User session persists across page refreshes
- ✅ **Password Protection**: Passwords are hidden in UI (in production, should be hashed)

### User Management (Admin/SuperUser Only)
- ✅ **View All Users**: See complete user list with filtering by role
- ✅ **Create Users**: Add new users with any role
- ✅ **Edit Users**: Update user information
- ✅ **Delete Users**: Permanently remove users (SuperUser only)
- ✅ **Activate/Deactivate**: Soft delete users without removing them
- ✅ **User Statistics**: View user counts by role and status

### Role-Based Access Control
```typescript
// Check permissions in any component
import { useAuth } from '../contexts/AuthContext';
import { permissions } from '../lib/auth';

const { user } = useAuth();

// Check if user can manage users
if (permissions.canManageUsers(user.role)) {
  // Show admin features
}

// Check if user can access vendor dashboard
if (permissions.canAccessVendorDashboard(user.role)) {
  // Show vendor features
}
```

## Data Structure

### User Object
```typescript
{
  id: string;
  email: string;
  password: string; // Hidden in UI
  name: string;
  role: 'superUser' | 'admin' | 'vendor' | 'member';
  avatar?: string;
  vendorId?: string; // For vendor users
  createdAt: string;
  isActive: boolean;
  trustScore?: number; // For member users
}
```

## API Functions

### Auth Service (`/lib/auth.ts`)

```typescript
// Login
authService.login(email, password);

// Sign up
authService.signup(email, password, name, role);

// Create user (admin function)
authService.createUser(email, password, name, role, vendorId?);

// Update user
authService.updateUser(userId, updates);

// Delete user
authService.deleteUser(userId);

// Deactivate/Activate
authService.deactivateUser(userId);
authService.activateUser(userId);

// Get users
authService.getAllUsers();
authService.getUserById(userId);
authService.getUsersByRole(role);

// Get stats
authService.getStats();
```

### Auth Context (`/contexts/AuthContext.tsx`)

```typescript
const { 
  user,              // Current user object
  isAuthenticated,   // Boolean auth status
  isLoading,         // Loading state
  login,             // Login function
  signup,            // Signup function
  logout,            // Logout function
  updateCurrentUser  // Update current user
} = useAuth();
```

## Screens

### Public Screens (No Auth Required)
- Welcome Screen
- Login Screen
- Signup Screen

### Member Screens
- Home Dashboard
- Product Catalog
- Group Management
- Order Tracking
- Profile

### Vendor Screens (vendor, admin, superUser)
- Vendor Dashboard
- Product Management
- Order Management
- Customer Management

### Admin Screens (admin, superUser)
- User Management
- Create User

## Testing the System

### 1. Test Different Roles
- Log out and log in with different demo accounts
- Observe different features available to each role
- Check the Profile menu to see role-specific options

### 2. Test User Management
- Log in as admin or super user
- Go to Profile → User Management
- Create, edit, deactivate users
- Test role filtering

### 3. Test Permissions
- Log in as a member
- Notice that admin/vendor options are hidden
- Log in as vendor to see vendor dashboard
- Log in as admin to see user management

## Security Notes

⚠️ **Important**: This is a local authentication system for development/demo purposes.

For production, you should:
1. Hash passwords using bcrypt or similar
2. Implement proper session management with JWT tokens
3. Use a backend API for authentication
4. Implement rate limiting for login attempts
5. Add email verification
6. Add password reset functionality
7. Use HTTPS in production
8. Add CSRF protection
9. Implement proper audit logging

## Extending the System

### Add New Permission
```typescript
// In /lib/auth.ts permissions object
canDoSomething: (role: UserRole): boolean => {
  return role === 'superUser' || role === 'admin';
}
```

### Add New Role
```typescript
// Update UserRole type
export type UserRole = 'superUser' | 'admin' | 'vendor' | 'member' | 'newRole';

// Add default users
// Update permissions
// Update UI role badges
```

### Add User Fields
```typescript
// Update User interface
export interface User {
  // ... existing fields
  phone?: string;
  address?: string;
  // ... new fields
}
```

## File Structure

```
/lib/auth.ts                          # Auth service & permissions
/contexts/AuthContext.tsx             # Auth context provider
/components/auth/Login.tsx            # Login screen
/components/auth/Signup.tsx           # Signup screen
/components/admin/UserManagement.tsx  # User management screen
/components/admin/CreateUser.tsx      # Create user screen
/App.tsx                              # Root with AuthProvider
```

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super User | super@admin.com | super123 |
| Admin | admin@savetogether.com | admin123 |
| Vendor (SolarTech) | vendor@solartech.com | vendor123 |
| Vendor (PowerCell) | vendor@powercell.com | vendor123 |
| Member | afam@example.com | member123 |
| Member | chioma@example.com | member123 |
