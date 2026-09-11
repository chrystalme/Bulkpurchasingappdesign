import { useEffect, useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Screen } from '../../App';
import type { UserRole } from '../../lib/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createUser, fetchUsers, fetchUserStats } from '../../store/slices/usersSlice';
import { fetchVendors } from '../../store/slices/vendorsSlice';
import { selectUsersSaving } from '../../store/selectors/usersSelectors';
import { selectVendors } from '../../store/selectors/vendorsSelectors';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

interface CreateUserProps {
  navigate: (screen: Screen) => void;
}

export function CreateUser({ navigate }: CreateUserProps) {
  const dispatch = useAppDispatch();
  const { user: currentUser } = useAuth();
  const saving = useAppSelector(selectUsersSaving);
  const vendors = useAppSelector(selectVendors);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [vendorId, setVendorId] = useState('');

  useEffect(() => {
    // Vendors power the "link to vendor profile" picker.
    if (vendors.length === 0) {
      dispatch(fetchVendors() as any);
    }
  }, [dispatch, vendors.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if ((role === 'superUser' || role === 'admin') && currentUser?.role !== 'superUser') {
      toast.error('Only super users can create admin or super user accounts');
      return;
    }

    if (role === 'vendor' && !vendorId) {
      toast.error('Select the vendor this account belongs to');
      return;
    }

    const result = await dispatch(
      createUser({
        email: email.trim(),
        password,
        name: name.trim(),
        role,
        vendorId: role === 'vendor' ? vendorId : undefined,
      }) as any,
    );

    if (createUser.fulfilled.match(result)) {
      toast.success('User created successfully');
      dispatch(fetchUsers() as any);
      dispatch(fetchUserStats() as any);
      navigate('admin-users');
    } else {
      toast.error((result.payload as string) || 'Failed to create user');
    }
  };

  // Only superUser can create superUser and admin roles
  const availableRoles: UserRole[] = currentUser?.role === 'superUser'
    ? ['superUser', 'admin', 'vendor', 'member']
    : ['vendor', 'member'];

  const getRoleDescription = (role: UserRole) => {
    switch (role) {
      case 'superUser':
        return 'Full system access, can manage all users and settings';
      case 'admin':
        return 'Can manage users and moderate content';
      case 'vendor':
        return 'Can create and manage products, view orders';
      case 'member':
        return 'Standard user, can join groups and make purchases';
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('admin-users')} className="p-1">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900">Create New User</h1>
            <p className="text-xs text-gray-500">Add a user to the system</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 max-w-2xl mx-auto space-y-4">
        {/* Basic Information */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Basic Information</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">
                Full Name <span className="text-[#FB7185]">*</span>
              </Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="email">
                Email Address <span className="text-[#FB7185]">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                User will use this email to log in
              </p>
            </div>

            <div>
              <Label htmlFor="password">
                Password <span className="text-[#FB7185]">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum 6 characters
              </p>
            </div>
          </div>
        </Card>

        {/* Role and Permissions */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Role & Permissions</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="role">
                User Role <span className="text-[#FB7185]">*</span>
              </Label>
              <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r === 'superUser' ? 'Super User' : r.charAt(0).toUpperCase() + r.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-600 mt-1">
                {getRoleDescription(role)}
              </p>
            </div>

            {role === 'vendor' && (
              <div>
                <Label htmlFor="vendorId">Linked Vendor</Label>
                <Select value={vendorId || undefined} onValueChange={setVendorId}>
                  <SelectTrigger id="vendorId">
                    <SelectValue placeholder="Select a vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Link this user to an existing vendor profile
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Role Capabilities */}
        <Card className="p-4 bg-gray-50 border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3 text-sm">
            Capabilities for {role === 'superUser' ? 'Super User' : role.charAt(0).toUpperCase() + role.slice(1)}
          </h4>
          <ul className="space-y-1 text-xs text-gray-600">
            {role === 'superUser' && (
              <>
                <li>✓ Full system access</li>
                <li>✓ Create/delete all user types</li>
                <li>✓ Access admin panel</li>
                <li>✓ Manage products and vendors</li>
                <li>✓ View all transactions</li>
              </>
            )}
            {role === 'admin' && (
              <>
                <li>✓ Create/manage vendor and member users</li>
                <li>✓ Access admin panel</li>
                <li>✓ Moderate content</li>
                <li>✓ View user activity</li>
              </>
            )}
            {role === 'vendor' && (
              <>
                <li>✓ Create and manage products</li>
                <li>✓ View and process orders</li>
                <li>✓ Manage customer relationships</li>
                <li>✓ Access vendor dashboard</li>
              </>
            )}
            {role === 'member' && (
              <>
                <li>✓ Join or create purchasing groups</li>
                <li>✓ Browse and purchase products</li>
                <li>✓ Chat with vendors</li>
                <li>✓ Track orders and leave reviews</li>
              </>
            )}
          </ul>
        </Card>

        {/* Submit Buttons */}
        <div className="space-y-3 pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-[#0047AB] hover:bg-[#0047AB]/90 text-white h-12"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating User...
              </div>
            ) : (
              <>
                <Plus className="w-5 h-5 mr-2" />
                Create User
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('admin-users')}
            className="w-full h-12"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
