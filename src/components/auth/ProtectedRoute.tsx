import { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AccessDenied } from '../ui/AccessDenied';
import * as authLib from '../../lib/authorization';

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  onAccessDenied?: () => void;
}

/**
 * ProtectedRoute Component
 * 
 * Protects routes based on user role
 * Shows fallback or AccessDenied if user doesn't have permission
 * 
 * Example:
 *   <ProtectedRoute roles={['superUser', 'admin']}>
 *     <UserManagement />
 *   </ProtectedRoute>
 * 
 * Props:
 *   - roles: Array of allowed roles (user must have ONE of these)
 *   - requireAll: If true, user must have ALL roles (rarely used)
 *   - fallback: Custom component to show if access denied
 *   - onAccessDenied: Callback when access is denied
 */
export function ProtectedRoute({
  children,
  roles = [],
  requireAll = false,
  fallback,
  onAccessDenied,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  // Show loading state
  if (isLoading) {
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

  // If no roles specified, allow all authenticated users
  if (roles.length === 0) {
    return <>{children}</>;
  }

  // Check roles
  const hasPermission = requireAll
    ? roles.every(role => user.role === role)
    : roles.some(role => user.role === role);

  if (!hasPermission) {
    onAccessDenied?.();
    return (
      fallback || (
        <AccessDenied
          message={`This page requires one of these roles: ${roles.join(', ')}`}
        />
      )
    );
  }

  return <>{children}</>;
}

/**
 * withProtectedRoute Higher-Order Component (HOC)
 * 
 * Alternative way to use route protection
 * 
 * Example:
 *   export default withProtectedRoute(UserManagement, ['superUser', 'admin']);
 */
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  roles: string[]
) {
  return function ProtectedRouteWrapper(props: P) {
    return (
      <ProtectedRoute roles={roles}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
