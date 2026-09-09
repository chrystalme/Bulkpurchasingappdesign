import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useGroupRole } from '../../hooks/useAuthorization';
import { AccessDenied } from '../ui/AccessDenied';
import * as authLib from '../../lib/authorization';

type GroupRouteRequirement = 'admin' | 'member' | 'any';

interface GroupRouteProps {
  children: ReactNode;
  groupId: string | null | undefined;
  require?: GroupRouteRequirement;
  fallback?: ReactNode;
  onAccessDenied?: () => void;
}

/**
 * GroupRoute Component
 * 
 * Protects routes based on group membership and role
 * Checks if user is a member of the group and has required role
 * 
 * Example:
 *   <GroupRoute groupId={groupId} require="admin">
 *     <GroupSettings />
 *   </GroupRoute>
 * 
 * Props:
 *   - groupId: The group to check membership for
 *   - require: 'admin' (must be group admin), 'member' (must be member), 'any' (just check membership)
 *   - fallback: Custom component to show if access denied
 *   - onAccessDenied: Callback when access is denied
 */
export function GroupRoute({
  children,
  groupId,
  require = 'member',
  fallback,
  onAccessDenied,
}: GroupRouteProps) {
  const { user, isLoading } = useAuth();
  const groupRole = useGroupRole(groupId);
  const [isMember, setIsMember] = useState(false);
  const [checkComplete, setCheckComplete] = useState(false);

  // TODO: This will be connected to actual group membership API
  // For now, we simulate checking membership
  useEffect(() => {
    if (isLoading || !groupId) {
      setCheckComplete(false);
      return;
    }

    // Simulated delay for API call
    const timer = setTimeout(() => {
      // In real implementation, fetch user's role in this group
      // const role = await fetchUserGroupRole(userId, groupId);
      setIsMember(!!groupRole.role);
      setCheckComplete(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [groupId, isLoading, groupRole.role]);

  // Show loading state
  if (isLoading || !checkComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0047AB] to-[#6EE7B7] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Check if user is authenticated
  if (!user) {
    return (
      fallback || (
        <AccessDenied message="You must be logged in to access this page" />
      )
    );
  }

  // Check if user is in the group
  if (!isMember) {
    onAccessDenied?.();
    return (
      fallback || (
        <AccessDenied message="You are not a member of this group" />
      )
    );
  }

  // Check role requirement
  if (require === 'admin' && !authLib.isGroupAdmin(groupRole.role)) {
    onAccessDenied?.();
    return (
      fallback || (
        <AccessDenied message="Only group admins can access this page" />
      )
    );
  }

  return <>{children}</>;
}

/**
 * withGroupRoute Higher-Order Component (HOC)
 * 
 * Alternative way to use group route protection
 * 
 * Example:
 *   export default withGroupRoute(GroupSettings, 'admin');
 */
export function withGroupRoute<P extends object>(
  Component: React.ComponentType<P & { groupId: string }>,
  require: GroupRouteRequirement = 'member'
) {
  return function GroupRouteWrapper(props: P & { groupId: string }) {
    return (
      <GroupRoute groupId={props.groupId} require={require}>
        <Component {...props} />
      </GroupRoute>
    );
  };
}
