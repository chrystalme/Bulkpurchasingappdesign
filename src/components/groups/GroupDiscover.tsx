import { useState, useEffect } from 'react';
import { ArrowLeft, Search, Users, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { useDispatch, useSelector } from 'react-redux';
import { discoverGroups, requestToJoin } from '../../store/slices/groupsSlice';
import type { AppDispatch, RootState } from '../../store';
import type { Screen } from '../../App';

interface GroupDiscoverProps {
  navigate: (screen: Screen) => void;
}

export function GroupDiscover({ navigate }: GroupDiscoverProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { discoverableGroups, loading, error } = useSelector((state: RootState) => state.groups);
  const [searchQuery, setSearchQuery] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [requestingGroupId, setRequestingGroupId] = useState<string | null>(null);
  const [successGroupId, setSuccessGroupId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(discoverGroups(undefined));
  }, [dispatch]);

  const handleSearch = () => {
    dispatch(discoverGroups(searchQuery || undefined));
  };

  const handleRequestToJoin = async (groupId: string) => {
    const result = await dispatch(requestToJoin({ groupId, message: requestMessage }));
    if (requestToJoin.fulfilled.match(result)) {
      setRequestingGroupId(null);
      setRequestMessage('');
      setSuccessGroupId(groupId);
      setTimeout(() => setSuccessGroupId(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0047AB] to-[#6EE7B7] p-4 sticky top-0 z-20">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('groups')}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-white text-xl font-semibold">Discover Groups</h2>
            <p className="text-white/80 text-sm">Find groups to join</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10 bg-white/90 border-0"
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {loading && discoverableGroups.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#0047AB] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-red-500">{error}</p>
              <Button className="mt-4" onClick={() => dispatch(discoverGroups(undefined))}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : discoverableGroups.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No groups found</p>
              <p className="text-sm text-gray-400 mt-1">
                {searchQuery ? 'Try a different search term' : 'All available groups have been joined'}
              </p>
            </CardContent>
          </Card>
        ) : (
          discoverableGroups.map((group) => (
            <Card key={group.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate">{group.name}</h4>
                    {group.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{group.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                  </span>
                  <span>MOQ: {group.current_quantity}/{group.moq_target}</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
                  <div
                    className="bg-[#6EE7B7] h-1.5 rounded-full"
                    style={{ width: `${Math.min(100, (group.current_quantity / group.moq_target) * 100)}%` }}
                  />
                </div>

                {successGroupId === group.id ? (
                  <Badge className="bg-green-100 text-green-700">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Request sent!
                  </Badge>
                ) : group.has_pending_request ? (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    Request pending
                  </Badge>
                ) : requestingGroupId === group.id ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="Add a message (optional)"
                      value={requestMessage}
                      onChange={(e) => setRequestMessage(e.target.value)}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setRequestingGroupId(null); setRequestMessage(''); }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="bg-[#0047AB] hover:bg-[#0047AB]/90"
                        onClick={() => handleRequestToJoin(group.id)}
                        disabled={loading}
                      >
                        {loading ? 'Sending...' : 'Send Request'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    className="bg-[#0047AB] hover:bg-[#0047AB]/90"
                    onClick={() => setRequestingGroupId(group.id)}
                  >
                    Request to Join
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
