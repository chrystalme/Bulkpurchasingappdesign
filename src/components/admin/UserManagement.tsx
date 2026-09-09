import { useState } from 'react';
import { ArrowLeft, Plus, Search, Edit, Trash2, UserCheck, UserX, Shield } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Screen } from '../../App';
import { authService, User, UserRole } from '../../lib/auth';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

interface UserManagementProps {
  navigate: (screen: Screen) => void;
}

export function UserManagement({ navigate }: UserManagementProps) {
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>(authService.getAllUsers());
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');

  const stats = authService.getStats();

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

  const handleDeleteUser = (userId: string) => {
    if (currentUser?.role !== 'superUser') {
      toast.error('Only Super Users have permission to delete accounts');
      return;
    }

    if (userId === currentUser?.id) {
      toast.error('You cannot delete your own account');
      return;
    }

    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    const result = authService.deleteUser(userId);
    if (result.success) {
      setUsers(authService.getAllUsers());
      toast.success('User deleted successfully');
    } else {
      toast.error(result.error || 'Failed to delete user');
    }
  };

  const handleToggleStatus = (userId: string, isActive: boolean) => {
    if (currentUser?.role !== 'superUser') {
      toast.error('Only Super Users have permission to activate or deactivate accounts');
      return;
    }

    if (userId === currentUser?.id) {
      toast.error('You cannot deactivate your own account');
      return;
    }

    const result = isActive 
      ? authService.deactivateUser(userId)
      : authService.activateUser(userId);

    if (result.success) {
      setUsers(authService.getAllUsers());
      toast.success(isActive ? 'User deactivated' : 'User activated');
    } else {
      toast.error(result.error || 'Failed to update user status');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

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
            <p className="text-xs text-gray-500">{users.length} total users</p>
          </div>
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
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
          <Card 
            className={`cursor-pointer transition-all ${selectedRole === 'all' ? 'ring-2 ring-[#0047AB]' : ''}`}
            onClick={() => setSelectedRole('all')}
          >
            <CardContent className="p-3">
              <p className="text-xs text-gray-600 mb-1">Total</p>
              <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${selectedRole === 'superUser' ? 'ring-2 ring-[#FB7185]' : ''}`}
            onClick={() => setSelectedRole('superUser')}
          >
            <CardContent className="p-3">
              <p className="text-xs text-gray-600 mb-1">Super Users</p>
              <p className="text-xl font-semibold text-[#FB7185]">{stats.superUsers}</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${selectedRole === 'admin' ? 'ring-2 ring-[#0047AB]' : ''}`}
            onClick={() => setSelectedRole('admin')}
          >
            <CardContent className="p-3">
              <p className="text-xs text-gray-600 mb-1">Admins</p>
              <p className="text-xl font-semibold text-[#0047AB]">{stats.admins}</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${selectedRole === 'vendor' ? 'ring-2 ring-[#10B981]' : ''}`}
            onClick={() => setSelectedRole('vendor')}
          >
            <CardContent className="p-3">
              <p className="text-xs text-gray-600 mb-1">Vendors</p>
              <p className="text-xl font-semibold text-[#10B981]">{stats.vendors}</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${selectedRole === 'member' ? 'ring-2 ring-gray-400' : ''}`}
            onClick={() => setSelectedRole('member')}
          >
            <CardContent className="p-3">
              <p className="text-xs text-gray-600 mb-1">Members</p>
              <p className="text-xl font-semibold text-gray-900">{stats.members}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-gray-600 mb-1">Active</p>
              <p className="text-xl font-semibold text-[#10B981]">{stats.active}</p>
            </CardContent>
          </Card>
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
              <Card key={user.id} className={!user.isActive ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{user.name}</h3>
                            {user.id === currentUser?.id && (
                              <Badge variant="secondary" className="bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20 text-xs">
                                You
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={getRoleBadgeColor(user.role)}>
                            {user.role}
                          </Badge>
                          {!user.isActive && (
                            <Badge variant="secondary" className="bg-gray-200 text-gray-700">
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100">
                        <div>
                          <p className="text-xs text-gray-600">Created</p>
                          <p className="text-sm text-gray-900">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {user.vendorId && (
                          <div>
                            <p className="text-xs text-gray-600">Vendor ID</p>
                            <p className="text-sm text-gray-900">{user.vendorId}</p>
                          </div>
                        )}
                        {user.trustScore !== undefined && (
                          <div>
                            <p className="text-xs text-gray-600">Trust Score</p>
                            <p className="text-sm font-semibold text-[#10B981]">{user.trustScore}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          disabled={user.id === currentUser?.id}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        {currentUser?.role === 'superUser' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(user.id, user.isActive)}
                            disabled={user.id === currentUser?.id}
                            className={user.isActive ? 'text-[#FB7185] border-[#FB7185]/20' : 'text-[#10B981] border-[#10B981]/20'}
                            title="Only super users can activate or deactivate accounts"
                          >
                            {user.isActive ? (
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
                        {currentUser?.role === 'superUser' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={user.id === currentUser?.id}
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
    </div>
  );
}
