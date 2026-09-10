import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchUsers } from '../../../store/slices/usersSlice';
import { fetchTransactions } from '../../../store/slices';
import { selectUsers, selectUserStats, selectUsersLoading, selectTransactions } from '../../../store/selectors';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import {
  Plus,
  ChevronRight,
  Users,
  TrendingUp,
  AlertTriangle,
  Shield,
  Settings,
  Loader2,
} from 'lucide-react';
import type { Screen } from '../../../App';
import { useAuth } from '../../../contexts/AuthContext';
import { LoadingState } from '../../ui/LoadingState';
import { StatCard } from './StatCard';
import { ActivityFeed } from './ActivityFeed';

interface AdminHomeProps {
  navigate: (screen: Screen, id?: string) => void;
}

export function AdminHome({ navigate }: AdminHomeProps) {
  const { user } = useAuth();
  const dispatch = useAppDispatch();

  const users = useAppSelector(selectUsers);
  const stats = useAppSelector(selectUserStats);
  const loading = useAppSelector(selectUsersLoading);
  const transactions = useAppSelector(selectTransactions);

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchTransactions('all'));
  }, [dispatch]);

  const isSuperUser = user?.role === 'superUser';
  const visibleUsers = users.filter((u) => isSuperUser || u.role !== 'superUser');
  const recentUsers = visibleUsers.slice(0, 3);
  const openDisputes = transactions.filter((t) => t.status === 'disputed').length;
  const totalVolume = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const adminStats = {
    totalUsers: visibleUsers.length,
    totalTransactions: transactions.length,
    platformVolume: totalVolume,
    openDisputes,
  };

  const activityItems = recentUsers.map((u) => ({
    id: u.id,
    title: u.name || u.email,
    description: `Joined as ${u.role || 'member'}`,
    timestamp: u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Recently',
    badge: {
      label: u.is_active ? 'Active' : 'Inactive',
      variant: u.is_active ? ('default' as const) : ('secondary' as const),
    },
    onClick: () => navigate('admin-users'),
  }));

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#7C3AED] to-[#6EE7B7] p-6 lg:p-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-white">Admin Dashboard, {user?.name || 'Admin'} 👋</h2>
            <p className="text-white/80 text-sm mt-1">Platform overview & system management</p>
          </div>
          <Avatar className="h-12 w-12 border-2 border-white">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback>{user?.name?.[0] || 'A'}</AvatarFallback>
          </Avatar>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Total Users"
            value={adminStats.totalUsers}
            color="primary"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Total Volume"
            value={`₦${(adminStats.platformVolume / 1000000).toFixed(1)}M`}
            color="primary"
          />
          <StatCard
            icon={<Shield className="w-5 h-5" />}
            label="Transactions"
            value={adminStats.totalTransactions}
            color="primary"
          />
          <StatCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Open Disputes"
            value={adminStats.openDisputes}
            color="primary"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 lg:px-8 mt-6">
        <h3 className="mb-4 text-sm font-semibold text-gray-600">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => navigate('admin-create-user')}
            className="h-20 flex flex-col items-center justify-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9]"
          >
            <Plus className="w-6 h-6" />
            <span className="text-xs">Create User</span>
          </Button>
          <Button
            onClick={() => navigate('admin-users')}
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
          >
            <Users className="w-6 h-6" />
            <span className="text-xs">Manage Users</span>
          </Button>
          <Button
            onClick={() => navigate('dispute-management')}
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
          >
            <AlertTriangle className="w-6 h-6" />
            <span className="text-xs">Disputes</span>
          </Button>
          <Button
            onClick={() => navigate('profile-settings')}
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
          >
            <Settings className="w-6 h-6" />
            <span className="text-xs">Settings</span>
          </Button>
        </div>
      </div>

      {/* System Alerts Section */}
      {openDisputes > 0 && (
        <div className="px-4 lg:px-8 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Critical Alerts
            </h3>
            <Badge variant="destructive">{openDisputes}</Badge>
          </div>

          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-red-900 mb-1">Open Disputes Require Attention</p>
                  <p className="text-sm text-red-700 mb-3">
                    {openDisputes} dispute{openDisputes !== 1 ? 's' : ''} awaiting mediation
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('dispute-management')}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Review Disputes
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Management Section */}
      <div className="px-4 lg:px-8 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#7C3AED]" />
            Recent Users
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('admin-users')}
            className="text-[#7C3AED]"
          >
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {loading ? (
          <LoadingState count={2} />
        ) : recentUsers.length === 0 ? (
          <Card className="bg-gray-50">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No users yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentUsers.map((u) => (
              <Card
                key={u.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate('admin-users')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={u.avatar} />
                      <AvatarFallback>{u.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900 truncate">{u.name || u.email}</p>
                        <Badge
                          variant="secondary"
                          className="text-xs flex-shrink-0"
                        >
                          {u.role || 'member'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{u.email}</p>
                    </div>
                    <Badge
                      variant={u.is_active ? 'secondary' : 'destructive'}
                      className="flex-shrink-0"
                    >
                      {u.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Disputes Section */}
      <div className="px-4 lg:px-8 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#7C3AED]" />
            Dispute Management
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('dispute-management')}
            className="text-[#7C3AED]"
          >
            All Disputes
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <Card className="bg-gradient-to-br from-[#7C3AED]/5 to-[#6EE7B7]/5 border-[#7C3AED]/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#7C3AED] flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">Dispute Mediation</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Review and mediate disputes between buyers and sellers
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('dispute-management')}
                    className="text-[#7C3AED] border-[#7C3AED]/20"
                  >
                    Open Disputes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('escrow-mediation')}
                    className="text-[#7C3AED] border-[#7C3AED]/20"
                  >
                    Mediation View
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Health Section */}
      <div className="px-4 lg:px-8 mt-6 pb-4">
        <h3 className="mb-4">Platform Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-600 rounded-full" />
                <p className="font-medium text-green-900">All Systems Operational</p>
              </div>
              <p className="text-sm text-green-700">Database, API, and chat services running normally</p>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
                <p className="font-medium text-blue-900">Escrow System Active</p>
              </div>
              <p className="text-sm text-blue-700">All transaction protections enabled</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
