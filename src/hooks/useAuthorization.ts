import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as authLib from '../lib/authorization';
import type { GroupRole } from '../lib/authorization';

/**
 * useAuthorization Hook
 * 
 * Provides all authorization checks wrapped with current user context
 * Use this in components to get user permissions
 * 
 * Example:
 *   const { canManageUsers, isSuperUser } = useAuthorization();
 *   if (canManageUsers()) { ... }
 */
export const useAuthorization = () => {
  const { user } = useAuth();

  const permissions = useMemo(() => ({
    // ============================================
    // APP-LEVEL CHECKS
    // ============================================
    
    isSuperUser: () => authLib.isSuperUser(user),
    isAppAdmin: () => authLib.isAppAdmin(user),
    isVendor: () => authLib.isVendor(user),
    isMember: () => authLib.isMember(user),
    isAuthenticated: () => authLib.isAuthenticated(user),
    
    // User Management
    canManageUsers: () => authLib.canManageUsers(user),
    canDeleteUsers: () => authLib.canDeleteUsers(user),
    canDeactivateUser: (targetUserRole: string) => 
      authLib.canDeactivateUser(user, targetUserRole as any),
    canActivateUser: (targetUserRole: string) => 
      authLib.canActivateUser(user, targetUserRole as any),
    canEditUser: (targetUserRole: string) => 
      authLib.canEditUser(user, targetUserRole as any),
    
    // ============================================
    // VENDOR CHECKS
    // ============================================
    
    canAccessVendorDashboard: () => authLib.canAccessVendorDashboard(user),
    canManageVendor: (vendorId?: string) => 
      authLib.canManageVendor(user, vendorId),
    canAddProduct: () => authLib.canAddProduct(user),
    canEditProduct: (productVendorId?: string) => 
      authLib.canEditProduct(user, productVendorId),
    
    // ============================================
    // GROUP CHECKS
    // ============================================
    
    canCreateGroup: () => authLib.canCreateGroup(user),
    canJoinGroup: () => authLib.canJoinGroup(user),
    
    // Resource ownership
    ownsResourceOrIsAdmin: (resourceOwnerId: string) =>
      authLib.ownsResourceOrIsAdmin(user, resourceOwnerId),
    
    // Get all permissions at once
    getAll: () => authLib.getUserPermissions(user),
    
    // Current user
    user,
  }), [user]);

  return permissions;
};

/**
 * useGroupRole Hook
 * 
 * Gets the current user's role within a specific group
 * Returns both the role and permission checks for that role
 * 
 * Example:
 *   const { role, canManageGroup, canSendToVendor } = useGroupRole(groupId);
 */
export const useGroupRole = (groupId: string | null | undefined) => {
  const { user } = useAuth();
  
  // TODO: Fetch user's group role from backend
  // For now, this is a placeholder - will be implemented when API is called
  const userGroupRole: GroupRole | null = null;
  const loading = false;

  const permissions = useMemo(() => ({
    // Current role
    role: userGroupRole,
    loading,
    
    // Role checks
    isGroupAdmin: () => authLib.isGroupAdmin(userGroupRole),
    isGroupMember: () => authLib.isGroupMember(userGroupRole),
    
    // Management
    canManageGroup: () => authLib.canManageGroup(user, userGroupRole),
    canAddMember: () => authLib.canAddGroupMember(userGroupRole),
    canRemoveMember: () => authLib.canRemoveGroupMember(userGroupRole),
    canEditGroup: () => authLib.canEditGroup(userGroupRole),
    
    // Chat
    canViewGroupChat: () => authLib.canViewGroupChat(user, userGroupRole),
    canSendToGroupChat: () => authLib.canSendToGroupChat(user, userGroupRole),
    canViewVendorChat: () => authLib.canViewVendorChat(user, userGroupRole),
    canSendToVendorChat: () => authLib.canSendToVendorChat(user, userGroupRole),
    isVendorChatReadOnly: () => authLib.isVendorChatReadOnly(user, userGroupRole),
    canInitiateVendorChat: () => authLib.canInitiateVendorChat(userGroupRole),
    
    user,
  }), [user, userGroupRole]);

  return permissions;
};

/**
 * useCanViewPage Hook
 * 
 * Helper for checking if user can access a specific page/role
 * 
 * Example:
 *   const { canView } = useCanViewPage();
 *   if (!canView(['superUser', 'admin'])) {
 *     return <AccessDenied />;
 *   }
 */
export const useCanViewPage = () => {
  const { user } = useAuth();

  return {
    canView: (allowedRoles: string[]) => {
      if (!user) return false;
      return allowedRoles.includes(user.role);
    },
    canViewAdminPage: () => user?.role === 'superUser' || user?.role === 'admin',
    canViewVendorPage: () => user?.role === 'vendor',
    canViewMemberPages: () => user?.role === 'member',
    user,
  };
};
