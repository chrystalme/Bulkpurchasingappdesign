import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchGroups } from '../../store/slices/groupsSlice';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Progress } from '../ui/progress';
import { Plus, ChevronRight, Users, Loader2 } from 'lucide-react';
import type { Screen } from '../../App';

interface GroupsBrowseProps {
  navigate: (screen: Screen, groupId?: string) => void;
}

export function GroupsBrowse({ navigate }: GroupsBrowseProps) {
  const dispatch = useAppDispatch();
  const { groups = [], loading } = useAppSelector((state) => state.groups);

  useEffect(() => {
    dispatch(fetchGroups());
  }, [dispatch]);

  return (
    <div className="p-4 lg:p-8 pb-24">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">My Groups</h1>
          <Button onClick={() => navigate('group-create')} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Group
          </Button>
        </div>
        <p className="text-gray-600">Join or manage your purchasing groups</p>
      </div>

      {/* Groups List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading && groups.length === 0 ? (
          <div className="flex items-center justify-center py-12 col-span-2">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <p className="text-gray-500 ml-3">Loading groups...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="col-span-2 text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-4">No groups yet</p>
            <p className="text-gray-500 mb-6">Join an existing group or create your first one to start bulk purchasing together</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button onClick={() => navigate('group-create')}>
                <Plus className="w-4 h-4 mr-2" />
                Create a Group
              </Button>
              <Button variant="outline" disabled>
                Join by Code (Coming Soon)
              </Button>
            </div>
          </div>
        ) : (
          groups.map((group) => (
            <Card
              key={group.id}
              className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-[#0047AB]"
              onClick={() => navigate('group-detail', group.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{group.name}</h3>
                      <Badge
                        variant={group.status === 'active' ? 'default' : 'secondary'}
                        className={group.status === 'active' ? 'bg-[#6EE7B7] text-gray-900' : ''}
                      >
                        {group.status}
                      </Badge>
                    </div>
                    {group.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{group.description}</p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>

                {/* Member count */}
                <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>{group.member_count} {group.member_count === '1' || group.member_count === 1 ? 'member' : 'members'}</span>
                </div>

                {/* MOQ Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">MOQ Progress</span>
                    <span className="font-medium text-[#0047AB]">
                      {Math.round((group.current_quantity / group.moq_target) * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={(group.current_quantity / group.moq_target) * 100}
                    className="h-2"
                  />
                  <div className="text-xs text-gray-500">
                    {group.current_quantity} of {group.moq_target} units
                  </div>
                </div>

                {/* Role badge */}
                {group.user_role === 'admin' && (
                  <div className="mt-3 pt-3 border-t">
                    <Badge variant="secondary" className="text-xs">
                      You are the admin
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
