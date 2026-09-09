import { useAuthorization, useCanViewPage } from '../../hooks/useAuthorization';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { CheckCircle2, XCircle } from 'lucide-react';

/**
 * AuthorizationTestPanel Component
 * 
 * Temporary component to test authorization utilities
 * Shows all permission checks for current user
 * 
 * REMOVE THIS COMPONENT after testing is complete
 */
export function AuthorizationTestPanel() {
  const auth = useAuthorization();
  const pageAccess = useCanViewPage();

  if (!auth.user) {
    return null;
  }

  const checks = [
    // App-level
    { label: 'isSuperUser', value: auth.isSuperUser() },
    { label: 'isAppAdmin', value: auth.isAppAdmin() },
    { label: 'isVendor', value: auth.isVendor() },
    { label: 'isMember', value: auth.isMember() },
    
    // User management
    { label: 'canManageUsers', value: auth.canManageUsers() },
    { label: 'canDeleteUsers', value: auth.canDeleteUsers() },
    
    // Vendor
    { label: 'canAccessVendorDashboard', value: auth.canAccessVendorDashboard() },
    { label: 'canAddProduct', value: auth.canAddProduct() },
    
    // Group
    { label: 'canCreateGroup', value: auth.canCreateGroup() },
    { label: 'canJoinGroup', value: auth.canJoinGroup() },
    
    // Page access
    { label: 'canViewAdminPage', value: pageAccess.canViewAdminPage() },
    { label: 'canViewVendorPage', value: pageAccess.canViewVendorPage() },
  ];

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-h-96 overflow-y-auto z-50 bg-white shadow-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">🧪 Authorization Test</CardTitle>
        <p className="text-xs text-gray-600 mt-1">
          User: <strong>{auth.user.email}</strong> | Role: <strong>{auth.user.role}</strong>
        </p>
      </CardHeader>
      <CardContent className="space-y-1">
        {checks.map((check) => (
          <div
            key={check.label}
            className="flex items-center gap-2 py-1 px-2 rounded text-xs bg-gray-50 hover:bg-gray-100"
          >
            {check.value ? (
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            )}
            <span className="font-mono flex-1">{check.label}</span>
            <span className={`text-xs ${check.value ? 'text-green-600' : 'text-red-600'}`}>
              {check.value ? '✓' : '✗'}
            </span>
          </div>
        ))}
        <div className="text-xs text-gray-500 mt-3 pt-2 border-t">
          <p className="mb-1">
            <strong>vendor_id:</strong> {auth.user.vendor_id || 'none'}
          </p>
          <p>Close this when testing is complete</p>
        </div>
      </CardContent>
    </Card>
  );
}
