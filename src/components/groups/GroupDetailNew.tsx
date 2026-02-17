import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchGroupById,
  clearCurrentGroup,
  addMember,
  removeMember,
  updateMemberRole,
  fetchJoinRequests,
  reviewJoinRequest,
} from '../../store/slices/groupsSlice';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  ArrowLeft,
  Copy,
  Share2,
  Users,
  ShoppingCart,
  MessageCircle,
  Package,
  Store,
  Info,
  Loader2,
  AlertCircle,
  Shield,
  Trash2,
  CheckCircle2,
  XCircle,
  UserPlus,
} from 'lucide-react';
import type { Screen } from '../../App';
import { useChat } from '../../hooks/useChat';
import type { Conversation } from '../../lib/api/chatApi';
import { ChatWindowReal } from '../chat/ChatWindowReal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface GroupDetailProps {
  navigate: (screen: Screen, groupId?: string) => void;
  groupId: string | null;
}

export function GroupDetailNew({ navigate, groupId }: GroupDetailProps) {
  const dispatch = useAppDispatch();
  const { currentGroup, loading, joinRequests, error } = useAppSelector(state => state.groups);
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  const { conversations, loading: chatsLoading } = useChat();

  const isAdmin = currentGroup?.user_role === 'admin';
  const pendingRequests = joinRequests.filter(r => r.status === 'pending');

  // Fetch group details on mount or when groupId changes
  useEffect(() => {
    if (!groupId) {
      dispatch(clearCurrentGroup());
      return;
    }
    dispatch(fetchGroupById(groupId));
  }, [groupId, dispatch]);

  // Fetch join requests if admin
  useEffect(() => {
    if (groupId && isAdmin) {
      dispatch(fetchJoinRequests({ groupId }));
    }
  }, [groupId, isAdmin, dispatch]);

  const handleAddMember = async () => {
    if (!currentGroup || !memberEmail.trim()) return;

    try {
      setIsAddingMember(true);
      await dispatch(
        addMember({
          groupId: currentGroup.id,
          memberData: { email: memberEmail },
        }),
      ).unwrap();
      setMemberEmail('');
      setShowAddMemberDialog(false);
    } catch (err) {
      console.error('Failed to add member:', err);
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentGroup) return;

    if (!window.confirm('Are you sure you want to remove this member?')) return;

    try {
      await dispatch(
        removeMember({
          groupId: currentGroup.id,
          memberId,
        }),
      ).unwrap();
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const handleUpdateRole = async (
    memberId: string,
    newRole: 'admin' | 'member',
  ) => {
    if (!currentGroup) return;

    try {
      await dispatch(
        updateMemberRole({
          groupId: currentGroup.id,
          memberId,
          roleData: { role: newRole },
        }),
      ).unwrap();
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const moqProgress = currentGroup
    ? (currentGroup.current_quantity / currentGroup.moq_target) * 100
    : 0;

  // If a chat is selected, show full chat window
  if (selectedChat) {
    return (
      <ChatWindowReal
        conversation={selectedChat}
        onBack={() => setSelectedChat(null)}
      />
    );
  }

  // Loading state
  if (loading && !currentGroup) {
    return (
      <div className='min-h-screen bg-[#F4F4F5] flex items-center justify-center'>
        <div className='flex flex-col items-center gap-3'>
          <Loader2 className='w-8 h-8 animate-spin text-[#0047AB]' />
          <p className='text-gray-600'>Loading group...</p>
        </div>
      </div>
    );
  }

  if (!currentGroup) {
    return (
      <div className='min-h-screen bg-[#F4F4F5] flex items-center justify-center'>
        <Card className='max-w-md'>
          <CardContent className='p-6 text-center'>
            <AlertCircle className='w-12 h-12 text-red-500 mx-auto mb-4' />
            <p className='font-medium text-gray-900 mb-2'>
              {groupId ? 'Group not found' : 'No group selected'}
            </p>
            <p className='text-sm text-gray-600 mb-4'>
              {groupId
                ? ((error && error.trim()) ||
                  "The group you're looking for doesn't exist or you don't have access to it."
                )
                : 'Join or create a group first, then open group details.'}
            </p>
            <Button onClick={() => navigate('home')}>Go back to home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mock orders for this group
  const orders = [
    {
      id: '1',
      product: 'Premium Organic Rice (25kg)',
      status: 'In Progress',
      amount: 45.99,
    },
    {
      id: '2',
      product: 'Olive Oil Extra Virgin (5L)',
      status: 'Pending',
      amount: 38.99,
    },
  ];

  // Find conversations for this group from real data
  const groupInternalChat = conversations.find(
    c => c.groupId === currentGroup.id && c.type === 'group',
  ) || null;
  const groupVendorChats = conversations.filter(
    c => c.groupId === currentGroup.id && c.type === 'group-vendor',
  );

  return (
    <div className='min-h-screen bg-[#F4F4F5] pb-20'>
      {/* Header */}
      <div className='bg-gradient-to-r from-[#0047AB] to-[#6EE7B7] p-4 lg:p-6'>
        <div className='flex items-center gap-3 mb-4'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => navigate('home')}
            className='text-white hover:bg-white/10'
          >
            <ArrowLeft className='w-5 h-5' />
          </Button>
          <h3 className='text-white flex-1'>{currentGroup.name}</h3>
          <Button
            variant='ghost'
            size='icon'
            className='text-white hover:bg-white/10'
          >
            <Share2 className='w-5 h-5' />
          </Button>
        </div>

        <Card className='bg-white/10 border-white/20 backdrop-blur-sm'>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between mb-3'>
              <div className='flex -space-x-2'>
                {currentGroup.members.slice(0, 5).map(member => (
                  <Avatar
                    key={member.id}
                    className='h-8 w-8 border-2 border-white'
                  >
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback>{member.name[0]}</AvatarFallback>
                  </Avatar>
                ))}
                {currentGroup.members.length > 5 && (
                  <div className='h-8 w-8 rounded-full bg-white/20 border-2 border-white flex items-center justify-center'>
                    <span className='text-xs text-white'>
                      +{currentGroup.members.length - 5}
                    </span>
                  </div>
                )}
              </div>
              <Badge className='bg-white/20 text-white border-white/30'>
                {currentGroup.members.length} members
              </Badge>
            </div>

            <div className='space-y-2'>
              <div className='flex items-center justify-between text-sm text-white'>
                <span>MOQ Progress</span>
                <span>
                  {currentGroup.current_quantity}/{currentGroup.moq_target}{' '}
                  units
                </span>
              </div>
              <Progress value={moqProgress} className='h-2 bg-white/20' />
            </div>

            <div className='flex items-center gap-2 mt-3'>
              <div className='flex-1 bg-white/10 rounded-lg p-2 flex items-center gap-2'>
                <Copy className='w-4 h-4 text-white' />
                <span className='text-white text-sm'>
                  {currentGroup.join_code}
                </span>
              </div>
              <Button
                size='sm'
                className='bg-[#FACC15] text-[#0047AB] hover:bg-[#FACC15]/90'
                onClick={() => {
                  const url = `${window.location.origin}?join=${currentGroup.join_code}`;
                  navigator.clipboard.writeText(url);
                  setInviteCopied(true);
                  setTimeout(() => setInviteCopied(false), 2000);
                }}
              >
                {inviteCopied ? 'Copied!' : 'Invite'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className='grid grid-cols-3 gap-3 p-4 lg:p-6'>
        <Button
          variant='outline'
          className='flex flex-col items-center gap-2 h-auto py-3'
          onClick={() => navigate('products', currentGroup.id)}
        >
          <ShoppingCart className='w-5 h-5 text-[#0047AB]' />
          <span className='text-xs'>Add Items</span>
        </Button>
        <Button
          variant='outline'
          className='flex flex-col items-center gap-2 h-auto py-3'
          onClick={() => navigate('cart', currentGroup.id)}
        >
          <Package className='w-5 h-5 text-[#0047AB]' />
          <span className='text-xs'>View Cart</span>
        </Button>
        <Button
          variant='outline'
          className='flex flex-col items-center gap-2 h-auto py-3'
          onClick={() => setActiveTab('chat')}
        >
          <MessageCircle className='w-5 h-5 text-[#0047AB]' />
          <span className='text-xs'>Chats</span>
          {groupInternalChat && groupInternalChat.unreadCount > 0 && (
            <Badge className='absolute -top-1 -right-1 bg-[#FB7185] text-white h-5 min-w-5 text-xs'>
              {groupInternalChat.unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Tabs */}
      <div className='px-4 lg:px-6'>
        <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
          <TabsList className='grid w-full grid-cols-4'>
            <TabsTrigger value='overview'>
              <Info className='w-4 h-4 mr-1' />
              Overview
            </TabsTrigger>
            <TabsTrigger value='chat'>
              <MessageCircle className='w-4 h-4 mr-1' />
              Chat
              {groupInternalChat && groupInternalChat.unreadCount > 0 && (
                <Badge className='ml-1 bg-[#FB7185] text-white h-4 min-w-4 text-[10px] p-0 flex items-center justify-center'>
                  {groupInternalChat.unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value='vendors'>
              <Store className='w-4 h-4 mr-1' />
              Vendors
              {groupVendorChats.reduce((sum, c) => sum + c.unreadCount, 0) >
                0 && (
                <Badge className='ml-1 bg-[#FB7185] text-white h-4 min-w-4 text-[10px] p-0 flex items-center justify-center'>
                  {groupVendorChats.reduce((sum, c) => sum + c.unreadCount, 0)}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value='members'>
              <Users className='w-4 h-4 mr-1' />
              Members
              {isAdmin && pendingRequests.length > 0 && (
                <Badge className='ml-1 bg-[#FB7185] text-white text-xs px-1.5'>
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value='overview' className='mt-4 space-y-4'>
            <Card>
              <CardContent className='p-4'>
                <h4 className='font-semibold mb-2'>About This Group</h4>
                <p className='text-sm text-gray-600 mb-4'>
                  {currentGroup.description}
                </p>
                <div className='space-y-2'>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-gray-600'>Status</span>
                    <Badge className='bg-[#6EE7B7] text-gray-900'>
                      {currentGroup.status}
                    </Badge>
                  </div>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-gray-600'>Created</span>
                    <span>2 weeks ago</span>
                  </div>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-gray-600'>Your Role</span>
                    <Badge variant='outline'>Member</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Orders */}
            <div>
              <h4 className='font-semibold mb-3'>Recent Orders</h4>
              <div className='space-y-2'>
                {orders.map(order => (
                  <Card key={order.id}>
                    <CardContent className='p-4'>
                      <div className='flex items-start justify-between mb-2'>
                        <div className='flex-1'>
                          <h5 className='text-sm mb-1'>{order.product}</h5>
                          <Badge
                            variant={
                              order.status === 'In Progress'
                                ? 'default'
                                : 'secondary'
                            }
                            className={
                              order.status === 'In Progress'
                                ? 'bg-[#6EE7B7] text-gray-900'
                                : ''
                            }
                          >
                            {order.status}
                          </Badge>
                        </div>
                        <span className='text-[#0047AB] font-semibold'>
                          ₦{order.amount}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button
                  variant='outline'
                  className='w-full'
                  onClick={() => navigate('tracking')}
                >
                  View All Orders
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Chat Tab - Internal Group Chat */}
          <TabsContent value='chat' className='mt-4'>
            {groupInternalChat ? (
              <Card>
                <CardContent className='p-4'>
                  <div className='flex items-center justify-between mb-4'>
                    <div className='flex items-center gap-2'>
                      <MessageCircle className='w-5 h-5 text-[#0047AB]' />
                      <div>
                        <h4 className='font-semibold'>Group Chat</h4>
                        <p className='text-xs text-gray-500'>
                          {currentGroup.members.length} members
                        </p>
                      </div>
                    </div>
                    {groupInternalChat.unreadCount > 0 && (
                      <Badge className='bg-[#FB7185] text-white'>
                        {groupInternalChat.unreadCount} new
                      </Badge>
                    )}
                  </div>

                  {/* Last message preview */}
                  {groupInternalChat.lastMessage && (
                    <div className='bg-gray-50 rounded-lg p-3 mb-4'>
                      <div className='flex items-start gap-2'>
                        <Avatar className='w-8 h-8'>
                          <AvatarFallback className='bg-[#0047AB] text-white text-xs'>
                            {groupInternalChat.lastMessage.senderAvatar ||
                              groupInternalChat.lastMessage.senderName.charAt(
                                0,
                              )}
                          </AvatarFallback>
                        </Avatar>
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-2 mb-1'>
                            <span className='text-sm font-medium'>
                              {groupInternalChat.lastMessage.senderName}
                            </span>
                            <span className='text-xs text-gray-400'>
                              {new Date(
                                groupInternalChat.lastMessage.timestamp,
                              ).toLocaleTimeString([], {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className='text-sm text-gray-600 truncate'>
                            {groupInternalChat.lastMessage.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    className='w-full bg-[#0047AB]'
                    onClick={() => setSelectedChat(groupInternalChat)}
                  >
                    <MessageCircle className='w-4 h-4 mr-2' />
                    Open Group Chat
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className='p-8 text-center'>
                  <MessageCircle className='w-12 h-12 text-gray-300 mx-auto mb-3' />
                  <p className='text-gray-500'>No group chat available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Vendors Tab - Group-Vendor Chats */}
          <TabsContent value='vendors' className='mt-4'>
            <div className='space-y-3'>
              {groupVendorChats.length > 0 ? (
                <>
                  <div className='bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4'>
                    <div className='flex items-start gap-2'>
                      <Info className='w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0' />
                      <p className='text-xs text-blue-800'>
                        All members can see vendor conversations for
                        transparency. Only group admin can send messages.
                      </p>
                    </div>
                  </div>

                  {groupVendorChats.map(vendorChat => (
                    <Card
                      key={vendorChat.id}
                      className='cursor-pointer hover:shadow-md transition-shadow'
                    >
                      <CardContent
                        className='p-4'
                        onClick={() => setSelectedChat(vendorChat)}
                      >
                        <div className='flex items-center justify-between mb-3'>
                          <div className='flex items-center gap-3'>
                            <Avatar className='w-10 h-10 bg-[#0047AB] text-white'>
                              <AvatarFallback className='bg-[#0047AB] text-white'>
                                {vendorChat.avatar ||
                                  vendorChat.title.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className='font-semibold'>
                                {vendorChat.title}
                              </h4>
                              <div className='flex items-center gap-1 text-xs text-gray-500'>
                                <Store className='w-3 h-3' />
                                <span>
                                  {vendorChat.isOnline ? 'Online' : 'Offline'}
                                </span>
                              </div>
                            </div>
                          </div>
                          {vendorChat.unreadCount > 0 && (
                            <Badge className='bg-[#FB7185] text-white'>
                              {vendorChat.unreadCount}
                            </Badge>
                          )}
                        </div>

                        {/* Last message */}
                        {vendorChat.lastMessage && (
                          <div className='bg-gray-50 rounded-lg p-2'>
                            <p className='text-sm text-gray-600 truncate'>
                              {vendorChat.lastMessage.content}
                            </p>
                            <span className='text-xs text-gray-400'>
                              {new Date(
                                vendorChat.lastMessage.timestamp,
                              ).toLocaleTimeString([], {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : (
                <Card>
                  <CardContent className='p-8 text-center'>
                    <Store className='w-12 h-12 text-gray-300 mx-auto mb-3' />
                    <p className='text-gray-500 mb-2'>
                      No vendor conversations yet
                    </p>
                    <p className='text-sm text-gray-400'>
                      Start browsing products to connect with vendors
                    </p>
                    <Button
                      className='mt-4'
                      onClick={() => navigate('products', currentGroup.id)}
                    >
                      Browse Products
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value='members' className='mt-4 space-y-3'>
            {isAdmin && (
              <Button
                onClick={() => setShowAddMemberDialog(true)}
                className='w-full'
              >
                <Users className='w-4 h-4 mr-2' />
                Add Member
              </Button>
            )}

            {/* Pending Join Requests (admin only) */}
            {isAdmin && pendingRequests.length > 0 && (
              <Card className='border-amber-200 bg-amber-50'>
                <CardContent className='p-4'>
                  <h4 className='font-semibold text-amber-800 mb-3 flex items-center gap-2'>
                    <UserPlus className='w-4 h-4' />
                    Join Requests ({pendingRequests.length})
                  </h4>
                  <div className='space-y-3'>
                    {pendingRequests.map(request => (
                      <div key={request.id} className='flex items-center gap-3 bg-white rounded-lg p-3'>
                        <Avatar className='h-10 w-10'>
                          <AvatarImage src={request.user_avatar} />
                          <AvatarFallback>{request.user_name?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        <div className='flex-1 min-w-0'>
                          <p className='font-medium text-sm'>{request.user_name}</p>
                          <p className='text-xs text-gray-500 truncate'>{request.user_email}</p>
                          {request.message && (
                            <p className='text-xs text-gray-600 mt-1 italic'>"{request.message}"</p>
                          )}
                        </div>
                        <div className='flex gap-1'>
                          <Button
                            size='sm'
                            variant='ghost'
                            className='text-green-600 hover:text-green-700 hover:bg-green-50'
                            onClick={() => dispatch(reviewJoinRequest({
                              groupId: currentGroup.id,
                              requestId: request.id,
                              action: 'approved',
                            }))}
                          >
                            <CheckCircle2 className='w-5 h-5' />
                          </Button>
                          <Button
                            size='sm'
                            variant='ghost'
                            className='text-red-600 hover:text-red-700 hover:bg-red-50'
                            onClick={() => dispatch(reviewJoinRequest({
                              groupId: currentGroup.id,
                              requestId: request.id,
                              action: 'rejected',
                            }))}
                          >
                            <XCircle className='w-5 h-5' />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {currentGroup.members.map(member => (
              <Card key={member.id}>
                <CardContent className='p-4'>
                  <div className='flex items-center gap-3'>
                    <Avatar className='h-12 w-12'>
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback>{member.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className='flex-1'>
                      <div className='flex items-center gap-2'>
                        <h5>{member.name}</h5>
                        {member.role === 'admin' && (
                          <Badge variant='secondary' className='text-xs'>
                            <Shield className='w-3 h-3 mr-1' />
                            Admin
                          </Badge>
                        )}
                      </div>
                      <p className='text-sm text-gray-500'>{member.email}</p>
                    </div>

                    {isAdmin && member.user_id !== user?.id && (
                      <div className='flex gap-2'>
                        {member.role !== 'admin' && (
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleUpdateRole(member.id, 'admin')}
                            title='Promote to admin'
                          >
                            <Shield className='w-4 h-4' />
                          </Button>
                        )}
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => handleRemoveMember(member.id)}
                          className='text-red-600 hover:text-red-700'
                          title='Remove member'
                        >
                          <Trash2 className='w-4 h-4' />
                        </Button>
                      </div>
                    )}

                    {user?.id !== member.user_id && (
                      <Button variant='ghost' size='sm'>
                        <MessageCircle className='w-4 h-4' />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Add Member Dialog */}
        <Dialog
          open={showAddMemberDialog}
          onOpenChange={setShowAddMemberDialog}
        >
          <DialogContent className='sm:max-w-[425px]'>
            <DialogHeader>
              <DialogTitle>Add Member to Group</DialogTitle>
            </DialogHeader>
            <div className='grid gap-4 py-4'>
              <div className='grid gap-2'>
                <Label htmlFor='email'>Email</Label>
                <Input
                  id='email'
                  type='email'
                  placeholder='member@example.com'
                  value={memberEmail}
                  onChange={e => setMemberEmail(e.target.value)}
                />
              </div>
            </div>
            <div className='flex gap-2 justify-end'>
              <Button
                variant='outline'
                onClick={() => setShowAddMemberDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddMember}
                disabled={isAddingMember || !memberEmail.trim()}
              >
                {isAddingMember ? (
                  <>
                    <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    Adding...
                  </>
                ) : (
                  'Add Member'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
