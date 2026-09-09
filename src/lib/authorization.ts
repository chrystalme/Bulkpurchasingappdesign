import type { User, UserRole } from './types/auth.types';

/**
 * Authorization Utility Functions
 * 
 * These functions mirror backend middleware patterns from:
 * - backend/middleware/auth.js
 * - backend/routes/*.routes.js
 * 
 * Frontend uses these for UI/UX decisions (hide buttons, show errors, etc)
 * Backend ALWAYS validates (security layer)
 * 
 * Key Principle: Frontend improves UX, Backend enforces security
 */

// ============================================
// APP-LEVEL ROLE CHECKS
// ============================================

/**
 * Check if user is superUser (has full system access)
 */
export const isSuperUser = (user: User | null): boolean => {
  return user?.role === 'superUser';
};

/**
 * Check if user is application admin
 * (superUser or admin role)
 */
export const isAppAdmin = (user: User | null): boolean => {
  return user?.role === 'superUser' || user?.role === 'admin';
};

/**
 * Check if user is vendor
 */
export const isVendor = (user: User | null): boolean => {
  return user?.role === 'vendor';
};

/**
 * Check if user is regular member
 */
export const isMember = (user: User | null): boolean => {
  return user?.role === 'member';
};

/**
 * Check if user can manage users (create, edit, deactivate)
 * Only superUser and admin can manage users
 */
export const canManageUsers = (user: User | null): boolean => {
  return user?.role === 'superUser' || user?.role === 'admin';
};

/**
 * Check if user can delete users
 * Only superUser can delete users
 */
export const canDeleteUsers = (user: User | null): boolean => {
  return user?.role === 'superUser';
};

/**
 * Check if user can deactivate another user
 * ONLY superUser can deactivate users
 */
export const canDeactivateUser = (currentUser: User | null, _targetUserRole?: UserRole): boolean => {
  if (!currentUser) return false;
  return currentUser.role === 'superUser';
};

/**
 * Check if user can activate a deactivated user
 * ONLY superUser can activate users
 */
export const canActivateUser = (currentUser: User | null, _targetUserRole?: UserRole): boolean => {
  if (!currentUser) return false;
  return currentUser.role === 'superUser';
};

/**
 * Check if user can edit another user
 * SuperUser can edit anyone
 * Admin can edit anyone EXCEPT superUser
 */
export const canEditUser = (currentUser: User | null, targetUserRole: UserRole): boolean => {
  if (!currentUser) return false;
  
  if (currentUser.role === 'superUser') return true;
  if (currentUser.role === 'admin' && targetUserRole !== 'superUser') return true;
  
  return false;
};

// ============================================
// VENDOR-SPECIFIC CHECKS
// ============================================

/**
 * Check if user can access vendor dashboard
 * Strictly vendor only
 */
export const canAccessVendorDashboard = (user: User | null): boolean => {
  return user?.role === 'vendor';
};

/**
 * Check if user can manage a specific vendor
 * Vendor can manage own (checked via vendor_id)
 * SuperUser can manage any for platform administration
 */
export const canManageVendor = (
  currentUser: User | null,
  vendorId?: string
): boolean => {
  if (!currentUser) return false;
  
  if (currentUser.role === 'superUser') {
    return true;
  }
  
  // Vendor can only manage their own
  if (currentUser.role === 'vendor' && vendorId && currentUser.vendor_id === vendorId) {
    return true;
  }
  
  return false;
};

/**
 * Check if user can add products
 * Only vendors can add products
 */
export const canAddProduct = (user: User | null): boolean => {
  return user?.role === 'vendor';
};

/**
 * Check if user can edit a product
 * Vendor can edit own products
 * SuperUser and admin can edit any
 */
export const canEditProduct = (
  currentUser: User | null,
  productVendorId?: string
): boolean => {
  if (!currentUser) return false;
  
  if (currentUser.role === 'superUser' || currentUser.role === 'admin') {
    return true;
  }
  
  if (currentUser.role === 'vendor' && productVendorId && currentUser.vendor_id === productVendorId) {
    return true;
  }
  
  return false;
};

// ============================================
// GROUP-SPECIFIC CHECKS
// ============================================

/**
 * Check if user can create a group
 * ONLY members can create groups
 * Admins and vendors cannot
 */
export const canCreateGroup = (user: User | null): boolean => {
  if (!user) return false;
  // Only members (app-level role) can create groups
  return user.role === 'member';
};

/**
 * Check if user can join a group
 * ONLY members can join groups
 * Vendors CANNOT join groups (key business rule)
 * Admins CANNOT join groups (they shouldn't participate)
 */
export const canJoinGroup = (user: User | null): boolean => {
  if (!user) return false;
  // Only members (app-level role) can join groups
  return user.role === 'member';
};

/**
 * Group role type
 */
export type GroupRole = 'admin' | 'member';

/**
 * Check if user has group admin role
 */
export const isGroupAdmin = (userGroupRole: GroupRole | null | undefined): boolean => {
  return userGroupRole === 'admin';
};

/**
 * Check if user has group member role
 */
export const isGroupMember = (userGroupRole: GroupRole | null | undefined): boolean => {
  return userGroupRole === 'member' || userGroupRole === 'admin';
};

/**
 * Check if user can manage a group (edit, add/remove members, etc)
 * Only group admin can manage the group
 * SuperUser and admin can manage any group
 */
