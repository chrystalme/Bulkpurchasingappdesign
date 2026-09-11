import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Search,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { Screen } from '../../App';
import type { User, UserRole } from '../../lib/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchUsers,
  fetchUserStats,
  updateUser,
  deleteUser,
  setUserActive,
} from '../../store/slices/usersSlice';
import {
  selectUsers,
  selectUserStats,
  selectUsersLoading,
  selectUsersError,
  selectUsersSaving,
} from '../../store/selectors/usersSelectors';
import { selectVendors } from '../../store/selectors/vendorsSelectors';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

interface UserManagementProps {
  navigate: (screen: Screen) => void;
}

const ROLE_OPTIONS: UserRole[] = ['superUser', 'admin', 'vendor', 'member'];

const roleLabel = (role: UserRole) =>
  role === 'superUser' ? 'Super User' : role.charAt(0).toUpperCase() + role.slice(1);

const formatDate = (value?: string) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString();
};

export function UserManagement({ navigate }: UserManagementProps) {
  const dispatch = useAppDispatch();
  const { user: currentUser } = useAuth();
  const isSuperUser = currentUser?.role === 'superUser';

  const users = useAppSelector(selectUsers);
  const stats = useAppSelector(selectUserStats);
  const loading = useAppSelector(selectUsersLoading);
  const error = useAppSelector(selectUsersError);
  const saving = useAppSelector(selectUsersSaving);
  const vendors = useAppSelector(selectVendors);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const refresh = () => {
    dispatch(fetchUsers() as any);
    dispatch(fetchUserStats() as any);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'superUser':
        return 'bg-[#FB7185]/10 text-[#FB7185] border-[#FB7185]/20';
      case 'admin':
        return 'bg-[#0047AB]/10 text-[#0047AB] border-[#0047AB]/20';
      case 'vendor':
        return 'bg-[#6EE7B7]/10 text-[#10B981] border-[#6EE7B7]/20';
      case 'member':
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  /**
   * An admin may edit vendors and members. Admins and superUsers are managed
   * by superUsers only — an admin editing a peer admin's email/password would
   * be a privilege-escalation path (the API enforces the same rule).
   */
  const canEdit = (target: User) => {
    if (!currentUser) return false;
    if (isSuperUser) return true;
    if (target.role === 'superUser' || target.role === 'admin') return false;
    return true;
  };

  const canManageStatus = (target: User) =>
    isSuperUser && target.id !== currentUser?.id;

  const handleDeleteUser = async (target: User) => {
    if (!isSuperUser) {
      toast.error('Only Super Users have permission to delete accounts');
      return;
    }
    if (target.id === currentUser?.id) {
      toast.error('You cannot delete your own account');
      return;
    }
    if (!confirm(`Delete ${target.name}? This action cannot be undone.`)) return;

    const result = await dispatch(deleteUser(target.id) as any);
    if (deleteUser.fulfilled.match(result)) {
      toast.success('User deleted successfully');
      dispatch(fetchUserStats() as any);
    } else {
      toast.error((result.payload as string) || 'Failed to delete user');
    }
  };

  const handleToggleStatus = async (target: User) => {
    if (!isSuperUser) {
      toast.error('Only Super Users have permission to activate or deactivate accounts');
      return;
    }
    if (target.id === currentUser?.id) {
      toast.error('You cannot deactivate your own account');
      return;
    }

    const nextActive = !target.is_active;
    const result = await dispatch(
      setUserActive({ id: target.id, isActive: nextActive }) as any,
    );
    if (setUserActive.fulfilled.match(result)) {
      toast.success(nextActive ? 'User activated' : 'User deactivated');
      dispatch(fetchUserStats() as any);
    } else {
      toast.error((result.payload as string) || 'Failed to update user status');
    }
  };

  // Defence in depth: the API already hides superUsers from admins.
  const visibleUsers = useMemo(
    () =>
      users.filter((user) => isSuperUser || user.role !== 'superUser'),
    [users, isSuperUser],
  );

  const filteredUsers = visibleUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-[#F4F4F5] p-6">
        <LoadingState count={4} />
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="min-h-screen bg-[#F4F4F5] p-6">
        <ErrorState
          title="Failed to load users"
          description={error}
          onRetry={refresh}
          showRetry
        />
      </div>
    );
  }

  const statCards: { label: string; value: number; color?: string; role: UserRole | 'all' | null }[] = [
    { label: 'Total', value: stats?.total ?? visibleUsers.length, role: 'all' },
    ...(isSuperUser
      ? [{ label: 'Super Users', value: stats?.superUsers ?? 0, color: 'text-[#FB7185]', role: 'superUser' as UserRole }]
      : []),
    { label: 'Admins', value: stats?.admins ?? 0, color: 'text-[#0047AB]', role: 'admin' },
    { label: 'Vendors', value: stats?.vendors ?? 0, color: 'text-[#10B981]', role: 'vendor' },
    { label: 'Members', value: stats?.members ?? 0, role: 'member' },
    { label: 'Active', value: stats?.active ?? 0, color: 'text-[#10B981]', role: null },
  ];

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('home')} className="p-1">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900">User Management</h1>
            <p className="text-xs text-gray-500">{visibleUsers.length} total users</p>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            onClick={() => navigate('admin-create-user')}
            size="sm"
            className="bg-[#0047AB] hover:bg-[#0047AB]/90"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add User
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="p-4">
        <div className={`grid grid-cols-2 ${isSuperUser ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-3 mb-4`}>
          {statCards.map((card) => (
            <Card
              key={card.label}
              className={`transition-all ${
                card.role && selectedRole === card.role ? 'ring-2 ring-[#0047AB]' : ''
              } ${card.role ? 'cursor-pointer' : ''}`}
              onClick={() => card.role && setSelectedRole(card.role)}
            >
              <CardContent className="p-3">
                <p className="text-xs text-gray-600 mb-1">{card.label}</p>
                <p className={`text-xl font-semibold ${card.color || 'text-gray-900'}`}>
                  {card.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Users List */}
        <div className="space-y-3">
          {filteredUsers.length === 0 ? (
            <Card className="p-8">
              <div className="text-center">
                <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2">No users found</p>
                <p className="text-sm text-gray-500">Try a different search term or filter</p>
              </div>
            </Card>
          ) : (
            filteredUsers.map((user) => (
              <Card key={user.id} className={!user.is_active ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{user.name}</h3>
                            {user.id === currentUser?.id && (
                              <Badge
                                variant="secondary"
                                className="bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20 text-xs"
                              >
                                You
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={getRoleBadgeColor(user.role)}>
                            {roleLabel(user.role)}
                          </Badge>
                          {!user.is_active && (
                            <Badge variant="secondary" className="bg-gray-200 text-gray-700">
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100">
                        <div>
                          <p className="text-xs text-gray-600">Created</p>
                          <p className="text-sm text-gray-900">{formatDate(user.created_at)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">User ID</p>
                          <p className="text-sm text-gray-900 font-mono text-xs">
                            {user.id.slice(0, 8)}
                          </p>
                        </div>
                        {user.phone && (
                          <div>
                            <p className="text-xs text-gray-600">Phone</p>
                            <p className="text-sm text-gray-900">{user.phone}</p>
                          </div>
                        )}
                        {user.role === 'vendor' && (
                          <div>
                            <p className="text-xs text-gray-600">Vendor</p>
                            <p className="text-sm text-gray-900">
                              {vendors.find((v) => v.id === user.vendor_id)?.name ||
                                (user.vendor_id ? String(user.vendor_id).slice(0, 8) : 'Not linked')}
                            </p>
                          </div>
                        )}
                        {user.role === 'member' && (
                          <div>
                            <p className="text-xs text-gray-600">Trust Score</p>
                            <p className="text-sm font-semibold text-[#10B981]">
                              {user.trust_score ?? 0}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setEditingUser(user)}
                          disabled={!canEdit(user)}
                          title={
                            canEdit(user)
                              ? 'Edit account details'
                              : 'Only super users can edit admin accounts'
                          }
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        {isSuperUser && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(user)}
                            disabled={!canManageStatus(user) || saving}
                            className={
                              user.is_active
                                ? 'text-[#FB7185] border-[#FB7185]/20'
                                : 'text-[#10B981] border-[#10B981]/20'
                            }
                            title="Only super users can activate or deactivate accounts"
                          >
                            {user.is_active ? (
                              <>
                                <UserX className="w-4 h-4 mr-1" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-4 h-4 mr-1" />
                                Activate
                              </>
                            )}
                          </Button>
                        )}
                        {isSuperUser && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user)}
                            disabled={user.id === currentUser?.id || saving}
                            className="text-[#FB7185] border-[#FB7185]/20 hover:bg-[#FB7185]/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <EditUserDialog
        user={editingUser}
        isSuperUser={isSuperUser}
        vendors={vendors}
        saving={saving}
        onClose={() => setEditingUser(null)}
        onSaved={() => {
          setEditingUser(null);
          dispatch(fetchUserStats() as any);
        }}
      />
    </div>
  );
}

interface EditUserDialogProps {
  user: User | null;
  isSuperUser: boolean;
  vendors: { id: string; name: string }[];
  saving: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function EditUserDialog({
  user,
  isSuperUser,
  vendors,
  saving,
  onClose,
  onSaved,
}: EditUserDialogProps) {
  const dispatch = useAppDispatch();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'member' as UserRole,
    vendorId: '',
    trustScore: '0',
    isActive: true,
  });

  // Re-seed the form whenever a different account is opened.
  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      vendorId: user.vendor_id ? String(user.vendor_id) : '',
      trustScore: String(user.trust_score ?? 0),
      isActive: user.is_active ?? true,
    });
  }, [user]);

  if (!user) return null;

  const canEditTrust = isSuperUser || user.role === 'member';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error('A valid email is required');
      return;
    }
    if (form.password && form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (isSuperUser && form.role === 'vendor' && !form.vendorId) {
      toast.error('Select the vendor this account belongs to');
      return;
    }

    const changes: Partial<User> & { password?: string } = {
      name: form.name.trim(),
      email: form.email.trim(),
    };

    if (form.password) changes.password = form.password;

    // Role, activation and vendor link are superUser-only controls.
    if (isSuperUser) {
      changes.role = form.role;
      changes.is_active = form.isActive;
      changes.vendor_id = form.role === 'vendor' ? form.vendorId : null;
    }
    if (canEditTrust) {
      changes.trust_score = Number(form.trustScore) || 0;
    }

    const result = await dispatch(updateUser({ id: user.id, changes }) as any);
    if (updateUser.fulfilled.match(result)) {
      toast.success('Account updated successfully');
      onSaved();
    } else {
      toast.error((result.payload as string) || 'Failed to update account');
    }
  };

  return (
    <Dialog open={Boolean(user)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
          <DialogDescription>
            Update the details for {user.name}. Leave the password blank to keep it unchanged.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-name">Full Name</Label>
            <Input
              id="edit-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="edit-email">Email Address</Label>
            <Input
              id="edit-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">Used to sign in.</p>
          </div>

          <div>
            <Label htmlFor="edit-password">New Password</Label>
            <Input
              id="edit-password"
              type="password"
              placeholder="Leave blank to keep current"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters.</p>
          </div>

          <div>
            <Label htmlFor="edit-role">Role</Label>
            <Select
              value={form.role}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, role: value as UserRole }))
              }
              disabled={!isSuperUser}
            >
              <SelectTrigger id="edit-role" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((role) => (
                  <SelectItem key={role} value={role}>
                    {roleLabel(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isSuperUser && (
              <p className="text-xs text-gray-500 mt-1">
                Only super users can change a user's role.
              </p>
            )}
          </div>

          {isSuperUser && form.role === 'vendor' && (
            <div>
              <Label htmlFor="edit-vendor">Linked Vendor</Label>
              <Select
                value={form.vendorId || undefined}
                onValueChange={(value) => setForm((f) => ({ ...f, vendorId: value }))}
              >
                <SelectTrigger id="edit-vendor" className="mt-1">
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
                Links this account to an existing vendor profile.
              </p>
            </div>
          )}

          {canEditTrust && (
            <div>
              <Label htmlFor="edit-trust">Trust Score</Label>
              <Input
                id="edit-trust"
                type="number"
                min={0}
                max={100}
                value={form.trustScore}
                onChange={(e) => setForm((f) => ({ ...f, trustScore: e.target.value }))}
                className="mt-1"
              />
            </div>
          )}

          {isSuperUser && (
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
              <div>
                <Label htmlFor="edit-active">Account Active</Label>
                <p className="text-xs text-gray-500">
                  Inactive accounts cannot sign in.
                </p>
              </div>
              <Switch
                id="edit-active"
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, isActive: checked }))
                }
              />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#0047AB] hover:bg-[#0047AB]/90"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
