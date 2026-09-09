import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  Users,
  ShoppingCart,
  TrendingUp,
  AlertCircle,
  Settings,
  BarChart3,
  DollarSign,
  Activity,
} from 'lucide-react';
import { LoadingState, TableLoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { fetchUsers, fetchUserStats } from '../../store/slices/usersSlice';
import { selectUsers, selectUserStats, selectUsersLoading, selectUsersError } from '../../store/selectors/usersSelectors';
import { useAuth } from '../../contexts/AuthContext';
import type { User } from '../../lib/types';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  superUsers: number;
  admins: number;
  vendors: number;
  members: number;
  totalOrders?: number;
  totalEscrow?: number;
}

interface AdminDashboardProps {
  navigate?: (screen: string) => void;
}

export function AdminDashboard({ navigate }: AdminDashboardProps) {
  const dispatch = useDispatch();
  const { user: authUser } = useAuth();
  
  const users = useSelector(selectUsers);
  const stats = useSelector(selectUserStats);
  const loading = useSelector(selectUsersLoading);
  const error = useSelector(selectUsersError);

  useEffect(() => {
    if (authUser?.role === 'admin' || authUser?.role === 'superUser') {
      dispatch(fetchUsers() as any);
      dispatch(fetchUserStats() as any);
    }
  }, [authUser?.role, dispatch]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'superUser':
        return 'bg-red-100 text-red-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'vendor':
        return 'bg-purple-100 text-purple-800';
      case 'member':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <LoadingState count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <ErrorState
          title="Failed to load admin dashboard"
          description={error}
          onRetry={() => {
            dispatch(fetchUsers() as any);
            dispatch(fetchUserStats() as any);
          }}
          showRetry={true}
        />
      </div>
    );
  }

  const isSuperUser = authUser?.role === 'superUser';
  const displayUsers = users.filter(u => isSuperUser || u.role !== 'superUser').slice(0, 10);

  const roleDistribution = isSuperUser
    ? [
        { label: 'Super Users', value: stats?.superUsers || 0, color: 'text-red-600' },
        { label: 'Admins', value: stats?.admins || 0, color: 'text-blue-600' },
        { label: 'Vendors', value: stats?.vendors || 0, color: 'text-purple-600' },
        { label: 'Members', value: stats?.members || 0, color: 'text-green-600' },
      ]
    : [
        { label: 'Admins', value: stats?.admins || 0, color: 'text-blue-600' },
        { label: 'Vendors', value: stats?.vendors || 0, color: 'text-purple-600' },
        { label: 'Members', value: stats?.members || 0, color: 'text-green-600' },
      ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0047AB] to-[#6EE7B7] p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white mb-1 text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-white/80">System Overview & Management</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Users */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-[#0047AB]">
                    {stats?.totalUsers || 0}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-[#0047AB]" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {(stats?.activeUsers || 0) + (stats?.superUsers || 0)} active users
              </p>
            </CardContent>
          </Card>

          {/* Active Members */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Members</p>
                  <p className="text-2xl font-bold text-[#10B981]">
                    {stats?.members || 0}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Activity className="w-6 h-6 text-[#10B981]" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Active bulk buyers</p>
            </CardContent>
          </Card>

          {/* Vendors */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Vendors</p>
                  <p className="text-2xl font-bold text-[#8B5CF6]">
                    {stats?.vendors || 0}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <ShoppingCart className="w-6 h-6 text-[#8B5CF6]" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Product suppliers</p>
            </CardContent>
          </Card>

          {/* Admins */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Admins</p>
                  <p className="text-2xl font-bold text-[#F59E0B]">
                    {isSuperUser ? (stats?.admins || 0) + (stats?.superUsers || 0) : (stats?.admins || 0)}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-[#F59E0B]" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">System administrators</p>
            </CardContent>
          </Card>
        </div>

        {/* Role Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              User Role Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid grid-cols-2 ${isSuperUser ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
              {roleDistribution.map((role) => (
                <div key={role.label} className="text-center">
                  <p className={`text-2xl font-bold ${role.color}`}>{role.value}</p>
                  <p className="text-sm text-gray-600">{role.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Users</CardTitle>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.length > 0 ? (
                users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                    <Badge className={getRoleColor(user.role || 'member')}>
                      {getRoleLabel(user.role || 'member')}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">No users found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Admin Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Administration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button className="bg-[#0047AB] hover:bg-[#0047AB]/90">
                Manage Users
              </Button>
              <Button className="bg-[#0047AB] hover:bg-[#0047AB]/90">
                View Disputes
              </Button>
              <Button className="bg-[#0047AB] hover:bg-[#0047AB]/90">
                System Settings
              </Button>
              <Button className="bg-[#0047AB] hover:bg-[#0047AB]/90">
                Generate Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