export const canManageGroup = (
  currentUser: User | null,
  userGroupRole: GroupRole | null | undefined
): boolean => {
  if (!currentUser) return false;
  
  // SuperUser and admin can manage any group
  if (currentUser.role === 'superUser' || currentUser.role === 'admin') {
    return true;
  }
  
  // Group admin can manage their group
  if (isGroupAdmin(userGroupRole)) {
    return true;
  }
  
  return false;
};

/**
 * Check if user can add members to a group
 * Only group admin can
 */
export const canAddGroupMember = (userGroupRole: GroupRole | null | undefined): boolean => {
  return isGroupAdmin(userGroupRole);
};

/**
 * Check if user can remove members from a group
 * Only group admin can
 */
export const canRemoveGroupMember = (userGroupRole: GroupRole | null | undefined): boolean => {
  return isGroupAdmin(userGroupRole);
};

/**
 * Check if user can edit group details
 * Only group admin can
 */
export const canEditGroup = (userGroupRole: GroupRole | null | undefined): boolean => {
  return isGroupAdmin(userGroupRole);
};

// ============================================
// CHAT-SPECIFIC CHECKS
// ============================================

/**
 * Check if user can view group internal chat
 * All group members can view
 * Vendors cannot (not in group)
 */
export const canViewGroupChat = (
  user: User | null,
  userGroupRole: GroupRole | null | undefined
): boolean => {
  if (!user) return false;
  
  // Vendors cannot view group chats
  if (user.role === 'vendor') return false;
  
  // Group members can view
  return isGroupMember(userGroupRole);
};

/**
 * Check if user can send to group internal chat
 * All group members can send
 */
export const canSendToGroupChat = (
  user: User | null,
  userGroupRole: GroupRole | null | undefined
): boolean => {
  if (!user) return false;
  
  // Vendors cannot send to group chat
  if (user.role === 'vendor') return false;
  
  // Group members can send
  return isGroupMember(userGroupRole);
};

/**
 * Check if user can view vendor negotiation chat
 * Group admin can view and send
 * Group members can view (read-only)
 * Vendor can view and send
 * Non-group members cannot view
 */
export const canViewVendorChat = (
  user: User | null,
  userGroupRole: GroupRole | null | undefined
): boolean => {
  if (!user) return false;
  
  // Vendors can view (they're in the chat)
  if (user.role === 'vendor') return true;
  
  // Group members can view (transparency model)
  return isGroupMember(userGroupRole);
};

/**
 * Check if user can send to vendor negotiation chat
 * ONLY group admin can send (represents group)
 * ONLY vendor can respond (represents themselves)
 * 
 * This is the KEY feature: transparency model
 * Group members can READ but NOT SEND
 */
export const canSendToVendorChat = (
  user: User | null,
  userGroupRole: GroupRole | null | undefined
): boolean => {
  if (!user) return false;
  
  // Vendor can send
  if (user.role === 'vendor') return true;
  
  // ONLY group admin can send (not regular members)
  if (isGroupAdmin(userGroupRole)) return true;
  
  return false;
};

/**
 * Check if this chat message is read-only for the user
 * Used to show "read-only" badge in UI
 * True if user can view but cannot send
 */
export const isVendorChatReadOnly = (
  user: User | null,
  userGroupRole: GroupRole | null | undefined
): boolean => {
  // Can view but cannot send
  return canViewVendorChat(user, userGroupRole) && !canSendToVendorChat(user, userGroupRole);
};

/**
 * Check if user can initiate vendor chat
 * Only group admin can create/initiate vendor chat
 */
export const canInitiateVendorChat = (
  userGroupRole: GroupRole | null | undefined
): boolean => {
  return isGroupAdmin(userGroupRole);
};

// ============================================
// RESOURCE OWNERSHIP CHECKS
// ============================================

/**
 * Check if user owns a resource or is admin
 * User can access if they own it OR are superUser/admin
 */
export const ownsResourceOrIsAdmin = (
  currentUser: User | null,
  resourceOwnerId: string
): boolean => {
  if (!currentUser) return false;
  
  if (currentUser.role === 'superUser' || currentUser.role === 'admin') {
    return true;
  }
  
  return currentUser.id === resourceOwnerId;
};

// ============================================
// AGGREGATE CHECKS (for UI decisions)
// ============================================

/**
 * Get all available permissions for a user
 * Useful for checking multiple permissions at once
 */
export const getUserPermissions = (
  user: User | null,
  groupRole?: GroupRole | null
) => {
  return {
    // App-level
    isSuperUser: isSuperUser(user),
    isAppAdmin: isAppAdmin(user),
    isVendor: isVendor(user),
    isMember: isMember(user),
    canManageUsers: canManageUsers(user),
    canDeleteUsers: canDeleteUsers(user),
    canAccessVendorDashboard: canAccessVendorDashboard(user),
    
    // Group-level
    canCreateGroup: canCreateGroup(user),
    canJoinGroup: canJoinGroup(user),
    isGroupAdmin: isGroupAdmin(groupRole),
    isGroupMember: isGroupMember(groupRole),
    
    // Chat
    canViewGroupChat: canViewGroupChat(user, groupRole),
    canSendToGroupChat: canSendToGroupChat(user, groupRole),
    canViewVendorChat: canViewVendorChat(user, groupRole),
    canSendToVendorChat: canSendToVendorChat(user, groupRole),
  };
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (user: User | null): boolean => {
  return user !== null && user !== undefined;
};
